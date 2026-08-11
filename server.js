const app = require('./app');
const connectDB = require('./db');

const PORT = process.env.PORT || 3000;

(async () => {
    await connectDB();
    if (typeof app.initDataIndustri === 'function') {
        try {
            await app.initDataIndustri();
        } catch (err) {
            console.error('Init data industri dilewati (bukan blocker startup):', err?.message || err);
        }
    }
    app.listen(PORT, () => console.log(`Sistem berjalan di http://localhost:${PORT}`));
})();

module.exports = app;
