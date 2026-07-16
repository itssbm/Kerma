const mongoose = require('mongoose');

const mahasiswaSchema = new mongoose.Schema({
    id_program:     { type: String, required: true, trim: true },
    nim:            { type: String, required: true, trim: true },
    nama:           { type: String, default: '' },
    fakultas:       { type: String, default: '' },
    prodi:          { type: String, default: '' },
    tahun_masuk:    { type: String, default: '' },
    semester_masuk: { type: String, default: '' },
    dosen_wali:     { type: String, default: '' },
    status:         { type: String, default: '' },
    sks_lulus:      { type: Number, default: null },
    ipk:            { type: Number, default: null },
    pembimbing_1:   { type: String, default: '' },
    pembimbing_2:   { type: String, default: '' }
}, { timestamps: false });

mahasiswaSchema.index({ id_program: 1, nim: 1 }, { unique: true });

module.exports = mongoose.model('Mahasiswa', mahasiswaSchema, 'mahasiswa');
