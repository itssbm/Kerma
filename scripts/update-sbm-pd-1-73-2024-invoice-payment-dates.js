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
const Program = require('../models/Program');
const Cicilan = require('../models/Cicilan');
const InvoicePembayaran = require('../models/InvoicePembayaran');
const RealisasiPembayaran = require('../models/RealisasiPembayaran');

const KODE_FILE = 'SBM.PD-1-73-2024';
const DEFAULT_ACCOUNT = '901102012';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'AGT', 'Sep', 'Okt', 'Nov', 'Des'];
const APPLY = process.argv.includes('--apply');
const BACKUP_ROOT = path.resolve(__dirname, '../data/backups');

const TARGETS = [
    { stage: 1, label: 'Tahap pertama', invoiceDate: '2025-07-02', paymentDate: '2025-02-21' },
    { stage: 2, label: 'Tahap kedua', invoiceDate: '2025-02-07', paymentDate: '2025-07-17' },
    { stage: 3, label: 'Tahap ketiga', invoiceDate: '2025-05-12', paymentDate: '2025-12-23' },
    { stage: 4, label: 'Tahap keempat', invoiceDate: '2026-07-21', paymentDate: '2026-08-20' }
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
    const words = {
        pertama: 1,
        kesatu: 1,
        satu: 1,
        kedua: 2,
        dua: 2,
        ketiga: 3,
        tiga: 3,
        keempat: 4,
        empat: 4,
        kelima: 5,
        lima: 5,
        keenam: 6,
        enam: 6
    };
    const found = Object.entries(words).find(([word]) => valueText.includes(word));
    return found ? found[1] : null;
}

function scheduleKey(program, term) {
    return [
        program.id_program || '',
        KODE_FILE,
        'Termin',
        term.label || '',
        normalizeDate(term.batas_akhir),
        Number(term.nominal) || 0
    ].map(value => text(value)).join('|');
}

function isTrue(value) {
    return value === true || text(value).toLowerCase() === 'true';
}

function bkmMonthToken(value) {
    return text(value).toLowerCase() === 'agu' ? 'AGT' : text(value);
}

function bkmNumberParts(value) {
    const match = text(value).match(
        /^([^/]+)\/(Jan|Feb|Mar|Apr|Mei|Jun|Jul|AGT|Agu|Sep|Okt|Nov|Des)\/(\d{4})\/(\d+)$/i
    );
    if (!match) return null;
    return {
        account: text(match[1]),
        month: bkmMonthToken(match[2]),
        year: Number(match[3]),
        sequence: Number(match[4]) || 0
    };
}

function periodKey(account, dateValue) {
    const normalized = normalizeDate(dateValue);
    const match = normalized.match(/^(\d{4})-(\d{2})-/);
    if (!match) return '';
    return `${text(account) || DEFAULT_ACCOUNT}|${Number(match[1])}|${Number(match[2])}`;
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
        if (parsed
            && parsed.account === normalizedAccount
            && periodKey(normalizedAccount, `${parsed.year}-${String(MONTHS.findIndex(month => month.toLowerCase() === parsed.month.toLowerCase()) + 1).padStart(2, '0')}-01`) === key) {
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

function nextInvoiceNumber(dateValue, rows, reserved) {
    const year = Number(normalizeDate(dateValue).slice(0, 4));
    const key = String(year);
    let max = 0;

    rows.forEach(row => {
        if (Number(normalizeDate(row.tanggal_invoice).slice(0, 4)) !== year) return;
        const suffix = text(row.nomor_invoice).match(/\/KU\/(\d{4})$/i);
        const sequence = text(row.nomor_invoice).match(/NO\.\s*(\d+)/i);
        if (suffix && Number(suffix[1]) === year && sequence) max = Math.max(max, Number(sequence[1]) || 0);
    });

    max = Math.max(max, Number(reserved.get(key) || 0));
    const sequence = max + 1;
    reserved.set(key, sequence);
    return `NO. ${String(sequence).padStart(3, '0')}/IT1.C09.2/KU/${year}`;
}

function findUniqueStage(rows, programId, target, kind) {
    const matches = rows.filter(row =>
        (!programId || !text(row.id_program) || text(row.id_program) === programId)
        && stageNumber(row.rencana_tahap) === target.stage
    );
    if (matches.length > 1) {
        throw new Error(`${kind} ${target.label} ditemukan ${matches.length} record untuk ${KODE_FILE}.`);
    }
    return matches[0] || null;
}

function cleanRow(row) {
    if (!row) return null;
    return {
        id: text(row._id),
        tahap: text(row.rencana_tahap),
        rencana_key: text(row.rencana_key),
        rencana_tanggal: normalizeDate(row.rencana_tanggal),
        rencana_nominal: Number(row.rencana_nominal) || 0,
        tanggal_invoice: normalizeDate(row.tanggal_invoice),
        tanggal: normalizeDate(row.tanggal),
        bkm_tanggal: normalizeDate(row.bkm_tanggal),
        bkm_nomor: text(row.bkm_nomor),
        bkm_jumlah: Number(row.bkm_jumlah) || 0,
        nominal_bruto: Number(row.nominal_bruto) || 0,
        nominal: Number(row.nominal) || 0,
        bkm_sudah_disimpan: isTrue(row.bkm_sudah_disimpan)
    };
}

async function main() {
    await connectDB();

    const [programs, cicilanRows, allInvoices, allPayments] = await Promise.all([
        Program.find({ kode_file: KODE_FILE }).lean(),
        Cicilan.find({}).sort({ id_program: 1, no_cicilan: 1 }).lean(),
        InvoicePembayaran.find({}).lean(),
        RealisasiPembayaran.find({}).lean()
    ]);

    if (programs.length !== 1) {
        throw new Error(`Ditemukan ${programs.length} program untuk ${KODE_FILE}; seharusnya tepat 1.`);
    }

    const program = programs[0];
    const terms = TARGETS.map(target => {
        const matches = cicilanRows.filter(row =>
            text(row.id_program) === text(program.id_program)
            && Number(row.no_cicilan) === target.stage
        );
        if (matches.length !== 1) {
            throw new Error(`Jadwal ${target.label} ditemukan ${matches.length} record; seharusnya tepat 1.`);
        }
        return { target, term: matches[0], key: scheduleKey(program, matches[0]) };
    });

    const codeInvoices = allInvoices.filter(row => text(row.kode_file) === KODE_FILE);
    const codePayments = allPayments.filter(row => text(row.kode_file) === KODE_FILE);
    const invoicePlans = terms.map(item => ({
        ...item,
        existing: findUniqueStage(codeInvoices, text(program.id_program), item.target, 'Invoice'),
        invoiceNumber: ''
    }));

    const invoiceNumberReserved = new Map();
    invoicePlans.forEach(item => {
        if (!item.existing) item.invoiceNumber = nextInvoiceNumber(item.target.invoiceDate, allInvoices, invoiceNumberReserved);
    });

    const selectedPaymentIds = new Set();
    const paymentPlans = terms.map(item => {
        const existing = findUniqueStage(codePayments, text(program.id_program), item.target, 'Pembayaran');
        if (existing) selectedPaymentIds.add(text(existing._id));
        return { ...item, existing, bkmNumber: '' };
    });

    const existingPaymentRows = allPayments.filter(row => !selectedPaymentIds.has(text(row._id)));
    const bkmNumberReserved = new Map();
    paymentPlans
        .slice()
        .sort((a, b) => a.target.paymentDate.localeCompare(b.target.paymentDate) || a.target.stage - b.target.stage)
        .forEach(item => {
            const account = text(item.existing?.bkm_no_rekening) || DEFAULT_ACCOUNT;
            item.bkmNumber = nextBkmNumber(item.target.paymentDate, account, existingPaymentRows, bkmNumberReserved);
        });

    const plan = {
        mode: APPLY ? 'apply' : 'dry-run',
        kode_file: KODE_FILE,
        id_program: text(program.id_program),
        judul_pks: text(program.judul_pks),
        invoices: invoicePlans.map(item => ({
            tahap: item.target.label,
            id: text(item.existing?._id),
            tanggal_lama: normalizeDate(item.existing?.tanggal_invoice),
            tanggal_baru: item.target.invoiceDate,
            nomor_invoice: text(item.existing?.nomor_invoice) || item.invoiceNumber,
            tindakan: item.existing ? 'update' : 'create'
        })),
        payments: paymentPlans.map(item => ({
            tahap: item.target.label,
            id: text(item.existing?._id),
            tanggal_lama: normalizeDate(item.existing?.tanggal),
            tanggal_baru: item.target.paymentDate,
            bkm_tanggal_lama: normalizeDate(item.existing?.bkm_tanggal),
            bkm_tanggal_baru: item.target.paymentDate,
            bkm_nomor_lama: text(item.existing?.bkm_nomor),
            bkm_nomor_baru: item.bkmNumber,
            nominal_pks: Number(item.term.nominal) || 0,
            tindakan: item.existing ? 'update' : 'create'
        }))
    };

    console.log(JSON.stringify(plan, null, 2));
    if (!APPLY) {
        console.log('\nDRY-RUN: tidak ada perubahan database. Jalankan dengan --apply untuk menerapkan perubahan.');
        return;
    }

    const backupDir = path.join(BACKUP_ROOT, `invoice-payment-date-update-${KODE_FILE.replace(/[^A-Za-z0-9.-]+/g, '_')}-${Date.now()}`);
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(path.join(backupDir, 'before.json'), JSON.stringify({
        generated_at: new Date().toISOString(),
        program,
        cicilan: terms.map(item => item.term),
        invoices: codeInvoices,
        payments: codePayments,
        plan
    }, null, 2));

    const now = new Date().toISOString();
    const invoiceResults = [];
    for (const item of invoicePlans) {
        if (item.existing) {
            await InvoicePembayaran.findByIdAndUpdate(item.existing._id, {
                $set: {
                    tanggal_invoice: item.target.invoiceDate,
                    updatedAt: now
                }
            });
            invoiceResults.push({
                tahap: item.target.label,
                tindakan: 'update',
                id: text(item.existing._id),
                tanggal_invoice: item.target.invoiceDate,
                nomor_invoice: text(item.existing.nomor_invoice)
            });
            continue;
        }

        const created = await InvoicePembayaran.create({
            status: 'dibuat',
            kode_file: KODE_FILE,
            id_program: program.id_program,
            keterangan: 'Invoice dibuat berdasarkan jadwal pembayaran PKS.',
            dibuat_oleh: 'system-update',
            rencana_key: item.key,
            nomor_invoice: item.invoiceNumber,
            rencana_tahap: item.term.label || item.target.label,
            rencana_nominal: Number(item.term.nominal) || 0,
            rencana_tanggal: normalizeDate(item.term.batas_akhir),
            tanggal_invoice: item.target.invoiceDate,
            createdAt: now,
            updatedAt: now
        });
        invoiceResults.push({
            tahap: item.target.label,
            tindakan: 'create',
            id: text(created?._id),
            tanggal_invoice: item.target.invoiceDate,
            nomor_invoice: item.invoiceNumber
        });
    }

    const paymentResults = [];
    for (const item of paymentPlans) {
        const nominalPks = Number(item.term.nominal) || 0;
        if (item.existing) {
            const hasBkm = isTrue(item.existing.bkm_sudah_disimpan)
                || Boolean(text(item.existing.bkm_nomor))
                || Boolean(normalizeDate(item.existing.bkm_tanggal));
            const update = {
                tanggal: item.target.paymentDate,
                updatedAt: now
            };
            if (hasBkm) {
                update.bkm_tanggal = item.target.paymentDate;
                update.bkm_nomor = item.bkmNumber;
            }
            await RealisasiPembayaran.findByIdAndUpdate(item.existing._id, { $set: update });
            paymentResults.push({
                tahap: item.target.label,
                tindakan: 'update',
                id: text(item.existing._id),
                tanggal: item.target.paymentDate,
                bkm_tanggal: hasBkm ? item.target.paymentDate : '',
                bkm_nomor: hasBkm ? item.bkmNumber : text(item.existing.bkm_nomor)
            });
            continue;
        }

        const nominalNetto = Math.round(nominalPks * 0.8);
        const created = await RealisasiPembayaran.create({
            id_program: program.id_program,
            kode_file: KODE_FILE,
            tanggal: item.target.paymentDate,
            nominal_bruto: nominalPks,
            potongan_persen: 20,
            nominal: nominalNetto,
            keterangan: `Realisasi ${item.term.label || item.target.label} dari rencana penerimaan`,
            rencana_key: item.key,
            rencana_tahap: item.term.label || item.target.label,
            rencana_tanggal: normalizeDate(item.term.batas_akhir),
            rencana_nominal: nominalPks,
            bkm_sudah_disimpan: true,
            bkm_nomor: item.bkmNumber,
            bkm_tanggal: item.target.paymentDate,
            bkm_jumlah: nominalPks,
            bkm_nama_bank: 'BNI',
            bkm_no_rekening: DEFAULT_ACCOUNT,
            bkm_nama_rekening: 'Penampungan - PPM SBM',
            bkm_nama_unit: '101221-SBM - Ops. - Ganesa',
            bkm_no_bukti: '',
            bkm_uraian: `Realisasi ${item.term.label || item.target.label} dari rencana penerimaan`,
            bkm_dibuat_oleh: 'system-update',
            bkm_disimpan_pada: now,
            createdAt: now,
            updatedAt: now
        });
        paymentResults.push({
            tahap: item.target.label,
            tindakan: 'create',
            id: text(created?._id),
            tanggal: item.target.paymentDate,
            bkm_tanggal: item.target.paymentDate,
            bkm_nomor: item.bkmNumber,
            bkm_jumlah: nominalPks,
            nominal_penerimaan: nominalNetto
        });
    }

    const [afterInvoices, afterPayments] = await Promise.all([
        InvoicePembayaran.find({ kode_file: KODE_FILE }).sort({ rencana_tanggal: 1 }).lean(),
        RealisasiPembayaran.find({ kode_file: KODE_FILE }).sort({ rencana_tanggal: 1 }).lean()
    ]);
    await fs.writeFile(path.join(backupDir, 'after.json'), JSON.stringify({
        generated_at: new Date().toISOString(),
        invoices: afterInvoices,
        payments: afterPayments,
        invoice_results: invoiceResults,
        payment_results: paymentResults
    }, null, 2));

    console.log(JSON.stringify({
        applied: true,
        backup_dir: backupDir,
        invoice_results: invoiceResults,
        payment_results: paymentResults,
        verification: {
            invoice_count: afterInvoices.length,
            payment_count: afterPayments.length,
            invoices: afterInvoices.map(cleanRow),
            payments: afterPayments.map(cleanRow)
        }
    }, null, 2));
}

main().catch(error => {
    console.error(`Update gagal: ${error?.message || error}`);
    process.exitCode = 1;
});
