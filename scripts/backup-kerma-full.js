require('dotenv').config();

const fs = require('fs');
const path = require('path');
const fsPromises = require('fs/promises');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

const DEFAULT_DB_NAME = 'kerma_db';
const ROOT_DIR = process.cwd();
const BACKUP_ROOT = process.env.KERMA_BACKUP_ROOT
    ? path.resolve(process.env.KERMA_BACKUP_ROOT)
    : path.resolve(ROOT_DIR, 'data', 'backups');

const FILE_BUCKET = process.env.MONGO_FILE_BUCKET || 'kerma_uploads';

const COLLECTIONS = [
    'users',
    'programs',
    'mahasiswa',
    'mitra',
    'industri',
    'kontrak',
    'cicilan',
    'addendum',
    'calon_peserta',
    'rencana_anggaran',
    'realisasi_anggaran',
    'pagu_anggaran',
    'rab_anggaran',
    'realisasi_pembayaran',
    'invoice_pembayaran',
    'plotting_kerma',
    'upload_chunks',
    'kerma_sessions',
    `${FILE_BUCKET}.files`,
    `${FILE_BUCKET}.chunks`
];

const LOCAL_ITEMS = [
    { src: path.resolve(ROOT_DIR, 'templates'), rel: path.join('local', 'templates'), kind: 'dir' },
    { src: path.resolve(ROOT_DIR, 'data'), rel: path.join('local', 'data'), kind: 'dir' },
    { src: path.resolve(ROOT_DIR, 'public', 'uploads'), rel: path.join('local', 'public', 'uploads'), kind: 'dir' },
    { src: path.resolve(ROOT_DIR, 'mongo-data-export'), rel: path.join('local', 'mongo-data-export'), kind: 'dir' },
    { src: path.resolve(ROOT_DIR, 'template.docx'), rel: path.join('local', 'template.docx'), kind: 'file' },
    { src: path.resolve(ROOT_DIR, 'template_kontrak.docx'), rel: path.join('local', 'template_kontrak.docx'), kind: 'file' }
];

function maskMongoUri(uri) {
    if (!uri) return '';
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

function parseMongoDbName(uri) {
    try {
        const parsed = new URL(uri);
        const name = parsed.pathname.replace(/^\//, '').trim();
        return name || DEFAULT_DB_NAME;
    } catch {
        return DEFAULT_DB_NAME;
    }
}

function timestampTag(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${y}${m}${d}-${hh}${mm}${ss}`;
}

async function ensureDir(target) {
    await fsPromises.mkdir(target, { recursive: true });
}

function writeStreamDone(stream) {
    return new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', resolve);
    });
}

async function exportCollection(db, collectionName, targetDir) {
    const collection = db.collection(collectionName);
    const outFile = path.join(targetDir, `${collectionName.replace(/\//g, '__')}.ndjson`);
    const cursor = collection.find({});
    const out = fs.createWriteStream(outFile, { encoding: 'utf8' });

    let count = 0;
    for await (const doc of cursor) {
        out.write(`${EJSON.stringify(doc)}\n`);
        count += 1;
    }

    out.end();
    await writeStreamDone(out);
    return { collection: collectionName, count, file: outFile };
}

async function copyDirectory(sourceDir, destinationDir, skipNames = []) {
    await ensureDir(destinationDir);
    const entries = await fsPromises.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
        if (skipNames.includes(entry.name)) continue;

        const sourcePath = path.join(sourceDir, entry.name);
        const destinationPath = path.join(destinationDir, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(sourcePath, destinationPath, skipNames);
            continue;
        }

        if (entry.isFile() || entry.isSymbolicLink()) {
            await ensureDir(path.dirname(destinationPath));
            await fsPromises.copyFile(sourcePath, destinationPath);
            continue;
        }

        // Abaikan tipe file lain agar aman.
    }
}

async function copyLocalArtifacts(backupRootDir) {
    const copied = [];
    const skipped = [];

    for (const item of LOCAL_ITEMS) {
        const destination = path.join(backupRootDir, item.rel);
        try {
            await fsPromises.access(item.src);
        } catch {
            skipped.push({ src: item.src, reason: 'not found' });
            continue;
        }

        if (item.kind === 'dir') {
            if (path.resolve(item.src) === path.resolve(ROOT_DIR, 'data')) {
                await copyDirectory(item.src, destination, ['backups']);
                continue;
            }

            await fsPromises.cp(item.src, destination, {
                recursive: true,
                force: true,
                errorOnExist: false
            });
        } else {
            await ensureDir(path.dirname(destination));
            await fsPromises.copyFile(item.src, destination);
        }

        copied.push({
            src: item.src,
            dest: destination
        });
    }

    return { copied, skipped };
}

function buildMongoClientOptions() {
    const options = {
        serverSelectionTimeoutMS: 120000,
        connectTimeoutMS: 120000,
        retryWrites: true
    };

    const allowInvalid = String(process.env.MONGODB_TLS_ALLOW_INVALID_CERTIFICATES || 'false').toLowerCase() === 'true';
    const tlsCAFile = process.env.MONGODB_TLS_CA_FILE?.trim();
    const dnsFamily = process.env.MONGODB_DNS_FAMILY?.trim();
    const tlsMinVersion = process.env.MONGODB_TLS_MIN_VERSION?.trim();
    const tlsMaxVersion = process.env.MONGODB_TLS_MAX_VERSION?.trim();

    if (tlsCAFile) options.tlsCAFile = tlsCAFile;
    if (dnsFamily) {
        const parsed = Number.parseInt(dnsFamily, 10);
        if ([0, 4, 6].includes(parsed)) options.family = parsed;
    }
    if (tlsMinVersion) options.minVersion = tlsMinVersion;
    if (tlsMaxVersion) options.maxVersion = tlsMaxVersion;

    if (allowInvalid) {
        options.tlsAllowInvalidCertificates = true;
        options.tlsAllowInvalidHostnames = true;
        options.tls = true;
        options.tlsInsecure = true;
    }

    return options;
}

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI belum disetel di .env');
    }

    const dbName = process.env.KERMA_BACKUP_DB || parseMongoDbName(uri);
    const stamp = timestampTag();
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const backupDir = path.join(BACKUP_ROOT, `kerma-backup-${stamp}-${random}`);

    await ensureDir(backupDir);

    const client = new MongoClient(uri, buildMongoClientOptions());

    console.log(`Menyimpan backup ke: ${backupDir}`);

    const startedAt = new Date().toISOString();
    const dbSummary = [];

    await client.connect();
    try {
        const db = client.db(dbName);
        const mongoDir = path.join(backupDir, 'mongo');
        await ensureDir(mongoDir);

        for (const collectionName of COLLECTIONS) {
            try {
                const result = await exportCollection(db, collectionName, mongoDir);
                dbSummary.push({
                    collection: result.collection,
                    count: result.count,
                    file: path.basename(result.file)
                });
                console.log(`- ${collectionName}: ${result.count} dokumen`);
            } catch (err) {
                dbSummary.push({
                    collection: collectionName,
                    count: 0,
                    file: null,
                    error: err?.message || String(err)
                });
                console.warn(`Gagal backup collection ${collectionName}: ${err?.message || err}`);
            }
        }
    } finally {
        await client.close();
    }

    const localSummary = await copyLocalArtifacts(backupDir);
    const doneAt = new Date().toISOString();

    const manifest = {
        createdAt: startedAt,
        finishedAt: doneAt,
        nodeVersion: process.version,
        db: {
            uriMasked: maskMongoUri(uri),
            dbName
        },
        mongo: {
            collections: dbSummary,
            bucket: FILE_BUCKET
        },
        local: {
            root: path.join('local'),
            copied: localSummary.copied,
            skipped: localSummary.skipped
        },
        policy: {
            safeMode: 'append-only',
            overwrite: false,
            note: 'Semua operasi hanya menyalin data. Tidak ada operasi insert/update/delete pada source.'
        }
    };

    const manifestFile = path.join(backupDir, 'manifest.json');
    await fsPromises.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    console.log(`Backup berhasil dibuat.`);
    console.log(`Manifest: ${manifestFile}`);
}

main().catch((error) => {
    console.error('Backup gagal:', error?.message || error);
    process.exitCode = 1;
});
