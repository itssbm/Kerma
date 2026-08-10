#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const shouldUpdateDb = args.has('--db');
const rootDir = path.resolve(__dirname, '..');

const rawTargets = String.raw`
Aurik Gustomo	157.000.000,00
Donald Crestofel Lantu	150.000.000,00
Achmad Ghazali	32.500.000,00
Henndy Ginting	0,00
Achmad Fajar Hendarman	0,00
Adita Pritasari	157.000.000,00
Andika Putra Pratama	0,00
W. Victo Anggara Wisesa	41.000.000,00
Dedy Sushandoyo	57.500.000,00
Hary Febriansyah	61.714.285,72
Neneng Nurlaela Arief	0,00
Nur Arief Rahmatsyah Putranto	233.250.000,00
Yudo Anggoro	0,00
Aria Bayu Pangestu	96.638.784,00
Emilia Fitriana Dewi	8.000.000,00
Muhammad Yorga Permana	0,00
Muhammad Juliansyah Putra	0,00
Asep Darmansyah	0,00
Deddy Priatmodjo Koesrindartoto	0,00
Sylviana Maya Damayanti	-1.500.000,00
Yunieta Anny Nainggolan	237.041.666,66
Acip Sutardi	0,00
Ana Noveria	72.571.428,58
Dzikri Firmansyah Hakam	-673.333,33
Kurnia Fajar Afgani	120.514.613,13
Mandra Lazuardi Kitri	266.080.960,00
Oktofa Yudha Sudrajad	54.000.000,00
Raden Aswin Rahadi	54.000.000,00
Taufik Faturohman	80.178.571,42
Tuntun Salamatun Zen	0,00
Anggoro Budi Nugroho	35.746.933,33
Jagat Prirayani	97.285.714,28
Eneng Nur Hasanah	73.357.142,86
Harimukti Wandebori	0,00
Atik Aprianingsih	142.187.500,00
Mustika Sufiati Purwanegara	0,00
Prawira Fajarindra Belgiawan	0,00
Annisa Rahmani Qastharin	103.000.000,00
Ilma Aulia Zaim	99.000.000,00
Ira Fachira	207.500.000,00
Nila Armelia Windasari	148.642.857,14
Fitri Aprilianty	8.000.000,00
Nurrani Kusumawati	30.878.972,00
Gallang Perdhana Dalimunthe	86.857.142,86
Novika Candra Astuti	26.000.000,00
Muhammad Fakhrul Rozi Ashadi	22.500.000,00
Utomo Sarjono Putro	0,00
Yos Sunitiyoso	64.163.173,33
Pri Hermawan	0,00
Santi Novani	175.250.000,00
Manahan Parlindungan Saragih Siallagan	0,00
Meditya Wasesa	0,00
Khrisna Ariyanto	16.143.344,00
Shimaditya Nuraeni	123.516.964,00
Lidia Mayangsari	24.310.600,00
Valid Hasyimi	106.428.571,42
Sudrajati Ratnaningtyas	0,00
Wawan Dhewanto	0,00
Leo Aldianto	0,00
Dina Dellyana	0,00
Eko Agus Prasetio	112.800.000,00
Isti Raafaldini Mirzanti	184.145.625,00
Melia Famiola	0,00
Qorri Aina	0,00
Rendra Chaerudin	28.997.922,67
Sonny Rustiadi	81.000.000,00
Sri Hartati	0,00
Sri Herliana	0,00
Amilia Wulansari	54.000.000,00
Evy Rachmawati Chaldun	75.900.000,00
Salfitrie Roos Maryunani	144.091.164,95
Yulianto	-2.180.000,00
Bayuningrat	0,00
Sahat	73.928.571,42
Dermawan Wibisono	0,00
Togar Mangihut Simatupang	36.908.121,33
Gatot Yudoko	0,00
Yuliani Dwi Lestari	0,00
Akbar Adhi Utama	54.000.000,00
Liane Okdinawati	202.428.571,42
Nur Budi Mulyono	109.500.000,00
Yuanita Handayati	163.300.000,00
Desy Anisya Farmaciawaty	77.571.428,58
Noorhan Firdaus Pambudi	101.785.714,28
Agus Kurniawan	49.300.000,00
Anjar Listiyorini	97.000.000,00
Anti Novarianti	77.416.666,66
Arief Rachman Saleh	13.500.000,00
Emma Hermasari	87.500.000,00
Endah Nurani	93.000.000,00
Epri Triyono Saputra	54.200.000,00
Fathurrohman	48.200.000,00
Fatkhurrahman	13.000.000,00
Gita Fajar Petala Mega	88.750.000,00
Harry Santoso	51.375.000,00
Indra Dewanata	81.016.666,67
Iwan Doli Simarmata	93.650.000,00
Jahid Abdurahman	60.100.000,00
Kania Dwi Permatasari	14.000.000,00
Khumaeroh	60.100.000,00
Kusnadi	14.000.000,00
Lavinia Desty Fesfarany	45.000.000,00
Lia Fitria Purnamawati	86.425.000,00
Nenden SF Indriawati	58.875.000,00
Neni Nurkumala	78.208.333,33
Ninuk Endang Windarti	71.833.333,33
Rokayah	43.500.000,00
Sandy Seftyan	14.000.000,00
Setiawan	57.375.000,00
Sunarko	55.000.000,00
Supri Haryanto	91.200.000,00
Taupik Abidin	14.250.000,00
Widi Pangestuty	60.100.000,00
Wiwik Istiyarini	57.375.000,00
Anang Taufik	40.500.000,00
Puji Novitasari	15.000.000,00
`;

const supplementalEmployees = new Map([
    ['Anang Taufik', { peran: 'Staf', status: 'Aktif', jabatan_sbm: '' }],
    ['Puji Novitasari', { peran: 'Staf', status: 'Aktif', jabatan_sbm: '' }]
]);

const plottingRoles = ['PJ', 'Pengarah', 'Ketua', 'Kepala Admin', 'Anggota'];

function quoteJs(value) {
    return JSON.stringify(String(value ?? ''));
}

function buatPksKosong(jumlah = 2) {
    const pks = {};
    for (let i = 1; i <= jumlah; i += 1) {
        pks[i] = {};
        plottingRoles.forEach((role) => {
            pks[i][role] = false;
        });
    }
    return pks;
}

function buatDistribusiRolesKosong() {
    return {
        PJ: '-',
        Pengarah: '-',
        Ketua: '-',
        'Kepala Admin': '-',
        Anggota: ''
    };
}

function buatBarisPegawaiTambahan(name, targetMap) {
    const meta = supplementalEmployees.get(name) || {};
    return {
        nama: name,
        peran: meta.peran === 'Dosen' ? 'Dosen' : 'Staf',
        status: meta.status || 'Aktif',
        jabatan_sbm: meta.jabatan_sbm || '',
        jabatan_sbm_2: meta.jabatan_sbm_2 || '',
        level_jabatan_1: meta.level_jabatan_1 || '',
        level_jabatan_2: meta.level_jabatan_2 || '',
        target_kerma: String(targetMap.get(name) ?? 0),
        keterangan: meta.keterangan || '',
        pks: buatPksKosong(),
        distribusi_roles: buatDistribusiRolesKosong()
    };
}

function isBlankPlottingRow(row = {}) {
    const hasText = [
        row.nama,
        row.jabatan_sbm,
        row.jabatan_sbm_2,
        row.level_jabatan_1,
        row.level_jabatan_2,
        row.keterangan
    ].some((value) => String(value || '').trim());
    const target = Number(String(row.target_kerma ?? '').replace(/\D/g, '')) || 0;
    const hasPks = Object.values(row.pks || {}).some((roleMap) => (
        Object.values(roleMap || {}).some(Boolean)
    ));
    const hasDistribusiRoles = Object.values(row.distribusi_roles || {}).some((value) => {
        const normalized = String(value || '').trim();
        return normalized && normalized !== '-';
    });

    return !hasText && target === 0 && !hasPks && !hasDistribusiRoles;
}

function parseRupiahIndonesia(value) {
    const raw = String(value || '').replace(/\u00a0/g, ' ').trim();
    if (!raw) return 0;

    const sanitized = raw.replace(/[^\d,.-]/g, '');
    if (sanitized.includes(',')) {
        const [wholeRaw, fractionRaw = ''] = sanitized.split(',');
        const isNegative = wholeRaw.trim().startsWith('-');
        const whole = wholeRaw.replace(/\D/g, '') || '0';
        const fraction = `${fractionRaw.replace(/\D/g, '')}00`.slice(0, 2);
        const amount = Number(whole) + (Number(fraction) / 100);
        return Math.round(isNegative ? -amount : amount);
    }

    const digits = sanitized.replace(/\D/g, '');
    return Number(digits || 0);
}

function formatCurrency(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')},-`;
}

function parseTargets() {
    const rows = [];
    const seen = new Set();

    for (const line of rawTargets.trim().split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let name = '';
        let amountRaw = '';
        const tabParts = trimmed.split(/\t+/);
        if (tabParts.length >= 2) {
            name = tabParts[0].trim();
            amountRaw = tabParts.slice(1).join(' ').trim();
        } else {
            const match = trimmed.match(/^(.+?)\s+(-?[\d.\s]+(?:,\d{1,2})?)$/);
            if (!match) {
                throw new Error(`Baris tidak dapat dibaca: ${line}`);
            }
            name = match[1].trim();
            amountRaw = match[2].trim();
        }

        if (seen.has(name)) throw new Error(`Nama duplikat pada input: ${name}`);
        seen.add(name);
        rows.push({ name, amount: parseRupiahIndonesia(amountRaw), amountRaw });
    }

    return rows;
}

function normalizeName(name) {
    return String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshtein(a, b) {
    const rows = Array.from({ length: a.length + 1 }, (_, index) => [index]);
    for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;

    for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
            rows[i][j] = Math.min(
                rows[i - 1][j] + 1,
                rows[i][j - 1] + 1,
                rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }

    return rows[a.length][b.length];
}

function tokenScore(a, b) {
    const tokensA = new Set(normalizeName(a).split(' ').filter(Boolean));
    const tokensB = new Set(normalizeName(b).split(' ').filter(Boolean));
    if (!tokensA.size || !tokensB.size) return 0;
    let overlap = 0;
    for (const token of tokensA) {
        if (tokensB.has(token)) overlap += 1;
    }
    return overlap / Math.max(tokensA.size, tokensB.size);
}

function similarNames(name, candidates) {
    const normalizedName = normalizeName(name);
    return candidates
        .map((candidate) => {
            const normalizedCandidate = normalizeName(candidate);
            const distance = levenshtein(normalizedName, normalizedCandidate);
            const length = Math.max(normalizedName.length, normalizedCandidate.length, 1);
            return {
                name: candidate,
                score: Math.max(1 - (distance / length), tokenScore(name, candidate))
            };
        })
        .filter((candidate) => candidate.score >= 0.45)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
}

function updateDefaultFile(targetMap) {
    const filePath = path.join(rootDir, 'public/js/target-distribusi-data.js');
    const original = fs.readFileSync(filePath, 'utf8');
    const names = [];
    let matched = 0;
    let changed = 0;

    const updated = original.replace(
        /^(\s*\["([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]*)",\s*")([^"]*)("\],?)/gm,
        (full, prefix, name, peran, status, jabatan, currentTarget, suffix) => {
            names.push(name);
            if (!targetMap.has(name.trim())) return full;
            matched += 1;
            const nextTarget = String(targetMap.get(name.trim()));
            if (currentTarget !== nextTarget) changed += 1;
            return `${prefix}${nextTarget}${suffix}`;
        }
    );

    let finalUpdated = updated;
    let added = 0;
    const missingBeforeAdd = [...targetMap.keys()].filter((name) => !names.includes(name));
    const rowsToAdd = missingBeforeAdd.filter((name) => supplementalEmployees.has(name));
    if (rowsToAdd.length) {
        const newLines = rowsToAdd.map((name) => {
            const meta = supplementalEmployees.get(name) || {};
            return `  [${quoteJs(name)},${quoteJs(meta.peran || 'Staf')},${quoteJs(meta.status || 'Aktif')},${quoteJs(meta.jabatan_sbm || '')},${quoteJs(targetMap.get(name))}],`;
        }).join('\n');
        finalUpdated = finalUpdated.replace(/\n\]\.map/, `\n${newLines}\n].map`);
        rowsToAdd.forEach((name) => names.push(name));
        added = rowsToAdd.length;
    }

    if (shouldWrite && finalUpdated !== original) {
        fs.writeFileSync(filePath, finalUpdated);
    }

    return {
        file: path.relative(rootDir, filePath),
        names,
        matched: matched + added,
        changed,
        added,
        removedBlank: 0,
        missing: [...targetMap.keys()].filter((name) => !names.includes(name))
    };
}

function updateBackupFile(targetMap) {
    const filePath = path.join(rootDir, 'plotting-backup.json');
    if (!fs.existsSync(filePath)) {
        return {
            file: path.relative(rootDir, filePath),
            names: [],
            matched: 0,
            changed: 0,
            missing: [...targetMap.keys()],
            skipped: true
        };
    }

    const original = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(original);
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const compactRows = rows.filter((row) => !isBlankPlottingRow(row));
    const removedBlank = rows.length - compactRows.length;
    data.rows = compactRows;
    const names = rows.map((row) => String(row?.nama || '').trim()).filter(Boolean);
    let matched = 0;
    let changed = 0;

    for (const row of compactRows) {
        const name = String(row?.nama || '').trim();
        if (!targetMap.has(name)) continue;
        matched += 1;
        const nextTarget = String(targetMap.get(name));
        if (String(row.target_kerma ?? '') !== nextTarget) changed += 1;
        row.target_kerma = nextTarget;
    }

    let added = 0;
    const compactNames = compactRows.map((row) => String(row?.nama || '').trim()).filter(Boolean);
    const rowsToAdd = [...targetMap.keys()]
        .filter((name) => !compactNames.includes(name))
        .filter((name) => supplementalEmployees.has(name));
    for (const name of rowsToAdd) {
        compactRows.push(buatBarisPegawaiTambahan(name, targetMap));
        compactNames.push(name);
        added += 1;
    }

    const updated = `${JSON.stringify(data)}\n`;
    if (shouldWrite && updated !== original) {
        fs.writeFileSync(filePath, updated);
    }

    return {
        file: path.relative(rootDir, filePath),
        names: compactNames,
        matched: matched + added,
        changed,
        added,
        removedBlank,
        missing: [...targetMap.keys()].filter((name) => !compactNames.includes(name))
    };
}

async function updateDatabase(targetMap) {
    require('dotenv').config({ path: path.join(rootDir, '..', '.env') });
    require('dotenv').config({ path: path.join(rootDir, '.env') });

    const mongoose = require('mongoose');
    const connectDB = require('../db');
    const PlottingKerma = require('../models/PlottingKerma');

    await connectDB();

    const docs = await PlottingKerma.find({ 'payload.rows': { $exists: true } });
    const backupDocs = [];
    const reports = [];
    let changedDocs = 0;
    let changedRows = 0;

    for (const doc of docs) {
        const originalDoc = doc.toObject({ depopulate: true });
        const rows = Array.isArray(doc.payload?.rows) ? doc.payload.rows : [];
        const compactRows = rows.filter((row) => !isBlankPlottingRow(row));
        const removedBlank = rows.length - compactRows.length;
        if (removedBlank > 0) {
            doc.payload.rows = compactRows;
        }
        const names = rows.map((row) => String(row?.nama || '').trim()).filter(Boolean);
        let docChangedRows = 0;
        let matched = 0;

        for (const row of compactRows) {
            const name = String(row?.nama || '').trim();
            if (!targetMap.has(name)) continue;
            matched += 1;
            const nextTarget = String(targetMap.get(name));
            if (String(row.target_kerma ?? '') !== nextTarget) {
                row.target_kerma = nextTarget;
                docChangedRows += 1;
            }
        }

        let docAddedRows = 0;
        const compactNames = compactRows.map((row) => String(row?.nama || '').trim()).filter(Boolean);
        const rowsToAdd = [...targetMap.keys()]
            .filter((name) => !compactNames.includes(name))
            .filter((name) => supplementalEmployees.has(name));
        for (const name of rowsToAdd) {
            compactRows.push(buatBarisPegawaiTambahan(name, targetMap));
            compactNames.push(name);
            docAddedRows += 1;
        }
        if (docAddedRows > 0) {
            doc.payload.rows = compactRows;
        }

        reports.push({
            id: String(doc._id),
            userId: doc.userId || '',
            source: doc.source || '',
            rowsBefore: rows.length,
            rowsAfter: compactRows.length,
            matched: matched + docAddedRows,
            changed: docChangedRows,
            added: docAddedRows,
            removedBlank,
            missing: [...targetMap.keys()].filter((name) => !compactNames.includes(name))
        });

        if (docChangedRows > 0 || docAddedRows > 0 || removedBlank > 0) {
            changedDocs += 1;
            changedRows += docChangedRows + docAddedRows + removedBlank;
            backupDocs.push(originalDoc);
            if (shouldWrite) {
                doc.markModified('payload');
                doc.note = 'Update target kerma pegawai 2026-07-31';
                await doc.save();
            }
        }
    }

    if (shouldWrite && backupDocs.length) {
        const backupPath = path.join(
            rootDir,
            'data',
            'backups',
            `plotting-kerma-target-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        );
        fs.writeFileSync(backupPath, `${JSON.stringify(backupDocs, null, 2)}\n`);
        console.log(`Backup database ditulis: ${path.relative(rootDir, backupPath)}`);
    }

    await mongoose.disconnect();

    return {
        docs: docs.length,
        changedDocs,
        changedRows,
        reports
    };
}

function printFileReport(label, report, targets) {
    console.log(`\n${label}`);
    console.log(`- File: ${report.file}`);
    console.log(`- Data sistem: ${report.names.length}`);
    console.log(`- Match input: ${report.matched}/${targets.length}`);
    console.log(`- Baris berubah: ${report.changed}`);
    if (report.added) console.log(`- Baris ditambahkan: ${report.added}`);
    if (report.removedBlank) console.log(`- Baris kosong dibersihkan: ${report.removedBlank}`);
    if (report.missing.length) {
        console.log('- Nama input yang tidak ditemukan:');
        for (const name of report.missing) {
            const candidates = similarNames(name, report.names);
            const suffix = candidates.length
                ? ` | kandidat mirip: ${candidates.map((candidate) => `${candidate.name} (${Math.round(candidate.score * 100)}%)`).join(', ')}`
                : '';
            console.log(`  - ${name}${suffix}`);
        }
    } else {
        console.log('- Semua nama input ditemukan exact match.');
    }
}

async function main() {
    const targets = parseTargets();
    const targetMap = new Map(targets.map((row) => [row.name, row.amount]));

    console.log(`Mode: ${shouldWrite ? 'WRITE' : 'DRY RUN'}${shouldUpdateDb ? ' + DB' : ''}`);
    console.log(`Input target: ${targets.length} nama`);
    console.log(`Total target baru: ${formatCurrency([...targetMap.values()].reduce((sum, value) => sum + value, 0))}`);

    const defaultReport = updateDefaultFile(targetMap);
    const backupReport = updateBackupFile(targetMap);

    printFileReport('Data awal Target Distribusi', defaultReport, targets);
    printFileReport('Backup Plotting Kerma', backupReport, targets);

    const missingEverywhere = targets
        .map((row) => row.name)
        .filter((name) => defaultReport.missing.includes(name) && backupReport.missing.includes(name));

    if (missingEverywhere.length) {
        console.log('\nTidak ditemukan di file sistem mana pun:');
        for (const name of missingEverywhere) console.log(`- ${name}`);
    }

    if (shouldUpdateDb) {
        console.log('\nDatabase plotting_kerma');
        const dbReport = await updateDatabase(targetMap);
        console.log(`- Dokumen dicek: ${dbReport.docs}`);
        console.log(`- Dokumen berubah: ${dbReport.changedDocs}`);
        console.log(`- Baris berubah: ${dbReport.changedRows}`);
        for (const docReport of dbReport.reports) {
            console.log(`  - ${docReport.userId || '-'} / ${docReport.source || '-'} / ${docReport.id}: rows ${docReport.rowsBefore}->${docReport.rowsAfter}, match ${docReport.matched}/${targets.length}, berubah ${docReport.changed}, tambah ${docReport.added}, kosong dibersihkan ${docReport.removedBlank}`);
            if (docReport.missing.length) {
                console.log(`    nama tidak ditemukan: ${docReport.missing.join(', ')}`);
            }
        }
    }

    if (!shouldWrite) {
        console.log('\nDry run selesai. Jalankan dengan --write untuk menyimpan perubahan.');
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
