'use strict';

const fs = require('fs/promises');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PARENT_ROOT = path.resolve(PROJECT_ROOT, '..');

require('dotenv').config({
    path: [
        path.join(PROJECT_ROOT, '.env'),
        path.join(PARENT_ROOT, '.env')
    ]
});

const { request } = require('../services/db/supabaseClient');
const Program = require('../models/Program');
const Mitra = require('../models/Mitra');
const Mahasiswa = require('../models/Mahasiswa');
const CalonPeserta = require('../models/CalonPeserta');
const Kontrak = require('../models/Kontrak');
const Cicilan = require('../models/Cicilan');
const Addendum = require('../models/Addendum');
const RencanaAnggaran = require('../models/RencanaAnggaran');
const RealisasiAnggaran = require('../models/RealisasiAnggaran');
const PaguAnggaran = require('../models/PaguAnggaran');
const RabAnggaran = require('../models/RabAnggaran');
const RealisasiPembayaran = require('../models/RealisasiPembayaran');
const InvoicePembayaran = require('../models/InvoicePembayaran');
const PlottingKerma = require('../models/PlottingKerma');
const UploadChunk = require('../models/UploadChunk');

const EXPECTED_ACTIVE_CODE_COUNT = 17;
const DELETE_CHUNK_SIZE = 100;

// These collections contain contract, participant, or financial records. Mitra
// and plotting sessions are intentionally excluded from deletion.
const PURGE_COLLECTIONS = [
    ['programs', Program],
    ['kontrak', Kontrak],
    ['mahasiswa', Mahasiswa],
    ['calon_peserta', CalonPeserta],
    ['cicilan', Cicilan],
    ['addendum', Addendum],
    ['rencana_anggaran', RencanaAnggaran],
    ['realisasi_anggaran', RealisasiAnggaran],
    ['pagu_anggaran', PaguAnggaran],
    ['rab_anggaran', RabAnggaran],
    ['realisasi_pembayaran', RealisasiPembayaran],
    ['invoice_pembayaran', InvoicePembayaran],
    ['upload_chunks', UploadChunk]
];

const BACKUP_COLLECTIONS = [
    ...PURGE_COLLECTIONS,
    ['mitra', Mitra],
    ['plotting_kerma', PlottingKerma]
];

function normalizeCode(value) {
    return String(value || '').trim().toUpperCase();
}

function normalizeId(value) {
    return String(value || '').trim();
}

function timestampTag(date = new Date()) {
    const parts = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
        String(date.getHours()).padStart(2, '0'),
        String(date.getMinutes()).padStart(2, '0'),
        String(date.getSeconds()).padStart(2, '0')
    ];
    return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
}

function codeOf(row) {
    return normalizeCode(row?.kode_file);
}

function idProgramOf(row) {
    return normalizeId(row?.id_program);
}

function shouldKeep(row, collectionName, activeCodes, activeProgramIds) {
    if (collectionName === 'programs') return activeCodes.has(codeOf(row));
    return activeCodes.has(codeOf(row)) || (idProgramOf(row) && activeProgramIds.has(idProgramOf(row)));
}

function postgrestLiteral(value) {
    const text = String(value ?? '');
    if (!/[\s,(){}"]/.test(text)) return text;
    return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function readAll(model) {
    return model.find({}).lean();
}

async function writeJson(filePath, value) {
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function backupSnapshot(snapshot, activeCodes) {
    const backupDir = path.join(PROJECT_ROOT, 'data', 'backups', `inactive-contract-purge-${timestampTag()}`);
    await fs.mkdir(backupDir, { recursive: true });

    const collections = {};
    for (const [collectionName] of BACKUP_COLLECTIONS) {
        const rows = snapshot[collectionName] || [];
        const fileName = `${collectionName}.json`;
        await writeJson(path.join(backupDir, fileName), rows);
        collections[collectionName] = {
            count: rows.length,
            file: fileName
        };
    }

    await writeJson(path.join(backupDir, 'manifest.json'), {
        created_at: new Date().toISOString(),
        purpose: 'Backup sebelum penghapusan kontrak dan transaksi nonaktif.',
        active_codes: [...activeCodes].sort(),
        collections,
        safety: {
            mitra_deleted: false,
            plotting_kerma_deleted: false,
            source_overwritten: false
        }
    });

    return backupDir;
}

async function deleteByIds(collectionName, rows) {
    const ids = rows.map(row => normalizeId(row?._id)).filter(Boolean);
    let deleted = 0;

    for (let index = 0; index < ids.length; index += DELETE_CHUNK_SIZE) {
        const chunk = ids.slice(index, index + DELETE_CHUNK_SIZE);
        const response = await request(collectionName, {
            method: 'DELETE',
            query: {
                legacy_collection: `eq.${collectionName}`,
                legacy_id: `in.(${chunk.map(postgrestLiteral).join(',')})`,
                select: 'legacy_id'
            },
            headers: {
                Prefer: 'return=representation'
            }
        });
        deleted += Array.isArray(response.data) ? response.data.length : chunk.length;
    }

    return deleted;
}

async function loadSnapshot() {
    const entries = await Promise.all(
        BACKUP_COLLECTIONS.map(async ([collectionName, model]) => [collectionName, await readAll(model)])
    );
    return Object.fromEntries(entries);
}

function buildPlan(snapshot, activeCodes, activeProgramIds) {
    return PURGE_COLLECTIONS.map(([collectionName]) => {
        const rows = snapshot[collectionName] || [];
        const remove = rows.filter(row => !shouldKeep(row, collectionName, activeCodes, activeProgramIds));
        const keep = rows.length - remove.length;
        return {
            collection: collectionName,
            total: rows.length,
            keep,
            delete: remove.length,
            rows: remove
        };
    });
}

async function main() {
    const apply = process.argv.includes('--apply');
    const confirmed = process.argv.includes('--confirm-inactive-delete');
    if (apply && !confirmed) {
        throw new Error('Penghapusan membutuhkan flag --confirm-inactive-delete.');
    }

    const snapshot = await loadSnapshot();
    const paguRows = snapshot.pagu_anggaran || [];
    const activeCodes = new Set(paguRows.map(codeOf).filter(Boolean));
    if (activeCodes.size !== EXPECTED_ACTIVE_CODE_COUNT) {
        throw new Error(`Dibatalkan: ditemukan ${activeCodes.size} kode file pada PAGU, seharusnya ${EXPECTED_ACTIVE_CODE_COUNT}.`);
    }

    const programs = snapshot.programs || [];
    const activePrograms = programs.filter(row => activeCodes.has(codeOf(row)));
    const programCodes = new Set(programs.map(codeOf).filter(Boolean));
    const missingPrograms = [...activeCodes].filter(code => !programCodes.has(code));
    if (missingPrograms.length) {
        throw new Error(`Dibatalkan: kode aktif tidak memiliki data Daftar Kerma: ${missingPrograms.join(', ')}.`);
    }
    if (activePrograms.length !== activeCodes.size) {
        throw new Error('Dibatalkan: jumlah program aktif tidak sama dengan jumlah kode aktif PAGU; periksa duplikasi kode file.');
    }

    const activeProgramIds = new Set(activePrograms.map(idProgramOf).filter(Boolean));
    const plan = buildPlan(snapshot, activeCodes, activeProgramIds);
    const summary = plan.map(({ collection, total, keep, delete: deleteCount }) => ({
        collection,
        total,
        keep,
        delete: deleteCount
    }));

    console.log(JSON.stringify({
        mode: apply ? 'APPLY' : 'DRY-RUN',
        active_codes: [...activeCodes].sort(),
        active_programs: activeProgramIds.size,
        summary
    }, null, 2));

    if (!apply) return;

    const backupDir = await backupSnapshot(snapshot, activeCodes);
    console.log(`Backup dibuat: ${backupDir}`);

    const deleted = {};
    for (const item of plan) {
        if (!item.rows.length) {
            deleted[item.collection] = 0;
            continue;
        }
        deleted[item.collection] = await deleteByIds(item.collection, item.rows);
        console.log(`${item.collection}: ${deleted[item.collection]} data dihapus.`);
    }

    const after = await loadSnapshot();
    const residual = buildPlan(after, activeCodes, activeProgramIds)
        .filter(item => item.rows.length)
        .map(item => ({ collection: item.collection, count: item.rows.length }));
    if (residual.length) {
        throw new Error(`Validasi gagal; masih ada data nonaktif: ${JSON.stringify(residual)}. Backup tersedia di ${backupDir}.`);
    }

    await writeJson(path.join(backupDir, 'result.json'), {
        completed_at: new Date().toISOString(),
        deleted,
        residual_nonactive: []
    });
    console.log(`Penghapusan selesai. Backup: ${backupDir}`);
}

main().catch(error => {
    console.error(`Purge gagal: ${error?.message || error}`);
    process.exitCode = 1;
});
