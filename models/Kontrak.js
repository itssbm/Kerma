const mongoose = require('mongoose');

const rincianBppSchema = new mongoose.Schema({
    tahap:              { type: String, default: '' },
    BPP_per_mahasiswa:    { type: Number, default: null },
    jumlah_peserta_didik: { type: Number, default: null },
    total_BPP:          { type: Number, default: null },
    batas_pembayaran:   { type: String, default: '' }
}, { _id: false });

const kontrakSchema = new mongoose.Schema({
    id_kontrak: { type: String, unique: true },
    id_program: { type: String, default: '' },
    status:     { type: String, enum: ['draft', 'submitted', 'approved', 'rejected'], default: 'draft' },

    // Administrasi
    no_kontrak_mitra: { type: String, default: '' },
    no_kontrak_sbm:   { type: String, default: '' },

    // Tanggal tandatangan
    hari:        { type: String, default: '' },
    tgl_angka:   { type: Number, default: null },
    bulan_angka: { type: Number, default: null },
    tahun_angka: { type: Number, default: null },
    tgl_kata:    { type: String, default: '' },
    bulan_kata:  { type: String, default: '' },
    tahun_kata:  { type: String, default: '' },

    // Info Program
    strata_kata:    { type: String, default: '' },
    prodi:          { type: String, default: '' },
    semester:       { type: String, default: '' },
    tahun_akademik: { type: String, default: '' },

    // Profil Pihak Mitra
    id_mitra:             { type: String, default: '' },
    nama_mitra:           { type: String, default: '' },
    bentuk_usaha_mitra:   { type: String, default: '' },
    nama_pejabat_mitra:   { type: String, default: '' },
    jabatan_pejabat_mitra:{ type: String, default: '' },
    dasar_jabatan_mitra:  { type: String, default: '' },
    industri_mitra:       { type: String, default: '' },
    dasar_pendirian_mitra:{ type: String, default: '' },
    alamat_mitra:         { type: String, default: '' },
    kota_mitra:           { type: String, default: '' },
    provinsi_mitra:       { type: String, default: '' },
    negara_mitra:         { type: String, default: '' },
    kodepos_mitra:        { type: String, default: '' },

    // Korespondensi Mitra
    nama_pic_korespondensi_mitra:    { type: String, default: '' },
    jabatan_pic_korespondensi_mitra: { type: String, default: '' },
    kode_tlp_mitra:                  { type: String, default: '' },
    no_tlp_mitra:                    { type: String, default: '' },
    email_mitra:                     { type: String, default: '' },

    // Profil Pihak SBM
    nama_sbm:           { type: String, default: '' },
    nama_pejabat_sbm:   { type: String, default: '' },
    jabatan_pejabat_sbm:{ type: String, default: '' },
    dasar_jabatan_sbm:  { type: String, default: '' },
    industri_sbm:       { type: String, default: '' },
    dasar_pendirian_sbm:{ type: String, default: '' },
    alamat_sbm:         { type: String, default: '' },
    kota_sbm:           { type: String, default: '' },
    provinsi_sbm:       { type: String, default: '' },
    negara_sbm:         { type: String, default: '' },
    kodepos_sbm:        { type: String, default: '' },

    // Korespondensi SBM
    nama_pic_korespondensi_sbm:    { type: String, default: '' },
    jabatan_pic_korespondensi_sbm: { type: String, default: '' },
    kode_tlp_sbm:                  { type: String, default: '' },
    no_tlp_sbm:                    { type: String, default: '' },
    email_sbm:                     { type: String, default: '' },

    // Waktu Pelaksanaan Program
    jangka_waktu_pelaksanaan_angka_bulan: { type: Number, default: null },
    jangka_waktu_pelaksanaan_kata_bulan:  { type: String, default: '' },
    tgl_awal_program:                     { type: String, default: '' },
    tgl_akhir_program:                    { type: String, default: '' },
    lama_perpanjangan_angka_semester:     { type: Number, default: null },
    lama_perpanjangan_kata_semester:      { type: String, default: '' },
    lama_perpanjangan_angka_bulan:        { type: Number, default: null },
    lama_perpanjangan_kata_bulan:         { type: String, default: '' },

    // Jangka Waktu Perjanjian
    jangka_waktu_kontrak_angka_bulan: { type: Number, default: null },
    jangka_waktu_kontrak_kata_bulan:  { type: String, default: '' },
    tgl_berakhir_kontrak_angka:       { type: Number, default: null },
    bulan_berakhir_kontrak_angka:     { type: Number, default: null },
    tahun_berakhir_kontrak_angka:     { type: Number, default: null },

    // Pembiayaan
    pic_pembiayaan:        { type: String, default: '' },
    nilai_kontrak_angka:   { type: Number, default: null },
    nilai_kontrak_kata:    { type: String, default: '' },
    jumlah_peserta_didik_angka: { type: Number, default: null },
    jumlah_peserta_didik_kata:  { type: String, default: '' },
    BPP_per_peserta_angka: { type: Number, default: null },
    BPP_per_peserta_kata:  { type: String, default: '' },
    BPP_sem_panjang_angka: { type: Number, default: null },
    BPP_sem_panjang_kata:  { type: String, default: '' },
    BPP_sem_pendek_angka:  { type: Number, default: null },
    BPP_sem_pendek_kata:   { type: String, default: '' },
    BPP_ulang_panjang_angka: { type: Number, default: null },
    BPP_ulang_pendek_angka:  { type: Number, default: null },
    BPP_tugas_akhir_angka:   { type: Number, default: null },

    // Rincian BPP (maks 5 semester)
    rincian_bpp: { type: [rincianBppSchema], default: [] },

    // Workflow
    dibuat_oleh:      { type: String, default: '' },
    dibuat_pada:      { type: Date, default: Date.now },
    disubmit_pada:    { type: Date, default: null },
    diapprove_oleh:   { type: String, default: '' },
    diapprove_pada:   { type: Date, default: null },
    catatan_reviewer: { type: String, default: '' }
}, { timestamps: false });

module.exports = mongoose.model('Kontrak', kontrakSchema, 'kontrak');
