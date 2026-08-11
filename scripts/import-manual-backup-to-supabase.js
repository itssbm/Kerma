require('dotenv').config();

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = process.cwd();
const BACKUP_ROOT = path.resolve(ROOT_DIR, 'data', 'backups');
const BACKUP_DIR = process.env.KERMA_BACKUP_DIR ? path.resolve(process.env.KERMA_BACKUP_DIR) : null;

const SCHEMA = process.env.SUPABASE_SCHEMA || 'public';
const RAW_TABLE_PREFIX = process.env.SUPABASE_TABLE_PREFIX;
const TABLE_PREFIX = RAW_TABLE_PREFIX === undefined || RAW_TABLE_PREFIX === null
    ? 'mongo'
    : String(RAW_TABLE_PREFIX).trim();
const BATCH_SIZE = Math.max(25, Number(process.env.SUPABASE_BATCH_SIZE || 100));
const RETRY_MAX = Math.max(1, Number(process.env.SUPABASE_IMPORT_RETRY_MAX || 4));
const RETRY_BASE_MS = Math.max(250, Number(process.env.SUPABASE_IMPORT_RETRY_BASE_MS || 700));
const REQUEST_TIMEOUT_MS = Math.max(5000, Number(process.env.SUPABASE_REQUEST_TIMEOUT_MS || 120000));

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

function resolveBackupDir() {
    if (BACKUP_DIR) {
        if (!fs.existsSync(BACKUP_DIR)) {
            throw new Error(`KERMA_BACKUP_DIR tidak ditemukan: ${BACKUP_DIR}`);
        }
        return BACKUP_DIR;
    }

    if (!fs.existsSync(BACKUP_ROOT)) {
        throw new Error(`Direktori backup tidak ditemukan: ${BACKUP_ROOT}`);
    }

    const dirs = fs
        .readdirSync(BACKUP_ROOT)
        .map((item) => ({ item, full: path.join(BACKUP_ROOT, item) }))
        .filter((entry) => {
            try {
                return fs.statSync(entry.full).isDirectory() && entry.item.startsWith('kerma-backup-');
            } catch {
                return false;
            }
        })
        .sort((a, b) => b.item.localeCompare(a.item));

    if (!dirs.length) {
        throw new Error(`Tidak ada backup di ${BACKUP_ROOT}`);
    }

    return dirs[0].full;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getManualImportDir(backupDir) {
    return path.join(backupDir, 'supabase-manual-import');
}

function getCollectionMap(manualDir) {
    const mapPath = path.join(manualDir, 'collection-map.json');
    if (!fs.existsSync(mapPath)) {
        throw new Error(`collection-map.json tidak ditemukan: ${mapPath}`);
    }

    const raw = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(raw);
    if (!Array.isArray(map)) {
        throw new Error('collection-map.json tidak valid, harus berupa array.');
    }

    return map.filter((item) => item?.collection && item?.table);
}

async function readJsonLines(filePath, onRecord) {
    const input = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input, crlfDelay: Infinity });

    try {
        for await (const line of rl) {
            const raw = String(line || '').trim();
            if (!raw) continue;

            let row;
            try {
                row = JSON.parse(raw);
            } catch (err) {
                console.warn(`Lewati baris tidak valid di ${path.basename(filePath)}: ${err.message}`);
                continue;
            }

            const pending = onRecord(row, raw);
            if (pending && typeof pending.then === 'function') {
                await pending;
            }
        }
    } finally {
        rl.close();
    }
}

async function postRows(table, rows, retry = 0) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.set('on_conflict', 'legacy_collection,legacy_id');
    url.searchParams.set('columns', 'legacy_collection,legacy_id,legacy_payload,created_at,updated_at,source_file');

    const headers = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-supabase-schema': SCHEMA,
        Prefer: 'resolution=merge-duplicates,return=minimal'
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers,
            body: JSON.stringify(rows),
            signal: controller.signal
        });

        if (response.ok) {
            return;
        }

        const payload = await response.text();
        const msg = payload ? `: ${payload}` : '';
        const status = response.status;

        if ((status === 429 || status >= 500) && retry < RETRY_MAX) {
            const wait = RETRY_BASE_MS * Math.pow(2, retry);
            console.warn(`HTTP ${status} saat import ${table}, retry ${retry + 1}/${RETRY_MAX} setelah ${wait}ms${msg}`);
            await sleep(wait);
            return postRows(table, rows, retry + 1);
        }

        if (status === 404 && /relation .* does not exist/i.test(payload)) {
            throw new Error(`Tabel ${table} belum ada. Jalankan bootstrap SQL dulu di Supabase SQL Editor.`);
        }

        throw new Error(`HTTP ${status} import ${table}${msg}`);
    } finally {
        clearTimeout(timer);
    }
}

async function importCollection(manualDataDir, mapItem) {
    const table = String(mapItem.table || '').trim();
    const filePath = path.join(manualDataDir, `${table}.jsonl`);

    if (!fs.existsSync(filePath)) {
        console.warn(`Skip ${mapItem.collection}: file tidak ditemukan ${path.basename(filePath)}`);
        return { collection: mapItem.collection, table, sourceFile: `${table}.jsonl`, sourceCount: 0, imported: 0, skipped: 0 };
    }

    let sourceCount = 0;
    let imported = 0;
    const chunk = [];
    const flush = async () => {
        if (!chunk.length) return;
        await postRows(table, chunk);
        imported += chunk.length;
        chunk.length = 0;
    };

    await readJsonLines(filePath, (row) => {
        if (!row || typeof row !== 'object') return;

        const legacyId = row.legacy_id || '';
        const legacyCollection = row.legacy_collection || mapItem.collection;

        chunk.push({
            legacy_collection: String(legacyCollection),
            legacy_id: String(legacyId),
            legacy_payload: row.legacy_payload || {},
            created_at: row.created_at || null,
            updated_at: row.updated_at || null,
            source_file: row.source_file || `${table}.jsonl`
        });
        sourceCount += 1;

        if (chunk.length >= BATCH_SIZE) {
            return flush();
        }

        return undefined;
    });

    await flush();

    return {
        collection: mapItem.collection,
        table,
        sourceFile: `${table}.jsonl`,
        sourceCount,
        imported,
        skipped: Math.max(0, sourceCount - imported)
    };
}

async function main() {
    if (!SUPABASE_URL) {
        throw new Error('SUPABASE_URL belum ada di .env');
    }
    if (!SUPABASE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY belum ada di .env');
    }

    const backupDir = resolveBackupDir();
    const manualDir = getManualImportDir(backupDir);
    const dataDir = path.join(manualDir, 'data');

    if (!fs.existsSync(manualDir) || !fs.existsSync(dataDir)) {
        throw new Error(`Folder import manual tidak lengkap: ${manualDir}`);
    }

    const mapping = getCollectionMap(manualDir);
    if (!mapping.length) {
        throw new Error(`collection-map.json kosong di ${manualDir}`);
    }

    console.log(`Menggunakan backup manual: ${backupDir}`);
    console.log(`Import otomatis ke: ${SUPABASE_URL}`);

    const report = [];

    for (const item of mapping) {
        const table = String(item.table || '').trim();
        if (TABLE_PREFIX && !table.startsWith(`${TABLE_PREFIX}_`)) {
            console.warn(`Skip collection non-default: ${table}`);
            continue;
        }

        console.log(`Import ${item.collection} -> ${table}`);
        const result = await importCollection(dataDir, item);
        console.log(`- ${item.collection}: ${result.imported}/${result.sourceCount}`);
        report.push(result);
    }

    const reportPath = path.join(backupDir, `supabase-manual-import-report-${Date.now()}.json`);
    fs.writeFileSync(
        reportPath,
        JSON.stringify({
            generatedAt: new Date().toISOString(),
            schema: SCHEMA,
            mode: 'rest',
            counts: report
        }, null, 2),
        'utf8'
    );
    console.log(`Report tersimpan: ${reportPath}`);
}

main().catch((err) => {
    if (err?.message) {
        console.error('Import manual gagal:', err.message);
    } else {
        console.error('Import manual gagal:', err);
    }
    process.exitCode = 1;
});
