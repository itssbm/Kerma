'use strict';

const fs = require('fs/promises');
const path = require('path');

require('dotenv').config({
    path: [
        path.resolve(__dirname, '../.env'),
        path.resolve(__dirname, '../../.env')
    ]
});

const connectDB = require('../db');
const InvoicePembayaran = require('../models/InvoicePembayaran');
const RealisasiPembayaran = require('../models/RealisasiPembayaran');

const KODE_FILE = 'SBM.PD-1-51-2025';
const DEFAULT_ACCOUNT = '901102012';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'AGT', 'Sep', 'Okt', 'Nov', 'Des'];
const APPLY = process.argv.includes('--apply');
const BACKUP_ROOT = path.resolve(__dirname, '../data/backups');

const TARGETS = [
    { stage: 1, label: 'Tahap pertama', invoiceDate: '2025-11-26', paymentDate: '2026-01-14' },
    { stage: 2, label: 'Tahap kedua', invoiceDate: '2026-01-02', paymentDate: '2026-03-04' }
];

function text(value) {
    return String(value ?? '').trim();
}

function normalizeText(value) {
    return text(value).replace(/\s+/g, ' ').toLowerCase();
}

function normalizeDate(value) {
    return text(value).slice(0, 10);
}

function stageNumber(value) {
    const valueText = normalizeText(value);
    const digit = valueText.match(/(?:tahap|termin|cicilan|semester)?\s*(\d+)/i);
    if (digit) return Number(digit[1]) || null;
    const words = { pertama: 1, kesatu: 1, satu: 1, kedua: 2, dua: 2 };
    const found = Object.entries(words).find(([word]) => valueText.includes(word));
    return found ? found[1] : null;
}

function isTrue(value) {
    return value === true || text(value).toLowerCase() === 'true';
}

function monthToken(value) {
    return text(value).toLowerCase() === 'agu' ? 'AGT' : text(value);
}

function bkmNumberParts(value) {
    const match = text(value).match(
        /^([^/]+)\/(Jan|Feb|Mar|Apr|Mei|Jun|Jul|AGT|Agu|Sep|Okt|Nov|Des)\/(\d{4})\/(\d+)$/i
    );
    if (!match) return null;
    return {
        account: text(match[1]),
        month: monthToken(match[2]),
        year: Number(match[3]),
        sequence: Number(match[4]) || 0
    };
}

function periodKey(account, dateValue) {
    const match = normalizeDate(dateValue).match(/^(\d{4})-(\d{2})-/);
    if (!match) return '';
    return `${text(account) || DEFAULT_ACCOUNT}|${match[1]}-${match[2]}`;
}

function parsedPeriodKey(account, parsed) {
    const monthIndex = MONTHS.findIndex(month => month.toLowerCase() === parsed.month.toLowerCase());
    if (monthIndex < 0) return '';
    return `${text(account) || DEFAULT_ACCOUNT}|${parsed.year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function bkmNumber(account, dateValue, sequence) {
    const [year, month] = normalizeDate(dateValue).split('-').map(Number);
    return `${text(account) || DEFAULT_ACCOUNT}/${MONTHS[month - 1]}/${year}/${String(sequence).padStart(3, '0')}`;
}

function nextBkmNumber(dateValue, account, existingRows, reserved) {
    const normalizedAccount = text(account) || DEFAULT_ACCOUNT;
    const key = periodKey(normalizedAccount, dateValue);
    let max = 0;

    existingRows.forEach(row => {
        const parsed = bkmNumberParts(row.bkm_nomor);
        if (parsed && parsed.account === normalizedAccount && parsedPeriodKey(normalizedAccount, parsed) === key) {
            max = Math.max(max, parsed.sequence);
            return;
        }
        if (isTrue(row.bkm_sudah_disimpan)
            && periodKey(normalizedAccount, row.bkm_tanggal || row.tanggal || '') === key) {
            max += 1;
        }
    });

    max = Math.max(max, Number(reserved.get(key) || 0));
    const sequence = max + 1;
    reserved.set(key, sequence);
    return bkmNumber(normalizedAccount, dateValue, sequence);
}

function findUniqueStage(rows, target, kind) {
    const matches = rows.filter(row => stageNumber(row.rencana_tahap) === target.stage);
    if (matches.length !== 1) {
        throw new Error(`${kind} ${target.label} ditemukan ${matches.length} record untuk ${KODE_FILE}; seharusnya tepat 1.`);
    }
    return matches[0];
}

function compact(row) {
    return {
        id: text(row?._id),
        tahap: text(row?.rencana_tahap),
        tanggal_invoice: normalizeDate(row?.tanggal_invoice),
        tanggal: normalizeDate(row?.tanggal),
        bkm_tanggal: normalizeDate(row?.bkm_tanggal),
        bkm_nomor: text(row?.bkm_nomor),
        bkm_sudah_disimpan: isTrue(row?.bkm_sudah_disimpan),
        nominal: Number(row?.nominal) || 0,
        nominal_bruto: Number(row?.nominal_bruto) || 0,
        bkm_jumlah: Number(row?.bkm_jumlah) || 0
    };
}

async function main() {
    await connectDB();
    const [invoices, payments, allPayments] = await Promise.all([
        InvoicePembayaran.find({ kode_file: KODE_FILE }).lean(),
        RealisasiPembayaran.find({ kode_file: KODE_FILE }).lean(),
        RealisasiPembayaran.find({}).lean()
    ]);

    const invoicePlans = TARGETS.map(target => ({
        target,
        row: findUniqueStage(invoices, target, 'Invoice')
    }));
    const paymentPlans = TARGETS.map(target => ({
        target,
        row: findUniqueStage(payments, target, 'Pembayaran'),
        bkmNumber: ''
    }));

    const selectedIds = new Set(paymentPlans.map(item => text(item.row._id)));
    const existingRows = allPayments.filter(row => !selectedIds.has(text(row._id)));
    const reserved = new Map();
    paymentPlans
        .slice()
        .sort((a, b) => a.target.paymentDate.localeCompare(b.target.paymentDate) || a.target.stage - b.target.stage)
        .forEach(item => {
            item.bkmNumber = nextBkmNumber(
                item.target.paymentDate,
                text(item.row.bkm_no_rekening) || DEFAULT_ACCOUNT,
                existingRows,
                reserved
            );
        });

    const plan = {
        mode: APPLY ? 'apply' : 'dry-run',
        kode_file: KODE_FILE,
        invoices: invoicePlans.map(item => ({
            tahap: item.target.label,
            id: text(item.row._id),
            tanggal_lama: normalizeDate(item.row.tanggal_invoice),
            tanggal_baru: item.target.invoiceDate,
            nomor_invoice: text(item.row.nomor_invoice)
        })),
        payments: paymentPlans.map(item => ({
            tahap: item.target.label,
            id: text(item.row._id),
            tanggal_lama: normalizeDate(item.row.tanggal),
            tanggal_baru: item.target.paymentDate,
            bkm_tanggal_lama: normalizeDate(item.row.bkm_tanggal),
            bkm_tanggal_baru: item.target.paymentDate,
            bkm_nomor_lama: text(item.row.bkm_nomor),
            bkm_nomor_baru: item.bkmNumber
        }))
    };

    console.log(JSON.stringify(plan, null, 2));
    if (!APPLY) {
        console.log('\nDRY-RUN: tidak ada perubahan database. Jalankan dengan --apply untuk menerapkan perubahan.');
        return;
    }

    const backupDir = path.join(
        BACKUP_ROOT,
        `invoice-payment-date-update-${KODE_FILE.replace(/[^A-Za-z0-9.-]+/g, '_')}-${Date.now()}`
    );
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(path.join(backupDir, 'before.json'), JSON.stringify({
        kode_file: KODE_FILE,
        invoices,
        payments,
        plan
    }, null, 2));

    const now = new Date().toISOString();
    const invoiceResults = [];
    for (const item of invoicePlans) {
        await InvoicePembayaran.findByIdAndUpdate(item.row._id, {
            $set: {
                tanggal_invoice: item.target.invoiceDate,
                updatedAt: now
            }
        });
        invoiceResults.push({
            tahap: item.target.label,
            id: text(item.row._id),
            tanggal_invoice: item.target.invoiceDate
        });
    }

    const paymentResults = [];
    for (const item of paymentPlans) {
        const update = {
            tanggal: item.target.paymentDate,
            updatedAt: now
        };
        if (isTrue(item.row.bkm_sudah_disimpan)) {
            update.bkm_tanggal = item.target.paymentDate;
            update.bkm_nomor = item.bkmNumber;
        }
        await RealisasiPembayaran.findByIdAndUpdate(item.row._id, { $set: update });
        paymentResults.push({
            tahap: item.target.label,
            id: text(item.row._id),
            tanggal: item.target.paymentDate,
            bkm_tanggal: update.bkm_tanggal || normalizeDate(item.row.bkm_tanggal),
            bkm_nomor: update.bkm_nomor || text(item.row.bkm_nomor)
        });
    }

    const [afterInvoices, afterPayments] = await Promise.all([
        InvoicePembayaran.find({ kode_file: KODE_FILE }).sort({ rencana_tanggal: 1 }).lean(),
        RealisasiPembayaran.find({ kode_file: KODE_FILE }).sort({ rencana_tanggal: 1 }).lean()
    ]);
    await fs.writeFile(path.join(backupDir, 'after.json'), JSON.stringify({
        kode_file: KODE_FILE,
        invoice_results: invoiceResults,
        payment_results: paymentResults,
        invoices: afterInvoices,
        payments: afterPayments
    }, null, 2));

    console.log(JSON.stringify({
        applied: true,
        backup_dir: backupDir,
        invoice_results: invoiceResults,
        payment_results: paymentResults,
        verification: {
            invoices: afterInvoices.map(compact),
            payments: afterPayments.map(compact)
        }
    }, null, 2));
}

main().catch(error => {
    console.error(`Update gagal: ${error?.message || error}`);
    process.exitCode = 1;
});
