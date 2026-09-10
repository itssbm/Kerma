/*
 * Create BKM metadata for payment rows whose Admin date and amount already
 * exist. Dry-run is the default; pass --apply to persist the BKM fields.
 */
const fs = require('fs');
const path = require('path');

const connectDB = require('../db');
const RealisasiPembayaran = require('../models/RealisasiPembayaran');
const {
    text,
    normalizeDate,
    number,
    grossPayment
} = require('./cleanup-invalid-pembayaran');

const apply = process.argv.includes('--apply');
const summaryOnly = process.argv.includes('--summary');
const DEFAULT_ACCOUNT = '901102012';
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function isTrue(value) {
    return value === true || String(value || '').toLowerCase() === 'true';
}

function paymentDate(row = {}) {
    return normalizeDate(row.tanggal || row.bkm_tanggal || '');
}

function paymentAmount(row = {}) {
    return grossPayment(row) || number(row.bkm_jumlah);
}

function hasAdminPayment(row = {}) {
    return Boolean(paymentDate(row) && paymentAmount(row) > 0);
}

function accountNumber(row = {}) {
    return text(row.bkm_no_rekening) || DEFAULT_ACCOUNT;
}

function monthKey(dateValue, account = DEFAULT_ACCOUNT) {
    const normalized = normalizeDate(dateValue);
    if (!normalized) return '';
    const [year, month] = normalized.split('-').map(Number);
    return `${account}/${MONTHS_ID[month - 1]}/${year}`;
}

function bkmNumberParts(value = '') {
    const match = text(value).match(/^([^/]+)\/(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\/(\d{4})\/(\d+)$/i);
    if (!match) return null;
    return { account: match[1], month: match[2], year: Number(match[3]), sequence: Number(match[4]) };
}

function sequenceKey(dateValue, account) {
    return monthKey(dateValue, account);
}

function formatBkmSequence(sequence) {
    return String(Math.max(0, Number(sequence) || 0)).padStart(3, '0');
}

function nextBkmNumber(dateValue, account, rows, reserved) {
    const key = sequenceKey(dateValue, account);
    const normalizedDate = normalizeDate(dateValue);
    const [, month, year] = key.split('/');
    let max = 0;

    rows.forEach(row => {
        const existingNumber = bkmNumberParts(row.bkm_nomor);
        if (existingNumber
            && existingNumber.account === account
            && existingNumber.month.toLowerCase() === String(month).toLowerCase()
            && existingNumber.year === Number(year)) {
            max = Math.max(max, existingNumber.sequence);
        }

        if (!existingNumber && isTrue(row.bkm_sudah_disimpan)) {
            const existingDate = normalizeDate(row.bkm_tanggal || row.tanggal || '');
            if (existingDate === normalizedDate && accountNumber(row) === account) max += 1;
        }
    });

    max = Math.max(max, Number(reserved.get(key) || 0));
    const sequence = max + 1;
    reserved.set(key, sequence);
    return `${account}/${month}/${year}/${formatBkmSequence(sequence)}`;
}

function bkmIsComplete(row = {}) {
    return isTrue(row.bkm_sudah_disimpan)
        && text(row.bkm_nomor)
        && normalizeDate(row.bkm_tanggal)
        && number(row.bkm_jumlah) > 0;
}

function defaultUraian(row = {}) {
    return text(row.bkm_uraian)
        || text(row.keterangan)
        || ['Pembayaran', text(row.rencana_tahap), text(row.kode_file)].filter(Boolean).join(' - ');
}

async function main() {
    await connectDB();
    const payments = await RealisasiPembayaran.find({}).lean();
    const numberUpdates = payments
        .filter(row => bkmIsComplete(row))
        .map(row => {
            const parts = bkmNumberParts(row.bkm_nomor);
            if (!parts) return null;
            const normalized = `${parts.account}/${parts.month}/${parts.year}/${formatBkmSequence(parts.sequence)}`;
            return normalized === text(row.bkm_nomor)
                ? null
                : { id: String(row._id), kode_file: text(row.kode_file), from: text(row.bkm_nomor), to: normalized };
        })
        .filter(Boolean);
    const candidates = payments
        .filter(hasAdminPayment)
        .filter(row => !bkmIsComplete(row))
        .map(row => {
            const tanggal = paymentDate(row);
            const jumlah = paymentAmount(row);
            const rekening = accountNumber(row);
            return {
                id: String(row._id),
                kode_file: text(row.kode_file),
                id_program: text(row.id_program),
                tahap: text(row.rencana_tahap),
                tanggal_admin: tanggal,
                jumlah_admin: jumlah,
                rekening,
                nomor_bkm: nextBkmNumber(tanggal, rekening, payments, new Map())
            };
        });

    // Recalculate in a stable pass so sequence allocation is deterministic.
    const reserved = new Map();
    const rowsForAllocation = payments.filter(row => hasAdminPayment(row) && !bkmIsComplete(row));
    const existingRows = payments.filter(row => !rowsForAllocation.includes(row));
    candidates.forEach(item => {
        item.nomor_bkm = nextBkmNumber(item.tanggal_admin, item.rekening, existingRows, reserved);
    });

    const report = {
        generated_at: new Date().toISOString(),
        mode: apply ? 'apply' : 'dry-run',
        total_payments: payments.length,
        candidate_count: candidates.length,
        candidate_codes: [...new Set(candidates.map(item => item.kode_file).filter(Boolean))],
        renumber_count: numberUpdates.length,
        renumber_codes: [...new Set(numberUpdates.map(item => item.kode_file).filter(Boolean))],
        candidates
    };
    const summary = {
        generated_at: report.generated_at,
        mode: report.mode,
        total_payments: report.total_payments,
        candidate_count: report.candidate_count,
        candidate_codes: report.candidate_codes,
        renumber_count: report.renumber_count,
        renumber_codes: report.renumber_codes,
        first_numbers: candidates.slice(0, 10).map(item => ({
            kode_file: item.kode_file,
            tahap: item.tahap,
            tanggal_admin: item.tanggal_admin,
            nomor_bkm: item.nomor_bkm
        }))
    };
    console.log(JSON.stringify(summaryOnly || apply ? summary : report, null, 2));

    if (!apply) {
        console.log(`\nDRY-RUN: ${candidates.length} BKM akan dibuat dan ${numberUpdates.length} nomor BKM akan dinormalisasi jika --apply digunakan.`);
        return;
    }

    const exportDir = path.resolve(__dirname, '../exports');
    fs.mkdirSync(exportDir, { recursive: true });
    const backupPath = path.join(exportDir, `create-bkm-from-admin-payments-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({ report, original_records: payments }, null, 2));

    const results = [];
    for (const item of candidates) {
        const document = await RealisasiPembayaran.findById(item.id);
        if (!document) continue;
        const tanggal = item.tanggal_admin;
        document.bkm_sudah_disimpan = true;
        document.bkm_nomor = item.nomor_bkm;
        document.bkm_tanggal = tanggal;
        document.bkm_jumlah = item.jumlah_admin;
        document.bkm_nama_bank = text(document.bkm_nama_bank) || 'BNI';
        document.bkm_no_rekening = item.rekening;
        document.bkm_nama_rekening = text(document.bkm_nama_rekening) || 'Penampungan - PPM SBM';
        document.bkm_nama_unit = text(document.bkm_nama_unit) || '101221-SBM - Ops. - Ganesa';
        document.bkm_no_bukti = text(document.bkm_no_bukti) || '';
        document.bkm_uraian = defaultUraian(document);
        document.bkm_dibuat_oleh = text(document.bkm_dibuat_oleh) || 'system-migration';
        document.bkm_disimpan_pada = document.bkm_disimpan_pada || new Date().toISOString();
        await document.save();
        results.push({
            id: item.id,
            kode_file: item.kode_file,
            tahap: item.tahap,
            tanggal_admin: tanggal,
            jumlah_admin: item.jumlah_admin,
            nomor_bkm: item.nomor_bkm
        });
    }

    const renumbered = [];
    for (const item of numberUpdates) {
        const document = await RealisasiPembayaran.findById(item.id);
        if (!document) continue;
        document.bkm_nomor = item.to;
        await document.save();
        renumbered.push(item);
    }

    fs.writeFileSync(backupPath, JSON.stringify({ report, original_records: payments, updated: results, renumbered }, null, 2));
    console.log(JSON.stringify({
        updated: results.length,
        renumbered: renumbered.length,
        backup_path: backupPath,
        first_numbers: results.slice(0, 10).map(item => ({ kode_file: item.kode_file, nomor_bkm: item.nomor_bkm }))
    }, null, 2));
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
