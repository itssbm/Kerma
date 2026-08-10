const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ExcelJS = require('exceljs');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'exports');
const outputFile = path.join(outputDir, 'sisa-pagu-alokasi-kerma-dan-target-distribusi.xlsx');

function readText(relativePath) {
    return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function parseCurrency(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const text = String(value || '').trim();
    if (!text) return 0;
    const normalized = text.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return Number(normalized) || 0;
}

function extractObjectLiteral(source, constName) {
    const match = source.match(new RegExp(`const\\s+${constName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\s*\\};`));
    if (!match) return {};
    return vm.runInNewContext(`({${match[1]}})`);
}

function extractActiveCodes(source) {
    const match = source.match(/const\s+KODE_FILE_ALOKASI_AKTIF\s*=\s*new Set\(\[([\s\S]*?)\]\);/);
    if (!match) return [];
    return [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1].trim().toUpperCase());
}

function loadTargetDistribusiRows() {
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(readText('public/js/target-distribusi-data.js'), context);
    const rows = Array.isArray(context.window.TARGET_DISTRIBUSI_AWAL)
        ? context.window.TARGET_DISTRIBUSI_AWAL
        : [];

    return rows
        .map(row => Array.isArray(row)
            ? {
                nama: row[0] || '',
                peran: row[1] || '',
                status: row[2] || '',
                jabatan_sbm: row[3] || '',
                target_kerma: row[4] || 0
            }
            : {
                nama: row?.nama || '',
                peran: row?.peran || '',
                status: row?.status || '',
                jabatan_sbm: row?.jabatan_sbm || '',
                target_kerma: row?.target_kerma || 0
            })
        .map(row => ({
            ...row,
            target_distribusi: parseCurrency(row.target_kerma)
        }))
        .filter(row => row.status === 'Aktif' && row.target_distribusi > 0)
        .sort((a, b) => {
            if (b.target_distribusi !== a.target_distribusi) return b.target_distribusi - a.target_distribusi;
            return String(a.nama || '').localeCompare(String(b.nama || ''), 'id', { sensitivity: 'base' });
        })
        .map((row, index) => ({
            no: index + 1,
            nama: row.nama,
            peran: row.peran,
            jabatan_sbm: row.jabatan_sbm,
            target_distribusi: row.target_distribusi
        }));
}

async function loadProgramMap() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(rootDir, 'data/database_kerma.xlsx'));
    const sheet = workbook.getWorksheet('Program_Kerma');
    const programs = new Map();

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = row.values;
        const kodeFile = String(values[9] || '').trim().toUpperCase();
        if (!kodeFile) return;
        programs.set(kodeFile, {
            nama_mitra: String(values[2] || '').trim(),
            judul_pks: String(values[5] || '').trim()
        });
    });

    programs.set('SBM.PD-1-9-2026', {
        nama_mitra: 'PT Bank Danamon Indonesia Tbk',
        judul_pks: 'Penyelenggaraan Pendidikan Program Studi Magister Administrasi Bisnis PT Bank Danamon Indonesia Tbk Tahun Akademik 2025/2026'
    });

    return programs;
}

function loadSisaPaguRows(programs) {
    const scriptSource = readText('public/js/script.js');
    const activeCodes = extractActiveCodes(readText('app.js'));
    const sisaPaguSemI = extractObjectLiteral(scriptSource, 'sisaPaguSemIAlokasiByKode');
    const pembayaranSemII = extractObjectLiteral(scriptSource, 'pembayaranSemIIAlokasiByKode');
    const rkaKerma = extractObjectLiteral(scriptSource, 'rkaKermaAlokasiByKode');

    return activeCodes
        .map(kodeFile => {
            const penerimaanSemII = Math.round(parseCurrency(pembayaranSemII[kodeFile]) * 0.8);
            const sisaPaguAlokasiKerma = parseCurrency(sisaPaguSemI[kodeFile]) + penerimaanSemII - parseCurrency(rkaKerma[kodeFile]);
            const program = programs.get(kodeFile) || {};
            return {
                kode_file: kodeFile,
                nama_mitra: program.nama_mitra || '-',
                sisa_pagu_alokasi_kerma: sisaPaguAlokasiKerma
            };
        })
        .sort((a, b) => {
            if (b.sisa_pagu_alokasi_kerma !== a.sisa_pagu_alokasi_kerma) {
                return b.sisa_pagu_alokasi_kerma - a.sisa_pagu_alokasi_kerma;
            }
            return a.kode_file.localeCompare(b.kode_file, 'id', { sensitivity: 'base' });
        })
        .map((row, index) => ({ no: index + 1, ...row }));
}

function styleWorksheet(sheet, currencyColumns = []) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columnCount }
    };

    const header = sheet.getRow(1);
    header.height = 24;
    header.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B4F86' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFBFD1E5' } },
            left: { style: 'thin', color: { argb: 'FFBFD1E5' } },
            bottom: { style: 'thin', color: { argb: 'FFBFD1E5' } },
            right: { style: 'thin', color: { argb: 'FFBFD1E5' } }
        };
    });

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.eachCell(cell => {
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
        });
    });

    currencyColumns.forEach(key => {
        const column = sheet.getColumn(key);
        column.numFmt = '"Rp" #,##0;-"Rp" #,##0;"Rp" 0';
        column.alignment = { vertical: 'middle', horizontal: 'right' };
    });

    sheet.getColumn('no').alignment = { vertical: 'middle', horizontal: 'center' };
}

async function main() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kerma';
    workbook.created = new Date();
    workbook.modified = new Date();

    const programs = await loadProgramMap();
    const sisaPaguRows = loadSisaPaguRows(programs);
    const targetRows = loadTargetDistribusiRows();

    const sisaSheet = workbook.addWorksheet('Sisa Pagu (Alokasi KERMA)');
    sisaSheet.columns = [
        { header: 'No.', key: 'no', width: 8 },
        { header: 'Kode File', key: 'kode_file', width: 22 },
        { header: 'Mitra', key: 'nama_mitra', width: 42 },
        { header: 'Sisa PAGU (Alokasi Kerma)', key: 'sisa_pagu_alokasi_kerma', width: 28 }
    ];
    sisaSheet.addRows(sisaPaguRows);
    styleWorksheet(sisaSheet, ['sisa_pagu_alokasi_kerma']);

    const targetSheet = workbook.addWorksheet('Target Distribusi');
    targetSheet.columns = [
        { header: 'No.', key: 'no', width: 8 },
        { header: 'Nama', key: 'nama', width: 34 },
        { header: 'Peran', key: 'peran', width: 14 },
        { header: 'Jabatan SBM', key: 'jabatan_sbm', width: 36 },
        { header: 'Target Distribusi', key: 'target_distribusi', width: 24 }
    ];
    targetSheet.addRows(targetRows);
    styleWorksheet(targetSheet, ['target_distribusi']);

    fs.mkdirSync(outputDir, { recursive: true });
    await workbook.xlsx.writeFile(outputFile);

    console.log(`File dibuat: ${outputFile}`);
    console.log(`Sisa Pagu rows: ${sisaPaguRows.length}`);
    console.log(`Target Distribusi rows: ${targetRows.length}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
