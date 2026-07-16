const mongoose = require('mongoose');

const rencanaAnggaranSchema = new mongoose.Schema({
    id_program:      { type: String, required: true, trim: true },
    kode_file:       { type: String, required: true, trim: true },
    tanggal_ri:      { type: String, default: '', trim: true },
    tanggal_realisasi_ri:{ type: String, default: '', trim: true },
    tgl_invoice:     { type: String, default: '', trim: true },
    no_invoice:      { type: String, default: '', trim: true },
    uraian:          { type: String, required: true, trim: true },
    kategori_belanja:{ type: String, default: '', trim: true },
    ri:              { type: Number, required: true, default: 0 },
    pemasukan:       { type: Number, required: true, default: 0 },
    pengeluaran_ri:  { type: Number, required: true, default: 0 },
    sumber:          { type: String, default: 'manual', trim: true },
    id_realisasi_anggaran_lama: { type: String, default: '', trim: true }
}, { timestamps: true });

rencanaAnggaranSchema.index({ kode_file: 1, tanggal_ri: 1, createdAt: 1 });
rencanaAnggaranSchema.index({ id_program: 1, tanggal_ri: 1, createdAt: 1 });
rencanaAnggaranSchema.index({ sumber: 1, id_realisasi_anggaran_lama: 1, pengeluaran_ri: 1 });

module.exports = mongoose.model('RencanaAnggaran', rencanaAnggaranSchema, 'rencana_anggaran');
