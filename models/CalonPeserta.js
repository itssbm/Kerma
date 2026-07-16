const mongoose = require('mongoose');

const calonPesertaSchema = new mongoose.Schema({
    id_program:   { type: String, required: true, trim: true },
    no_seleksi:   { type: String, required: true, trim: true },
    nama_lengkap: { type: String, default: '' }
}, { timestamps: false });

module.exports = mongoose.model('CalonPeserta', calonPesertaSchema, 'calon_peserta');
