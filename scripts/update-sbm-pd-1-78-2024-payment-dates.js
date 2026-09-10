'use strict';

const path = require('path');
const fs = require('fs/promises');

require('dotenv').config({
    path: [
        path.resolve(__dirname, '../.env'),
        path.resolve(__dirname, '../../.env')
    ]
});

const RealisasiPembayaran = require('../models/RealisasiPembayaran');

const KODE_FILE = 'SBM.PD-1-78-2024';
const DEFAULT_ACCOUNT = '901102012';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'AGT', 'Sep', 'Okt', 'Nov', 'Des'];
const BACKUP_DIR = path.resolve(__dirname, '../data/backups/payment-date-update-sbm-pd-1-78-2024-20260908');

const TARGETS = [
    { tahap: 'Tahap pertama', dari: '2025-01-30', menjadi: '2025-08-07' },
    { tahap: 'Tahap kedua', dari: '2025-04-30', menjadi: '2025-08-14' },
    { tahap: 'Tahap ketiga', dari: '2025-08-30', menjadi: '2025-08-26' },
    { tahap: 'Tahap keempat', dari: '2026-01-10', menjadi: '2026-05-08' }
];

function normalizeText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeDate(value) {
    return String(value || '').trim().slice(0, 10);
}

function monthToken(value) {
    const token = String(value || '').trim();
    return token.toLowerCase() === 'agu' ? 'AGT' : token;
}

function periodKey(account, month, year) {
    return `${account}|${monthToken(month).toUpperCase()}|${year}`;
}

function parseBkmNumber(value) {
    const match = String(value || '').trim().match(
        /^([^/]+)\/(Jan|Feb|Mar|Apr|Mei|Jun|Jul|AGT|Agu|Sep|Okt|Nov|Des)\/(\d{4})\/(\d+)$/i
    );
    if (!match) return null;
    return {
        account: String(match[1]).trim(),
        month: monthToken(match[2]),
        year: Number(match[3]),
        sequence: Number(match[4]) || 0
    };
}

function bkmNumber(account, month, year, sequence) {
    return `${account}/${month}/${year}/${String(sequence).padStart(3, '0')}`;
}

function datePeriod(value, account = DEFAULT_ACCOUNT) {
    const date = normalizeDate(value);
    const match = date.match(/^(\d{4})-(\d{2})-/);
    if (!match) return null;
    const monthIndex = Number(match[2]) - 1;
    if (!MONTHS[monthIndex]) return null;
    return periodKey(account, MONTHS[monthIndex], Number(match[1]));
}

async function main() {
    const allRows = await RealisasiPembayaran.find({}).lean();
    const rows = allRows.filter(row => String(row.kode_file || '').trim() === KODE_FILE);
    if (rows.length !== TARGETS.length) {
        throw new Error(`Ditemukan ${rows.length} pembayaran untuk ${KODE_FILE}; seharusnya ${TARGETS.length}.`);
    }

    const selected = TARGETS.map(target => {
        const matches = rows.filter(row =>
            normalizeText(row.rencana_tahap) === normalizeText(target.tahap)
            && normalizeDate(row.tanggal) === target.dari
        );
        if (matches.length !== 1) {
            throw new Error(`Record ${target.tahap} dengan tanggal ${target.dari} ditemukan ${matches.length} kali.`);
        }
        return { target, row: matches[0] };
    });

    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.writeFile(
        path.join(BACKUP_DIR, 'before.json'),
        `${JSON.stringify(rows, null, 2)}\n`,
        'utf8'
    );

    const selectedIds = new Set(selected.map(item => String(item.row._id)));
    const maxByPeriod = new Map();
    const register = (key, sequence) => {
        if (!key || !Number.isFinite(sequence)) return;
        maxByPeriod.set(key, Math.max(maxByPeriod.get(key) || 0, sequence));
    };

    // Exclude the four moved records while finding the next sequence, so their
    // old numbers do not consume a slot in their new month.
    allRows.forEach(row => {
        if (selectedIds.has(String(row._id))) return;
        const account = String(row.bkm_no_rekening || DEFAULT_ACCOUNT).trim() || DEFAULT_ACCOUNT;
        const parsed = parseBkmNumber(row.bkm_nomor);
        if (parsed) {
            register(periodKey(parsed.account || account, parsed.month, parsed.year), parsed.sequence);
            return;
        }
        const saved = row.bkm_sudah_disimpan === true
            || String(row.bkm_sudah_disimpan || '').toLowerCase() === 'true';
        if (saved) register(datePeriod(row.bkm_tanggal || row.tanggal, account), 1);
    });

    const assignments = selected
        .map(item => ({ ...item, date: item.target.menjadi }))
        .sort((a, b) => a.date.localeCompare(b.date) || normalizeText(a.target.tahap).localeCompare(normalizeText(b.target.tahap)));

    for (const item of assignments) {
        const account = String(item.row.bkm_no_rekening || DEFAULT_ACCOUNT).trim() || DEFAULT_ACCOUNT;
        const key = datePeriod(item.date, account);
        const [year, month] = item.date.split('-').map(Number);
        const token = MONTHS[month - 1];
        const sequence = (maxByPeriod.get(key) || 0) + 1;
        maxByPeriod.set(key, sequence);
        item.newBkmNumber = bkmNumber(account, token, year, sequence);
    }

    const changed = [];
    for (const item of selected) {
        const assignment = assignments.find(candidate => String(candidate.row._id) === String(item.row._id));
        await RealisasiPembayaran.findByIdAndUpdate(item.row._id, {
            $set: {
                tanggal: item.target.menjadi,
                bkm_tanggal: item.target.menjadi,
                bkm_nomor: assignment.newBkmNumber,
                updatedAt: new Date().toISOString()
            }
        });
        changed.push({
            tahap: item.target.tahap,
            id: String(item.row._id),
            tanggal_lama: item.target.dari,
            tanggal_baru: item.target.menjadi,
            bkm_nomor_lama: item.row.bkm_nomor || '',
            bkm_nomor_baru: assignment.newBkmNumber
        });
    }

    const afterRows = await RealisasiPembayaran.find({ kode_file: KODE_FILE }).lean();
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
