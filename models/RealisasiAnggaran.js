const mongoose = require('mongoose');

const realisasiAnggaranSchema = new mongoose.Schema({
    id_program: { type: String, required: true, trim: true },
    kode_file:  { type: String, default: '', trim: true },
    id_rencana_anggaran: { type: String, trim: true },
    sumber:     { type: String, default: 'manual', trim: true },
    kategori:   { type: String, required: true, trim: true },
    tanggal:    { type: String, default: '', trim: true },
    nominal:    { type: Number, required: true, default: 0 },
    keterangan: { type: String, default: '' }
}, { timestamps: true });

realisasiAnggaranSchema.index({ kode_file: 1, tanggal: 1, kategori: 1 });
realisasiAnggaranSchema.index({ id_program: 1, tanggal: 1, kategori: 1 });
realisasiAnggaranSchema.index({ id_rencana_anggaran: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('RealisasiAnggaran', realisasiAnggaranSchema, 'realisasi_anggaran');
