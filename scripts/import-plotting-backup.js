require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

const DEFAULT_FILE = path.resolve(__dirname, '..', 'plotting-backup.json');
const DEFAULT_DB_NAME = 'kerma';
const DEFAULT_COLLECTION = 'plotting_kerma';
const PLOTTING_FIELDS_FROM_DB = [
    'rows',
    'masterLevelJabatanPlotting',
    'tarifMasterJabatanPlotting',
    'perhitunganDasarPlotting'
];

function parseDbName(uri, fallbackDbName) {
    try {
        const parsed = new URL(uri);
        const pathName = (parsed.pathname || '').replace(/\//g, '');
        if (pathName) return pathName;
    } catch {
        // fallback below
    }
    return fallbackDbName || DEFAULT_DB_NAME;
}

function stripVolatileFields(doc) {
    const cloned = EJSON.deserialize(EJSON.serialize(doc));
    if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) return cloned;

    const clean = { ...cloned };
    delete clean._id;
    delete clean.importedAt;
    delete clean.createdAt;
    delete clean.updatedAt;
    delete clean.__v;
    return clean;
}

function isPlottingPayloadObject(doc) {
    return (
        doc
        && typeof doc === 'object'
        && !Array.isArray(doc)
        && !Object.prototype.hasOwnProperty.call(doc, 'payload')
        && (Object.prototype.hasOwnProperty.call(doc, 'rows')
            || Object.prototype.hasOwnProperty.call(doc, 'jumlahPksPlotting')
            || Object.prototype.hasOwnProperty.call(doc, 'periodePengelolaKerma'))
    );
}

function normalizePlottingBackupDocument(rawDoc, sourceLabel, options = {}) {
    if (rawDoc === null || rawDoc === undefined) return rawDoc;
    if (options.wrapPayload && isPlottingPayloadObject(rawDoc)) {
        return {
            userId: process.env.MONGO_PLOTTING_USER_ID || 'admin',
            source: process.env.MONGO_PLOTTING_SOURCE || sourceLabel,
            version: 1,
            payload: rawDoc,
            note: process.env.MONGO_PLOTTING_NOTE || 'Import dari plotting-backup.json',
            importedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    return rawDoc;
}

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function mergePlottingPayloadKeepingDatabaseData(incomingPayload, existingPayload) {
    const nextPayload = {
        ...(incomingPayload && typeof incomingPayload === 'object' ? incomingPayload : {})
    };
    const sourcePayload = existingPayload && typeof existingPayload === 'object' ? existingPayload : {};

    for (const field of PLOTTING_FIELDS_FROM_DB) {
        if (hasOwn(sourcePayload, field)) {
            nextPayload[field] = EJSON.deserialize(EJSON.serialize(sourcePayload[field]));
        }
    }

    return nextPayload;
}

function parseSourceArg(inputArg) {
    const fileArg = Array.isArray(inputArg) ? inputArg.find((item) => item && !item.startsWith('--')) : null;
    return fileArg ? path.resolve(fileArg) : DEFAULT_FILE;
}

function buildCollectionArg(inputArg) {
    const fallback = DEFAULT_COLLECTION;
    if (!Array.isArray(inputArg)) return fallback;

    const found = inputArg.find((item) => item.startsWith('--collection='));
    if (found) return found.split('=').slice(1).join('=');

    return process.env.MONGO_PLOTTING_COLLECTION || fallback;
}

function parseModeArg(inputArg) {
    if (!Array.isArray(inputArg)) return false;
    return inputArg.some((item) => item === '--dry-run' || item === '-d');
}

function parseBooleanArg(inputArg, token) {
    if (!Array.isArray(inputArg)) return false;
    return inputArg.some((item) => item === token);
}

function parseBooleanArgAlias(inputArg, token, alias = null) {
    if (!Array.isArray(inputArg)) return false;
    if (inputArg.some((item) => item === token)) return true;
    return alias ? inputArg.some((item) => item === alias) : false;
}

function readInputJson(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = EJSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
}

async function ambilDokumenPlottingTerbaru(collection) {
    return collection.findOne(
        {},
        {
            sort: {
                updatedAt: -1,
                importedAt: -1,
                createdAt: -1,
                _id: -1
            }
        }
    );
}

function createClient(uri, relaxTls) {
    if (!relaxTls) {
        return new MongoClient(uri, {
            serverSelectionTimeoutMS: 120000,
            connectTimeoutMS: 120000,
            socketTimeoutMS: 120000
        });
    }

    return new MongoClient(uri, {
        serverSelectionTimeoutMS: 120000,
        connectTimeoutMS: 120000,
        socketTimeoutMS: 120000,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        tls: true,
        tlsInsecure: true
    });
}

async function connectWithRetry(uri, useEnvRelaxedTls) {
    const client = createClient(uri, useEnvRelaxedTls);
    await client.connect();
    return client;
}

async function main() {
    const args = process.argv.slice(2);
    const filePath = parseSourceArg(args);
    const collectionName = buildCollectionArg(args);
    const dryRun = parseModeArg(args);
    const wrapPayload = !parseBooleanArg(args, '--raw');
    const preserveDbFields = parseBooleanArgAlias(args, '--preserve-db', '--merge-db');

    if (!fs.existsSync(filePath)) {
        throw new Error(`File tidak ditemukan: ${filePath}`);
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI tidak ditemukan di .env');
    }

    const useEnvRelaxedTls =
        String(process.env.MONGODB_TLS_ALLOW_INVALID_CERTIFICATES || '').toLowerCase() === 'true'
        || String(process.env.MONGODB_TLS_ALLOW_INVALID_CERT || '').toLowerCase() === 'true'
        || String(process.env.MONGODB_TLS_ALLOW_INVALID_HOSTNAME || '').toLowerCase() === 'true'
        || String(process.env.MONGODB_TLS_ALLOW_INVALID_HOSTNAMES || '').toLowerCase() === 'true';

    const client = await connectWithRetry(uri, useEnvRelaxedTls);
    const dbName = parseDbName(uri, DEFAULT_DB_NAME);
    const collection = client.db(dbName).collection(collectionName);
    const dokumenPlottingTerbaru = await ambilDokumenPlottingTerbaru(collection);
    const payloadPlottingTerbaru = dokumenPlottingTerbaru?.payload && typeof dokumenPlottingTerbaru.payload === 'object'
        ? dokumenPlottingTerbaru.payload
        : null;

    const docs = readInputJson(filePath).map((doc, idx) => {
        const normalized = normalizePlottingBackupDocument(doc, path.basename(filePath), { wrapPayload });
        if (!normalized) throw new Error(`Dokumen ke-${idx + 1} kosong.`);
        if (wrapPayload && preserveDbFields && normalized.payload && payloadPlottingTerbaru) {
            normalized.payload = mergePlottingPayloadKeepingDatabaseData(
                normalized.payload,
                payloadPlottingTerbaru
            );
        }
        return normalized;
    });

    const seenSignatures = new Set();
    let inserted = 0;
    let skipped = 0;
    let duplicatesInFile = 0;

    try {
        for (const doc of docs) {
            const signature = crypto.createHash('sha256').update(EJSON.stringify(stripVolatileFields(doc))).digest('hex');
            if (seenSignatures.has(signature)) {
                duplicatesInFile += 1;
                continue;
            }
            seenSignatures.add(signature);

            if (!dryRun) {
                const exists = await collection.findOne(stripVolatileFields(doc), { projection: { _id: 1 } });
                if (exists) {
                    skipped += 1;
                    continue;
                }

                await collection.insertOne(doc);
                inserted += 1;
            } else {
                const exists = await collection.findOne(stripVolatileFields(doc), { projection: { _id: 1 } });
                if (!exists) inserted += 1;
                else skipped += 1;
            }
        }

        const finalCount = await collection.estimatedDocumentCount();

        console.log('Import Plotting Backup selesai');
        console.log(`File: ${filePath}`);
        console.log(`Collection: ${collectionName}`);
        console.log(`Mode: ${dryRun ? 'dry-run' : 'append'}`);
        console.log(`Wrap payload: ${wrapPayload ? 'ya' : 'tidak'}`);
        console.log(`Pertahankan field lama dari MongoDB: ${preserveDbFields ? 'ya' : 'tidak'}`);
        console.log(`Total dokumen di file: ${docs.length}`);
        console.log(`Inserted: ${inserted}`);
        console.log(`Skipped (duplikat): ${skipped}`);
        console.log(`Duplikat dalam file: ${duplicatesInFile}`);
        console.log(`Total dokumen akhir: ${finalCount}`);
    } finally {
        await client.close();
    }
}

main().catch((err) => {
    console.error('Import gagal:', err.message);
    process.exit(1);
});
