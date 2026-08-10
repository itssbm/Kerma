const app = require('../app');
const connectDB = require('../db');

let initialized = null;

async function ensureReady() {
    if (initialized) return initialized;
    initialized = connectDB().catch(err => {
        // Cold start berikutnya harus dapat mencoba koneksi ulang.
        initialized = null;
        throw err;
    });
    return initialized;
}

module.exports = async (req, res) => {
    try {
        await ensureReady();
        // Vercel Node Functions memberikan IncomingMessage/ServerResponse
        // standar. Express dapat menanganinya langsung tanpa adapter Lambda.
        return app(req, res);
    } catch (err) {
        console.error('Gagal init aplikasi:', err?.message || err);
        return res.status(503).json({ pesan: 'Layanan belum siap. Coba lagi beberapa saat.' });
    }
};
