const mongoose = require('mongoose');

const realisasiPembayaranSchema = new mongoose.Schema({
    id_program: { type: String, required: true, trim: true },
    kode_file:  { type: String, required: true, trim: true },
    tanggal:    { type: String, required: true, trim: true },
    nominal_bruto: { type: Number, default: 0 },
    potongan_persen: { type: Number, default: 0 },
    nominal:    { type: Number, required: true, default: 0 },
    keterangan: { type: String, default: '' },
    rencana_key: { type: String, default: '', trim: true },
    rencana_tahap: { type: String, default: '' },
    rencana_tanggal: { type: String, default: '' },
    rencana_nominal: { type: Number, default: 0 }
}, { timestamps: true });

realisasiPembayaranSchema.index({ kode_file: 1, tanggal: 1 });
realisasiPembayaranSchema.index({ id_program: 1, tanggal: 1 });
realisasiPembayaranSchema.index({ rencana_key: 1 });

module.exports = mongoose.model('RealisasiPembayaran', realisasiPembayaranSchema, 'realisasi_pembayaran');
