require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

const EXPORT_ROOT = path.resolve(__dirname, '..', 'mongo-data-export', 'mongo-data-export');
const MANIFEST_PATH = path.join(EXPORT_ROOT, '00_manifest.json');
const DEFAULT_DB_NAME = 'kerma';
const DEFAULT_APPEND_COLLECTIONS = new Set(['plotting_kerma']);

function parseCollectionList(raw) {
    const names = String(raw || '').split(',').map((name) => name.trim()).filter(Boolean);
    if (names.includes('*')) return new Set(['*']);
    return new Set(names);
}

function isAppendModeForCollection(importMode, appendCollections, collectionName) {
    if (importMode !== 'append' && importMode !== 'merge') return false;
    if (appendCollections.has('*')) return true;
    return appendCollections.has(collectionName);
}

function cloneDoc(doc) {
    return EJSON.deserialize(EJSON.serialize(doc));
}

function serializeDocumentWithoutId(doc) {
    const clone = cloneDoc(doc);
    if (clone && typeof clone === 'object' && clone._id !== undefined) {
        delete clone._id;
    }
    return EJSON.stringify(clone);
}

function parseDbName(uri, manifestDbName) {
    try {
        const parsed = new URL(uri);
        const pathName = (parsed.pathname || '').replace(/\//g, '');
        if (pathName) return pathName;
    } catch {
        // fallback below
    }
    return manifestDbName || DEFAULT_DB_NAME;
}

function loadManifest() {
    const rawManifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const manifest = JSON.parse(rawManifest);
    const collections = Array.isArray(manifest.collections) ? manifest.collections : [];
    const ordered = collections
        .slice()
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    return {
        collections: ordered
    };
}

function readCollectionData(fileName) {
    const filePath = path.join(EXPORT_ROOT, fileName);
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = EJSON.parse(raw);
    if (!Array.isArray(parsed)) {
        throw new Error(`Data di "${fileName}" bukan array dokumen.`);
    }
    return parsed;
}

function normalizeKontrakRincian(rincian) {
    if (!Array.isArray(rincian)) return rincian;

    return rincian.map((item) => {
        if (!item || typeof item !== 'object') return item;

        const normalized = { ...item };
        if (normalized.jumlah_peserta_didik === undefined && normalized.jumlah_mahasiswa !== undefined) {
            normalized.jumlah_peserta_didik = normalized.jumlah_mahasiswa;
        }
        return normalized;
    });
}

function normalizeDocument(collectionName, doc) {
    const normalized = cloneDoc(doc);

    if (collectionName === 'kontrak' && Array.isArray(normalized.rincian_bpp)) {
        normalized.rincian_bpp = normalizeKontrakRincian(normalized.rincian_bpp);
    }

    return normalized;
}

async function documentExists(collection, doc) {
    if (!doc || typeof doc !== 'object') return false;

    if (doc._id !== undefined) {
        const byId = await collection.findOne({ _id: doc._id }, { projection: { _id: 1 } });
        if (byId) return true;
    }

    const withoutId = cloneDoc(doc);
    if (withoutId._id !== undefined) delete withoutId._id;

    const byContent = await collection.findOne(withoutId, { projection: { _id: 1 } });
    return Boolean(byContent);
}

function createClient(uri, relaxTls, strictMode = false) {
    const baseOptions = {
        serverSelectionTimeoutMS: 120000,
        connectTimeoutMS: 120000
    };
    if (!relaxTls) return new MongoClient(uri, baseOptions);

    return new MongoClient(uri, {
        ...baseOptions,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        tls: true,
        tlsInsecure: true
    });
}

async function connectWithRetry(uri, useEnvRelaxedTls) {
    try {
        const client = createClient(uri, useEnvRelaxedTls, true);
        await client.connect();
        return { client, relaxMode: useEnvRelaxedTls };
    } catch (err) {
        const msg = String(err.message || '').toLowerCase();
        const likelyTlsError = msg.includes('ssl') || msg.includes('tls') || msg.includes('econnreset');

        if (!useEnvRelaxedTls && likelyTlsError) {
            console.warn('Koneksi TLS ke MongoDB gagal, mencoba fallback TLS versi 1.2...');
            const fallbackClient = createClient(uri, true, false);
            await fallbackClient.connect();
            return { client: fallbackClient, relaxMode: true };
        }

        if (!useEnvRelaxedTls && !likelyTlsError) {
            throw err;
        }

        if (useEnvRelaxedTls && likelyTlsError) {
            console.warn('Fallback TLS longgar tetap gagal, mencoba opsi URI override...');
            const fallbackUri = uri.includes('?')
                ? `${uri}&tls=true&tlsInsecure=true`
                : `${uri}/?tls=true&tlsInsecure=true`;
            const fallbackClient = new MongoClient(fallbackUri, {
                serverSelectionTimeoutMS: 120000,
                connectTimeoutMS: 120000
            });
            await fallbackClient.connect();
            return { client: fallbackClient, relaxMode: true };
        }

        throw err;
    }
}

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI tidak ditemukan di .env');
    }

    const { collections } = loadManifest();
    if (!collections.length) {
        throw new Error('Manifest tidak memiliki daftar koleksi untuk diproses.');
    }

    const manifestDbName = 'kerma';
    const dbName = parseDbName(uri, manifestDbName);
    const importMode = String(process.env.MONGO_IMPORT_MODE || 'replace').toLowerCase();
    const appendCollectionList = process.env.MONGO_IMPORT_COLLECTIONS
        ? parseCollectionList(process.env.MONGO_IMPORT_COLLECTIONS)
        : DEFAULT_APPEND_COLLECTIONS;

    const useEnvRelaxedTls =
        String(process.env.MONGODB_TLS_ALLOW_INVALID_CERT || 'false').toLowerCase() === 'true'
        || String(process.env.MONGODB_TLS_ALLOW_INVALID_CERTIFICATES || 'false').toLowerCase() === 'true'
        || String(process.env.MONGODB_TLS_ALLOW_INVALID_HOSTNAME || 'false').toLowerCase() === 'true'
        || String(process.env.MONGODB_TLS_ALLOW_INVALID_HOSTNAMES || 'false').toLowerCase() === 'true';

    const { client, relaxMode } = await connectWithRetry(uri, useEnvRelaxedTls);

    if (relaxMode) {
        console.warn('Peringatan: TLS verification dimatikan sementara untuk koneksi ini.');
    }

    const db = client.db(dbName);

    const stats = {
        imported: 0,
        collections: [],
        errors: []
    };

    try {
        for (const item of collections) {
            const collection = db.collection(item.collection);
            const docs = readCollectionData(item.file).map((doc) => normalizeDocument(item.collection, doc));
            const appendMode = isAppendModeForCollection(importMode, appendCollectionList, item.collection);

            if (!appendMode) {
                await collection.deleteMany({});
                if (docs.length) {
                    await collection.insertMany(docs, { ordered: false });
                }
                const afterCount = await collection.estimatedDocumentCount();
                stats.imported += docs.length;
                stats.collections.push({
                    collection: item.collection,
                    expected: item.count || 0,
                    inserted: docs.length,
                    mode: 'replace',
                    final: afterCount
                });

                if (item.count && item.count !== docs.length) {
                    stats.errors.push(`Jumlah dokumen tidak cocok untuk ${item.collection}: manifest ${item.count} != file ${docs.length}`);
                }
                if (afterCount !== docs.length) {
                    stats.errors.push(`Jumlah final tidak cocok di ${item.collection}: ${afterCount} != ${docs.length}`);
                }
                continue;
            }

            let inserted = 0;
            let skipped = 0;
            let duplicatesInSource = 0;
            const localSignatures = new Set();

            for (const doc of docs) {
                const signature = serializeDocumentWithoutId(doc);
                if (localSignatures.has(signature)) {
                    duplicatesInSource += 1;
                    continue;
                }
                localSignatures.add(signature);

                const exists = await documentExists(collection, doc);
                if (exists) {
                    skipped += 1;
                    continue;
                }

                try {
                    await collection.insertOne(doc);
                    inserted += 1;
                    stats.imported += 1;
                } catch (err) {
                    if (err && err.code === 11000) {
                        skipped += 1;
                    } else {
                        throw err;
                    }
                }
            }

            const afterCount = await collection.estimatedDocumentCount();
            const expected = item.count || 0;
            if (expected && expected !== docs.length) {
                stats.errors.push(`Jumlah dokumen tidak cocok untuk ${item.collection}: manifest ${expected} != file ${docs.length}`);
            }

            stats.collections.push({
                collection: item.collection,
                expected,
                inserted,
                skipped,
                sourceDuplicates: duplicatesInSource,
                mode: 'append',
                final: afterCount
            });
        }

        console.log('Import selesai');
        console.log(`Database target: ${dbName}`);
        console.log(`Total dokumen terimpor: ${stats.imported}`);
        console.table(stats.collections);
        if (stats.errors.length) {
            console.warn('Peringatan:');
            for (const message of stats.errors) console.warn(`- ${message}`);
        }
    } finally {
        await client.close();
    }
}

main().catch((err) => {
    console.error('Import gagal:', err.message);
    process.exit(1);
});
