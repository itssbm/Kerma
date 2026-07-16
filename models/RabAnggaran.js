const mongoose = require('mongoose');

const rabAnggaranSchema = new mongoose.Schema({
    id_program:       { type: String, required: true, trim: true },
    kode_file:        { type: String, required: true, trim: true },
    uraian:           { type: String, required: true, trim: true },
    kategori_belanja: { type: String, required: true, trim: true },
    satuan:           { type: String, default: '', trim: true },
    harga_satuan:     { type: Number, required: true, default: 0 },
    volume:           { type: Number, required: true, default: 0 },
    keterangan:       { type: String, default: '', trim: true }
}, { timestamps: true });

rabAnggaranSchema.index({ kode_file: 1, createdAt: 1 });
rabAnggaranSchema.index({ id_program: 1, createdAt: 1 });

module.exports = mongoose.model('RabAnggaran', rabAnggaranSchema, 'rab_anggaran');
