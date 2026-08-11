require('dotenv').config();

const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const readline = require('readline');
const { EJSON } = require('bson');
const { Client } = require('pg');

const ROOT_DIR = process.cwd();
const BACKUP_ROOT = process.env.KERMA_BACKUP_ROOT || path.resolve(ROOT_DIR, 'data', 'backups');
const SCHEMA = process.env.SUPABASE_SCHEMA || 'public';
const BACKUP_DIR = process.env.KERMA_BACKUP_DIR
    ? path.resolve(process.env.KERMA_BACKUP_DIR)
    : null;
const BATCH_SIZE = Math.max(50, Number(process.env.SUPABASE_BATCH_SIZE || 200));
const DB_URL = process.env.SUPABASE_DB_URL;
const RAW_TABLE_PREFIX = process.env.SUPABASE_TABLE_PREFIX;
const TABLE_PREFIX = RAW_TABLE_PREFIX === undefined || RAW_TABLE_PREFIX === null
    ? 'mongo'
    : String(RAW_TABLE_PREFIX).trim();

function formatDate(v) {
    if (!v) return null;
    if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.toISOString() : null;
    if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v);
        return Number.isFinite(d.getTime()) ? d.toISOString() : null;
    }
    if (typeof v === 'object' && v !== null && typeof v.$date !== 'undefined') {
        const d = new Date(v.$date);
        return Number.isFinite(d.getTime()) ? d.toISOString() : null;
    }
    return null;
}

function normalizeCollectionName(name) {
    const clean = String(name || '').trim().toLowerCase();
    const safe = clean
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');
    const base = safe || 'unknown';
    const prefix = String(TABLE_PREFIX || '').trim();
    const withPrefix = prefix ? `${prefix}_${base}` : base;
    return withPrefix.length > 60 ? withPrefix.slice(0, 60) : withPrefix;
}

function safeJson(value) {
    return JSON.parse(EJSON.stringify(value));
}

function extractLegacyId(doc) {
    if (!doc || typeof doc !== 'object') return null;

    const rawId = doc._id;
    if (typeof rawId === 'string' && rawId.trim()) return rawId.trim();
    if (rawId && typeof rawId === 'object') {
        if (typeof rawId.$oid === 'string') return rawId.$oid;
        if (typeof rawId.toHexString === 'function') {
            try {
                return rawId.toHexString();
            } catch {
                // fallback below
            }
        }
    }

    if (typeof doc.id === 'string' && doc.id.trim()) return doc.id;
    if (typeof doc.kode_file === 'string' && doc.kode_file.trim()) return doc.kode_file;

    return null;
}

async function readJsonLines(filePath, onRecord) {
    const input = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input, crlfDelay: Infinity });
    let count = 0;

    for await (const line of rl) {
        const raw = String(line || '').trim();
        if (!raw) continue;

        try {
            const doc = EJSON.parse(raw);
            await onRecord(doc);
            count += 1;
        } catch (err) {
            console.warn(`Lewati baris tidak valid di ${path.basename(filePath)}: ${err.message}`);
        }
    }

    return count;
}

function loadManifest(backupDir) {
    const manifestPath = path.join(backupDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return manifest;
}

function resolveBackupDir() {
    if (BACKUP_DIR) {
        if (!fs.existsSync(BACKUP_DIR)) throw new Error(`KERMA_BACKUP_DIR tidak ditemukan: ${BACKUP_DIR}`);
        return BACKUP_DIR;
    }

    if (!fs.existsSync(BACKUP_ROOT)) {
        throw new Error(`Direktori backup tidak ditemukan: ${BACKUP_ROOT}`);
    }

    const dirs = fs.readdirSync(BACKUP_ROOT)
        .map((item) => ({
            item,
            full: path.join(BACKUP_ROOT, item),
            stat: fs.statSync(path.join(BACKUP_ROOT, item))
        }))
        .filter((entry) => entry.stat.isDirectory() && entry.item.startsWith('kerma-backup-'))
        .sort((a, b) => b.item.localeCompare(a.item));

    if (!dirs.length) {
        throw new Error(`Tidak ada backup di ${BACKUP_ROOT}`);
    }

    return dirs[0].full;
}

function getBackupCollections(manifest, mongoFolder) {
    if (manifest?.mongo?.collections?.length) {
        return manifest.mongo.collections
            .map((entry) => ({
                collection: entry.collection,
                file: path.join(mongoFolder, entry.file)
            }))
            .filter(item => item.collection && item.file);
    }

    if (!fs.existsSync(mongoFolder)) return [];
    return fs.readdirSync(mongoFolder)
        .filter((f) => f.endsWith('.ndjson'))
        .map((f) => ({
            collection: f.replace(/\.ndjson$/i, ''),
            file: path.join(mongoFolder, f)
        }));
}

function buildCreateTableSql(tableName) {
    const safe = tableName.replace(/\"/g, '\"\"');
    const schemaSafe = SCHEMA.replace(/\"/g, '\"\"');
    return `CREATE TABLE IF NOT EXISTS \"${schemaSafe}\".\"${safe}\" (
  id bigserial PRIMARY KEY,
  legacy_collection text NOT NULL,
  legacy_id text NOT NULL,
  legacy_payload jsonb NOT NULL,
  created_at timestamptz,
  updated_at timestamptz,
  source_file text,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_${safe}_legacy_id UNIQUE (legacy_collection, legacy_id)
);
CREATE INDEX IF NOT EXISTS idx_${safe}_legacy_collection ON \"${schemaSafe}\".\"${safe}\" (legacy_collection);
CREATE INDEX IF NOT EXISTS idx_${safe}_updated_at ON \"${schemaSafe}\".\"${safe}\" (updated_at);
`;
}

function buildInsertQuery(tableName, rows) {
    const placeholders = [];
    const values = [];
    let cursor = 1;
    for (const row of rows) {
        const p = `($${cursor}, $${cursor + 1}, $${cursor + 2}::jsonb, $${cursor + 3}, $${cursor + 4}, $${cursor + 5})`;
        placeholders.push(p);
        values.push(row.legacy_collection, row.legacy_id, JSON.stringify(row.legacy_payload), row.created_at, row.updated_at, row.source_file);
        cursor += 6;
    }

    const schemaSafe = SCHEMA.replace(/\"/g, '\"\"');
    const tableSafe = tableName.replace(/\"/g, '\"\"');
    const sql = `INSERT INTO \"${schemaSafe}\".\"${tableSafe}\"(legacy_collection, legacy_id, legacy_payload, created_at, updated_at, source_file)
VALUES ${placeholders.join(', ')}
ON CONFLICT (legacy_collection, legacy_id)
DO UPDATE SET
  legacy_payload = EXCLUDED.legacy_payload,
  updated_at = EXCLUDED.updated_at,
  source_file = EXCLUDED.source_file;`;

    return { sql, values };
}

async function writeBootstrapPackage(backupDir, collections, destinationDir) {
    await fsPromises.mkdir(destinationDir, { recursive: true });
    const schemas = [];
    const mapping = [];

    for (const item of collections) {
        const table = normalizeCollectionName(item.collection);
        schemas.push(buildCreateTableSql(table));
        mapping.push({
            collection: item.collection,
            table,
            source_file: path.basename(item.file)
        });

        const dataDir = path.join(destinationDir, 'data');
        await fsPromises.mkdir(dataDir, { recursive: true });
        const outFile = path.join(dataDir, `${table}.jsonl`);
        const output = [];

        if (fs.existsSync(item.file)) {
            let index = 0;
            await readJsonLines(item.file, (doc) => {
                const legacyId = extractLegacyId(doc) || `legacy_${Date.now()}_${++index}`;
                const row = {
                    legacy_collection: item.collection,
                    legacy_id: String(legacyId),
                    legacy_payload: safeJson(doc),
                    created_at: formatDate(doc.createdAt),
                    updated_at: formatDate(doc.updatedAt),
                    source_file: path.basename(item.file)
                };
                output.push(`${JSON.stringify(row)}\n`);
            });
        }

        await fsPromises.writeFile(outFile, output.join(''), 'utf8');
    }

    const sql = `-- Auto-generated bootstrap untuk Supabase\n-- Jalankan sebagai user yang bisa create schema/table.\nCREATE SCHEMA IF NOT EXISTS \"${SCHEMA}\";\n\n${schemas.join('\n')}`;
    await fsPromises.writeFile(path.join(destinationDir, 'bootstrap.sql'), sql, 'utf8');
    await fsPromises.writeFile(path.join(destinationDir, 'collection-map.json'), JSON.stringify(mapping, null, 2), 'utf8');

    console.log(`Paket bootstrap Supabase dibuat di: ${destinationDir}`);
    console.log('Isi folder ini bisa dipakai untuk import manual jika belum menyiapkan SUPABASE_DB_URL.');
}

async function migrateToSupabase(backupDir, collections) {
    if (!DB_URL) {
        const manualDir = path.join(backupDir, 'supabase-manual-import');
        await writeBootstrapPackage(backupDir, collections, manualDir);
        throw new Error('SUPABASE_DB_URL tidak ada. Paket manual sudah dibuat, isi di SUPABASE_DB_URL lalu jalankan ulang untuk import langsung.');
    }

    const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const report = [];

    try {
        await client.query(`CREATE SCHEMA IF NOT EXISTS \"${SCHEMA}\";`);

        for (const item of collections) {
            if (!fs.existsSync(item.file)) {
                console.warn(`Skip collection ${item.collection}, file tidak ditemukan: ${item.file}`);
                continue;
            }

            const table = normalizeCollectionName(item.collection);
            const createSql = buildCreateTableSql(table);
            await client.query(createSql);

            let imported = 0;
            let sourceCount = 0;
            const rows = [];

            const flush = async () => {
                if (!rows.length) return;
                const { sql, values } = buildInsertQuery(table, rows);
                const result = await client.query(sql, values);
                imported += result.rowCount || 0;
                rows.length = 0;
            };

            await readJsonLines(item.file, async (doc) => {
                sourceCount += 1;
                const legacyId = extractLegacyId(doc) || `legacy_${item.collection}_${sourceCount}`;
                rows.push({
                    legacy_collection: item.collection,
                    legacy_id: String(legacyId),
                    legacy_payload: safeJson(doc),
                    created_at: formatDate(doc.createdAt),
                    updated_at: formatDate(doc.updatedAt),
                    source_file: path.basename(item.file)
                });

                if (rows.length >= BATCH_SIZE) {
                    await flush();
                }
            });

            await flush();
            const skipped = Math.max(0, sourceCount - imported);

            report.push({
                collection: item.collection,
                table,
                sourceCount,
                imported,
                skipped
            });
            console.log(`- ${item.collection} -> ${table}: ${imported}/${sourceCount}`);
        }
    } finally {
        await client.end();
    }

    const reportPath = path.join(backupDir, `supabase-migrate-report-${Date.now()}.json`);
    await fsPromises.writeFile(reportPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        schema: SCHEMA,
        counts: report
    }, null, 2), 'utf8');
    console.log(`Report migrasi: ${reportPath}`);
}

async function main() {
    const backupDir = resolveBackupDir();
    console.log(`Menggunakan backup: ${backupDir}`);

    const mongoDir = path.join(backupDir, 'mongo');
    const manifest = loadManifest(backupDir);
    const collections = getBackupCollections(manifest, mongoDir);

    if (!collections.length) {
        throw new Error(`Tidak ada file collection .ndjson di ${mongoDir}`);
    }

    const safeList = collections.map((c) => ({ collection: c.collection, file: c.file }));
    await fsPromises.writeFile(path.join(backupDir, 'supabase-collections.json'), JSON.stringify(safeList, null, 2), 'utf8');

    await migrateToSupabase(backupDir, collections);
}

main().catch((err) => {
    if (err?.message) {
        console.error('Migrasi gagal:', err.message);
    } else {
        console.error('Migrasi gagal:', err);
    }
    process.exitCode = 1;
});
