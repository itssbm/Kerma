'use strict';

const path = require('path');
const fs = require('fs/promises');

require('dotenv').config({
    path: [
        path.resolve(__dirname, '../.env'),
        path.resolve(__dirname, '../../.env')
    ]
});

const InvoicePembayaran = require('../models/InvoicePembayaran');

const KODE_FILE = 'SBM.PD-1-78-2024';
const BACKUP_DIR = path.resolve(__dirname, '../data/backups/invoice-date-update-sbm-pd-1-78-2024-20260908');

const TARGETS = [
    { tahap: 'Tahap pertama', dari: '2024-12-30', menjadi: '2025-07-02' },
    { tahap: 'Tahap kedua', dari: '2025-03-30', menjadi: '2025-07-02' },
    { tahap: 'Tahap ketiga', dari: '2025-07-30', menjadi: '2025-07-02' },
    { tahap: 'Tahap keempat', dari: '2025-12-10', menjadi: '2026-01-02' }
];

function normalizeText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeDate(value) {
    return String(value || '').trim().slice(0, 10);
}

async function main() {
    const rows = await InvoicePembayaran.find({}).lean();
    const codeRows = rows.filter(row => String(row.kode_file || '').trim() === KODE_FILE);
    if (codeRows.length !== TARGETS.length) {
        throw new Error(`Ditemukan ${codeRows.length} invoice untuk ${KODE_FILE}; seharusnya ${TARGETS.length}.`);
    }

    const selected = TARGETS.map(target => {
        const matches = codeRows.filter(row =>
            normalizeText(row.rencana_tahap) === normalizeText(target.tahap)
            && normalizeDate(row.tanggal_invoice) === target.dari
        );
        if (matches.length !== 1) {
            throw new Error(`Invoice ${target.tahap} dengan tanggal ${target.dari} ditemukan ${matches.length} kali.`);
        }
        return { target, row: matches[0] };
    });

    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.writeFile(
        path.join(BACKUP_DIR, 'before.json'),
        `${JSON.stringify(codeRows, null, 2)}\n`,
        'utf8'
    );

    const changed = [];
    for (const item of selected) {
        await InvoicePembayaran.findByIdAndUpdate(item.row._id, {
            $set: {
                tanggal_invoice: item.target.menjadi,
                updatedAt: new Date().toISOString()
            }
        });
        changed.push({
            tahap: item.target.tahap,
            id: String(item.row._id),
            tanggal_invoice_lama: item.target.dari,
            tanggal_invoice_baru: item.target.menjadi,
            nomor_invoice: item.row.nomor_invoice || ''
        });
    }

    const afterRows = await InvoicePembayaran.find({ kode_file: KODE_FILE }).lean();
    await fs.writeFile(
        path.join(BACKUP_DIR, 'after.json'),
        `${JSON.stringify(afterRows, null, 2)}\n`,
        'utf8'
    );

    console.log(JSON.stringify({ kode_file: KODE_FILE, backup_dir: BACKUP_DIR, changed }, null, 2));
}

main().catch(error => {
    console.error(`Update gagal: ${error?.message || error}`);
    process.exitCode = 1;
});
