/*
 * Audit/create invoices for PKS terms that are in the invoice window and
 * already have an Admin payment date and amount. Dry-run is the default;
 * pass --apply to persist invoices.
 */
const fs = require('fs');
const path = require('path');
const connectDB = require('../db');
const InvoicePembayaran = require('../models/InvoicePembayaran');
const Program = require('../models/Program');
const RealisasiPembayaran = require('../models/RealisasiPembayaran');
const {
    text,
    normalizeDate,
    number,
    grossPayment,
    buildValidTerms,
    findMatchingTerm
} = require('./cleanup-invalid-pembayaran');

const apply = process.argv.includes('--apply');
const summaryOnly = process.argv.includes('--summary');

function dateOnly(value) {
    const normalized = normalizeDate(value);
    if (!normalized) return null;
    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function isoDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function subtractOneMonth(value) {
    const date = dateOnly(value);
    if (!date) return '';
    const originalDay = date.getDate();
    const targetMonth = date.getMonth() - 1;
    const result = new Date(date.getFullYear(), targetMonth, 1);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(originalDay, lastDay));
    return isoDate(result);
}

function daysUntil(value, today = new Date()) {
    const due = dateOnly(value);
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!due) return null;
    return Math.round((due.getTime() - base.getTime()) / 86400000);
}

function inInvoiceWindow(value) {
    const remaining = daysUntil(value);
    return remaining !== null && remaining <= 30;
}

function isTrue(value) {
    return value === true || String(value || '').toLowerCase() === 'true';
}

function hasAdminPayment(row = {}) {
    const date = normalizeDate(row.tanggal || row.bkm_tanggal || '');
    const amount = grossPayment(row) || number(row.bkm_jumlah);
    return Boolean(date && amount > 0);
}

function adminDate(row = {}) {
    return normalizeDate(row.tanggal || row.bkm_tanggal || '');
}

function adminAmount(row = {}) {
    return grossPayment(row) || number(row.bkm_jumlah);
}

function bkmAmount(row = {}) {
    return isTrue(row.bkm_sudah_disimpan) ? adminAmount(row) : 0;
}

function invoiceMatchesTerm(invoice = {}, term = {}) {
    const key = text(invoice.rencana_key);
    if (key && key === text(term.rencana_key)) return true;
    return text(invoice.kode_file).toLowerCase() === text(term.kode_file).toLowerCase()
        && text(invoice.rencana_tahap).toLowerCase() === text(term.tahap).toLowerCase()
        && normalizeDate(invoice.rencana_tanggal) === normalizeDate(term.tanggal_input)
        && number(invoice.rencana_nominal) > 0
        && number(term.nominal) > 0
        && number(invoice.rencana_nominal) === number(term.nominal);
}

async function nextInvoiceNumber(invoiceDate, existingInvoices, reservedNumbers) {
    const year = String(invoiceDate).slice(0, 4);
    const used = new Set(
        existingInvoices
            .filter(row => String(row.tanggal_invoice || '').startsWith(`${year}-`))
            .map(row => String(row.nomor_invoice || '').trim())
            .filter(Boolean)
    );
    reservedNumbers.forEach(numberValue => used.add(numberValue));
    let sequence = 1;
    while (used.has(`NO. ${String(sequence).padStart(3, '0')}/IT1.C09.2/KU/${year}`)) sequence += 1;
    const result = `NO. ${String(sequence).padStart(3, '0')}/IT1.C09.2/KU/${year}`;
    reservedNumbers.add(result);
    return result;
}

async function main() {
    await connectDB();
    const { terms } = await buildValidTerms();
    const exactKeys = new Map(terms.map(term => [term.rencana_key, term]));
    const [payments, invoices, programs] = await Promise.all([
        RealisasiPembayaran.find({}).lean(),
        InvoicePembayaran.find({}).lean(),
        Program.find({}).lean()
    ]);
    const programById = new Map(programs.map(row => [text(row.id_program), row]));

    const paymentsByTerm = new Map();
    payments.forEach(payment => {
        const term = findMatchingTerm(payment, terms, exactKeys);
        if (!term || !hasAdminPayment(payment)) return;
        const key = text(term.rencana_key);
        if (!paymentsByTerm.has(key)) paymentsByTerm.set(key, []);
        paymentsByTerm.get(key).push(payment);
    });

    const candidates = terms
        .filter(term => inInvoiceWindow(term.tanggal_input))
        .map(term => {
            const paymentRows = paymentsByTerm.get(text(term.rencana_key)) || [];
            const matchingInvoice = invoices.find(invoice => invoiceMatchesTerm(invoice, term));
            if (!paymentRows.length || matchingInvoice) return null;
            const paidGross = paymentRows.reduce((sum, row) => sum + adminAmount(row), 0);
            const paidByBkm = paymentRows.reduce((sum, row) => sum + bkmAmount(row), 0);
            // Match the visible status: a fully paid BKM is Lunas, while a
            // legacy Admin payment without BKM remains Buat Invoice.
            if (paidByBkm > 0 && paidByBkm >= number(term.nominal)) return null;
            return {
                term,
                paymentRows,
                existingInvoice: null,
                kode_file: term.kode_file,
                id_program: term.id_program,
                tahap: term.tahap,
                tanggal_pks: term.tanggal_input,
                tanggal_invoice: subtractOneMonth(term.tanggal_input),
                nominal_pks: number(term.nominal),
                nominal_admin: paidGross,
                nominal_invoice: number(term.nominal),
                nominal_sisa_setelah_admin: Math.max(0, number(term.nominal) - paidGross),
                admin_dates: [...new Set(paymentRows.map(adminDate).filter(Boolean))],
                bkm_sudah_disimpan: paymentRows.some(row => isTrue(row.bkm_sudah_disimpan))
            };
        })
        .filter(Boolean);

    const report = {
        generated_at: new Date().toISOString(),
        mode: apply ? 'apply' : 'dry-run',
        candidates: candidates.map(item => ({
            kode_file: item.kode_file,
            id_program: item.id_program,
            tahap: item.tahap,
            tanggal_pks: item.tanggal_pks,
            tanggal_invoice: item.tanggal_invoice,
            nominal_pks: item.nominal_pks,
            nominal_admin: item.nominal_admin,
            nominal_invoice: item.nominal_invoice,
            nominal_sisa_setelah_admin: item.nominal_sisa_setelah_admin,
            admin_dates: item.admin_dates,
            bkm_sudah_disimpan: item.bkm_sudah_disimpan
        }))
    };
    const reportSummary = {
        generated_at: report.generated_at,
        mode: report.mode,
        candidate_count: candidates.length,
        candidate_codes: [...new Set(candidates.map(item => item.kode_file))],
        total_nominal_invoice: candidates.reduce((sum, item) => sum + item.nominal_invoice, 0)
    };
    console.log(JSON.stringify(summaryOnly || apply ? reportSummary : report, null, 2));

    if (!apply) {
        console.log(`\nDRY-RUN: ${candidates.length} invoice akan dibuat jika --apply digunakan.`);
        return;
    }

    const exportDir = path.resolve(__dirname, '../exports');
    fs.mkdirSync(exportDir, { recursive: true });
    const backupPath = path.join(exportDir, `create-invoices-from-admin-payments-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({ report, records: [] }, null, 2));

    const reservedNumbers = new Set();
    let created = 0;
    let skippedZero = 0;
    const results = [];
    for (const item of candidates) {
        const program = programById.get(text(item.id_program)) || {};
        const nomorInvoice = await nextInvoiceNumber(item.tanggal_invoice, invoices, reservedNumbers);
        const invoice = await InvoicePembayaran.create({
            id_program: item.id_program,
            kode_file: item.kode_file,
            rencana_key: item.term.rencana_key,
            rencana_tahap: item.tahap,
            rencana_tanggal: item.tanggal_pks,
            rencana_nominal: item.nominal_invoice,
            nomor_invoice: nomorInvoice,
            tanggal_invoice: item.tanggal_invoice,
            status: 'dibuat',
            keterangan: 'Invoice dibuat berdasarkan pembayaran admin yang sudah tercatat.',
            dibuat_oleh: 'system-migration'
        });
        created += 1;
        results.push({
            kode_file: item.kode_file,
            tahap: item.tahap,
            tanggal_invoice: item.tanggal_invoice,
            nominal_invoice: item.nominal_invoice,
            nomor_invoice: invoice.nomor_invoice,
            nama_mitra: program.nama_mitra || ''
        });
    }
    fs.writeFileSync(backupPath, JSON.stringify({ report, created, skipped_zero: skippedZero, results }, null, 2));
    console.log(JSON.stringify({
        created,
        skipped_zero: skippedZero,
        backup_path: backupPath,
        created_codes: [...new Set(results.map(item => item.kode_file))]
    }, null, 2));
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
