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

const KODE_FILE = 'SBM.PD-1-73-2024';
const APPLY = process.argv.includes('--apply');
const BACKUP_ROOT = path.resolve(__dirname, '../data/backups');
const TARGETS = [
    { stage: 1, label: 'Tahap pertama', tanggal_invoice: '2025-02-07' },
    { stage: 2, label: 'Tahap kedua', tanggal_invoice: '2025-07-02' },
    { stage: 3, label: 'Tahap ketiga', tanggal_invoice: '2025-12-05' },
    { stage: 4, label: 'Tahap keempat', tanggal_invoice: '2026-07-21' }
];

function text(value) {
    return String(value ?? '').trim();
}

function normalizeText(value) {
    return text(value).replace(/\s+/g, ' ').toLowerCase();
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
        empat: 4
    };
    const found = Object.entries(words).find(([word]) => valueText.includes(word));
    return found ? found[1] : null;
}

function formatRow(row) {
    return {
        id: text(row?._id),
        tahap: text(row?.rencana_tahap),
        tanggal_invoice: text(row?.tanggal_invoice),
        nomor_invoice: text(row?.nomor_invoice)
    };
}

async function main() {
    await connectDB();
    const rows = await InvoicePembayaran.find({ kode_file: KODE_FILE }).sort({ rencana_tanggal: 1 }).lean();
    if (rows.length !== TARGETS.length) {
        throw new Error(`Ditemukan ${rows.length} invoice untuk ${KODE_FILE}; seharusnya ${TARGETS.length}.`);
    }

    const selected = TARGETS.map(target => {
        const matches = rows.filter(row => stageNumber(row.rencana_tahap) === target.stage);
        if (matches.length !== 1) {
            throw new Error(`Invoice ${target.label} ditemukan ${matches.length} record; seharusnya tepat 1.`);
        }
        return { target, row: matches[0] };
    });

    const plan = {
        mode: APPLY ? 'apply' : 'dry-run',
        kode_file: KODE_FILE,
        changes: selected.map(({ target, row }) => ({
            tahap: target.label,
            id: text(row._id),
            tanggal_lama: text(row.tanggal_invoice),
            tanggal_baru: target.tanggal_invoice,
            nomor_invoice: text(row.nomor_invoice),
            berubah: text(row.tanggal_invoice) !== target.tanggal_invoice
        }))
    };
    console.log(JSON.stringify(plan, null, 2));

    if (!APPLY) {
        console.log('\nDRY-RUN: tidak ada perubahan database. Jalankan dengan --apply untuk menerapkan koreksi.');
        return;
    }

    const backupDir = path.join(
        BACKUP_ROOT,
        `invoice-date-correction-${KODE_FILE.replace(/[^A-Za-z0-9.-]+/g, '_')}-${Date.now()}`
    );
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(path.join(backupDir, 'before.json'), JSON.stringify({
        kode_file: KODE_FILE,
        rows,
        plan
    }, null, 2));

    const now = new Date().toISOString();
    const updated = [];
    for (const { target, row } of selected) {
        if (text(row.tanggal_invoice) === target.tanggal_invoice) {
            updated.push({
                tahap: target.label,
                id: text(row._id),
                tanggal_invoice: target.tanggal_invoice,
                tindakan: 'unchanged'
            });
            continue;
        }
        await InvoicePembayaran.findByIdAndUpdate(row._id, {
            $set: {
                tanggal_invoice: target.tanggal_invoice,
                updatedAt: now
            }
        });
        updated.push({
            tahap: target.label,
            id: text(row._id),
            tanggal_invoice: target.tanggal_invoice,
            tindakan: 'updated'
        });
    }

    const after = await InvoicePembayaran.find({ kode_file: KODE_FILE }).sort({ rencana_tanggal: 1 }).lean();
    await fs.writeFile(path.join(backupDir, 'after.json'), JSON.stringify({
        kode_file: KODE_FILE,
        updated,
        rows: after
    }, null, 2));

    console.log(JSON.stringify({
        applied: true,
        backup_dir: backupDir,
        updated,
        verification: after.map(formatRow)
    }, null, 2));
}

main().catch(error => {
    console.error(`Koreksi gagal: ${error?.message || error}`);
    process.exitCode = 1;
});
