const mongoose = require('mongoose');

const mitraSchema = new mongoose.Schema({
    id_mitra:   { type: String, required: true, unique: true, trim: true },
    nama_mitra: { type: String, default: '' },
    industri:   { type: String, default: '' },
    alamat:     { type: String, default: '' },
    provinsi:   { type: String, default: '' },
    kota:       { type: String, default: '' },
    negara:     { type: String, default: '' }
}, { timestamps: false });

module.exports = mongoose.model('Mitra', mitraSchema, 'mitra');
