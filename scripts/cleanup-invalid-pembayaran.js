/*
 * Audit and remove payment/invoice records that cannot be matched to a
 * current PKS payment term. Dry-run is the default; pass --apply to delete.
 */
const fs = require('fs');
const path = require('path');

const connectDB = require('../db');
const Program = require('../models/Program');
const Cicilan = require('../models/Cicilan');
const Kontrak = require('../models/Kontrak');
const RealisasiPembayaran = require('../models/RealisasiPembayaran');
const InvoicePembayaran = require('../models/InvoicePembayaran');

const apply = process.argv.includes('--apply');

function text(value) {
    return String(value ?? '').trim();
}

function normalizeText(value) {
    return text(value)
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

function normalizeDate(value) {
    const raw = text(value);
    if (!raw) return '';
    const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
}

function grossPayment(row = {}) {
    return number(row.nominal_bruto)
        || number(row.rencana_nominal)
        || number(row.nominal);
}

function stageNumber(value) {
    const normalized = normalizeText(value);
    const roman = normalized.match(/(?:sem|semester|tahap|termin|cicilan)[\s.:-]*(i{1,3}|iv|v|vi{0,3}|ix|x)\b/);
    const romanValues = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
    if (roman && romanValues[roman[1]]) return romanValues[roman[1]];
    const digits = normalized.match(/\d+/);
    if (digits && Number(digits[0]) > 0 && Number(digits[0]) < 100) return Number(digits[0]);
    const words = {
        pertama: 1, kesatu: 1, satu: 1,
        kedua: 2, dua: 2,
        ketiga: 3, tiga: 3,
        keempat: 4, empat: 4,
        kelima: 5, lima: 5,
        keenam: 6, enam: 6,
        ketujuh: 7, tujuh: 7,
        kedelapan: 8, delapan: 8,
        kesembilan: 9, sembilan: 9,
        kesepuluh: 10, sepuluh: 10
    };
    const match = Object.entries(words).find(([word]) => normalized.includes(word));
    return match ? match[1] : null;
}

function stageMatches(left, right) {
    const a = normalizeText(left);
    const b = normalizeText(right);
    if (!a || !b) return false;
    return a === b || (stageNumber(a) !== null && stageNumber(a) === stageNumber(b));
}

function termKey(term = {}) {
    return [
        term.id_program || '',
        term.kode_file || '',
        term.sumber || '',
        term.tahap || '',
        term.tanggal_input || '',
        number(term.nominal)
    ].map(part => text(part)).join('|');
}

function addTerm(terms, item = {}) {
    const nominal = number(item.nominal);
    if (!nominal || !text(item.kode_file)) return;
    const term = {
        id_program: text(item.id_program),
        kode_file: text(item.kode_file),
        sumber: text(item.sumber) || 'Program',
        tahap: text(item.tahap) || 'Pembayaran',
        tanggal_input: normalizeDate(item.tanggal_input),
        nominal
    };
    term.rencana_key = termKey(term);
    terms.push(term);
}

async function buildValidTerms() {
    const [programs, cicilanRows, approvedContracts] = await Promise.all([
        Program.find({}).lean(),
        Cicilan.find({}).sort({ id_program: 1, no_cicilan: 1 }).lean(),
        Kontrak.find({ status: 'approved' }).lean()
    ]);
    const cicilanByProgram = new Map();
    cicilanRows.forEach(row => {
        const key = text(row.id_program);
        if (!cicilanByProgram.has(key)) cicilanByProgram.set(key, []);
        cicilanByProgram.get(key).push(row);
    });

    const terms = [];
    const programsWithSchedule = new Set();
    programs.forEach(program => {
        const code = text(program.kode_file);
        const installments = cicilanByProgram.get(text(program.id_program)) || [];
        const isInstallment = program.cara_pembayaran === 'Termin' || program.cara_pembayaran === 'Unit Price';
        if (isInstallment && installments.length) {
            installments.forEach((installment, index) => {
                const base = number(installment.nominal);
                const nominal = program.cara_pembayaran === 'Unit Price'
                    ? base * number(program.jumlah_mahasiswa)
                    : base;
                const added = terms.length;
                addTerm(terms, {
                    id_program: program.id_program,
                    kode_file: code,
                    sumber: program.cara_pembayaran,
                    tahap: installment.label || `Cicilan ${installment.no_cicilan || index + 1}`,
                    tanggal_input: installment.batas_akhir,
                    nominal
                });
                if (terms.length > added) programsWithSchedule.add(text(program.id_program));
            });
            return;
        }

        const before = terms.length;
        addTerm(terms, {
            id_program: program.id_program,
            kode_file: code,
            sumber: 'Program',
            tahap: program.cara_pembayaran || 'Lump Sum',
            tanggal_input: program.batas_akhir_pembayaran,
            nominal: program.nilai_kontrak
        });
        if (terms.length > before) programsWithSchedule.add(text(program.id_program));
    });

    const programById = new Map(programs.map(program => [text(program.id_program), program]));
    approvedContracts.forEach(contract => {
        if (programsWithSchedule.has(text(contract.id_program))) return;
        const program = programById.get(text(contract.id_program)) || {};
        const rows = Array.isArray(contract.rincian_bpp) ? contract.rincian_bpp : [];
        rows.forEach((row, index) => addTerm(terms, {
            id_program: contract.id_program || contract.id_kontrak,
            kode_file: program.kode_file,
            sumber: 'Kontrak Approved',
            tahap: row.tahap || `Rincian BPP ${index + 1}`,
            tanggal_input: row.batas_pembayaran,
            nominal: row.total_BPP
        }));
    });

    return { terms, programs, cicilanRows };
}

function sameProgramOrCode(row, term) {
    const sameProgram = text(row.id_program) && text(row.id_program) === text(term.id_program);
    const sameCode = text(row.kode_file) && text(row.kode_file).toLowerCase() === text(term.kode_file).toLowerCase();
    return sameProgram || sameCode;
}

function paymentMatchesTerm(row, term) {
    if (!sameProgramOrCode(row, term)) return false;
    const rowStage = text(row.rencana_tahap);
    const rowDate = normalizeDate(row.rencana_tanggal);
    const rowNominal = number(row.rencana_nominal) || grossPayment(row);
    const termDate = normalizeDate(term.tanggal_input);
    const termNominal = number(term.nominal);
    const stageSame = stageMatches(rowStage, term.tahap);
    const dateSame = Boolean(rowDate && termDate && rowDate === termDate);
    const nominalSame = Boolean(rowNominal > 0 && termNominal > 0 && rowNominal === termNominal);
    return (stageSame && dateSame) || (dateSame && nominalSame) || (stageSame && nominalSame);
}

function invoiceMatchesTerm(row, term) {
    if (!sameProgramOrCode(row, term)) return false;
    const stageSame = stageMatches(row.rencana_tahap, term.tahap);
    const dateSame = Boolean(normalizeDate(row.rencana_tanggal) && normalizeDate(term.tanggal_input)
        && normalizeDate(row.rencana_tanggal) === normalizeDate(term.tanggal_input));
    const nominalSame = Boolean(number(row.rencana_nominal) > 0 && number(term.nominal) > 0
        && number(row.rencana_nominal) === number(term.nominal));
    return (stageSame && dateSame) || (dateSame && nominalSame) || (stageSame && nominalSame);
}

function findMatchingTerm(row, terms, exactKeys) {
    const key = text(row.rencana_key);
    if (key && exactKeys.has(key)) return exactKeys.get(key);
    if (/^realisasi\s+\d+$/i.test(text(row.rencana_tahap))) return null;
    return terms.find(term => paymentMatchesTerm(row, term)) || null;
}

function findMatchingInvoice(row, terms, exactKeys) {
    const key = text(row.rencana_key);
    if (key && exactKeys.has(key)) return exactKeys.get(key);
    return terms.find(term => invoiceMatchesTerm(row, term)) || null;
}

function compactRow(row = {}) {
    return {
        id: text(row._id || row.id || row.legacy_id),
        kode_file: text(row.kode_file),
        id_program: text(row.id_program),
        rencana_key: text(row.rencana_key),
        rencana_tahap: text(row.rencana_tahap),
        rencana_tanggal: normalizeDate(row.rencana_tanggal),
        nominal_bruto: grossPayment(row),
        bkm_sudah_disimpan: row.bkm_sudah_disimpan === true,
        createdAt: row.createdAt || row.created_at || ''
    };
}

async function main() {
    await connectDB();
    const { terms } = await buildValidTerms();
    const exactKeys = new Map(terms.map(term => [term.rencana_key, term]));
    const [payments, invoices] = await Promise.all([
        RealisasiPembayaran.find({}).lean(),
        InvoicePembayaran.find({}).lean()
    ]);

    const invalidPayments = payments
        .map(row => {
            const match = findMatchingTerm(row, terms, exactKeys);
            if (match) return null;
            const synthetic = /^realisasi\s+\d+$/i.test(text(row.rencana_tahap));
            return {
                collection: 'realisasi_pembayaran',
                reason: synthetic
                    ? 'Tahap sintetis "Realisasi N" tidak berasal dari termin PKS.'
                    : 'Tidak memiliki pasangan termin PKS berdasarkan key/tahap/tanggal/nominal.',
                row: compactRow(row),
                document: row
            };
        })
        .filter(Boolean);

    const invalidInvoices = invoices
        .map(row => findMatchingInvoice(row, terms, exactKeys) ? null : {
            collection: 'invoice_pembayaran',
            reason: 'Invoice tidak memiliki pasangan termin PKS yang valid.',
            row: compactRow(row),
            document: row
        })
        .filter(Boolean);

    const report = {
        generated_at: new Date().toISOString(),
        mode: apply ? 'apply' : 'dry-run',
        valid_terms: terms.length,
        total_payments: payments.length,
        total_invoices: invoices.length,
        invalid_payments: invalidPayments.map(({ document, ...item }) => item),
        invalid_invoices: invalidInvoices.map(({ document, ...item }) => item)
    };
    if (!apply) {
        console.log(JSON.stringify(report, null, 2));
    } else {
        console.log(JSON.stringify({
            mode: report.mode,
            valid_terms: report.valid_terms,
            total_payments: report.total_payments,
            total_invoices: report.total_invoices,
            invalid_payments: report.invalid_payments.length,
            invalid_invoices: report.invalid_invoices.length,
            invalid_payment_ids: report.invalid_payments.map(item => item.row.id),
            invalid_payment_codes: [...new Set(report.invalid_payments.map(item => item.row.kode_file).filter(Boolean))]
        }, null, 2));
    }

    if (!apply) {
        console.log(`\nDRY-RUN: ${invalidPayments.length} pembayaran dan ${invalidInvoices.length} invoice akan dibersihkan jika --apply digunakan.`);
        return;
    }

    const exportDir = path.resolve(__dirname, '../exports');
    fs.mkdirSync(exportDir, { recursive: true });
    const backupPath = path.join(exportDir, `cleanup-invalid-pembayaran-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({
        ...report,
        records: {
            realisasi_pembayaran: invalidPayments.map(item => item.document),
            invoice_pembayaran: invalidInvoices.map(item => item.document)
        }
    }, null, 2));

    let deletedPayments = 0;
    for (const item of invalidPayments) {
        if (!item.row.id) continue;
        const result = await RealisasiPembayaran.deleteOne({ _id: item.row.id });
        deletedPayments += result.deleted
            ? (Number(result.count) || 1)
            : (Number(result.deletedCount) || 0);
    }
    let deletedInvoices = 0;
    for (const item of invalidInvoices) {
        if (!item.row.id) continue;
        const result = await InvoicePembayaran.deleteOne({ _id: item.row.id });
        deletedInvoices += result.deleted
            ? (Number(result.count) || 1)
            : (Number(result.deletedCount) || 0);
    }
    console.log(JSON.stringify({
        deleted_payments: deletedPayments,
        deleted_invoices: deletedInvoices,
        backup_path: backupPath
    }, null, 2));
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {
    text,
    normalizeDate,
    number,
    grossPayment,
    buildValidTerms,
    findMatchingTerm,
    paymentMatchesTerm,
    termKey
};
