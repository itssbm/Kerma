const serverless = require('serverless-http');
const app = require('../app');
const connectDB = require('../db');

const handler = serverless(app);
let initialized = null;

async function ensureReady() {
    if (initialized) return initialized;
    initialized = (async () => {
        await connectDB();
        if (typeof app.initDataIndustri === 'function') {
            await app.initDataIndustri();
        }
    })();
    return initialized;
}

module.exports = async (req, res) => {
    try {
        await ensureReady();
        return handler(req, res);
    } catch (err) {
        console.error('Gagal init aplikasi:', err?.message || err);
        return res.status(503).json({ pesan: 'Layanan belum siap. Coba lagi beberapa saat.' });
    }
};
