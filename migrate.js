/**
 * Script migrasi satu kali: Excel → MongoDB Atlas
 * Jalankan dengan: node migrate.js
 */
require('dotenv').config();
const ExcelJS    = require('exceljs');
const path       = require('path');
const connectDB  = require('./db');
const Program    = require('./models/Program');
const Mahasiswa  = require('./models/Mahasiswa');
const Mitra      = require('./models/Mitra');
const Industri   = require('./models/Industri');
const Cicilan    = require('./models/Cicilan');
const Addendum   = require('./models/Addendum');
const CalonPeserta = require('./models/CalonPeserta');

const DB_PATH = path.join(__dirname, 'data', 'database_kerma.xlsx');

function safeStr(val) {
    if (val == null) return '';
    return val.toString().trim();
}

function safeNum(val) {
    if (val == null || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
}

function formatTanggalInput(val) {
    if (!val) return '';
    if (val instanceof Date) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = val.toString().trim();
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    return s;
}

async function migrasi() {
    await connectDB();

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(DB_PATH);
    console.log('File Excel berhasil dibaca:', DB_PATH);

    // ── Program_Kerma ──────────────────────────────────────────────────────────
    const kermaSheet = wb.getWorksheet('Program_Kerma');
    if (kermaSheet) {
        const docs = [];
        kermaSheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const id = safeStr(row.getCell(1).value);
            if (!id) return;
            docs.push({
                id_program:            id,
                nama_mitra:            safeStr(row.getCell(2).value),
                no_kontrak_institusi:  safeStr(row.getCell(3).value),
                no_kontrak_mitra:      safeStr(row.getCell(4).value),
                judul_pks:             safeStr(row.getCell(5).value),
                tgl_kontrak:           formatTanggalInput(row.getCell(6).value),
                tgl_akhir_kontrak:     formatTanggalInput(row.getCell(7).value),
                nilai_kontrak:         safeNum(row.getCell(8).value) || 0,
                kode_file:             safeStr(row.getCell(9).value),
                file_kontrak:          safeStr(row.getCell(11).value),
                jumlah_mahasiswa:      safeNum(row.getCell(12).value),
                cara_pembayaran:       safeStr(row.getCell(13).value),
                tipe_cicilan:          safeStr(row.getCell(14).value),
                batas_akhir_pembayaran: formatTanggalInput(row.getCell(15).value),
                harga_per_mahasiswa:   safeNum(row.getCell(16).value),
                strata:                safeStr(row.getCell(17).value)
            });
        });
        await Program.deleteMany({});
        if (docs.length > 0) await Program.insertMany(docs);
        console.log(`✓ Program_Kerma: ${docs.length} dokumen`);
    } else {
        console.warn('  Sheet Program_Kerma tidak ditemukan, dilewati.');
    }

    // ── Data_Mahasiswa ────────────────────────────────────────────────────────
    const mhsSheet = wb.getWorksheet('Data_Mahasiswa');
    if (mhsSheet) {
        const docs = [];
        mhsSheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const id  = safeStr(row.getCell(1).value);
            const nim = safeStr(row.getCell(2).value);
            if (!id && !nim) return;
            docs.push({
                id_program:     id,
                nim:            nim,
                nama:           safeStr(row.getCell(3).value),
                fakultas:       safeStr(row.getCell(4).value),
                prodi:          safeStr(row.getCell(5).value),
                tahun_masuk:    safeStr(row.getCell(6).value),
                semester_masuk: safeStr(row.getCell(7).value),
                dosen_wali:     safeStr(row.getCell(8).value),
                status:         safeStr(row.getCell(9).value),
                sks_lulus:      safeNum(row.getCell(10).value),
                ipk:            safeNum(row.getCell(11).value),
                pembimbing_1:   safeStr(row.getCell(12).value),
                pembimbing_2:   safeStr(row.getCell(13).value)
            });
        });
        await Mahasiswa.deleteMany({});
        if (docs.length > 0) await Mahasiswa.insertMany(docs, { ordered: false }).catch(e => {
            if (e.code !== 11000) throw e;
            console.warn('  Beberapa duplikat NIM dilewati.');
        });
        console.log(`✓ Data_Mahasiswa: ${docs.length} dokumen`);
    } else {
        console.warn('  Sheet Data_Mahasiswa tidak ditemukan, dilewati.');
    }

    // ── Data_Mitra ────────────────────────────────────────────────────────────
    const mitraSheet = wb.getWorksheet('Data_Mitra');
    if (mitraSheet) {
        const docs = [];
        mitraSheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const id = safeStr(row.getCell(1).value);
            if (!id) return;
            docs.push({
                id_mitra:   id,
                nama_mitra: safeStr(row.getCell(2).value),
                industri:   safeStr(row.getCell(3).value),
                alamat:     safeStr(row.getCell(4).value),
                provinsi:   safeStr(row.getCell(5).value),
                kota:       safeStr(row.getCell(6).value),
                negara:     safeStr(row.getCell(10).value) || safeStr(row.getCell(7).value)
            });
        });
        await Mitra.deleteMany({});
        if (docs.length > 0) await Mitra.insertMany(docs);
        console.log(`✓ Data_Mitra: ${docs.length} dokumen`);
    } else {
        console.warn('  Sheet Data_Mitra tidak ditemukan, dilewati.');
    }

    // ── Data_Industri ─────────────────────────────────────────────────────────
    const industriSheet = wb.getWorksheet('Data_Industri');
    if (industriSheet) {
        const docs = [];
        industriSheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const kode = safeStr(row.getCell(1).value);
            if (!kode) return;
            docs.push({
                kode_kategori:        kode.toUpperCase(),
                nama_sektor:          safeStr(row.getCell(2).value),
                contoh_ruang_lingkup: safeStr(row.getCell(3).value)
            });
        });
        await Industri.deleteMany({});
        if (docs.length > 0) await Industri.insertMany(docs);
        console.log(`✓ Data_Industri: ${docs.length} dokumen`);
    } else {
        console.warn('  Sheet Data_Industri tidak ditemukan, dilewati.');
    }

    // ── Data_Cicilan ──────────────────────────────────────────────────────────
    const cicilanSheet = wb.getWorksheet('Data_Cicilan');
    if (cicilanSheet) {
        const docs = [];
        cicilanSheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const id = safeStr(row.getCell(1).value);
            if (!id) return;
            docs.push({
                id_program:  id,
                no_cicilan:  safeNum(row.getCell(2).value) || 1,
                label:       safeStr(row.getCell(3).value),
                nominal:     safeNum(row.getCell(4).value) || 0,
                batas_akhir: formatTanggalInput(row.getCell(5).value)
            });
        });
        await Cicilan.deleteMany({});
        if (docs.length > 0) await Cicilan.insertMany(docs);
        console.log(`✓ Data_Cicilan: ${docs.length} dokumen`);
    } else {
        console.log('  Sheet Data_Cicilan tidak ditemukan, dilewati.');
    }

    // ── Data_Addendum ─────────────────────────────────────────────────────────
    const addSheet = wb.getWorksheet('Data_Addendum');
    if (addSheet) {
        const docs = [];
        addSheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const id = safeStr(row.getCell(1).value);
            if (!id) return;
            docs.push({
                id_program: id,
                no:         safeNum(row.getCell(2).value) || 1,
                nama_file:  safeStr(row.getCell(3).value),
                tgl_upload: safeStr(row.getCell(4).value)
            });
        });
        await Addendum.deleteMany({});
        if (docs.length > 0) await Addendum.insertMany(docs);
        console.log(`✓ Data_Addendum: ${docs.length} dokumen`);
    } else {
        console.log('  Sheet Data_Addendum tidak ditemukan, dilewati.');
    }

    // ── Data_CalonPeserta ─────────────────────────────────────────────────────
    const calonSheet = wb.getWorksheet('Data_CalonPeserta');
    if (calonSheet) {
        const docs = [];
        calonSheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const id = safeStr(row.getCell(1).value);
            if (!id) return;
            docs.push({
                id_program:   id,
                no_seleksi:   safeStr(row.getCell(2).value),
                nama_lengkap: safeStr(row.getCell(3).value)
            });
        });
        await CalonPeserta.deleteMany({});
        if (docs.length > 0) await CalonPeserta.insertMany(docs);
        console.log(`✓ Data_CalonPeserta: ${docs.length} dokumen`);
    } else {
        console.log('  Sheet Data_CalonPeserta tidak ditemukan, dilewati.');
    }

    console.log('\nMigrasi selesai!');
    process.exit(0);
}

migrasi().catch(err => {
    console.error('Migrasi gagal:', err);
    process.exit(1);
});
