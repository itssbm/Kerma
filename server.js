const app = require('./app');
const connectDB = require('./db');

const PORT = process.env.PORT || 3000;

(async () => {
    await connectDB();
    if (typeof app.initDataIndustri === 'function') {
        await app.initDataIndustri();
    }
    app.listen(PORT, () => console.log(`Sistem berjalan di http://localhost:${PORT}`));
})();

module.exports = app;
