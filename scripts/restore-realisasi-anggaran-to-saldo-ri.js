require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Program = require('../models/Program');
const RencanaAnggaran = require('../models/RencanaAnggaran');
const RealisasiAnggaran = require('../models/RealisasiAnggaran');

const KATEGORI_REALISASI_ANGGARAN = new Set([
    'Belanja Pegawai',
    'Belanja Barang',
    'Belanja Jasa',
    'Belanja Modal'
]);

const defaultBackup = 'data/backups/realisasi-anggaran-before-reset-2026-07-12T07-18-59-108Z.json';
const backupPath = path.resolve(process.cwd(), process.argv[2] || defaultBackup);

function rupiah(n) {
    return Number(n || 0).toLocaleString('id-ID');
}

function clean(value) {
    return String(value || '').trim();
}

async function backupCurrentState() {
    const backupDir = path.join(process.cwd(), 'data', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(backupDir, `saldo-ri-current-before-restore-${stamp}.json`);
    const [rencana, realisasi] = await Promise.all([
        RencanaAnggaran.find({}).lean(),
        RealisasiAnggaran.find({}).lean()
    ]);
    fs.writeFileSync(filePath, JSON.stringify({
        created_at: new Date().toISOString(),
        reason: 'Backup sebelum pemulihan data lama Rekapitulasi Realisasi Anggaran ke Saldo RI',
        rencana_anggaran: rencana,
        realisasi_anggaran: realisasi
    }, null, 2));
    return filePath;
}

async function syncRekapFromRealisasiRi(row, program = {}) {
    const nominal = Number(row.pengeluaran_ri) || 0;
    if (nominal <= 0) return null;
    return RealisasiAnggaran.findOneAndUpdate(
        { id_rencana_anggaran: String(row._id) },
        {
            id_program: row.id_program || program.id_program || '',
            kode_file: row.kode_file || program.kode_file || '',
            id_rencana_anggaran: String(row._id),
            sumber: 'saldo_ri',
            kategori: row.kategori_belanja,
            tanggal: row.tanggal_realisasi_ri || row.tgl_invoice || row.tanggal_ri || '',
            nominal,
            keterangan: row.uraian || ''
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
}

async function main() {
    if (!fs.existsSync(backupPath)) {
        throw new Error(`File backup tidak ditemukan: ${backupPath}`);
    }

    const legacy = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const rows = Array.isArray(legacy.data) ? legacy.data : [];

    await mongoose.connect(process.env.MONGODB_URI);
    const safetyBackup = await backupCurrentState();
    const programs = await Program.find({}).lean();
    const programById = new Map(programs.map(program => [program.id_program, program]));
    const programByKode = new Map(programs.map(program => [clean(program.kode_file), program]));

    let createdRi = 0;
    let createdRealisasiRi = 0;
    let syncedRekap = 0;
    let skipped = 0;
    const skippedRows = [];

    for (const old of rows) {
        const legacyId = clean(old._id);
        const nominal = Number(old.nominal) || 0;
        const kategori = clean(old.kategori);
        const kodeFile = clean(old.kode_file);
        const program = programById.get(clean(old.id_program)) || programByKode.get(kodeFile) || {};
        const idProgram = clean(old.id_program) || clean(program.id_program);
        const kode = kodeFile || clean(program.kode_file);

        if (!legacyId || nominal <= 0 || !idProgram || !kode || !KATEGORI_REALISASI_ANGGARAN.has(kategori)) {
            skipped += 1;
            skippedRows.push({
                id: legacyId,
                kode_file: kode,
                kategori,
                nominal,
                alasan: 'Data tidak lengkap untuk migrasi'
            });
            continue;
        }

        const tanggal = clean(old.tanggal);
        const keterangan = clean(old.keterangan);
        const existingRows = await RencanaAnggaran.find({
            sumber: 'migrasi_rekap_lama',
            id_realisasi_anggaran_lama: legacyId
        });

        let riRow = existingRows.find(row => (Number(row.ri) || 0) > 0);
        if (!riRow) {
            riRow = await RencanaAnggaran.create({
                id_program: idProgram,
                kode_file: kode,
                tanggal_ri: tanggal,
                tanggal_realisasi_ri: '',
                tgl_invoice: tanggal,
                no_invoice: '',
                uraian: keterangan ? `RI - ${keterangan}` : `RI ${kategori}`,
                kategori_belanja: kategori,
                ri: nominal,
                pemasukan: 0,
                pengeluaran_ri: 0,
                sumber: 'migrasi_rekap_lama',
                id_realisasi_anggaran_lama: legacyId
            });
            createdRi += 1;
        }

        let realisasiRiRow = existingRows.find(row => (Number(row.pengeluaran_ri) || 0) > 0);
        if (!realisasiRiRow) {
            realisasiRiRow = await RencanaAnggaran.create({
                id_program: idProgram,
                kode_file: kode,
                tanggal_ri: tanggal,
                tanggal_realisasi_ri: tanggal,
                tgl_invoice: tanggal,
                no_invoice: '',
                uraian: keterangan || `Realisasi RI ${kategori}`,
                kategori_belanja: kategori,
                ri: 0,
                pemasukan: 0,
                pengeluaran_ri: nominal,
                sumber: 'migrasi_rekap_lama',
                id_realisasi_anggaran_lama: legacyId
            });
            createdRealisasiRi += 1;
        }

        await syncRekapFromRealisasiRi(realisasiRiRow, program);
        syncedRekap += 1;
    }

    const [rencanaFinal, rekapFinal] = await Promise.all([
        RencanaAnggaran.find({}).lean(),
        RealisasiAnggaran.find({}).lean()
    ]);
    const totalRi = rencanaFinal.reduce((sum, row) => sum + (Number(row.ri) || 0), 0);
    const totalRealisasiRi = rencanaFinal.reduce((sum, row) => sum + (Number(row.pengeluaran_ri) || 0), 0);
    const totalRekap = rekapFinal.reduce((sum, row) => sum + (Number(row.nominal) || 0), 0);

    console.log('safety_backup', safetyBackup);
    console.log('legacy_rows', rows.length);
    console.log('created_ri_rows', createdRi);
    console.log('created_realisasi_ri_rows', createdRealisasiRi);
    console.log('synced_rekap_rows', syncedRekap);
    console.log('skipped_rows', skipped);
    if (skippedRows.length) console.log(JSON.stringify(skippedRows, null, 2));
    console.log('rencana_anggaran_rows_final', rencanaFinal.length);
    console.log('rekap_realisasi_anggaran_rows_final', rekapFinal.length);
    console.log('total_ri', rupiah(totalRi));
    console.log('total_realisasi_ri', rupiah(totalRealisasiRi));
    console.log('total_rekap', rupiah(totalRekap));
    console.log('selisih_realisasi_ri_vs_rekap', rupiah(totalRealisasiRi - totalRekap));

    await mongoose.disconnect();
}

main().catch(async err => {
    console.error(err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
});
