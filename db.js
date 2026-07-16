require('dotenv').config();
const mongoose = require('mongoose');

const isProd = process.env.NODE_ENV === 'production';
let connectInFlight = null;

function maskMongoUri(uri) {
    if (!uri) return '';
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

async function connectDB() {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) throw new Error('MONGODB_URI belum disetel di environment.');

    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (connectInFlight) return connectInFlight;

    if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
        throw new Error('MONGODB_URI tidak valid. Harus diawali mongodb:// atau mongodb+srv://');
    }

    console.log('MONGODB URI:', maskMongoUri(uri));
    const allowInvalidCertificates = String(process.env.MONGODB_TLS_ALLOW_INVALID_CERTIFICATES || '').toLowerCase() === 'true';
    const tlsCAFile = process.env.MONGODB_TLS_CA_FILE?.trim();
    const dnsFamily = process.env.MONGODB_DNS_FAMILY?.trim();
    const tlsMinVersion = process.env.MONGODB_TLS_MIN_VERSION?.trim();
    const tlsMaxVersion = process.env.MONGODB_TLS_MAX_VERSION?.trim();

    const options = {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 15000,
        maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
        retryWrites: true
    };

    options.tls = /[?&]tls=true/i.test(uri) || /[?&]ssl=true/i.test(uri) || !/[?&]tls=false/i.test(uri);

    if (tlsCAFile) {
        options.tlsCAFile = tlsCAFile;
    }

    if (dnsFamily) {
        const parsedFamily = Number.parseInt(dnsFamily, 10);
        if ([0, 4, 6].includes(parsedFamily)) {
            options.family = parsedFamily;
        }
    }

    if (tlsMinVersion) options.minVersion = tlsMinVersion;
    if (tlsMaxVersion) options.maxVersion = tlsMaxVersion;

    if (isProd && allowInvalidCertificates) {
        throw new Error('MONGODB_TLS_ALLOW_INVALID_CERTIFICATES tidak boleh diaktifkan di production.');
    }

    if (allowInvalidCertificates) {
        console.warn('KONEKSI DEBUG: MONGODB_TLS_ALLOW_INVALID_CERTIFICATES=true (kurang aman, hanya untuk troubleshooting lokal)');
        options.tlsAllowInvalidCertificates = true;
        options.tlsInsecure = true;
        options.tlsAllowInvalidHostnames = true;
        if (!tlsCAFile) {
            options.tls = true;
        }
    }

    try {
        connectInFlight = mongoose.connect(uri, options);
        const conn = await connectInFlight;
        console.log('Terhubung ke MongoDB Atlas');
        return conn;
    } catch (err) {
        console.error('Gagal terhubung ke MongoDB:', err?.message || err);
        console.error('Detail:', {
            name: err?.name,
            code: err?.code,
            codeName: err?.codeName
        });
        if (!allowInvalidCertificates && String(err?.message || '').includes('tlsv1 alert internal error')) {
            console.error('Rekomendasi cepat: cek koneksi jaringan/VPN/proxy, pastikan IP whitelisted di Atlas, atau set MONGODB_TLS_ALLOW_INVALID_CERTIFICATES=true untuk uji internal cert issue (jangan untuk production).');
        }

        if (!allowInvalidCertificates && !uri.toLowerCase().includes('tls=true')) {
            console.error('Catatan: URI saat ini tanpa flag tls=true. Pada mongodb+srv biasanya otomatis true, tetapi kamu bisa coba set ?tls=true&appName=Cluster-Kerma');
        }

        throw err;
    } finally {
        connectInFlight = null;
    }
}

module.exports = connectDB;
