const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
    id_program:            { type: String, required: true, unique: true, trim: true },
    nama_mitra:            { type: String, default: '' },
    no_kontrak_institusi:  { type: String, default: '' },
    no_kontrak_mitra:      { type: String, default: '' },
    judul_pks:             { type: String, default: '' },
    tgl_kontrak:           { type: String, default: '' },
    tgl_akhir_kontrak:     { type: String, default: '' },
    nilai_kontrak:         { type: Number, default: 0 },
    kode_file:             { type: String, default: '' },
    file_kontrak:          { type: String, default: '' },
    jumlah_mahasiswa:      { type: Number, default: null },
    cara_pembayaran:       { type: String, default: '' },
    tipe_cicilan:          { type: String, default: '' },
    batas_akhir_pembayaran:{ type: String, default: '' },
    harga_per_mahasiswa:   { type: Number, default: null },
    strata:                { type: String, default: '' }
}, { timestamps: false });

module.exports = mongoose.model('Program', programSchema, 'programs');
