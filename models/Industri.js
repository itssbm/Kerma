const mongoose = require('mongoose');

const industriSchema = new mongoose.Schema({
    kode_kategori:       { type: String, required: true, unique: true, trim: true },
    nama_sektor:         { type: String, default: '' },
    contoh_ruang_lingkup:{ type: String, default: '' }
}, { timestamps: false });

module.exports = mongoose.model('Industri', industriSchema, 'industri');
