require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Program = require('../models/Program');
const Cicilan = require('../models/Cicilan');
const Kontrak = require('../models/Kontrak');
const RealisasiPembayaran = require('../models/RealisasiPembayaran');

const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatTanggalDisplay(val) {
    if (!val) return '';
    let d = null;
    if (val instanceof Date) d = val;
    else {
        const s = val.toString().trim();
        const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
        else {
            const p = new Date(s);
            if (!isNaN(p)) d = p;
        }
    }
    if (!d || isNaN(d)) return val?.toString() || '';
    return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
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
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    return s;
}

function parseTanggalDashboard(val) {
    if (!val) return null;
    if (val instanceof Date) {
        const d = new Date(val);
        d.setHours(0, 0, 0, 0);
        return isNaN(d) ? null : d;
    }
    const s = val.toString().trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    const d = new Date(s);
    if (isNaN(d)) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatTanggalISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatRupiahAngka(n) {
    return Number(n || 0).toLocaleString('id-ID');
}

function hitungStatusKontrak(tglAkhirRaw) {
    if (!tglAkhirRaw) return 'Berakhir';
    const tglAkhir = parseTanggalDashboard(tglAkhirRaw);
    if (!tglAkhir) return 'Berakhir';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tglAkhir >= today ? 'Berjalan' : 'Berakhir';
}

function buatRencanaPendapatanKey(row) {
    return [
        row.id_program || '',
        row.kode_file || '',
        row.sumber || '',
        row.tahap || row.label || '',
        row.tanggal_input || row.tanggal || '',
        Number(row.nominal) || 0
    ].map(part => String(part).trim()).join('|');
}

function buatRencanaPendapatanFallbackKey(row) {
    const tanggal = formatTanggalInput(row.tanggal_input || row.rencana_tanggal || row.tanggal || '');
    const nominal = Number(row.nominal ?? row.rencana_nominal) || 0;
    if (!row.id_program || !row.kode_file || !tanggal || nominal <= 0) return '';
    return [row.id_program, row.kode_file, tanggal, nominal]
        .map(part => String(part).trim())
        .join('|');
}

function normalisasiKeyBagian(value) {
    return String(value || '')
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function buatRencanaPendapatanRowDariJadwal(item) {
    const row = {
        id_program: item.id_program || '',
        kode_file: item.kode_file || '',
        nama_mitra: item.nama_mitra || '',
        judul_pks: item.judul || '',
        tahap: item.label || 'Pembayaran',
        sumber: item.sumber || 'Kontrak',
        tanggal_diterima: item.tanggal_display || 'N/A',
        tanggal_input: item.tanggal || '',
        nominal: Number(item.nominal) || 0,
        nominal_display: item.nominal_display || `Rp ${formatRupiahAngka(item.nominal)}`,
        status_jadwal: 'Terjadwal',
        keterangan: 'Tanggal pembayaran sudah tersedia pada data kontrak.',
        termin_order: Number(item.termin_order) || null
    };
    return { ...row, rencana_key: buatRencanaPendapatanKey(row) };
}

function buatIndexRencanaPembayaran(jadwal = []) {
    const byKey = new Map();
    const byProgramTahapNominal = new Map();
    const byKodeTahapNominal = new Map();
    const byProgramNominal = new Map();
    const byKodeNominal = new Map();
    const byProgram = new Map();
    const byKode = new Map();

    const add = (map, key, item) => {
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    };

    const rows = jadwal
        .map(buatRencanaPendapatanRowDariJadwal)
        .filter(row => row.tanggal_input)
        .sort((a, b) => {
            const tA = parseTanggalDashboard(a.tanggal_input)?.getTime() || 0;
            const tB = parseTanggalDashboard(b.tanggal_input)?.getTime() || 0;
            if (tA !== tB) return tA - tB;
            return String(a.tahap || '').localeCompare(String(b.tahap || ''), 'id', { numeric: true });
        });

    rows.forEach(row => {
        const idProgram = String(row.id_program || '').trim();
        const kodeFile = String(row.kode_file || '').trim();
        const tahap = normalisasiKeyBagian(row.tahap);
        const nominal = Number(row.nominal) || 0;
        add(byKey, row.rencana_key, row);
        add(byProgramTahapNominal, `${idProgram}|${tahap}|${nominal}`, row);
        add(byKodeTahapNominal, `${kodeFile}|${tahap}|${nominal}`, row);
        add(byProgramNominal, `${idProgram}|${nominal}`, row);
        add(byKodeNominal, `${kodeFile}|${nominal}`, row);
        add(byProgram, idProgram, row);
        add(byKode, kodeFile, row);
    });

    return { byKey, byProgramTahapNominal, byKodeTahapNominal, byProgramNominal, byKodeNominal, byProgram, byKode };
}

function ambilRencanaBelumDipakai(map, key) {
    if (!key) return null;
    const queue = map.get(key);
    if (!queue) return null;
    while (queue.length && queue[0].__dipakai) queue.shift();
    const item = queue.shift();
    if (item) item.__dipakai = true;
    return item || null;
}

function cariRencanaPembayaranUntukRealisasi(row, index) {
    const rencanaKey = String(row.rencana_key || '').trim();
    const exact = ambilRencanaBelumDipakai(index.byKey, rencanaKey);
    if (exact) return exact;

    const tanggalTersimpan = formatTanggalInput(row.rencana_tanggal || '');
    if (tanggalTersimpan) {
        return {
            tanggal_input: tanggalTersimpan,
            tanggal_diterima: formatTanggalDisplay(tanggalTersimpan)
        };
    }

    const idProgram = String(row.id_program || '').trim();
    const kodeFile = String(row.kode_file || '').trim();
    const tahap = normalisasiKeyBagian(row.rencana_tahap || '');
    const nominal = Number(row.rencana_nominal) || Number(row.nominal) || 0;
    return (
        ambilRencanaBelumDipakai(index.byProgramTahapNominal, `${idProgram}|${tahap}|${nominal}`) ||
        ambilRencanaBelumDipakai(index.byKodeTahapNominal, `${kodeFile}|${tahap}|${nominal}`) ||
        ambilRencanaBelumDipakai(index.byProgramNominal, `${idProgram}|${nominal}`) ||
        ambilRencanaBelumDipakai(index.byKodeNominal, `${kodeFile}|${nominal}`) ||
        ambilRencanaBelumDipakai(index.byProgram, idProgram) ||
        ambilRencanaBelumDipakai(index.byKode, kodeFile) ||
        null
    );
}

async function bangunJadwalPembiayaan() {
    const [programs, cicilanList, kontrakList] = await Promise.all([
        Program.find({}).lean(),
        Cicilan.find({}).sort({ id_program: 1, no_cicilan: 1 }).lean(),
        Kontrak.find({ status: 'approved' }).lean()
    ]);

    const cicilanByProgram = new Map();
    cicilanList.forEach(c => {
        if (!cicilanByProgram.has(c.id_program)) cicilanByProgram.set(c.id_program, []);
        cicilanByProgram.get(c.id_program).push(c);
    });

    const jadwal = [];
    const programDenganJadwal = new Set();

    const nominalCicilanProgram = (p, c) => {
        const nominalDasar = Number(c?.nominal) || 0;
        if (p?.cara_pembayaran !== 'Unit Price') return nominalDasar;
        return nominalDasar * (Number(p?.jumlah_mahasiswa) || 0);
    };

    const pushJadwal = ({ tanggal, nominal, id_program, kode_file, nama_mitra, judul, label, sumber, status_kontrak, termin_order }) => {
        const dueDate = parseTanggalDashboard(tanggal);
        const nilai = Number(nominal) || 0;
        if (!dueDate || nilai <= 0) return false;
        jadwal.push({
            tanggal: formatTanggalISO(dueDate),
            tanggal_display: formatTanggalDisplay(tanggal),
            dueDate,
            nominal: nilai,
            nominal_display: `Rp ${formatRupiahAngka(nilai)}`,
            id_program: id_program || '',
            kode_file: kode_file || '',
            nama_mitra: nama_mitra || '',
            judul: judul || '',
            label: label || 'Pembayaran',
            sumber: sumber || 'Program',
            status_kontrak: status_kontrak || '',
            termin_order: Number(termin_order) || null
        });
        if (id_program) programDenganJadwal.add(id_program);
        return true;
    };

    programs.forEach(p => {
        const statusKontrak = hitungStatusKontrak(p.tgl_akhir_kontrak);
        const cicilanProgram = cicilanByProgram.get(p.id_program) || [];

        if ((p.cara_pembayaran === 'Termin' || p.cara_pembayaran === 'Unit Price') && cicilanProgram.length > 0) {
            cicilanProgram.forEach(c => {
                pushJadwal({
                    tanggal: c.batas_akhir,
                    nominal: nominalCicilanProgram(p, c),
                    id_program: p.id_program,
                    kode_file: p.kode_file,
                    nama_mitra: p.nama_mitra,
                    judul: p.judul_pks,
                    label: c.label || `Cicilan ${c.no_cicilan}`,
                    sumber: p.cara_pembayaran,
                    status_kontrak: statusKontrak,
                    termin_order: c.no_cicilan
                });
            });
        } else {
            pushJadwal({
                tanggal: p.batas_akhir_pembayaran,
                nominal: Number(p.nilai_kontrak) || 0,
                id_program: p.id_program,
                kode_file: p.kode_file,
                nama_mitra: p.nama_mitra,
                judul: p.judul_pks,
                label: p.cara_pembayaran || 'Lump Sum',
                sumber: 'Program',
                status_kontrak: statusKontrak
            });
        }
    });

    const programMap = new Map(programs.map(p => [p.id_program, p]));
    kontrakList.forEach(k => {
        if (k.id_program && programDenganJadwal.has(k.id_program)) return;
        const program = programMap.get(k.id_program) || {};
        (k.rincian_bpp || []).forEach((r, i) => {
            pushJadwal({
                tanggal: r.batas_pembayaran,
                nominal: Number(r.total_BPP) || 0,
                id_program: k.id_program || k.id_kontrak,
                kode_file: program.kode_file || '',
                nama_mitra: k.nama_mitra,
                judul: k.no_kontrak_sbm || k.no_kontrak_mitra || k.id_kontrak,
                label: r.tahap || `Rincian BPP ${i + 1}`,
                sumber: 'Kontrak Approved',
                status_kontrak: k.status,
                termin_order: i + 1
            });
        });
    });

    jadwal.sort((a, b) => a.dueDate - b.dueDate || a.nama_mitra.localeCompare(b.nama_mitra, 'id'));
    return { jadwal, programs };
}

function clonePlain(row) {
    return {
        ...row,
        _id: String(row._id),
        createdAt: row.createdAt ? row.createdAt.toISOString?.() || row.createdAt : row.createdAt,
        updatedAt: row.updatedAt ? row.updatedAt.toISOString?.() || row.updatedAt : row.updatedAt
    };
}

function ringkasTanggal(rows) {
    const byTanggal = new Map();
    rows.forEach(row => {
        const tanggal = formatTanggalInput(row.tanggal) || '(kosong)';
        byTanggal.set(tanggal, (byTanggal.get(tanggal) || 0) + 1);
    });
    return [...byTanggal.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const backupDir = path.resolve(__dirname, '..', 'data');
    fs.mkdirSync(backupDir, { recursive: true });

    await mongoose.connect(process.env.MONGODB_URI);
    const rows = await RealisasiPembayaran.find({}).sort({ tanggal: 1, _id: 1 }).lean();
    const backupPath = path.join(
        backupDir,
        `backup-realisasi-pembayaran-before-sync-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    fs.writeFileSync(backupPath, JSON.stringify(rows.map(clonePlain), null, 2));

    const { jadwal } = await bangunJadwalPembiayaan();
    const index = buatIndexRencanaPembayaran(jadwal);

    const hasil = {
        total: rows.length,
        akan_update: 0,
        sudah_sama: 0,
        tanpa_rencana: 0,
        gagal_kosong_tanggal: 0,
        contoh_update: [],
        contoh_tanpa_rencana: []
    };
    const updates = [];

    rows.forEach(row => {
        const rencana = cariRencanaPembayaranUntukRealisasi(row, index);
        const tanggalRencana = formatTanggalInput(rencana?.tanggal_input || '');
        const tanggalSekarang = formatTanggalInput(row.tanggal);

        if (!rencana || !tanggalRencana) {
            hasil.tanpa_rencana += 1;
            if (hasil.contoh_tanpa_rencana.length < 12) {
                hasil.contoh_tanpa_rencana.push({
                    id: String(row._id),
                    kode_file: row.kode_file || '',
                    tanggal_sekarang: tanggalSekarang,
                    nominal: Number(row.nominal) || 0,
                    rencana_key: row.rencana_key || '',
                    rencana_tahap: row.rencana_tahap || ''
                });
            }
            return;
        }

        if (!tanggalSekarang) {
            hasil.gagal_kosong_tanggal += 1;
        }

        if (tanggalSekarang === tanggalRencana && formatTanggalInput(row.rencana_tanggal) === tanggalRencana) {
            hasil.sudah_sama += 1;
            return;
        }

        hasil.akan_update += 1;
        if (hasil.contoh_update.length < 20) {
            hasil.contoh_update.push({
                id: String(row._id),
                kode_file: row.kode_file || '',
                tanggal_lama: tanggalSekarang,
                tanggal_baru: tanggalRencana,
                rencana_tanggal_lama: formatTanggalInput(row.rencana_tanggal),
                nominal: Number(row.nominal) || 0,
                rencana_tahap: row.rencana_tahap || rencana.tahap || ''
            });
        }
        updates.push({
            updateOne: {
                filter: { _id: row._id },
                update: {
                    $set: {
                        tanggal: tanggalRencana,
                        rencana_tanggal: tanggalRencana
                    }
                }
            }
        });
    });

    let bulkResult = null;
    if (!dryRun && updates.length) {
        bulkResult = await RealisasiPembayaran.bulkWrite(updates);
    }

    const rowsAfter = dryRun
        ? rows.map(row => {
            const update = updates.find(item => String(item.updateOne.filter._id) === String(row._id));
            return update ? { ...row, tanggal: update.updateOne.update.$set.tanggal, rencana_tanggal: update.updateOne.update.$set.rencana_tanggal } : row;
        })
        : await RealisasiPembayaran.find({}).sort({ tanggal: 1, _id: 1 }).lean();

    const rows2026 = rowsAfter.filter(row => {
        const t = formatTanggalInput(row.tanggal);
        return t >= '2026-01-01' && t <= '2026-12-31';
    });

    console.log(JSON.stringify({
        dry_run: dryRun,
        backup_path: backupPath,
        total_jadwal_rencana: jadwal.length,
        ...hasil,
        bulk_result: bulkResult ? {
            matched: bulkResult.matchedCount,
            modified: bulkResult.modifiedCount
        } : null,
        setelah_sync: {
            jumlah_tanggal_2026: rows2026.length,
            total_nominal_2026: rows2026.reduce((sum, row) => sum + (Number(row.nominal) || 0), 0),
            top_tanggal: ringkasTanggal(rowsAfter)
        }
    }, null, 2));

    await mongoose.disconnect();
}

main().catch(async err => {
    console.error(err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
});
