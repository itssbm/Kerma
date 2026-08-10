const mongoose = require('mongoose');

const paguAnggaranSchema = new mongoose.Schema({
    id_program:   { type: String, required: true, trim: true },
    kode_file:    { type: String, required: true, unique: true, trim: true },
    pagu_pegawai: { type: Number, default: 0 },
    pagu_barang:  { type: Number, default: 0 },
    pagu_jasa:    { type: Number, default: 0 },
    pagu_modal:   { type: Number, default: 0 },
    sisa_pagu_total: { type: Number, default: null }
}, { timestamps: true });

paguAnggaranSchema.index({ id_program: 1 });

module.exports = mongoose.model('PaguAnggaran', paguAnggaranSchema, 'pagu_anggaran');
