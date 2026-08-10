require('dotenv').config();

const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { Client } = require('pg');
const { execSync, spawnSync } = require('child_process');

const ROOT_DIR = process.cwd();
const BACKUP_ROOT = path.resolve(ROOT_DIR, 'data', 'backups');
const BACKUP_DIR = process.env.KERMA_BACKUP_DIR ? path.resolve(process.env.KERMA_BACKUP_DIR) : null;
const SCHEMA = process.env.SUPABASE_SCHEMA || 'public';
const DB_URL = process.env.SUPABASE_DB_URL;
const MANAGEMENT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_MANAGEMENT_TOKEN;
const MANAGEMENT_BASE_URL =
    process.env.SUPABASE_MANAGEMENT_BASE_URL ||
    process.env.SUPABASE_MANAGEMENT_URL ||
    'https://api.supabase.com/v1';
const PROJECT_REF =
    process.env.SUPABASE_PROJECT_REF || (() => {
        try {
            return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname.split('.')[0] : '';
        } catch {
            return '';
        }
    })();
const BATCH_TIMEOUT_MS = Math.max(5000, Number(process.env.SUPABASE_BOOTSTRAP_TIMEOUT_MS || 120000));

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

function splitSqlStatements(sqlText) {
    const parts = sqlText
        .split(/;\s*(?:\r?\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean);
    return parts.map((s) => (s.endsWith(';') ? s : `${s};`));
}

async function ensureManualPackage(backupDir) {
    const manualDir = path.join(backupDir, 'supabase-manual-import');
    const hasManual = fs.existsSync(manualDir);

    if (!hasManual) {
        console.log('Folder supabase-manual-import belum ada. Menjalankan supabase:migrate-backup dulu...');
        execSync('npm run supabase:migrate-backup', { stdio: 'inherit' });
        return resolveBackupDir();
    }

    const bootstrapSql = path.join(manualDir, 'bootstrap.sql');
    const collectionMap = path.join(manualDir, 'collection-map.json');
    const dataDir = path.join(manualDir, 'data');

    if (!fs.existsSync(bootstrapSql) || !fs.existsSync(collectionMap) || !fs.existsSync(dataDir)) {
        console.log('Paket manual tidak lengkap. Menjalankan supabase:migrate-backup ulang...');
        execSync('npm run supabase:migrate-backup', { stdio: 'inherit' });
        return resolveBackupDir();
    }

    return manualDir;
}

async function applyBootstrapSql(manualDir) {
    if (!DB_URL) {
        console.log('SUPABASE_DB_URL tidak ada, melewati bootstrap SQL otomatis (pakai mode REST import saja).');
        return;
    }

    const bootstrapPath = path.join(manualDir, 'bootstrap.sql');
    if (!fs.existsSync(bootstrapPath)) {
        throw new Error(`bootstrap.sql tidak ditemukan: ${bootstrapPath}`);
    }

    const rawSql = await fsPromises.readFile(bootstrapPath, 'utf8');
    const statements = splitSqlStatements(rawSql);
    const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: BATCH_TIMEOUT_MS });

    try {
        await client.connect();
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}";`);

        for (const statement of statements) {
            if (!statement.trim()) continue;
            try {
                await client.query(statement);
            } catch (err) {
                const code = err.code || 'ERR';
                if (code === '42501' || /permission denied|not authorized/i.test(err.message || '')) {
                    throw new Error(`Permission error saat bootstrap: ${err.message}`);
                }
                if (code === '42P06' || code === '42P07') {
                    continue;
                }
                console.warn(`Lewati statement jika bukan error fatal: ${err.message}`);
            }
        }
        console.log('Bootstrap SQL dari supabase-manual-import berhasil dijalankan.');
    } finally {
        await client.end().catch(() => {});
    }
}

async function applyBootstrapViaManagement(manualDir) {
    if (!MANAGEMENT_TOKEN) {
        console.log('SUPABASE_ACCESS_TOKEN tidak ada, fallback SQL manual tetap diperlukan.');
        return false;
    }

    if (!PROJECT_REF) {
        throw new Error('SUPABASE_PROJECT_REF tidak terdeteksi. Isi SUPABASE_PROJECT_REF atau perbaiki SUPABASE_URL.');
    }

    const bootstrapPath = path.join(manualDir, 'bootstrap.sql');
    if (!fs.existsSync(bootstrapPath)) {
        throw new Error(`bootstrap.sql tidak ditemukan: ${bootstrapPath}`);
    }

    const sql = await fsPromises.readFile(bootstrapPath, 'utf8');
    const endpoint = `${MANAGEMENT_BASE_URL}/projects/${PROJECT_REF}/database/migrations`;
    const payload = {
        query: sql,
        name: `bootstrap-from-backup-${Date.now()}`
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Management API gagal: HTTP ${response.status} ${response.statusText}: ${text}`);
    }

    console.log('Bootstrap sukses via Management API (database/migrations).');
    return true;
}

function runManualImport() {
    const result = spawnSync(process.execPath, ['scripts/import-manual-backup-to-supabase.js'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env
    });

    if (result.stdout) {
        console.log(result.stdout.trim());
    }
    if (result.stderr) {
        console.error(result.stderr.trim());
    }

    if (result.status !== 0) {
        const out = `${result.stdout || ''}\n${result.stderr || ''}`;
        if (/Could not find the table/i.test(out)) {
            const friendly = 'Tabel belum tersedia. Jalankan isi bootstrap.sql di Supabase SQL Editor lalu jalankan ulang command ini.';
            throw new Error(friendly);
        }
        if (/ENOTFOUND|getaddrinfo/i.test(out)) {
            throw new Error(`DNS/host DB tidak dapat dijangkau saat bootstrap: ${out.trim()}`);
        }
        throw new Error(`Import manual gagal (status ${result.status})`);
    }
}

async function main() {
    const backupDir = resolveBackupDir();
    console.log(`Menggunakan backup: ${backupDir}`);
    const manualDir = await ensureManualPackage(backupDir);
    console.log(`Import package: ${manualDir}`);

    const bootstrapMissingDb = !DB_URL;
    if (bootstrapMissingDb) {
        console.log('SUPABASE_DB_URL tidak ada, mencoba bootstrap lewat Management API jika token tersedia.');
        const byManagement = await applyBootstrapViaManagement(manualDir);
        if (!byManagement) {
            console.log('Management API tidak dipakai; import tetap lanjut dengan syarat tabel sudah ada.');
        }
    } else {
        try {
            await applyBootstrapSql(manualDir);
        } catch (err) {
            if (err?.code === 'ENOTFOUND' || /ENOTFOUND|getaddrinfo|Connection terminated|timed out/i.test(err.message || '')) {
                console.error('Bootstrap via DB URL gagal: host DB tidak bisa diakses di environment ini.');
                try {
                    const byManagement = await applyBootstrapViaManagement(manualDir);
                    if (byManagement) {
                        console.log('Lanjut ke import REST setelah bootstrap sukses lewat Management API.');
                        runManualImport();
                        return;
                    }
                } catch (mgmtErr) {
                    console.error('Bootstrap via Management API juga gagal:', mgmtErr?.message || mgmtErr);
                    console.error('Lanjut ke import REST; jika tabel belum ada, jalankan bootstrap.sql manual di SQL Editor.');
                }
            } else {
                console.error('Gagal bootstrap SQL:', err?.message || err);
            }
        }
    }

    runManualImport();
}

main().catch((err) => {
    if (err?.message) {
        console.error('Supabase full sync gagal:', err.message);
    } else {
        console.error('Supabase full sync gagal:', err);
    }
    process.exitCode = 1;
});
