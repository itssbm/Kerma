// ─── Cek sesi & info user ────────────────────────────────────────────────────
let currentUser = null;

function buatInitial(nama) {
    const bagian = String(nama || 'KERMA').trim().split(/\s+/).filter(Boolean);
    return (bagian[0]?.[0] || 'K') + (bagian[1]?.[0] || '');
}

async function initSession() {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) { window.location.href = '/login'; return false; }
        currentUser = await res.json();
        const roleLabel = currentUser.role === 'atasan' ? 'Pimpinan KERMA' : 'Admin KERMA';
        document.getElementById('userRoleBadge').textContent  = roleLabel;
        document.getElementById('userNamaSidebar').textContent = currentUser.nama;
        const avatar = document.getElementById('userAvatarSidebar');
        if (avatar) avatar.textContent = buatInitial(currentUser.nama).toUpperCase();
        document.getElementById('btnLogout').addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login';
        });
        return true;
    } catch { window.location.href = '/login'; return false; }
}

function teksPencarianGlobal(value) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map(teksPencarianGlobal).join(' ');
    if (typeof value === 'object') return Object.values(value).map(teksPencarianGlobal).join(' ');
    return String(value);
}

function cocokPencarianGlobal(item, query) {
    const terms = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return true;
    const haystack = teksPencarianGlobal(item).toLowerCase();
    return terms.every(term => haystack.includes(term));
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!await initSession()) return;
    const menuDaftar                   = document.getElementById('menuDaftar');
    const menuMitra                    = document.getElementById('menuMitra');
    const menuPegawai                  = document.getElementById('menuPegawai');
    const menuJabatan                  = document.getElementById('menuJabatan');
    const menuMahasiswa                = document.getElementById('menuMahasiswa');
    const menuIndustri                 = document.getElementById('menuIndustri');
    const menuTambahMitra              = document.getElementById('menuTambahMitra');
    const menuTambah                   = document.getElementById('menuTambah');
    const menuPendapatan               = document.getElementById('menuPendapatan');
    const menuPengeluaran              = document.getElementById('menuPengeluaran');
    const menuSisaAnggaran             = document.getElementById('menuSisaAnggaran');
    const menuTambahMahasiswa          = document.getElementById('menuTambahMahasiswa');
    const menuTambahIndustri           = document.getElementById('menuTambahIndustri');
    const menuPlottingKerma            = document.getElementById('menuPlottingKerma');
    const menuLaporan                  = document.getElementById('menuLaporan');
    const menuKontrak                  = document.getElementById('menuKontrak');
    const menuPimpinan                 = document.getElementById('menuPimpinan');
    const sectionDaftar                = document.getElementById('sectionDaftar');
    const sectionPimpinan              = document.getElementById('sectionPimpinan');
    const sectionMitra                 = document.getElementById('sectionMitra');
    const sectionPegawai               = document.getElementById('sectionPegawai');
    const sectionJabatan               = document.getElementById('sectionJabatan');
    const sectionMahasiswa             = document.getElementById('sectionMahasiswa');
    const sectionIndustri              = document.getElementById('sectionIndustri');
    const sectionTambahMitra           = document.getElementById('sectionTambahMitra');
    const sectionTambah                = document.getElementById('sectionTambah');
    const sectionRealisasi             = document.getElementById('sectionRealisasi');
    const sectionSisaAnggaran          = document.getElementById('sectionSisaAnggaran');
    const sectionTambahMahasiswa       = document.getElementById('sectionTambahMahasiswa');
    const sectionTambahIndustri        = document.getElementById('sectionTambahIndustri');
    const sectionPlottingKerma         = document.getElementById('sectionPlottingKerma');
    const sectionLaporan               = document.getElementById('sectionLaporan');
    const sectionKontrak               = document.getElementById('sectionKontrak');
    const sectionFormKontrak           = document.getElementById('sectionFormKontrak');
    const bodyTabelKerma = document.getElementById('bodyTabelKerma');
    const bodyTabelPegawai = document.getElementById('bodyTabelPegawai');
    const bodyTabelJabatan = document.getElementById('bodyTabelJabatan');
    const infoJumlahJabatan = document.getElementById('infoJumlahJabatan');
    const listJabatanSbm = document.getElementById('listJabatanSbm');
    const listLevelJabatan = document.getElementById('listLevelJabatan');
    const btnTambahPegawai = document.getElementById('btnTambahPegawai');
    const containerOpsiLaporan = document.getElementById('containerOpsiLaporan');
    const btnDownload = document.getElementById('btnDownload');
    const chkSelectAll = document.getElementById('chkSelectAll');
    const filterKodeFile = document.getElementById('filterKodeFile');
    const infoHasilLaporan = document.getElementById('infoHasilLaporan');
    const tabTargetDistribusi = document.getElementById('tabTargetDistribusi');
    const tabBatasanSimulasiPlotting = document.getElementById('tabBatasanSimulasiPlotting');
    const tabPlottingDasar = document.getElementById('tabPlottingDasar');
    const tabDaftarPksPlotting = document.getElementById('tabDaftarPksPlotting');
    const tabPlotKerma = document.getElementById('tabPlotKerma');
    const panelTargetDistribusi = document.getElementById('panelTargetDistribusi');
    const panelBatasanSimulasiPlotting = document.getElementById('panelBatasanSimulasiPlotting');
    const panelPlottingDasar = document.getElementById('panelPlottingDasar');
    const panelDaftarPksPlotting = document.getElementById('panelDaftarPksPlotting');
    const panelPlotKerma = document.getElementById('panelPlotKerma');
    const btnEditMasterTarif = document.getElementById('btnEditMasterTarif');
    const btnToggleHargaJabatan = document.getElementById('btnToggleHargaJabatan');
    const btnSimpanPerhitunganDasar = document.getElementById('btnSimpanPerhitunganDasar');
    const statusSimpanPerhitunganDasar = document.getElementById('statusSimpanPerhitunganDasar');
    const panelHargaJabatanTable = document.getElementById('panelHargaJabatanTable');
    const bodyTabelHargaJabatan = document.getElementById('bodyTabelHargaJabatan');
    const periodePengelolaAwal = document.getElementById('periodePengelolaAwal');
    const periodePengelolaAkhir = document.getElementById('periodePengelolaAkhir');
    const labelPeriodePengelolaKerma = document.getElementById('labelPeriodePengelolaKerma');
    const totalPerKermaPlotting = document.getElementById('totalPerKermaPlotting');
    const targetDistribusiPlotting = document.getElementById('targetDistribusiPlotting');
    const totalKebutuhanPksPlotting = document.getElementById('totalKebutuhanPksPlotting');
    const totalPengelolaKermaPlotting = document.getElementById('totalPengelolaKermaPlotting');
    const totalPosisiTersediaPlotting = document.getElementById('totalPosisiTersediaPlotting');
    const minimalSisaPksPlotting = document.getElementById('minimalSisaPksPlotting');
    const jumlahPksDapatDialokasikan = document.getElementById('jumlahPksDapatDialokasikan');
    const totalSisaPksDapatDialokasikan = document.getElementById('totalSisaPksDapatDialokasikan');
    const btnSimulasiDistribusi = document.getElementById('btnSimulasiDistribusi');
    const btnOptimalkanDistribusi = document.getElementById('btnOptimalkanDistribusi');
    const btnResetSimulasiDistribusi = document.getElementById('btnResetSimulasiDistribusi');
    const statusSimulasiDistribusi = document.getElementById('statusSimulasiDistribusi');
    const kebutuhanPksSimulasiPlotting = document.getElementById('kebutuhanPksSimulasiPlotting');
    const kebutuhanPksDasarTargetPlotting = document.getElementById('kebutuhanPksDasarTargetPlotting');
    const pksDitetapkanPlotting = document.getElementById('pksDitetapkanPlotting');
    const validasiPksSimulasiPlotting = document.getElementById('validasiPksSimulasiPlotting');
    const totalRealisasiDistribusiPlotting = document.getElementById('totalRealisasiDistribusiPlotting');
    const totalSelisihDistribusiPlotting = document.getElementById('totalSelisihDistribusiPlotting');
    const bodyTabelTargetDistribusi = document.getElementById('bodyTabelTargetDistribusi');
    const bodyTabelBatasanSimulasiPlotting = document.getElementById('bodyTabelBatasanSimulasiPlotting');
    const bodyTabelLevelJabatanSimulasiPlotting = document.getElementById('bodyTabelLevelJabatanSimulasiPlotting');
    const btnTambahBatasanUmumSimulasi = document.getElementById('btnTambahBatasanUmumSimulasi');
    const btnTambahBatasanLevelSimulasi = document.getElementById('btnTambahBatasanLevelSimulasi');
    const bodyTabelDaftarPksPlotting = document.getElementById('bodyTabelDaftarPksPlotting');
    const headTabelPlottingKerma = document.getElementById('headTabelPlottingKerma');
    const bodyTabelPlottingKerma = document.getElementById('bodyTabelPlottingKerma');

    const filterCari = document.getElementById('filterCari');
    const btnResetFilter = document.getElementById('btnResetFilter');
    const infoHasilFilter = document.getElementById('infoHasilFilter');
    const statKermaTotal = document.getElementById('statKermaTotal');
    const statKermaAktif = document.getElementById('statKermaAktif');
    const statKermaWarning = document.getElementById('statKermaWarning');
    const statKermaNilai = document.getElementById('statKermaNilai');
    const generalTahunPimpinan = document.getElementById('generalTahunPimpinan');
    const periodeLabelPimpinan = document.getElementById('periodeLabelPimpinan');
    const jumlahKontrakPimpinan = document.getElementById('jumlahKontrakPimpinan');
    const totalMitraPimpinan = document.getElementById('totalMitraPimpinan');
    const chartNominalTahunanPimpinan = document.getElementById('chartNominalTahunanPimpinan');
    const tabelNominalTahunanPimpinan = document.getElementById('tabelNominalTahunanPimpinan');
    const chartJumlahKontrakTahunanPimpinan = document.getElementById('chartJumlahKontrakTahunanPimpinan');
    const tabelJumlahKontrakTahunanPimpinan = document.getElementById('tabelJumlahKontrakTahunanPimpinan');
    const statusPiePimpinan = document.getElementById('statusPiePimpinan');
    const statusProgramTablePimpinan = document.getElementById('statusProgramTablePimpinan');
    const chartRelasiMitraPimpinan = document.getElementById('chartRelasiMitraPimpinan');
    const tabelRelasiMitraPimpinan = document.getElementById('tabelRelasiMitraPimpinan');
    const modalIndikatorDetail = document.getElementById('modalIndikatorDetail');
    const modalIndikatorJudul = document.getElementById('modalIndikatorJudul');
    const modalIndikatorDeskripsi = document.getElementById('modalIndikatorDeskripsi');
    const modalIndikatorBody = document.getElementById('modalIndikatorBody');
    const btnTutupModalIndikator = document.getElementById('btnTutupModalIndikator');
    const btnLihatNeracaKeuangan = document.getElementById('btnLihatNeracaKeuangan');
    const modalNeracaKeuangan = document.getElementById('modalNeracaKeuangan');
    const modalNeracaKeuanganBody = document.getElementById('modalNeracaKeuanganBody');
    const btnTutupModalNeracaKeuangan = document.getElementById('btnTutupModalNeracaKeuangan');
    const modalSimulasiDistribusi = document.getElementById('modalSimulasiDistribusi');
    const modalSimulasiDistribusiBody = document.getElementById('modalSimulasiDistribusiBody');
    const btnTutupModalSimulasiDistribusi = document.getElementById('btnTutupModalSimulasiDistribusi');
    const btnOkModalSimulasiDistribusi = document.getElementById('btnOkModalSimulasiDistribusi');
    const btnLanjutModalSimulasiDistribusi = document.getElementById('btnLanjutModalSimulasiDistribusi');
    const btnBerhentiModalSimulasiDistribusi = document.getElementById('btnBerhentiModalSimulasiDistribusi');

    let allData = [];
    let allRencanaPendapatanData = [];
    let allRencanaTerminData = [];
    let allPembayaranData = [];
    let allRabAnggaranData = [];
    let allRencanaAnggaranData = [];
    let allRealisasiData = [];
    let allSisaAnggaranData = [];
    let allMahasiswaData = [];
    let allMitraData = [];
    let modeRencanaPendapatan = 'daftar';
    let rencanaTerminFallbackMode = false;
    let cicilanTerminCache = new Map();
    let rencanaPendapatanDipilih = null;
    let rencanaPendapatanDetailTerbuka = true;
    let rencanaPendapatanDetailFilter = '';
    let rencanaPendapatanRowsPeriodeAktif = null;
    let rencanaPendapatanTerminFilterRows = [];
    let colFilterRencanaPendapatan = null;
    let rabDraftAfter = null;
    let rabEditId = null;
    let rabTerpilih = new Set();
    let rencanaAnggaranSudahDimuat = false;
    let realisasiRiDraftAfter = null;
    let realisasiRiDraftPrefill = null;
    let pembayaranDipilihUntukEdit = null;
    const FAKTOR_REALISASI_PENERIMAAN = 0.8;
    let tabAktifPlottingKerma = 'target';
    const STORAGE_PLOTTING_KERMA = 'kerma.plottingKerma.v1';
    const simpananPlottingKerma = muatSimpananPlottingKerma();
    let plottingKermaLoadedFromServer = false;
    let plottingKermaSyncTimer = null;
    const simpananPerhitunganDasar = simpananPlottingKerma?.perhitunganDasarPlotting || {};
    let modeEditMasterTarif = false;
    let hargaJabatanCollapsed = Boolean(simpananPlottingKerma?.hargaJabatanCollapsed);
    let perhitunganDasarTersimpan = Boolean(simpananPerhitunganDasar.tersimpan);
    let totalPerKermaTersimpan = Number(simpananPerhitunganDasar.totalPerKerma) || 0;
    let periodePengelolaKerma = normalisasiPeriodePengelolaKerma(simpananPlottingKerma?.periodePengelolaKerma);
    let jumlahPksDitetapkanPlotting = Math.max(0, Math.round(Number(simpananPlottingKerma?.jumlahPksDitetapkanPlotting) || 0));
    let daftarPksTerpilihPlotting = Array.isArray(simpananPlottingKerma?.daftarPksTerpilihPlotting)
        ? simpananPlottingKerma.daftarPksTerpilihPlotting.map(id => id ? String(id) : '')
        : [];
    let jumlahPksPlotting = Number(simpananPlottingKerma?.jumlahPksPlotting) || 2;
    let statusSimulasiTooltipTerakhir = '';
    let hasilSimulasiModalTerakhir = null;
    let hasilSimulasiTertunda = null;
    const statusDistribusiPlotting = ['Aktif', 'Tugas Belajar', 'Penugasan', 'Tidak Aktif'];
    const rolePlottingKerma = ['PJ', 'Pengarah', 'Ketua', 'Kepala Admin', 'Anggota'];
    const batasanSimulasiDefault = {
        batasSelisihAtas: 1000000,
        batasSelisihBawah: 500000,
        dosenTidakBolehMinus: true,
        stafTidakBolehMinus: true,
        roleDosen: [...rolePlottingKerma],
        roleStaf: ['Ketua', 'Kepala Admin'],
        prioritasDosenTargetTerbesar: true,
        prioritasStafTargetTerbesar: true,
        batasiPksDitetapkan: true,
        posisiKosongBolehTersisa: true,
        dosenGunakanSlotKosong: true,
        batasanNonaktif: [],
        levelJabatanRules: [
            { id: 'levelDekan', nama: 'Dekan', levels: ['Dekan'], roles: ['PJ', 'Pengarah'] },
            { id: 'levelWakilDekan', nama: 'Wakil Dekan', levels: ['Wakil Dekan'], roles: ['PJ', 'Pengarah'] },
            { id: 'levelKepalaSenat', nama: 'Kepala Senat', levels: ['Kepala Senat'], roles: ['PJ', 'Pengarah'] },
            { id: 'levelSekretarisSenat', nama: 'Sekretaris Senat', levels: ['Sekretaris Senat'], roles: ['Pengarah', 'Ketua', 'PJ'] },
            { id: 'levelKetuaKelompokKeahlian', nama: 'Ketua Kelompok Keahlian', levels: ['Ketua Kelompok Keahlian'], roles: ['PJ', 'Pengarah'] },
            { id: 'levelKetuaProgramStudi', nama: 'Ketua Program Studi', levels: ['Ketua Program Studi'], roles: ['Pengarah', 'Ketua', 'PJ'] },
            { id: 'levelKepalaPusat', nama: 'Kepala Pusat', levels: ['Kepala Pusat'], roles: ['Pengarah', 'Ketua', 'PJ'] },
            { id: 'levelKepalaLaboratorium', nama: 'Kepala Laboratorium', levels: ['Kepala Laboratorium'], roles: ['Pengarah', 'Ketua', 'PJ'] },
            { id: 'levelKepalaAdministrasi', nama: 'Kepala Administrasi', levels: ['Kepala Administrasi'], roles: ['Pengarah', 'Ketua', 'PJ'] },
            { id: 'levelKetuaUrusan', nama: 'Ketua Urusan', levels: ['Ketua Urusan'], roles: ['Pengarah', 'Ketua', 'PJ'] },
            { id: 'levelWakilKepala', nama: 'Wakil Kepala', levels: ['Wakil Kepala'], roles: ['Ketua', 'Kepala Admin', 'Anggota'] },
            { id: 'levelKepalaSubAdministrasi', nama: 'Kepala Sub Administrasi', levels: ['Kepala Sub Administrasi'], roles: ['Ketua', 'Kepala Admin', 'Anggota'] },
            { id: 'levelKoordinator', nama: 'Koordinator', levels: ['Koordinator'], roles: ['Ketua', 'Kepala Admin', 'Anggota'] },
            { id: 'levelAsisten', nama: 'Asisten', levels: ['Asisten'], roles: ['Anggota', 'Kepala Admin', 'Ketua'] },
            {
                id: 'dosenTanpaLevel',
                nama: 'Dosen Tanpa Level',
                levels: [],
                roles: ['Ketua', 'Pengarah', 'PJ', 'Kepala Admin']
            }
        ]
    };
    let batasanSimulasiPlotting = normalisasiBatasanSimulasi(simpananPlottingKerma?.batasanSimulasiPlotting);
    let batasSelisihDistribusi = nilaiBatasSelisihAtasAktif(batasanSimulasiPlotting);
    let batasSelisihBawahDistribusi = nilaiBatasSelisihBawahAktif(batasanSimulasiPlotting);
    const labelRolePlottingKerma = {
        PJ: 'PJ',
        Pengarah: 'PG',
        Ketua: 'K',
        'Kepala Admin': 'KA',
        Anggota: 'A'
    };
    const namaRolePlottingKerma = {
        PJ: 'Penanggung Jawab',
        Pengarah: 'Pengarah',
        Ketua: 'Ketua',
        'Kepala Admin': 'Kepala Admin',
        Anggota: 'Anggota'
    };
    const tarifDefaultJabatanPlotting = {
        PJ: 4500000,
        Pengarah: 3500000,
        Ketua: 6000000,
        'Kepala Admin': 2500000,
        Anggota: 0
    };
    let tarifMasterJabatanPlotting = {
        ...tarifDefaultJabatanPlotting,
        ...(simpananPlottingKerma?.tarifMasterJabatanPlotting || {})
    };
    const dataAwalTargetDistribusi = Array.isArray(window.TARGET_DISTRIBUSI_AWAL) ? window.TARGET_DISTRIBUSI_AWAL : [];
    const plottingKermaRows = (Array.isArray(simpananPlottingKerma?.rows) && simpananPlottingKerma.rows.length
        ? simpananPlottingKerma.rows
        : dataAwalTargetDistribusi
    ).map(normalisasiRowPlotting);
    if (!plottingKermaRows.length) plottingKermaRows.push(buatBarisPlottingKerma());
    let masterLevelJabatanPlotting = {
        ...(simpananPlottingKerma?.masterLevelJabatanPlotting || {})
    };
    let pegawaiEditRowIndex = null;
    let jabatanEditKey = null;
    sinkronMasterLevelJabatanDariRows();
    const perhitunganDasarPlotting = {
        rows: Array.isArray(simpananPerhitunganDasar.rows)
            ? simpananPerhitunganDasar.rows.map(row => ({
                jabatan: row.jabatan || '',
                tarif: row.tarif ?? 0,
                durasi: row.durasi ?? '',
                personil_per_kerma: row.personil_per_kerma ?? 1
            }))
            : []
    };

    function snapshotPlottingKerma() {
        return {
            jumlahPksPlotting,
            jumlahPksDitetapkanPlotting,
            hargaJabatanCollapsed,
            periodePengelolaKerma,
            tarifMasterJabatanPlotting,
            perhitunganDasarPlotting: {
                rows: perhitunganDasarPlotting.rows,
                tersimpan: perhitunganDasarTersimpan,
                totalPerKerma: totalPerKermaTersimpan
            },
            daftarPksTerpilihPlotting,
            masterLevelJabatanPlotting,
            batasanSimulasiPlotting,
            rows: plottingKermaRows
        };
    }

    function terapkanPayloadPlottingKerma(payload = {}) {
        const sumber = payload && typeof payload === 'object' ? payload : {};
        hargaJabatanCollapsed = Boolean(sumber.hargaJabatanCollapsed);
        perhitunganDasarTersimpan = Boolean(sumber.perhitunganDasarPlotting?.tersimpan);
        totalPerKermaTersimpan = Number(sumber.perhitunganDasarPlotting?.totalPerKerma) || 0;
        periodePengelolaKerma = normalisasiPeriodePengelolaKerma(sumber.periodePengelolaKerma);
        jumlahPksDitetapkanPlotting = Math.max(0, Math.round(Number(sumber.jumlahPksDitetapkanPlotting) || 0));
        daftarPksTerpilihPlotting = Array.isArray(sumber.daftarPksTerpilihPlotting)
            ? sumber.daftarPksTerpilihPlotting.map(id => id ? String(id) : '')
            : [];
        jumlahPksPlotting = Number(sumber.jumlahPksPlotting) || 2;
        tarifMasterJabatanPlotting = {
            ...tarifDefaultJabatanPlotting,
            ...((sumber.tarifMasterJabatanPlotting && typeof sumber.tarifMasterJabatanPlotting === 'object')
                ? sumber.tarifMasterJabatanPlotting
                : {})
        };
        setBatasanSimulasi(sumber.batasanSimulasiPlotting || {});
        masterLevelJabatanPlotting = {
            ...((sumber.masterLevelJabatanPlotting && typeof sumber.masterLevelJabatanPlotting === 'object')
                ? sumber.masterLevelJabatanPlotting
                : {})
        };
        plottingKermaRows.splice(0, plottingKermaRows.length, ...(
            Array.isArray(sumber.rows) && sumber.rows.length
                ? sumber.rows
                : dataAwalTargetDistribusi
        ).map(normalisasiRowPlotting));
        if (!plottingKermaRows.length) plottingKermaRows.push(buatBarisPlottingKerma());
        sinkronMasterLevelJabatanDariRows();
        perhitunganDasarPlotting.rows = Array.isArray(sumber.perhitunganDasarPlotting?.rows)
            ? sumber.perhitunganDasarPlotting.rows.map(row => ({
                jabatan: row.jabatan || '',
                tarif: row.tarif ?? 0,
                durasi: row.durasi ?? '',
                personil_per_kerma: row.personil_per_kerma ?? 1
            }))
            : [];
    }

    function renderPlottingKermaViews() {
        renderDatalistPegawai();
        if (sectionPegawai?.classList.contains('active')) renderDaftarPegawai();
        if (sectionJabatan?.classList.contains('active')) renderDaftarJabatan();
        updateRingkasanDasarPlotting();
        renderPerhitunganDasarPlotting();
        renderDaftarPksPlotting();
        renderTargetDistribusiPlotting();
        renderPlottingKerma();
        renderBatasanSimulasiPlotting();
    }

    async function simpanPlottingKermaKeServer(payload) {
        try {
            await fetch('/api/plotting-kerma', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.warn('Gagal menyimpan plotting kerma ke server.', err);
        }
    }

    function jadwalkanSinkronPlottingKerma() {
        const payload = snapshotPlottingKerma();
        if (plottingKermaSyncTimer) clearTimeout(plottingKermaSyncTimer);
        plottingKermaSyncTimer = setTimeout(() => {
            plottingKermaSyncTimer = null;
            simpanPlottingKermaKeServer(payload);
        }, 250);
    }

    async function muatPlottingKermaDariServer() {
        try {
            const res = await fetch('/api/plotting_kerma', { cache: 'no-store' });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.pesan || 'Gagal memuat data plotting kerma.');
            if (payload?.data) {
                terapkanPayloadPlottingKerma(payload.data);
                plottingKermaLoadedFromServer = true;
                try {
                    localStorage.setItem(STORAGE_PLOTTING_KERMA, JSON.stringify(snapshotPlottingKerma()));
                } catch {
                    // abaikan jika localStorage tidak tersedia
                }
                renderPlottingKermaViews();
                return;
            }
            terapkanPayloadPlottingKerma({});
            plottingKermaLoadedFromServer = true;
            try {
                localStorage.removeItem(STORAGE_PLOTTING_KERMA);
            } catch {
                // abaikan jika localStorage tidak tersedia
            }
            renderPlottingKermaViews();
        } catch (err) {
            console.warn('Gagal memuat plotting kerma dari server.', err);
        }
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function tableState(colspan, type, title, desc = '') {
        return `
            <tr class="table-state-row">
                <td colspan="${colspan}">
                    <div class="table-state table-state--${esc(type)}">
                        <span class="state-dot" aria-hidden="true"></span>
                        <strong>${esc(title)}</strong>
                        ${desc ? `<small>${esc(desc)}</small>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    function setText(el, text) {
        if (el) el.textContent = text;
    }

    function indikatorDetailConfig(key) {
        const configs = {
            yearly: {
                title: 'Penerimaan per Tahun',
                desc: 'Grafik dan tabel total realisasi penerimaan per tahun berdasarkan tanggal pembayaran kontrak.',
                chart: chartNominalTahunanPimpinan,
                table: tabelNominalTahunanPimpinan,
                chartClass: 'indicator-detail-chart--yearly'
            },
            'yearly-count': {
                title: 'Jumlah Kontrak per Tahun',
                desc: 'Grafik dan tabel jumlah kontrak yang ditandatangani per tahun.',
                chart: chartJumlahKontrakTahunanPimpinan,
                table: tabelJumlahKontrakTahunanPimpinan,
                chartClass: 'indicator-detail-chart--yearly'
            },
            relationship: {
                title: 'Pola Kerja Sama Mitra',
                desc: 'Chart dan tabel kategori hubungan mitra.',
                chart: chartRelasiMitraPimpinan,
                table: tabelRelasiMitraPimpinan,
                chartClass: 'indicator-detail-chart--relationship'
            },
            status: {
                title: 'Komposisi Kontrak',
                desc: 'Chart dan tabel detail status kontrak strategis.',
                chart: statusPiePimpinan,
                table: statusProgramTablePimpinan,
                chartClass: 'indicator-detail-chart--status'
            }
        };
        return configs[key];
    }

    function tutupModalIndikator() {
        if (!modalIndikatorDetail) return;
        modalIndikatorDetail.style.display = 'none';
        if (modalIndikatorBody) modalIndikatorBody.innerHTML = '';
    }

    function bukaModalIndikator(key) {
        const config = indikatorDetailConfig(key);
        if (!config || !modalIndikatorDetail || !modalIndikatorBody) return;
        setText(modalIndikatorJudul, config.title);
        setText(modalIndikatorDeskripsi, config.desc);
        modalIndikatorBody.innerHTML = `
            <section class="indicator-detail-chart ${config.chartClass}">
                ${config.chart?.innerHTML || '<div class="exec-empty">Chart belum tersedia.</div>'}
            </section>
            <section class="indicator-detail-table">
                ${config.table?.innerHTML || '<div class="exec-empty">Tabel detail belum tersedia.</div>'}
            </section>
        `;
        modalIndikatorDetail.style.display = 'flex';
    }

    function tutupModalNeracaKeuangan() {
        if (!modalNeracaKeuangan) return;
        modalNeracaKeuangan.style.display = 'none';
        if (modalNeracaKeuanganBody) modalNeracaKeuanganBody.innerHTML = '';
    }

    function bukaModalNeracaKeuangan() {
        if (!modalNeracaKeuangan || !modalNeracaKeuanganBody) return;
        const sumber = document.querySelector('.finance-statement-panel--modal-source');
        if (!sumber) {
            modalNeracaKeuanganBody.innerHTML = '<div class="table-state table-state--empty"><strong>Neraca belum tersedia</strong><small>Muat ulang data Neraca terlebih dahulu.</small></div>';
            modalNeracaKeuangan.style.display = 'flex';
            return;
        }

        const clone = sumber.cloneNode(true);
        clone.classList.add('finance-statement-panel--modal');
        clone.classList.remove('finance-statement-panel--modal-source');
        clone.removeAttribute('hidden');
        clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        modalNeracaKeuanganBody.innerHTML = '';
        modalNeracaKeuanganBody.appendChild(clone);
        modalNeracaKeuangan.style.display = 'flex';
    }

    function parseNominalRupiah(value) {
        if (value == null) return 0;
        if (typeof value === 'number') return value;
        const teks = String(value).trim();
        const teksTanpaKomaDash = teks.replace(/,-\s*$/, '');
        const sign = teksTanpaKomaDash.includes('-') ? '-' : '';
        const angka = teksTanpaKomaDash.replace(/\D/g, '');
        return Number(`${sign}${angka}`) || 0;
    }

    function formatRupiahRingkas(value) {
        const n = Number(value) || 0;
        const sign = n < 0 ? '-' : '';
        const abs = Math.abs(n);
        if (abs >= 1000000000) return `Rp ${sign}${(abs / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
        if (abs >= 1000000) return `Rp ${sign}${(abs / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
        return `Rp ${n.toLocaleString('id-ID')}`;
    }

    function formatRupiahPenuh(value) {
        const n = Number(value) || 0;
        const sign = n < 0 ? '-' : '';
        return `Rp ${sign}${Math.abs(n).toLocaleString('id-ID')}`;
    }

    function formatRupiahKomaDash(value) {
        const n = parseNominalRupiah(value);
        const sign = n < 0 ? '-' : '';
        return `Rp ${sign}${Math.abs(n).toLocaleString('id-ID')},-`;
    }

    const collatorKodeFile = new Intl.Collator('id', { numeric: true, sensitivity: 'base' });

    function tahunDariKodeFile(kodeFile) {
        const matches = String(kodeFile || '').match(/(?:19|20)\d{2}/g);
        return matches?.length ? Number(matches[matches.length - 1]) : 0;
    }

    function tahunSortKodeFile(item = {}) {
        const tahunKode = tahunDariKodeFile(item.kode_file || item.id_program);
        if (tahunKode) return tahunKode;
        const tanggalKontrak = parseInputDate(item.tgl_kontrak_input);
        return tanggalKontrak ? tanggalKontrak.getFullYear() : 0;
    }

    function nomorSortKodeFile(kodeFile) {
        const tahunKode = tahunDariKodeFile(kodeFile);
        const angkaKode = String(kodeFile || '').match(/\d+/g) || [];
        const kandidatNomor = angkaKode.filter(part => !(part.length === 4 && Number(part) === tahunKode));
        return kandidatNomor.length ? Number(kandidatNomor[kandidatNomor.length - 1]) : 0;
    }

    function urutKodeFileTahunTerbaru(a = {}, b = {}) {
        const tahunA = tahunSortKodeFile(a);
        const tahunB = tahunSortKodeFile(b);
        if (tahunA !== tahunB) return tahunB - tahunA;
        return collatorKodeFile.compare(String(a.kode_file || a.id_program || ''), String(b.kode_file || b.id_program || ''));
    }

    function urutKodeFileTerbaru(a = {}, b = {}) {
        const kodeA = String(a.kode_file || a.id_program || '');
        const kodeB = String(b.kode_file || b.id_program || '');
        const tahunA = tahunSortKodeFile(a);
        const tahunB = tahunSortKodeFile(b);
        if (tahunA !== tahunB) return tahunB - tahunA;
        const nomorA = nomorSortKodeFile(kodeA);
        const nomorB = nomorSortKodeFile(kodeB);
        if (nomorA !== nomorB) return nomorB - nomorA;
        return collatorKodeFile.compare(kodeB, kodeA);
    }


    function updateKermaInsights() {
        if (!statKermaTotal) return;
        const aktif = allData.filter(item => item.status_kontrak === 'Berjalan').length;
        const atensi = allData.filter(item => item.peringatan !== null && item.peringatan !== undefined).length;
        const nilai = allData.reduce((sum, item) =>
            sum + (Number(item.nilai_kontrak_raw) || parseNominalRupiah(item.nilai_kontrak)), 0);
        statKermaTotal.textContent = allData.length.toLocaleString('id-ID');
        statKermaAktif.textContent = aktif.toLocaleString('id-ID');
        statKermaWarning.textContent = atensi.toLocaleString('id-ID');
        statKermaNilai.textContent = formatRupiahRingkas(nilai);
    }

    function todayInputDate() {
        const d = new Date();
        return inputDateFromDate(d);
    }

    function inputDateFromDate(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function parseInputDate(value) {
        if (!value) return null;
        const parts = String(value).split('-').map(Number);
        if (parts.length < 3 || parts.some(n => !Number.isFinite(n))) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function formatBulanTahun(date) {
        const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${bulan[date.getMonth()]} ${date.getFullYear()}`;
    }

    function monthStartOffsetInput(monthOffset) {
        const d = new Date();
        return inputDateFromDate(new Date(d.getFullYear(), d.getMonth() + monthOffset, 1));
    }

    function monthEndOffsetInput(monthOffset) {
        const d = new Date();
        return inputDateFromDate(new Date(d.getFullYear(), d.getMonth() + monthOffset + 1, 0));
    }

    function getTahunKontrak(item = {}) {
        const dariInput = parseInputDate(item.tgl_kontrak_input);
        if (dariInput) return dariInput.getFullYear();
        const match = String(item.tgl_kontrak || '').match(/\b(19|20)\d{2}\b/);
        return match ? Number(match[0]) : null;
    }

    function populatePimpinanTahunOptions() {
        if (!generalTahunPimpinan) return;
        const selected = generalTahunPimpinan.value || 'all';
        const years = [...new Set(allData.map(getTahunKontrak).filter(Boolean))]
            .sort((a, b) => b - a);
        if (!years.length) years.push(new Date().getFullYear());

        generalTahunPimpinan.innerHTML = `
            <option value="all">All</option>
            ${years.map(tahun => `<option value="${tahun}">${tahun}</option>`).join('')}
        `;
        generalTahunPimpinan.value = [...generalTahunPimpinan.options].some(opt => opt.value === selected)
            ? selected
            : 'all';
    }

    function initPimpinanDefaults() {
        populatePimpinanTahunOptions();
    }

    function buildPimpinanParams() {
        const params = new URLSearchParams();
        params.set('tanggal', todayInputDate());
        const tahunGeneral = generalTahunPimpinan?.value;
        if (tahunGeneral && tahunGeneral !== 'all') {
            params.set('tanggal_awal_general', `${tahunGeneral}-01-01`);
            params.set('tanggal_akhir_general', `${tahunGeneral}-12-31`);
        }
        return params;
    }

    function setExecLoading() {
        setText(periodeLabelPimpinan, 'Memuat periode...');
        setText(jumlahKontrakPimpinan, '...');
        setText(totalMitraPimpinan, '...');
        if (chartNominalTahunanPimpinan) chartNominalTahunanPimpinan.innerHTML = '<div class="exec-empty">Memuat grafik penerimaan tahunan...</div>';
        if (tabelNominalTahunanPimpinan) tabelNominalTahunanPimpinan.innerHTML = '<div class="exec-empty">Memuat tabel penerimaan tahunan...</div>';
        if (chartJumlahKontrakTahunanPimpinan) chartJumlahKontrakTahunanPimpinan.innerHTML = '<div class="exec-empty">Memuat grafik jumlah kontrak tahunan...</div>';
        if (tabelJumlahKontrakTahunanPimpinan) tabelJumlahKontrakTahunanPimpinan.innerHTML = '<div class="exec-empty">Memuat tabel jumlah kontrak tahunan...</div>';
        if (statusPiePimpinan) statusPiePimpinan.innerHTML = '<div class="exec-empty">Memuat pie chart...</div>';
        if (statusProgramTablePimpinan) statusProgramTablePimpinan.innerHTML = '<div class="exec-empty">Memuat daftar program...</div>';
        if (chartRelasiMitraPimpinan) chartRelasiMitraPimpinan.innerHTML = '<div class="exec-empty">Memuat pola kerja sama mitra...</div>';
        if (tabelRelasiMitraPimpinan) tabelRelasiMitraPimpinan.innerHTML = '<div class="exec-empty">Memuat tabel pola mitra...</div>';
    }

    function renderStatusKontrak(general) {
        const status = general?.status || {};
        const jumlah = Number(general?.jumlah_kontrak) || 0;

        if (!jumlah) {
            if (statusPiePimpinan) statusPiePimpinan.innerHTML = '<div class="exec-empty">Belum ada kontrak pada periode ini.</div>';
            if (statusProgramTablePimpinan) statusProgramTablePimpinan.innerHTML = '';
            return;
        }

        const fallbackKategori = [
            {
                key: 'berjalan_diatas_1_tahun',
                label: 'Berjalan',
                jumlah: Number(status.berjalan) || 0,
                jumlah_display: status.berjalan_display || '0',
                persen: status.berjalan_persen || 0,
                daftar: status.daftar_berjalan || []
            },
            {
                key: 'berakhir',
                label: 'Berakhir',
                jumlah: Number(status.berakhir) || 0,
                jumlah_display: status.berakhir_display || '0',
                persen: status.berakhir_persen || 0,
                daftar: status.daftar_berakhir || []
            }
        ];
        const kategori = (status.kategori || fallbackKategori).map(cat => ({
            ...cat,
            jumlah: Number(cat.jumlah) || 0,
            daftar: cat.daftar || []
        }));
        const warnaStatus = {
            berjalan_dibawah_1_tahun: '#0EA5E9',
            berjalan_diatas_1_tahun: '#10B981',
            berjalan_akan_berakhir_6_bulan: '#F59E0B',
            berakhir: '#EF4444'
        };
        const chipClass = key => ({
            berjalan_dibawah_1_tahun: 'program-id-chip--young',
            berjalan_diatas_1_tahun: 'program-id-chip--mature',
            berjalan_akan_berakhir_6_bulan: 'program-id-chip--soon',
            berakhir: 'program-id-chip--ended'
        }[key] || '');
        let start = 0;
        const segments = kategori
            .filter(cat => cat.jumlah > 0)
            .map(cat => {
                const end = start + ((cat.jumlah / jumlah) * 100);
                const segment = `${warnaStatus[cat.key] || '#64748B'} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
                start = end;
                return segment;
            });
        const pieBackground = segments.length ? `conic-gradient(${segments.join(', ')})` : '#E2E8F0';
        const maxRows = Math.max(1, ...kategori.map(cat => cat.daftar.length));
        const rows = Array.from({ length: maxRows }, (_, i) => `
            <tr>
                ${kategori.map(cat => {
                    const item = cat.daftar[i];
                    if (!item) return '<td>-</td>';
                    const title = [
                        item.judul || '-',
                        item.nama_mitra ? `Mitra: ${item.nama_mitra}` : '',
                        item.tanggal_kontrak ? `Tgl kontrak: ${item.tanggal_kontrak}` : '',
                        item.tanggal_akhir_kontrak ? `Tgl akhir: ${item.tanggal_akhir_kontrak}` : ''
                    ].filter(Boolean).join('\n');
                    return `
                        <td>
                            <span class="program-id-chip ${chipClass(cat.key)}" title="${esc(title)}">${esc(item.id_program || '-')}</span>
                        </td>
                    `;
                }).join('')}
            </tr>
        `).join('');

        if (statusPiePimpinan) {
            statusPiePimpinan.innerHTML = `
                <div class="status-pie" style="background:${pieBackground};" aria-label="Komposisi status kontrak strategis">
                    <div class="status-pie-center">
                        <strong>${jumlah.toLocaleString('id-ID')}</strong>
                        <small>Kontrak</small>
                    </div>
                </div>
                <div class="status-pie-legend">
                    ${kategori.map(cat => `
                        <span><i class="status-dot" style="background:${warnaStatus[cat.key] || '#64748B'}"></i>${esc(cat.label)}: ${cat.jumlah.toLocaleString('id-ID')} (${cat.persen || 0}%)</span>
                    `).join('')}
                </div>
            `;
        }

        if (statusProgramTablePimpinan) {
            statusProgramTablePimpinan.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            ${kategori.map(cat => `<th>${esc(cat.label)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }
    }

    function tooltipProgramList(item, mode = 'repeat') {
        const programs = item?.program || [];
        if (!programs.length) return 'ID Program: -';
        if (mode === 'repeat') {
            const years = [...new Set(programs.map(p => p.tahun_kerja_sama).filter(Boolean))]
                .sort((a, b) => a - b);
            return years.length ? `Tahun kerja sama:\n${years.join('\n')}` : 'Tahun kerja sama: -';
        }
        return programs.map(p => `${p.id_program || '-'}${p.judul ? ` - ${p.judul}` : ''}`).join('\n');
    }

    function relationshipCellMeta(item, mode = 'repeat') {
        if (mode === 'repeat') {
            return `${(item.jumlah_kerja_sama || 0).toLocaleString('id-ID')} kerja sama · ${esc(item.total_nominal_display || 'Rp 0')}`;
        }
        return `${esc(item.tanggal_kontrak || '-')} · ${esc(item.nominal_display || 'Rp 0')}`;
    }

    function relationshipCategories(general) {
        return [
            {
                title: 'Kerja sama berulang',
                subtitle: 'Lebih dari satu kali',
                count: Number(general?.jumlah_mitra_berulang) || 0,
                countDisplay: general?.jumlah_mitra_berulang_display || '0',
                items: general?.kerja_sama_berulang || [],
                mode: 'repeat'
            },
            {
                title: 'Tidak berulang > 1 tahun',
                subtitle: 'Belum ada lanjutan',
                count: Number(general?.jumlah_mitra_tidak_berulang) || 0,
                countDisplay: general?.jumlah_mitra_tidak_berulang_display || '0',
                items: general?.kerja_sama_tidak_berulang || [],
                mode: 'stale'
            },
            {
                title: 'Baru 1 kali < 1 tahun',
                subtitle: 'Potensi follow-up',
                count: Number(general?.jumlah_mitra_baru) || 0,
                countDisplay: general?.jumlah_mitra_baru_display || '0',
                items: general?.kerja_sama_baru || [],
                mode: 'new'
            }
        ];
    }

    function renderRelationshipTable(general) {
        if (!tabelRelasiMitraPimpinan) return;
        const categories = relationshipCategories(general);
        const maxRows = Math.max(1, ...categories.map(cat => cat.items.length));

        tabelRelasiMitraPimpinan.innerHTML = `
            <table>
                <thead>
                    <tr>
                        ${categories.map(cat => `
                            <th>
                                <span>${esc(cat.title)}</span>
                                <small>${esc(cat.countDisplay)} mitra · ${esc(cat.subtitle)}</small>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${Array.from({ length: maxRows }, (_, index) => `
                        <tr>
                            ${categories.map(cat => {
                                const item = cat.items[index];
                                if (!item) return '<td><span class="relationship-empty-cell">-</span></td>';
                                const tooltip = tooltipProgramList(item, cat.mode);
                                return `
                                    <td>
                                        <div class="relationship-table-item">
                                            <strong class="relationship-partner-name" title="${esc(tooltip)}">${esc(item.nama_mitra || '-')}</strong>
                                            <small>${relationshipCellMeta(item, cat.mode)}</small>
                                        </div>
                                    </td>
                                `;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function renderRelationshipChart(general) {
        if (!chartRelasiMitraPimpinan) return;
        const total = Number(general?.total_mitra) || 0;
        const rows = [
            {
                label: 'Berulang',
                desc: 'Lebih dari satu kerja sama',
                count: Number(general?.jumlah_mitra_berulang) || 0,
                cls: 'repeat'
            },
            {
                label: 'Tidak berulang > 1 tahun',
                desc: 'Belum ada lanjutan',
                count: Number(general?.jumlah_mitra_tidak_berulang) || 0,
                cls: 'stale'
            },
            {
                label: 'Baru 1 kali < 1 tahun',
                desc: 'Potensi follow-up',
                count: Number(general?.jumlah_mitra_baru) || 0,
                cls: 'new'
            }
        ];
        const maxCount = Math.max(1, ...rows.map(row => row.count));

        chartRelasiMitraPimpinan.innerHTML = `
            <div class="relationship-chart-head">
                <strong>${total.toLocaleString('id-ID')}</strong>
                <small>Total mitra</small>
            </div>
            <div class="relationship-chart-bars">
                ${rows.map(row => {
                    const width = Math.max(row.count ? 8 : 0, (row.count / maxCount) * 100);
                    const percent = total ? Math.round((row.count / total) * 100) : 0;
                    return `
                        <div class="relationship-chart-row relationship-chart-row--${row.cls}" title="${esc(row.label)}: ${row.count.toLocaleString('id-ID')} mitra (${percent}%)">
                            <div class="relationship-chart-label">
                                <span>${esc(row.label)}</span>
                                <small>${esc(row.desc)}</small>
                            </div>
                            <div class="relationship-chart-track">
                                <i style="width:${width.toFixed(2)}%;"></i>
                            </div>
                            <div class="relationship-chart-value">
                                <strong>${row.count.toLocaleString('id-ID')}</strong>
                                <small>${percent}%</small>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderRelasiMitra(general) {
        renderRelationshipChart(general);
        renderRelationshipTable(general);
    }

    function renderPenerimaanTahunan(rows = []) {
        const data = Array.isArray(rows) ? rows : [];
        if (!chartNominalTahunanPimpinan || !tabelNominalTahunanPimpinan) return;
        if (!data.length) {
            chartNominalTahunanPimpinan.innerHTML = '<div class="exec-empty">Belum ada penerimaan tahunan pada periode ini.</div>';
            tabelNominalTahunanPimpinan.innerHTML = '<div class="exec-empty">Belum ada tabel penerimaan tahunan.</div>';
            return;
        }

        const height = 250;
        const margin = { top: 24, right: 20, bottom: 44, left: 78 };
        const yearWidth = 84;
        const width = Math.max(460, margin.left + margin.right + (data.length * yearWidth));
        const plotW = width - margin.left - margin.right;
        const plotH = height - margin.top - margin.bottom;
        const values = data.map(row => Number(row.total_penerimaan) || 0);
        let maxValue = Math.max(1, ...values);
        const stepBase = Math.pow(10, Math.floor(Math.log10(maxValue / 5 || 1)));
        const step = [1, 2, 5, 10].map(m => m * stepBase).find(v => v >= maxValue / 5) || stepBase * 10;
        maxValue = Math.ceil(maxValue / step) * step;

        const xForIndex = i => data.length === 1
            ? margin.left + (plotW / 2)
            : margin.left + ((i / (data.length - 1)) * plotW);
        const yForValue = value => margin.top + ((maxValue - value) / maxValue) * plotH;
        const points = data.map((row, i) => ({
            ...row,
            x: xForIndex(i),
            y: yForValue(Number(row.total_penerimaan) || 0),
            value: Number(row.total_penerimaan) || 0
        }));
        const path = points.map((point, i) =>
            `${i === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        ).join(' ');
        const area = points.length > 1
            ? `${path} L ${points[points.length - 1].x.toFixed(2)} ${margin.top + plotH} L ${points[0].x.toFixed(2)} ${margin.top + plotH} Z`
            : '';
        const yTicks = Array.from({ length: Math.round(maxValue / step) + 1 }, (_, i) => i * step);
        const grid = yTicks.map(value => {
            const y = yForValue(value);
            return `
                <line class="line-chart-grid" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}"></line>
                <text class="line-chart-y-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${esc(formatRupiahRingkas(value))}</text>
            `;
        }).join('');
        const yearMarkers = points.map(point => `
            <line class="line-chart-marker" x1="${point.x.toFixed(2)}" x2="${point.x.toFixed(2)}" y1="${margin.top}" y2="${margin.top + plotH}"></line>
            <text class="line-chart-axis" x="${point.x.toFixed(2)}" y="${height - 18}" text-anchor="middle">${esc(point.tahun || '-')}</text>
        `).join('');
        const dots = points.map(point => {
            const boxW = 164;
            const boxH = 46;
            const tx = point.x > width - margin.right - boxW ? point.x - boxW - 10 : point.x + 10;
            const ty = Math.max(8, point.y - boxH - 10);
            return `
                <g class="line-chart-point-group">
                    <circle class="line-chart-hit" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="9"></circle>
                    <circle class="line-chart-point yearly-chart-point" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="2.6">
                        <title>${esc(point.tahun || '-')} · ${esc(point.total_penerimaan_display || 'Rp 0')}</title>
                    </circle>
                    <g class="line-chart-tooltip">
                        <rect x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" width="${boxW}" height="${boxH}" rx="7"></rect>
                        <text x="${(tx + 9).toFixed(2)}" y="${(ty + 17).toFixed(2)}">Tahun ${esc(point.tahun || '-')}</text>
                        <text x="${(tx + 9).toFixed(2)}" y="${(ty + 33).toFixed(2)}">${esc(point.total_penerimaan_display || 'Rp 0')}</text>
                    </g>
                </g>
            `;
        }).join('');

        chartNominalTahunanPimpinan.innerHTML = `
            <svg class="yearly-chart-svg" style="width:${width}px; min-width:${width}px;" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Grafik total penerimaan per tahun">
                ${grid}
                ${yearMarkers}
                ${area ? `<path class="yearly-chart-area" d="${area}"></path>` : ''}
                <path class="line-chart-path yearly-chart-line" d="${path}"></path>
                ${dots}
            </svg>
        `;

        tabelNominalTahunanPimpinan.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Tahun</th>
                        <th>Jumlah Penerimaan</th>
                        <th>Realisasi Penerimaan</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            <td>${esc(row.tahun || '-')}</td>
                            <td>${esc(row.jumlah_penerimaan_display || '0')}</td>
                            <td>${esc(row.total_penerimaan_display || 'Rp 0')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function renderJumlahKontrakTahunan(rows = []) {
        const data = Array.isArray(rows) ? rows : [];
        if (!chartJumlahKontrakTahunanPimpinan || !tabelJumlahKontrakTahunanPimpinan) return;
        if (!data.length) {
            chartJumlahKontrakTahunanPimpinan.innerHTML = '<div class="exec-empty">Belum ada jumlah kontrak tahunan pada periode ini.</div>';
            tabelJumlahKontrakTahunanPimpinan.innerHTML = '<div class="exec-empty">Belum ada tabel jumlah kontrak tahunan.</div>';
            return;
        }

        const height = 250;
        const margin = { top: 24, right: 20, bottom: 44, left: 52 };
        const yearWidth = 84;
        const width = Math.max(460, margin.left + margin.right + (data.length * yearWidth));
        const plotW = width - margin.left - margin.right;
        const plotH = height - margin.top - margin.bottom;
        const values = data.map(row => Number(row.jumlah_kontrak) || 0);
        let maxValue = Math.max(1, ...values);
        const step = Math.max(1, Math.ceil(maxValue / 5));
        maxValue = Math.ceil(maxValue / step) * step;

        const xForIndex = i => data.length === 1
            ? margin.left + (plotW / 2)
            : margin.left + ((i / (data.length - 1)) * plotW);
        const yForValue = value => margin.top + ((maxValue - value) / maxValue) * plotH;
        const points = data.map((row, i) => ({
            ...row,
            x: xForIndex(i),
            y: yForValue(Number(row.jumlah_kontrak) || 0),
            value: Number(row.jumlah_kontrak) || 0
        }));
        const path = points.map((point, i) =>
            `${i === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        ).join(' ');
        const area = points.length > 1
            ? `${path} L ${points[points.length - 1].x.toFixed(2)} ${margin.top + plotH} L ${points[0].x.toFixed(2)} ${margin.top + plotH} Z`
            : '';
        const yTicks = Array.from({ length: Math.round(maxValue / step) + 1 }, (_, i) => i * step);
        const grid = yTicks.map(value => {
            const y = yForValue(value);
            return `
                <line class="line-chart-grid" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}"></line>
                <text class="line-chart-y-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${value.toLocaleString('id-ID')}</text>
            `;
        }).join('');
        const yearMarkers = points.map(point => `
            <line class="line-chart-marker" x1="${point.x.toFixed(2)}" x2="${point.x.toFixed(2)}" y1="${margin.top}" y2="${margin.top + plotH}"></line>
            <text class="line-chart-axis" x="${point.x.toFixed(2)}" y="${height - 18}" text-anchor="middle">${esc(point.tahun || '-')}</text>
        `).join('');
        const dots = points.map(point => {
            const boxW = 142;
            const boxH = 46;
            const tx = point.x > width - margin.right - boxW ? point.x - boxW - 10 : point.x + 10;
            const ty = Math.max(8, point.y - boxH - 10);
            const jumlahDisplay = point.jumlah_kontrak_display || point.value.toLocaleString('id-ID');
            return `
                <g class="line-chart-point-group">
                    <circle class="line-chart-hit" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="9"></circle>
                    <circle class="line-chart-point yearly-count-point" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="2.6">
                        <title>${esc(point.tahun || '-')} · ${esc(jumlahDisplay)} kontrak</title>
                    </circle>
                    <g class="line-chart-tooltip">
                        <rect x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" width="${boxW}" height="${boxH}" rx="7"></rect>
                        <text x="${(tx + 9).toFixed(2)}" y="${(ty + 17).toFixed(2)}">Tahun ${esc(point.tahun || '-')}</text>
                        <text x="${(tx + 9).toFixed(2)}" y="${(ty + 33).toFixed(2)}">${esc(jumlahDisplay)} kontrak</text>
                    </g>
                </g>
            `;
        }).join('');

        chartJumlahKontrakTahunanPimpinan.innerHTML = `
            <svg class="yearly-chart-svg" style="width:${width}px; min-width:${width}px;" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Grafik jumlah kontrak yang ditandatangani per tahun">
                ${grid}
                ${yearMarkers}
                ${area ? `<path class="yearly-count-area" d="${area}"></path>` : ''}
                <path class="line-chart-path yearly-count-line" d="${path}"></path>
                ${dots}
            </svg>
        `;

        tabelJumlahKontrakTahunanPimpinan.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Tahun</th>
                        <th>Jumlah Kontrak</th>
                        <th>Total Nominal Kontrak</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            <td>${esc(row.tahun || '-')}</td>
                            <td>${esc(row.jumlah_kontrak_display || '0')}</td>
                            <td>${esc(row.total_nominal_display || 'Rp 0')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async function loadIndikatorPimpinan() {
        if (currentUser?.role !== 'atasan') return;
        initPimpinanDefaults();
        setExecLoading();
        try {
            const params = buildPimpinanParams();
            const res = await fetch(`/pimpinan/indikator?${params.toString()}`);
            if (!res.ok) throw new Error('Gagal memuat indikator pimpinan');
            const data = await res.json();
            const general = data.general || {};

            setText(periodeLabelPimpinan, data.filter?.periode_kontrak?.rentang_display || general.periode_label || '-');
            setText(jumlahKontrakPimpinan, general.jumlah_kontrak_display || '0');
            setText(totalMitraPimpinan, general.total_mitra_display || '0');
            renderPenerimaanTahunan(general.penerimaan_tahunan || []);
            renderJumlahKontrakTahunan(general.nominal_tahunan || []);
            renderStatusKontrak(general);
            renderRelasiMitra(general);
        } catch {
            setText(periodeLabelPimpinan, 'Gagal memuat periode');
            setText(jumlahKontrakPimpinan, '0');
            setText(totalMitraPimpinan, '0');
            if (chartNominalTahunanPimpinan) chartNominalTahunanPimpinan.innerHTML = '<div class="exec-empty">Gagal memuat grafik penerimaan tahunan.</div>';
            if (tabelNominalTahunanPimpinan) tabelNominalTahunanPimpinan.innerHTML = '<div class="exec-empty">Gagal memuat tabel penerimaan tahunan.</div>';
            if (chartJumlahKontrakTahunanPimpinan) chartJumlahKontrakTahunanPimpinan.innerHTML = '<div class="exec-empty">Gagal memuat grafik jumlah kontrak tahunan.</div>';
            if (tabelJumlahKontrakTahunanPimpinan) tabelJumlahKontrakTahunanPimpinan.innerHTML = '<div class="exec-empty">Gagal memuat tabel jumlah kontrak tahunan.</div>';
            if (statusPiePimpinan) statusPiePimpinan.innerHTML = '<div class="exec-empty">Gagal memuat pie chart.</div>';
            if (statusProgramTablePimpinan) statusProgramTablePimpinan.innerHTML = '<div class="exec-empty">Gagal memuat daftar program.</div>';
            if (chartRelasiMitraPimpinan) chartRelasiMitraPimpinan.innerHTML = '<div class="exec-empty">Gagal memuat pola kerja sama mitra.</div>';
            if (tabelRelasiMitraPimpinan) tabelRelasiMitraPimpinan.innerHTML = '<div class="exec-empty">Gagal memuat tabel pola mitra.</div>';
        }
    }

    async function loadDashboardPimpinan() {
        await Promise.all([
            loadIndikatorPimpinan(),
            loadSisaAnggaran()
        ]);
    }

    // Parsing tanggal dari berbagai format (DD/MM/YYYY, ISO, atau Date.toString())
    function parseDate(str) {
        if (!str) return null;
        const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) return new Date(dmy[3], dmy[2] - 1, dmy[1]);
        const d = new Date(str);
        return isNaN(d) ? null : d;
    }

    function parseTanggalFilterValue(value) {
        const text = String(value || '').trim();
        if (!text) return null;
        const direct = parseDate(text);
        if (direct) return direct.getTime();
        const bulanMap = {
            januari: 0, jan: 0,
            februari: 1, feb: 1,
            maret: 2, mar: 2,
            april: 3, apr: 3,
            mei: 4,
            juni: 5, jun: 5,
            juli: 6, jul: 6,
            agustus: 7, agu: 7, aug: 7,
            september: 8, sep: 8,
            oktober: 9, okt: 9, oct: 9,
            november: 10, nov: 10,
            desember: 11, des: 11, dec: 11
        };
        const parts = text.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
        if (!parts || bulanMap[parts[2]] == null) return null;
        return new Date(Number(parts[3]), bulanMap[parts[2]], Number(parts[1])).getTime();
    }

    function sortFilterValues(a, b) {
        const valueA = String(a ?? '');
        const valueB = String(b ?? '');
        if (valueA === '' && valueB !== '') return 1;
        if (valueA !== '' && valueB === '') return -1;

        const dateA = parseTanggalFilterValue(valueA);
        const dateB = parseTanggalFilterValue(valueB);
        if (dateA !== null && dateB !== null) return dateA - dateB;

        const numericLike = value => /^-?\d+(?:[.,]\d+)*%?$/.test(value.trim()) || /^rp\s+/i.test(value.trim());
        if (numericLike(valueA) && numericLike(valueB)) {
            const numA = parseNominalRupiah(valueA);
            const numB = parseNominalRupiah(valueB);
            if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) return numA - numB;
        }

        return valueA.localeCompare(valueB, 'id', { numeric: true, sensitivity: 'base' });
    }

    // ---- FACTORY FILTER KOLOM (EXCEL-STYLE) ----
    function makeColFilter(sectionId, getDataFn, onFilterChange, rootSelector = '') {
        const colFilters = {};
        const getRoot = () => rootSelector ? document.querySelector(rootSelector) : document.getElementById(sectionId);
        const boundScrollContainers = new WeakSet();

        const dropdown = document.createElement('div');
        dropdown.className = 'col-filter-dropdown';
        dropdown.innerHTML = `
            <input type="text" class="col-filter-search" placeholder="Cari nilai...">
            <div class="col-filter-list"></div>
            <div class="col-filter-actions">
                <button class="col-filter-ok">OK</button>
                <button class="col-filter-reset-col">Reset Kolom</button>
            </div>
        `;
        document.body.appendChild(dropdown);

        const dropSearch = dropdown.querySelector('.col-filter-search');
        const dropList   = dropdown.querySelector('.col-filter-list');
        const dropOk     = dropdown.querySelector('.col-filter-ok');
        const dropReset  = dropdown.querySelector('.col-filter-reset-col');

        let activeColKey = null;
        let workingSet   = new Set();

        function close() {
            dropdown.style.display = 'none';
            activeColKey = null;
        }

        function renderList(q) {
            const colKey  = activeColKey;
            const allVals = [...new Set(getDataFn().map(d => String(d[colKey] ?? '')))].sort(sortFilterValues);
            const visible     = q ? allVals.filter(v => v.toLowerCase().includes(q.toLowerCase())) : allVals;
            const allChecked  = visible.length > 0 && visible.every(v => workingSet.has(v));
            const someChecked = visible.some(v => workingSet.has(v));

            dropList.innerHTML = `
                <label class="col-filter-item col-filter-selectall">
                    <input type="checkbox">
                    <span><em>Pilih Semua</em></span>
                </label>
                ${visible.map(v => `
                    <label class="col-filter-item">
                        <input type="checkbox" data-val="${esc(v)}" ${workingSet.has(v) ? 'checked' : ''}>
                        <span>${v === '' ? '<em style="color:#a0aec0">(kosong)</em>' : esc(v)}</span>
                    </label>
                `).join('')}
            `;

            const saChk = dropList.querySelector('.col-filter-selectall input');
            saChk.checked       = allChecked;
            saChk.indeterminate = someChecked && !allChecked;

            saChk.addEventListener('change', () => {
                visible.forEach(v => saChk.checked ? workingSet.add(v) : workingSet.delete(v));
                renderList(dropSearch.value);
            });
            dropList.querySelectorAll('input[data-val]').forEach(chk => {
                chk.addEventListener('change', () => {
                    if (chk.checked) workingSet.add(chk.dataset.val);
                    else workingSet.delete(chk.dataset.val);
                    const allNow  = visible.every(v => workingSet.has(v));
                    const someNow = visible.some(v => workingSet.has(v));
                    saChk.checked       = allNow;
                    saChk.indeterminate = someNow && !allNow;
                });
            });
        }

        function open(th, colKey) {
            if (activeColKey === colKey && dropdown.style.display !== 'none') { close(); return; }
            activeColKey = colKey;
            const allVals = [...new Set(getDataFn().map(d => String(d[colKey] ?? '')))];
            workingSet    = colFilters[colKey] ? new Set(colFilters[colKey]) : new Set(allVals);
            dropSearch.value = '';
            renderList('');
            dropSearch.oninput = () => renderList(dropSearch.value);

            const rect = th.getBoundingClientRect();
            let left   = rect.left;
            if (left + 230 > window.innerWidth - 8) left = window.innerWidth - 238;
            dropdown.style.left    = left + 'px';
            dropdown.style.top     = (rect.bottom + 4) + 'px';
            dropdown.style.display = 'block';
            dropSearch.focus();
        }

        function updateIndicators() {
            const root = getRoot();
            root?.querySelectorAll('th[data-col]').forEach(th => {
                th.classList.toggle('col-filter-active', !!colFilters[th.dataset.col]);
            });
        }

        dropOk.addEventListener('click', () => {
            if (!activeColKey) return;
            const colKey  = activeColKey;
            const allVals = new Set(getDataFn().map(d => String(d[colKey] ?? '')));
            if (coversAllVals(workingSet, allVals)) delete colFilters[colKey];
            else colFilters[colKey] = new Set(workingSet);
            updateIndicators();
            onFilterChange();
            close();
        });

        dropReset.addEventListener('click', () => {
            if (!activeColKey) return;
            delete colFilters[activeColKey];
            updateIndicators();
            onFilterChange();
            close();
        });

        document.addEventListener('click', e => {
            if (dropdown.style.display === 'none') return;
            if (!dropdown.contains(e.target) && !e.target.classList.contains('th-filter-btn')) close();
        }, true);

        function bindScrollClose() {
            const root = getRoot();
            root?.querySelectorAll('.table-container').forEach(container => {
                if (boundScrollContainers.has(container)) return;
                container.addEventListener('scroll', close);
                boundScrollContainers.add(container);
            });
        }
        bindScrollClose();

        return {
            colFilters,
            updateIndicators,
            initBtns() {
                const root = getRoot();
                root?.querySelectorAll('th[data-col]').forEach(th => {
                    if (th.querySelector('.th-filter-btn')) return;
                    const btn = document.createElement('button');
                    btn.className = 'th-filter-btn';
                    btn.title     = 'Filter kolom';
                    btn.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .39.812L9 8.292V13.5a.5.5 0 0 1-.244.43l-3 1.75A.5.5 0 0 1 5 15.25V8.292L1.61 1.812A.5.5 0 0 1 1.5 1.5z"/></svg>';
                    btn.addEventListener('click', e => { e.stopPropagation(); open(th, th.dataset.col); });
                    th.appendChild(btn);
                });
                bindScrollClose();
            },
            clearAll() {
                Object.keys(colFilters).forEach(k => delete colFilters[k]);
                updateIndicators();
            },
            applyTo(data) {
                return data.filter(item => {
                    for (const [col, vals] of Object.entries(colFilters)) {
                        if (!vals.has(String(item[col] ?? ''))) return false;
                    }
                    return true;
                });
            }
        };
    }

    function coversAllVals(ws, allVals) {
        return ws.size >= allVals.size && [...allVals].every(v => ws.has(v));
    }

    function muatSimpananPlottingKerma() {
        try {
            const raw = localStorage.getItem('kerma.plottingKerma.v1');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function normalisasiListLevelBatasan(value) {
        if (Array.isArray(value)) {
            return value.map(normalisasiLevelJabatan).filter(Boolean);
        }
        return String(value || '')
            .split(/[\n,;]+/)
            .map(normalisasiLevelJabatan)
            .filter(Boolean);
    }

    function normalisasiBatasanNonaktif(value = []) {
        if (!Array.isArray(value)) return [];
        return [...new Set(value.map(item => String(item || '').trim()).filter(Boolean))];
    }

    function isBatasanNonaktifPada(batasan, id) {
        return Array.isArray(batasan?.batasanNonaktif) && batasan.batasanNonaktif.includes(id);
    }

    function normalisasiBatasanLevelJabatan(rawRules = [], batasanNonaktif = []) {
        const rawList = Array.isArray(rawRules) ? rawRules : [];
        const nonaktif = new Set(batasanNonaktif);
        const savedMap = new Map(rawList
            .filter(rule => rule && typeof rule === 'object' && rule.id)
            .map(rule => [String(rule.id), rule]));
        const defaultIds = new Set(batasanSimulasiDefault.levelJabatanRules.map(rule => rule.id));
        const defaultRules = batasanSimulasiDefault.levelJabatanRules.filter(defaultRule => !nonaktif.has(defaultRule.id)).map(defaultRule => {
            const saved = savedMap.get(defaultRule.id) || {};
            const levels = saved.levels !== undefined
                ? normalisasiListLevelBatasan(saved.levels)
                : [...defaultRule.levels];
            const roles = Array.isArray(saved.roles)
                ? saved.roles.filter(role => rolePlottingKerma.includes(role))
                : [...defaultRule.roles];
            return {
                id: defaultRule.id,
                nama: defaultRule.nama,
                levels,
                roles,
                custom: false
            };
        });
        const customRules = rawList
            .filter(rule => rule && typeof rule === 'object' && rule.id && !defaultIds.has(String(rule.id)) && !nonaktif.has(String(rule.id)))
            .map((rule, index) => {
                const levels = normalisasiListLevelBatasan(rule.levels);
                const roles = Array.isArray(rule.roles)
                    ? rule.roles.filter(role => rolePlottingKerma.includes(role))
                    : [];
                const nama = normalisasiLevelJabatan(rule.nama || levels[0] || `Batasan tambahan ${index + 1}`) || `Batasan tambahan ${index + 1}`;
                return {
                    id: String(rule.id),
                    nama,
                    levels,
                    roles,
                    custom: true
                };
            });
        return [...defaultRules, ...customRules];
    }

    function normalisasiBatasanUmum(rawRules = []) {
        if (!Array.isArray(rawRules)) return [];
        return rawRules
            .filter(rule => rule && typeof rule === 'object' && rule.id)
            .map((rule, index) => ({
                id: String(rule.id),
                nama: String(rule.nama || `Batasan tambahan ${index + 1}`).trim() || `Batasan tambahan ${index + 1}`,
                pengaturan: String(rule.pengaturan || '').trim(),
                dampak: String(rule.dampak || '').trim(),
                custom: true
            }));
    }

    function normalisasiBatasanSimulasi(raw = {}) {
        const sumber = raw && typeof raw === 'object' ? raw : {};
        const batasanNonaktif = normalisasiBatasanNonaktif(sumber.batasanNonaktif);
        const roleStaf = Array.isArray(sumber.roleStaf)
            ? sumber.roleStaf.filter(role => rolePlottingKerma.includes(role))
            : [...batasanSimulasiDefault.roleStaf];
        const roleDosen = Array.isArray(sumber.roleDosen)
            ? sumber.roleDosen.filter(role => rolePlottingKerma.includes(role))
            : [...batasanSimulasiDefault.roleDosen];
        const batasSelisihAtas = sumber.batasSelisihAtas ?? batasanSimulasiDefault.batasSelisihAtas;
        const batasSelisihBawah = sumber.batasSelisihBawah ?? batasanSimulasiDefault.batasSelisihBawah;
        return {
            batasSelisihAtas: Math.max(0, parseNominalRupiah(batasSelisihAtas)),
            batasSelisihBawah: Math.max(0, parseNominalRupiah(batasSelisihBawah)),
            dosenTidakBolehMinus: sumber.dosenTidakBolehMinus !== false,
            stafTidakBolehMinus: sumber.stafTidakBolehMinus !== undefined
                ? sumber.stafTidakBolehMinus !== false
                : true,
            roleDosen,
            roleStaf,
            prioritasDosenTargetTerbesar: sumber.prioritasDosenTargetTerbesar !== false,
            prioritasStafTargetTerbesar: sumber.prioritasStafTargetTerbesar !== false,
            batasiPksDitetapkan: sumber.batasiPksDitetapkan !== false,
            posisiKosongBolehTersisa: sumber.posisiKosongBolehTersisa !== false,
            dosenGunakanSlotKosong: sumber.dosenGunakanSlotKosong !== false,
            batasanNonaktif,
            batasanUmumRules: normalisasiBatasanUmum(sumber.batasanUmumRules),
            levelJabatanRules: normalisasiBatasanLevelJabatan(sumber.levelJabatanRules, batasanNonaktif)
        };
    }

    function getBatasanSimulasi() {
        return batasanSimulasiPlotting;
    }

    function isBatasanSimulasiAktif(id) {
        return !isBatasanNonaktifPada(getBatasanSimulasi(), id);
    }

    function nilaiBatasSelisihAtasAktif(batasan = getBatasanSimulasi()) {
        return isBatasanNonaktifPada(batasan, 'batasSelisihAtas')
            ? Number.POSITIVE_INFINITY
            : Math.max(0, parseNominalRupiah(batasan.batasSelisihAtas));
    }

    function nilaiBatasSelisihBawahAktif(batasan = getBatasanSimulasi()) {
        return isBatasanNonaktifPada(batasan, 'batasSelisihBawah')
            ? Number.POSITIVE_INFINITY
            : Math.max(0, parseNominalRupiah(batasan.batasSelisihBawah));
    }

    function setBatasanSimulasi(next = {}) {
        batasanSimulasiPlotting = normalisasiBatasanSimulasi({
            ...batasanSimulasiPlotting,
            ...next
        });
        batasSelisihDistribusi = nilaiBatasSelisihAtasAktif(batasanSimulasiPlotting);
        batasSelisihBawahDistribusi = nilaiBatasSelisihBawahAktif(batasanSimulasiPlotting);
    }

    function pecahJabatanSbm(value, fallbackSecond = '') {
        const utama = String(value || '').trim();
        const keduaEksisting = String(fallbackSecond || '').trim();
        if (!utama) return { jabatan_sbm: '', jabatan_sbm_2: keduaEksisting };
        if (keduaEksisting) return { jabatan_sbm: utama, jabatan_sbm_2: keduaEksisting };

        const parts = utama
            .split(/\s*\|\|\s*/)
            .map(part => part.trim())
            .filter(Boolean);

        if (parts.length <= 1) return { jabatan_sbm: utama, jabatan_sbm_2: '' };
        return {
            jabatan_sbm: parts[0],
            jabatan_sbm_2: parts.slice(1).join('; ')
        };
    }

    function normalisasiRowPlotting(row = {}) {
        const pks = row.pks && typeof row.pks === 'object' ? row.pks : {};
        const distribusi_roles = row.distribusi_roles && typeof row.distribusi_roles === 'object' ? row.distribusi_roles : {};
        const jabatan = pecahJabatanSbm(row.jabatan_sbm, row.jabatan_sbm_2);
        const levelLegacy = String(row.level_jabatan || '').split('/').map(item => item.trim()).filter(Boolean);
        const rowNormal = {
            ...row,
            jabatan_sbm: normalisasiNamaJabatan(jabatan.jabatan_sbm),
            jabatan_sbm_2: normalisasiNamaJabatan(jabatan.jabatan_sbm_2)
        };
        return {
            nama: rowNormal.nama || '',
            peran: row.peran === 'Staf' ? 'Staf' : 'Dosen',
            status: statusDistribusiPlotting.includes(row.status) ? row.status : 'Aktif',
            jabatan_sbm: rowNormal.jabatan_sbm || '',
            jabatan_sbm_2: rowNormal.jabatan_sbm_2 || '',
            level_jabatan_1: row.level_jabatan_1 || levelLegacy[0] || '',
            level_jabatan_2: row.level_jabatan_2 || levelLegacy[1] || '',
            target_kerma: String(row.target_kerma ?? '0'),
            keterangan: row.keterangan || '',
            pks,
            distribusi_roles
        };
    }

    function simpanPlottingKerma() {
        const payload = snapshotPlottingKerma();
        try {
            localStorage.setItem(STORAGE_PLOTTING_KERMA, JSON.stringify(payload));
        } catch {
            // localStorage bisa tidak tersedia pada mode private; data sesi tetap berjalan.
        }
        jadwalkanSinkronPlottingKerma();
    }

    function angkaDesimalPlotting(value) {
        const normalized = String(value ?? '').replace(/[^\d,.-]/g, '').replace(',', '.');
        return Number(normalized) || 0;
    }

    function tarifPlotting(value) {
        if (value === null || value === undefined || value === '') return 0;
        const teks = String(value).toLowerCase();
        if (/\b(jt|juta)\b/.test(teks) || teks.includes('juta')) {
            const match = teks.replace(/\./g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
            return match ? Math.round(Number(match[0]) * 1000000) : 0;
        }
        return parseNominalRupiah(value) || Number(value) || 0;
    }

    function pastikanRowsPerhitunganDasarPlotting() {
        const existingRows = new Map((perhitunganDasarPlotting.rows || []).map(row => [row.jabatan, row]));
        perhitunganDasarPlotting.rows = rolePlottingKerma.map(role => {
            const existing = existingRows.get(role) || {};
            return {
                jabatan: role,
                tarif: existing.tarif ?? tarifMasterJabatanPlotting[role] ?? 0,
                durasi: existing.durasi ?? '',
                personil_per_kerma: existing.personil_per_kerma ?? 1
            };
        });
    }

    function normalisasiPeriodePengelolaKerma(raw = {}) {
        return {
            awal: /^\d{4}-\d{2}$/.test(String(raw?.awal || '')) ? String(raw.awal) : '',
            akhir: /^\d{4}-\d{2}$/.test(String(raw?.akhir || '')) ? String(raw.akhir) : ''
        };
    }

    function parseBulanPeriode(value) {
        const match = String(value || '').match(/^(\d{4})-(\d{2})$/);
        if (!match) return null;
        const tahun = Number(match[1]);
        const bulan = Number(match[2]);
        if (!Number.isInteger(tahun) || !Number.isInteger(bulan) || bulan < 1 || bulan > 12) return null;
        return { tahun, bulan };
    }

    function hitungDurasiPeriodePengelolaKerma() {
        const awal = parseBulanPeriode(periodePengelolaKerma.awal);
        const akhir = parseBulanPeriode(periodePengelolaKerma.akhir);
        if (!awal || !akhir) return 0;
        const durasi = ((akhir.tahun - awal.tahun) * 12) + (akhir.bulan - awal.bulan) + 1;
        return durasi > 0 ? durasi : 0;
    }

    function labelBulanPanjang(indexBulan) {
        const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return bulan[indexBulan - 1] || '';
    }

    function formatLabelPeriodePengelolaKerma() {
        const awal = parseBulanPeriode(periodePengelolaKerma.awal);
        const akhir = parseBulanPeriode(periodePengelolaKerma.akhir);
        if (!awal && !akhir) return 'Pilih periode Tim Pengelola Kerma';
        if (!awal || !akhir) return 'Lengkapi periode awal dan akhir';
        if (hitungDurasiPeriodePengelolaKerma() <= 0) return 'Periode akhir harus setelah periode awal';
        if (awal.tahun === akhir.tahun && awal.bulan === akhir.bulan) {
            return `Tim Pengelola Kerma periode ${labelBulanPanjang(awal.bulan)} ${awal.tahun}`;
        }
        if (awal.tahun === akhir.tahun) {
            return `Tim Pengelola Kerma periode ${labelBulanPanjang(awal.bulan)} - ${labelBulanPanjang(akhir.bulan)} ${awal.tahun}`;
        }
        return `Tim Pengelola Kerma periode ${labelBulanPanjang(awal.bulan)} ${awal.tahun} - ${labelBulanPanjang(akhir.bulan)} ${akhir.tahun}`;
    }

    function sinkronDurasiDariPeriodePengelola() {
        pastikanRowsPerhitunganDasarPlotting();
        const durasi = hitungDurasiPeriodePengelolaKerma();
        perhitunganDasarPlotting.rows.forEach(row => {
            row.durasi = durasi > 0 ? String(durasi) : '';
        });
        return durasi;
    }

    function updateTampilanPeriodePengelola() {
        if (periodePengelolaAwal && periodePengelolaAwal.value !== periodePengelolaKerma.awal) periodePengelolaAwal.value = periodePengelolaKerma.awal;
        if (periodePengelolaAkhir && periodePengelolaAkhir.value !== periodePengelolaKerma.akhir) periodePengelolaAkhir.value = periodePengelolaKerma.akhir;
        if (!labelPeriodePengelolaKerma) return;
        const durasi = hitungDurasiPeriodePengelolaKerma();
        labelPeriodePengelolaKerma.textContent = formatLabelPeriodePengelolaKerma();
        labelPeriodePengelolaKerma.classList.toggle('is-warning', Boolean(periodePengelolaKerma.awal || periodePengelolaKerma.akhir) && durasi <= 0);
    }

    function syncPeriodePengelolaKerma() {
        periodePengelolaKerma = normalisasiPeriodePengelolaKerma({
            awal: periodePengelolaAwal?.value || '',
            akhir: periodePengelolaAkhir?.value || ''
        });
        sinkronDurasiDariPeriodePengelola();
        tandaiPerhitunganDasarBerubah();
        renderPerhitunganDasarPlotting();
        updateSemuaTargetDistribusiRows();
    }

    function hitungJumlahOrangJabatan(row) {
        return angkaDesimalPlotting(row.personil_per_kerma) * hitungPksDitetapkanPlotting();
    }

    function hitungTotalPosisiTersediaPlotting() {
        pastikanRowsPerhitunganDasarPlotting();
        return perhitunganDasarPlotting.rows.reduce((sum, row) => sum + hitungJumlahOrangJabatan(row), 0);
    }

    function hitungTotalPengelolaKermaPlotting() {
        return plottingKermaRows.filter(row => row.status === 'Aktif' && hitungTargetDistribusiRow(row) > 0).length;
    }

    function hitungTotalRupiahJabatan(row) {
        return tarifPlotting(row.tarif) * angkaDesimalPlotting(row.durasi) * angkaDesimalPlotting(row.personil_per_kerma);
    }

    function hitungTotalPerKermaPlotting() {
        sinkronDurasiDariPeriodePengelola();
        return perhitunganDasarPlotting.rows.reduce((sum, row) => sum + hitungTotalRupiahJabatan(row), 0);
    }

    function hitungTargetDistribusiRow(row) {
        return row?.status === 'Aktif' ? tarifPlotting(row.target_kerma) : 0;
    }

    function pastikanDistribusiRoles(row) {
        if (!row.distribusi_roles || typeof row.distribusi_roles !== 'object') row.distribusi_roles = {};
        rolePlottingKerma.forEach(role => {
            if (row.distribusi_roles[role] === undefined || row.distribusi_roles[role] === null) row.distribusi_roles[role] = '';
        });
        rapihkanBatasStafDistribusi(row);
        rapihkanBatasDosenDistribusi(row);
        return row.distribusi_roles;
    }

    function isRoleDosenDistribusi(role) {
        return !isBatasanSimulasiAktif('roleDosen') || getBatasanSimulasi().roleDosen.includes(role);
    }

    function isRoleStafDistribusi(role) {
        return !isBatasanSimulasiAktif('roleStaf') || getBatasanSimulasi().roleStaf.includes(role);
    }

    function isRoleBolehDistribusi(row, role) {
        return isStafDistribusi(row) ? isRoleStafDistribusi(role) : isRoleDosenDistribusi(role);
    }

    function labelRoleBolehDistribusi(row) {
        const roles = isStafDistribusi(row)
            ? (isBatasanSimulasiAktif('roleStaf') ? getBatasanSimulasi().roleStaf : rolePlottingKerma)
            : (isBatasanSimulasiAktif('roleDosen') ? getBatasanSimulasi().roleDosen : rolePlottingKerma);
        if (!roles.length) return 'Belum ada role yang diperbolehkan.';
        return roles.map(role => labelJabatanPlotting(role)).join(', ');
    }

    function hitungBulanRoleDistribusi(value, role) {
        const { durasi } = getKonfigurasiRoleDistribusi(role);
        return hitungBulanDibayarDistribusi(value, durasi);
    }

    function rapihkanBatasStafDistribusi(row, preferRole = '') {
        if (!isStafDistribusi(row) || !row.distribusi_roles) return;
        const roles = row.distribusi_roles;
        rolePlottingKerma.forEach(role => {
            if (!isRoleStafDistribusi(role)) roles[role] = '';
        });

        const roleStafAktif = isBatasanSimulasiAktif('roleStaf') ? getBatasanSimulasi().roleStaf : rolePlottingKerma;
        const kandidatTerisi = roleStafAktif.filter(role => hitungBulanRoleDistribusi(roles[role], role) > 0);
        const preferValid = isRoleStafDistribusi(preferRole) && hitungBulanRoleDistribusi(roles[preferRole], preferRole) > 0;
        const urutanRole = [
            ...(preferValid ? [preferRole] : []),
            ...kandidatTerisi.filter(role => role !== preferRole)
        ];
        roleStafAktif.forEach(role => {
            if (!urutanRole.includes(role)) roles[role] = '';
        });
        urutanRole.forEach(role => {
            roles[role] = normalisasiNilaiDistribusiRole(roles[role], role);
        });
    }

    function rapihkanBatasDosenDistribusi(row) {
        if (!isDosenDistribusi(row) || !row.distribusi_roles) return;
        const roles = row.distribusi_roles;
        rolePlottingKerma.forEach(role => {
            if (!isRoleDosenDistribusi(role)) roles[role] = '';
        });
    }

    function hitungRealisasiDistribusiRow(row) {
        const roles = pastikanDistribusiRoles(row);
        return rolePlottingKerma.reduce((sum, role) => {
            const rowJabatan = perhitunganDasarPlotting.rows.find(item => item.jabatan === role) || {};
            const tarif = tarifPlotting(tarifMasterJabatanPlotting[role]);
            const durasi = angkaDesimalPlotting(rowJabatan.durasi);
            const bulanDibayar = hitungBulanDibayarDistribusi(roles[role], durasi);
            return sum + (tarif * bulanDibayar);
        }, 0);
    }

    function hitungBulanDibayarDistribusi(value, durasi) {
        const teks = String(value ?? '').trim();
        if (!teks) return 0;
        const normalized = teks.replace(/[()]/g, '').replace(/＋/g, '+');
        const terms = normalized.split('+').map(term => term.trim()).filter(Boolean);
        if (terms.length > 1) {
            return terms.reduce((sum, term) => sum + hitungTermBulanDistribusi(term, durasi), 0);
        }
        return hitungTermBulanDistribusi(normalized, durasi);
    }

    function hitungTermBulanDistribusi(term, durasi) {
        const terminMatch = String(term || '').match(/^(-?\d+(?:[,.]\d+)?)\s*\/\s*(-?\d+(?:[,.]\d+)?)$/);
        if (terminMatch) return Math.max(0, angkaDesimalPlotting(terminMatch[1]));
        return Math.max(0, durasi * angkaDesimalPlotting(term));
    }

    function getKonfigurasiRoleDistribusi(role) {
        const rowJabatan = perhitunganDasarPlotting.rows.find(item => item.jabatan === role) || {};
        return {
            durasi: angkaDesimalPlotting(rowJabatan.durasi),
            personilPerKerma: Math.max(1, Math.floor(angkaDesimalPlotting(rowJabatan.personil_per_kerma) || 1))
        };
    }

    function hitungSlotPksDistribusi(value, role) {
        const { durasi } = getKonfigurasiRoleDistribusi(role);
        const bulanDibayar = hitungBulanDibayarDistribusi(value, durasi);
        if (bulanDibayar <= 0) return 0;
        if (durasi <= 0) return Math.ceil(bulanDibayar);
        return Math.ceil(bulanDibayar / durasi);
    }

    function hitungSlotPksDariBulan(months, role) {
        const { durasi } = getKonfigurasiRoleDistribusi(role);
        const bulan = Math.max(0, Number(months) || 0);
        if (bulan <= 0) return 0;
        if (durasi <= 0) return Math.ceil(bulan);
        return Math.ceil(bulan / durasi);
    }

    function hitungKebutuhanPksBerdasarkanDistribusi() {
        pastikanRowsPerhitunganDasarPlotting();
        const totalSlotPerRole = Object.fromEntries(rolePlottingKerma.map(role => [role, 0]));
        let maxSlotPerPegawai = 0;
        let hasDistribusi = false;

        plottingKermaRows.forEach(row => {
            if (row.status !== 'Aktif') return;
            const roles = pastikanDistribusiRoles(row);
            const slotPegawai = rolePlottingKerma.reduce((sum, role) => {
                const slots = hitungSlotPksDistribusi(roles[role], role);
                if (slots > 0) hasDistribusi = true;
                totalSlotPerRole[role] += slots;
                return sum + slots;
            }, 0);
            maxSlotPerPegawai = Math.max(maxSlotPerPegawai, slotPegawai);
        });

        const kebutuhanPerRole = rolePlottingKerma.reduce((max, role) => {
            const { personilPerKerma } = getKonfigurasiRoleDistribusi(role);
            return Math.max(max, Math.ceil(totalSlotPerRole[role] / personilPerKerma));
        }, 0);

        return {
            hasDistribusi,
            jumlah: Math.max(maxSlotPerPegawai, kebutuhanPerRole),
            maxSlotPerPegawai,
            kebutuhanPerRole,
            totalSlotPerRole
        };
    }

    function formatPlaceholderDistribusiRole(role) {
        const rowJabatan = perhitunganDasarPlotting.rows.find(item => item.jabatan === role) || {};
        const durasi = angkaDesimalPlotting(rowJabatan.durasi);
        const durasiLabel = durasi.toLocaleString('id-ID', { maximumFractionDigits: 2 });
        return durasi > 0 ? `1 / (4/${durasiLabel})` : '1 / (bulan/durasi)';
    }

    function getItemSimulasiDistribusi() {
        pastikanRowsPerhitunganDasarPlotting();
        return rolePlottingKerma
            .map(role => {
                const rowJabatan = perhitunganDasarPlotting.rows.find(item => item.jabatan === role) || {};
                return {
                    role,
                    tarif: Math.round(tarifPlotting(tarifMasterJabatanPlotting[role])),
                    durasi: angkaDesimalPlotting(rowJabatan.durasi)
                };
            })
            .filter(item => item.tarif > 0 && item.durasi > 0);
    }

    function levelMulaiDengan(level, prefix) {
        const teks = normalisasiLevelJabatan(level).toLowerCase();
        const pref = normalisasiLevelJabatan(prefix).toLowerCase();
        return teks === pref || teks.startsWith(`${pref} `);
    }

    function inferLevelJabatanDariTeks(value) {
        const teks = normalisasiNamaJabatan(value);
        if (!teks) return '';
        return [...urutanLevelJabatanSbm]
            .sort((a, b) => b.length - a.length)
            .find(level => levelMulaiDengan(teks, level)) || '';
    }

    function ambilLevelSimulasiDistribusi(row) {
        const values = [
            getLevelJabatanMaster(row.jabatan_sbm),
            getLevelJabatanMaster(row.jabatan_sbm_2),
            inferLevelJabatanDariTeks(row.jabatan_sbm),
            inferLevelJabatanDariTeks(row.jabatan_sbm_2)
        ].map(normalisasiLevelJabatan).filter(Boolean);
        const unik = [...new Map(values.map(value => [value.toLowerCase(), value])).values()];
        return unik.sort((a, b) => rankLevelJabatan(a) - rankLevelJabatan(b));
    }

    function aturanSimulasiDariLevel(level) {
        const normalized = normalisasiLevelJabatan(level);
        if (!normalized) return null;
        let match = null;
        getBatasanSimulasi().levelJabatanRules
            .filter(item => item.id !== 'dosenTanpaLevel')
            .forEach((rule, ruleIndex) => {
                rule.levels.forEach(ruleLevel => {
                    if (!levelMulaiDengan(normalized, ruleLevel)) return;
                    const score = normalisasiLevelJabatan(ruleLevel).length;
                    if (!match || score > match.score || (score === match.score && ruleIndex < match.ruleIndex)) {
                        match = { rule, score, ruleIndex };
                    }
                });
            });
        return match ? { nama: match.rule.nama, roles: [...match.rule.roles] } : null;
    }

    function isStafDistribusi(row) {
        return row?.peran === 'Staf';
    }

    function isDosenDistribusi(row) {
        return !isStafDistribusi(row);
    }

    function getBatasSlotPegawaiDistribusi(row, batasKebutuhanPks) {
        const batasUmum = Math.max(0, Math.round(Number(batasKebutuhanPks) || 0));
        if (!isStafDistribusi(row)) return batasUmum;
        const batasStaf = getMaksimumSlotStafDariBatasanUmum();
        return Number.isFinite(batasStaf) ? Math.min(batasUmum, batasStaf) : batasUmum;
    }

    function ambilAngkaBatasanTeks(teks) {
        const raw = String(teks || '').toLowerCase();
        const match = raw.match(/(\d+(?:[,.]\d+)?)/);
        if (!match) return null;
        return Math.max(0, Math.floor(angkaDesimalPlotting(match[1])));
    }

    function ambilAngkaAtauKataBatasanTeks(teks) {
        const angka = ambilAngkaBatasanTeks(teks);
        if (angka !== null) return angka;
        const raw = String(teks || '').toLowerCase();
        const angkaKata = {
            nol: 0,
            satu: 1,
            seorang: 1,
            dua: 2,
            tiga: 3,
            empat: 4,
            lima: 5,
            enam: 6,
            tujuh: 7,
            delapan: 8,
            sembilan: 9,
            sepuluh: 10
        };
        const kata = Object.keys(angkaKata).find(item => new RegExp(`\\b${item}\\b`).test(raw));
        return kata ? angkaKata[kata] : null;
    }

    function teksBatasanUmum(rule = {}) {
        return `${rule.nama || ''} ${rule.pengaturan || ''} ${rule.dampak || ''}`.toLowerCase();
    }

    function analisisBatasanUmum(rule = {}) {
        const teks = teksBatasanUmum(rule);
        if (!teks.trim()) {
            return { tipe: 'empty', aktif: false, label: 'Belum diisi' };
        }
        const angka = ambilAngkaAtauKataBatasanTeks(teks);
        const terkaitStaf = /\bstaf\b/.test(teks);
        const terkaitDosen = /\bdosen\b/.test(teks);
        const terkaitMaksimum = /(maksimum|maksimal|max|batas|hanya|boleh|limit|tidak boleh lebih|paling banyak)/.test(teks);
        const terkaitSlot = /(posisi|slot|pks|kerma|jabatan|penugasan|tugas|alokasi)/.test(teks);
        const terkaitNaikLevel = /(naik|kelonggaran|fleksibilitas|cadangan|lebih tinggi).{0,36}\blevel\b|\blevel\b.{0,36}(naik|kelonggaran|fleksibilitas|cadangan|lebih tinggi)/.test(teks);
        const terkaitSlotKosong = /(slot|posisi).{0,24}kosong|kosong.{0,24}(slot|posisi)/.test(teks);
        const terkaitAlokasiDosen = /(alokasi|dialokasikan|mengurangi|kurangi|pakai|gunakan|menggunakan|tersedia|available)/.test(teks);
        if (terkaitStaf && terkaitMaksimum && terkaitSlot && angka !== null) {
            return {
                tipe: 'maksSlotStaf',
                aktif: true,
                nilai: angka,
                label: `Terbaca sistem: Staf maksimal ${angka.toLocaleString('id-ID')} posisi`
            };
        }
        if (terkaitDosen && terkaitNaikLevel) {
            const nilai = angka === null ? 1 : angka;
            return {
                tipe: 'naikLevelDosen',
                aktif: true,
                nilai,
                label: `Terbaca sistem: Dosen boleh naik ${nilai.toLocaleString('id-ID')} level`
            };
        }
        if (terkaitDosen && terkaitSlotKosong && terkaitAlokasiDosen) {
            return {
                tipe: 'slotKosongDosen',
                aktif: true,
                nilai: true,
                label: 'Terbaca sistem: Dosen dapat memakai slot kosong'
            };
        }
        return {
            tipe: 'catatan',
            aktif: false,
            label: 'Belum memengaruhi simulasi'
        };
    }

    function getBatasanUmumTidakTerbaca() {
        const batasan = getBatasanSimulasi();
        const rules = Array.isArray(batasan.batasanUmumRules) ? batasan.batasanUmumRules : [];
        return rules.filter(rule => {
            const analisis = analisisBatasanUmum(rule);
            return analisis.tipe === 'catatan' && teksBatasanUmum(rule).trim();
        });
    }

    function getMaksimumSlotStafDariBatasanUmum() {
        const batasan = getBatasanSimulasi();
        const rules = Array.isArray(batasan.batasanUmumRules) ? batasan.batasanUmumRules : [];
        let batas = Number.POSITIVE_INFINITY;
        rules.forEach(rule => {
            const analisis = analisisBatasanUmum(rule);
            if (analisis.tipe !== 'maksSlotStaf' || !Number.isFinite(analisis.nilai)) return;
            batas = Math.min(batas, analisis.nilai);
        });
        return batas;
    }

    function getKelonggaranNaikLevelDosen() {
        const batasan = getBatasanSimulasi();
        const rules = Array.isArray(batasan.batasanUmumRules) ? batasan.batasanUmumRules : [];
        let batas = 0;
        rules.forEach(rule => {
            const analisis = analisisBatasanUmum(rule);
            if (analisis.tipe !== 'naikLevelDosen' || !Number.isFinite(analisis.nilai)) return;
            batas = Math.max(batas, analisis.nilai);
        });
        return batas;
    }

    function getRoleCadanganNaikLevelDosen(rolesUtama = []) {
        const kelonggaran = getKelonggaranNaikLevelDosen();
        if (kelonggaran <= 0 || !rolesUtama.length) return [];
        const roleDosen = isBatasanSimulasiAktif('roleDosen') ? getBatasanSimulasi().roleDosen : rolePlottingKerma;
        const roleSet = new Set(rolesUtama);
        const rankTertinggiUtama = rolesUtama.reduce((min, role) => {
            const rank = rolePlottingKerma.indexOf(role);
            return rank >= 0 ? Math.min(min, rank) : min;
        }, rolePlottingKerma.length - 1);
        const batasRank = Math.max(0, rankTertinggiUtama - kelonggaran);
        return rolePlottingKerma.filter(role => {
            const rank = rolePlottingKerma.indexOf(role);
            return roleDosen.includes(role) && !roleSet.has(role) && rank >= batasRank && rank < rankTertinggiUtama;
        });
    }

    function isAlokasiDosenSlotKosongAktif() {
        if (isBatasanSimulasiAktif('dosenGunakanSlotKosong') && getBatasanSimulasi().dosenGunakanSlotKosong) return true;
        const batasan = getBatasanSimulasi();
        const rules = Array.isArray(batasan.batasanUmumRules) ? batasan.batasanUmumRules : [];
        return rules.some(rule => analisisBatasanUmum(rule).tipe === 'slotKosongDosen');
    }

    function bandingkanPrioritasSimulasiDistribusi(a, b) {
        const aStaf = isStafDistribusi(a.row);
        const bStaf = isStafDistribusi(b.row);
        if (aStaf !== bStaf) return aStaf ? 1 : -1;
        const prioritaskanTarget = aStaf
            ? (isBatasanSimulasiAktif('prioritasStafTargetTerbesar') && getBatasanSimulasi().prioritasStafTargetTerbesar)
            : (isBatasanSimulasiAktif('prioritasDosenTargetTerbesar') && getBatasanSimulasi().prioritasDosenTargetTerbesar);
        if (prioritaskanTarget) {
            const targetDiff = (b.state?.target || 0) - (a.state?.target || 0);
            if (targetDiff) return targetDiff;
        }
        return (a.rowIndex || 0) - (b.rowIndex || 0);
    }

    function aturanSimulasiTanpaLevel(row) {
        if (row?.peran === 'Staf') {
            return {
                nama: 'Staf tanpa level',
                roles: [...(isBatasanSimulasiAktif('roleStaf') ? getBatasanSimulasi().roleStaf : rolePlottingKerma)]
            };
        }
        const fallbackRule = getBatasanSimulasi().levelJabatanRules.find(rule => rule.id === 'dosenTanpaLevel');
        return {
            nama: fallbackRule?.nama || 'Dosen tanpa level',
            roles: [...(fallbackRule?.roles?.length ? fallbackRule.roles : (isBatasanSimulasiAktif('roleDosen') ? getBatasanSimulasi().roleDosen : rolePlottingKerma))]
        };
    }

    function getAturanSimulasiRow(row, catatan) {
        if (isStafDistribusi(row)) {
            return {
                nama: 'Staf terbatas',
                roles: [...(isBatasanSimulasiAktif('roleStaf') ? getBatasanSimulasi().roleStaf : rolePlottingKerma)]
            };
        }
        const levels = ambilLevelSimulasiDistribusi(row);
        const levelUtama = levels[0] || '';
        let aturan = aturanSimulasiDariLevel(levelUtama);
        if (!aturan) {
            aturan = levelUtama
                ? {
                    nama: 'Tanpa batasan level',
                    roles: [...(isBatasanSimulasiAktif('roleDosen') ? getBatasanSimulasi().roleDosen : rolePlottingKerma)]
                }
                : aturanSimulasiTanpaLevel(row);
        }
        return {
            ...aturan,
            roles: aturan.roles.filter(role => isRoleDosenDistribusi(role))
        };
    }

    function getItemSimulasiUntukRow(row, itemRoles, catatan) {
        const aturan = getAturanSimulasiRow(row, catatan);
        const rolePriority = new Map(aturan.roles.map((role, index) => [role, index]));
        let filtered = itemRoles
            .filter(item => rolePriority.has(item.role))
            .map(item => ({
                ...item,
                priority: rolePriority.get(item.role),
                naikSatuLevel: false
            }));
        if (isStafDistribusi(row)) return filtered;
        const roleCadangan = getRoleCadanganNaikLevelDosen(aturan.roles);
        if (roleCadangan.length) {
            const basePriority = aturan.roles.length;
            const existing = new Set(filtered.map(item => item.role));
            const tambahan = itemRoles
                .filter(item => roleCadangan.includes(item.role) && !existing.has(item.role))
                .map(item => ({
                    ...item,
                    priority: basePriority + roleCadangan.indexOf(item.role),
                    naikSatuLevel: true
                }));
            filtered = [...filtered, ...tambahan];
        }
        return filtered;
    }

    function gcdRupiah(a, b) {
        let x = Math.abs(Math.round(a));
        let y = Math.abs(Math.round(b));
        while (y) {
            const temp = y;
            y = x % y;
            x = temp;
        }
        return x || 1;
    }

    function formatDurasiDistribusi(value) {
        const angka = angkaDesimalPlotting(value);
        return angka.toLocaleString('id-ID', { maximumFractionDigits: 2 });
    }

    function formatNilaiSimulasiDistribusi(months, durasi) {
        const bulan = Math.max(0, Math.round(Number(months) || 0));
        const totalDurasi = angkaDesimalPlotting(durasi);
        if (totalDurasi <= 0) return bulan ? String(bulan) : '-';
        const durasiLabel = formatDurasiDistribusi(totalDurasi);
        if (bulan <= 0) return '-';
        const full = Math.floor(bulan / totalDurasi);
        const sisa = Math.round(bulan - (full * totalDurasi));
        if (!full) return `(${formatDurasiDistribusi(sisa)}/${durasiLabel})`;
        if (!sisa) return String(full);
        return `${full} + (${formatDurasiDistribusi(sisa)}/${durasiLabel})`;
    }

    function normalisasiNilaiDistribusiRole(value, role) {
        const raw = String(value ?? '').trim();
        if (!raw || raw === '-') return '-';
        const { durasi } = getKonfigurasiRoleDistribusi(role);
        const bulanDibayar = hitungBulanDibayarDistribusi(raw, durasi);
        if (bulanDibayar > 0) return formatNilaiSimulasiDistribusi(bulanDibayar, durasi);
        return /^0(?:[,.]0+)?$/.test(raw) || /^0\s*\/\s*\d/i.test(raw) ? '-' : raw;
    }

    function cariKombinasiSimulasiDistribusi(target, itemRoles, maxSlots = 0) {
        if (maxSlots > 0) return cariKombinasiSimulasiDistribusiDenganBatas(target, itemRoles, maxSlots);

        const targetRupiah = Math.max(0, Math.round(target));
        const monthsByRole = Object.fromEntries(rolePlottingKerma.map(role => [role, 0]));
        if (!targetRupiah || !itemRoles.length) return { monthsByRole, realisasi: 0 };

        const tarifList = itemRoles.map(item => item.tarif);
        let unit = Math.max(100000, tarifList.reduce((gcd, value) => gcdRupiah(gcd, value), tarifList[0]));
        let coinUnits = itemRoles.map(item => Math.max(1, Math.round(item.tarif / unit)));
        let maxCoin = Math.max(...coinUnits);
        let limit = Math.ceil((targetRupiah / unit) + maxCoin);
        while (limit > 60000) {
            unit *= 2;
            coinUnits = itemRoles.map(item => Math.max(1, Math.round(item.tarif / unit)));
            maxCoin = Math.max(...coinUnits);
            limit = Math.ceil((targetRupiah / unit) + maxCoin);
        }

        const prevAmount = new Int32Array(limit + 1);
        const prevCoin = new Int16Array(limit + 1);
        const monthCount = new Int32Array(limit + 1);
        const roleScore = new Int32Array(limit + 1);
        prevAmount.fill(-1);
        prevCoin.fill(-1);
        monthCount.fill(2147483647);
        roleScore.fill(2147483647);
        prevAmount[0] = 0;
        monthCount[0] = 0;
        roleScore[0] = 0;

        for (let amount = 0; amount <= limit; amount += 1) {
            if (prevAmount[amount] === -1) continue;
            coinUnits.forEach((coin, coinIndex) => {
                const next = amount + coin;
                if (next > limit) return;
                const nextCount = monthCount[amount] + 1;
                const priority = Number.isFinite(itemRoles[coinIndex].priority) ? itemRoles[coinIndex].priority : coinIndex;
                const nextScore = roleScore[amount] + (priority * 1000) + 1;
                if (nextScore < roleScore[next] || (nextScore === roleScore[next] && nextCount < monthCount[next])) {
                    prevAmount[next] = amount;
                    prevCoin[next] = coinIndex;
                    monthCount[next] = nextCount;
                    roleScore[next] = nextScore;
                }
            });
        }

        let bestAmount = 0;
        let bestDiff = Math.abs(targetRupiah);
        for (let amount = 1; amount <= limit; amount += 1) {
            if (prevAmount[amount] === -1) continue;
            const candidateRupiah = amount * unit;
            const diff = Math.abs(candidateRupiah - targetRupiah);
            const candidateUnder = candidateRupiah <= targetRupiah;
            const bestUnder = bestAmount * unit <= targetRupiah;
            const betterTie = diff === bestDiff && (
                (candidateUnder && !bestUnder) ||
                (candidateUnder === bestUnder && roleScore[amount] < roleScore[bestAmount]) ||
                (candidateUnder === bestUnder && roleScore[amount] === roleScore[bestAmount] && monthCount[amount] < monthCount[bestAmount])
            );
            if (diff < bestDiff || betterTie) {
                bestAmount = amount;
                bestDiff = diff;
            }
        }

        let cursor = bestAmount;
        while (cursor > 0 && prevCoin[cursor] >= 0) {
            const coinIndex = prevCoin[cursor];
            monthsByRole[itemRoles[coinIndex].role] += 1;
            cursor = prevAmount[cursor];
        }

        const realisasi = itemRoles.reduce((sum, item) => sum + ((monthsByRole[item.role] || 0) * item.tarif), 0);
        return { monthsByRole, realisasi };
    }

    function cariKombinasiSimulasiDistribusiDenganBatas(target, itemRoles, maxSlots) {
        const targetRupiah = Math.max(0, Math.round(target));
        const monthsByRole = Object.fromEntries(rolePlottingKerma.map(role => [role, 0]));
        const batasSlot = Math.max(0, Math.trunc(Number(maxSlots) || 0));
        if (!targetRupiah || !itemRoles.length || batasSlot <= 0) return { monthsByRole, realisasi: 0 };

        const tarifList = itemRoles.map(item => item.tarif);
        let unit = Math.max(100000, tarifList.reduce((gcd, value) => gcdRupiah(gcd, value), tarifList[0]));
        const options = [];
        itemRoles.forEach((item, roleIndex) => {
            const durasi = Math.max(1, Math.round(item.durasi) || 1);
            const priority = Number.isFinite(item.priority) ? item.priority : roleIndex;
            for (let months = 1; months <= durasi; months += 1) {
                options.push({
                    role: item.role,
                    months,
                    priority,
                    amountUnits: Math.max(1, Math.round((item.tarif * months) / unit))
                });
            }
        });
        if (!options.length) return { monthsByRole, realisasi: 0 };

        let maxOption = Math.max(...options.map(option => option.amountUnits));
        let limit = Math.ceil((targetRupiah / unit) + maxOption);
        while (limit > 60000) {
            unit *= 2;
            options.forEach(option => {
                const item = itemRoles.find(roleItem => roleItem.role === option.role);
                option.amountUnits = Math.max(1, Math.round(((item?.tarif || 0) * option.months) / unit));
            });
            maxOption = Math.max(...options.map(option => option.amountUnits));
            limit = Math.ceil((targetRupiah / unit) + maxOption);
        }

        const width = limit + 1;
        const size = (batasSlot + 1) * width;
        const prevAmount = new Int32Array(size);
        const prevSlot = new Int16Array(size);
        const prevOption = new Int16Array(size);
        const score = new Int32Array(size);
        prevAmount.fill(-1);
        prevSlot.fill(-1);
        prevOption.fill(-1);
        score.fill(2147483647);
        const indexOf = (slot, amount) => (slot * width) + amount;
        score[indexOf(0, 0)] = 0;

        for (let slot = 0; slot < batasSlot; slot += 1) {
            for (let amount = 0; amount <= limit; amount += 1) {
                const stateIndex = indexOf(slot, amount);
                if (score[stateIndex] === 2147483647) continue;
                options.forEach((option, optionIndex) => {
                    const nextAmount = amount + option.amountUnits;
                    if (nextAmount > limit) return;
                    const nextIndex = indexOf(slot + 1, nextAmount);
                    const nextScore = score[stateIndex] + (option.priority * 1000) + option.months;
                    if (nextScore < score[nextIndex]) {
                        score[nextIndex] = nextScore;
                        prevAmount[nextIndex] = amount;
                        prevSlot[nextIndex] = slot;
                        prevOption[nextIndex] = optionIndex;
                    }
                });
            }
        }

        let bestSlot = 0;
        let bestAmount = 0;
        let bestDiff = Math.abs(targetRupiah);
        for (let slot = 0; slot <= batasSlot; slot += 1) {
            for (let amount = 1; amount <= limit; amount += 1) {
                const stateIndex = indexOf(slot, amount);
                if (score[stateIndex] === 2147483647) continue;
                const candidateRupiah = amount * unit;
                const diff = Math.abs(candidateRupiah - targetRupiah);
                const candidateUnder = candidateRupiah <= targetRupiah;
                const bestUnder = bestAmount * unit <= targetRupiah;
                const bestIndex = indexOf(bestSlot, bestAmount);
                const betterTie = diff === bestDiff && (
                    (candidateUnder && !bestUnder) ||
                    (candidateUnder === bestUnder && score[stateIndex] < score[bestIndex]) ||
                    (candidateUnder === bestUnder && score[stateIndex] === score[bestIndex] && slot < bestSlot)
                );
                if (diff < bestDiff || betterTie) {
                    bestSlot = slot;
                    bestAmount = amount;
                    bestDiff = diff;
                }
            }
        }

        let slot = bestSlot;
        let amount = bestAmount;
        while (slot > 0 && amount > 0) {
            const stateIndex = indexOf(slot, amount);
            const optionIndex = prevOption[stateIndex];
            if (optionIndex < 0) break;
            const option = options[optionIndex];
            monthsByRole[option.role] += option.months;
            amount = prevAmount[stateIndex];
            slot = prevSlot[stateIndex];
        }

        const realisasi = itemRoles.reduce((sum, item) => sum + ((monthsByRole[item.role] || 0) * item.tarif), 0);
        return { monthsByRole, realisasi };
    }

    function setStatusSimulasiDistribusi(message, isError = false) {
        if (!statusSimulasiDistribusi) return;
        statusSimulasiTooltipTerakhir = '';
        hasilSimulasiModalTerakhir = null;
        hasilSimulasiTertunda = null;
        statusSimulasiDistribusi.hidden = !message;
        statusSimulasiDistribusi.innerHTML = message || '';
        statusSimulasiDistribusi.classList.toggle('is-error', isError);
        statusSimulasiDistribusi.classList.toggle('is-success', false);
    }

    function htmlKartuHasilSimulasiDistribusi({ jumlahDisimulasikan, kebutuhanSimulasi, batasKebutuhanPks, totalSelisih, catatan = [] }, isError = false, opsi = {}) {
        const isImpossible = Boolean(opsi.impossible);
        const catatanHtml = catatan.length
            ? `
                <div class="simulation-result-notes">
                    ${catatan.map(item => `
                        <div class="simulation-result-note simulation-result-note--${esc(item.tipe || 'info')}">
                            <span>${esc(item.label)}</span>
                            <strong>${esc(item.value)}</strong>
                        </div>
                    `).join('')}
                </div>
            `
            : '<div class="simulation-result-clean">Tidak ada catatan validasi tambahan.</div>';

        return `
            <div class="simulation-result-card">
                <div class="simulation-result-heading">
                    <span>${isImpossible ? 'Simulasi tidak memungkinkan' : (isError ? 'Simulasi selesai dengan catatan' : 'Simulasi selesai')}</span>
                    <strong>${Number(jumlahDisimulasikan || 0).toLocaleString('id-ID')} orang</strong>
                </div>
                ${isImpossible ? '<p class="simulation-result-alert">Hasil simulasi belum memenuhi seluruh batasan mutlak. Pilih Lanjutkan untuk menggunakan hasil sementara, atau Berhenti untuk membatalkan dan kembali ke data sebelumnya.</p>' : ''}
                <div class="simulation-result-metrics">
                    <div>
                        <span>PKS Simulasi</span>
                        <strong>${Number(kebutuhanSimulasi || 0).toLocaleString('id-ID')} / ${Number(batasKebutuhanPks || 0).toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                        <span>Selisih Positif</span>
                        <strong>${formatRupiahKomaDash(totalSelisih || 0)}</strong>
                    </div>
                </div>
                ${catatanHtml}
            </div>
        `;
    }

    function tooltipHasilSimulasiDistribusi({ jumlahDisimulasikan, kebutuhanSimulasi, batasKebutuhanPks, totalSelisih, catatan = [], impossible = false }, isError = false) {
        const lines = [
            impossible ? 'Simulasi tidak memungkinkan' : (isError ? 'Simulasi selesai dengan catatan' : 'Simulasi selesai'),
            `Orang disimulasikan: ${Number(jumlahDisimulasikan || 0).toLocaleString('id-ID')}`,
            `PKS simulasi: ${Number(kebutuhanSimulasi || 0).toLocaleString('id-ID')} dari ${Number(batasKebutuhanPks || 0).toLocaleString('id-ID')}`,
            `Selisih positif: ${formatRupiahKomaDash(totalSelisih || 0)}`
        ];
        if (catatan.length) {
            lines.push('Catatan:');
            catatan.forEach(item => lines.push(`- ${item.label}: ${item.value}`));
        } else {
            lines.push('Tidak ada catatan validasi tambahan.');
        }
        return lines.join('\n');
    }

    function tampilkanTooltipStatusSimulasiDistribusi(data, isError = false) {
        if (!statusSimulasiDistribusi) return;
        const tooltip = tooltipHasilSimulasiDistribusi(data, isError);
        statusSimulasiTooltipTerakhir = tooltip;
        statusSimulasiDistribusi.hidden = false;
        statusSimulasiDistribusi.classList.toggle('is-error', isError);
        statusSimulasiDistribusi.classList.toggle('is-success', !isError);
        statusSimulasiDistribusi.innerHTML = `
            <button type="button" class="simulation-tooltip-badge ${isError ? 'is-error' : 'is-success'}" data-tooltip="${esc(tooltip)}" aria-label="${esc(tooltip)}">
                <span>${data.impossible ? 'Hasil sementara tersimpan' : 'Hasil simulasi tersimpan'}</span>
                <strong>${Number(data.kebutuhanSimulasi || 0).toLocaleString('id-ID')} / ${Number(data.batasKebutuhanPks || 0).toLocaleString('id-ID')} PKS</strong>
                <i aria-hidden="true">i</i>
            </button>
        `;
    }

    function tutupModalSimulasiDistribusi() {
        if (hasilSimulasiTertunda) {
            batalHasilSimulasiTertunda();
            return;
        }
        if (modalSimulasiDistribusi) modalSimulasiDistribusi.style.display = 'none';
        if (hasilSimulasiModalTerakhir) {
            tampilkanTooltipStatusSimulasiDistribusi(hasilSimulasiModalTerakhir.data, hasilSimulasiModalTerakhir.isError);
        }
    }

    function setModeAksiModalSimulasi(isImpossible = false) {
        if (btnOkModalSimulasiDistribusi) btnOkModalSimulasiDistribusi.style.display = isImpossible ? 'none' : '';
        if (btnLanjutModalSimulasiDistribusi) btnLanjutModalSimulasiDistribusi.style.display = isImpossible ? '' : 'none';
        if (btnBerhentiModalSimulasiDistribusi) btnBerhentiModalSimulasiDistribusi.style.display = isImpossible ? '' : 'none';
    }

    function renderStatusSimulasiDistribusi(data, isError = false, opsi = {}) {
        const isImpossible = Boolean(opsi.impossible);
        hasilSimulasiModalTerakhir = { data, isError };
        if (statusSimulasiDistribusi) {
            statusSimulasiDistribusi.hidden = true;
            statusSimulasiDistribusi.innerHTML = '';
            statusSimulasiDistribusi.classList.remove('is-error', 'is-success');
        }
        if (!modalSimulasiDistribusi || !modalSimulasiDistribusiBody) {
            tampilkanTooltipStatusSimulasiDistribusi(data, isError);
            return;
        }
        setModeAksiModalSimulasi(isImpossible);
        modalSimulasiDistribusiBody.innerHTML = htmlKartuHasilSimulasiDistribusi(data, isError, opsi);
        modalSimulasiDistribusi.style.display = 'flex';
    }

    function terapkanSnapshotDistribusi(snapshot = new Map()) {
        plottingKermaRows.forEach(row => {
            const roles = pastikanDistribusiRoles(row);
            const saved = snapshot.get(row) || {};
            rolePlottingKerma.forEach(role => {
                roles[role] = saved[role] || '';
            });
        });
    }

    function simpanHasilSimulasiTertunda() {
        if (!hasilSimulasiTertunda) return;
        simpanPlottingKerma();
        renderTargetDistribusiPlotting();
        updateRingkasanDasarPlotting();
        const { data, isError } = hasilSimulasiTertunda;
        hasilSimulasiTertunda = null;
        if (modalSimulasiDistribusi) modalSimulasiDistribusi.style.display = 'none';
        setModeAksiModalSimulasi(false);
        tampilkanTooltipStatusSimulasiDistribusi(data, isError);
    }

    function batalHasilSimulasiTertunda() {
        if (!hasilSimulasiTertunda) {
            if (modalSimulasiDistribusi) modalSimulasiDistribusi.style.display = 'none';
            return;
        }
        terapkanSnapshotDistribusi(hasilSimulasiTertunda.snapshotSebelum);
        const data = hasilSimulasiTertunda.data;
        hasilSimulasiTertunda = null;
        simpanPlottingKerma();
        renderTargetDistribusiPlotting();
        updateRingkasanDasarPlotting();
        if (modalSimulasiDistribusi) modalSimulasiDistribusi.style.display = 'none';
        setModeAksiModalSimulasi(false);
        setStatusSimulasiDistribusi(`
            <button type="button" class="simulation-tooltip-badge is-error" data-tooltip="${esc('Simulasi dihentikan. Data dikembalikan ke kondisi sebelum simulasi karena seluruh batasan mutlak belum dapat dipenuhi.')}" aria-label="${esc('Simulasi dihentikan. Data dikembalikan ke kondisi sebelum simulasi karena seluruh batasan mutlak belum dapat dipenuhi.')}">
                <span>Simulasi dihentikan</span>
                <strong>${Number(data.kebutuhanSimulasi || 0).toLocaleString('id-ID')} / ${Number(data.batasKebutuhanPks || 0).toLocaleString('id-ID')} PKS</strong>
                <i aria-hidden="true">i</i>
            </button>
        `, true);
    }

    function buatStateAlokasiDistribusi(row) {
        return {
            monthsByRole: Object.fromEntries(rolePlottingKerma.map(role => [role, 0])),
            realisasi: 0,
            slots: 0,
            target: hitungTargetDistribusiRow(row),
            naikSatuLevel: false
        };
    }

    function buatStateAlokasiDariRowDistribusi(row) {
        const roles = pastikanDistribusiRoles(row);
        const monthsByRole = Object.fromEntries(rolePlottingKerma.map(role => [
            role,
            hitungBulanRoleDistribusi(roles[role], role)
        ]));
        const slots = rolePlottingKerma.reduce((sum, role) => sum + hitungSlotPksDistribusi(roles[role], role), 0);
        return {
            monthsByRole,
            realisasi: hitungRealisasiDistribusiRow(row),
            slots,
            target: hitungTargetDistribusiRow(row),
            naikSatuLevel: false
        };
    }

    function hitungKapasitasSisaRoleDistribusi(batasKebutuhanPks) {
        const kapasitas = Object.fromEntries(rolePlottingKerma.map(role => {
            const { personilPerKerma } = getKonfigurasiRoleDistribusi(role);
            return [role, Math.max(0, Math.round(Number(batasKebutuhanPks) || 0)) * personilPerKerma];
        }));
        plottingKermaRows.forEach(row => {
            if (row.status !== 'Aktif') return;
            const roles = pastikanDistribusiRoles(row);
            rolePlottingKerma.forEach(role => {
                kapasitas[role] = Math.max(0, (kapasitas[role] || 0) - hitungSlotPksDistribusi(roles[role], role));
            });
        });
        return kapasitas;
    }

    function hitungBiayaSlotTambahanDistribusi(state, role, tambahanBulan = 1) {
        const bulanSaatIni = Math.max(0, Number(state?.monthsByRole?.[role]) || 0);
        const bulanBerikutnya = bulanSaatIni + Math.max(0, Number(tambahanBulan) || 0);
        return Math.max(0, hitungSlotPksDariBulan(bulanBerikutnya, role) - hitungSlotPksDariBulan(bulanSaatIni, role));
    }

    function isKompromiOptimasi(opsi = {}, id) {
        return Array.isArray(opsi.kompromi) && opsi.kompromi.includes(id);
    }

    function batasSelisihAtasEfektif(opsi = {}) {
        if (!isBatasanSimulasiAktif('batasSelisihAtas')) return Number.POSITIVE_INFINITY;
        if (opsi.abaikanBatasSelisihAtas) return Number.POSITIVE_INFINITY;
        const tambahan = Math.max(0, Number(opsi.tambahanBatasSelisihAtas) || 0);
        return Math.max(0, batasSelisihDistribusi) + tambahan;
    }

    function batasSelisihBawahEfektif(row) {
        if (isDosenDistribusi(row) && isBatasanSimulasiAktif('dosenTidakBolehMinus') && getBatasanSimulasi().dosenTidakBolehMinus) return 0;
        if (isStafDistribusi(row) && isBatasanSimulasiAktif('stafTidakBolehMinus') && getBatasanSimulasi().stafTidakBolehMinus) return 0;
        if (!isBatasanSimulasiAktif('batasSelisihBawah')) return Number.NEGATIVE_INFINITY;
        return -Math.max(0, batasSelisihBawahDistribusi);
    }

    function skorSelisihDistribusi(realisasi, target, row, opsi = {}) {
        const selisih = realisasi - target;
        const batasBawah = batasSelisihBawahEfektif(row);
        const batasAtas = batasSelisihAtasEfektif(opsi);
        if (selisih >= batasBawah && selisih <= batasAtas) {
            return { kategori: 0, nilai: Math.abs(selisih) };
        }
        if (selisih > batasAtas) {
            return { kategori: 1, nilai: selisih - batasAtas };
        }
        return { kategori: 2, nilai: batasBawah - selisih };
    }

    function selisihDistribusiDalamBatas(state, row, opsi = {}) {
        const batasAtas = batasSelisihAtasEfektif(opsi);
        if (isStafDistribusi(row)) {
            const selisih = state.realisasi - state.target;
            return selisih >= batasSelisihBawahEfektif(row) && selisih <= batasAtas;
        }
        if (!isBatasanSimulasiAktif('dosenTidakBolehMinus') || !getBatasanSimulasi().dosenTidakBolehMinus) {
            const selisih = state.realisasi - state.target;
            return selisih >= batasSelisihBawahEfektif(row) && selisih <= batasAtas;
        }
        const selisih = state.realisasi - state.target;
        return selisih >= batasSelisihBawahEfektif(row) && selisih <= batasAtas;
    }

    function pilihSlotDistribusiTerbaik(row, state, itemRolesRow, kapasitasSlotRole, batasKebutuhanPks, paksaAlokasiAwal = false, opsi = {}) {
        const batasSlotPegawai = getBatasSlotPegawaiDistribusi(row, batasKebutuhanPks);
        if (!row || !state) return null;
        if (selisihDistribusiDalamBatas(state, row, opsi)) return null;
        let best = null;
        const skorAwal = skorSelisihDistribusi(state.realisasi, state.target, row, opsi);

        itemRolesRow.forEach((item, itemIndex) => {
            const months = 1;
            const slotCost = hitungBiayaSlotTambahanDistribusi(state, item.role, months);
            if (state.slots + slotCost > batasSlotPegawai) return;
            if (slotCost > 0 && (kapasitasSlotRole[item.role] || 0) < slotCost) return;
            const nilai = item.tarif * months;
            const realisasiBaru = state.realisasi + nilai;
            const selisihBaru = realisasiBaru - state.target;
            if (isBatasanSimulasiAktif('batasSelisihAtas') && selisihBaru > batasSelisihAtasEfektif(opsi)) return;
            const skor = skorSelisihDistribusi(realisasiBaru, state.target, row, opsi);
            const under = selisihBaru < 0;
            const priority = Number.isFinite(item.priority) ? item.priority : itemIndex;
            const currentMonths = Number(state.monthsByRole?.[item.role]) || 0;
            const candidate = {
                role: item.role,
                months,
                nilai,
                skor,
                under,
                priority,
                slotCost,
                continuing: currentMonths > 0 && slotCost === 0,
                naikSatuLevel: Boolean(item.naikSatuLevel)
            };
            if (!best) {
                best = candidate;
                return;
            }
            const bestUnder = (state.realisasi + best.nilai) - state.target < 0;
            const better =
                skor.kategori < best.skor.kategori ||
                (skor.kategori === best.skor.kategori && skor.nilai < best.skor.nilai) ||
                (skor.kategori === best.skor.kategori && skor.nilai === best.skor.nilai && candidate.continuing && !best.continuing) ||
                (skor.kategori === best.skor.kategori && skor.nilai === best.skor.nilai && candidate.continuing === best.continuing && under && !bestUnder) ||
                (skor.kategori === best.skor.kategori && skor.nilai === best.skor.nilai && candidate.continuing === best.continuing && under === bestUnder && priority < best.priority) ||
                (skor.kategori === best.skor.kategori && skor.nilai === best.skor.nilai && candidate.continuing === best.continuing && under === bestUnder && priority === best.priority && slotCost < best.slotCost);
            if (better) best = candidate;
        });

        if (!best) return null;
        if (paksaAlokasiAwal && state.slots === 0) return best;
        return best.skor.kategori < skorAwal.kategori || best.skor.nilai < skorAwal.nilai ? best : null;
    }

    function terapkanSlotDistribusi(state, slot, kapasitasSlotRole) {
        if (!state || !slot) return false;
        const slotCost = Number.isFinite(slot.slotCost) ? Math.max(0, slot.slotCost) : 1;
        if (slotCost > 0 && (kapasitasSlotRole[slot.role] || 0) < slotCost) return false;
        state.monthsByRole[slot.role] += slot.months;
        state.realisasi += slot.nilai;
        state.slots += slotCost;
        if (slot.naikSatuLevel) state.naikSatuLevel = true;
        kapasitasSlotRole[slot.role] = Math.max(0, (kapasitasSlotRole[slot.role] || 0) - slotCost);
        return true;
    }

    function pilihSlotKosongDosenTerbaik(row, state, itemRoles, kapasitasSlotRole, batasKebutuhanPks, opsi = {}) {
        if (!isAlokasiDosenSlotKosongAktif() || !isDosenDistribusi(row) || !state) return null;
        const batasSlotPegawai = getBatasSlotPegawaiDistribusi(row, batasKebutuhanPks);
        const selisihAwal = state.realisasi - state.target;
        const jarakAwal = Math.abs(selisihAwal);
        if (jarakAwal <= 0) return null;
        let best = null;

        itemRoles
            .forEach((item, itemIndex) => {
                const months = 1;
                const slotCost = hitungBiayaSlotTambahanDistribusi(state, item.role, months);
                if (state.slots + slotCost > batasSlotPegawai) return;
                if (slotCost > 0 && (kapasitasSlotRole[item.role] || 0) < slotCost) return;
                const nilai = item.tarif * months;
                const selisihBaru = (state.realisasi + nilai) - state.target;
                if (isBatasanSimulasiAktif('batasSelisihAtas') && selisihBaru > batasSelisihAtasEfektif(opsi)) return;
                const jarakBaru = Math.abs(selisihBaru);
                if (jarakBaru >= jarakAwal) return;
                const priority = Number.isFinite(item.priority) ? item.priority : itemIndex;
                const currentMonths = Number(state.monthsByRole?.[item.role]) || 0;
                const candidate = {
                    role: item.role,
                    months,
                    nilai,
                    priority,
                    jarakBaru,
                    under: selisihBaru < 0,
                    slotCost,
                    continuing: currentMonths > 0 && slotCost === 0,
                    naikSatuLevel: true
                };
                if (!best) {
                    best = candidate;
                    return;
                }
                const better =
                    candidate.jarakBaru < best.jarakBaru ||
                    (candidate.jarakBaru === best.jarakBaru && candidate.continuing && !best.continuing) ||
                    (candidate.jarakBaru === best.jarakBaru && candidate.continuing === best.continuing && candidate.under && !best.under) ||
                    (candidate.jarakBaru === best.jarakBaru && candidate.continuing === best.continuing && candidate.under === best.under && candidate.priority < best.priority) ||
                    (candidate.jarakBaru === best.jarakBaru && candidate.continuing === best.continuing && candidate.under === best.under && candidate.priority === best.priority && candidate.slotCost < best.slotCost);
                if (better) best = candidate;
            });
        return best;
    }

    function jalankanAlokasiDosenSlotKosong(rowsSimulasi, kapasitasSlotRole, itemRoles, batasKebutuhanPks, opsi = {}) {
        if (!isAlokasiDosenSlotKosongAktif()) return false;
        let pernahProgress = false;
        let adaProgress = true;
        while (adaProgress) {
            adaProgress = false;
            rowsSimulasi
                .filter(item => isDosenDistribusi(item.row))
                .sort((a, b) => Math.abs((b.state?.realisasi || 0) - (b.state?.target || 0)) - Math.abs((a.state?.realisasi || 0) - (a.state?.target || 0)))
                .forEach(item => {
                    const slot = pilihSlotKosongDosenTerbaik(item.row, item.state, itemRoles, kapasitasSlotRole, batasKebutuhanPks, opsi);
                    if (terapkanSlotDistribusi(item.state, slot, kapasitasSlotRole)) {
                        adaProgress = true;
                        pernahProgress = true;
                    }
                });
        }
        return pernahProgress;
    }

    function getItemRolesOptimasiRow(item, itemRoles = []) {
        const base = [...(item.itemRolesNormal || [])];
        if (!isDosenDistribusi(item.row) || !isAlokasiDosenSlotKosongAktif()) return base;
        const existing = new Set(base.map(roleItem => roleItem.role));
        const tambahan = itemRoles
            .filter(roleItem => !existing.has(roleItem.role))
            .map((roleItem, index) => ({
                ...roleItem,
                priority: base.length + index,
                naikSatuLevel: true
            }));
        return [...base, ...tambahan];
    }

    function hitungSlotsStateDistribusi(state) {
        return rolePlottingKerma.reduce((sum, role) => sum + hitungSlotPksDariBulan(state?.monthsByRole?.[role] || 0, role), 0);
    }

    function hitungSlotsRoleStateDistribusi(state) {
        return Object.fromEntries(rolePlottingKerma.map(role => [role, hitungSlotPksDariBulan(state?.monthsByRole?.[role] || 0, role)]));
    }

    function hitungRealisasiStateDistribusi(monthsByRole, itemRoles = []) {
        const tarifByRole = new Map(itemRoles.map(item => [item.role, Number(item.tarif) || 0]));
        return rolePlottingKerma.reduce((sum, role) => {
            const tarif = tarifByRole.get(role) ?? Math.round(tarifPlotting(tarifMasterJabatanPlotting[role]));
            return sum + ((Number(monthsByRole?.[role]) || 0) * tarif);
        }, 0);
    }

    function isSkorKandidatLebihBaikDistribusi(candidate, best, base) {
        if (!candidate) return false;
        if (!best) {
            return candidate.skor.kategori < base.kategori || candidate.skor.nilai < base.nilai;
        }
        if (candidate.skor.kategori !== best.skor.kategori) return candidate.skor.kategori < best.skor.kategori;
        if (candidate.skor.nilai !== best.skor.nilai) return candidate.skor.nilai < best.skor.nilai;
        if (candidate.selisih >= 0 && best.selisih < 0) return true;
        if ((candidate.totalSlots || 0) !== (best.totalSlots || 0)) return (candidate.totalSlots || 0) < (best.totalSlots || 0);
        return candidate.prioritas < best.prioritas;
    }

    function gcdNumberDistribusi(a, b) {
        let x = Math.abs(Math.round(a));
        let y = Math.abs(Math.round(b));
        while (y) {
            const temp = y;
            y = x % y;
            x = temp;
        }
        return x || 1;
    }

    function cariKomposisiDistribusiTerbaik(item, kapasitasSlotRole, batasKebutuhanPks, itemRoles = [], opsi = {}) {
        const state = item.state;
        const row = item.row;
        if (!state || !row) return null;
        const itemRolesOptimasi = getItemRolesOptimasiRow(item, itemRoles).filter(roleItem => (Number(roleItem.tarif) || 0) > 0);
        if (!itemRolesOptimasi.length) return null;

        const batasSlotPegawai = getBatasSlotPegawaiDistribusi(row, batasKebutuhanPks);
        const currentSlots = hitungSlotsRoleStateDistribusi(state);
        const currentMonths = Object.fromEntries(rolePlottingKerma.map(role => [role, Math.max(0, Math.round(Number(state.monthsByRole?.[role]) || 0))]));
        const baseScore = skorSelisihDistribusi(state.realisasi, state.target, row, opsi);
        const tarifList = itemRolesOptimasi.map(roleItem => Number(roleItem.tarif) || 0).filter(Boolean);
        const unit = Math.max(1, tarifList.reduce((gcd, value) => gcdNumberDistribusi(gcd, value), tarifList[0] || 1));
        const maxTarifDurasi = Math.max(...itemRolesOptimasi.map(roleItem => {
            const durasi = Math.max(1, Math.round(roleItem.durasi) || 1);
            return (Number(roleItem.tarif) || 0) * durasi;
        }), 0);
        const batasAtasNominal = batasSelisihAtasEfektif(opsi);
        const batasTambahanNominal = Number.isFinite(batasAtasNominal)
            ? batasAtasNominal
            : Math.max(maxTarifDurasi, 5000000);
        const amountCap = Math.max(0, state.target + batasTambahanNominal);
        const roleOptions = itemRolesOptimasi.map((roleItem, roleIndex) => {
            const durasi = Math.max(1, Math.round(roleItem.durasi) || 1);
            const maxSlotsRole = Math.max(0, (currentSlots[roleItem.role] || 0) + (kapasitasSlotRole[roleItem.role] || 0));
            const maxMonthsBySlot = Math.max(0, Math.min(maxSlotsRole, batasSlotPegawai) * durasi);
            const maxMonthsByTarget = Number(roleItem.tarif) > 0
                ? Math.max(0, Math.ceil(amountCap / (Number(roleItem.tarif) || 1)))
                : maxMonthsBySlot;
            const maxMonths = Math.min(maxMonthsBySlot, maxMonthsByTarget);
            const options = [];
            for (let months = 0; months <= maxMonths; months += 1) {
                const slots = hitungSlotPksDariBulan(months, roleItem.role);
                const amount = months * (Number(roleItem.tarif) || 0);
                options.push({
                    amount,
                    amountUnit: Math.round(amount / unit),
                    months,
                    priority: (Number.isFinite(roleItem.priority) ? roleItem.priority : roleIndex),
                    role: roleItem.role,
                    slots
                });
            }
            return options;
        });

        const maxStatesPerStep = 220;
        const scoreStateKomposisi = stateOption => {
            const selisih = stateOption.amount - state.target;
            const skor = skorSelisihDistribusi(stateOption.amount, state.target, row, opsi);
            return (skor.kategori * 1000000000000)
                + (skor.nilai * 100)
                + (selisih < 0 ? 10 : 0)
                + (stateOption.totalSlots || 0)
                + ((stateOption.priority || 0) / 1000000);
        };
        const pangkasStatesKomposisi = statesList => statesList
            .sort((a, b) => scoreStateKomposisi(a) - scoreStateKomposisi(b))
            .slice(0, maxStatesPerStep);

        let states = [{
            amount: 0,
            amountUnit: 0,
            monthsByRole: Object.fromEntries(rolePlottingKerma.map(role => [role, 0])),
            priority: 0,
            slotsByRole: Object.fromEntries(rolePlottingKerma.map(role => [role, 0])),
            totalSlots: 0
        }];

        roleOptions.forEach(options => {
            const nextMap = new Map();
            states.forEach(baseState => {
                options.forEach(option => {
                    const totalSlots = baseState.totalSlots + option.slots;
                    if (totalSlots > batasSlotPegawai) return;
                    const amountUnit = baseState.amountUnit + option.amountUnit;
                    const key = `${totalSlots}:${amountUnit}`;
                    const nextState = {
                        amount: baseState.amount + option.amount,
                        amountUnit,
                        monthsByRole: {
                            ...baseState.monthsByRole,
                            [option.role]: option.months
                        },
                        priority: baseState.priority + (option.priority * 1000) + option.months,
                        slotsByRole: {
                            ...baseState.slotsByRole,
                            [option.role]: option.slots
                        },
                        totalSlots
                    };
                    const existing = nextMap.get(key);
                    if (!existing || nextState.priority < existing.priority) nextMap.set(key, nextState);
                });
            });
            states = pangkasStatesKomposisi([...nextMap.values()]);
        });

        let best = null;
        states.forEach(dpState => {
            if (dpState.totalSlots <= 0) return;
            const kapasitasCukup = rolePlottingKerma.every(role => {
                const delta = (dpState.slotsByRole[role] || 0) - (currentSlots[role] || 0);
                return delta <= 0 || (kapasitasSlotRole[role] || 0) >= delta;
            });
            if (!kapasitasCukup) return;
            const selisih = dpState.amount - state.target;
            if (isBatasanSimulasiAktif('batasSelisihAtas') && selisih > batasSelisihAtasEfektif(opsi)) return;
            const skor = skorSelisihDistribusi(dpState.amount, state.target, row, opsi);
            const candidate = {
                monthsByRole: dpState.monthsByRole,
                slotsByRole: dpState.slotsByRole,
                totalSlots: dpState.totalSlots,
                realisasi: dpState.amount,
                selisih,
                skor,
                prioritas: dpState.priority
            };
            if (isSkorKandidatLebihBaikDistribusi(candidate, best, baseScore)) best = candidate;
        });

        return best;
    }

    function cariRebalanceDistribusiTerbaik(item, kapasitasSlotRole, batasKebutuhanPks, itemRoles = [], opsi = {}) {
        const komposisiTerbaik = cariKomposisiDistribusiTerbaik(item, kapasitasSlotRole, batasKebutuhanPks, itemRoles, opsi);
        if (komposisiTerbaik) return komposisiTerbaik;

        const state = item.state;
        const row = item.row;
        if (!state || !row) return null;
        const itemRolesOptimasi = getItemRolesOptimasiRow(item, itemRoles).filter(roleItem => (Number(roleItem.tarif) || 0) > 0);
        if (!itemRolesOptimasi.length) return null;

        const batasSlotPegawai = getBatasSlotPegawaiDistribusi(row, batasKebutuhanPks);
        const currentMonths = Object.fromEntries(rolePlottingKerma.map(role => [role, Math.max(0, Math.round(Number(state.monthsByRole?.[role]) || 0))]));
        const currentSlots = hitungSlotsRoleStateDistribusi(state);
        const baseScore = skorSelisihDistribusi(state.realisasi, state.target, row, opsi);
        let best = null;

        itemRolesOptimasi.forEach((addItem, addIndex) => {
            const durasiAdd = Math.max(1, Math.round(addItem.durasi) || 1);
            for (let addMonths = 0; addMonths <= durasiAdd; addMonths += 1) {
                rolePlottingKerma.forEach((removeRole, removeIndex) => {
                    const maxRemove = currentMonths[removeRole] || 0;
                    for (let removeMonths = 0; removeMonths <= maxRemove; removeMonths += 1) {
                        if (addMonths <= 0 && removeMonths <= 0) return;
                        if (addItem.role === removeRole && addMonths === removeMonths) return;

                        const nextMonths = { ...currentMonths };
                        nextMonths[addItem.role] = Math.max(0, (nextMonths[addItem.role] || 0) + addMonths);
                        nextMonths[removeRole] = Math.max(0, (nextMonths[removeRole] || 0) - removeMonths);

                        const nextSlotsByRole = Object.fromEntries(rolePlottingKerma.map(role => [role, hitungSlotPksDariBulan(nextMonths[role] || 0, role)]));
                        const totalSlots = rolePlottingKerma.reduce((sum, role) => sum + nextSlotsByRole[role], 0);
                        if (totalSlots > batasSlotPegawai) return;
                        const kapasitasCukup = rolePlottingKerma.every(role => {
                            const delta = nextSlotsByRole[role] - (currentSlots[role] || 0);
                            return delta <= 0 || (kapasitasSlotRole[role] || 0) >= delta;
                        });
                        if (!kapasitasCukup) return;

                        const realisasi = hitungRealisasiStateDistribusi(nextMonths, itemRoles);
                        const selisih = realisasi - state.target;
                        if (isBatasanSimulasiAktif('batasSelisihAtas') && selisih > batasSelisihAtasEfektif(opsi)) return;
                        const skor = skorSelisihDistribusi(realisasi, state.target, row, opsi);
                        const candidate = {
                            monthsByRole: nextMonths,
                            slotsByRole: nextSlotsByRole,
                            totalSlots,
                            realisasi,
                            selisih,
                            skor,
                            prioritas: (Number.isFinite(addItem.priority) ? addItem.priority : addIndex) * 100 + removeIndex
                        };
                        if (isSkorKandidatLebihBaikDistribusi(candidate, best, baseScore)) best = candidate;
                    }
                });
            }
        });

        return best;
    }

    function terapkanRebalanceDistribusi(item, candidate, kapasitasSlotRole) {
        if (!item?.state || !candidate) return false;
        const currentSlots = hitungSlotsRoleStateDistribusi(item.state);
        rolePlottingKerma.forEach(role => {
            const delta = (candidate.slotsByRole[role] || 0) - (currentSlots[role] || 0);
            kapasitasSlotRole[role] = Math.max(0, (kapasitasSlotRole[role] || 0) - delta);
        });
        item.state.monthsByRole = { ...candidate.monthsByRole };
        item.state.realisasi = candidate.realisasi;
        item.state.slots = candidate.totalSlots;
        return true;
    }

    function jalankanRebalanceDistribusi(rowsSimulasi, kapasitasSlotRole, batasKebutuhanPks, itemRoles = [], opsi = {}) {
        let pernahProgress = false;
        let adaProgress = true;
        let guard = 0;
        while (adaProgress && guard < 6) {
            guard += 1;
            adaProgress = false;
            rowsSimulasi
                .sort((a, b) => {
                    const selisihA = (a.state?.realisasi || 0) - (a.state?.target || 0);
                    const selisihB = (b.state?.realisasi || 0) - (b.state?.target || 0);
                    if ((selisihA < 0) !== (selisihB < 0)) return selisihA < 0 ? -1 : 1;
                    return Math.abs(selisihB) - Math.abs(selisihA);
                })
                .forEach(item => {
                    const selisih = (item.state?.realisasi || 0) - (item.state?.target || 0);
                    if (selisihDistribusiDalamBatas(item.state, item.row, opsi) && Math.abs(selisih) <= 250000) return;
                    const candidate = cariRebalanceDistribusiTerbaik(item, kapasitasSlotRole, batasKebutuhanPks, itemRoles, opsi);
                    if (terapkanRebalanceDistribusi(item, candidate, kapasitasSlotRole)) {
                        adaProgress = true;
                        pernahProgress = true;
                    }
                });
        }
        return pernahProgress;
    }

    function jalankanAlokasiDistribusi(rowsSimulasi, kapasitasSlotRole, batasKebutuhanPks, itemRoles = [], opsi = {}) {
        rowsSimulasi
            .sort(bandingkanPrioritasSimulasiDistribusi)
            .forEach(item => {
                if (item.state.slots > 0) return;
                const slot = pilihSlotDistribusiTerbaik(item.row, item.state, item.itemRolesNormal, kapasitasSlotRole, batasKebutuhanPks, true, opsi);
                terapkanSlotDistribusi(item.state, slot, kapasitasSlotRole);
            });

        let adaProgress = true;
        while (adaProgress) {
            adaProgress = false;
            rowsSimulasi.sort(bandingkanPrioritasSimulasiDistribusi).forEach(item => {
                const itemRoles = item.itemRolesNormal;
                const slot = pilihSlotDistribusiTerbaik(item.row, item.state, itemRoles, kapasitasSlotRole, batasKebutuhanPks, false, opsi);
                if (terapkanSlotDistribusi(item.state, slot, kapasitasSlotRole)) adaProgress = true;
            });
        }
        jalankanAlokasiDosenSlotKosong(rowsSimulasi, kapasitasSlotRole, itemRoles, batasKebutuhanPks, opsi);
    }

    function tulisHasilRowsSimulasi(rowsSimulasi, itemRoles = []) {
        rowsSimulasi.forEach(({ row, state, itemRolesNormal }) => {
            const roles = pastikanDistribusiRoles(row);
            rolePlottingKerma.forEach(role => {
                const item = itemRolesNormal.find(roleItem => roleItem.role === role)
                    || itemRoles.find(roleItem => roleItem.role === role);
                if (!item) {
                    roles[role] = '';
                    return;
                }
                roles[role] = formatNilaiSimulasiDistribusi(state.monthsByRole[role] || 0, item.durasi);
            });
        });
    }

    function buatCatatanValidasiDistribusi(rowsSimulasi, kapasitasSlotRole, batasKebutuhanPks, opsi = {}) {
        const catatanValidasi = [];
        const pelanggaranMutlak = [];
        const rekomendasiSimulasi = new Set();
        const tambahRekomendasi = value => {
            if (value) rekomendasiSimulasi.add(value);
        };
        const slotKosong = Object.values(kapasitasSlotRole).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
        const tanpaAlokasiDosen = rowsSimulasi.filter(item => isDosenDistribusi(item.row) && item.state.slots === 0).length;
        const tanpaAlokasiStaf = rowsSimulasi.filter(item => isStafDistribusi(item.row) && item.state.slots === 0).length;
        const bawahTargetDosen = rowsSimulasi.filter(item => (
            isDosenDistribusi(item.row) &&
            Number.isFinite(batasSelisihBawahEfektif(item.row)) &&
            item.state.realisasi - item.state.target < batasSelisihBawahEfektif(item.row)
        )).length;
        const bawahTargetStaf = rowsSimulasi.filter(item => (
            isStafDistribusi(item.row) &&
            Number.isFinite(batasSelisihBawahEfektif(item.row)) &&
            item.state.realisasi - item.state.target < batasSelisihBawahEfektif(item.row)
        )).length;
        const lewatLimit = isBatasanSimulasiAktif('batasSelisihAtas')
            ? rowsSimulasi.filter(item => item.state.realisasi - item.state.target > batasSelisihDistribusi).length
            : 0;
        const batasanTidakTerbaca = getBatasanUmumTidakTerbaca();

        if (batasanTidakTerbaca.length) {
            catatanValidasi.push({
                tipe: isKompromiOptimasi(opsi, 'batasanTidakTerbaca') ? 'warning' : 'danger',
                label: 'Batasan tambahan belum terbaca',
                value: isKompromiOptimasi(opsi, 'batasanTidakTerbaca')
                    ? `${batasanTidakTerbaca.length.toLocaleString('id-ID')} batasan belum diterapkan otomatis dan dikompromikan pada optimasi.`
                    : `${batasanTidakTerbaca.length.toLocaleString('id-ID')} batasan belum dapat diterapkan otomatis. Gunakan pola seperti "Staf maksimal 1 posisi" atau "Dosen boleh naik 2 level".`
            });
            if (!isKompromiOptimasi(opsi, 'batasanTidakTerbaca')) {
                pelanggaranMutlak.push('Ada batasan tambahan yang belum dapat dibaca sistem.');
                tambahRekomendasi('Standarkan penulisan batasan tambahan agar dapat dibaca sistem sebelum simulasi dijadikan final.');
            }
        }
        if (isBatasanSimulasiAktif('posisiKosongBolehTersisa') && !getBatasanSimulasi().posisiKosongBolehTersisa && slotKosong > 0) {
            catatanValidasi.push({
                tipe: isKompromiOptimasi(opsi, 'posisiKosong') ? 'info' : 'warning',
                label: 'Slot posisi kosong',
                value: `${slotKosong.toLocaleString('id-ID')} slot belum terpakai`
            });
            if (!isKompromiOptimasi(opsi, 'posisiKosong')) {
                pelanggaranMutlak.push('Slot posisi kosong belum boleh tersisa.');
                tambahRekomendasi('Jika posisi kosong tidak boleh tersisa, kurangi PKS yang ditetapkan atau tambah kebutuhan personil per role pada Perhitungan Dasar.');
            }
        }
        if (tanpaAlokasiDosen) {
            catatanValidasi.push({
                tipe: 'warning',
                label: 'Dosen tanpa alokasi',
                value: `${tanpaAlokasiDosen.toLocaleString('id-ID')} orang belum mendapat alokasi`
            });
            pelanggaranMutlak.push('Ada Dosen bertarget yang belum mendapat alokasi.');
            tambahRekomendasi('Perluas role yang boleh untuk Dosen atau lengkapi batasan Level Jabatan agar Dosen bertarget memiliki slot yang dapat digunakan.');
        }
        if (tanpaAlokasiStaf) {
            catatanValidasi.push({
                tipe: 'warning',
                label: 'Staf tanpa alokasi',
                value: `${tanpaAlokasiStaf.toLocaleString('id-ID')} orang belum mendapat alokasi${isBatasanSimulasiAktif('prioritasStafTargetTerbesar') && getBatasanSimulasi().prioritasStafTargetTerbesar ? ' setelah prioritas target terbesar' : ''}`
            });
            pelanggaranMutlak.push('Ada Staf bertarget yang belum mendapat alokasi.');
            tambahRekomendasi('Perluas role yang boleh untuk Staf atau evaluasi kembali Target Distribusi Staf yang belum mendapat alokasi.');
        }
        if (bawahTargetDosen) {
            catatanValidasi.push({
                tipe: 'danger',
                label: 'Dosen di bawah batas selisih',
                value: `${bawahTargetDosen.toLocaleString('id-ID')} orang`
            });
            pelanggaranMutlak.push('Ada Dosen yang berada di bawah batas selisih.');
            tambahRekomendasi('Untuk Dosen di bawah batas, tambah PKS yang ditetapkan, perluas role Dosen, atau sesuaikan target distribusi agar tetap berada dalam batas mutlak.');
        }
        if (bawahTargetStaf) {
            catatanValidasi.push({
                tipe: 'danger',
                label: 'Staf di bawah batas selisih',
                value: `${bawahTargetStaf.toLocaleString('id-ID')} orang`
            });
            pelanggaranMutlak.push('Ada Staf yang berada di bawah batas selisih.');
            tambahRekomendasi('Untuk Staf di bawah batas, tambah PKS yang ditetapkan, perluas role Staf, atau sesuaikan target distribusi Staf.');
        }
        if (lewatLimit) {
            catatanValidasi.push({
                tipe: isKompromiOptimasi(opsi, 'batasSelisihAtas') ? 'warning' : 'danger',
                label: 'Melewati batas selisih atas',
                value: isKompromiOptimasi(opsi, 'batasSelisihAtas')
                    ? `${lewatLimit.toLocaleString('id-ID')} pegawai di atas ${formatRupiahKomaDash(batasSelisihDistribusi)} sebagai kompromi optimasi.`
                    : `${lewatLimit.toLocaleString('id-ID')} pegawai di atas ${formatRupiahKomaDash(batasSelisihDistribusi)}`
            });
            if (!isKompromiOptimasi(opsi, 'batasSelisihAtas')) {
                pelanggaranMutlak.push('Ada pegawai yang melewati batas selisih atas.');
                tambahRekomendasi('Turunkan alokasi pada pegawai yang melewati batas, atau naikkan batas selisih atas jika kebijakan memperbolehkan toleransi lebih besar.');
            }
        }
        if (Array.isArray(opsi.catatanKompromi) && opsi.catatanKompromi.length) {
            opsi.catatanKompromi.forEach((value, index) => {
                catatanValidasi.push({
                    tipe: 'recommendation',
                    label: `Kompromi optimasi ${index + 1}`,
                    value
                });
            });
        }
        [...rekomendasiSimulasi].forEach((value, index) => {
            catatanValidasi.push({
                tipe: 'recommendation',
                label: `Rekomendasi ${index + 1}`,
                value
            });
        });

        return { catatanValidasi, pelanggaranMutlak, slotKosong, batasKebutuhanPks };
    }

    function cloneRowsSimulasiDistribusi(rowsSimulasi = []) {
        return rowsSimulasi.map(item => ({
            ...item,
            state: {
                ...item.state,
                monthsByRole: { ...(item.state?.monthsByRole || {}) }
            },
            itemRolesNormal: [...(item.itemRolesNormal || [])]
        }));
    }

    function cloneKapasitasSlotRoleDistribusi(kapasitas = {}) {
        return Object.fromEntries(rolePlottingKerma.map(role => [role, Number(kapasitas[role]) || 0]));
    }

    function hitungKebutuhanPksDariRowsSimulasi(rowsSimulasi = []) {
        const totalSlotPerRole = Object.fromEntries(rolePlottingKerma.map(role => [role, 0]));
        let maxSlotPerPegawai = 0;
        let hasDistribusi = false;

        rowsSimulasi.forEach(item => {
            const state = item.state || {};
            const slotPegawai = rolePlottingKerma.reduce((sum, role) => {
                const slots = hitungSlotPksDariBulan(state.monthsByRole?.[role] || 0, role);
                if (slots > 0) hasDistribusi = true;
                totalSlotPerRole[role] += slots;
                return sum + slots;
            }, 0);
            maxSlotPerPegawai = Math.max(maxSlotPerPegawai, slotPegawai);
        });

        const kebutuhanPerRole = rolePlottingKerma.reduce((max, role) => {
            const { personilPerKerma } = getKonfigurasiRoleDistribusi(role);
            return Math.max(max, Math.ceil(totalSlotPerRole[role] / personilPerKerma));
        }, 0);

        return {
            hasDistribusi,
            jumlah: Math.max(maxSlotPerPegawai, kebutuhanPerRole),
            maxSlotPerPegawai,
            kebutuhanPerRole,
            totalSlotPerRole
        };
    }

    function getTahapanRelaksasiOptimasiDistribusi() {
        const batasAtas = Number.isFinite(batasSelisihDistribusi) ? Math.max(0, batasSelisihDistribusi || 0) : 0;
        const tambahanRingan = Math.max(500000, Math.round(batasAtas * 0.5));
        const tambahanSedang = Math.max(1500000, Math.round(batasAtas * 1.5));
        return [
            {
                id: 'strict',
                label: 'Patuh seluruh batasan',
                opsi: {}
            },
            {
                id: 'slot-kosong',
                label: 'Relaksasi posisi kosong',
                opsi: {
                    kompromi: ['posisiKosong'],
                    catatanKompromi: ['Slot posisi kosong dikompromikan lebih dulu karena tidak menambah pembayaran atau melanggar kapasitas PKS.']
                }
            },
            {
                id: 'batas-atas-ringan',
                label: `Relaksasi batas selisih atas sampai ${formatRupiahKomaDash(batasAtas + tambahanRingan)}`,
                opsi: {
                    tambahanBatasSelisihAtas: tambahanRingan,
                    kompromi: ['posisiKosong', 'batasSelisihAtas'],
                    catatanKompromi: [
                        'Slot posisi kosong dapat tersisa.',
                        `Batas selisih atas dilonggarkan bertahap sampai ${formatRupiahKomaDash(batasAtas + tambahanRingan)}.`
                    ]
                }
            },
            {
                id: 'batas-atas-sedang',
                label: `Relaksasi batas selisih atas sampai ${formatRupiahKomaDash(batasAtas + tambahanSedang)}`,
                opsi: {
                    tambahanBatasSelisihAtas: tambahanSedang,
                    kompromi: ['posisiKosong', 'batasSelisihAtas'],
                    catatanKompromi: [
                        'Slot posisi kosong dapat tersisa.',
                        `Batas selisih atas dilonggarkan lebih jauh sampai ${formatRupiahKomaDash(batasAtas + tambahanSedang)}.`
                    ]
                }
            },
            {
                id: 'batas-atas-terbuka',
                label: 'Relaksasi batas selisih atas secukupnya',
                opsi: {
                    abaikanBatasSelisihAtas: true,
                    kompromi: ['posisiKosong', 'batasSelisihAtas'],
                    catatanKompromi: [
                        'Slot posisi kosong dapat tersisa.',
                        'Batas selisih atas menjadi batas yang dikompromikan agar target tidak minus dan kapasitas PKS tetap terjaga.'
                    ]
                }
            },
            {
                id: 'batasan-tambahan-catatan',
                label: 'Batasan tambahan belum terbaca menjadi catatan',
                opsi: {
                    abaikanBatasSelisihAtas: true,
                    kompromi: ['posisiKosong', 'batasSelisihAtas', 'batasanTidakTerbaca'],
                    catatanKompromi: [
                        'Slot posisi kosong dapat tersisa.',
                        'Batas selisih atas dikompromikan.',
                        'Batasan tambahan yang belum terbaca sistem diperlakukan sebagai catatan optimasi, bukan pengunci hasil.'
                    ]
                }
            }
        ];
    }

    function jalankanOptimasiRowsDistribusi(rowsSimulasi, kapasitasSlotRole, batasKebutuhanPks, itemRoles, opsi = {}) {
        let adaPerubahan = false;
        let adaProgress = true;
        let guard = 0;
        while (adaProgress && guard < 6) {
            guard += 1;
            adaProgress = false;
            rowsSimulasi.sort(bandingkanPrioritasSimulasiDistribusi).forEach(item => {
                const slot = pilihSlotDistribusiTerbaik(item.row, item.state, item.itemRolesNormal, kapasitasSlotRole, batasKebutuhanPks, false, opsi);
                if (terapkanSlotDistribusi(item.state, slot, kapasitasSlotRole)) {
                    adaProgress = true;
                    adaPerubahan = true;
                }
            });
            if (jalankanRebalanceDistribusi(rowsSimulasi, kapasitasSlotRole, batasKebutuhanPks, itemRoles, opsi)) {
                adaProgress = true;
                adaPerubahan = true;
            }
        }
        const slotKosongProgress = jalankanAlokasiDosenSlotKosong(rowsSimulasi, kapasitasSlotRole, itemRoles, batasKebutuhanPks, opsi);
        const rebalanceAkhir = jalankanRebalanceDistribusi(rowsSimulasi, kapasitasSlotRole, batasKebutuhanPks, itemRoles, opsi);
        return slotKosongProgress || rebalanceAkhir || adaPerubahan;
    }

    function simulasikanTargetDistribusi() {
        const itemRoles = getItemSimulasiDistribusi();
        if (!itemRoles.length) {
            setStatusSimulasiDistribusi('Isi tarif dan durasi jabatan terlebih dahulu.', true);
            return;
        }

        let jumlahDisimulasikan = 0;
        const levelTerlewat = new Set();
        const batasKebutuhanPks = hitungBatasPksSimulasiPlotting();
        if (batasKebutuhanPks <= 0) {
            setStatusSimulasiDistribusi('Isi PKS yang ditetapkan atau simpan Perhitungan Dasar terlebih dahulu sebagai batas simulasi.', true);
            return;
        }
        const kapasitasSlotRole = Object.fromEntries(rolePlottingKerma.map(role => {
            const { personilPerKerma } = getKonfigurasiRoleDistribusi(role);
            return [role, batasKebutuhanPks * personilPerKerma];
        }));
        const rowsSimulasi = plottingKermaRows
            .map((row, rowIndex) => ({ row, rowIndex }))
            .filter(({ row }) => row.status === 'Aktif' && hitungTargetDistribusiRow(row) > 0)
            .map(({ row, rowIndex }) => ({
                row,
                rowIndex,
                state: buatStateAlokasiDistribusi(row),
                itemRolesNormal: getItemSimulasiUntukRow(row, itemRoles, levelTerlewat)
            }));
        const snapshotSebelum = new Map(plottingKermaRows.map(row => {
            const roles = pastikanDistribusiRoles(row);
            return [row, Object.fromEntries(rolePlottingKerma.map(role => [role, roles[role] || '']))];
        }));

        plottingKermaRows
            .filter(row => row.status === 'Aktif')
            .forEach(row => {
                const roles = pastikanDistribusiRoles(row);
                rolePlottingKerma.forEach(role => { roles[role] = ''; });
            });

        jalankanAlokasiDistribusi(rowsSimulasi, kapasitasSlotRole, batasKebutuhanPks, itemRoles);
        jumlahDisimulasikan = rowsSimulasi.filter(item => item.state.slots > 0).length;

        rowsSimulasi.forEach(({ row, state, itemRolesNormal }) => {
            const roles = pastikanDistribusiRoles(row);
            rolePlottingKerma.forEach(role => {
                const item = itemRolesNormal.find(roleItem => roleItem.role === role)
                    || itemRoles.find(roleItem => roleItem.role === role);
                if (!item) {
                    roles[role] = '';
                    return;
                }
                roles[role] = formatNilaiSimulasiDistribusi(state.monthsByRole[role] || 0, item.durasi);
            });
        });
        const totalSelisih = rowsSimulasi
            .reduce((sum, item) => sum + Math.max(0, item.state.realisasi - item.state.target), 0);
        const tanpaAlokasiDosen = rowsSimulasi.filter(item => isDosenDistribusi(item.row) && item.state.slots === 0).length;
        const tanpaAlokasiStaf = rowsSimulasi.filter(item => isStafDistribusi(item.row) && item.state.slots === 0).length;
        const slotKosong = Object.values(kapasitasSlotRole).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
        const bawahTargetDosen = rowsSimulasi.filter(item => (
            isDosenDistribusi(item.row) &&
            Number.isFinite(batasSelisihBawahEfektif(item.row)) &&
            item.state.realisasi - item.state.target < batasSelisihBawahEfektif(item.row)
        )).length;
        const bawahTargetStaf = rowsSimulasi.filter(item => (
            isStafDistribusi(item.row) &&
            Number.isFinite(batasSelisihBawahEfektif(item.row)) &&
            item.state.realisasi - item.state.target < batasSelisihBawahEfektif(item.row)
        )).length;
        const lewatLimit = isBatasanSimulasiAktif('batasSelisihAtas')
            ? rowsSimulasi.filter(item => item.state.realisasi - item.state.target > batasSelisihDistribusi).length
            : 0;
        const kebutuhanSimulasi = hitungKebutuhanPksBerdasarkanDistribusi().jumlah;
        const catatanValidasi = [];
        const pelanggaranMutlak = [];
        const rekomendasiSimulasi = new Set();
        const tambahRekomendasi = value => {
            if (value) rekomendasiSimulasi.add(value);
        };
        const batasanTidakTerbaca = getBatasanUmumTidakTerbaca();
        if (batasanTidakTerbaca.length) {
            catatanValidasi.push({
                tipe: 'danger',
                label: 'Batasan tambahan belum terbaca',
                value: `${batasanTidakTerbaca.length.toLocaleString('id-ID')} batasan belum dapat diterapkan otomatis. Gunakan pola seperti "Staf maksimal 1 posisi" atau "Dosen boleh naik 2 level".`
            });
            pelanggaranMutlak.push('Ada batasan tambahan yang belum dapat dibaca sistem.');
            tambahRekomendasi('Standarkan penulisan batasan tambahan agar dapat dibaca sistem sebelum simulasi dijadikan final.');
        }
        if (isBatasanSimulasiAktif('posisiKosongBolehTersisa') && !getBatasanSimulasi().posisiKosongBolehTersisa && slotKosong > 0) {
            catatanValidasi.push({
                tipe: 'warning',
                label: 'Slot posisi kosong',
                value: `${slotKosong.toLocaleString('id-ID')} slot belum terpakai`
            });
            pelanggaranMutlak.push('Slot posisi kosong belum boleh tersisa.');
            tambahRekomendasi('Jika posisi kosong tidak boleh tersisa, kurangi PKS yang ditetapkan atau tambah kebutuhan personil per role pada Perhitungan Dasar.');
        }
        if (tanpaAlokasiDosen) {
            catatanValidasi.push({
                tipe: 'warning',
                label: 'Dosen tanpa alokasi',
                value: `${tanpaAlokasiDosen.toLocaleString('id-ID')} orang belum mendapat alokasi`
            });
            pelanggaranMutlak.push('Ada Dosen bertarget yang belum mendapat alokasi.');
            tambahRekomendasi('Perluas role yang boleh untuk Dosen atau lengkapi batasan Level Jabatan agar Dosen bertarget memiliki slot yang dapat digunakan.');
        }
        if (tanpaAlokasiStaf) {
            catatanValidasi.push({
                tipe: 'warning',
                label: 'Staf tanpa alokasi',
                value: `${tanpaAlokasiStaf.toLocaleString('id-ID')} orang belum mendapat alokasi${isBatasanSimulasiAktif('prioritasStafTargetTerbesar') && getBatasanSimulasi().prioritasStafTargetTerbesar ? ' setelah prioritas target terbesar' : ''}`
            });
            pelanggaranMutlak.push('Ada Staf bertarget yang belum mendapat alokasi.');
            tambahRekomendasi('Perluas role yang boleh untuk Staf atau evaluasi kembali Target Distribusi Staf yang belum mendapat alokasi.');
        }
        if (bawahTargetDosen) {
            catatanValidasi.push({
                tipe: 'danger',
                label: 'Dosen di bawah batas selisih',
                value: `${bawahTargetDosen.toLocaleString('id-ID')} orang`
            });
            pelanggaranMutlak.push('Ada Dosen yang berada di bawah batas selisih.');
            tambahRekomendasi('Untuk Dosen di bawah batas, tambah PKS yang ditetapkan, perluas role Dosen, atau sesuaikan target distribusi agar tetap berada dalam batas mutlak.');
        }
        if (bawahTargetStaf) {
            catatanValidasi.push({
                tipe: 'danger',
                label: 'Staf di bawah batas selisih',
                value: `${bawahTargetStaf.toLocaleString('id-ID')} orang`
            });
            pelanggaranMutlak.push('Ada Staf yang berada di bawah batas selisih.');
            tambahRekomendasi('Untuk Staf di bawah batas, tambah PKS yang ditetapkan, perluas role Staf, atau sesuaikan target distribusi Staf.');
        }
        if (lewatLimit) {
            catatanValidasi.push({
                tipe: 'danger',
                label: 'Melewati batas selisih atas',
                value: `${lewatLimit.toLocaleString('id-ID')} pegawai di atas ${formatRupiahKomaDash(batasSelisihDistribusi)}`
            });
            pelanggaranMutlak.push('Ada pegawai yang melewati batas selisih atas.');
            tambahRekomendasi('Turunkan alokasi pada pegawai yang melewati batas, atau naikkan batas selisih atas jika kebijakan memperbolehkan toleransi lebih besar.');
        }
        if (levelTerlewat.size) {
            catatanValidasi.push({
                tipe: 'info',
                label: 'Level belum masuk aturan',
                value: `${[...levelTerlewat].slice(0, 5).join(', ')}${levelTerlewat.size > 5 ? ', dst.' : ''}`
            });
            pelanggaranMutlak.push('Ada level jabatan yang belum masuk aturan simulasi.');
            tambahRekomendasi('Tambahkan level yang belum masuk aturan pada tabel Batasan Level Jabatan agar simulasi dapat mengalokasikan role secara konsisten.');
        }
        [...rekomendasiSimulasi].forEach((value, index) => {
            catatanValidasi.push({
                tipe: 'recommendation',
                label: `Rekomendasi ${index + 1}`,
                value
            });
        });
        const dataHasilSimulasi = {
            jumlahDisimulasikan,
            kebutuhanSimulasi,
            batasKebutuhanPks,
            totalSelisih,
            catatan: catatanValidasi,
            impossible: false
        };
        const simulasiTidakMemungkinkan = pelanggaranMutlak.length > 0;
        if (simulasiTidakMemungkinkan) {
            dataHasilSimulasi.impossible = true;
            hasilSimulasiTertunda = {
                snapshotSebelum,
                data: dataHasilSimulasi,
                isError: true
            };
            renderStatusSimulasiDistribusi(dataHasilSimulasi, true, { impossible: true });
            return;
        }
        hasilSimulasiTertunda = null;
        simpanPlottingKerma();
        renderTargetDistribusiPlotting();
        updateRingkasanDasarPlotting();
        renderStatusSimulasiDistribusi(dataHasilSimulasi, false);
    }

    function jalankanOptimalkanDistribusiSaatIni() {
        const itemRoles = getItemSimulasiDistribusi();
        if (!itemRoles.length) {
            setStatusSimulasiDistribusi('Isi tarif dan durasi jabatan terlebih dahulu.', true);
            return;
        }
        const batasKebutuhanPks = hitungBatasPksSimulasiPlotting();
        if (batasKebutuhanPks <= 0) {
            setStatusSimulasiDistribusi('Isi PKS yang ditetapkan atau simpan Perhitungan Dasar terlebih dahulu sebagai batas optimasi.', true);
            return;
        }

        const snapshotSebelum = new Map(plottingKermaRows.map(row => {
            const roles = pastikanDistribusiRoles(row);
            return [row, Object.fromEntries(rolePlottingKerma.map(role => [role, roles[role] || '']))];
        }));
        const levelTerlewat = new Set();
        const kapasitasSlotRole = hitungKapasitasSisaRoleDistribusi(batasKebutuhanPks);
        const rowsDasarSimulasi = plottingKermaRows
            .map((row, rowIndex) => ({ row, rowIndex }))
            .filter(({ row }) => row.status === 'Aktif' && hitungTargetDistribusiRow(row) > 0)
            .map(({ row, rowIndex }) => ({
                row,
                rowIndex,
                state: buatStateAlokasiDariRowDistribusi(row),
                itemRolesNormal: getItemSimulasiUntukRow(row, itemRoles, levelTerlewat)
            }));

        let hasilTerpilih = null;
        let hasilSementara = null;
        getTahapanRelaksasiOptimasiDistribusi().some(tahap => {
            const rowsSimulasi = cloneRowsSimulasiDistribusi(rowsDasarSimulasi);
            const kapasitasTahap = cloneKapasitasSlotRoleDistribusi(kapasitasSlotRole);
            const adaPerubahan = jalankanOptimasiRowsDistribusi(rowsSimulasi, kapasitasTahap, batasKebutuhanPks, itemRoles, tahap.opsi);
            if (!adaPerubahan) return false;

            const { catatanValidasi, pelanggaranMutlak } = buatCatatanValidasiDistribusi(rowsSimulasi, kapasitasTahap, batasKebutuhanPks, tahap.opsi);
            if (levelTerlewat.size) {
                catatanValidasi.push({
                    tipe: 'info',
                    label: 'Level belum masuk aturan',
                    value: `${[...levelTerlewat].slice(0, 5).join(', ')}${levelTerlewat.size > 5 ? ', dst.' : ''}`
                });
                pelanggaranMutlak.push('Ada level jabatan yang belum masuk aturan simulasi.');
            }
            if (tahap.id !== 'strict') {
                catatanValidasi.push({
                    tipe: 'recommendation',
                    label: 'Tahap optimasi',
                    value: tahap.label
                });
            }

            const kebutuhanTahap = hitungKebutuhanPksDariRowsSimulasi(rowsSimulasi).jumlah;
            const dataHasilOptimasi = {
                jumlahDisimulasikan: rowsSimulasi.filter(item => item.state.slots > 0).length,
                kebutuhanSimulasi: kebutuhanTahap,
                batasKebutuhanPks,
                totalSelisih: rowsSimulasi.reduce((sum, item) => sum + Math.max(0, item.state.realisasi - item.state.target), 0),
                catatan: catatanValidasi,
                impossible: false
            };
            const hasil = { rowsSimulasi, dataHasilOptimasi, pelanggaranMutlak, tahap };
            if (!hasilSementara || pelanggaranMutlak.length < hasilSementara.pelanggaranMutlak.length) hasilSementara = hasil;
            if (pelanggaranMutlak.length === 0) {
                hasilTerpilih = hasil;
                return true;
            }
            return false;
        });

        if (!hasilTerpilih && !hasilSementara) {
            setStatusSimulasiDistribusi('Belum ada perubahan optimasi yang dapat dilakukan, termasuk dengan relaksasi bertahap.', true);
            return;
        }

        const hasilFinal = hasilTerpilih || hasilSementara;
        tulisHasilRowsSimulasi(hasilFinal.rowsSimulasi, itemRoles);
        if (hasilFinal.pelanggaranMutlak.length > 0) {
            hasilFinal.dataHasilOptimasi.impossible = true;
            hasilSimulasiTertunda = {
                snapshotSebelum,
                data: hasilFinal.dataHasilOptimasi,
                isError: true
            };
            renderStatusSimulasiDistribusi(hasilFinal.dataHasilOptimasi, true, { impossible: true });
            return;
        }
        hasilSimulasiTertunda = null;
        simpanPlottingKerma();
        renderTargetDistribusiPlotting();
        updateRingkasanDasarPlotting();
        renderStatusSimulasiDistribusi(hasilFinal.dataHasilOptimasi, hasilFinal.tahap.id !== 'strict');
    }

    async function optimalkanDistribusiSaatIni() {
        const labelAwal = btnOptimalkanDistribusi?.textContent || 'Optimalkan';
        if (btnOptimalkanDistribusi) {
            btnOptimalkanDistribusi.disabled = true;
            btnOptimalkanDistribusi.textContent = 'Mengoptimalkan...';
        }
        setStatusSimulasiDistribusi('Optimasi sedang diproses. Sistem sedang mencari komposisi distribusi terbaik...');
        await new Promise(resolve => setTimeout(resolve, 20));
        try {
            jalankanOptimalkanDistribusiSaatIni();
        } finally {
            if (btnOptimalkanDistribusi) {
                btnOptimalkanDistribusi.disabled = false;
                btnOptimalkanDistribusi.textContent = labelAwal;
            }
        }
    }

    function resetSimulasiDistribusi() {
        plottingKermaRows.forEach(row => {
            const roles = pastikanDistribusiRoles(row);
            rolePlottingKerma.forEach(role => { roles[role] = ''; });
        });
        simpanPlottingKerma();
        renderTargetDistribusiPlotting();
        updateRingkasanDasarPlotting();
        setStatusSimulasiDistribusi('Hasil simulasi dikosongkan. Klik Simulasi untuk menghitung ulang.');
    }

    function hitungSelisihDistribusiRow(row) {
        return hitungRealisasiDistribusiRow(row) - hitungTargetDistribusiRow(row);
    }

    function hitungTotalTargetDistribusiPlotting() {
        return plottingKermaRows.reduce((sum, row) => sum + hitungTargetDistribusiRow(row), 0);
    }

    function getRowsTargetDistribusiAktif() {
        return plottingKermaRows.filter(row => row.status === 'Aktif' && hitungTargetDistribusiRow(row) > 0);
    }

    function hitungTotalRealisasiDistribusiPlotting() {
        return getRowsTargetDistribusiAktif().reduce((sum, row) => sum + hitungRealisasiDistribusiRow(row), 0);
    }

    function hitungTotalSelisihDistribusiPlotting() {
        return hitungTotalRealisasiDistribusiPlotting() - hitungTotalTargetDistribusiPlotting();
    }

    function updateRingkasanTargetDistribusiPlotting() {
        const totalRealisasi = hitungTotalRealisasiDistribusiPlotting();
        const totalSelisih = totalRealisasi - hitungTotalTargetDistribusiPlotting();
        if (totalRealisasiDistribusiPlotting) {
            totalRealisasiDistribusiPlotting.textContent = formatRupiahKomaDash(totalRealisasi);
        }
        if (totalSelisihDistribusiPlotting) {
            totalSelisihDistribusiPlotting.textContent = formatRupiahKomaDash(totalSelisih);
            const melewatiBawah = isBatasanSimulasiAktif('batasSelisihBawah') && totalSelisih < -batasSelisihBawahDistribusi;
            const melewatiAtas = isBatasanSimulasiAktif('batasSelisihAtas') && totalSelisih > batasSelisihDistribusi;
            totalSelisihDistribusiPlotting.classList.toggle('is-negative', melewatiBawah);
            totalSelisihDistribusiPlotting.classList.toggle('is-warning', melewatiAtas);
            totalSelisihDistribusiPlotting.classList.toggle('is-positive', !melewatiBawah && !melewatiAtas);
        }
    }

    function hitungTotalKebutuhanPksDasar(totalPerKerma = hitungTotalPerKermaPlotting()) {
        const target = hitungTotalTargetDistribusiPlotting();
        if (target <= 0 || totalPerKerma <= 0) return 0;
        return Math.max(1, Math.round(target / totalPerKerma));
    }

    function hitungTotalKebutuhanPksPlotting() {
        return hitungTotalKebutuhanPksDasar();
    }

    function hitungPksDitetapkanPlotting() {
        return Math.max(0, Math.round(Number(jumlahPksDitetapkanPlotting) || 0));
    }

    function hitungBatasPksSimulasiPlotting() {
        const ditetapkan = hitungPksDitetapkanPlotting();
        if (isBatasanSimulasiAktif('batasiPksDitetapkan') && getBatasanSimulasi().batasiPksDitetapkan) return ditetapkan;
        const dasar = hitungTotalKebutuhanPksDasar(totalPerKermaTersimpan || hitungTotalPerKermaPlotting());
        return Math.max(ditetapkan, dasar);
    }

    function formatJumlahPks(value) {
        return `${Math.round(Number(value) || 0).toLocaleString('id-ID')} PKS`;
    }

    function updateRingkasanSimulasiDistribusi() {
        const dasar = hitungTotalKebutuhanPksDasar(totalPerKermaTersimpan || hitungTotalPerKermaPlotting());
        const ditetapkan = hitungPksDitetapkanPlotting();
        const batasPks = hitungBatasPksSimulasiPlotting();
        const simulasi = hitungKebutuhanPksBerdasarkanDistribusi();
        if (kebutuhanPksDasarTargetPlotting) kebutuhanPksDasarTargetPlotting.textContent = dasar > 0 ? formatJumlahPks(dasar) : '-';
        if (kebutuhanPksSimulasiPlotting) kebutuhanPksSimulasiPlotting.textContent = simulasi.hasDistribusi ? formatJumlahPks(simulasi.jumlah) : '-';
        if (pksDitetapkanPlotting && pksDitetapkanPlotting.value !== String(ditetapkan || '')) {
            pksDitetapkanPlotting.value = ditetapkan || '';
        }
        if (!validasiPksSimulasiPlotting) return;

        validasiPksSimulasiPlotting.classList.remove('is-match', 'is-warning');
        if (isBatasanSimulasiAktif('batasiPksDitetapkan') && getBatasanSimulasi().batasiPksDitetapkan && ditetapkan <= 0) {
            validasiPksSimulasiPlotting.textContent = 'Isi PKS ditetapkan';
            validasiPksSimulasiPlotting.classList.add('is-warning');
            return;
        }
        if (!simulasi.hasDistribusi) {
            validasiPksSimulasiPlotting.textContent = 'Belum ada simulasi';
            return;
        }

        if (simulasi.jumlah <= batasPks) {
            validasiPksSimulasiPlotting.textContent = 'Dalam batas';
            validasiPksSimulasiPlotting.classList.add('is-match');
            return;
        }

        const selisih = simulasi.jumlah - batasPks;
        validasiPksSimulasiPlotting.textContent = `Melebihi batas PKS (+${selisih.toLocaleString('id-ID')} PKS)`;
        validasiPksSimulasiPlotting.classList.add('is-warning');
    }

    function hitungSlotTerpakaiRoleDistribusi(role) {
        return plottingKermaRows.reduce((sum, row) => {
            if (row.status !== 'Aktif') return sum;
            if (hitungTargetDistribusiRow(row) <= 0) return sum;
            const roles = pastikanDistribusiRoles(row);
            return sum + hitungSlotPksDistribusi(roles[role], role);
        }, 0);
    }

    function updateKapasitasRoleTargetDistribusi() {
        const totalPks = hitungBatasPksSimulasiPlotting();
        document.querySelectorAll('[data-target-role-capacity]').forEach(el => {
            const role = el.dataset.targetRoleCapacity;
            const { personilPerKerma } = getKonfigurasiRoleDistribusi(role);
            const kapasitas = totalPks > 0 ? totalPks * personilPerKerma : 0;
            const terpakai = kapasitas > 0 ? hitungSlotTerpakaiRoleDistribusi(role) : 0;
            const sisa = kapasitas - terpakai;
            el.textContent = kapasitas > 0 ? `${Math.max(0, sisa).toLocaleString('id-ID')} kosong` : '-';
            el.classList.toggle('is-over-capacity', sisa < 0);
            el.title = kapasitas > 0
                ? `${totalPks.toLocaleString('id-ID')} PKS x ${personilPerKerma.toLocaleString('id-ID')} personil per kerma = ${kapasitas.toLocaleString('id-ID')} slot. Terpakai ${terpakai.toLocaleString('id-ID')}, sisa ${Math.max(0, sisa).toLocaleString('id-ID')} kosong${sisa < 0 ? `, kelebihan ${Math.abs(sisa).toLocaleString('id-ID')}` : ''}. Validasi sisa posisi mengikuti Batasan Simulasi.`
                : 'Belum ada kapasitas. Isi dan simpan Perhitungan Dasar terlebih dahulu.';
        });
    }

    function updateVisibilitasDaftarPksPlotting() {
        if (!tabDaftarPksPlotting) return;
        tabDaftarPksPlotting.hidden = true;
        tabDaftarPksPlotting.setAttribute('aria-disabled', 'true');
        tabDaftarPksPlotting.setAttribute('aria-hidden', 'true');
        tabDaftarPksPlotting.tabIndex = -1;
    }

    function setTooltipPerhitunganDasar(message) {
        if (!statusSimpanPerhitunganDasar) return;
        statusSimpanPerhitunganDasar.textContent = 'i';
        statusSimpanPerhitunganDasar.setAttribute('data-tooltip', message);
        statusSimpanPerhitunganDasar.setAttribute('aria-label', message);
    }

    function updateStatusPerhitunganDasar() {
        const totalLive = hitungTotalPerKermaPlotting();
        updateVisibilitasDaftarPksPlotting();
        if (btnSimpanPerhitunganDasar) btnSimpanPerhitunganDasar.disabled = totalLive <= 0;
        if (totalLive <= 0) {
            setTooltipPerhitunganDasar('Pilih periode Tim Pengelola Kerma terlebih dahulu, lalu isi personil per kerma untuk menghitung Total per Kerma.');
        } else if (perhitunganDasarTersimpan) {
            const jumlahTerpilih = hitungJumlahPksTerpilihPlotting();
            const kebutuhan = hitungKuotaPilihanPksPlotting();
            const infoPilihan = kebutuhan > 0
                ? ` ${jumlahTerpilih.toLocaleString('id-ID')} dari ${kebutuhan.toLocaleString('id-ID')} PKS dipilih.`
                : '';
            setTooltipPerhitunganDasar(`Perhitungan tersimpan. Minimal sisa anggaran PKS: ${formatRupiahKomaDash(totalPerKermaTersimpan)}.${infoPilihan}`);
        } else {
            setTooltipPerhitunganDasar('Daftar PKS tampil berdasarkan Total per Kerma saat ini. Klik Simpan untuk menetapkan PKS yang dipilih.');
        }
    }

    function updateRingkasanDasarPlotting() {
        if (totalPerKermaPlotting) totalPerKermaPlotting.textContent = formatRupiahKomaDash(hitungTotalPerKermaPlotting());
        if (targetDistribusiPlotting) targetDistribusiPlotting.textContent = formatRupiahKomaDash(hitungTotalTargetDistribusiPlotting());
        if (totalKebutuhanPksPlotting) {
            totalKebutuhanPksPlotting.textContent = hitungTotalPerKermaPlotting() > 0
                ? formatJumlahPks(hitungTotalKebutuhanPksPlotting())
                : 'Simpan dulu';
        }
        if (totalPengelolaKermaPlotting) {
            totalPengelolaKermaPlotting.textContent = hitungTotalPengelolaKermaPlotting().toLocaleString('id-ID');
        }
        if (totalPosisiTersediaPlotting) {
            totalPosisiTersediaPlotting.textContent = hitungTotalPosisiTersediaPlotting().toLocaleString('id-ID', { maximumFractionDigits: 2 });
        }
        updateKapasitasRoleTargetDistribusi();
        updateRingkasanSimulasiDistribusi();
        updateRingkasanTargetDistribusiPlotting();
        updateStatusPerhitunganDasar();
        if (tabAktifPlottingKerma === 'dasar') renderDaftarPksPlotting();
    }

    function syncPksDitetapkanPlotting() {
        jumlahPksDitetapkanPlotting = Math.max(0, Math.round(Number(pksDitetapkanPlotting?.value) || 0));
        if (pksDitetapkanPlotting) pksDitetapkanPlotting.value = jumlahPksDitetapkanPlotting || '';
        simpanPlottingKerma();
        updateSemuaTotalHargaJabatan();
        updateRingkasanDasarPlotting();
        renderDaftarPksPlotting();
    }

    function updateTotalHargaJabatan(rowIndex) {
        const row = perhitunganDasarPlotting.rows[rowIndex];
        if (!row || !bodyTabelHargaJabatan) return;
        const totalCell = bodyTabelHargaJabatan.querySelector(`[data-harga-total-row="${rowIndex}"]`);
        const orangCell = bodyTabelHargaJabatan.querySelector(`[data-harga-orang-row="${rowIndex}"]`);
        if (totalCell) totalCell.textContent = formatRupiahKomaDash(hitungTotalRupiahJabatan(row));
        if (orangCell) orangCell.textContent = hitungJumlahOrangJabatan(row).toLocaleString('id-ID', { maximumFractionDigits: 2 });
        updateRingkasanDasarPlotting();
        updateSemuaTargetDistribusiRows();
    }

    function updateSemuaTotalHargaJabatan() {
        perhitunganDasarPlotting.rows.forEach((_, index) => updateTotalHargaJabatan(index));
        updateRingkasanDasarPlotting();
    }

    function tandaiPerhitunganDasarBerubah() {
        perhitunganDasarTersimpan = false;
        totalPerKermaTersimpan = 0;
        daftarPksTerpilihPlotting = [];
        simpanPlottingKerma();
        updateVisibilitasDaftarPksPlotting();
        renderDaftarPksPlotting();
    }

    function simpanPerhitunganDasarPlotting() {
        pastikanRowsPerhitunganDasarPlotting();
        const total = hitungTotalPerKermaPlotting();
        if (total <= 0) {
            updateRingkasanDasarPlotting();
            return;
        }
        perhitunganDasarTersimpan = true;
        totalPerKermaTersimpan = total;
        const jumlahKebutuhan = hitungKuotaPilihanPksPlotting(total);
        if (dataSisaAnggaranPlottingDimuat && !pesanErrorDaftarPksPlotting) {
            sinkronPilihanDaftarPks(getDaftarPksDapatDialokasikan());
        }
        const jumlahTerpilih = hitungJumlahPksTerpilihPlotting();
        jumlahPksDitetapkanPlotting = jumlahTerpilih > 0 ? jumlahTerpilih : jumlahKebutuhan;
        if (jumlahKebutuhan > jumlahPksPlotting) {
            jumlahPksPlotting = jumlahKebutuhan;
            plottingKermaRows.forEach(pastikanPksPlotting);
        }
        if (jumlahPksDitetapkanPlotting > 0 && jumlahPksDitetapkanPlotting !== jumlahPksPlotting) {
            jumlahPksPlotting = jumlahPksDitetapkanPlotting;
            plottingKermaRows.forEach(pastikanPksPlotting);
        }
        simpanPlottingKerma();
        updateVisibilitasDaftarPksPlotting();
        renderPerhitunganDasarPlotting();
        if (tabAktifPlottingKerma === 'plot') renderPlottingKerma();
    }

    function sinkronTarifMasterKeRows() {
        pastikanRowsPerhitunganDasarPlotting();
        perhitunganDasarPlotting.rows.forEach(row => {
            row.tarif = tarifMasterJabatanPlotting[row.jabatan] ?? 0;
        });
    }

    function updateTampilanTombolMasterTarif() {
        if (!btnEditMasterTarif) return;
        btnEditMasterTarif.textContent = modeEditMasterTarif ? 'Simpan Master Tarif' : 'Edit Master Tarif';
        btnEditMasterTarif.classList.toggle('is-active', modeEditMasterTarif);
    }

    function updateCollapseHargaJabatan() {
        if (panelHargaJabatanTable) panelHargaJabatanTable.hidden = hargaJabatanCollapsed;
        if (!btnToggleHargaJabatan) return;
        btnToggleHargaJabatan.textContent = hargaJabatanCollapsed ? 'Tampilkan Tabel' : 'Sembunyikan Tabel';
        btnToggleHargaJabatan.setAttribute('aria-expanded', hargaJabatanCollapsed ? 'false' : 'true');
        btnToggleHargaJabatan.classList.toggle('is-active', hargaJabatanCollapsed);
    }

    function toggleCollapseHargaJabatan() {
        hargaJabatanCollapsed = !hargaJabatanCollapsed;
        updateCollapseHargaJabatan();
        simpanPlottingKerma();
    }

    function toggleEditMasterTarif() {
        pastikanRowsPerhitunganDasarPlotting();
        if (modeEditMasterTarif) {
            perhitunganDasarPlotting.rows.forEach(row => {
                tarifMasterJabatanPlotting[row.jabatan] = tarifPlotting(row.tarif);
                row.tarif = tarifMasterJabatanPlotting[row.jabatan];
            });
            tandaiPerhitunganDasarBerubah();
            modeEditMasterTarif = false;
        } else {
            sinkronTarifMasterKeRows();
            modeEditMasterTarif = true;
        }
        updateTampilanTombolMasterTarif();
        renderPerhitunganDasarPlotting();
        updateSemuaTargetDistribusiRows();
    }

	    function renderPerhitunganDasarPlotting() {
	        if (!bodyTabelHargaJabatan) return;
	        pastikanRowsPerhitunganDasarPlotting();
	        sinkronDurasiDariPeriodePengelola();
	        updateTampilanPeriodePengelola();
	        updateTampilanTombolMasterTarif();
	        updateCollapseHargaJabatan();

	        bodyTabelHargaJabatan.innerHTML = perhitunganDasarPlotting.rows.map((row, index) => `
	            <tr>
	                <td>
	                    <strong>${esc(`${labelJabatanPlotting(row.jabatan)}: ${namaJabatanPlotting(row.jabatan)}`)}</strong>
	                </td>
                <td>
                    <input type="text" inputmode="numeric" class="form-input plotting-input plotting-input--number plotting-input--money" data-harga-row="${index}" data-harga-field="tarif" value="${esc(formatRupiahKomaDash(row.tarif))}" placeholder="Rp 0,-" ${modeEditMasterTarif ? '' : 'readonly'}>
                </td>
                <td>
	                    <input type="number" min="0" step="1" class="form-input plotting-input plotting-input--number" data-harga-row="${index}" data-harga-field="durasi" value="${esc(row.durasi ?? '')}" placeholder="Pilih periode" title="Durasi otomatis dari periode Tim Pengelola Kerma" readonly>
                </td>
                <td>
                    <input type="number" min="0" step="1" class="form-input plotting-input plotting-input--number" data-harga-row="${index}" data-harga-field="personil_per_kerma" value="${esc(row.personil_per_kerma ?? '')}" placeholder="0">
                </td>
                <td class="plotting-money-cell" data-harga-total-row="${index}">${formatRupiahKomaDash(hitungTotalRupiahJabatan(row))}</td>
                <td class="plotting-total" data-harga-orang-row="${index}">${hitungJumlahOrangJabatan(row).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
            </tr>
        `).join('');
        updateRingkasanDasarPlotting();
    }

    function renderTargetDistribusiPlotting() {
        if (!bodyTabelTargetDistribusi) return;
        if (!plottingKermaRows.length) plottingKermaRows.push(buatBarisPlottingKerma());
        const rowsAktif = plottingKermaRows
            .map((row, rowIndex) => ({ row, rowIndex }))
            .filter(({ row }) => row.status === 'Aktif' && hitungTargetDistribusiRow(row) > 0);

        if (!rowsAktif.length) {
            bodyTabelTargetDistribusi.innerHTML = '<tr class="table-state-row"><td colspan="10"><div class="table-state">Belum ada pegawai aktif dengan Target Distribusi. Edit Target Kerma pada Daftar Pegawai agar pegawai muncul di tabel ini.</div></td></tr>';
            updateRingkasanDasarPlotting();
            return;
        }

        bodyTabelTargetDistribusi.innerHTML = rowsAktif.map(({ row, rowIndex }, index) => {
            pastikanPksPlotting(row);
            const distribusiRoles = pastikanDistribusiRoles(row);
            const realisasiDistribusi = hitungRealisasiDistribusiRow(row);
            const selisihDistribusi = hitungSelisihDistribusiRow(row);
            const minusWajib = (
                isDosenDistribusi(row) &&
                isBatasanSimulasiAktif('dosenTidakBolehMinus') &&
                getBatasanSimulasi().dosenTidakBolehMinus
            ) || (
                isStafDistribusi(row) &&
                isBatasanSimulasiAktif('stafTidakBolehMinus') &&
                getBatasanSimulasi().stafTidakBolehMinus
            );
            const selisihClass = selisihDistribusi < 0 && minusWajib
                ? ' realisasi-sisa-negative'
                : (isBatasanSimulasiAktif('batasSelisihAtas') && selisihDistribusi > batasSelisihDistribusi ? ' realisasi-sisa-warning' : '');
            const roleCells = rolePlottingKerma.map(role => {
                const roleTerkunci = !isRoleBolehDistribusi(row, role);
                const nilaiRole = normalisasiNilaiDistribusiRole(distribusiRoles[role] ?? '', role);
                if (nilaiRole !== (distribusiRoles[role] ?? '')) distribusiRoles[role] = nilaiRole;
                const roleBolehLabel = labelRoleBolehDistribusi(row);
                const peranLabel = isStafDistribusi(row) ? 'Staf' : 'Dosen';
                return `
                    <td class="plotting-role-cell plotting-pks-role-cell">
                        <input type="text" inputmode="decimal" class="form-input plotting-input plotting-input--number plotting-input--role-count" data-row="${rowIndex}" data-distribusi-role="${esc(role)}" value="${esc(roleTerkunci ? '' : nilaiRole)}" placeholder="${esc(roleTerkunci ? '-' : formatPlaceholderDistribusiRole(role))}" title="${esc(roleTerkunci ? `${peranLabel} hanya dapat dialokasikan pada: ${roleBolehLabel}` : `${namaJabatanPlotting(role)} - isi seperti 1, 2, (4/6), atau 3 + (4/6)`)}" ${roleTerkunci ? 'readonly aria-disabled="true"' : ''}>
                    </td>
                `;
            }).join('');
            return `
                <tr>
                    <td class="plotting-col-no">${index + 1}</td>
                    <td class="plotting-name-cell">
                        <button type="button" class="plotting-name-ellipsis" data-target-name-toggle aria-expanded="false" title="${esc(row.nama || '-')}">${esc(row.nama || '-')}</button>
                    </td>
                    <td class="plotting-money-cell" data-target-distribusi-row="${rowIndex}">${formatRupiahKomaDash(hitungTargetDistribusiRow(row))}</td>
                    ${roleCells}
                    <td class="plotting-money-cell" data-realisasi-distribusi-row="${rowIndex}">${formatRupiahKomaDash(realisasiDistribusi)}</td>
                    <td class="plotting-money-cell${selisihClass}" data-selisih-distribusi-row="${rowIndex}">${formatRupiahKomaDash(selisihDistribusi)}</td>
                </tr>
            `;
        }).join('');
        updateKapasitasRoleTargetDistribusi();
        updateRingkasanDasarPlotting();
    }

    let sedangMemuatDaftarPksPlotting = false;
    let dataSisaAnggaranPlottingDimuat = false;
    let pesanErrorDaftarPksPlotting = '';

    function statusSisaAnggaranPlotting(item) {
        const sisa = Number(item.sisa_anggaran) || 0;
        if (sisa < 0) return 'Defisit';
        if (sisa > 0 && item.status_kontrak === 'Berakhir') return 'Perlu Dihitung Kembali';
        if (sisa > 0) return 'Dapat Dialokasikan';
        return 'Terserap';
    }

    function getDaftarPksDapatDialokasikan() {
        const minimalSisa = hitungMinimalSisaPksPlotting();
        if (minimalSisa <= 0) return [];
        return (allSisaAnggaranData || [])
            .filter(item => Number(item.total_realisasi_pendapatan) > 0)
            .filter(item => String(item.status_kontrak || '').trim().toLowerCase() !== 'berakhir')
            .filter(item => (Number(item.sisa_anggaran) || 0) >= minimalSisa)
            .sort((a, b) => {
                const bySisa = (Number(b.sisa_anggaran) || 0) - (Number(a.sisa_anggaran) || 0);
                if (bySisa !== 0) return bySisa;
                return urutKodeFileTahunTerbaru(a, b);
            });
    }

    function getIdPksPlotting(item = {}) {
        return String(item.id_program || item.kode_file || '').trim();
    }

    function hitungJumlahKebutuhanPksTersimpan() {
        return hitungPksDitetapkanPlotting();
    }

    function hitungMinimalSisaPksPlotting() {
        return Math.max(0, hitungTotalPerKermaPlotting());
    }

    function hitungKuotaPilihanPksPlotting(totalPerKerma = totalPerKermaTersimpan || hitungTotalPerKermaPlotting()) {
        return hitungTotalKebutuhanPksDasar(totalPerKerma);
    }

    function hitungJumlahPksTerpilihPlotting() {
        return daftarPksTerpilihPlotting.filter(Boolean).length;
    }

    function sinkronPilihanDaftarPks(data = []) {
        const idTersedia = new Set(data.map(getIdPksPlotting).filter(Boolean));
        const jumlahKebutuhan = hitungKuotaPilihanPksPlotting();
        const idSudahDipakai = new Set();
        daftarPksTerpilihPlotting = Array.from({ length: jumlahKebutuhan }, (_, index) => {
            const id = daftarPksTerpilihPlotting[index];
            if (!id || !idTersedia.has(id) || idSudahDipakai.has(id)) return '';
            idSudahDipakai.add(id);
            return id;
        });
    }

    function getNomorPksAlokasi(id) {
        const index = daftarPksTerpilihPlotting.indexOf(id);
        return index >= 0 ? index + 1 : '';
    }

    function getPksAlokasiByNomor(noPks) {
        const id = daftarPksTerpilihPlotting[noPks - 1];
        if (!id) return null;
        return (allSisaAnggaranData || []).find(item => getIdPksPlotting(item) === id) || null;
    }

    function setNomorPksAlokasi(target) {
        const id = target?.dataset?.pksAlokasiId;
        if (!id) return;
        const jumlahKebutuhan = hitungKuotaPilihanPksPlotting();
        const nomorSebelumnya = getNomorPksAlokasi(id);
        let nomor = Math.trunc(Number(target.value) || 0);
        if (nomor < 1) nomor = 0;
        if (nomor > jumlahKebutuhan) nomor = jumlahKebutuhan;
        const idPadaNomor = nomor > 0 ? daftarPksTerpilihPlotting[nomor - 1] : '';

        if (idPadaNomor && idPadaNomor !== id) {
            window.alert('Nomor sudah dimasukkan');
            target.value = nomorSebelumnya || '';
            renderDaftarPksPlotting();
            return;
        }

        daftarPksTerpilihPlotting = Array.from({ length: jumlahKebutuhan }, (_, index) => (
            daftarPksTerpilihPlotting[index] === id ? '' : (daftarPksTerpilihPlotting[index] || '')
        ));
        if (nomor > 0) {
            daftarPksTerpilihPlotting[nomor - 1] = id;
        }

        simpanPlottingKerma();
        renderDaftarPksPlotting();
        if (tabAktifPlottingKerma === 'plot') renderPlottingKerma();
    }

    function togglePilihanPksAlokasi(target) {
        const id = target?.dataset?.pksPilihId;
        if (!id) return;
        const data = getDaftarPksDapatDialokasikan();
        const jumlahKebutuhan = hitungKuotaPilihanPksPlotting();
        sinkronPilihanDaftarPks(data);

        if (target.checked) {
            if (getNomorPksAlokasi(id)) {
                renderDaftarPksPlotting();
                return;
            }
            const jumlahTerpilih = hitungJumlahPksTerpilihPlotting();
            if (jumlahTerpilih >= jumlahKebutuhan) {
                window.alert(`PKS yang dipilih sudah mencapai Total Kebutuhan PKS (${jumlahKebutuhan.toLocaleString('id-ID')} PKS).`);
                renderDaftarPksPlotting();
                return;
            }
            const slotKosong = daftarPksTerpilihPlotting.findIndex(item => !item);
            if (slotKosong >= 0) daftarPksTerpilihPlotting[slotKosong] = id;
        } else {
            daftarPksTerpilihPlotting = daftarPksTerpilihPlotting.filter(item => item && item !== id);
            while (daftarPksTerpilihPlotting.length < jumlahKebutuhan) daftarPksTerpilihPlotting.push('');
        }

        simpanPlottingKerma();
        renderDaftarPksPlotting();
        updateStatusPerhitunganDasar();
    }

    async function muatDataSisaAnggaranPlotting() {
        if (sedangMemuatDaftarPksPlotting) return;
        sedangMemuatDaftarPksPlotting = true;
        pesanErrorDaftarPksPlotting = '';
        try {
            const res = await fetch('/api/sisa-anggaran');
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.pesan || 'Gagal memuat daftar PKS.');
            allSisaAnggaranData = [...(payload.data || [])]
                .sort(urutKodeFileTahunTerbaru)
                .map((item, index) => ({ ...item, no: index + 1 }));
            dataSisaAnggaranPlottingDimuat = true;
        } catch {
            allSisaAnggaranData = [];
            dataSisaAnggaranPlottingDimuat = true;
            pesanErrorDaftarPksPlotting = 'Gagal memuat Daftar PKS';
        } finally {
            sedangMemuatDaftarPksPlotting = false;
            renderDaftarPksPlotting();
            if (tabAktifPlottingKerma === 'plot') renderPlottingKerma();
        }
    }

    function renderDaftarPksPlotting() {
        if (!bodyTabelDaftarPksPlotting) return;
        const minimalSisa = hitungMinimalSisaPksPlotting();
        if (minimalSisaPksPlotting) minimalSisaPksPlotting.textContent = minimalSisa > 0 ? formatRupiahKomaDash(minimalSisa) : 'Isi Total per Kerma';

        if (minimalSisa <= 0) {
            if (jumlahPksDapatDialokasikan) jumlahPksDapatDialokasikan.textContent = '0';
            if (totalSisaPksDapatDialokasikan) totalSisaPksDapatDialokasikan.textContent = formatRupiahKomaDash(0);
            bodyTabelDaftarPksPlotting.innerHTML = tableState(10, 'empty', 'Isi Total per Kerma terlebih dahulu', 'Daftar PKS akan muncul otomatis setelah Total per Kerma lebih dari Rp 0,-.');
            return;
        }

        if (!dataSisaAnggaranPlottingDimuat) {
            if (jumlahPksDapatDialokasikan) jumlahPksDapatDialokasikan.textContent = '0';
            if (totalSisaPksDapatDialokasikan) totalSisaPksDapatDialokasikan.textContent = formatRupiahKomaDash(0);
            bodyTabelDaftarPksPlotting.innerHTML = tableState(10, 'loading', 'Memuat Daftar PKS', 'Mencari PKS dengan sisa anggaran yang dapat dialokasikan.');
            muatDataSisaAnggaranPlotting();
            return;
        }
        if (pesanErrorDaftarPksPlotting) {
            if (jumlahPksDapatDialokasikan) jumlahPksDapatDialokasikan.textContent = '0';
            if (totalSisaPksDapatDialokasikan) totalSisaPksDapatDialokasikan.textContent = formatRupiahKomaDash(0);
            bodyTabelDaftarPksPlotting.innerHTML = tableState(10, 'error', pesanErrorDaftarPksPlotting, 'Periksa koneksi server atau coba kembali.');
            return;
        }

        const data = getDaftarPksDapatDialokasikan();
        sinkronPilihanDaftarPks(data);
        simpanPlottingKerma();
        const jumlahKebutuhan = hitungKuotaPilihanPksPlotting();
        const totalSisa = data.reduce((sum, item) => sum + (Number(item.sisa_anggaran) || 0), 0);
        if (jumlahPksDapatDialokasikan) jumlahPksDapatDialokasikan.textContent = data.length.toLocaleString('id-ID');
        if (totalSisaPksDapatDialokasikan) totalSisaPksDapatDialokasikan.textContent = formatRupiahKomaDash(totalSisa);
        if (!data.length) {
            bodyTabelDaftarPksPlotting.innerHTML = tableState(10, 'empty', 'Belum ada PKS yang memenuhi', `Minimal sisa anggaran yang dibutuhkan adalah ${formatRupiahKomaDash(minimalSisa)}.`);
            return;
        }

        const jumlahTerpilih = hitungJumlahPksTerpilihPlotting();
        bodyTabelDaftarPksPlotting.innerHTML = data.map((item, index) => {
            const id = getIdPksPlotting(item);
            const nomorAlokasi = getNomorPksAlokasi(id);
            const isDipilih = Boolean(nomorAlokasi);
            const disabledPilih = !id || (!isDipilih && jumlahTerpilih >= jumlahKebutuhan);
            const belumDiterima = Math.max(0, (Number(item.nilai_kontrak) || 0) - (Number(item.total_realisasi_pendapatan) || 0));
            return `
                <tr>
                    <td>${index + 1}</td>
	                    <td>
	                        <input type="checkbox" class="plotting-pks-check" data-pks-pilih-id="${esc(id)}" aria-label="Pilih PKS ${esc(item.kode_file || item.id_program || '')}" ${isDipilih ? 'checked' : ''} ${disabledPilih ? 'disabled' : ''}>
	                    </td>
	                    <td><span class="plotting-pks-order-badge ${isDipilih ? '' : 'is-empty'}">${isDipilih ? esc(nomorAlokasi) : '-'}</span></td>
                    <td><span class="kode-file-tag">${esc(item.kode_file || item.id_program || '-')}</span></td>
                    <td class="td-truncate"><strong>${esc(item.nama_mitra || '-')}</strong></td>
                    <td class="td-truncate">${esc(item.judul_pks || '-')}</td>
                    <td>${esc(item.total_realisasi_pendapatan_display || 'Rp 0')}</td>
                    <td>${formatRupiahKomaDash(belumDiterima)}</td>
                    <td>${esc(item.nilai_kontrak_display || formatRupiahKomaDash(item.nilai_kontrak || 0))}</td>
                    <td class="plotting-money-cell">${esc(item.sisa_anggaran_display || 'Rp 0')}</td>
                </tr>
            `;
        }).join('');
    }

    function renderDaftarPegawai() {
        if (!bodyTabelPegawai) return;
        if (!plottingKermaRows.length) plottingKermaRows.push(buatBarisPlottingKerma());
        renderDatalistPegawai();
        bodyTabelPegawai.innerHTML = plottingKermaRows.map((row, rowIndex) => {
            const isEditing = pegawaiEditRowIndex === rowIndex;
            const level1 = getLevelJabatanMaster(row.jabatan_sbm) || '-';
            const level2 = getLevelJabatanMaster(row.jabatan_sbm_2) || '-';
            if (isEditing) {
                return `
                    <tr class="pegawai-row-editing">
                        <td class="plotting-col-no">${rowIndex + 1}</td>
                        <td><input type="text" class="form-input plotting-input" data-pegawai-field="nama" value="${esc(row.nama || '')}" placeholder="Nama pegawai"></td>
                        <td>
                            <select class="form-input plotting-input plotting-input--select" data-pegawai-field="peran">
                                ${renderSelectPegawaiOption('Dosen', row.peran)}
                                ${renderSelectPegawaiOption('Staf', row.peran)}
                            </select>
                        </td>
                        <td>
                            <select class="form-input plotting-input plotting-input--select" data-pegawai-field="status">
                                ${statusDistribusiPlotting.map(status => renderSelectPegawaiOption(status, row.status)).join('')}
                            </select>
                        </td>
                        <td><input type="text" list="listJabatanSbm" class="form-input plotting-input plotting-input--dropdown" data-pegawai-field="jabatan_sbm" value="${esc(row.jabatan_sbm || '')}" placeholder="Pilih / ketik jabatan"></td>
                        <td><input type="text" list="listJabatanSbm" class="form-input plotting-input plotting-input--dropdown" data-pegawai-field="jabatan_sbm_2" value="${esc(row.jabatan_sbm_2 || '')}" placeholder="Pilih / ketik jabatan kedua"></td>
                        <td class="pegawai-level-auto">${esc(level1)}</td>
                        <td class="pegawai-level-auto">${esc(level2)}</td>
                        <td><input type="text" inputmode="numeric" class="form-input plotting-input plotting-input--money" data-pegawai-field="target_kerma" value="${esc(formatRupiahKomaDash(row.target_kerma))}" placeholder="Rp 0,-"></td>
                        <td><input type="text" class="form-input plotting-input" data-pegawai-field="keterangan" value="${esc(row.keterangan || '')}" placeholder="Keterangan"></td>
                        <td>
                            <div class="pegawai-row-actions">
                                <button type="button" class="btn-row-save" data-pegawai-row-action="save" data-row="${rowIndex}">Simpan</button>
                                <button type="button" class="btn-row-cancel" data-pegawai-row-action="cancel" data-row="${rowIndex}">Batal</button>
                            </div>
                        </td>
                    </tr>
                `;
            }
            return `
                <tr>
                    <td class="plotting-col-no">${rowIndex + 1}</td>
                    <td class="pegawai-readonly-cell pegawai-readonly-cell--truncate" title="${esc(row.nama || '-')}">${esc(row.nama || '-')}</td>
                    <td class="pegawai-readonly-cell">${esc(row.peran || '-')}</td>
                    <td class="pegawai-readonly-cell">${esc(row.status || '-')}</td>
                    <td class="pegawai-readonly-cell pegawai-readonly-cell--truncate" title="${esc(row.jabatan_sbm || '-')}">${esc(row.jabatan_sbm || '-')}</td>
                    <td class="pegawai-readonly-cell pegawai-readonly-cell--truncate" title="${esc(row.jabatan_sbm_2 || '-')}">${esc(row.jabatan_sbm_2 || '-')}</td>
                    <td class="pegawai-level-auto">${esc(level1)}</td>
                    <td class="pegawai-level-auto">${esc(level2)}</td>
                    <td class="pegawai-readonly-cell pegawai-money-cell">${formatRupiahKomaDash(row.target_kerma)}</td>
                    <td class="pegawai-readonly-cell pegawai-readonly-cell--truncate" title="${esc(row.keterangan || '-')}">${esc(row.keterangan || '-')}</td>
                    <td>
                        <button type="button" class="btn-row-edit" data-pegawai-row-action="edit" data-row="${rowIndex}">Edit</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderSelectPegawaiOption(value, selectedValue) {
        return `<option value="${esc(value)}" ${value === selectedValue ? 'selected' : ''}>${esc(value)}</option>`;
    }

    const urutanLevelJabatanSbm = [
        'Dekan',
        'Wakil Dekan',
        'Kepala Senat',
        'Sekretaris Senat',
        'Ketua Kelompok Keahlian',
        'Ketua Program Studi',
        'Kepala Pusat',
        'Kepala Laboratorium',
        'Kepala Administrasi',
        'Ketua Urusan',
        'Wakil Kepala',
        'Kepala Sub Administrasi',
        'Koordinator',
        'Asisten'
    ];

    function normalisasiNamaJabatan(value) {
        let normalized = String(value || '').replace(/\s+/g, ' ').trim();
        normalized = normalized
            .replace(/^Kepala Adminsitrasi\b/i, 'Kepala Administrasi')
            .replace(/^Kepala Sub Adminsitrasi\b/i, 'Kepala Sub Administrasi');
        if (/^Ketua Kelompok Keahlian$/i.test(normalized)) {
            return '';
        }
        if (/^Kepala Management of Technology$/i.test(normalized)) {
            return 'Kepala Laboratorium Management of Technology';
        }
        if (/^Kepala Inkubator Bisnis$/i.test(normalized)) {
            return 'Kepala Laboratorium Inkubator Bisnis';
        }
        if (/^Ketua Program Magister Administrasi Bisnis Kampus Bandung$/i.test(normalized)) {
            return 'Ketua Program Studi Magister Administrasi Bisnis Kampus Bandung';
        }
        if (/^Ketua Program Magister Administrasi Bisnis Kampus Jakarta$/i.test(normalized)) {
            return 'Ketua Program Studi Magister Administrasi Bisnis Kampus Jakarta';
        }
        if (/^Ketua Program MSM dan DSM$/i.test(normalized)) {
            return 'Ketua Program Studi MSM dan DSM';
        }
        if (/^Ketua Program Sarjana Kewirausahaan$/i.test(normalized)) {
            return 'Ketua Program Studi Sarjana Kewirausahaan';
        }
        if (/^Ketua Program Sarjana Manajemen$/i.test(normalized)) {
            return 'Ketua Program Studi Sarjana Manajemen';
        }
        return normalized;
    }

    function normalisasiLevelJabatan(value) {
        return String(value || '').replace(/\s+/g, ' ').trim()
            .replace(/^Kepala Adminsitrasi\b/i, 'Kepala Administrasi')
            .replace(/^Kepala Sub Adminsitrasi\b/i, 'Kepala Sub Administrasi');
    }

    function keyMasterJabatan(value) {
        return normalisasiNamaJabatan(value).toLowerCase();
    }

    function hasMasterLevelJabatan(key) {
        return Object.prototype.hasOwnProperty.call(masterLevelJabatanPlotting, key);
    }

    function getLevelJabatanMaster(jabatan) {
        const key = keyMasterJabatan(jabatan);
        return key ? (masterLevelJabatanPlotting[key] || '') : '';
    }

    function setLevelJabatanMaster(jabatan, level) {
        const nama = normalisasiNamaJabatan(jabatan);
        const key = nama.toLowerCase();
        if (!key) return;
        masterLevelJabatanPlotting[key] = normalisasiLevelJabatan(level);
    }

    function sinkronMasterLevelJabatanDariRows() {
        plottingKermaRows.forEach(row => {
            [
                { nama: row.jabatan_sbm, level: row.level_jabatan_1 },
                { nama: row.jabatan_sbm_2, level: row.level_jabatan_2 }
            ].forEach(item => {
                const key = keyMasterJabatan(item.nama);
                if (!key || hasMasterLevelJabatan(key)) return;
                masterLevelJabatanPlotting[key] = normalisasiLevelJabatan(item.level);
            });
        });
    }

    function rankLevelJabatan(value) {
        const teks = normalisasiLevelJabatan(value).toLowerCase();
        if (!teks) return Number.POSITIVE_INFINITY;
        const index = urutanLevelJabatanSbm.findIndex(level => {
            const normalizedLevel = level.toLowerCase();
            return teks === normalizedLevel || teks.startsWith(`${normalizedLevel} `);
        });
        return index === -1 ? Number.POSITIVE_INFINITY : index;
    }

    function rankJabatanMaster(item) {
        const rankDariLevel = rankLevelJabatan(item.level);
        if (Number.isFinite(rankDariLevel)) return rankDariLevel;
        return rankLevelJabatan(item.nama);
    }

    function ambilNilaiUnikPegawai(fields) {
        const nilaiSet = new Map();
        plottingKermaRows.forEach(row => {
            fields.forEach(field => {
                const nilai = normalisasiNamaJabatan(row[field]);
                if (!nilai) return;
                nilaiSet.set(nilai.toLowerCase(), nilai);
            });
        });
        return [...nilaiSet.values()].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
    }

    function renderOptionsDatalist(datalist, values) {
        if (!datalist) return;
        datalist.innerHTML = values.map(value => `<option value="${esc(value)}"></option>`).join('');
    }

    function ambilLevelJabatanOptions() {
        const nilaiSet = new Map();
        [
            ...urutanLevelJabatanSbm,
            ...ambilNilaiUnikPegawai(['level_jabatan_1', 'level_jabatan_2']),
            ...Object.values(masterLevelJabatanPlotting)
        ].forEach(value => {
            const nilai = normalisasiLevelJabatan(value);
            if (!nilai) return;
            nilaiSet.set(nilai.toLowerCase(), nilai);
        });
        return [...nilaiSet.values()].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
    }

    function renderDatalistPegawai() {
        renderOptionsDatalist(listJabatanSbm, ambilNilaiUnikPegawai(['jabatan_sbm', 'jabatan_sbm_2']));
        renderOptionsDatalist(listLevelJabatan, ambilLevelJabatanOptions());
    }

    function ambilDaftarJabatanMaster() {
        const jabatanMap = new Map();
        plottingKermaRows.forEach(row => {
            [
                { nama: row.jabatan_sbm, level: row.level_jabatan_1, posisi: 'Jabatan 1' },
                { nama: row.jabatan_sbm_2, level: row.level_jabatan_2, posisi: 'Jabatan 2' }
            ].forEach(item => {
                const nama = normalisasiNamaJabatan(item.nama);
                if (!nama) return;
                const key = nama.toLowerCase();
                if (!jabatanMap.has(key)) {
                    jabatanMap.set(key, {
                        nama,
                        key,
                        level: getLevelJabatanMaster(nama)
                    });
                }
                const level = normalisasiLevelJabatan(item.level);
                if (level && !hasMasterLevelJabatan(key)) {
                    setLevelJabatanMaster(nama, level);
                    jabatanMap.get(key).level = level;
                }
            });
        });
        return [...jabatanMap.values()].sort((a, b) => {
            const rankA = rankJabatanMaster(a);
            const rankB = rankJabatanMaster(b);
            if (rankA !== rankB) return rankA - rankB;
            return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
        });
    }

    function renderDaftarJabatan() {
        if (!bodyTabelJabatan) return;
        const data = ambilDaftarJabatanMaster();
        if (infoJumlahJabatan) infoJumlahJabatan.textContent = `${data.length.toLocaleString('id-ID')} jabatan`;
        if (!data.length) {
            bodyTabelJabatan.innerHTML = '<tr class="table-state-row"><td colspan="4"><div class="table-state">Belum ada jabatan yang diinput pada Daftar Pegawai.</div></td></tr>';
            return;
        }
        bodyTabelJabatan.innerHTML = data.map((item, index) => {
            const isEditing = jabatanEditKey === item.key;
            return `
                <tr class="${isEditing ? 'jabatan-row-editing' : ''}">
                    <td class="plotting-col-no">${index + 1}</td>
                    <td>
                        ${isEditing
                            ? `<input type="text" list="listJabatanSbm" class="form-input plotting-input plotting-input--dropdown" data-jabatan-name-input value="${esc(item.nama)}" placeholder="Nama jabatan">`
                            : `<strong>${esc(item.nama)}</strong>`}
                    </td>
                    <td>
                        ${isEditing
                            ? `<input type="text" list="listLevelJabatan" class="form-input plotting-input plotting-input--dropdown" data-jabatan-level-input value="${esc(item.level || '')}" placeholder="Pilih / ketik level jabatan">`
                            : `<span class="jabatan-level-readonly">${esc(item.level || '-')}</span>`}
                    </td>
                    <td>
                        ${isEditing
                            ? `<div class="pegawai-row-actions">
                                    <button type="button" class="btn-row-save" data-jabatan-row-action="save" data-jabatan-key="${esc(item.key)}" data-jabatan-nama="${esc(item.nama)}">Simpan</button>
                                    <button type="button" class="btn-row-cancel" data-jabatan-row-action="cancel" data-jabatan-key="${esc(item.key)}">Batal</button>
                                </div>`
                            : `<button type="button" class="btn-row-edit" data-jabatan-row-action="edit" data-jabatan-key="${esc(item.key)}" data-jabatan-nama="${esc(item.nama)}">Edit</button>`}
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderBatasanSwitch(field, label) {
        return `
            <label class="plotting-rule-switch">
                <input type="checkbox" data-batasan-simulasi-field="${esc(field)}" ${getBatasanSimulasi()[field] ? 'checked' : ''}>
                <span>${esc(label)}</span>
            </label>
        `;
    }

    function renderBatasanRoleDosen() {
        const selected = new Set(getBatasanSimulasi().roleDosen);
        return `
            <div class="plotting-role-checks">
                ${rolePlottingKerma.map(role => `
                    <label>
                        <input type="checkbox" data-batasan-dosen-role="${esc(role)}" ${selected.has(role) ? 'checked' : ''}>
                        <span>${esc(labelJabatanPlotting(role))}</span>
                    </label>
                `).join('')}
            </div>
        `;
    }

    function renderBatasanRoleStaf() {
        const selected = new Set(getBatasanSimulasi().roleStaf);
        return `
            <div class="plotting-role-checks">
                ${rolePlottingKerma.map(role => `
                    <label>
                        <input type="checkbox" data-batasan-staf-role="${esc(role)}" ${selected.has(role) ? 'checked' : ''}>
                        <span>${esc(labelJabatanPlotting(role))}</span>
                    </label>
                `).join('')}
            </div>
        `;
    }

    function renderBatasanLevelRoleCell(rule, role) {
        const checked = rule.roles.includes(role);
        const labelRule = rule.levels[0] || rule.nama;
        return `
            <label class="plotting-level-role-toggle" title="${esc(`${labelRule} - ${namaJabatanPlotting(role)}`)}">
                <input type="checkbox" aria-label="${esc(`${labelRule} - ${namaJabatanPlotting(role)}`)}" data-batasan-level-id="${esc(rule.id)}" data-batasan-level-role="${esc(role)}" ${checked ? 'checked' : ''}>
            </label>
        `;
    }

    function renderBatasanLevelLabel(rule) {
        if (rule.custom) {
            return `
                <input type="text" class="form-input plotting-input plotting-level-rule-input" data-batasan-level-id="${esc(rule.id)}" data-batasan-level-field="levels" value="${esc(rule.levels.join('; '))}" placeholder="Tulis level jabatan">
                <small>Batasan tambahan</small>
            `;
        }
        return `
            <strong>${esc(rule.nama)}</strong>
            <small>${esc(rule.id === 'dosenTanpaLevel' ? 'Dosen tanpa level jabatan' : (rule.levels[0] || rule.nama))}</small>
        `;
    }

    function renderBatasanHapusButton(type, id, label = 'Hapus batasan') {
        const attr = type === 'level' ? 'data-hapus-batasan-level' : 'data-hapus-batasan-umum';
        return `<button type="button" class="plotting-rule-delete-btn" ${attr}="${esc(id)}" title="${esc(label)}">Hapus</button>`;
    }

    function renderStatusBatasanUmum(rule) {
        const analisis = analisisBatasanUmum(rule);
        const kelas = analisis.aktif ? 'is-active' : (analisis.tipe === 'empty' ? 'is-empty' : 'is-note');
        return `<small class="plotting-rule-status ${kelas}">${esc(analisis.label)}</small>`;
    }

    function renderBatasanUmumTambahanRow(rule, index) {
        return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <input type="text" class="form-input plotting-input plotting-rule-inline-input plotting-general-rule-input" data-batasan-umum-id="${esc(rule.id)}" data-batasan-umum-field="nama" value="${esc(rule.nama)}" placeholder="Nama batasan">
                    <small class="plotting-rule-muted">Batasan tambahan</small>
                    ${renderStatusBatasanUmum(rule)}
                </td>
                <td>
                    <textarea class="form-input plotting-input plotting-rule-inline-textarea" data-batasan-umum-id="${esc(rule.id)}" data-batasan-umum-field="pengaturan" placeholder="Contoh: Staf maksimal 1 posisi / Dosen boleh naik 2 level / Dosen dapat memakai posisi kosong">${esc(rule.pengaturan)}</textarea>
                </td>
                <td>
                    <textarea class="form-input plotting-input plotting-rule-inline-textarea" data-batasan-umum-id="${esc(rule.id)}" data-batasan-umum-field="dampak" placeholder="Tuliskan dampaknya terhadap simulasi">${esc(rule.dampak)}</textarea>
                </td>
                <td>${renderBatasanHapusButton('umum', rule.id, 'Hapus batasan umum')}</td>
            </tr>
        `;
    }

    function renderBatasanSimulasiPlotting() {
        if (!bodyTabelBatasanSimulasiPlotting && !bodyTabelLevelJabatanSimulasiPlotting) return;
        const batasan = getBatasanSimulasi();
        const rows = [
            {
                id: 'batasSelisihAtas',
                nama: 'Batas selisih atas',
                kontrol: `<input type="text" inputmode="numeric" class="form-input plotting-input plotting-input--money plotting-rule-input" data-batasan-simulasi-field="batasSelisihAtas" value="${esc(formatRupiahKomaDash(batasan.batasSelisihAtas))}" placeholder="Rp 0,-">`,
                dampak: 'Batas maksimal kelebihan Realisasi Distribusi terhadap Target Distribusi. Default Rp1.000.000,-.'
            },
            {
                id: 'batasSelisihBawah',
                nama: 'Batas selisih bawah',
                kontrol: `<input type="text" inputmode="numeric" class="form-input plotting-input plotting-input--money plotting-rule-input" data-batasan-simulasi-field="batasSelisihBawah" value="${esc(formatRupiahKomaDash(batasan.batasSelisihBawah))}" placeholder="Rp 0,-">`,
                dampak: 'Batas toleransi kekurangan jika aturan tidak boleh minus dimatikan. Jika Dosen/Staf tidak boleh minus aktif, batas bawah efektifnya 0.'
            },
            {
                id: 'batasiPksDitetapkan',
                nama: 'PKS mengikuti yang ditetapkan',
                kontrol: renderBatasanSwitch('batasiPksDitetapkan', 'Aktif'),
                dampak: 'Jika aktif, PKS Simulasi Terakhir tidak boleh melebihi PKS yang ditetapkan. Jika nonaktif, batas memakai rekomendasi Perhitungan Dasar.'
            },
            {
                id: 'posisiKosongBolehTersisa',
                nama: 'Posisi kosong boleh tersisa',
                kontrol: renderBatasanSwitch('posisiKosongBolehTersisa', 'Aktif'),
                dampak: 'Jika nonaktif, hasil simulasi memberi peringatan saat masih ada slot posisi kosong.'
            },
            {
                id: 'dosenGunakanSlotKosong',
                nama: 'Dosen pakai slot kosong',
                kontrol: renderBatasanSwitch('dosenGunakanSlotKosong', 'Aktif'),
                dampak: 'Jika aktif, setelah simulasi utama selesai, posisi kosong dapat dipakai Dosen untuk mendekatkan selisih distribusi ke nol.'
            },
            {
                id: 'dosenTidakBolehMinus',
                nama: 'Dosen tidak boleh minus',
                kontrol: renderBatasanSwitch('dosenTidakBolehMinus', 'Aktif'),
                dampak: 'Jika aktif, simulasi mengejar alokasi Dosen sampai Realisasi Distribusi tidak kurang dari Target Distribusi.'
            },
            {
                id: 'stafTidakBolehMinus',
                nama: 'Staf tidak boleh minus',
                kontrol: renderBatasanSwitch('stafTidakBolehMinus', 'Aktif'),
                dampak: 'Jika aktif, simulasi mengejar alokasi Staf sampai Realisasi Distribusi tidak kurang dari Target Distribusi.'
            },
            {
                id: 'prioritasDosenTargetTerbesar',
                nama: 'Prioritas Dosen target terbesar',
                kontrol: renderBatasanSwitch('prioritasDosenTargetTerbesar', 'Aktif'),
                dampak: 'Jika aktif, Dosen dengan Target Distribusi lebih besar diproses lebih dulu saat simulasi.'
            },
            {
                id: 'prioritasStafTargetTerbesar',
                nama: 'Prioritas Staf target terbesar',
                kontrol: renderBatasanSwitch('prioritasStafTargetTerbesar', 'Aktif'),
                dampak: 'Jika aktif, Staf dengan Target Distribusi lebih besar diproses lebih dulu saat slot Staf terbatas.'
            },
            {
                id: 'roleDosen',
                nama: 'Role yang boleh untuk Dosen',
                kontrol: renderBatasanRoleDosen(),
                dampak: 'Dosen hanya dapat dialokasikan pada role yang dicentang. Aturan Level Jabatan tetap menjadi batas tambahan untuk simulasi.'
            },
            {
                id: 'roleStaf',
                nama: 'Role yang boleh untuk Staf',
                kontrol: renderBatasanRoleStaf(),
                dampak: 'Staf hanya dapat dialokasikan pada role yang dicentang. Role lain dikunci pada tabel Target Distribusi.'
            }
        ].filter(row => isBatasanSimulasiAktif(row.id));
        const customRows = Array.isArray(batasan.batasanUmumRules) ? batasan.batasanUmumRules : [];

        if (bodyTabelBatasanSimulasiPlotting) {
            const fixedRows = rows.map((row, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${esc(row.nama)}</strong></td>
                    <td>${row.kontrol}</td>
                    <td>${esc(row.dampak)}</td>
                    <td>${renderBatasanHapusButton('umum', row.id, 'Hapus batasan')}</td>
                </tr>
            `).join('');
            bodyTabelBatasanSimulasiPlotting.innerHTML = fixedRows
                + customRows.map((row, index) => renderBatasanUmumTambahanRow(row, rows.length + index)).join('');
        }

        if (bodyTabelLevelJabatanSimulasiPlotting) {
            bodyTabelLevelJabatanSimulasiPlotting.innerHTML = batasan.levelJabatanRules.map(rule => `
                <tr>
                    <td>
                        ${renderBatasanLevelLabel(rule)}
                    </td>
                    ${rolePlottingKerma.map(role => `<td>${renderBatasanLevelRoleCell(rule, role)}</td>`).join('')}
                    <td>${renderBatasanHapusButton('level', rule.id, 'Hapus batasan level jabatan')}</td>
                </tr>
            `).join('');
        }
    }

    function syncBatasanSimulasiInput(target) {
        if (!target) return;
        const field = target.dataset?.batasanSimulasiField;
        const role = target.dataset?.batasanStafRole;
        const dosenRole = target.dataset?.batasanDosenRole;
        const umumRuleId = target.dataset?.batasanUmumId;
        const umumRuleField = target.dataset?.batasanUmumField;
        const levelRuleId = target.dataset?.batasanLevelId;
        const levelRuleRole = target.dataset?.batasanLevelRole;
        const levelRuleField = target.dataset?.batasanLevelField;
        if (!field && !role && !dosenRole && !umumRuleId && !levelRuleId) return;

        const next = { ...getBatasanSimulasi() };
        if (umumRuleId && umumRuleField) {
            next.batasanUmumRules = getBatasanSimulasi().batasanUmumRules.map(rule => {
                if (rule.id !== umumRuleId) return { ...rule };
                if (!['nama', 'pengaturan', 'dampak'].includes(umumRuleField)) return { ...rule };
                return { ...rule, [umumRuleField]: target.value };
            });
        } else if (levelRuleId) {
            next.levelJabatanRules = getBatasanSimulasi().levelJabatanRules.map(rule => {
                if (rule.id !== levelRuleId) return { ...rule, levels: [...rule.levels], roles: [...rule.roles] };
                if (levelRuleRole) {
                    const roles = new Set(rule.roles);
                    if (target.checked) roles.add(levelRuleRole);
                    else roles.delete(levelRuleRole);
                    return { ...rule, roles: [...roles].filter(item => rolePlottingKerma.includes(item)) };
                }
                if (levelRuleField === 'levels') {
                    return { ...rule, levels: normalisasiListLevelBatasan(target.value) };
                }
                return { ...rule, levels: [...rule.levels], roles: [...rule.roles] };
            });
        } else if (role) {
            const roles = new Set(next.roleStaf);
            if (target.checked) roles.add(role);
            else roles.delete(role);
            next.roleStaf = [...roles].filter(item => rolePlottingKerma.includes(item));
        } else if (dosenRole) {
            const roles = new Set(next.roleDosen);
            if (target.checked) roles.add(dosenRole);
            else roles.delete(dosenRole);
            next.roleDosen = [...roles].filter(item => rolePlottingKerma.includes(item));
        } else if (field === 'batasSelisihAtas' || field === 'batasSelisihBawah') {
            next[field] = parseNominalRupiah(target.value);
        } else if (target.type === 'checkbox') {
            next[field] = Boolean(target.checked);
        }

        setBatasanSimulasi(next);
        plottingKermaRows.forEach(row => {
            if (isStafDistribusi(row)) rapihkanBatasStafDistribusi(row);
            if (isDosenDistribusi(row)) rapihkanBatasDosenDistribusi(row);
        });
        simpanPlottingKerma();
        renderBatasanSimulasiPlotting();
        renderTargetDistribusiPlotting();
        updateRingkasanDasarPlotting();
    }

    function tambahBatasanLevelSimulasi() {
        const nextRules = getBatasanSimulasi().levelJabatanRules.map(rule => ({
            ...rule,
            levels: [...rule.levels],
            roles: [...rule.roles]
        }));
        nextRules.push({
            id: `customLevel-${Date.now()}`,
            nama: 'Batasan tambahan',
            levels: [],
            roles: [],
            custom: true
        });
        setBatasanSimulasi({ levelJabatanRules: nextRules });
        simpanPlottingKerma();
        renderBatasanSimulasiPlotting();
        setTimeout(() => {
            const inputs = bodyTabelLevelJabatanSimulasiPlotting?.querySelectorAll('.plotting-level-rule-input');
            inputs?.[inputs.length - 1]?.focus();
        }, 0);
    }

    function tambahBatasanUmumSimulasi() {
        const nextRules = getBatasanSimulasi().batasanUmumRules.map(rule => ({ ...rule }));
        nextRules.push({
            id: `customRule-${Date.now()}`,
            nama: 'Batasan tambahan',
            pengaturan: '',
            dampak: '',
            custom: true
        });
        setBatasanSimulasi({ batasanUmumRules: nextRules });
        simpanPlottingKerma();
        renderBatasanSimulasiPlotting();
        setTimeout(() => {
            const inputs = bodyTabelBatasanSimulasiPlotting?.querySelectorAll('.plotting-general-rule-input');
            inputs?.[inputs.length - 1]?.focus();
        }, 0);
    }

    function hapusBatasanUmumSimulasi(id) {
        const batasan = getBatasanSimulasi();
        const isCustom = batasan.batasanUmumRules.some(rule => rule.id === id);
        const nextRules = batasan.batasanUmumRules
            .filter(rule => rule.id !== id)
            .map(rule => ({ ...rule }));
        const nextNonaktif = new Set(batasan.batasanNonaktif);
        if (!isCustom && id) nextNonaktif.add(id);
        setBatasanSimulasi({
            batasanUmumRules: nextRules,
            batasanNonaktif: [...nextNonaktif]
        });
        simpanPlottingKerma();
        renderBatasanSimulasiPlotting();
        renderTargetDistribusiPlotting();
        updateRingkasanDasarPlotting();
    }

    function hapusBatasanLevelSimulasi(id) {
        const batasan = getBatasanSimulasi();
        const targetRule = batasan.levelJabatanRules.find(rule => rule.id === id);
        const nextRules = getBatasanSimulasi().levelJabatanRules
            .filter(rule => rule.id !== id)
            .map(rule => ({
                ...rule,
                levels: [...rule.levels],
                roles: [...rule.roles]
            }));
        const nextNonaktif = new Set(batasan.batasanNonaktif);
        if (targetRule && !targetRule.custom) nextNonaktif.add(id);
        setBatasanSimulasi({
            levelJabatanRules: nextRules,
            batasanNonaktif: [...nextNonaktif]
        });
        simpanPlottingKerma();
        renderBatasanSimulasiPlotting();
        renderTargetDistribusiPlotting();
        updateRingkasanDasarPlotting();
    }

    function setTabPlottingKerma(tab) {
        const nextTab = tab === 'daftarPks' ? 'dasar' : tab;
        tabAktifPlottingKerma = nextTab === 'plot'
            ? 'plot'
            : (nextTab === 'dasar' ? 'dasar' : (nextTab === 'batasan' ? 'batasan' : 'target'));
        const isTarget = tabAktifPlottingKerma === 'target';
        const isBatasan = tabAktifPlottingKerma === 'batasan';
        const isDasar = tabAktifPlottingKerma === 'dasar';
        const isDaftarPks = false;
        const isPlot = tabAktifPlottingKerma === 'plot';
        tabTargetDistribusi?.classList.toggle('active', isTarget);
        tabBatasanSimulasiPlotting?.classList.toggle('active', isBatasan);
        tabPlottingDasar?.classList.toggle('active', isDasar);
        tabDaftarPksPlotting?.classList.toggle('active', isDaftarPks);
        tabPlotKerma?.classList.toggle('active', isPlot);
        tabTargetDistribusi?.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        tabBatasanSimulasiPlotting?.setAttribute('aria-selected', isBatasan ? 'true' : 'false');
        tabPlottingDasar?.setAttribute('aria-selected', isDasar ? 'true' : 'false');
        tabDaftarPksPlotting?.setAttribute('aria-selected', isDaftarPks ? 'true' : 'false');
        tabPlotKerma?.setAttribute('aria-selected', isPlot ? 'true' : 'false');
        if (panelTargetDistribusi) panelTargetDistribusi.style.display = isTarget ? '' : 'none';
        if (panelBatasanSimulasiPlotting) panelBatasanSimulasiPlotting.style.display = isBatasan ? '' : 'none';
        if (panelPlottingDasar) panelPlottingDasar.style.display = isDasar ? '' : 'none';
        if (panelDaftarPksPlotting) panelDaftarPksPlotting.style.display = isDaftarPks ? '' : 'none';
        if (panelPlotKerma) panelPlotKerma.style.display = isPlot ? '' : 'none';
        if (isTarget) renderTargetDistribusiPlotting();
        else if (isBatasan) renderBatasanSimulasiPlotting();
        else if (isDasar) renderPerhitunganDasarPlotting();
        else renderPlottingKerma();
    }

    function syncPerhitunganDasarPlottingInput(target) {
        if (!target) return;
        const rowIndex = Number(target.dataset.hargaRow);
        const field = target.dataset.hargaField;
        const row = perhitunganDasarPlotting.rows[rowIndex];
        if (!row || !field) return;
        row[field] = target.value;
        tandaiPerhitunganDasarBerubah();
        updateTotalHargaJabatan(rowIndex);
    }

    function buatBarisPlottingKerma() {
        const pks = {};
        for (let i = 1; i <= jumlahPksPlotting; i += 1) {
            pks[i] = {};
            rolePlottingKerma.forEach(role => { pks[i][role] = false; });
        }
        return { nama: '', peran: 'Dosen', status: 'Aktif', jabatan_sbm: '', jabatan_sbm_2: '', level_jabatan_1: '', level_jabatan_2: '', target_kerma: '', keterangan: '', pks, distribusi_roles: {} };
    }

    function pastikanPksPlotting(row) {
        if (!row.pks || typeof row.pks !== 'object') row.pks = {};
        for (let i = 1; i <= jumlahPksPlotting; i += 1) {
            if (!row.pks[i]) row.pks[i] = {};
            rolePlottingKerma.forEach(role => {
                if (typeof row.pks[i][role] !== 'boolean') row.pks[i][role] = false;
            });
        }
    }

    function labelJabatanPlotting(role) {
        return labelRolePlottingKerma[role] || role;
    }

    function namaJabatanPlotting(role) {
        return namaRolePlottingKerma[role] || role;
    }

    function hitungTotalPlotting(row) {
        pastikanPksPlotting(row);
        return Object.values(row.pks || {}).reduce((sum, roleMap) => (
            sum + rolePlottingKerma.reduce((subtotal, role) => subtotal + (roleMap?.[role] ? 1 : 0), 0)
        ), 0);
    }

    function updateTotalPlotting(rowIndex) {
        const cell = bodyTabelPlottingKerma?.querySelector(`[data-total-row="${rowIndex}"]`);
        const row = plottingKermaRows[rowIndex];
        if (cell && row) cell.textContent = hitungTotalPlotting(row);
    }

    function updateTargetDistribusiRow(rowIndex) {
        const targetCell = bodyTabelTargetDistribusi?.querySelector(`[data-target-distribusi-row="${rowIndex}"]`);
        const realisasiCell = bodyTabelTargetDistribusi?.querySelector(`[data-realisasi-distribusi-row="${rowIndex}"]`);
        const selisihCell = bodyTabelTargetDistribusi?.querySelector(`[data-selisih-distribusi-row="${rowIndex}"]`);
        const row = plottingKermaRows[rowIndex];
        if (!row) return;
        if (targetCell) targetCell.textContent = formatRupiahKomaDash(hitungTargetDistribusiRow(row));
        if (realisasiCell) realisasiCell.textContent = formatRupiahKomaDash(hitungRealisasiDistribusiRow(row));
        if (selisihCell) {
            const selisih = hitungSelisihDistribusiRow(row);
            const minusWajib = (
                isDosenDistribusi(row) &&
                isBatasanSimulasiAktif('dosenTidakBolehMinus') &&
                getBatasanSimulasi().dosenTidakBolehMinus
            ) || (
                isStafDistribusi(row) &&
                isBatasanSimulasiAktif('stafTidakBolehMinus') &&
                getBatasanSimulasi().stafTidakBolehMinus
            );
            selisihCell.textContent = formatRupiahKomaDash(selisih);
            selisihCell.classList.toggle('realisasi-sisa-negative', selisih < 0 && minusWajib);
            selisihCell.classList.toggle('realisasi-sisa-warning', isBatasanSimulasiAktif('batasSelisihAtas') && selisih > batasSelisihDistribusi);
        }
        updateKapasitasRoleTargetDistribusi();
        updateRingkasanSimulasiDistribusi();
    }

    function updateSemuaTargetDistribusiRows() {
        plottingKermaRows.forEach((_, index) => updateTargetDistribusiRow(index));
    }

    function renderPlottingKerma() {
        if (!headTabelPlottingKerma || !bodyTabelPlottingKerma) return;
        if (hitungMinimalSisaPksPlotting() > 0 && !dataSisaAnggaranPlottingDimuat && !sedangMemuatDaftarPksPlotting) {
            muatDataSisaAnggaranPlotting();
        }
        if (!plottingKermaRows.length) plottingKermaRows.push(buatBarisPlottingKerma());
        plottingKermaRows.forEach(pastikanPksPlotting);
        const rowsAktif = plottingKermaRows
            .map((row, rowIndex) => ({ row, rowIndex }))
            .filter(({ row }) => row.status === 'Aktif');
        const tabel = document.getElementById('tabelPlottingKerma');
        if (tabel) tabel.style.minWidth = `${620 + (jumlahPksPlotting * rolePlottingKerma.length * 44)}px`;

        const pksHeaders = Array.from({ length: jumlahPksPlotting }, (_, idx) => {
            const no = idx + 1;
            const alokasi = getPksAlokasiByNomor(no);
            const kodeFile = alokasi?.kode_file || alokasi?.id_program || '';
            const sisaAnggaran = alokasi?.sisa_anggaran_display || '';
            const title = alokasi
                ? `${kodeFile} - ${alokasi.judul_pks || '-'} - Sisa ${sisaAnggaran}`
                : `PKS ${no}`;
            return `
                <th class="plotting-pks-head" colspan="${rolePlottingKerma.length}" title="${esc(title)}">
                    <span>PKS ${no}</span>
                    ${alokasi ? `<small>${esc(kodeFile)} · ${esc(sisaAnggaran)}</small>` : ''}
                </th>
            `;
        }).join('');
        const roleHeaders = Array.from({ length: jumlahPksPlotting }, () => (
            rolePlottingKerma.map(role => `<th class="plotting-role-head" title="${esc(namaJabatanPlotting(role))}">${esc(labelJabatanPlotting(role))}</th>`).join('')
        )).join('');

        headTabelPlottingKerma.innerHTML = `
            <tr>
                <th rowspan="2" class="plotting-col-no">No.</th>
                <th rowspan="2" class="plotting-col-nama">Nama</th>
                <th rowspan="2" class="plotting-col-peran">Peran</th>
                <th rowspan="2" class="plotting-col-target">Target Kerma</th>
                ${pksHeaders}
                <th rowspan="2" class="plotting-col-total">Total</th>
            </tr>
            <tr>${roleHeaders}</tr>
        `;

        if (!rowsAktif.length) {
            bodyTabelPlottingKerma.innerHTML = `<tr class="table-state-row"><td colspan="${5 + (jumlahPksPlotting * rolePlottingKerma.length)}"><div class="table-state">Belum ada pegawai aktif untuk Plot SK.</div></td></tr>`;
            return;
        }

        bodyTabelPlottingKerma.innerHTML = rowsAktif.map(({ row, rowIndex }, index) => {
            const pksCells = Array.from({ length: jumlahPksPlotting }, (_, idx) => {
                const noPks = idx + 1;
                return rolePlottingKerma.map(role => `
                    <td class="plotting-role-cell">
                        <label class="plotting-check" title="${esc(namaJabatanPlotting(role))} PKS ${noPks}">
                            <input type="checkbox" data-row="${rowIndex}" data-pks="${noPks}" data-role="${esc(role)}" ${row.pks?.[noPks]?.[role] ? 'checked' : ''}>
                            <span aria-hidden="true"></span>
                        </label>
                    </td>
                `).join('');
            }).join('');
            return `
                <tr>
                    <td class="plotting-col-no">${index + 1}</td>
                    <td>
                        <input type="text" class="form-input plotting-input plotting-input--name" data-row="${rowIndex}" data-field="nama" value="${esc(row.nama || '')}" placeholder="Nama personel">
                    </td>
                    <td>
                        <select class="form-input plotting-input plotting-input--select" data-row="${rowIndex}" data-field="peran">
                            <option value="Dosen" ${row.peran === 'Dosen' ? 'selected' : ''}>Dosen</option>
                            <option value="Staf" ${row.peran === 'Staf' ? 'selected' : ''}>Staf</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" inputmode="numeric" class="form-input plotting-input plotting-input--number plotting-input--money" data-row="${rowIndex}" data-field="target_kerma" value="${esc(formatRupiahKomaDash(row.target_kerma))}" placeholder="Rp 0,-">
                    </td>
                    ${pksCells}
                    <td class="plotting-total" data-total-row="${rowIndex}">${hitungTotalPlotting(row)}</td>
                </tr>
            `;
        }).join('');
    }

    function syncPlottingKermaInput(target) {
        const rowIndex = Number(target.dataset.row);
        const row = plottingKermaRows[rowIndex];
        if (!row) return;
        pastikanPksPlotting(row);

        if (target.dataset.distribusiRole) {
            const roles = pastikanDistribusiRoles(row);
            const role = target.dataset.distribusiRole;
            if (!isRoleBolehDistribusi(row, role)) {
                target.value = '';
                roles[role] = '';
            } else {
                roles[role] = target.value;
                if (isStafDistribusi(row) && hitungBulanRoleDistribusi(roles[role], role) > 0) {
                    rapihkanBatasStafDistribusi(row, role);
                    target.value = roles[role] || '';
                } else if (isDosenDistribusi(row)) {
                    rapihkanBatasDosenDistribusi(row);
                }
            }
            updateTargetDistribusiRow(rowIndex);
            simpanPlottingKerma();
            return;
        }

        if (target.dataset.role && target.dataset.pks) {
            const noPks = target.dataset.pks;
            const role = target.dataset.role;
            row.pks[noPks][role] = Boolean(target.checked);
            updateTotalPlotting(rowIndex);
            simpanPlottingKerma();
            return;
        }

        const field = target.dataset.field;
        if (!field) return;
        row[field] = target.value;
        if (field === 'status' || field === 'target_kerma') updateTargetDistribusiRow(rowIndex);
        if (field === 'target_kerma') updateRingkasanDasarPlotting();
        simpanPlottingKerma();
    }

    function syncPegawaiInput(target) {
        const rowIndex = Number(target.dataset.row);
        const field = target.dataset.field;
        const row = plottingKermaRows[rowIndex];
        if (!row || !field) return;
        row[field] = target.value;
        if (field === 'status' || field === 'target_kerma') {
            updateTargetDistribusiRow(rowIndex);
            updateRingkasanDasarPlotting();
        }
        simpanPlottingKerma();
        if (['jabatan_sbm', 'jabatan_sbm_2', 'level_jabatan_1', 'level_jabatan_2'].includes(field)) renderDatalistPegawai();
        if (sectionJabatan?.classList.contains('active')) renderDaftarJabatan();
    }

    function normalisasiJabatanPegawaiInput(target) {
        if (!target || target.dataset.field !== 'jabatan_sbm') return;
        const rowIndex = Number(target.dataset.row);
        const row = plottingKermaRows[rowIndex];
        if (!row) return;
        const hasil = pecahJabatanSbm(row.jabatan_sbm, row.jabatan_sbm_2);
        if (hasil.jabatan_sbm === row.jabatan_sbm && hasil.jabatan_sbm_2 === row.jabatan_sbm_2) {
            simpanPlottingKerma();
            return;
        }
        row.jabatan_sbm = hasil.jabatan_sbm;
        row.jabatan_sbm_2 = hasil.jabatan_sbm_2;
        simpanPlottingKerma();
        renderDatalistPegawai();
        renderDaftarPegawai();
        if (sectionJabatan?.classList.contains('active')) renderDaftarJabatan();
    }

    function syncMasterJabatanLevelInput(target) {
        if (!target?.dataset?.masterJabatan) return;
        setLevelJabatanMaster(target.dataset.masterJabatan, target.value);
        simpanPlottingKerma();
        renderDatalistPegawai();
        if (sectionPegawai?.classList.contains('active')) renderDaftarPegawai();
    }

    function renameJabatanMaster(oldName, newName, level) {
        const namaLama = normalisasiNamaJabatan(oldName);
        const namaBaru = normalisasiNamaJabatan(newName);
        if (!namaBaru) return false;

        const oldKey = keyMasterJabatan(namaLama);
        const newKey = keyMasterJabatan(namaBaru);
        const levelFinal = normalisasiLevelJabatan(
            level || masterLevelJabatanPlotting[newKey] || masterLevelJabatanPlotting[oldKey] || ''
        );

        plottingKermaRows.forEach(row => {
            if (keyMasterJabatan(row.jabatan_sbm) === oldKey) row.jabatan_sbm = namaBaru;
            if (keyMasterJabatan(row.jabatan_sbm_2) === oldKey) row.jabatan_sbm_2 = namaBaru;
        });

        if (oldKey && oldKey !== newKey) delete masterLevelJabatanPlotting[oldKey];
        setLevelJabatanMaster(namaBaru, levelFinal);
        return true;
    }

    function handleJabatanRowAction(target) {
        const button = target.closest?.('[data-jabatan-row-action]');
        if (!button) return;
        const action = button.dataset.jabatanRowAction;
        const key = button.dataset.jabatanKey;
        const nama = button.dataset.jabatanNama || '';

        if (action === 'edit') {
            jabatanEditKey = key;
            renderDaftarJabatan();
            return;
        }

        if (action === 'cancel') {
            jabatanEditKey = null;
            renderDaftarJabatan();
            return;
        }

        if (action !== 'save') return;
        const rowElement = button.closest('tr');
        const namaInput = rowElement?.querySelector('[data-jabatan-name-input]');
        const levelInput = rowElement?.querySelector('[data-jabatan-level-input]');
        if (!renameJabatanMaster(nama, namaInput?.value || '', levelInput?.value || '')) {
            alert('Nama Jabatan wajib diisi dan tidak boleh menggunakan nama yang dihapus.');
            return;
        }
        jabatanEditKey = null;
        simpanPlottingKerma();
        renderDatalistPegawai();
        renderDaftarJabatan();
        if (sectionPegawai?.classList.contains('active')) renderDaftarPegawai();
    }

    function nilaiInputPegawai(rowElement, field) {
        return rowElement?.querySelector(`[data-pegawai-field="${field}"]`)?.value ?? '';
    }

    function handlePegawaiRowAction(target) {
        const button = target.closest?.('[data-pegawai-row-action]');
        if (!button) return;
        const rowIndex = Number(button.dataset.row);
        const action = button.dataset.pegawaiRowAction;
        const row = plottingKermaRows[rowIndex];
        if (!row) return;

        if (action === 'edit') {
            pegawaiEditRowIndex = rowIndex;
            renderDaftarPegawai();
            return;
        }

        if (action === 'cancel') {
            pegawaiEditRowIndex = null;
            renderDaftarPegawai();
            return;
        }

        if (action !== 'save') return;
        const rowElement = button.closest('tr');
        const jabatan = pecahJabatanSbm(nilaiInputPegawai(rowElement, 'jabatan_sbm'), nilaiInputPegawai(rowElement, 'jabatan_sbm_2'));
        row.nama = nilaiInputPegawai(rowElement, 'nama').trim();
        row.peran = nilaiInputPegawai(rowElement, 'peran') === 'Staf' ? 'Staf' : 'Dosen';
        row.status = statusDistribusiPlotting.includes(nilaiInputPegawai(rowElement, 'status'))
            ? nilaiInputPegawai(rowElement, 'status')
            : 'Aktif';
        row.jabatan_sbm = normalisasiNamaJabatan(jabatan.jabatan_sbm);
        row.jabatan_sbm_2 = normalisasiNamaJabatan(jabatan.jabatan_sbm_2);
        row.target_kerma = String(parseNominalRupiah(nilaiInputPegawai(rowElement, 'target_kerma')));
        row.keterangan = nilaiInputPegawai(rowElement, 'keterangan').trim();
        pegawaiEditRowIndex = null;
        simpanPlottingKerma();
        renderDatalistPegawai();
        renderDaftarPegawai();
        updateTargetDistribusiRow(rowIndex);
        updateRingkasanDasarPlotting();
        if (sectionJabatan?.classList.contains('active')) renderDaftarJabatan();
    }

    function formatInputNominalPlotting(target) {
        if (!target?.classList?.contains('plotting-input--money')) return;
        target.value = formatRupiahKomaDash(target.value);
    }

    function formatInputDistribusiRole(target) {
        if (!target?.dataset?.distribusiRole) return;
        const rowIndex = Number(target.dataset.row);
        const row = plottingKermaRows[rowIndex];
        const role = target.dataset.distribusiRole;
        if (!row || !role) return;
        if (!isRoleBolehDistribusi(row, role)) {
            target.value = '';
            const roles = pastikanDistribusiRoles(row);
            roles[role] = '';
            updateTargetDistribusiRow(rowIndex);
            simpanPlottingKerma();
            return;
        }
        const normalized = normalisasiNilaiDistribusiRole(target.value, role);
        const roles = pastikanDistribusiRoles(row);
        roles[role] = normalized;
        if (isStafDistribusi(row)) rapihkanBatasStafDistribusi(row, role);
        if (isDosenDistribusi(row)) rapihkanBatasDosenDistribusi(row);
        const finalValue = roles[role] || '';
        target.value = finalValue;
        updateTargetDistribusiRow(rowIndex);
        simpanPlottingKerma();
    }

    document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', e => e.preventDefault()));
    menuDaftar.addEventListener('click',             () => switchPage(menuDaftar, sectionDaftar));
    menuMitra.addEventListener('click',              () => { switchPage(menuMitra, sectionMitra); AmbilDataMitraDanRender(); });
    menuPegawai?.addEventListener('click',           () => { switchPage(menuPegawai, sectionPegawai); renderDaftarPegawai(); });
    menuJabatan?.addEventListener('click',           () => { switchPage(menuJabatan, sectionJabatan); renderDaftarJabatan(); });
    menuMahasiswa.addEventListener('click',          () => { switchPage(menuMahasiswa, sectionMahasiswa); AmbilDataMahasiswaDanRender(); });
    menuIndustri.addEventListener('click',           () => { switchPage(menuIndustri, sectionIndustri); AmbilDataIndustriDanRender(); });
    menuTambahMitra.addEventListener('click',        () => { switchPage(menuTambahMitra, sectionTambahMitra); populateSelectIndustri(); });
    menuTambah.addEventListener('click',             () => { switchPage(menuTambah, sectionTambah); populateSelectNamaMitra(); });
    menuPendapatan.addEventListener('click',          () => { switchPage(menuPendapatan, sectionRealisasi); setTabRealisasi('rencana'); AmbilDataRealisasiDanRender(); });
    menuPengeluaran.addEventListener('click',         () => { switchPage(menuPengeluaran, sectionRealisasi); setTabRealisasi('rab'); AmbilDataRealisasiDanRender(); });
    menuSisaAnggaran.addEventListener('click',        () => { switchPage(menuSisaAnggaran, sectionSisaAnggaran); loadSisaAnggaran(); });
    menuTambahMahasiswa.addEventListener('click',    () => switchPage(menuTambahMahasiswa, sectionTambahMahasiswa));
    menuTambahIndustri.addEventListener('click',     () => switchPage(menuTambahIndustri, sectionTambahIndustri));
    menuPlottingKerma?.addEventListener('click',     () => { switchPage(menuPlottingKerma, sectionPlottingKerma); setTabPlottingKerma(tabAktifPlottingKerma); });
    menuLaporan.addEventListener('click',            () => switchPage(menuLaporan, sectionLaporan));
    menuKontrak.addEventListener('click',            () => { switchPage(menuKontrak, sectionKontrak); loadKontrak(); });
    menuPimpinan?.addEventListener('click',          () => { switchPage(menuPimpinan, sectionPimpinan); loadDashboardPimpinan(); });
    generalTahunPimpinan?.addEventListener('change', () => {
        loadIndikatorPimpinan();
    });
    document.querySelectorAll('[data-indicator-detail]').forEach(panel => {
        panel.addEventListener('click', e => {
            if (e.target.closest('button, a, input, select, textarea')) return;
            bukaModalIndikator(panel.dataset.indicatorDetail);
        });
        panel.addEventListener('keydown', e => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            bukaModalIndikator(panel.dataset.indicatorDetail);
        });
    });
    btnTutupModalIndikator?.addEventListener('click', tutupModalIndikator);
    modalIndikatorDetail?.addEventListener('click', e => {
        if (e.target === modalIndikatorDetail) tutupModalIndikator();
    });
    btnLihatNeracaKeuangan?.addEventListener('click', bukaModalNeracaKeuangan);
    btnTutupModalNeracaKeuangan?.addEventListener('click', tutupModalNeracaKeuangan);
    modalNeracaKeuangan?.addEventListener('click', e => {
        if (e.target === modalNeracaKeuangan) tutupModalNeracaKeuangan();
    });
    btnOkModalSimulasiDistribusi?.addEventListener('click', tutupModalSimulasiDistribusi);
    btnLanjutModalSimulasiDistribusi?.addEventListener('click', simpanHasilSimulasiTertunda);
    btnBerhentiModalSimulasiDistribusi?.addEventListener('click', batalHasilSimulasiTertunda);
    btnTutupModalSimulasiDistribusi?.addEventListener('click', tutupModalSimulasiDistribusi);
    modalSimulasiDistribusi?.addEventListener('click', e => {
        if (e.target === modalSimulasiDistribusi) tutupModalSimulasiDistribusi();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modalIndikatorDetail?.style.display === 'flex') tutupModalIndikator();
        if (e.key === 'Escape' && modalNeracaKeuangan?.style.display === 'flex') tutupModalNeracaKeuangan();
        if (e.key === 'Escape' && modalSimulasiDistribusi?.style.display === 'flex') tutupModalSimulasiDistribusi();
    });
    btnTambahPegawai?.addEventListener('click', () => {
        plottingKermaRows.push(buatBarisPlottingKerma());
        simpanPlottingKerma();
        renderDaftarPegawai();
        updateRingkasanDasarPlotting();
    });
    bodyTabelPegawai?.addEventListener('input', e => syncPegawaiInput(e.target));
    bodyTabelPegawai?.addEventListener('change', e => syncPegawaiInput(e.target));
    bodyTabelPegawai?.addEventListener('click', e => handlePegawaiRowAction(e.target));
    bodyTabelPegawai?.addEventListener('focusout', e => {
        formatInputNominalPlotting(e.target);
        normalisasiJabatanPegawaiInput(e.target);
    });
    bodyTabelJabatan?.addEventListener('click', e => handleJabatanRowAction(e.target));
    btnEditMasterTarif?.addEventListener('click', toggleEditMasterTarif);
    btnToggleHargaJabatan?.addEventListener('click', toggleCollapseHargaJabatan);
    btnSimpanPerhitunganDasar?.addEventListener('click', simpanPerhitunganDasarPlotting);
    periodePengelolaAwal?.addEventListener('change', syncPeriodePengelolaKerma);
    periodePengelolaAkhir?.addEventListener('change', syncPeriodePengelolaKerma);
    btnSimulasiDistribusi?.addEventListener('click', simulasikanTargetDistribusi);
    btnOptimalkanDistribusi?.addEventListener('click', optimalkanDistribusiSaatIni);
    btnResetSimulasiDistribusi?.addEventListener('click', resetSimulasiDistribusi);
    pksDitetapkanPlotting?.addEventListener('input', syncPksDitetapkanPlotting);
    pksDitetapkanPlotting?.addEventListener('change', syncPksDitetapkanPlotting);
    tabTargetDistribusi?.addEventListener('click', () => setTabPlottingKerma('target'));
    tabBatasanSimulasiPlotting?.addEventListener('click', () => setTabPlottingKerma('batasan'));
    tabPlottingDasar?.addEventListener('click', () => setTabPlottingKerma('dasar'));
    tabDaftarPksPlotting?.addEventListener('click', () => setTabPlottingKerma('daftarPks'));
    tabPlotKerma?.addEventListener('click', () => setTabPlottingKerma('plot'));
    btnTambahBatasanUmumSimulasi?.addEventListener('click', tambahBatasanUmumSimulasi);
    btnTambahBatasanLevelSimulasi?.addEventListener('click', tambahBatasanLevelSimulasi);
    bodyTabelBatasanSimulasiPlotting?.addEventListener('click', e => {
        const button = e.target?.closest?.('[data-hapus-batasan-umum]');
        if (!button) return;
        hapusBatasanUmumSimulasi(button.dataset.hapusBatasanUmum);
    });
    bodyTabelBatasanSimulasiPlotting?.addEventListener('change', e => syncBatasanSimulasiInput(e.target));
    bodyTabelBatasanSimulasiPlotting?.addEventListener('focusout', e => {
        formatInputNominalPlotting(e.target);
        syncBatasanSimulasiInput(e.target);
    });
    bodyTabelLevelJabatanSimulasiPlotting?.addEventListener('click', e => {
        const button = e.target?.closest?.('[data-hapus-batasan-level]');
        if (!button) return;
        hapusBatasanLevelSimulasi(button.dataset.hapusBatasanLevel);
    });
    bodyTabelLevelJabatanSimulasiPlotting?.addEventListener('change', e => syncBatasanSimulasiInput(e.target));
    bodyTabelLevelJabatanSimulasiPlotting?.addEventListener('focusout', e => syncBatasanSimulasiInput(e.target));
    bodyTabelHargaJabatan?.addEventListener('input', e => syncPerhitunganDasarPlottingInput(e.target));
    bodyTabelHargaJabatan?.addEventListener('focusout', e => formatInputNominalPlotting(e.target));
    bodyTabelTargetDistribusi?.addEventListener('input', e => syncPlottingKermaInput(e.target));
    bodyTabelTargetDistribusi?.addEventListener('change', e => syncPlottingKermaInput(e.target));
    bodyTabelTargetDistribusi?.addEventListener('focusout', e => {
        formatInputNominalPlotting(e.target);
        formatInputDistribusiRole(e.target);
    });
    bodyTabelTargetDistribusi?.addEventListener('click', e => {
        const tombolNama = e.target.closest('[data-target-name-toggle]');
        if (!tombolNama) return;
        const expanded = !tombolNama.classList.contains('is-expanded');
        tombolNama.classList.toggle('is-expanded', expanded);
        tombolNama.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    bodyTabelDaftarPksPlotting?.addEventListener('change', e => {
        if (e.target?.matches?.('[data-pks-pilih-id]')) togglePilihanPksAlokasi(e.target);
        if (e.target?.matches?.('[data-pks-alokasi-id]')) setNomorPksAlokasi(e.target);
    });
    bodyTabelPlottingKerma?.addEventListener('input', e => syncPlottingKermaInput(e.target));
    bodyTabelPlottingKerma?.addEventListener('change', e => syncPlottingKermaInput(e.target));
    bodyTabelPlottingKerma?.addEventListener('focusout', e => formatInputNominalPlotting(e.target));

    const isPimpinan = currentUser?.role === 'atasan';
    document.querySelectorAll('.role-pimpinan-only').forEach(el => el.classList.toggle('is-hidden', !isPimpinan));
    if (isPimpinan) initPimpinanDefaults();

    function switchPage(menu, section) {
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.remove('active');
            el.removeAttribute('aria-current');
        });
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        menu.classList.add('active');
        menu.setAttribute('aria-current', 'page');
        section.classList.add('active');
        section.scrollTop = 0;
    }

    function buatToggleForm(btnId, sectionId) {
        const btn = document.getElementById(btnId);
        const section = document.getElementById(sectionId);
        const formPanel = section.querySelector('.mahasiswa-panel--form');
        const listPanel = section.querySelector('.mahasiswa-panel--list');

        btn.addEventListener('click', () => {
            const sedangCollapsed = formPanel.classList.contains('collapsed');
            if (sedangCollapsed) {
                formPanel.classList.remove('collapsed');
                listPanel.classList.remove('form-hidden');
                btn.textContent = '✕ Tutup';
                btn.classList.replace('state-closed', 'state-open');
            } else {
                formPanel.classList.add('collapsed');
                listPanel.classList.add('form-hidden');
                btn.textContent = '＋ Tambah';
                btn.classList.replace('state-open', 'state-closed');
            }
        });
    }


    function renderTabel(data) {
        bodyTabelKerma.innerHTML = '';
        if (data.length === 0) {
            bodyTabelKerma.innerHTML = tableState(17, 'empty', 'Tidak ada data yang cocok', 'Coba ubah kata kunci pencarian atau reset filter kolom.');
            return;
        }
        data.forEach(item => {
            const clsStatus = item.status_kontrak === 'Berjalan' ? 'badge-berjalan' : 'badge-berakhir';
            const jenisClass = `badge-jenis-${String(item.kode_jenis_kerma || 'unknown').toLowerCase()}`;
            const w = item.peringatan; // jumlah bulan (0–11) atau null
            const tier = w === null ? null : w <= 3 ? '3bln' : w <= 6 ? '6bln' : '1thn';
            const trClass   = tier ? `warn-${tier}` : '';
            const warnLabel = w === null ? '' : w === 0 ? '&lt;1 Bln' : `${w} Bln`;
            const warnBadge = tier
                ? `<span class="badge badge-warn-${tier}">⚠ ${warnLabel}</span>`
                : '';
            bodyTabelKerma.insertAdjacentHTML('beforeend', `
                <tr class="${trClass}">
                    <td>${esc(item.no)}</td>
                    <td><span class="kode-file-tag">${esc(item.id_program)}</span></td>
                    <td class="td-truncate"><strong>${esc(item.nama_mitra)}</strong></td>
                    <td>${esc(item.no_kontrak_institusi)}</td>
                    <td>${esc(item.no_kontrak_mitra)}</td>
                    <td class="td-truncate">${esc(item.judul_pks)}</td>
                    <td>${item.strata ? item.strata.split(',').map(s => `<span class="strata-badge">${esc(s.trim())}</span>`).join(' ') : ''}</td>
                    <td>${esc(item.tgl_kontrak)}</td>
                    <td>${esc(item.tgl_akhir_kontrak)}</td>
                    <td>${esc(item.nilai_kontrak)}</td>
                    <td>${esc(item.kode_file)}</td>
                    <td><span class="badge ${jenisClass}">${esc(item.jenis_kerma || 'Belum terklasifikasi')}</span></td>
                    <td style="text-align:right;">${esc(item.jumlah_mahasiswa)}</td>
                    <td>${item.cara_pembayaran
                        ? `<span class="badge ${item.cara_pembayaran === 'Lump Sum' ? 'badge-penuh' : 'badge-bertahap'}">${esc(item.cara_pembayaran)}${item.tipe_cicilan ? ' (' + esc(item.tipe_cicilan) + ')' : ''}</span>`
                        : ''}</td>
                    <td><span class="badge ${clsStatus}">${esc(item.status_kontrak)}</span> ${warnBadge}</td>
                    <td class="td-file-cell">
                        ${item.file_kontrak
                            ? `<a href="/uploads/kontrak/${esc(item.file_kontrak)}" target="_blank" class="file-link" title="${esc(item.file_kontrak)}">📄 Lihat</a>
                               <button class="btn-ganti-file" data-id="${esc(item.id_program)}" title="Ganti file">↺ Ganti</button>`
                            : `<button class="btn-upload-file" data-id="${esc(item.id_program)}" title="Upload file kontrak">📎 Upload</button>`
                        }
                    </td>
                    <td style="white-space:nowrap;">
                        <button class="btn-edit-kerma" data-id="${esc(item.id_program)}">✏ Edit</button>
                        <button class="btn-addendum-kerma" data-id="${esc(item.id_program)}">📋 Addendum <span class="addendum-count-badge ${item.jumlah_addendum > 0 ? 'has-addendum' : ''}">${item.jumlah_addendum}</span></button>
                        <button class="btn-hapus-kerma" data-id="${esc(item.id_program)}" data-nama="${esc(item.nama_mitra)}">🗑 Hapus</button>
                    </td>
                </tr>
            `);
        });
    }

    function terapkanFilter() {
        const cari = filterCari.value.toLowerCase().trim();

        let hasil = allData.filter(item => cocokPencarianGlobal(item, cari));
        hasil = colFilterKerma.applyTo(hasil);

        renderTabel(hasil);

        const adaFilter = cari || Object.keys(colFilterKerma.colFilters).length > 0;
        infoHasilFilter.textContent = adaFilter
            ? `Menampilkan ${hasil.length} dari ${allData.length} data`
            : '';
    }

    function hitungPeringatan(item) {
        if (item.status_kontrak !== 'Berjalan') return null;
        const tglAkhir = parseDate(item.tgl_akhir_kontrak_input);
        if (!tglAkhir) return null;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        tglAkhir.setHours(0, 0, 0, 0);
        const hariSisa = Math.ceil((tglAkhir - today) / (1000 * 60 * 60 * 24));
        if (hariSisa > 365 || hariSisa < 0) return null;
        // Hitung bulan sisa secara kalender (bukan sekadar /30)
        let bulan = (tglAkhir.getFullYear() - today.getFullYear()) * 12
                  + (tglAkhir.getMonth() - today.getMonth());
        if (tglAkhir.getDate() < today.getDate()) bulan--;
        return Math.max(0, bulan); // 0 = kurang dari 1 bulan penuh
    }

    async function AmbilDataDanRender() {
        try {
            bodyTabelKerma.innerHTML = tableState(17, 'loading', 'Memuat data kerma', 'Mengambil riwayat kerja sama dan status kontrak.');
            const respon = await fetch('/api/daftar-kerma');
            allData = await respon.json();
            cicilanTerminCache = new Map();
            allData.forEach(item => { item.peringatan = hitungPeringatan(item); });
            updateKermaInsights();

            containerOpsiLaporan.innerHTML = '';
            allData.forEach(item => {
                containerOpsiLaporan.insertAdjacentHTML('beforeend', `
                    <label class="list-item" data-search="${esc(teksPencarianGlobal(item))}">
                        <input type="checkbox" name="program" value="${esc(item.id_program)}">
                        <div class="list-item-text">
                            <strong>${esc(item.nama_mitra)}</strong>
                            <small>${esc(item.judul_pks)}</small>
                        </div>
                        <span class="kode-file-tag">${esc(item.kode_file)}</span>
                    </label>
                `);
            });

            renderTabel(allData);
            populateKermaDropdowns();
            populatePimpinanTahunOptions();
        } catch (e) {
            bodyTabelKerma.innerHTML = tableState(17, 'error', 'Gagal memuat data kerma', 'Periksa koneksi server atau coba muat ulang halaman.');
        }
    }

    muatPlottingKermaDariServer();
    AmbilDataDanRender();
    if (isPimpinan && menuPimpinan && sectionPimpinan) {
        switchPage(menuPimpinan, sectionPimpinan);
        loadIndikatorPimpinan();
    }

    filterCari.addEventListener('input', terapkanFilter);

    btnResetFilter.addEventListener('click', () => {
        filterCari.value = '';
        colFilterKerma.clearAll();
        terapkanFilter();
    });

    const colFilterKerma = makeColFilter('sectionDaftar', () => allData, terapkanFilter);
    colFilterKerma.initBtns();

    function itemsVisible() {
        return Array.from(containerOpsiLaporan.querySelectorAll('.list-item'))
            .filter(el => el.style.display !== 'none');
    }

    function updateSelectAll() {
        const visible = itemsVisible();
        const terpilih = visible.filter(el => el.querySelector('input[type="checkbox"]').checked);
        chkSelectAll.checked = visible.length > 0 && terpilih.length === visible.length;
        chkSelectAll.indeterminate = terpilih.length > 0 && terpilih.length < visible.length;
    }

    function filterLaporan() {
        const kata = filterKodeFile.value.toLowerCase().trim();
        const items = containerOpsiLaporan.querySelectorAll('.list-item');
        const terms = kata.split(/\s+/).filter(Boolean);
        let terlihat = 0;
        items.forEach(el => {
            const haystack = (el.dataset.search || el.textContent || '').toLowerCase();
            const cocok = terms.length === 0 || terms.every(term => haystack.includes(term));
            el.style.display = cocok ? '' : 'none';
            if (cocok) terlihat++;
        });
        infoHasilLaporan.textContent = kata ? `${terlihat} dari ${items.length} ditampilkan` : '';
        updateSelectAll();
    }

    chkSelectAll.addEventListener('change', () => {
        itemsVisible().forEach(el => {
            el.querySelector('input[type="checkbox"]').checked = chkSelectAll.checked;
        });
    });

    containerOpsiLaporan.addEventListener('change', updateSelectAll);

    filterKodeFile.addEventListener('input', filterLaporan);

    const formTambah = document.getElementById('formTambahKerma');
    const formAlert = document.getElementById('formAlert');

    // ---- LOGIKA CICILAN DINAMIS ----
    function buatBarisKerja(label) {
        const div = document.createElement('div');
        div.className = 'cicilan-row';
        div.innerHTML = `
            <input type="text" class="form-input cicilan-label-input" value="${esc(label)}" placeholder="Nama">
            <input type="number" class="form-input cicilan-nominal" placeholder="Nominal (Rp)" min="0">
            <input type="date" class="form-input cicilan-batas">
            <button type="button" class="btn-hapus-cicilan" title="Hapus">✕</button>
        `;
        div.querySelector('.btn-hapus-cicilan').addEventListener('click', () => div.remove());
        return div;
    }

    function renumberCicilan(container, prefix) {
        container.querySelectorAll('.cicilan-label-input').forEach((el, i) => {
            el.value = `${prefix} ${i + 1}`;
        });
    }

    function kumpulkanCicilan(containerId) {
        const rows = document.getElementById(containerId).querySelectorAll('.cicilan-row');
        return Array.from(rows).map(row => ({
            label: row.querySelector('.cicilan-label-input').value.trim() || '',
            nominal: row.querySelector('.cicilan-nominal').value || '0',
            batas_akhir: row.querySelector('.cicilan-batas').value || ''
        }));
    }

    // Tampilkan/sembunyikan 3 seksi pembayaran
    function toggleSeksiPembayaran(cara, penuhId, terminId, bertahapId) {
        document.getElementById(penuhId).style.display    = cara === 'Lump Sum'   ? '' : 'none';
        document.getElementById(terminId).style.display   = cara === 'Termin'     ? '' : 'none';
        document.getElementById(bertahapId).style.display = cara === 'Unit Price' ? '' : 'none';
    }

    function labelPrefix(container) {
        if (container.id === 'daftarCicilanTermin' || container.id === 'editDaftarCicilanTermin') return 'Termin';
        return 'Semester';
    }

    // Tambah Kerma — setup
    const caraPembayaranTambah = document.getElementById('caraPembayaranTambah');
    const nilaiKontrakInput    = formTambah.querySelector('[name="nilai_kontrak"]');
    const jmlMhsInput          = formTambah.querySelector('[name="jumlah_mahasiswa"]');

    function sumNominalCicilan(containerId) {
        let total = 0;
        document.getElementById(containerId)?.querySelectorAll('.cicilan-nominal').forEach(el => {
            total += parseFloat(el.value) || 0;
        });
        return total;
    }

    function updateNilaiKontrakTambah() {
        const cara = caraPembayaranTambah.value;
        if (cara === 'Termin') {
            nilaiKontrakInput.value = sumNominalCicilan('daftarCicilanTermin');
        } else if (cara === 'Unit Price') {
            const jml   = parseFloat(jmlMhsInput.value) || 0;
            const harga = parseFloat(document.getElementById('hargaPerMhsTambah')?.value) || 0;
            nilaiKontrakInput.value = jml * harga;
        }
    }

    function setReadonlyNilaiKontrak(cara) {
        const readonly = cara === 'Termin' || cara === 'Unit Price';
        nilaiKontrakInput.readOnly = readonly;
        nilaiKontrakInput.style.background = readonly ? '#edf2f7' : '';
        nilaiKontrakInput.style.color = readonly ? '#718096' : '';
    }

    caraPembayaranTambah.addEventListener('change', () => {
        const cara = caraPembayaranTambah.value;
        toggleSeksiPembayaran(cara, 'seksiPenuh', 'seksiTermin', 'seksiBertahap');
        setReadonlyNilaiKontrak(cara);
        if (cara === 'Termin') {
            const c = document.getElementById('daftarCicilanTermin');
            if (c.children.length === 0) c.appendChild(buatBarisKerja('Termin 1'));
            updateNilaiKontrakTambah();
        } else if (cara === 'Unit Price') {
            const c = document.getElementById('daftarCicilan');
            if (c.children.length === 0) c.appendChild(buatBarisKerja('Semester 1'));
            updateNilaiKontrakTambah();
        }
    });

    jmlMhsInput.addEventListener('input', updateNilaiKontrakTambah);
    document.getElementById('hargaPerMhsTambah').addEventListener('input', updateNilaiKontrakTambah);

    document.getElementById('daftarCicilan').addEventListener('input', e => {
        if (e.target.classList.contains('cicilan-nominal')) updateNilaiKontrakTambah();
    });
    document.getElementById('daftarCicilanTermin').addEventListener('input', e => {
        if (e.target.classList.contains('cicilan-nominal')) updateNilaiKontrakTambah();
    });

    document.getElementById('btnTambahCicilan').addEventListener('click', () => {
        const c = document.getElementById('daftarCicilan');
        c.appendChild(buatBarisKerja(`Semester ${c.children.length + 1}`));
    });
    document.getElementById('btnTambahCicilanTermin').addEventListener('click', () => {
        const c = document.getElementById('daftarCicilanTermin');
        c.appendChild(buatBarisKerja(`Termin ${c.children.length + 1}`));
    });

    formTambah.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawData = Object.fromEntries(new FormData(formTambah).entries());
        delete rawData.file_kontrak; // File object tidak bisa di-JSON, diambil terpisah

        if (rawData.cara_pembayaran === 'Unit Price') {
            rawData.cicilan = JSON.stringify(kumpulkanCicilan('daftarCicilan'));
        } else if (rawData.cara_pembayaran === 'Termin') {
            rawData.cicilan = JSON.stringify(kumpulkanCicilan('daftarCicilanTermin'));
        }

        const fileInputForm = document.getElementById('fileKontrakForm');
        const fileTerpilih = fileInputForm?.files[0];
        if (fileTerpilih) {
            rawData.file_base64 = await bacaFileBase64(fileTerpilih);
            rawData.file_nama = fileTerpilih.name;
        }

        const data = rawData;
        formAlert.style.display = 'none';
        const btnSubmit = formTambah.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Menyimpan...';

        try {
            const res = await fetch('/api/tambah-kerma', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const hasil = await res.json();

            if (res.ok) {
                formAlert.className = 'form-alert form-alert--success';
                formAlert.textContent = hasil.pesan;
                formAlert.style.display = 'inline-block';
                formTambah.reset();
                await AmbilDataDanRender();
            } else {
                formAlert.className = 'form-alert form-alert--error';
                formAlert.textContent = hasil.pesan;
                formAlert.style.display = 'inline-block';
            }
        } catch {
            formAlert.className = 'form-alert form-alert--error';
            formAlert.textContent = 'Gagal terhubung ke server.';
            formAlert.style.display = 'inline-block';
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Simpan Data Kerma';
        }
    });

    document.addEventListener('click', e => {
        const cell = e.target.closest('.td-truncate');
        document.querySelectorAll('.td-truncate.expanded').forEach(item => {
            if (item !== cell) {
                item.classList.remove('expanded');
                item.setAttribute('aria-expanded', 'false');
            }
        });
        if (!cell) return;
        cell.classList.toggle('expanded');
        cell.setAttribute('aria-expanded', cell.classList.contains('expanded') ? 'true' : 'false');
    });

    bodyTabelKerma.addEventListener('click', async (e) => {
        const btnFile = e.target.closest('.btn-upload-file, .btn-ganti-file');
        if (btnFile) {
            uploadTargetId = btnFile.dataset.id;
            fileInputKontrak.click();
        }

        const btnAddendum = e.target.closest('.btn-addendum-kerma');
        if (btnAddendum) bukaModalAddendum(btnAddendum.dataset.id);

        const btnEdit = e.target.closest('.btn-edit-kerma');
        if (btnEdit) {
            const item = allData.find(d => d.id_program === btnEdit.dataset.id);
            if (!item) return;
            if (allMitraData.length === 0) {
                try { const r = await fetch('/api/daftar-mitra'); allMitraData = await r.json(); } catch {}
            }
            bukaModalEditKerma(item);
        }

        const btnHapus = e.target.closest('.btn-hapus-kerma');
        if (btnHapus) {
            const id = btnHapus.dataset.id;
            const nama = btnHapus.dataset.nama;
            if (!confirm(`Hapus kerma "${id} — ${nama}"?\nTindakan ini tidak dapat dibatalkan.`)) return;
            try {
                const res = await fetch(`/api/hapus-kerma/${encodeURIComponent(id)}`, { method: 'DELETE' });
                const hasil = await res.json();
                if (res.ok) await AmbilDataDanRender();
                else alert(hasil.pesan);
            } catch { alert('Gagal terhubung ke server.'); }
        }
    });

    // ---- MODAL ADDENDUM ----
    const modalAddendum   = document.getElementById('modalAddendum');
    const daftarAddendum  = document.getElementById('daftarAddendum');
    const addendumAlert   = document.getElementById('addendumAlert');
    const fileInputAdd    = document.getElementById('fileInputAddendum');
    let addendumTargetId  = null;

    async function bukaModalAddendum(idProgram) {
        addendumTargetId = idProgram;
        document.getElementById('addendumIdLabel').textContent = idProgram;
        addendumAlert.style.display = 'none';
        fileInputAdd.value = '';
        await muatDaftarAddendum();
        modalAddendum.style.display = 'flex';
    }

    async function muatDaftarAddendum() {
        daftarAddendum.innerHTML = '<div class="mini-state mini-state--loading">Memuat addendum...</div>';
        try {
            const res = await fetch(`/api/addendum/${encodeURIComponent(addendumTargetId)}`);
            const list = await res.json();
            if (list.length === 0) {
                daftarAddendum.innerHTML = '<div class="mini-state">Belum ada addendum untuk kontrak ini.</div>';
                return;
            }
            daftarAddendum.innerHTML = list.map(a => `
                <div class="addendum-item">
                    <span class="addendum-no">Addendum ${esc(a.no)}</span>
                    <a href="/uploads/addendum/${esc(a.nama_file)}" target="_blank" class="file-link">📄 Lihat File</a>
                    <span class="addendum-tgl">${esc(a.tgl_upload)}</span>
                </div>
            `).join('');
        } catch {
            daftarAddendum.innerHTML = '<div class="mini-state mini-state--error">Gagal memuat addendum.</div>';
        }
    }

    document.getElementById('btnTutupModalAddendum').addEventListener('click', () => { modalAddendum.style.display = 'none'; });
    modalAddendum.addEventListener('click', e => { if (e.target === modalAddendum) modalAddendum.style.display = 'none'; });

    document.getElementById('btnUploadAddendum').addEventListener('click', async () => {
        const file = fileInputAdd.files[0];
        addendumAlert.style.display = 'none';
        if (!file) {
            addendumAlert.className = 'form-alert form-alert--error';
            addendumAlert.textContent = 'Pilih file terlebih dahulu.';
            addendumAlert.style.display = 'inline-block';
            return;
        }
        const btn = document.getElementById('btnUploadAddendum');
        btn.disabled = true; btn.textContent = 'Mengupload...';
        try {
            const fileBase64 = await bacaFileBase64(file);
            const res = await fetch('/api/upload-addendum', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_program: addendumTargetId, file_base64: fileBase64, file_nama: file.name })
            });
            const hasil = await res.json();
            if (res.ok) {
                addendumAlert.className = 'form-alert form-alert--success';
                addendumAlert.textContent = hasil.pesan;
                addendumAlert.style.display = 'inline-block';
                fileInputAdd.value = '';
                await muatDaftarAddendum();
                // Update badge angka di tombol tanpa reload tabel
                const badge = document.querySelector(`.btn-addendum-kerma[data-id="${addendumTargetId}"] .addendum-count-badge`);
                if (badge) { badge.textContent = parseInt(badge.textContent) + 1; badge.classList.add('has-addendum'); }
            } else {
                addendumAlert.className = 'form-alert form-alert--error';
                addendumAlert.textContent = hasil.pesan;
                addendumAlert.style.display = 'inline-block';
            }
        } catch {
            addendumAlert.className = 'form-alert form-alert--error';
            addendumAlert.textContent = 'Gagal terhubung ke server.';
            addendumAlert.style.display = 'inline-block';
        } finally {
            btn.disabled = false; btn.textContent = 'Upload Addendum';
        }
    });

    // ---- MODAL EDIT KERMA ----
    const modalEditKerma     = document.getElementById('modalEditKerma');
    const formEditKerma      = document.getElementById('formEditKerma');
    const formAlertEditKerma = document.getElementById('formAlertEditKerma');

    async function bukaModalEditKerma(item) {
        document.getElementById('editKermaId').value                 = item.id_program;
        document.getElementById('editKermaIdDisplay').value          = item.id_program;
        document.getElementById('editKermaNoKontrakInstitusi').value = item.no_kontrak_institusi;
        document.getElementById('editKermaNoKontrakMitra').value     = item.no_kontrak_mitra;
        document.getElementById('editKermaJudulPks').value           = item.judul_pks;
        ['s1','s2','s3'].forEach(s => {
            const rb = document.getElementById(`editStrata_${s}`);
            if (rb) rb.checked = (item.strata === s.toUpperCase());
        });
        document.getElementById('editKermaTglKontrak').value         = item.tgl_kontrak_input || '';
        document.getElementById('editKermaTglAkhir').value           = item.tgl_akhir_kontrak_input || '';
        document.getElementById('editKermaNilai').value              = item.nilai_kontrak_raw || '';
        document.getElementById('editKermaKodeFile').value           = item.kode_file;
        document.getElementById('editKermaJmlMhs').value             = item.jumlah_mahasiswa || '';
        document.getElementById('editBatasAkhirPenuh').value         = item.batas_akhir_pembayaran || '';
        document.getElementById('editHargaPerMhs').value             = item.harga_per_mahasiswa || '';
        setReadonlyEditNilai(item.cara_pembayaran || '');
        formAlertEditKerma.style.display = 'none';

        const selMitra = document.getElementById('editKermaNamaMitra');
        selMitra.innerHTML = '<option value="">-- Pilih Mitra --</option>'
            + allMitraData.map(m =>
                `<option value="${esc(m.nama_mitra)}">${esc(m.id_mitra)} — ${esc(m.nama_mitra)}</option>`
            ).join('');
        selMitra.value = item.nama_mitra;

        const editCaraSel = document.getElementById('editCaraPembayaran');
        editCaraSel.value = item.cara_pembayaran || '';
        toggleSeksiPembayaran(item.cara_pembayaran || '', 'editSeksiPenuh', 'editSeksiTermin', 'editSeksiBertahap');

        // Muat cicilan existing
        async function muatCicilanEdit(cara) {
            const containerSemester = document.getElementById('editDaftarCicilan');
            const containerTermin   = document.getElementById('editDaftarCicilanTermin');
            containerSemester.innerHTML = '';
            containerTermin.innerHTML = '';
            if (cara !== 'Unit Price' && cara !== 'Termin') return;
            try {
                const cicilanRes = await fetch(`/api/cicilan/${encodeURIComponent(item.id_program)}`);
                const cicilanData = await cicilanRes.json();
                const target = cara === 'Termin' ? containerTermin : containerSemester;
                const defaultLabel = cara === 'Termin' ? 'Termin 1' : 'Semester 1';
                cicilanData.forEach(c => {
                    const baris = buatBarisKerja(c.label);
                    baris.querySelector('.cicilan-nominal').value = c.nominal != null ? c.nominal : '';
                    baris.querySelector('.cicilan-batas').value = c.batas_akhir || '';
                    target.appendChild(baris);
                });
                if (cicilanData.length === 0) target.appendChild(buatBarisKerja(defaultLabel));
            } catch {}
        }
        await muatCicilanEdit(item.cara_pembayaran || '');

        modalEditKerma.style.display = 'flex';
    }

    function tutupModalEditKerma() { modalEditKerma.style.display = 'none'; }

    document.getElementById('btnTutupModalKerma').addEventListener('click', tutupModalEditKerma);
    document.getElementById('btnBatalEditKerma').addEventListener('click', tutupModalEditKerma);
    modalEditKerma.addEventListener('click', e => { if (e.target === modalEditKerma) tutupModalEditKerma(); });

    // Auto-kalkulasi modal edit
    function updateNilaiKontrakEdit() {
        const cara = document.getElementById('editCaraPembayaran').value;
        const nilaiEl = document.getElementById('editKermaNilai');
        if (!nilaiEl) return;
        if (cara === 'Termin') {
            nilaiEl.value = sumNominalCicilan('editDaftarCicilanTermin');
        } else if (cara === 'Unit Price') {
            const jml   = parseFloat(document.getElementById('editKermaJmlMhs')?.value) || 0;
            const harga = parseFloat(document.getElementById('editHargaPerMhs')?.value) || 0;
            nilaiEl.value = jml * harga;
        }
    }

    function setReadonlyEditNilai(cara) {
        const el = document.getElementById('editKermaNilai');
        if (!el) return;
        const readonly = cara === 'Termin' || cara === 'Unit Price';
        el.readOnly = readonly;
        el.style.background = readonly ? '#edf2f7' : '';
        el.style.color = readonly ? '#718096' : '';
    }

    document.getElementById('editCaraPembayaran').addEventListener('change', () => {
        const cara = document.getElementById('editCaraPembayaran').value;
        toggleSeksiPembayaran(cara, 'editSeksiPenuh', 'editSeksiTermin', 'editSeksiBertahap');
        setReadonlyEditNilai(cara);
        updateNilaiKontrakEdit();
        if (cara === 'Termin') {
            const c = document.getElementById('editDaftarCicilanTermin');
            if (c.children.length === 0) c.appendChild(buatBarisKerja('Termin 1'));
        } else if (cara === 'Unit Price') {
            const c = document.getElementById('editDaftarCicilan');
            if (c.children.length === 0) c.appendChild(buatBarisKerja('Semester 1'));
        }
    });
    document.getElementById('editKermaJmlMhs').addEventListener('input', updateNilaiKontrakEdit);
    document.getElementById('editHargaPerMhs').addEventListener('input', updateNilaiKontrakEdit);

    document.getElementById('editDaftarCicilan').addEventListener('input', e => {
        if (e.target.classList.contains('cicilan-nominal')) updateNilaiKontrakEdit();
    });
    document.getElementById('editDaftarCicilanTermin').addEventListener('input', e => {
        if (e.target.classList.contains('cicilan-nominal')) updateNilaiKontrakEdit();
    });
    document.getElementById('editBtnTambahCicilan').addEventListener('click', () => {
        const c = document.getElementById('editDaftarCicilan');
        c.appendChild(buatBarisKerja(`Semester ${c.children.length + 1}`));
    });
    document.getElementById('editBtnTambahCicilanTermin').addEventListener('click', () => {
        const c = document.getElementById('editDaftarCicilanTermin');
        c.appendChild(buatBarisKerja(`Termin ${c.children.length + 1}`));
    });

    formEditKerma.addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(formEditKerma).entries());
        if (data.cara_pembayaran === 'Unit Price') {
            data.cicilan = JSON.stringify(kumpulkanCicilan('editDaftarCicilan'));
        } else if (data.cara_pembayaran === 'Termin') {
            data.cicilan = JSON.stringify(kumpulkanCicilan('editDaftarCicilanTermin'));
        }
        formAlertEditKerma.style.display = 'none';
        const btnSubmit = formEditKerma.querySelector('button[type="submit"]');
        btnSubmit.disabled = true; btnSubmit.textContent = 'Menyimpan...';
        try {
            const res = await fetch('/api/edit-kerma', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const hasil = await res.json();
            if (res.ok) {
                tutupModalEditKerma();
                await AmbilDataDanRender();
            } else {
                formAlertEditKerma.className = 'form-alert form-alert--error';
                formAlertEditKerma.textContent = hasil.pesan;
                formAlertEditKerma.style.display = 'inline-block';
            }
        } catch {
            formAlertEditKerma.className = 'form-alert form-alert--error';
            formAlertEditKerma.textContent = 'Gagal terhubung ke server.';
            formAlertEditKerma.style.display = 'inline-block';
        } finally {
            btnSubmit.disabled = false; btnSubmit.textContent = 'Simpan Perubahan';
        }
    });

    // ---- UPLOAD FILE KONTRAK ----
    const fileInputKontrak = document.getElementById('fileInputKontrak');
    let uploadTargetId = null;

    function bacaFileBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    fileInputKontrak.addEventListener('change', async () => {
        const file = fileInputKontrak.files[0];
        if (!file || !uploadTargetId) return;

        const btn = bodyTabelKerma.querySelector(`[data-id="${uploadTargetId}"]`);
        if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

        try {
            const fileBase64 = await bacaFileBase64(file);
            const res = await fetch('/api/upload-kontrak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_program: uploadTargetId, file_base64: fileBase64, file_nama: file.name })
            });
            const hasil = await res.json();
            if (res.ok) {
                await AmbilDataDanRender();
            } else {
                alert('Gagal upload: ' + hasil.pesan);
                if (btn) { btn.disabled = false; btn.textContent = btn.classList.contains('btn-ganti-file') ? '↺ Ganti' : '📎 Upload'; }
            }
        } catch {
            alert('Gagal terhubung ke server.');
            if (btn) { btn.disabled = false; }
        } finally {
            fileInputKontrak.value = '';
            uploadTargetId = null;
        }
    });

    // ---- FITUR REALISASI ANGGARAN ----
    const bodyTabelRencanaPendapatan = document.getElementById('bodyTabelRencanaPendapatan');
    const wrapRencanaPendapatanDaftar = document.getElementById('wrapRencanaPendapatanDaftar');
    const wrapRencanaPendapatanTermin = document.getElementById('wrapRencanaPendapatanTermin');
    const headTabelRencanaPendapatanTermin = document.getElementById('headTabelRencanaPendapatanTermin');
    const bodyTabelRencanaPendapatanTermin = document.getElementById('bodyTabelRencanaPendapatanTermin');
    const btnRencanaViewDaftar = document.getElementById('btnRencanaViewDaftar');
    const btnRencanaViewTermin = document.getElementById('btnRencanaViewTermin');
    const filterRencanaPendapatanCari = document.getElementById('filterRencanaPendapatanCari');
    const filterRencanaPendapatanMulai = document.getElementById('filterRencanaPendapatanMulai');
    const filterRencanaPendapatanSelesai = document.getElementById('filterRencanaPendapatanSelesai');
    const infoHasilRencanaPendapatan = document.getElementById('infoHasilRencanaPendapatan');
    const btnResetFilterRencanaPendapatan = document.getElementById('btnResetFilterRencanaPendapatan');
    const bodyTabelPembayaran = document.getElementById('bodyTabelPembayaran');
    const filterPembayaranCari = document.getElementById('filterPembayaranCari');
    const infoHasilPembayaran = document.getElementById('infoHasilPembayaran');
    const btnResetFilterPembayaran = document.getElementById('btnResetFilterPembayaran');
    const bodyTabelRabAnggaran = document.getElementById('bodyTabelRabAnggaran');
    const rabSummaryTotal = document.getElementById('rabSummaryTotal');
    const rabSummaryJumlah = document.getElementById('rabSummaryJumlah');
    const btnTambahRabAnggaran = document.getElementById('btnTambahRabAnggaran');
    const btnBuatRiRab = document.getElementById('btnBuatRiRab');
    const checkAllRabAnggaran = document.getElementById('checkAllRabAnggaran');
    const filterRabKodeFile = document.getElementById('filterRabKodeFile');
    const datalistRabKodeFile = document.getElementById('datalistRabKodeFile');
    const btnResetRabKodeFile = document.getElementById('btnResetRabKodeFile');
    const infoRabMitra = document.getElementById('infoRabMitra');
    const infoRabJudulPks = document.getElementById('infoRabJudulPks');
    const bodyTabelRencanaAnggaran = document.getElementById('bodyTabelRencanaAnggaran');
    const bodyTabelRealisasiRiInvoice = document.getElementById('bodyTabelRealisasiRiInvoice');
    const saldoKodeFileToolbar = document.getElementById('saldoKodeFileToolbar');
    const rekapKodeFileToolbar = document.getElementById('rekapKodeFileToolbar');
    const rabKodeFileToolbar = document.getElementById('rabKodeFileToolbar');
    const filterSaldoKodeFile = document.getElementById('filterSaldoKodeFile');
    const datalistSaldoKodeFile = document.getElementById('datalistSaldoKodeFile');
    const btnResetSaldoKodeFile = document.getElementById('btnResetSaldoKodeFile');
    const infoSaldoMitra = document.getElementById('infoSaldoMitra');
    const infoSaldoJudulKerma = document.getElementById('infoSaldoJudulKerma');
    const filterRealisasiRiKodeFile = document.getElementById('filterRealisasiRiKodeFile');
    const nilaiKontrakRealisasiRi = document.getElementById('nilaiKontrakRealisasiRi');
    const saldoDefinitifRealisasiRi = document.getElementById('saldoDefinitifRealisasiRi');
    const infoKontrakRealisasiRi = document.getElementById('infoKontrakRealisasiRi');
    const filterRencanaAnggaranKodeFile = document.getElementById('filterRencanaAnggaranKodeFile');
    const nilaiKontrakRencanaAnggaran = document.getElementById('nilaiKontrakRencanaAnggaran');
    const saldoProyektifRencanaAnggaran = document.getElementById('saldoProyektifRencanaAnggaran');
    const saldoDefinitifRencanaAnggaran = document.getElementById('saldoDefinitifRencanaAnggaran');
    const infoKontrakRencanaAnggaran = document.getElementById('infoKontrakRencanaAnggaran');
    const bodyTabelRealisasi = document.getElementById('bodyTabelRealisasi');
    const filterRealisasiCari = document.getElementById('filterRealisasiCari');
    const infoHasilRealisasi = document.getElementById('infoHasilRealisasi');
    const btnResetFilterRealisasi = document.getElementById('btnResetFilterRealisasi');
    const filterRekapKodeFile = document.getElementById('filterRekapKodeFile');
    const datalistRekapKodeFile = document.getElementById('datalistRekapKodeFile');
    const btnResetRekapKodeFile = document.getElementById('btnResetRekapKodeFile');
    const infoRekapMitra = document.getElementById('infoRekapMitra');
    const infoRekapJudulPks = document.getElementById('infoRekapJudulPks');
    const rekapSummaryPenerimaan = document.getElementById('rekapSummaryPenerimaan');
    const rekapSummaryPegawai = document.getElementById('rekapSummaryPegawai');
    const rekapSummaryBarang = document.getElementById('rekapSummaryBarang');
    const rekapSummaryJasa = document.getElementById('rekapSummaryJasa');
    const rekapSummaryModal = document.getElementById('rekapSummaryModal');
    const rekapSummaryRealisasi = document.getElementById('rekapSummaryRealisasi');
    const rekapSummarySaldoDefinitif = document.getElementById('rekapSummarySaldoDefinitif');
    const btnRekapVersiDefinitif = document.getElementById('btnRekapVersiDefinitif');
    const btnRekapVersiProyektif = document.getElementById('btnRekapVersiProyektif');
    const formRealisasiPembayaran = document.getElementById('formRealisasiPembayaran');
    const formAlertPembayaran = document.getElementById('formAlertPembayaran');
    const btnBatalEditPembayaran = document.getElementById('btnBatalEditPembayaran');
    const nominalPembayaranBruto = document.getElementById('nominalPembayaranBruto');
    const persenPotonganPembayaran = document.getElementById('persenPotonganPembayaran');
    const nominalPembayaranNetto = document.getElementById('nominalPembayaranNetto');
    const formRealisasiAnggaran = document.getElementById('formRealisasiAnggaran');
    const formAlertRealisasi = document.getElementById('formAlertRealisasi');
    const tabRencanaPendapatan = document.getElementById('tabRencanaPendapatan');
    const tabUangMasuk = document.getElementById('tabUangMasuk');
    const tabRabAnggaran = document.getElementById('tabRabAnggaran');
    const tabRealisasiRiInvoice = document.getElementById('tabRealisasiRiInvoice');
    const tabRencanaAnggaran = document.getElementById('tabRencanaAnggaran');
    const tabRealisasiAnggaran = document.getElementById('tabRealisasiAnggaran');
    const panelRencanaPendapatan = document.getElementById('panelRencanaPendapatan');
    const panelUangMasuk = document.getElementById('panelUangMasuk');
    const panelRabAnggaran = document.getElementById('panelRabAnggaran');
    const panelRealisasiRiInvoice = document.getElementById('panelRealisasiRiInvoice');
    const panelRencanaAnggaran = document.getElementById('panelRencanaAnggaran');
    const panelRealisasiAnggaran = document.getElementById('panelRealisasiAnggaran');
    const selectPembayaranKodeFile = document.getElementById('selectPembayaranKodeFile');
    const btnResetPembayaranKodeFile = document.getElementById('btnResetPembayaranKodeFile');
    const selectRealisasiKodeFile = document.getElementById('selectRealisasiKodeFile');
    const datalistRealisasiKodeFile = document.getElementById('datalistRealisasiKodeFile');
    const cardRencanaPendapatanTotal = document.getElementById('cardRencanaPendapatanTotal');
    const panelDetailRencanaPendapatan = document.getElementById('panelDetailRencanaPendapatan');
    const headDetailRencanaPendapatanTermin = document.getElementById('headDetailRencanaPendapatanTermin');
    const bodyDetailRencanaPendapatan = document.getElementById('bodyDetailRencanaPendapatan');
    const detailRencanaAkanTotal = document.getElementById('detailRencanaAkanTotal');
    const detailRencanaAkanJumlah = document.getElementById('detailRencanaAkanJumlah');
    const detailRencanaRealisasiTotal = document.getElementById('detailRencanaRealisasiTotal');
    const detailRencanaRealisasiJumlah = document.getElementById('detailRencanaRealisasiJumlah');
    const detailRencanaSkemaTotal = document.getElementById('detailRencanaSkemaTotal');
    const detailRencanaSkemaJumlah = document.getElementById('detailRencanaSkemaJumlah');
    const detailRencanaLewatTotal = document.getElementById('detailRencanaLewatTotal');
    const detailRencanaLewatJumlah = document.getElementById('detailRencanaLewatJumlah');
    const detailRencanaBelumTotal = document.getElementById('detailRencanaBelumTotal');
    const detailRencanaBelumJumlah = document.getElementById('detailRencanaBelumJumlah');
    const statRencanaPendapatanNilaiKontrak = document.getElementById('statRencanaPendapatanNilaiKontrak');
    const statRencanaPendapatanNilaiKontrakJumlah = document.getElementById('statRencanaPendapatanNilaiKontrakJumlah');
    const statRencanaPendapatanRealisasi = document.getElementById('statRencanaPendapatanRealisasi');
    const statRencanaPendapatanRealisasiJumlah = document.getElementById('statRencanaPendapatanRealisasiJumlah');
    const statRencanaPendapatanTotal = document.getElementById('statRencanaPendapatanTotal');
    const statRencanaPendapatanJumlah = document.getElementById('statRencanaPendapatanJumlah');
    let timerInputSaldoKodeFile = null;
    let timerInputRabKodeFile = null;
    let timerInputRekapKodeFile = null;
    let modeRekapRealisasi = 'definitif';

    const realisasiBadgeClass = {
        'Belanja Pegawai': 'badge-realisasi-pegawai',
        'Belanja Barang': 'badge-realisasi-barang',
        'Belanja Jasa': 'badge-realisasi-jasa',
        'Belanja Modal': 'badge-realisasi-modal'
    };
    const kategoriBelanjaOptions = Object.keys(realisasiBadgeClass);

    function setTabRealisasi(activeTab) {
        const isRencana = activeTab === 'rencana';
        const isPembayaran = activeTab === 'pembayaran';
        const isRab = activeTab === 'rab';
        const isRiInvoice = activeTab === 'riInvoice';
        const isSaldoPenerimaan = activeTab === 'saldoPenerimaan';
        const isAnggaran = activeTab === 'anggaran';
        const isPendapatan = isRencana || isPembayaran;
        const showSaldoKodeFile = isRiInvoice || isSaldoPenerimaan;

        if (saldoKodeFileToolbar) saldoKodeFileToolbar.style.display = showSaldoKodeFile ? '' : 'none';
        if (rekapKodeFileToolbar) rekapKodeFileToolbar.style.display = isAnggaran ? '' : 'none';
        if (rabKodeFileToolbar) rabKodeFileToolbar.style.display = isRab ? '' : 'none';
        tabRencanaPendapatan.style.display = isPendapatan ? '' : 'none';
        tabUangMasuk.style.display = isPendapatan ? '' : 'none';
        tabRabAnggaran.style.display = isPendapatan ? 'none' : '';
        tabRealisasiRiInvoice.style.display = isPendapatan ? 'none' : '';
        tabRencanaAnggaran.style.display = isPendapatan ? 'none' : '';
        tabRealisasiAnggaran.style.display = isPendapatan ? 'none' : '';

        tabRencanaPendapatan.classList.toggle('active', isRencana);
        tabUangMasuk.classList.toggle('active', isPembayaran);
        tabRabAnggaran.classList.toggle('active', isRab);
        tabRealisasiRiInvoice.classList.toggle('active', isRiInvoice);
        tabRencanaAnggaran.classList.toggle('active', isSaldoPenerimaan);
        tabRealisasiAnggaran.classList.toggle('active', isAnggaran);
        tabRencanaPendapatan.setAttribute('aria-selected', isRencana ? 'true' : 'false');
        tabUangMasuk.setAttribute('aria-selected', isPembayaran ? 'true' : 'false');
        tabRabAnggaran.setAttribute('aria-selected', isRab ? 'true' : 'false');
        tabRealisasiRiInvoice.setAttribute('aria-selected', isRiInvoice ? 'true' : 'false');
        tabRencanaAnggaran.setAttribute('aria-selected', isSaldoPenerimaan ? 'true' : 'false');
        tabRealisasiAnggaran.setAttribute('aria-selected', isAnggaran ? 'true' : 'false');
        panelRencanaPendapatan.style.display = isRencana ? '' : 'none';
        panelUangMasuk.style.display = isPembayaran ? '' : 'none';
        panelRabAnggaran.style.display = isRab ? '' : 'none';
        panelRealisasiRiInvoice.style.display = isRiInvoice ? '' : 'none';
        panelRencanaAnggaran.style.display = isSaldoPenerimaan ? '' : 'none';
        panelRealisasiAnggaran.style.display = isAnggaran ? '' : 'none';
    }

    tabRencanaPendapatan.addEventListener('click', () => setTabRealisasi('rencana'));
    tabUangMasuk.addEventListener('click', () => { rencanaPendapatanDipilih = null; setTabRealisasi('pembayaran'); });
    tabRabAnggaran.addEventListener('click', async () => {
        setTabRealisasi('rab');
        setKodeFileRab(kodeFileRabAktif());
        await muatRencanaAnggaran();
        await muatRabAnggaran();
    });
    tabRealisasiRiInvoice.addEventListener('click', async () => {
        setTabRealisasi('riInvoice');
        setKodeFileSaldo(kodeFileSaldoAktif());
        await muatRencanaAnggaran();
    });
    tabRencanaAnggaran.addEventListener('click', async () => {
        setTabRealisasi('saldoPenerimaan');
        setKodeFileSaldo(kodeFileSaldoAktif());
        await muatRencanaAnggaran();
    });
    tabRealisasiAnggaran.addEventListener('click', () => {
        setTabRealisasi('anggaran');
        terapkanFilterRealisasi();
    });

    function kodeFileSaldoAktif() {
        if (filterSaldoKodeFile) return String(filterSaldoKodeFile.value || '').trim();
        return String(filterRealisasiRiKodeFile?.value || filterRencanaAnggaranKodeFile?.value || '').trim();
    }

    function kodeFileRabAktif() {
        return String(filterRabKodeFile?.value || '').trim();
    }

    function normalisasiKodeFileSaldo(value = '') {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const tanpaLabel = raw.split('—')[0].trim();
        const program = programDariKodeFile(raw) || programDariKodeFile(tanpaLabel);
        return program?.kode_file || tanpaLabel || raw;
    }

    function setKodeFileSaldo(kodeFile = '') {
        const kodeInput = normalisasiKodeFileSaldo(kodeFile);
        const program = programDariKodeFile(kodeInput);
        const kode = program?.kode_file || kodeInput;
        if (filterSaldoKodeFile) filterSaldoKodeFile.value = kode;
        if (filterRealisasiRiKodeFile) filterRealisasiRiKodeFile.value = kode;
        if (filterRencanaAnggaranKodeFile) filterRencanaAnggaranKodeFile.value = kode;
        setText(infoSaldoMitra, program?.nama_mitra || '-');
        setText(infoSaldoJudulKerma, program?.judul_pks || '-');
    }

    function setKodeFileRab(kodeFile = '') {
        const kodeInput = normalisasiKodeFileSaldo(kodeFile);
        const program = programDariKodeFile(kodeInput);
        const kode = program?.kode_file || kodeInput;
        if (filterRabKodeFile) filterRabKodeFile.value = kode;
        setText(infoRabMitra, program?.nama_mitra || '-');
        setText(infoRabJudulPks, program?.judul_pks || '-');
    }

    function kodeFileRekapAktif() {
        return String(filterRekapKodeFile?.value || '').trim();
    }

    function setKodeFileRekap(kodeFile = '') {
        const kodeInput = String(kodeFile || '').trim();
        const program = programDariKodeFile(kodeInput);
        const kode = program?.kode_file || kodeInput;
        if (filterRekapKodeFile) filterRekapKodeFile.value = kode;
        setText(infoRekapMitra, program?.nama_mitra || '-');
        setText(infoRekapJudulPks, program?.judul_pks || '-');
    }

    function refreshRekapBerdasarkanKodeFile() {
        setKodeFileRekap(kodeFileRekapAktif());
        terapkanFilterRealisasi();
    }

    function resetKodeFileRekap() {
        clearTimeout(timerInputRekapKodeFile);
        setKodeFileRekap('');
        terapkanFilterRealisasi();
    }

    function refreshSaldoBerdasarkanKodeFile(resetDraft = false) {
        const kode = normalisasiKodeFileSaldo(kodeFileSaldoAktif());
        setKodeFileSaldo(kode);
        if (resetDraft) {
            realisasiRiDraftAfter = null;
            realisasiRiDraftPrefill = null;
        }
        terapkanFilterRealisasiRiInvoice();
        terapkanFilterRencanaAnggaran();
    }

    function refreshRabBerdasarkanKodeFile() {
        setKodeFileRab(kodeFileRabAktif());
        renderTabelRabAnggaran();
    }

    function resetKodeFileSaldo() {
        clearTimeout(timerInputSaldoKodeFile);
        setKodeFileSaldo('');
        realisasiRiDraftAfter = null;
        realisasiRiDraftPrefill = null;
        terapkanFilterRealisasiRiInvoice();
        terapkanFilterRencanaAnggaran();
    }

    function resetKodeFileRab() {
        clearTimeout(timerInputRabKodeFile);
        setKodeFileRab('');
        renderTabelRabAnggaran();
    }

    function resetKodeFilePembayaran() {
        if (!selectPembayaranKodeFile) return;
        selectPembayaranKodeFile.value = '';
        rencanaPendapatanDipilih = null;
        if (formAlertPembayaran) formAlertPembayaran.style.display = 'none';
    }

    async function ensureKermaData() {
        if (allData.length > 0) return allData;
        const respon = await fetch('/api/daftar-kerma');
        allData = await respon.json();
        allData.forEach(item => { item.peringatan = hitungPeringatan(item); });
        return allData;
    }

    async function ambilCicilanTerminKontrak(kontrakList = []) {
        const targets = kontrakList.filter(item =>
            item.id_program &&
            (item.cara_pembayaran === 'Termin' || item.cara_pembayaran === 'Unit Price')
        );

        await Promise.all(targets.map(async item => {
            if (cicilanTerminCache.has(item.id_program)) return;
            try {
                const res = await fetch(`/api/cicilan/${encodeURIComponent(item.id_program)}`);
                const payload = await res.json();
                cicilanTerminCache.set(item.id_program, Array.isArray(payload) ? payload : []);
            } catch (err) {
                console.warn(`Gagal memuat cicilan ${item.id_program}`, err);
                cicilanTerminCache.set(item.id_program, []);
            }
        }));

        const map = new Map();
        targets.forEach(item => map.set(item.id_program, cicilanTerminCache.get(item.id_program) || []));
        return map;
    }

    async function populateSelectKodeFileRealisasi() {
        try {
            await ensureKermaData();
            const seen = new Set();
            const kodeOptions = allData
                .filter(item => {
                    const kode = String(item.kode_file || '').trim();
                    if (!kode || seen.has(kode)) return false;
                    seen.add(kode);
                    return true;
                });
            const selectOpts = kodeOptions.map(item => `
                <option value="${esc(item.kode_file)}">${esc(item.kode_file)} — ${esc(item.nama_mitra || '-')}</option>
            `).join('');
            const dataListOpts = kodeOptions.map(item => `
                <option value="${esc(item.kode_file)}" label="${esc(item.nama_mitra || '-')}"></option>
            `).join('');
            selectPembayaranKodeFile.innerHTML = '<option value="">-- Pilih Kode File --</option>' + selectOpts;
            if (datalistRealisasiKodeFile) datalistRealisasiKodeFile.innerHTML = dataListOpts;
            if (datalistSaldoKodeFile) datalistSaldoKodeFile.innerHTML = dataListOpts;
            if (datalistRabKodeFile) datalistRabKodeFile.innerHTML = dataListOpts;
            if (datalistRekapKodeFile) datalistRekapKodeFile.innerHTML = dataListOpts;
            if (filterSaldoKodeFile) filterSaldoKodeFile.placeholder = 'Pilih / ketik Kode File';
            if (filterRabKodeFile) filterRabKodeFile.placeholder = 'Pilih / ketik Kode File';
            if (filterRekapKodeFile) filterRekapKodeFile.placeholder = 'Pilih / ketik Kode File';
            const nilaiSaldoAktif = kodeFileSaldoAktif();
            [filterRencanaAnggaranKodeFile, filterRealisasiRiKodeFile].forEach(select => {
                if (select) select.innerHTML = '<option value="">-- Pilih Kode File --</option>' + selectOpts;
            });
            if (nilaiSaldoAktif && programDariKodeFile(nilaiSaldoAktif)) {
                setKodeFileSaldo(nilaiSaldoAktif);
            }
            const nilaiRabAktif = kodeFileRabAktif();
            if (nilaiRabAktif && programDariKodeFile(normalisasiKodeFileSaldo(nilaiRabAktif))) {
                setKodeFileRab(nilaiRabAktif);
            }
            const nilaiRekapAktif = kodeFileRekapAktif();
            if (nilaiRekapAktif && programDariKodeFile(nilaiRekapAktif)) {
                setKodeFileRekap(nilaiRekapAktif);
            }
        } catch {
            selectPembayaranKodeFile.innerHTML = '<option value="">Gagal memuat Kode File</option>';
            if (datalistRealisasiKodeFile) datalistRealisasiKodeFile.innerHTML = '';
            if (datalistSaldoKodeFile) datalistSaldoKodeFile.innerHTML = '';
            if (datalistRabKodeFile) datalistRabKodeFile.innerHTML = '';
            if (datalistRekapKodeFile) datalistRekapKodeFile.innerHTML = '';
            if (filterSaldoKodeFile) filterSaldoKodeFile.placeholder = 'Gagal memuat Kode File';
            if (filterRabKodeFile) filterRabKodeFile.placeholder = 'Gagal memuat Kode File';
            if (filterRekapKodeFile) filterRekapKodeFile.placeholder = 'Gagal memuat Kode File';
            if (filterRencanaAnggaranKodeFile) filterRencanaAnggaranKodeFile.innerHTML = '<option value="">Gagal memuat Kode File</option>';
            if (filterRealisasiRiKodeFile) filterRealisasiRiKodeFile.innerHTML = '<option value="">Gagal memuat Kode File</option>';
            if (selectRealisasiKodeFile) selectRealisasiKodeFile.placeholder = 'Gagal memuat Kode File';
        }
    }

    function programDariKodeFile(kodeFile) {
        const kode = String(kodeFile || '').trim().toLowerCase();
        if (!kode) return null;
        return allData.find(item => String(item.kode_file || '').trim().toLowerCase() === kode) || null;
    }

    function totalPembayaranUntukProgram(program, kodeFile) {
        const kode = String(kodeFile || '').trim();
        const idProgram = String(program?.id_program || '').trim();
        return allPembayaranData.reduce((sum, row) => {
            const samaProgram = idProgram && String(row.id_program || '').trim() === idProgram;
            const samaKode = kode && String(row.kode_file || '').trim() === kode;
            return (samaProgram || samaKode) ? sum + nominalNettoPembayaranTercatat(row) : sum;
        }, 0);
    }

    function updateKelayakanRealisasiAnggaran(showMessage = false) {
        const kode = String(selectRealisasiKodeFile?.value || '').trim();
        const btnSubmit = formRealisasiAnggaran?.querySelector('button[type="submit"]');
        if (!btnSubmit) return false;
        const setDetailInputDisabled = disabled => {
            formRealisasiAnggaran.querySelectorAll('input, select, textarea').forEach(control => {
                if (control === selectRealisasiKodeFile || control.name === 'kode_file') return;
                control.disabled = disabled;
            });
        };

        if (!kode) {
            setDetailInputDisabled(true);
            btnSubmit.disabled = true;
            if (showMessage) formAlertRealisasi.style.display = 'none';
            return false;
        }

        const program = programDariKodeFile(kode);
        if (!program) {
            setDetailInputDisabled(true);
            btnSubmit.disabled = true;
            formAlertRealisasi.className = 'form-alert form-alert--error';
            formAlertRealisasi.textContent = 'Kode File belum ditemukan. Pilih kode dari daftar atau periksa kembali penulisannya.';
            formAlertRealisasi.style.display = 'inline-block';
            return false;
        }

        const tanggalRealisasiInput = formRealisasiAnggaran?.querySelector('[name="tanggal"]')?.value || '';
        if (!tanggalRealisasiInput) {
            setDetailInputDisabled(false);
            btnSubmit.disabled = true;
            formAlertRealisasi.className = 'form-alert form-alert--error';
            formAlertRealisasi.textContent = 'Tanggal Realisasi wajib diisi agar transaksi tercatat pada Saldo RI.';
            formAlertRealisasi.style.display = 'inline-block';
            return false;
        }
        const totalPembayaran = tanggalRealisasiInput
            ? totalPenerimaanKodeFile(kode, tanggalRealisasiInput)
            : totalPembayaranUntukProgram(program, kode);
        if (totalPembayaran <= 0) {
            setDetailInputDisabled(true);
            btnSubmit.disabled = true;
            formAlertRealisasi.className = 'form-alert form-alert--error';
            formAlertRealisasi.textContent = 'Belum ada Realisasi Penerimaan yang dapat digunakan untuk Kode File ini. Catat uang diterima dari mitra terlebih dahulu sebelum membuat Realisasi Anggaran.';
            formAlertRealisasi.style.display = 'inline-block';
            return false;
        }

        const saldoTersedia = saldoRiDefinitifTersediaKodeFile(kode, tanggalRealisasiInput);
        const sisaRi = sisaRiDapatDirealisasikanKodeFile(kode, tanggalRealisasiInput);
        if (saldoTersedia <= 0) {
            setDetailInputDisabled(true);
            btnSubmit.disabled = true;
            formAlertRealisasi.className = 'form-alert form-alert--error';
            formAlertRealisasi.textContent = `Saldo penerimaan untuk Kode File ini sudah habis. Saldo tersedia: ${formatRupiahKomaDash(saldoTersedia)}.`;
            formAlertRealisasi.style.display = 'inline-block';
            return false;
        }
        if (sisaRi <= 0) {
            setDetailInputDisabled(true);
            btnSubmit.disabled = true;
            formAlertRealisasi.className = 'form-alert form-alert--error';
            formAlertRealisasi.textContent = 'Belum ada sisa RI yang dapat direalisasikan untuk Kode File ini. Registrasikan RI terlebih dahulu.';
            formAlertRealisasi.style.display = 'inline-block';
            return false;
        }

        const nominalInput = formRealisasiAnggaran?.querySelector('[name="nominal"]');
        const nominal = Number(nominalInput?.value) || 0;
        if (nominal > saldoTersedia) {
            setDetailInputDisabled(false);
            btnSubmit.disabled = true;
            formAlertRealisasi.className = 'form-alert form-alert--error';
            formAlertRealisasi.textContent = `Nominal Realisasi Anggaran melebihi saldo tersedia. Saldo tersedia: ${formatRupiahKomaDash(saldoTersedia)}.`;
            formAlertRealisasi.style.display = 'inline-block';
            return false;
        }
        if (nominal > sisaRi) {
            setDetailInputDisabled(false);
            btnSubmit.disabled = true;
            formAlertRealisasi.className = 'form-alert form-alert--error';
            formAlertRealisasi.textContent = `Nominal Realisasi Anggaran melebihi sisa RI. Sisa RI yang dapat direalisasikan: ${formatRupiahKomaDash(sisaRi)}.`;
            formAlertRealisasi.style.display = 'inline-block';
            return false;
        }

        setDetailInputDisabled(false);
        btnSubmit.disabled = false;
        if (showMessage) {
            formAlertRealisasi.className = 'form-alert form-alert--success';
            formAlertRealisasi.textContent = `Saldo tersedia: ${formatRupiahKomaDash(saldoTersedia)}. Sisa RI: ${formatRupiahKomaDash(sisaRi)}.`;
            formAlertRealisasi.style.display = 'inline-block';
        } else {
            formAlertRealisasi.style.display = 'none';
        }
        return true;
    }

    function sortRencanaPendapatan(data) {
        return [...data].sort((a, b) => {
            const tA = parseInputDate(a.tanggal_input)?.getTime();
            const tB = parseInputDate(b.tanggal_input)?.getTime();
            if (tA && tB && tA !== tB) return tB - tA;
            if (tA && !tB) return -1;
            if (!tA && tB) return 1;
            return String(a.kode_file || a.nama_mitra || '').localeCompare(String(b.kode_file || b.nama_mitra || ''), 'id');
        });
    }

    function cariRencanaPembayaranDefault(kodeFile) {
        const kode = String(kodeFile || '').trim();
        if (!kode) return null;
        const rows = allRencanaPendapatanData.filter(item => String(item.kode_file || '').trim() === kode);
        if (!rows.length) return null;

        const terjadwal = rows.filter(item => item.status_jadwal !== 'Perlu tanggal' && item.tanggal_input);
        const sumber = terjadwal.length ? terjadwal : rows;
        return [...sumber].sort((a, b) => {
            const tA = parseInputDate(a.tanggal_input)?.getTime();
            const tB = parseInputDate(b.tanggal_input)?.getTime();
            if (tA && tB && tA !== tB) return tA - tB;
            if (tA && !tB) return -1;
            if (!tA && tB) return 1;
            return String(a.tahap || '').localeCompare(String(b.tahap || ''), 'id', { numeric: true });
        })[0] || null;
    }

    function nominalDasarRealisasiPenerimaan(item = {}) {
        const nominalSisa = Number(item.nominal_sisa);
        if (Number.isFinite(nominalSisa) && nominalSisa > 0) return nominalSisa;
        return Math.max(0, Number(item.nominal) || 0);
    }

    function nominalNetoRealisasiPenerimaan(item = {}) {
        return Math.round(nominalDasarRealisasiPenerimaan(item) * FAKTOR_REALISASI_PENERIMAAN);
    }

    function persenPotonganDefaultPenerimaan() {
        return Math.round((1 - FAKTOR_REALISASI_PENERIMAAN) * 100);
    }

    function adaNilaiPembayaran(value) {
        return value !== undefined && value !== null && value !== '';
    }

    function nominalBrutoPembayaranTercatat(item = {}) {
        const nominalBruto = Number(item.nominal_bruto);
        if (Number.isFinite(nominalBruto) && nominalBruto > 0) return nominalBruto;
        const nominalBrutoDisplay = parseNominalRupiah(item.nominal_bruto_display);
        if (nominalBrutoDisplay > 0) return nominalBrutoDisplay;
        return Math.max(0, Number(item.nominal) || parseNominalRupiah(item.nominal_display) || 0);
    }

    function persenDpiPembayaranTercatat(item = {}) {
        const persen = Number(item.potongan_persen);
        const punyaBruto = (Number(item.nominal_bruto) || 0) > 0 || parseNominalRupiah(item.nominal_bruto_display) > 0;
        if (Number.isFinite(persen) && (punyaBruto || persen > 0)) {
            return Math.min(100, Math.max(0, persen));
        }
        return persenPotonganDefaultPenerimaan();
    }

    function nominalDpiPembayaranTercatat(item = {}) {
        const bruto = nominalBrutoPembayaranTercatat(item);
        const persen = persenDpiPembayaranTercatat(item);
        const dpiPersen = Math.round(bruto * (persen / 100));
        const nominalTersimpan = Number(item.nominal) || parseNominalRupiah(item.nominal_display) || 0;
        const punyaBruto = (Number(item.nominal_bruto) || 0) > 0 || parseNominalRupiah(item.nominal_bruto_display) > 0;
        const samaNominal = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) <= 1;
        if (punyaBruto) {
            if (persen > 0 && (samaNominal(nominalTersimpan, dpiPersen) || samaNominal(nominalTersimpan, bruto))) {
                return Math.max(0, dpiPersen);
            }
            if (nominalTersimpan > 0 && nominalTersimpan <= bruto) {
                return Math.max(0, bruto - nominalTersimpan);
            }
        }
        const nominalDpi = Number(item.nominal_dpi);
        if (adaNilaiPembayaran(item.nominal_dpi) && Number.isFinite(nominalDpi)) return Math.max(0, nominalDpi);
        const nominalDpiDisplay = parseNominalRupiah(item.nominal_dpi_display);
        if (nominalDpiDisplay > 0) return nominalDpiDisplay;
        return dpiPersen;
    }

    function nominalNettoPembayaranTercatat(item = {}) {
        const bruto = nominalBrutoPembayaranTercatat(item);
        return Math.max(0, bruto - nominalDpiPembayaranTercatat(item));
    }

    function hitungHasilPenerimaanDariBox() {
        const bruto = Number(nominalPembayaranBruto?.value) || 0;
        const persenPotongan = Math.min(100, Math.max(0, Number(persenPotonganPembayaran?.value) || 0));
        return Math.round(bruto * Math.max(0, 1 - (persenPotongan / 100)));
    }

    function updateHasilPenerimaanDariBox() {
        if (!nominalPembayaranNetto) return;
        nominalPembayaranNetto.value = hitungHasilPenerimaanDariBox() || '';
    }

    function isiKalkulasiPenerimaan({ bruto = 0, persenPotongan = persenPotonganDefaultPenerimaan(), hasil = null } = {}) {
        if (nominalPembayaranBruto) nominalPembayaranBruto.value = bruto ? Math.round(bruto) : '';
        if (persenPotonganPembayaran) persenPotonganPembayaran.value = Number.isFinite(Number(persenPotongan)) ? Number(persenPotongan) : persenPotonganDefaultPenerimaan();
        if (nominalPembayaranNetto) {
            const hasilFinal = hasil == null ? Math.round((Number(bruto) || 0) * Math.max(0, 1 - ((Number(persenPotongan) || 0) / 100))) : Number(hasil) || 0;
            nominalPembayaranNetto.value = hasilFinal || '';
        }
    }

    function teksInfoPotonganRealisasiPenerimaan(item = {}) {
        const bruto = nominalDasarRealisasiPenerimaan(item);
        const neto = nominalNetoRealisasiPenerimaan(item);
        const potongan = Math.max(0, bruto - neto);
        return `Nominal otomatis menjadi 80% dari rencana/sisa penerimaan ${formatRupiahKomaDash(bruto)} setelah potongan 20% (${formatRupiahKomaDash(potongan)}).`;
    }

    function isiDefaultPembayaranDariKodeFile({ force = false, tampilkanInfo = false } = {}) {
        if (pembayaranDipilihUntukEdit) return;
        const kodeFile = selectPembayaranKodeFile?.value || '';
        const rencana = cariRencanaPembayaranDefault(kodeFile);
        const tanggalInput = formRealisasiPembayaran?.querySelector('[name="tanggal"]');
        const nominalInput = formRealisasiPembayaran?.querySelector('[name="nominal"]');
        const keteranganInput = formRealisasiPembayaran?.querySelector('[name="keterangan"]');

        if (!rencana) {
            rencanaPendapatanDipilih = null;
            return;
        }

        rencanaPendapatanDipilih = rencana;
        if (tanggalInput && rencana.tanggal_input && (force || !tanggalInput.value || tanggalInput.value === todayInputDate())) {
            tanggalInput.value = rencana.tanggal_input;
        }
        if (nominalInput && (force || !nominalInput.value)) {
            isiKalkulasiPenerimaan({
                bruto: nominalDasarRealisasiPenerimaan(rencana),
                persenPotongan: persenPotonganDefaultPenerimaan()
            });
        }
        if (keteranganInput && (force || !keteranganInput.value)) {
            keteranganInput.value = `Realisasi ${rencana.tahap || 'penerimaan'} dari rencana penerimaan`;
        }

        if (tampilkanInfo) {
            formAlertPembayaran.className = rencana.tanggal_input
                ? 'form-alert form-alert--success'
                : 'form-alert form-alert--error';
            formAlertPembayaran.textContent = rencana.tanggal_input
                ? `${teksInfoPotonganRealisasiPenerimaan(rencana)} Tanggal Realisasi Pembayaran otomatis mengikuti rencana pembayaran pada kontrak. Sesuaikan bila tanggal aktual berbeda.`
                : `${teksInfoPotonganRealisasiPenerimaan(rencana)} Rencana penerimaan pada kontrak ini belum memiliki tanggal pembayaran. Isi tanggal realisasi secara manual.`;
            formAlertPembayaran.style.display = 'inline-block';
        }
    }

    function filterRencanaByPeriode(item) {
        const mulai = parseInputDate(filterRencanaPendapatanMulai?.value);
        const selesai = parseInputDate(filterRencanaPendapatanSelesai?.value);
        const tanggal = parseInputDate(item.tanggal_input);
        if (!tanggal) return true;
        if (mulai && tanggal < mulai) return false;
        if (selesai && tanggal > selesai) return false;
        return true;
    }

    function filterPembayaranByPeriode(item) {
        const mulai = parseInputDate(filterRencanaPendapatanMulai?.value);
        const selesai = parseInputDate(filterRencanaPendapatanSelesai?.value);
        const tanggal = parseInputDate(item.tanggal_input);
        if (!tanggal) return !mulai && !selesai;
        if (mulai && tanggal < mulai) return false;
        if (selesai && tanggal > selesai) return false;
        return true;
    }

    function updateRencanaPendapatanSummary() {
        const totalNilaiKontrak = allData.reduce((sum, item) =>
            sum + (Number(item.nilai_kontrak_raw) || parseNominalRupiah(item.nilai_kontrak)), 0);
        const totalRealisasiPenerimaan = allPembayaranData.reduce((sum, item) =>
            sum + nominalNettoPembayaranTercatat(item), 0);
        const belumDiterima = kelompokkanRencanaTermin(allRencanaTerminData)
            .reduce((hasil, group) => {
                const sisa = Math.max(0, Number(group.selisih_penerimaan) || 0);
                if (sisa > 0) {
                    hasil.total += sisa;
                    hasil.jumlah += 1;
                }
                return hasil;
            }, { total: 0, jumlah: 0 });
        setText(statRencanaPendapatanNilaiKontrak, formatRupiahRingkas(totalNilaiKontrak));
        setText(statRencanaPendapatanNilaiKontrakJumlah, `${allData.length.toLocaleString('id-ID')} kontrak`);
        setText(statRencanaPendapatanRealisasi, formatRupiahRingkas(totalRealisasiPenerimaan));
        setText(statRencanaPendapatanRealisasiJumlah, `${allPembayaranData.length.toLocaleString('id-ID')} transaksi dibukukan`);
        setText(statRencanaPendapatanTotal, formatRupiahRingkas(belumDiterima.total));
        setText(statRencanaPendapatanJumlah, `${belumDiterima.jumlah.toLocaleString('id-ID')} kontrak bersisa`);
    }

    function statusDetailRencanaPendapatan(item = {}) {
        const tanggal = parseInputDate(item.tanggal_input);
        if (!tanggal || item.status_jadwal === 'Perlu tanggal') return 'Belum Terjadwal';
        const hariIni = parseInputDate(todayInputDate());
        return tanggal >= hariIni ? 'Akan Diterima' : 'Lewat Rencana';
    }

    function hitungRingkasanDetailRencana(data = []) {
        const kategori = {
            'Akan Diterima': { total: 0, jumlah: 0, kontrak: new Set() },
            'Lewat Rencana': { total: 0, jumlah: 0, kontrak: new Set() },
            'Belum Terjadwal': { total: 0, jumlah: 0, kontrak: new Set() }
        };
        data.forEach(item => {
            const status = statusDetailRencanaPendapatan(item);
            const target = kategori[status] || kategori['Belum Terjadwal'];
            const nominalSisa = Number(item.nominal_sisa);
            target.total += Number.isFinite(nominalSisa) ? Math.max(0, nominalSisa) : (Number(item.nominal) || 0);
            target.jumlah += 1;
            target.kontrak.add(item.id_program || item.kode_file || `${item.nama_mitra || ''}|${item.judul_pks || ''}`);
        });
        return kategori;
    }

    function rowsSkemaPembayaranPeriode() {
        const rowsPeriode = allRencanaTerminData.filter(filterRencanaByPeriode);
        const groupKeys = new Set(rowsPeriode.map(groupKeyRencanaTermin));
        return allRencanaTerminData.filter(item => groupKeys.has(groupKeyRencanaTermin(item)));
    }

    function updateRingkasanDetailRencana(data = []) {
        const ringkasan = hitungRingkasanDetailRencana(data);
        const realisasiPeriode = allPembayaranData.filter(filterPembayaranByPeriode);
        const totalRealisasiPeriode = realisasiPeriode.reduce((sum, item) => sum + nominalNettoPembayaranTercatat(item), 0);
        const skemaPeriode = rowsSkemaPembayaranPeriode();
        const totalSkemaPeriode = skemaPeriode.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
        const jumlahKontrakSkema = kelompokkanRencanaTermin(skemaPeriode).length;
        setText(detailRencanaAkanTotal, formatRupiahKomaDash(ringkasan['Akan Diterima'].total));
        setText(detailRencanaAkanJumlah, `${ringkasan['Akan Diterima'].jumlah.toLocaleString('id-ID')} item`);
        setText(detailRencanaRealisasiTotal, formatRupiahKomaDash(totalRealisasiPeriode));
        setText(detailRencanaRealisasiJumlah, `${realisasiPeriode.length.toLocaleString('id-ID')} transaksi dibukukan`);
        setText(detailRencanaSkemaTotal, formatRupiahKomaDash(totalSkemaPeriode));
        setText(detailRencanaSkemaJumlah, `${jumlahKontrakSkema.toLocaleString('id-ID')} kontrak`);
        setText(detailRencanaLewatTotal, formatRupiahKomaDash(ringkasan['Lewat Rencana'].total));
        setText(detailRencanaLewatJumlah, `${ringkasan['Lewat Rencana'].jumlah.toLocaleString('id-ID')} item`);
        setText(detailRencanaBelumTotal, formatRupiahKomaDash(ringkasan['Belum Terjadwal'].total));
        setText(detailRencanaBelumJumlah, `${ringkasan['Belum Terjadwal'].kontrak.size.toLocaleString('id-ID')} kontrak`);
    }

    function renderTabelDetailRencanaPendapatan(data = []) {
        renderTabelRencanaTermin(data, {
            headEl: headDetailRencanaPendapatanTermin,
            bodyEl: bodyDetailRencanaPendapatan,
            emptyTitle: 'Belum ada detail rencana',
            emptyMessage: rencanaPendapatanDetailFilter
                ? `Tidak ada rencana penerimaan pada kategori ${rencanaPendapatanDetailFilter.toLowerCase()} di periode ini.`
                : 'Tidak ada rencana penerimaan pada periode ini.'
        });
    }

    function rowTerminDariPembayaran(pembayaran = {}, index = 0) {
        const nominal = nominalNettoPembayaranTercatat(pembayaran);
        const tanggalInput = pembayaran.tanggal_input || pembayaran.tanggal_realisasi_input || '';
        const tahap = pembayaran.rencana_tahap || `Realisasi ${index + 1}`;
        const row = {
            no: 0,
            id_program: pembayaran.id_program || '',
            kode_file: pembayaran.kode_file || '',
            nama_mitra: pembayaran.nama_mitra || '',
            judul_pks: pembayaran.judul_pks || '',
            tahap,
            sumber: 'Realisasi Penerimaan',
            tanggal_diterima: pembayaran.tanggal_realisasi || pembayaran.tanggal || formatTanggalTermin(tanggalInput),
            tanggal_input: tanggalInput,
            nominal,
            nominal_display: formatRupiahPenuh(nominal),
            status_jadwal: tanggalInput ? 'Terjadwal' : 'Perlu tanggal',
            keterangan: pembayaran.keterangan || 'Realisasi penerimaan yang sudah dibukukan.',
            termin_order: Number.isFinite(tahapTerminOrder(tahap)) ? tahapTerminOrder(tahap) : index + 1,
            rencana_key: pembayaran.rencana_key || `realisasi-penerimaan|${pembayaran.id_pembayaran || index}`,
            nominal_terealisasi: nominal,
            nominal_terealisasi_display: formatRupiahPenuh(nominal),
            nominal_sisa: 0,
            nominal_sisa_display: formatRupiahPenuh(0),
            terealisasi: true,
            status_realisasi: 'Terealisasi'
        };
        return row;
    }

    function rowsTerminRealisasiPenerimaan(pembayaranPeriode = []) {
        const usedPaymentIds = new Set();
        const rows = allRencanaTerminData.map(row => {
            const matches = pembayaranPeriode.filter(pembayaran => pembayaranTerminMatches(row, pembayaran));
            matches.forEach(pembayaran => {
                if (pembayaran.id_pembayaran) usedPaymentIds.add(pembayaran.id_pembayaran);
            });
            if (!matches.length) return null;
            const nominalRealisasiPeriode = matches.reduce((sum, pembayaran) => sum + nominalNettoPembayaranTercatat(pembayaran), 0);
            return {
                ...row,
                nominal_realisasi_periode: nominalRealisasiPeriode,
                nominal_realisasi_periode_display: formatRupiahPenuh(nominalRealisasiPeriode)
            };
        }).filter(Boolean);
        const fallbackRows = pembayaranPeriode
            .filter(pembayaran => !pembayaran.id_pembayaran || !usedPaymentIds.has(pembayaran.id_pembayaran))
            .map(rowTerminDariPembayaran);
        return [...rows, ...fallbackRows];
    }

    function renderTabelDetailRealisasiPenerimaan(pembayaranPeriode = []) {
        renderTabelRencanaTermin(rowsTerminRealisasiPenerimaan(pembayaranPeriode), {
            headEl: headDetailRencanaPendapatanTermin,
            bodyEl: bodyDetailRencanaPendapatan,
            emptyTitle: 'Belum ada realisasi penerimaan',
            emptyMessage: 'Tidak ada penerimaan yang sudah direalisasikan pada periode ini.',
            mode: 'realisasi-penerimaan'
        });
    }

    function renderTabelSkemaPembayaran(data = []) {
        renderTabelRencanaTermin(data, {
            headEl: headDetailRencanaPendapatanTermin,
            bodyEl: bodyDetailRencanaPendapatan,
            emptyTitle: 'Belum ada skema pembayaran',
            emptyMessage: 'Tidak ada skema pembayaran kontrak pada periode ini.',
            mode: 'skema-pembayaran'
        });
    }

    function isRencanaTerminBelumDiterima(item = {}) {
        if (item.terealisasi) return false;
        const sisa = Number(item.nominal_sisa);
        if (Number.isFinite(sisa)) return sisa > 0;
        return (Number(item.nominal) || 0) > 0;
    }

    function renderDetailRencanaPendapatan() {
        if (!panelDetailRencanaPendapatan || !cardRencanaPendapatanTotal) return;
        rencanaPendapatanDetailTerbuka = true;
        panelDetailRencanaPendapatan.hidden = false;
        cardRencanaPendapatanTotal.setAttribute('aria-expanded', 'true');

        const terminPeriode = allRencanaTerminData
            .filter(filterRencanaByPeriode)
            .filter(isRencanaTerminBelumDiterima);
        updateRingkasanDetailRencana(terminPeriode);
        panelDetailRencanaPendapatan.querySelectorAll('[data-rencana-detail-filter]').forEach(card => {
            card.classList.toggle('active', card.dataset.rencanaDetailFilter === rencanaPendapatanDetailFilter);
        });

        if (rencanaPendapatanDetailFilter === 'Realisasi Penerimaan') {
            renderTabelDetailRealisasiPenerimaan(allPembayaranData.filter(filterPembayaranByPeriode));
            return;
        }
        if (rencanaPendapatanDetailFilter === 'Skema Pembayaran') {
            renderTabelSkemaPembayaran(rowsSkemaPembayaranPeriode());
            return;
        }

        const rows = rencanaPendapatanDetailFilter
            ? terminPeriode.filter(item => statusDetailRencanaPendapatan(item) === rencanaPendapatanDetailFilter)
            : terminPeriode;
        renderTabelDetailRencanaPendapatan(rows);
    }

    function renderTabelRencanaPendapatan(data) {
        if (!bodyTabelRencanaPendapatan) return;
        bodyTabelRencanaPendapatan.innerHTML = '';
        if (data.length === 0) {
            bodyTabelRencanaPendapatan.innerHTML = tableState(9, 'empty', 'Belum ada rencana penerimaan', 'Tidak ada rencana penerimaan yang cocok dengan filter saat ini.');
            return;
        }
        data.forEach((item, index) => {
            const perluTanggal = item.status_jadwal === 'Perlu tanggal';
            const statusClass = perluTanggal ? 'badge-rencana-warning' : 'badge-rencana-ok';
            const tanggalClass = perluTanggal ? 'rencana-date-na' : '';
            const bisaDirealisasikan = !!String(item.kode_file || '').trim();
            bodyTabelRencanaPendapatan.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${esc(index + 1)}</td>
                    <td><span class="kode-file-tag">${esc(item.kode_file || '-')}</span></td>
                    <td class="td-truncate"><strong>${esc(item.nama_mitra || '-')}</strong></td>
                    <td class="td-truncate">${esc(item.judul_pks || '-')}</td>
                    <td>${esc(item.tahap || '-')}</td>
                    <td class="${tanggalClass}">${esc(item.tanggal_diterima || 'N/A')}</td>
                    <td>${esc(item.nominal_display || 'Rp 0')}</td>
                    <td><span class="badge ${statusClass}">${esc(item.status_jadwal || '-')}</span></td>
                    <td>
                        <button type="button" class="btn-realisasi-rencana btn-mini-action" data-key="${esc(item.rencana_key || '')}" ${bisaDirealisasikan ? '' : 'disabled'} title="${bisaDirealisasikan ? 'Isi form realisasi penerimaan dari rencana ini' : 'Kode File belum tersedia'}">
                            Realisasikan
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    function labelTahapTermin(index) {
        const labels = ['Pertama', 'Kedua', 'Ketiga', 'Keempat', 'Kelima', 'Keenam', 'Ketujuh', 'Kedelapan', 'Kesembilan', 'Kesepuluh'];
        return labels[index] ? `Tahap ${labels[index]}` : `Tahap ${index + 1}`;
    }

    function tahapTerminOrder(value) {
        const text = normalisasiTermin(value);
        const romanValues = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
        const roman = text.match(/(?:sem|semester|tahap|termin|cicilan)[\s.:-]*(i{1,3}|iv|v|vi{0,3}|ix|x)\b/);
        if (roman && romanValues[roman[1]]) return romanValues[roman[1]];
        const angka = text.match(/\d+/);
        if (angka) {
            const value = Number(angka[0]) || Number.POSITIVE_INFINITY;
            if (value > 0 && value < 100) return value;
        }
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
            enam: 6,
            ketujuh: 7,
            tujuh: 7,
            kedelapan: 8,
            delapan: 8,
            kesembilan: 9,
            sembilan: 9,
            kesepuluh: 10,
            sepuluh: 10
        };
        const match = Object.entries(words).find(([word]) => text.includes(word));
        return match ? match[1] : Number.POSITIVE_INFINITY;
    }

    function groupKeyRencanaTermin(item = {}) {
        return [
            item.id_program || '',
            item.kode_file || '',
            item.nama_mitra || '',
            item.judul_pks || ''
        ].map(part => String(part).trim()).join('|');
    }

    function kelompokkanRencanaTermin(data = []) {
        const groups = new Map();
        data.forEach(item => {
            const key = groupKeyRencanaTermin(item);
            if (!groups.has(key)) {
                groups.set(key, {
                    id_program: item.id_program || '',
                    kode_file: item.kode_file || '',
                    nama_mitra: item.nama_mitra || '',
                    judul_pks: item.judul_pks || '',
                    terms: []
                });
            }
            groups.get(key).terms.push(item);
        });
        return [...groups.values()]
            .map(group => {
                const nilaiKontrak = nilaiKontrakRencanaTermin(group);
                const totalPenerimaan = totalPenerimaanRencanaTermin(group);
                return {
                    ...group,
                    nilai_kontrak: nilaiKontrak,
                    total_penerimaan: totalPenerimaan,
                    selisih_penerimaan: nilaiKontrak - totalPenerimaan,
                    terms: group.terms.sort((a, b) => {
                    const orderA = Number.isFinite(Number(a.termin_order)) ? Number(a.termin_order) : tahapTerminOrder(a.tahap);
                    const orderB = Number.isFinite(Number(b.termin_order)) ? Number(b.termin_order) : tahapTerminOrder(b.tahap);
                    if (orderA !== orderB) return orderA - orderB;
                    const tA = parseInputDate(a.tanggal_input)?.getTime();
                    const tB = parseInputDate(b.tanggal_input)?.getTime();
                    if (tA && tB && tA !== tB) return tA - tB;
                    if (tA && !tB) return -1;
                    if (!tA && tB) return 1;
                    return String(a.tahap || '').localeCompare(String(b.tahap || ''), 'id', { numeric: true });
                })
                };
            })
            .sort(urutKodeFileTahunTerbaru);
    }

    function programRencanaTermin(group = {}) {
        const idProgram = String(group.id_program || '').trim();
        const kodeFile = String(group.kode_file || '').trim();
        return allData.find(item =>
            (idProgram && String(item.id_program || '').trim() === idProgram) ||
            (kodeFile && String(item.kode_file || '').trim() === kodeFile)
        ) || null;
    }

    function nilaiKontrakRencanaTermin(group = {}) {
        const program = programRencanaTermin(group);
        if (program) return Number(program.nilai_kontrak_raw) || parseNominalRupiah(program.nilai_kontrak) || 0;
        return group.terms.reduce((max, term) => Math.max(max, Number(term.nilai_kontrak_raw) || 0), 0);
    }

    function totalPenerimaanRencanaTermin(group = {}) {
        const idProgram = String(group.id_program || '').trim();
        const kodeFile = String(group.kode_file || '').trim();
        return allPembayaranData.reduce((sum, row) => {
            const samaProgram = idProgram && String(row.id_program || '').trim() === idProgram;
            const samaKode = kodeFile && String(row.kode_file || '').trim() === kodeFile;
            return (samaProgram || samaKode) ? sum + nominalNettoPembayaranTercatat(row) : sum;
        }, 0);
    }

    function statusKontrakRencanaTermin(group = {}) {
        return programRencanaTermin(group)?.status_kontrak || '-';
    }

    function badgeStatusKontrakRencanaTermin(status = '') {
        if (status === 'Berjalan') return 'badge-berjalan';
        if (status === 'Berakhir') return 'badge-berakhir';
        return 'badge-realisasi-default';
    }

    function slotTermsRencanaTermin(terms = []) {
        const slots = [];
        terms.forEach((term, fallbackIndex) => {
            const orderRaw = Number.isFinite(Number(term.termin_order))
                ? Number(term.termin_order)
                : tahapTerminOrder(term.tahap);
            let slotIndex = Number.isFinite(orderRaw) && orderRaw > 0
                ? Math.max(0, Math.round(orderRaw) - 1)
                : fallbackIndex;
            while (slots[slotIndex]) slotIndex += 1;
            slots[slotIndex] = term;
        });
        return slots;
    }

    function infoCellRencanaTermin(term, termIndex, modeRealisasiPenerimaan = false, modeSkemaPembayaran = false) {
        if (!term) {
            return {
                nominalUtama: '-',
                detailText: '',
                clickTitle: '',
                realizedClass: '',
                isPartial: false,
                filterText: '-'
            };
        }

        const nominalTerealisasi = Number(term.nominal_terealisasi) || 0;
        const nominalRealisasiPeriode = Number(term.nominal_realisasi_periode);
        const nominalDibayarTampil = modeRealisasiPenerimaan && Number.isFinite(nominalRealisasiPeriode)
            ? Math.max(0, nominalRealisasiPeriode)
            : nominalTerealisasi;
        const nominalRencana = Number(term.nominal) || 0;
        const nominalSisaRaw = Number(term.nominal_sisa);
        const nominalBelumDibayar = Math.max(0, Number.isFinite(nominalSisaRaw)
            ? nominalSisaRaw
            : Math.max(0, nominalRencana - nominalTerealisasi));
        const isPartial = !term.terealisasi && nominalTerealisasi > 0;
        const realizedClass = term.terealisasi
            ? 'rencana-termin-cell--realized'
            : isPartial ? 'rencana-termin-cell--partial' : '';
        const tanggalRencana = parseInputDate(term.tanggal_input);
        const hariIni = parseInputDate(todayInputDate());
        const isOverdueUnpaid = modeSkemaPembayaran && !term.terealisasi && nominalTerealisasi <= 0
            && tanggalRencana && hariIni && tanggalRencana < hariIni;
        const skemaClass = term.terealisasi
            ? 'rencana-termin-cell--realized'
            : isPartial ? 'rencana-termin-cell--partial'
                : isOverdueUnpaid ? 'rencana-termin-cell--overdue' : 'rencana-termin-cell--pending';
        const dateText = term.tanggal_diterima || 'N/A';
        const clickTitle = term.terealisasi
            ? `${term.tahap || labelTahapTermin(termIndex)} sudah terealisasi`
            : isPartial
                ? `${term.tahap || labelTahapTermin(termIndex)} sebagian terealisasi: ${term.nominal_terealisasi_display || formatRupiahPenuh(nominalTerealisasi)}. Sisa ${term.nominal_sisa_display || formatRupiahPenuh(term.nominal_sisa || 0)}`
                : `Klik untuk merealisasikan ${term.tahap || labelTahapTermin(termIndex)}`;
        let nominalUtama = isPartial
            ? (term.nominal_sisa_display || formatRupiahKomaDash(term.nominal_sisa || 0))
            : (term.nominal_display || 'Rp 0');
        let detailText = isPartial
            ? `Dibayar ${term.nominal_terealisasi_display || formatRupiahKomaDash(nominalTerealisasi)} dari ${term.nominal_rencana_display || term.nominal_display || formatRupiahKomaDash(term.nominal || 0)}`
            : dateText;
        if (modeRealisasiPenerimaan) {
            nominalUtama = term.nominal_realisasi_periode_display || formatRupiahKomaDash(nominalDibayarTampil);
            detailText = nominalBelumDibayar > 0
                ? `Belum dibayarkan ${term.nominal_sisa_display || formatRupiahKomaDash(nominalBelumDibayar)} dari ${term.nominal_rencana_display || term.nominal_display || formatRupiahKomaDash(nominalRencana)}`
                : `Lunas dari ${term.nominal_rencana_display || term.nominal_display || formatRupiahKomaDash(nominalRencana)}`;
        }
        if (modeSkemaPembayaran) {
            nominalUtama = term.nominal_display || formatRupiahKomaDash(nominalRencana);
            if (term.terealisasi) {
                detailText = `Lunas · ${dateText}`;
            } else if (isPartial) {
                detailText = `Dibayar ${term.nominal_terealisasi_display || formatRupiahKomaDash(nominalTerealisasi)} · ${dateText}`;
            } else if (isOverdueUnpaid) {
                detailText = `Lewat rencana · ${dateText}`;
            } else {
                detailText = dateText;
            }
        }

        return {
            nominalUtama,
            detailText,
            clickTitle,
            realizedClass: modeSkemaPembayaran ? skemaClass : realizedClass,
            isPartial,
            filterText: [term.tahap || labelTahapTermin(termIndex), nominalUtama, detailText, term.status_realisasi || '']
                .filter(Boolean)
                .join(' | ')
        };
    }

    function statusPembayaranRencanaTermin(group = {}) {
        return Number(group.selisih_penerimaan) <= 0 ? 'Lunas' : 'Belum';
    }

    function badgeStatusPembayaranRencanaTermin(status = '') {
        return status === 'Lunas' ? 'badge-rencana-ok' : 'badge-rencana-warning';
    }

    function buildFilterRowsRencanaTermin(groupRows = [], maxTermin = 0, modeRealisasiPenerimaan = false, modeSkemaPembayaran = false) {
        return groupRows.map(({ group, termSlots }, index) => {
            const statusKontrak = statusKontrakRencanaTermin(group);
            const row = {
                _row_id: `${groupKeyRencanaTermin(group)}|${index}`,
                no: String(index + 1),
                kode_file: group.kode_file || '-',
                nama_mitra: group.nama_mitra || '-',
                judul_pks: group.judul_pks || '-',
                nilai_kontrak_display: formatRupiahKomaDash(group.nilai_kontrak || 0),
                total_penerimaan_display: formatRupiahKomaDash(group.total_penerimaan || 0),
                selisih_penerimaan_display: formatRupiahKomaDash(group.selisih_penerimaan || 0),
                status_kontrak: statusKontrak,
                status_pembayaran: statusPembayaranRencanaTermin(group)
            };
            for (let termIndex = 0; termIndex < maxTermin; termIndex += 1) {
                row[`tahap_${termIndex + 1}`] = infoCellRencanaTermin(
                    termSlots[termIndex],
                    termIndex,
                    modeRealisasiPenerimaan,
                    modeSkemaPembayaran
                ).filterText;
            }
            return row;
        });
    }

    function initFilterHeadRencanaTermin() {
        colFilterRencanaPendapatan?.initBtns();
        colFilterRencanaPendapatan?.updateIndicators();
    }

    function renderTabelRencanaTermin(data = [], options = {}) {
        const headEl = options.headEl || headTabelRencanaPendapatanTermin;
        const bodyEl = options.bodyEl || bodyTabelRencanaPendapatanTermin;
        if (!headEl || !bodyEl) return;
        const modeRealisasiPenerimaan = options.mode === 'realisasi-penerimaan';
        const modeSkemaPembayaran = options.mode === 'skema-pembayaran';
        const groups = kelompokkanRencanaTermin(data);
        const allGroupRows = groups.map(group => ({ group, termSlots: slotTermsRencanaTermin(group.terms) }));
        const maxTermin = Math.max(0, ...allGroupRows.map(row => row.termSlots.length));
        const kolomDasar = 8;
        const colspan = Math.max(kolomDasar, kolomDasar + maxTermin);
        rencanaPendapatanTerminFilterRows = buildFilterRowsRencanaTermin(
            allGroupRows,
            maxTermin,
            modeRealisasiPenerimaan,
            modeSkemaPembayaran
        );
        const filteredRows = colFilterRencanaPendapatan
            ? colFilterRencanaPendapatan.applyTo(rencanaPendapatanTerminFilterRows)
            : rencanaPendapatanTerminFilterRows;
        const allowedRowIds = new Set(filteredRows.map(row => row._row_id));
        const groupRows = allGroupRows.filter((_, index) =>
            allowedRowIds.has(rencanaPendapatanTerminFilterRows[index]?._row_id)
        );

        if (!groups.length) {
            headEl.innerHTML = `
                <tr>
                    <th data-col="no">No.</th>
                    <th data-col="kode_file">Kode File</th>
                    <th data-col="nama_mitra">Mitra</th>
                    <th data-col="judul_pks">Judul PKS</th>
                    <th data-col="nilai_kontrak_display">Nilai Kontrak</th>
                    <th data-col="total_penerimaan_display">Realisasi Penerimaan</th>
                    <th data-col="selisih_penerimaan_display">Belum Diterima</th>
                    <th data-col="${modeSkemaPembayaran ? 'status_pembayaran' : 'status_kontrak'}">${modeSkemaPembayaran ? 'Status' : 'Status Kontrak'}</th>
                </tr>
            `;
            initFilterHeadRencanaTermin();
            bodyEl.innerHTML = tableState(
                colspan,
                'empty',
                options.emptyTitle || 'Belum ada versi termin',
                options.emptyMessage || 'Tidak ada rencana penerimaan yang cocok dengan filter saat ini.'
            );
            return;
        }

        const headerTahap = Array.from({ length: maxTermin }, (_, index) => `<th data-col="tahap_${index + 1}">${labelTahapTermin(index)}</th>`).join('');
        headEl.innerHTML = modeSkemaPembayaran
            ? `
                <tr>
                    <th data-col="no">No.</th>
                    <th data-col="kode_file">Kode File</th>
                    <th data-col="nama_mitra">Mitra</th>
                    <th data-col="judul_pks">Judul PKS</th>
                    <th data-col="nilai_kontrak_display">Nilai Kontrak</th>
                    <th data-col="total_penerimaan_display">Realisasi Penerimaan</th>
                    <th data-col="selisih_penerimaan_display">Belum Diterima</th>
                    ${headerTahap}
                    <th data-col="status_pembayaran">Status</th>
                </tr>
            `
            : `
                <tr>
                    <th data-col="no">No.</th>
                    <th data-col="kode_file">Kode File</th>
                    <th data-col="nama_mitra">Mitra</th>
                    <th data-col="judul_pks">Judul PKS</th>
                    <th data-col="nilai_kontrak_display">Nilai Kontrak</th>
                    <th data-col="total_penerimaan_display">Realisasi Penerimaan</th>
                    <th data-col="selisih_penerimaan_display">Belum Diterima</th>
                    <th data-col="status_kontrak">Status Kontrak</th>
                    ${headerTahap}
                </tr>
            `;
        initFilterHeadRencanaTermin();
        if (!groupRows.length) {
            bodyEl.innerHTML = tableState(
                colspan,
                'empty',
                'Tidak ada data sesuai filter',
                'Ubah pilihan filter pada heading tabel untuk menampilkan data kembali.'
            );
            return;
        }
        bodyEl.innerHTML = groupRows.map(({ group, termSlots }, index) => {
            const statusKontrak = statusKontrakRencanaTermin(group);
            const statusPembayaran = statusPembayaranRencanaTermin(group);
            const statusCell = modeSkemaPembayaran
                ? `<td><span class="badge ${badgeStatusPembayaranRencanaTermin(statusPembayaran)}">${esc(statusPembayaran)}</span></td>`
                : `<td><span class="badge ${badgeStatusKontrakRencanaTermin(statusKontrak)}">${esc(statusKontrak)}</span></td>`;
            const tahapCells = Array.from({ length: maxTermin }, (_, termIndex) => {
                const term = termSlots[termIndex];
                if (!term) return '<td class="rencana-termin-empty">-</td>';
                const cellInfo = infoCellRencanaTermin(term, termIndex, modeRealisasiPenerimaan, modeSkemaPembayaran);
                return `
                    <td class="rencana-termin-cell rencana-termin-cell--clickable ${cellInfo.realizedClass}" data-key="${esc(term.rencana_key || '')}" role="button" tabindex="0" title="${esc(cellInfo.clickTitle)}">
                        <strong>${esc(cellInfo.nominalUtama)}</strong>
                        <small>${esc(cellInfo.detailText)}</small>
                    </td>
                `;
            }).join('');
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td><span class="kode-file-tag">${esc(group.kode_file || '-')}</span></td>
                    <td class="td-truncate"><strong>${esc(group.nama_mitra || '-')}</strong></td>
                    <td class="td-truncate">${esc(group.judul_pks || '-')}</td>
                    <td class="td-money">${esc(formatRupiahKomaDash(group.nilai_kontrak || 0))}</td>
                    <td class="td-money">${esc(formatRupiahKomaDash(group.total_penerimaan || 0))}</td>
                    <td class="td-money rencana-termin-selisih-cell ${Number(group.selisih_penerimaan) > 0 ? 'is-sisa' : ''}">${esc(formatRupiahKomaDash(group.selisih_penerimaan || 0))}</td>
                    ${modeSkemaPembayaran ? tahapCells + statusCell : statusCell + tahapCells}
                </tr>
            `;
        }).join('');
    }

    function normalisasiTermin(value) {
        return String(value || '')
            .replace(/[–—−]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function terminIdentity(row = {}) {
        return [
            row.id_program || '',
            row.kode_file || '',
            normalisasiTermin(row.tahap),
            row.tanggal_input || '',
            Number(row.nominal) || 0
        ].map(part => String(part).trim()).join('|');
    }

    function rencanaTerminFallbackKey(row = {}) {
        const tanggal = row.tanggal_input || row.tanggal || row.rencana_tanggal || '';
        const nominal = Number(row.nominal ?? row.rencana_nominal) || 0;
        if (!row.id_program || !row.kode_file || !tanggal || nominal <= 0) return '';
        return [
            row.id_program,
            row.kode_file,
            tanggal,
            nominal
        ].map(part => String(part).trim()).join('|');
    }

    function buildRencanaTerminKey(row = {}) {
        return [
            row.id_program || '',
            row.kode_file || '',
            row.sumber || '',
            row.tahap || '',
            row.tanggal_input || '',
            Number(row.nominal) || 0
        ].map(part => String(part).trim()).join('|');
    }

    function formatTanggalTermin(value) {
        const tanggal = parseInputDate(value);
        if (!tanggal) return 'N/A';
        return tanggal.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function nominalTerminKontrak(item = {}, cicilan = {}) {
        const nominalDasar = Number(cicilan.nominal) || 0;
        if (item.cara_pembayaran !== 'Unit Price') return nominalDasar;
        return nominalDasar * (Number(item.jumlah_mahasiswa) || 0);
    }

    function rowTerminDariCicilan(item = {}, cicilan = {}) {
        const nominal = nominalTerminKontrak(item, cicilan);
        const tanggalInput = cicilan.batas_akhir || '';
        const tahap = cicilan.label || `Tahap ${cicilan.no || ''}`.trim() || 'Tahap';
        const row = {
            no: 0,
            id_program: item.id_program || '',
            kode_file: item.kode_file || '',
            nama_mitra: item.nama_mitra || '',
            judul_pks: item.judul_pks || '',
            tahap,
            sumber: item.cara_pembayaran || 'Program',
            tanggal_diterima: formatTanggalTermin(tanggalInput),
            tanggal_input: tanggalInput,
            nominal,
            nominal_display: formatRupiahPenuh(nominal),
            status_jadwal: tanggalInput ? 'Terjadwal' : 'Perlu tanggal',
            keterangan: tanggalInput ? 'Tanggal pembayaran tersedia pada data cicilan.' : 'Update informasi kontrak dengan tanggal pembayaran spesifik.',
            termin_order: Number(cicilan.no) || tahapTerminOrder(tahap),
            termin_generated: true
        };
        return { ...row, rencana_key: buildRencanaTerminKey(row) };
    }

    function pembayaranTerminMatches(row = {}, pembayaran = {}) {
        const rowKey = String(row.rencana_key || '').trim();
        const paymentKey = String(pembayaran.rencana_key || '').trim();
        if (rowKey && paymentKey && rowKey === paymentKey) return true;

        const kodeSama = String(row.kode_file || '').trim() && String(row.kode_file || '').trim() === String(pembayaran.kode_file || '').trim();
        const programSama = String(row.id_program || '').trim() && String(row.id_program || '').trim() === String(pembayaran.id_program || '').trim();
        if (!kodeSama && !programSama) return false;

        const tahapSama = normalisasiTermin(row.tahap) && normalisasiTermin(row.tahap) === normalisasiTermin(pembayaran.rencana_tahap);
        const tanggalPembayaran = pembayaran.rencana_tanggal || pembayaran.tanggal_rencana_input || pembayaran.tanggal_input || '';
        const tanggalSama = row.tanggal_input && String(row.tanggal_input).slice(0, 10) === String(tanggalPembayaran || '').slice(0, 10);
        const nominalRow = Number(row.nominal) || 0;
        const nominalSama = nominalRow > 0 && (
            nominalRow === (Number(pembayaran.rencana_nominal) || 0) ||
            nominalRow === nominalBrutoPembayaranTercatat(pembayaran) ||
            nominalRow === nominalNettoPembayaranTercatat(pembayaran)
        );
        return (tahapSama && tanggalSama) || (tanggalSama && nominalSama) || (tahapSama && nominalSama);
    }

    function targetNetoRencanaDariPembayaran(row = {}, pembayaranList = []) {
        const rowKey = String(row.rencana_key || '').trim();
        if (!rowKey) return 0;
        const pembayaran = pembayaranList.find(item =>
            String(item.rencana_key || '').trim() === rowKey &&
            (Number(item.rencana_nominal) || 0) > 0
        );
        return Number(pembayaran?.rencana_nominal) || 0;
    }

    function tandaiRencanaTerminTerealisasi(data = [], pembayaranList = []) {
        return data.map(row => {
            const nominalBruto = Number(row.nominal) || 0;
            const nominalNetoTarget = targetNetoRencanaDariPembayaran(row, pembayaranList);
            const nominalTarget = nominalNetoTarget || nominalBruto;
            const punyaStatusAlokasi = Number.isFinite(Number(row.nominal_sisa))
                || Number.isFinite(Number(row.nominal_terealisasi));

            if (punyaStatusAlokasi) {
                const nominalTerealisasi = Math.max(0, Number(row.nominal_terealisasi) || 0);
                const nominalSisa = Math.max(0, nominalNetoTarget
                    ? nominalTarget - nominalTerealisasi
                    : Number(row.nominal_sisa) || Math.max(0, nominalTarget - nominalTerealisasi));
                const terealisasi = nominalTarget > 0 && nominalSisa <= 0;
                return {
                    ...row,
                    nominal_rencana: Number(row.nominal_rencana) || nominalTarget,
                    nominal_rencana_display: row.nominal_rencana_display || formatRupiahPenuh(nominalTarget),
                    nominal_terealisasi: nominalTerealisasi,
                    nominal_terealisasi_display: row.nominal_terealisasi_display || formatRupiahPenuh(nominalTerealisasi),
                    nominal_sisa: nominalSisa,
                    nominal_sisa_display: row.nominal_sisa_display || formatRupiahPenuh(nominalSisa),
                    terealisasi,
                    status_realisasi: terealisasi
                        ? 'Terealisasi'
                        : nominalTerealisasi > 0 ? 'Sebagian Terealisasi' : 'Belum Terealisasi'
                };
            }

            const nominalTerealisasi = pembayaranList
                .filter(pembayaran => pembayaranTerminMatches(row, pembayaran))
                .reduce((sum, pembayaran) => sum + nominalNettoPembayaranTercatat(pembayaran), 0);
            const nominalSisa = Math.max(0, nominalTarget - nominalTerealisasi);
            const terealisasi = nominalTarget > 0 && nominalSisa <= 0;
            return {
                ...row,
                nominal_rencana: nominalTarget,
                nominal_rencana_display: formatRupiahPenuh(nominalTarget),
                nominal_terealisasi: nominalTerealisasi,
                nominal_terealisasi_display: formatRupiahPenuh(nominalTerealisasi),
                nominal_sisa: nominalSisa,
                nominal_sisa_display: formatRupiahPenuh(nominalSisa),
                terealisasi,
                status_realisasi: terealisasi
                    ? 'Terealisasi'
                    : nominalTerealisasi > 0 ? 'Sebagian Terealisasi' : 'Belum Terealisasi'
            };
        });
    }

    function lengkapiRencanaTerminDenganKontrak(data = [], kontrakList = [], pembayaranList = [], cicilanByProgram = new Map()) {
        const rowsByIdentity = new Map();
        data.forEach(row => {
            const key = terminIdentity(row);
            if (key) rowsByIdentity.set(key, row);
        });

        kontrakList.forEach(item => {
            const cicilanList = cicilanByProgram.get(item.id_program) || [];
            if ((item.cara_pembayaran === 'Termin' || item.cara_pembayaran === 'Unit Price') && cicilanList.length) {
                cicilanList.forEach(cicilan => {
                    const row = rowTerminDariCicilan(item, cicilan);
                    const key = terminIdentity(row);
                    if (rowsByIdentity.has(key)) {
                        const existing = rowsByIdentity.get(key);
                        rowsByIdentity.set(key, {
                            ...row,
                            ...existing,
                            termin_order: Number.isFinite(Number(existing.termin_order))
                                ? Number(existing.termin_order)
                                : row.termin_order
                        });
                    } else {
                        rowsByIdentity.set(key, row);
                    }
                });
            }
        });

        const dataLengkap = [...rowsByIdentity.values()];
        const existingKeys = new Set(dataLengkap.map(groupKeyRencanaTermin));
        const pembayaranByKode = new Map();
        pembayaranList.forEach(item => {
            const kode = String(item.kode_file || '').trim();
            if (!kode) return;
            pembayaranByKode.set(kode, (pembayaranByKode.get(kode) || 0) + nominalNettoPembayaranTercatat(item));
        });

        const tambahan = kontrakList
            .filter(item => Number(item.nilai_kontrak_raw) > 0)
            .map(item => {
                const key = groupKeyRencanaTermin({
                    id_program: item.id_program || '',
                    kode_file: item.kode_file || '',
                    nama_mitra: item.nama_mitra || '',
                    judul_pks: item.judul_pks || ''
                });
                if (existingKeys.has(key)) return null;
                const nominal = Number(item.nilai_kontrak_raw) || 0;
                const realisasi = pembayaranByKode.get(String(item.kode_file || '').trim()) || 0;
                const tanggalInput = item.batas_akhir_pembayaran || '';
                return {
                    no: 0,
                    id_program: item.id_program || '',
                    kode_file: item.kode_file || '',
                    nama_mitra: item.nama_mitra || '',
                    judul_pks: item.judul_pks || '',
                    tahap: item.cara_pembayaran || 'Nilai Kontrak',
                    sumber: 'Daftar Kerma',
                    tanggal_diterima: formatTanggalTermin(tanggalInput),
                    tanggal_input: tanggalInput,
                    nominal,
                    nominal_display: item.nilai_kontrak || formatRupiahPenuh(nominal),
                    status_jadwal: tanggalInput ? 'Terjadwal' : 'Perlu tanggal',
                    rencana_key: `kontrak-placeholder|${item.id_program || item.kode_file || key}`,
                    terealisasi: nominal > 0 && realisasi >= nominal,
                    status_realisasi: nominal > 0 && realisasi >= nominal ? 'Terealisasi' : 'Belum Terealisasi',
                    termin_placeholder: true
                };
            })
            .filter(Boolean);

        return tandaiRencanaTerminTerealisasi([...dataLengkap, ...tambahan], pembayaranList);
    }

    function jumlahKontrakTermin(data = []) {
        return kelompokkanRencanaTermin(data).length;
    }

    function setRencanaPendapatanView(mode = 'daftar') {
        modeRencanaPendapatan = mode === 'termin' ? 'termin' : 'daftar';
        const isTermin = modeRencanaPendapatan === 'termin';
        if (wrapRencanaPendapatanDaftar) wrapRencanaPendapatanDaftar.style.display = isTermin ? 'none' : '';
        if (wrapRencanaPendapatanTermin) wrapRencanaPendapatanTermin.style.display = isTermin ? '' : 'none';
        btnRencanaViewDaftar?.classList.toggle('active', !isTermin);
        btnRencanaViewTermin?.classList.toggle('active', isTermin);
        btnRencanaViewDaftar?.setAttribute('aria-pressed', isTermin ? 'false' : 'true');
        btnRencanaViewTermin?.setAttribute('aria-pressed', isTermin ? 'true' : 'false');
        terapkanFilterRencanaPendapatan();
    }

    function syncPlaceholderPeriodeRencana() {
        [filterRencanaPendapatanMulai, filterRencanaPendapatanSelesai].forEach(input => {
            input?.closest('.period-field--date-placeholder')?.classList.toggle('has-value', !!input.value);
        });
    }

    function terapkanFilterRencanaPendapatan() {
        syncPlaceholderPeriodeRencana();
        const hasilPeriode = allRencanaPendapatanData.filter(filterRencanaByPeriode);
        rencanaPendapatanRowsPeriodeAktif = hasilPeriode;
        updateRencanaPendapatanSummary();
        renderDetailRencanaPendapatan();
        if (infoHasilRencanaPendapatan) infoHasilRencanaPendapatan.textContent = '';
    }

    function aturModeFormPembayaran(mode = 'tambah') {
        const btnSubmit = formRealisasiPembayaran.querySelector('button[type="submit"]');
        const sedangEdit = mode === 'edit';
        btnSubmit.textContent = sedangEdit ? 'Update Penerimaan' : 'Simpan Penerimaan';
        if (btnBatalEditPembayaran) btnBatalEditPembayaran.style.display = sedangEdit ? '' : 'none';
    }

    function resetFormPembayaran(hideAlert = true) {
        const selectedKode = selectPembayaranKodeFile.value;
        formRealisasiPembayaran.reset();
        selectPembayaranKodeFile.value = selectedKode;
        const tanggalInput = formRealisasiPembayaran.querySelector('[name="tanggal"]');
        if (tanggalInput) tanggalInput.value = todayInputDate();
        isiKalkulasiPenerimaan({ bruto: 0, persenPotongan: persenPotonganDefaultPenerimaan(), hasil: 0 });
        rencanaPendapatanDipilih = null;
        pembayaranDipilihUntukEdit = null;
        aturModeFormPembayaran('tambah');
        if (hideAlert) formAlertPembayaran.style.display = 'none';
    }

    function isiFormRealisasiDariRencana(item) {
        if (!item || !item.kode_file) {
            alert('Rencana penerimaan ini belum memiliki Kode File, sehingga belum dapat direalisasikan.');
            return;
        }
        rencanaPendapatanDipilih = item;
        pembayaranDipilihUntukEdit = null;
        aturModeFormPembayaran('tambah');
        setTabRealisasi('pembayaran');

        selectPembayaranKodeFile.value = item.kode_file;
        const tanggalInput = formRealisasiPembayaran.querySelector('[name="tanggal"]');
        const nominalInput = formRealisasiPembayaran.querySelector('[name="nominal"]');
        const keteranganInput = formRealisasiPembayaran.querySelector('[name="keterangan"]');
        if (tanggalInput) tanggalInput.value = item.tanggal_input || todayInputDate();
        if (nominalInput) {
            isiKalkulasiPenerimaan({
                bruto: nominalDasarRealisasiPenerimaan(item),
                persenPotongan: persenPotonganDefaultPenerimaan()
            });
        }
        if (keteranganInput) keteranganInput.value = `Realisasi ${item.tahap || 'penerimaan'} dari rencana penerimaan`;

        formAlertPembayaran.className = 'form-alert form-alert--success';
        formAlertPembayaran.textContent = `${teksInfoPotonganRealisasiPenerimaan(item)} Sesuaikan tanggal diterima bila berbeda, lalu klik Simpan Penerimaan.`;
        formAlertPembayaran.style.display = 'inline-block';
        formRealisasiPembayaran.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function isiFormEditPembayaran(item) {
        if (!item) return;
        pembayaranDipilihUntukEdit = item;
        rencanaPendapatanDipilih = null;
        setTabRealisasi('pembayaran');
        aturModeFormPembayaran('edit');

        selectPembayaranKodeFile.value = item.kode_file || '';
        const tanggalInput = formRealisasiPembayaran.querySelector('[name="tanggal"]');
        const nominalInput = formRealisasiPembayaran.querySelector('[name="nominal"]');
        const keteranganInput = formRealisasiPembayaran.querySelector('[name="keterangan"]');
        if (tanggalInput) tanggalInput.value = item.tanggal_input || todayInputDate();
        if (nominalInput) {
            isiKalkulasiPenerimaan({
                bruto: nominalBrutoPembayaranTercatat(item),
                persenPotongan: persenDpiPembayaranTercatat(item),
                hasil: nominalNettoPembayaranTercatat(item)
            });
        }
        if (keteranganInput) keteranganInput.value = item.keterangan || '';

        formAlertPembayaran.className = 'form-alert form-alert--success';
        formAlertPembayaran.textContent = 'Mode edit aktif. Perbarui tanggal, nominal, atau keterangan, lalu klik Update Penerimaan.';
        formAlertPembayaran.style.display = 'inline-block';
        formRealisasiPembayaran.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderTabelPembayaran(data) {
        bodyTabelPembayaran.innerHTML = '';
        if (data.length === 0) {
            bodyTabelPembayaran.innerHTML = tableState(10, 'empty', 'Belum ada realisasi penerimaan', 'Catat tanggal uang diterima SBM sebelum membuat realisasi anggaran.');
            return;
        }
        data.forEach(item => {
            const nominalBruto = nominalBrutoPembayaranTercatat(item);
            const nominalDpi = nominalDpiPembayaranTercatat(item);
            const realisasiPenerimaan = nominalNettoPembayaranTercatat(item);
            bodyTabelPembayaran.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${esc(item.no)}</td>
                    <td><span class="kode-file-tag">${esc(item.kode_file)}</span></td>
                    <td class="td-truncate"><strong>${esc(item.nama_mitra)}</strong></td>
                    <td>${esc(item.tanggal_realisasi || '-')}</td>
                    <td>${esc(item.tanggal_rencana || 'N/A')}</td>
                    <td class="td-number">${esc(formatRupiahKomaDash(nominalBruto))}</td>
                    <td class="td-number payment-dpi-cell"><strong>${esc(formatRupiahKomaDash(nominalDpi))}</strong></td>
                    <td class="td-number"><strong>${esc(formatRupiahKomaDash(realisasiPenerimaan))}</strong></td>
                    <td class="td-truncate">${esc(item.keterangan)}</td>
                    <td>
                        <div class="table-actions-inline">
                            <button type="button" class="btn-edit-pembayaran btn-edit-kerma" data-id="${esc(item.id_pembayaran)}">✏ Edit</button>
                            <button type="button" class="btn-hapus-pembayaran btn-hapus-kerma" data-id="${esc(item.id_pembayaran)}" data-label="${esc(item.kode_file + ' - ' + formatRupiahKomaDash(realisasiPenerimaan))}">🗑 Hapus</button>
                        </div>
                    </td>
                </tr>
            `);
        });
    }

    function terapkanFilterPembayaran() {
        const cari = filterPembayaranCari.value.toLowerCase().trim();
        const hasilSearch = allPembayaranData.filter(item => cocokPencarianGlobal(item, cari));
        const hasil = colFilterPembayaran.applyTo(hasilSearch);
        renderTabelPembayaran(hasil);
        const adaFilter = cari || Object.keys(colFilterPembayaran.colFilters).length > 0;
        infoHasilPembayaran.textContent = adaFilter ? `Menampilkan ${hasil.length} dari ${allPembayaranData.length} data` : '';
    }

    function nilaiKontrakProgram(program = {}) {
        return Number(program.nilai_kontrak_raw) || Number(program.nilai_kontrak) || parseNominalRupiah(program.nilai_kontrak);
    }

    function updateRingkasanRencanaAnggaran(kodeFile, data = []) {
        const program = programDariKodeFile(kodeFile);
        if (!kodeFile) {
            setText(nilaiKontrakRencanaAnggaran, 'Rp 0,-');
            setText(saldoProyektifRencanaAnggaran, 'Rp 0,-');
            setText(saldoDefinitifRencanaAnggaran, 'Rp 0,-');
            setText(infoKontrakRencanaAnggaran, 'Pilih kode file untuk melihat data.');
            return;
        }
        if (!program) {
            setText(nilaiKontrakRencanaAnggaran, 'Rp 0,-');
            setText(saldoProyektifRencanaAnggaran, 'Rp 0,-');
            setText(saldoDefinitifRencanaAnggaran, 'Rp 0,-');
            setText(infoKontrakRencanaAnggaran, 'Kode file tidak ditemukan pada daftar Kerma.');
            return;
        }
        const saldo = data.reduce((acc, item) => {
            const pemasukan = Number(item.pemasukan) || 0;
            const ri = Number(item.ri) || 0;
            const realisasiRi = Number(item.pengeluaran_ri) || 0;
            acc.proyektif += pemasukan - ri;
            acc.definitif += pemasukan - realisasiRi;
            return acc;
        }, { proyektif: 0, definitif: 0 });
        setText(nilaiKontrakRencanaAnggaran, formatRupiahKomaDash(totalPenerimaanKodeFile(kodeFile)));
        setText(saldoProyektifRencanaAnggaran, formatRupiahKomaDash(saldo.proyektif));
        setText(saldoDefinitifRencanaAnggaran, formatRupiahKomaDash(saldo.definitif));
        const jumlahRows = data.length.toLocaleString('id-ID');
        setText(infoKontrakRencanaAnggaran, `${program.nama_mitra || '-'} · ${jumlahRows} baris transaksi`);
    }

    function tanggalSortRencanaAnggaran(row = {}) {
        const tanggal = parseInputDate(row.tanggal_sort_input || row.tanggal_ri_input || row.tanggal_realisasi_input || row.tanggal_input);
        if (tanggal) return tanggal.getTime();
        return row.sumber_ledger === 'penerimaan' ? 0 : Number.MAX_SAFE_INTEGER;
    }

    function barisPenerimaanUntukRealisasiRi(row = {}, index = 0) {
        const tanggalInput = row.tanggal_realisasi_input || row.tanggal_input || '';
        return {
            sumber_ledger: 'penerimaan',
            urutan_sumber: 0,
            kode_file: row.kode_file || '',
            judul_kerma: row.judul_pks || '',
            mitra: row.nama_mitra || '',
            tanggal_ri: row.tanggal_realisasi || row.tanggal || formatTanggalTermin(tanggalInput),
            tanggal_sort_input: tanggalInput,
            uraian: row.keterangan || row.rencana_tahap || `Realisasi Penerimaan ${index + 1}`,
            pemasukan: nominalNettoPembayaranTercatat(row),
            ri: 0,
            pengeluaran_ri: 0
        };
    }

    function barisRiUntukRealisasiRi(row = {}) {
        const tanggalInput = row.tanggal_ri_input || row.tgl_invoice_input || '';
        return {
            ...row,
            sumber_ledger: 'ri',
            urutan_sumber: 1,
            pemasukan: 0,
            ri: Number(row.ri) || 0,
            pengeluaran_ri: 0,
            realisasi_ri: 0,
            tgl_invoice: row.tanggal_ri || row.tgl_invoice || formatTanggalTermin(tanggalInput),
            tgl_invoice_input: tanggalInput,
            tanggal_sort_input: tanggalInput
        };
    }

    function barisRealisasiRiManualUntukLedger(row = {}) {
        const realisasiRi = Number(row.pengeluaran_ri) || Number(row.realisasi_ri) || 0;
        const tanggalInput = row.tanggal_realisasi_ri_input || row.tgl_invoice_input || row.tanggal_ri_input || '';
        return {
            ...row,
            sumber_ledger: 'realisasi_ri',
            urutan_sumber: 2,
            id_rencana_anggaran: row.id_rencana_anggaran ? `realisasi-ri-${row.id_rencana_anggaran}` : '',
            pemasukan: 0,
            ri: 0,
            pengeluaran_ri: realisasiRi,
            realisasi_ri: realisasiRi,
            tanggal_ri: row.tanggal_realisasi_ri || row.tgl_invoice || row.tanggal_ri || formatTanggalTermin(tanggalInput),
            tgl_invoice: row.tanggal_realisasi_ri || row.tgl_invoice || row.tanggal_ri || formatTanggalTermin(tanggalInput),
            tgl_invoice_input: tanggalInput,
            tanggal_sort_input: tanggalInput
        };
    }

    function barisRealisasiAnggaranUntukRi(row = {}) {
        const nominal = Number(row.nominal) || 0;
        return {
            sumber_ledger: 'realisasi_anggaran',
            urutan_sumber: 3,
            id_rencana_anggaran: row.id_realisasi ? `realisasi-${row.id_realisasi}` : '',
            id_realisasi: row.id_realisasi || '',
            kode_file: row.kode_file || '',
            judul_kerma: row.judul_pks || '',
            mitra: row.nama_mitra || '',
            tanggal_ri: row.tanggal || formatTanggalTermin(row.tanggal_input),
            tanggal_ri_input: row.tanggal_input || '',
            tgl_invoice: row.tanggal || formatTanggalTermin(row.tanggal_input),
            tgl_invoice_input: row.tanggal_input || '',
            tanggal_sort_input: row.tanggal_input || '',
            no_invoice: '',
            uraian: row.keterangan || row.kategori || 'Realisasi Anggaran',
            kategori_belanja: row.kategori || '',
            ri: 0,
            pengeluaran_ri: nominal,
            realisasi_ri: nominal,
            is_realisasi_anggaran: true
        };
    }

    function barisRiOtomatisDariRealisasi(row = {}, nominal = 0) {
        const tanggalInput = tanggalInputRiInvoice(row);
        const labelRealisasi = row.uraian || row.kategori_belanja || 'Realisasi RI';
        return {
            ...row,
            sumber_ledger: 'ri_auto',
            urutan_sumber: 1.5,
            id_rencana_anggaran: `ri-auto-${row.id_rencana_anggaran || row.id_realisasi || `${row.kode_file || 'kode'}-${tanggalInput}-${labelRealisasi}`}`,
            pemasukan: 0,
            ri: Number(nominal) || 0,
            pengeluaran_ri: 0,
            realisasi_ri: 0,
            no_invoice: row.no_invoice || row.nomor_invoice || row.invoice || '',
            uraian: `RI - ${labelRealisasi}`,
            tanggal_ri: row.tanggal_ri || row.tgl_invoice || formatTanggalTermin(tanggalInput),
            tgl_invoice: row.tgl_invoice || row.tanggal_ri || formatTanggalTermin(tanggalInput),
            tgl_invoice_input: tanggalInput,
            tanggal_sort_input: tanggalInput,
            is_ri_auto: true
        };
    }

    function urutTransaksiRi(a, b) {
        const tA = tanggalSortRencanaAnggaran(a);
        const tB = tanggalSortRencanaAnggaran(b);
        if (tA !== tB) return tA - tB;
        if ((a.urutan_sumber || 0) !== (b.urutan_sumber || 0)) return (a.urutan_sumber || 0) - (b.urutan_sumber || 0);
        return String(a.uraian || '').localeCompare(String(b.uraian || ''), 'id', { numeric: true });
    }

    function rowsRiLedger(kodeFile) {
        const kode = String(kodeFile || '').trim();
        if (!kode) return [];
        const riRows = allRencanaAnggaranData
            .filter(row => String(row.kode_file || '').trim() === kode)
            .filter(row => (Number(row.ri) || 0) > 0)
            .map(barisRiUntukRealisasiRi);
        const realisasiRiManualRows = allRencanaAnggaranData
            .filter(row => String(row.kode_file || '').trim() === kode)
            .filter(row => (Number(row.pengeluaran_ri) || Number(row.realisasi_ri) || 0) > 0)
            .map(barisRealisasiRiManualUntukLedger);

        return [...riRows, ...realisasiRiManualRows].sort(urutTransaksiRi);
    }

    function gabungDataRealisasiRi(kodeFile) {
        const kode = String(kodeFile || '').trim();
        if (!kode) return [];
        const penerimaanRows = allPembayaranData
            .filter(row => String(row.kode_file || '').trim() === kode)
            .map(barisPenerimaanUntukRealisasiRi);
        return [...penerimaanRows, ...rowsRiLedger(kode)].sort(urutTransaksiRi);
    }

    function nilaiKolomRi(row = {}, fieldNames = []) {
        for (const field of fieldNames) {
            const raw = row[field];
            if (raw == null || raw === '') continue;
            if (String(raw).trim() === '-') continue;
            const parsed = parseNominalRupiah(raw);
            if (Number.isFinite(parsed)) return parsed;
        }
        return 0;
    }

    function tanggalInputRiInvoice(row = {}) {
        return row.tgl_invoice_input || row.tanggal_invoice_input || row.tanggal_ri_input || row.tanggal_sort_input || '';
    }

    function tanggalDisplayRiInvoice(row = {}) {
        return row.tgl_invoice || row.tanggal_invoice || row.tanggal_ri || formatTanggalTermin(tanggalInputRiInvoice(row));
    }

    function nomorInvoiceRi(row = {}) {
        return row.no_invoice || row.nomor_invoice || row.invoice || '-';
    }

    function opsiKategoriBelanjaRi(selected = '') {
        const aktif = String(selected || '').trim();
        return '<option value="">Pilih kategori</option>' + kategoriBelanjaOptions.map(kategori => `
            <option value="${esc(kategori)}"${aktif === kategori ? ' selected' : ''}>${esc(kategori)}</option>
        `).join('');
    }

    function tanggalMasukSaldoInput(rowTanggal, sampaiInput, hitungTanpaTanggal = true) {
        if (!sampaiInput) return true;
        const batas = parseInputDate(sampaiInput);
        if (!batas) return true;
        const tanggal = parseInputDate(rowTanggal);
        if (!tanggal) return hitungTanpaTanggal;
        return tanggal <= batas;
    }

    function totalPenerimaanKodeFile(kodeFile, sampaiInput = '') {
        const kode = String(kodeFile || '').trim();
        if (!kode) return 0;
        return allPembayaranData
            .filter(row => String(row.kode_file || '').trim() === kode)
            .filter(row => tanggalMasukSaldoInput(row.tanggal_realisasi_input || row.tanggal_input, sampaiInput, false))
            .reduce((sum, row) => sum + nominalNettoPembayaranTercatat(row), 0);
    }

    function totalRiRencanaKodeFile(kodeFile, sampaiInput = '') {
        const kode = String(kodeFile || '').trim();
        if (!kode) return 0;
        return rowsRiLedger(kode)
            .filter(row => row.sumber_ledger === 'ri' || row.sumber_ledger === 'ri_auto')
            .filter(row => tanggalMasukSaldoInput(tanggalInputRiInvoice(row), sampaiInput, true))
            .reduce((sum, row) => sum + (Number(row.ri) || 0), 0);
    }

    function totalRiDefinitifKodeFile(kodeFile, sampaiInput = '') {
        const kode = String(kodeFile || '').trim();
        if (!kode) return 0;
        return rowsRiLedger(kode)
            .filter(row => row.sumber_ledger !== 'ri' && row.sumber_ledger !== 'ri_auto')
            .filter(row => tanggalMasukSaldoInput(tanggalInputRiInvoice(row), sampaiInput, true))
            .reduce((sum, row) => sum + (Number(row.pengeluaran_ri) || Number(row.realisasi_ri) || 0), 0);
    }

    function saldoRiProyektifTersediaKodeFile(kodeFile, sampaiInput = '') {
        return totalPenerimaanKodeFile(kodeFile, sampaiInput) - totalRiRencanaKodeFile(kodeFile, sampaiInput);
    }

    function saldoRiDefinitifTersediaKodeFile(kodeFile, sampaiInput = '') {
        return totalPenerimaanKodeFile(kodeFile, sampaiInput) - totalRiDefinitifKodeFile(kodeFile, sampaiInput);
    }

    function sisaRiDapatDirealisasikanKodeFile(kodeFile, sampaiInput = '') {
        return totalRiRencanaKodeFile(kodeFile, sampaiInput) - totalRiDefinitifKodeFile(kodeFile, sampaiInput);
    }

    function saldoProyektifKodeFile(kodeFile) {
        return sisaRiDapatDirealisasikanKodeFile(kodeFile);
    }

    function updateRingkasanRealisasiRiInvoice(kodeFile, rows = []) {
        const program = programDariKodeFile(kodeFile);
        if (!kodeFile) {
            setText(nilaiKontrakRealisasiRi, 'Rp 0,-');
            setText(saldoDefinitifRealisasiRi, 'Rp 0,-');
            setText(infoKontrakRealisasiRi, 'Pilih kode file untuk melihat data.');
            return;
        }
        if (!program) {
            setText(nilaiKontrakRealisasiRi, 'Rp 0,-');
            setText(saldoDefinitifRealisasiRi, 'Rp 0,-');
            setText(infoKontrakRealisasiRi, 'Kode file tidak ditemukan pada daftar Kerma.');
            return;
        }
        setText(nilaiKontrakRealisasiRi, formatRupiahKomaDash(totalRiRencanaKodeFile(kodeFile)));
        setText(saldoDefinitifRealisasiRi, formatRupiahKomaDash(saldoProyektifKodeFile(kodeFile)));
        setText(infoKontrakRealisasiRi, `${program.nama_mitra || '-'} · ${rows.length.toLocaleString('id-ID')} baris RI`);
    }

    function updateRingkasanRabAnggaran(data = allRabAnggaranData) {
        const total = data.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
        setText(rabSummaryTotal, formatRupiahKomaDash(total));
        setText(rabSummaryJumlah, `${data.length.toLocaleString('id-ID')} item`);
    }

    function kategoriBelanjaOptionsRab(selected = '') {
        const aktif = String(selected || '').trim();
        return '<option value="">Pilih kategori</option>' + kategoriBelanjaOptions.map(kategori => `
            <option value="${esc(kategori)}"${aktif === kategori ? ' selected' : ''}>${esc(kategori)}</option>
        `).join('');
    }

    function draftRowRabAnggaran(item = {}, mode = 'tambah') {
        const harga = Number(item.harga_satuan) || 0;
        const volume = Number(item.volume) || 0;
        const total = harga * volume;
        const kodeDefault = item.kode_file || (mode === 'tambah' && tabRabAnggaran?.classList.contains('active') ? kodeFileRabAktif() : '');
        return `
            <tr class="rab-draft-row" data-rab-draft="${mode}" data-rab-id="${esc(item.id_rab || '')}">
                <td>${mode === 'edit' ? 'Edit' : 'Baru'}</td>
                <td class="td-muted">-</td>
                <td><input type="text" class="ri-inline-input" data-rab-field="kode_file" list="datalistRabKodeFile" value="${esc(kodeDefault)}" placeholder="Kode File"></td>
                <td><input type="text" class="ri-inline-input ri-inline-input--wide" data-rab-field="uraian" value="${esc(item.uraian || '')}" placeholder="Uraian"></td>
                <td><select class="ri-inline-input" data-rab-field="kategori_belanja">${kategoriBelanjaOptionsRab(item.kategori_belanja)}</select></td>
                <td><input type="text" class="ri-inline-input" data-rab-field="satuan" value="${esc(item.satuan || '')}" placeholder="Satuan"></td>
                <td><input type="number" class="ri-inline-input ri-inline-input--number" data-rab-field="harga_satuan" min="0" value="${harga || ''}" placeholder="0"></td>
                <td><input type="number" class="ri-inline-input ri-inline-input--number" data-rab-field="volume" min="0" step="0.01" value="${volume || ''}" placeholder="0"></td>
                <td class="td-number" data-rab-total-preview>${esc(formatRupiahKomaDash(total))}</td>
                <td><input type="text" class="ri-inline-input ri-inline-input--wide" data-rab-field="keterangan" value="" placeholder=""></td>
                <td>
                    <div class="table-actions-inline rab-actions-inline">
                        <button type="button" class="btn-row-save" data-rab-save>Simpan</button>
                        <button type="button" class="btn-row-cancel" data-rab-cancel>Batal</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function dataRabTampil() {
        const kodeAktif = tabRabAnggaran?.classList.contains('active') ? normalisasiKodeFileSaldo(kodeFileRabAktif()) : '';
        return [...allRabAnggaranData]
            .filter(row => !kodeAktif || String(row.kode_file || '').trim() === kodeAktif)
            .sort((a, b) => {
                const byKode = urutKodeFileTerbaru(a, b);
                if (byKode !== 0) return byKode;
                return String(a.uraian || '').localeCompare(String(b.uraian || ''), 'id', { numeric: true });
            });
    }

    function rabSudahMasukRi(row = {}) {
        const kode = String(row.kode_file || '').trim();
        const uraian = String(row.uraian || '').trim().toLowerCase();
        const kategori = String(row.kategori_belanja || '').trim().toLowerCase();
        const total = Number(row.total) || 0;
        if (!kode || !uraian || total <= 0) return false;
        return rowsRiLedger(kode)
            .filter(item => item.sumber_ledger === 'ri' || item.sumber_ledger === 'ri_auto')
            .some(item => {
                const ri = nilaiKolomRi(item, ['ri', 'nilai_ri', 'nominal_ri']);
                const sameUraian = String(item.uraian || '').trim().toLowerCase() === uraian;
                const sameKategori = String(item.kategori_belanja || '').trim().toLowerCase() === kategori;
                return Math.abs(ri - total) < 1 && sameUraian && sameKategori;
            });
    }

    function rabDapatDipilihUntukRi(row = {}) {
        return !!row.id_rab && !!row.kode_file && (Number(row.total) || 0) > 0 && !rabSudahMasukRi(row);
    }

    function statusRiRab(row = {}) {
        const total = Number(row.total) || 0;
        if (rabSudahMasukRi(row)) {
            return '<span class="rab-ri-status rab-ri-status--done">Sudah RI</span>';
        }
        if (!row.kode_file || total <= 0) {
            return '<span class="rab-ri-status rab-ri-status--muted">Belum siap</span>';
        }
        return '<span class="rab-ri-status rab-ri-status--pending">Belum RI</span>';
    }

    function bersihkanPilihanRab() {
        const ids = new Set(allRabAnggaranData.map(row => String(row.id_rab || '')).filter(Boolean));
        rabTerpilih = new Set([...rabTerpilih].filter(id => ids.has(id)));
    }

    function updateKontrolPilihanRab(data = dataRabTampil()) {
        bersihkanPilihanRab();
        const eligibleIds = data
            .filter(rabDapatDipilihUntukRi)
            .map(row => String(row.id_rab || ''))
            .filter(Boolean);
        const selectedVisible = eligibleIds.filter(id => rabTerpilih.has(id)).length;
        if (checkAllRabAnggaran) {
            checkAllRabAnggaran.disabled = eligibleIds.length === 0;
            checkAllRabAnggaran.checked = eligibleIds.length > 0 && selectedVisible === eligibleIds.length;
            checkAllRabAnggaran.indeterminate = selectedVisible > 0 && selectedVisible < eligibleIds.length;
        }
        if (btnBuatRiRab) {
            const selectedTotal = [...rabTerpilih].length;
            btnBuatRiRab.disabled = selectedTotal === 0;
            btnBuatRiRab.textContent = selectedTotal ? `Buat RI (${selectedTotal})` : 'Buat RI';
        }
    }

    function renderTabelRabAnggaran() {
        if (!bodyTabelRabAnggaran) return;
        const kodeAktif = tabRabAnggaran?.classList.contains('active') ? normalisasiKodeFileSaldo(kodeFileRabAktif()) : '';
        const data = dataRabTampil();
        updateRingkasanRabAnggaran(data);
        updateKontrolPilihanRab(data);
        bodyTabelRabAnggaran.innerHTML = '';
        if (!data.length) {
            bodyTabelRabAnggaran.innerHTML = (rabDraftAfter === '__empty__' || rabDraftAfter === '__top__')
                ? draftRowRabAnggaran({}, 'tambah')
                : `
                    <tr class="ri-empty-row">
                        <td colspan="11">
                            <div class="table-state table-state--empty">
                                <strong>Belum ada RAB</strong>
                                <small>${kodeAktif ? `Belum ada RAB untuk Kode File ${esc(kodeAktif)}.` : 'Tekan tombol Tambah untuk membuat item RAB pertama.'}</small>
                                ${kodeAktif && allRabAnggaranData.length ? '<button type="button" class="btn-mini-action" data-rab-reset-filter>Tampilkan semua RAB</button>' : ''}
                            </div>
                        </td>
                    </tr>
                `;
            return;
        }

        if (rabDraftAfter === '__top__') {
            bodyTabelRabAnggaran.insertAdjacentHTML('beforeend', draftRowRabAnggaran({}, 'tambah'));
        }

        data.forEach((row, index) => {
            const rowId = row.id_rab || '';
            if (rabEditId === rowId) {
                bodyTabelRabAnggaran.insertAdjacentHTML('beforeend', draftRowRabAnggaran(row, 'edit'));
                return;
            }
            bodyTabelRabAnggaran.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <input type="checkbox"
                               class="rab-row-check"
                               data-rab-select="${esc(rowId)}"
                               aria-label="Pilih RAB ${esc(row.uraian || row.kode_file || index + 1)}"
                               ${rabTerpilih.has(rowId) ? 'checked' : ''}
                               ${rabDapatDipilihUntukRi(row) ? '' : 'disabled'}>
                    </td>
                    <td><span class="kode-file-tag">${esc(row.kode_file || '-')}</span></td>
                    <td class="td-truncate"><strong>${esc(row.uraian || '-')}</strong></td>
                    <td>${row.kategori_belanja ? `<span class="badge ${esc(realisasiBadgeClass[row.kategori_belanja] || 'badge-realisasi-default')}">${esc(row.kategori_belanja)}</span>` : '-'}</td>
                    <td>${esc(row.satuan || '-')}</td>
                    <td class="td-number">${esc(formatRupiahKomaDash(row.harga_satuan || 0))}</td>
                    <td class="td-number">${esc(Number(row.volume || 0).toLocaleString('id-ID'))}</td>
                    <td class="td-number"><strong>${esc(formatRupiahKomaDash(row.total || 0))}</strong></td>
                    <td class="td-truncate">${esc(row.keterangan || '')}</td>
                    <td class="td-center">${statusRiRab(row)}</td>
                </tr>
            `);
            if (rabDraftAfter === rowId) {
                bodyTabelRabAnggaran.insertAdjacentHTML('beforeend', draftRowRabAnggaran({}, 'tambah'));
            }
        });
    }

    function updatePreviewTotalRab(rowEl) {
        if (!rowEl) return;
        const harga = Number(rowEl.querySelector('[data-rab-field="harga_satuan"]')?.value) || 0;
        const volume = Number(rowEl.querySelector('[data-rab-field="volume"]')?.value) || 0;
        const preview = rowEl.querySelector('[data-rab-total-preview]');
        if (preview) preview.textContent = formatRupiahKomaDash(harga * volume);
    }

    function payloadRabDariRow(rowEl) {
        const value = field => String(rowEl.querySelector(`[data-rab-field="${field}"]`)?.value || '').trim();
        return {
            kode_file: value('kode_file'),
            uraian: value('uraian'),
            kategori_belanja: value('kategori_belanja'),
            satuan: value('satuan'),
            harga_satuan: Number(value('harga_satuan')) || 0,
            volume: Number(value('volume')) || 0,
            keterangan: ''
        };
    }

    async function simpanDraftRabAnggaran(rowEl) {
        if (!rowEl) return;
        const payload = payloadRabDariRow(rowEl);
        if (!payload.kode_file) {
            alert('Kode File wajib diisi.');
            return;
        }
        if (!payload.uraian) {
            alert('Uraian wajib diisi.');
            return;
        }
        if (!payload.kategori_belanja) {
            alert('Kategori Belanja wajib diisi.');
            return;
        }
        const idRab = String(rowEl.dataset.rabId || '').trim();
        const saveBtn = rowEl.querySelector('[data-rab-save]');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Menyimpan...';
        }
        try {
            const res = await fetch(idRab ? `/api/rab-anggaran/${encodeURIComponent(idRab)}` : '/api/rab-anggaran', {
                method: idRab ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.pesan || 'Gagal menyimpan RAB.');
            rabDraftAfter = null;
            rabEditId = null;
            await muatRabAnggaran();
        } catch (err) {
            alert(err.message || 'Gagal menyimpan RAB.');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Simpan';
            }
        }
    }

    async function hapusRabAnggaran(idRab, label = 'RAB') {
        if (!idRab) return;
        if (!confirm(`Hapus ${label}?`)) return;
        try {
            const res = await fetch(`/api/rab-anggaran/${encodeURIComponent(idRab)}`, { method: 'DELETE' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.pesan || 'Gagal menghapus RAB.');
            if (rabEditId === idRab) rabEditId = null;
            if (rabDraftAfter === idRab) rabDraftAfter = null;
            await muatRabAnggaran();
        } catch (err) {
            alert(err.message || 'Gagal menghapus RAB.');
        }
    }

    async function muatRabAnggaran() {
        if (!bodyTabelRabAnggaran) return;
        bodyTabelRabAnggaran.innerHTML = tableState(11, 'loading', 'Memuat RAB', 'Mengambil data Rencana Anggaran Biaya.');
        try {
            const res = await fetch(`/api/rab-anggaran?_=${Date.now()}`, { cache: 'no-store' });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.pesan || 'Gagal memuat RAB.');
            allRabAnggaranData = payload.data || [];
            renderTabelRabAnggaran();
        } catch (err) {
            console.warn('Gagal memuat RAB:', err);
            allRabAnggaranData = [];
            updateRingkasanRabAnggaran([]);
            updateKontrolPilihanRab([]);
            bodyTabelRabAnggaran.innerHTML = tableState(11, 'error', 'Gagal memuat RAB', 'Periksa koneksi server atau coba kembali.');
        }
    }

    async function buatRiDariRabTerpilih() {
        const rowsTerpilih = allRabAnggaranData.filter(row => rabTerpilih.has(String(row.id_rab || '')));
        if (!rowsTerpilih.length) {
            alert('Pilih minimal satu baris RAB terlebih dahulu.');
            return;
        }
        const kandidat = rowsTerpilih.filter(rabDapatDipilihUntukRi);
        if (!kandidat.length) {
            alert('Baris yang dipilih belum siap dibuat RI atau sudah tercatat sebagai RI.');
            rabTerpilih.clear();
            renderTabelRabAnggaran();
            return;
        }

        const tanggalRi = todayInputDate();
        const gagal = [];
        const berhasil = [];
        if (btnBuatRiRab) {
            btnBuatRiRab.disabled = true;
            btnBuatRiRab.textContent = 'Membuat RI...';
        }

        for (const row of kandidat) {
            try {
                const res = await fetch('/api/rencana-anggaran', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        kode_file: row.kode_file,
                        tanggal_ri: tanggalRi,
                        tgl_invoice: tanggalRi,
                        no_invoice: 'RAB',
                        uraian: row.uraian || 'RI dari RAB',
                        kategori_belanja: row.kategori_belanja || '',
                        ri: Number(row.total) || 0,
                        pemasukan: 0,
                        pengeluaran_ri: 0,
                        sumber: 'rab'
                    })
                });
                const payload = await res.json();
                if (!res.ok) throw new Error(payload.pesan || 'Gagal membuat RI.');
                berhasil.push(row);
                rabTerpilih.delete(String(row.id_rab || ''));
            } catch (err) {
                gagal.push({
                    row,
                    pesan: err.message || 'Gagal membuat RI.'
                });
            }
        }

        await muatRencanaAnggaran();
        renderTabelRabAnggaran();

        const pesanBerhasil = berhasil.length ? `${berhasil.length} RAB berhasil dibuat menjadi RI.` : 'Tidak ada RAB yang berhasil dibuat menjadi RI.';
        const pesanGagal = gagal.length
            ? `\n${gagal.length} RAB gagal:\n${gagal.slice(0, 6).map(item => `- ${item.row.kode_file || '-'} · ${item.row.uraian || '-'}: ${item.pesan}`).join('\n')}${gagal.length > 6 ? '\n- ...' : ''}`
            : '';
        alert(`${pesanBerhasil}${pesanGagal}`);
    }

    function rowsRealisasiRiInvoice(kodeFile) {
        const kode = String(kodeFile || '').trim();
        if (!kode) return [];
        return rowsRiLedger(kode)
            .sort((a, b) => {
                const tA = parseInputDate(tanggalInputRiInvoice(a))?.getTime() || 0;
                const tB = parseInputDate(tanggalInputRiInvoice(b))?.getTime() || 0;
                if (tA !== tB) return tA - tB;
                if ((a.urutan_sumber || 0) !== (b.urutan_sumber || 0)) return (a.urutan_sumber || 0) - (b.urutan_sumber || 0);
                return String(a.uraian || '').localeCompare(String(b.uraian || ''), 'id', { numeric: true });
            });
    }

    function draftRowRealisasiRiInvoice(prefill = realisasiRiDraftPrefill || {}) {
        const tanggal = String(prefill.tgl_invoice || '').trim();
        const noInvoice = String(prefill.no_invoice || '').trim();
        const uraian = String(prefill.uraian || '').trim();
        const kategori = String(prefill.kategori_belanja || '').trim();
        const realisasiRi = Number(prefill.realisasi_ri) || 0;
        return `
            <tr class="ri-draft-row">
                <td><input type="date" class="ri-inline-input" data-ri-field="tgl_invoice" value="${esc(tanggal)}" aria-label="Tanggal Realisasi RI"></td>
                <td><input type="text" class="ri-inline-input" data-ri-field="no_invoice" value="${esc(noInvoice)}" placeholder="No. referensi" aria-label="No. Referensi"></td>
                <td><input type="text" class="ri-inline-input ri-inline-input--wide" data-ri-field="uraian" value="${esc(uraian)}" placeholder="Uraian" aria-label="Uraian"></td>
                <td><select class="ri-inline-input" data-ri-field="kategori_belanja" aria-label="Kategori Belanja">${opsiKategoriBelanjaRi(kategori)}</select></td>
                <td class="td-muted">Dari RAB</td>
                <td><input type="number" class="ri-inline-input ri-inline-input--number" data-ri-field="realisasi_ri" min="0" value="${realisasiRi || ''}" placeholder="0" aria-label="Realisasi RI"></td>
                <td class="td-muted">Setelah simpan</td>
                <td>
                    <div class="table-actions-inline ri-actions-inline">
                        <button type="button" class="btn-row-save" data-ri-save>Simpan</button>
                        <button type="button" class="btn-row-cancel" data-ri-cancel>Batal</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function emptyRowRealisasiRiInvoice() {
        return `
            <tr class="ri-empty-row">
                <td colspan="7">
                    <div class="table-state table-state--empty">
                        <strong>Belum ada RI/Realisasi RI</strong>
                        <small>RI dibuat dari RAB. Tekan tombol + untuk mencatat Realisasi RI.</small>
                    </div>
                </td>
                <td><button type="button" class="btn-row-plus" data-ri-add-after="__empty__" aria-label="Tambah baris pertama">+</button></td>
            </tr>
        `;
    }

    function renderTabelRealisasiRiInvoice(data = rowsRealisasiRiInvoice(kodeFileSaldoAktif())) {
        if (!bodyTabelRealisasiRiInvoice) return;
        const kode = kodeFileSaldoAktif();
        const rows = [...(data || [])];

        bodyTabelRealisasiRiInvoice.innerHTML = '';
        if (!kode) {
            bodyTabelRealisasiRiInvoice.innerHTML = tableState(8, 'empty', 'Pilih Kode File', 'Saldo RI akan muncul sesuai Kode File yang dipilih.');
            return;
        }
        if (rows.length === 0) {
            bodyTabelRealisasiRiInvoice.innerHTML = (realisasiRiDraftAfter === '__empty__' || realisasiRiDraftAfter === '__last__')
                ? draftRowRealisasiRiInvoice()
                : emptyRowRealisasiRiInvoice();
            return;
        }

        let saldoRi = 0;
        rows.forEach((row, index) => {
            const rowKey = row.id_rencana_anggaran || `row-${index}`;
            const isLastRow = index === rows.length - 1;
            const ri = nilaiKolomRi(row, ['ri', 'nilai_ri', 'nominal_ri']);
            const realisasiRi = nilaiKolomRi(row, ['realisasi_ri', 'pengeluaran_ri']);
            saldoRi += ri - realisasiRi;
            const saldoClass = saldoRi < 0 ? 'realisasi-sisa-negative' : '';
            bodyTabelRealisasiRiInvoice.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${esc(tanggalDisplayRiInvoice(row) || '-')}</td>
                    <td>${esc(nomorInvoiceRi(row))}</td>
                    <td class="td-truncate"><strong>${esc(row.uraian || '-')}</strong></td>
                    <td>${row.kategori_belanja ? `<span class="badge ${esc(realisasiBadgeClass[row.kategori_belanja] || 'badge-realisasi-default')}">${esc(row.kategori_belanja)}</span>` : '-'}</td>
                    <td class="td-number">${ri ? esc(formatRupiahKomaDash(ri)) : '-'}</td>
                    <td class="td-number">${realisasiRi ? esc(formatRupiahKomaDash(realisasiRi)) : '-'}</td>
                    <td class="td-number ${saldoClass}">${esc(formatRupiahKomaDash(saldoRi))}</td>
                    <td>${isLastRow ? `<button type="button" class="btn-row-plus" data-ri-add-after="${esc(rowKey)}" aria-label="Tambah baris setelah ini">+</button>` : ''}</td>
                </tr>
            `);
            if (isLastRow && (realisasiRiDraftAfter === rowKey || realisasiRiDraftAfter === '__last__')) {
                bodyTabelRealisasiRiInvoice.insertAdjacentHTML('beforeend', draftRowRealisasiRiInvoice());
            }
        });
    }

    function terapkanFilterRealisasiRiInvoice() {
        const kode = kodeFileSaldoAktif();
        setKodeFileSaldo(kode);
        const rows = rowsRealisasiRiInvoice(kode);
        updateRingkasanRealisasiRiInvoice(kode, rows);
        renderTabelRealisasiRiInvoice(rows);
    }

    async function simpanDraftRealisasiRiInvoice(rowEl) {
        const kodeFile = kodeFileSaldoAktif();
        if (!kodeFile) {
            alert('Pilih Kode File terlebih dahulu.');
            return;
        }
        const nilai = field => String(rowEl.querySelector(`[data-ri-field="${field}"]`)?.value || '').trim();
        const tglInvoice = nilai('tgl_invoice');
        const noInvoice = nilai('no_invoice');
        const uraian = nilai('uraian');
        const kategoriBelanja = nilai('kategori_belanja');
        const ri = 0;
        const realisasiRi = Number(nilai('realisasi_ri')) || 0;
        if (!tglInvoice) {
            alert('Tanggal Realisasi RI wajib diisi.');
            return;
        }
        if (!uraian) {
            alert('Uraian wajib diisi.');
            return;
        }
        if (realisasiRi <= 0) {
            alert('Nominal Realisasi RI wajib diisi.');
            return;
        }
        const totalPenerimaan = totalPenerimaanKodeFile(kodeFile, tglInvoice);
        if (totalPenerimaan <= 0) {
            alert('Realisasi RI belum dapat dicatat karena belum ada realisasi penerimaan sampai tanggal tersebut untuk Kode File ini.');
            return;
        }
        const saldoDefinitif = saldoRiDefinitifTersediaKodeFile(kodeFile, tglInvoice);
        const sisaRi = sisaRiDapatDirealisasikanKodeFile(kodeFile, tglInvoice);
        if (realisasiRi > saldoDefinitif) {
            alert(`Realisasi RI melebihi saldo definitif yang tersedia. Saldo tersedia: ${formatRupiahKomaDash(saldoDefinitif)}.`);
            return;
        }
        if (realisasiRi > sisaRi) {
            alert(`Realisasi RI melebihi RI yang sudah diregistrasikan. Sisa RI yang dapat direalisasikan: ${formatRupiahKomaDash(sisaRi)}.`);
            return;
        }

        const saveBtn = rowEl.querySelector('[data-ri-save]');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Menyimpan...';
        }
        try {
            const res = await fetch('/api/rencana-anggaran', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kode_file: kodeFile,
                    tanggal_ri: tglInvoice,
                    tanggal_realisasi_ri: realisasiRi > 0 ? tglInvoice : '',
                    tgl_invoice: tglInvoice,
                    no_invoice: noInvoice,
                    uraian,
                    kategori_belanja: kategoriBelanja,
                    ri,
                    pemasukan: 0,
                    pengeluaran_ri: realisasiRi
                })
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.pesan || 'Gagal menyimpan Realisasi RI.');
            realisasiRiDraftAfter = null;
            realisasiRiDraftPrefill = null;
            await muatRencanaAnggaran();
        } catch (err) {
            alert(err.message || 'Gagal menyimpan Realisasi RI.');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Simpan';
            }
        }
    }

    function renderTabelRencanaAnggaran(data = [], opsi = {}) {
        if (!bodyTabelRencanaAnggaran) return;
        bodyTabelRencanaAnggaran.innerHTML = '';
        const kodeDipilih = !!opsi.kodeDipilih;
        if (!kodeDipilih) {
            bodyTabelRencanaAnggaran.innerHTML = tableState(7, 'empty', 'Pilih Kode File', 'Saldo Penerimaan akan muncul sesuai Kode File yang dipilih.');
            return;
        }
        if (data.length === 0) {
            bodyTabelRencanaAnggaran.innerHTML = tableState(7, 'empty', 'Belum ada Saldo Penerimaan', 'Belum ada realisasi penerimaan, RI, atau realisasi RI untuk Kode File ini.');
            return;
        }
        let saldoProyektif = 0;
        let saldoDefinitif = 0;
        data.forEach(item => {
            const pemasukan = Number(item.pemasukan) || 0;
            const ri = Number(item.ri) || 0;
            const realisasiRi = Number(item.pengeluaran_ri) || 0;
            saldoProyektif += pemasukan - ri;
            saldoDefinitif += pemasukan - realisasiRi;
            const saldoProyektifClass = saldoProyektif < 0 ? 'realisasi-sisa-negative' : '';
            const saldoDefinitifClass = saldoDefinitif < 0 ? 'realisasi-sisa-negative' : '';
            bodyTabelRencanaAnggaran.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${esc(item.tanggal_ri || '-')}</td>
                    <td class="td-truncate"><strong>${esc(item.uraian || '-')}</strong></td>
                    <td class="td-number">${pemasukan ? esc(formatRupiahKomaDash(pemasukan)) : '-'}</td>
                    <td class="td-number">${ri ? esc(formatRupiahKomaDash(ri)) : '-'}</td>
                    <td class="td-number ${saldoProyektifClass}">${esc(formatRupiahKomaDash(saldoProyektif))}</td>
                    <td class="td-number">${realisasiRi ? esc(formatRupiahKomaDash(realisasiRi)) : '-'}</td>
                    <td class="td-number ${saldoDefinitifClass}">${esc(formatRupiahKomaDash(saldoDefinitif))}</td>
                </tr>
            `);
        });
    }

    function terapkanFilterRencanaAnggaran() {
        const kode = kodeFileSaldoAktif();
        setKodeFileSaldo(kode);
        const hasil = gabungDataRealisasiRi(kode);
        updateRingkasanRencanaAnggaran(kode, hasil);
        renderTabelRencanaAnggaran(hasil, { kodeDipilih: !!kode });
    }

    async function muatRencanaAnggaran() {
        if (!bodyTabelRencanaAnggaran) return;
        bodyTabelRencanaAnggaran.innerHTML = tableState(7, 'loading', 'Memuat Saldo Penerimaan', 'Mengambil data realisasi penerimaan, RI, dan realisasi RI.');
        if (bodyTabelRealisasiRiInvoice) {
            bodyTabelRealisasiRiInvoice.innerHTML = tableState(8, 'loading', 'Memuat Saldo RI', 'Mengambil data RI dan realisasi RI.');
        }
        try {
            const res = await fetch(`/api/rencana-anggaran?_=${Date.now()}`, { cache: 'no-store' });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.pesan || 'Gagal memuat rencana anggaran.');
            allRencanaAnggaranData = payload.data || [];
            rencanaAnggaranSudahDimuat = true;
            terapkanFilterRealisasiRiInvoice();
            terapkanFilterRencanaAnggaran();
            renderTabelRabAnggaran();
            if (tabRealisasiAnggaran?.classList.contains('active') || modeRekapRealisasi === 'proyektif') {
                terapkanFilterRealisasi();
            }
        } catch (err) {
            console.warn('Gagal memuat data RI untuk Saldo Penerimaan:', err);
            if (allPembayaranData.length > 0 || kodeFileSaldoAktif()) {
                rencanaAnggaranSudahDimuat = true;
                terapkanFilterRealisasiRiInvoice();
                terapkanFilterRencanaAnggaran();
                if (modeRekapRealisasi === 'proyektif') terapkanFilterRealisasi();
                return;
            }
            if (rencanaAnggaranSudahDimuat) {
                terapkanFilterRealisasiRiInvoice();
                terapkanFilterRencanaAnggaran();
                if (modeRekapRealisasi === 'proyektif') terapkanFilterRealisasi();
                return;
            }
            allRencanaAnggaranData = [];
            rencanaAnggaranSudahDimuat = false;
            bodyTabelRencanaAnggaran.innerHTML = tableState(7, 'error', 'Gagal memuat Saldo Penerimaan', 'Periksa koneksi server atau coba kembali.');
            if (bodyTabelRealisasiRiInvoice) {
                bodyTabelRealisasiRiInvoice.innerHTML = tableState(8, 'error', 'Gagal memuat Saldo RI', 'Periksa koneksi server atau coba kembali.');
            }
            if (modeRekapRealisasi === 'proyektif') terapkanFilterRealisasi();
        }
    }

    function lengkapiKolomKategoriRealisasi(item) {
        const nilaiNominal = (value, displayValue = '') => {
            const angka = Number(value);
            if (Number.isFinite(angka) && angka !== 0) return angka;
            return parseNominalRupiah(displayValue);
        };
        const kodeFile = String(item.kode_file || '').trim();
        const adaPembayaranKodeFile = kodeFile && allPembayaranData.some(row => String(row.kode_file || '').trim() === kodeFile);
        const nominal = nilaiNominal(item.nominal, item.nominal_display);
        const pegawai = nilaiNominal(item.pegawai, item.pegawai_display) || (item.kategori === 'Belanja Pegawai' ? nominal : 0);
        const barang = nilaiNominal(item.barang, item.barang_display) || (item.kategori === 'Belanja Barang' ? nominal : 0);
        const jasa = nilaiNominal(item.jasa, item.jasa_display) || (item.kategori === 'Belanja Jasa' ? nominal : 0);
        const modal = nilaiNominal(item.modal, item.modal_display) || (item.kategori === 'Belanja Modal' ? nominal : 0);
        const totalRealisasi = nilaiNominal(item.total_realisasi_program, item.total_realisasi_program_display) || nominal;
        const totalPembayaranApi = nilaiNominal(item.total_pembayaran_program, item.total_pembayaran_program_display);
        const totalPembayaran = adaPembayaranKodeFile ? totalPenerimaanKodeFile(kodeFile) : totalPembayaranApi;
        const saldoTersedia = totalPembayaran - totalRealisasi;
        return {
            ...item,
            nominal,
            nominal_display: formatRupiahKomaDash(nominal),
            pegawai,
            barang,
            jasa,
            modal,
            pegawai_display: pegawai ? formatRupiahKomaDash(pegawai) : '-',
            barang_display: barang ? formatRupiahKomaDash(barang) : '-',
            jasa_display: jasa ? formatRupiahKomaDash(jasa) : '-',
            modal_display: modal ? formatRupiahKomaDash(modal) : '-',
            total_pembayaran_program: totalPembayaran,
            total_pembayaran_program_display: formatRupiahKomaDash(totalPembayaran),
            total_realisasi_program: totalRealisasi,
            total_realisasi_program_display: formatRupiahKomaDash(totalRealisasi),
            saldo_tersedia_program: saldoTersedia,
            saldo_tersedia_program_display: formatRupiahKomaDash(saldoTersedia)
        };
    }

    function dataRekapProyektif() {
        const grouped = new Map();
        allRencanaAnggaranData
            .filter(row => (Number(row.ri) || 0) > 0)
            .forEach(row => {
                const kodeFile = String(row.kode_file || '').trim();
                const program = programDariKodeFile(kodeFile) || {};
                const key = row.id_program || kodeFile || row.id_rencana_anggaran;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        id_program: row.id_program || program.id_program || '',
                        kode_file: kodeFile || program.kode_file || '',
                        nama_mitra: program.nama_mitra || row.mitra || '',
                        judul_pks: program.judul_pks || row.judul_kerma || '',
                        pegawai: 0,
                        barang: 0,
                        jasa: 0,
                        modal: 0,
                        total_realisasi_program: 0,
                        tanggal_sort: 0
                    });
                }
                const item = grouped.get(key);
                const nominal = Number(row.ri) || 0;
                item.total_realisasi_program += nominal;
                if (row.kategori_belanja === 'Belanja Pegawai') item.pegawai += nominal;
                if (row.kategori_belanja === 'Belanja Barang') item.barang += nominal;
                if (row.kategori_belanja === 'Belanja Jasa') item.jasa += nominal;
                if (row.kategori_belanja === 'Belanja Modal') item.modal += nominal;
                const tanggal = parseInputDate(row.tanggal_ri_input || row.tgl_invoice_input);
                if (tanggal) item.tanggal_sort = Math.max(item.tanggal_sort, tanggal.getTime());
            });

        return [...grouped.values()]
            .map((item, index) => {
                const totalPembayaran = totalPenerimaanKodeFile(item.kode_file);
                const saldoProyektif = totalPembayaran - item.total_realisasi_program;
                const tanggalInput = item.tanggal_sort ? inputDateFromDate(new Date(item.tanggal_sort)) : '';
                return {
                    no: index + 1,
                    id_program: item.id_program,
                    kode_file: item.kode_file,
                    nama_mitra: item.nama_mitra,
                    judul_pks: item.judul_pks,
                    kategori: 'Rekapitulasi Proyektif',
                    tanggal: tanggalInput ? formatTanggalTermin(tanggalInput) : 'Belum bertanggal',
                    tanggal_input: tanggalInput,
                    nominal: item.total_realisasi_program,
                    nominal_display: formatRupiahKomaDash(item.total_realisasi_program),
                    pegawai: item.pegawai,
                    barang: item.barang,
                    jasa: item.jasa,
                    modal: item.modal,
                    pegawai_display: item.pegawai ? formatRupiahKomaDash(item.pegawai) : '-',
                    barang_display: item.barang ? formatRupiahKomaDash(item.barang) : '-',
                    jasa_display: item.jasa ? formatRupiahKomaDash(item.jasa) : '-',
                    modal_display: item.modal ? formatRupiahKomaDash(item.modal) : '-',
                    total_pembayaran_program: totalPembayaran,
                    total_pembayaran_program_display: formatRupiahKomaDash(totalPembayaran),
                    total_realisasi_program: item.total_realisasi_program,
                    total_realisasi_program_display: formatRupiahKomaDash(item.total_realisasi_program),
                    saldo_tersedia_program: saldoProyektif,
                    saldo_tersedia_program_display: formatRupiahKomaDash(saldoProyektif)
                };
            })
            .map(lengkapiKolomKategoriRealisasi)
            .sort(urutKodeFileTerbaru);
    }

    function barisRekapKosongDariProgram(program = {}, mode = 'definitif') {
        const kodeFile = String(program.kode_file || '').trim();
        const totalPembayaran = totalPenerimaanKodeFile(kodeFile);
        const nolDisplay = formatRupiahKomaDash(0);
        return {
            no: 0,
            id_program: program.id_program || '',
            kode_file: kodeFile,
            nama_mitra: program.nama_mitra || '',
            judul_pks: program.judul_pks || '',
            kategori: mode === 'proyektif' ? 'Rekapitulasi Proyektif' : 'Rekapitulasi',
            tanggal: 'Belum ada RI',
            tanggal_input: '',
            nominal: 0,
            nominal_display: nolDisplay,
            pegawai: 0,
            barang: 0,
            jasa: 0,
            modal: 0,
            pegawai_display: '-',
            barang_display: '-',
            jasa_display: '-',
            modal_display: '-',
            total_pembayaran_program: totalPembayaran,
            total_pembayaran_program_display: formatRupiahKomaDash(totalPembayaran),
            total_realisasi_program: 0,
            total_realisasi_program_display: nolDisplay,
            saldo_tersedia_program: totalPembayaran,
            saldo_tersedia_program_display: formatRupiahKomaDash(totalPembayaran),
            jumlah_transaksi: 0,
            belum_ada_ri: true
        };
    }

    function lengkapiDaftarRekapDenganKodeFileKosong(data = [], mode = 'definitif') {
        const hasil = [...data];
        const kodeTerpakai = new Set(
            hasil
                .map(item => String(item.kode_file || '').trim().toLowerCase())
                .filter(Boolean)
        );
        const kodeDariKerma = new Set();
        allData.forEach(program => {
            const kodeFile = String(program.kode_file || '').trim();
            const kodeKey = kodeFile.toLowerCase();
            if (!kodeFile || kodeTerpakai.has(kodeKey) || kodeDariKerma.has(kodeKey)) return;
            kodeDariKerma.add(kodeKey);
            hasil.push(barisRekapKosongDariProgram(program, mode));
        });
        return hasil.sort(urutKodeFileTerbaru);
    }

    function dataRekapRealisasiAktif() {
        const mode = modeRekapRealisasi === 'proyektif' ? 'proyektif' : 'definitif';
        const data = mode === 'proyektif' ? dataRekapProyektif() : allRealisasiData;
        return lengkapiDaftarRekapDenganKodeFileKosong(data, mode);
    }

    function setModeRekapRealisasi(mode = 'definitif') {
        modeRekapRealisasi = mode === 'proyektif' ? 'proyektif' : 'definitif';
        btnRekapVersiDefinitif?.classList.toggle('active', modeRekapRealisasi === 'definitif');
        btnRekapVersiProyektif?.classList.toggle('active', modeRekapRealisasi === 'proyektif');
        btnRekapVersiDefinitif?.setAttribute('aria-pressed', modeRekapRealisasi === 'definitif' ? 'true' : 'false');
        btnRekapVersiProyektif?.setAttribute('aria-pressed', modeRekapRealisasi === 'proyektif' ? 'true' : 'false');
        updateLabelRekapRealisasi();
    }

    function updateLabelRekapRealisasi() {
        const isProyektif = modeRekapRealisasi === 'proyektif';
        const labelRealisasi = isProyektif ? 'Total RI' : 'Total Realisasi RI';
        const labelSaldo = isProyektif ? 'Total Saldo Proyektif' : 'Total Saldo Definitif';
        const headingRealisasi = panelRealisasiAnggaran?.querySelector('th[data-col="total_realisasi_program_display"]');
        const headingSaldo = panelRealisasiAnggaran?.querySelector('th[data-col="saldo_tersedia_program_display"]');
        const formulaTotal = panelRealisasiAnggaran?.querySelector('.table-formula-row th:nth-child(10)');
        const formulaSaldo = panelRealisasiAnggaran?.querySelector('.table-formula-row th:nth-child(11)');
        setText(rekapSummaryRealisasi?.parentElement?.querySelector('span'), labelRealisasi);
        setText(rekapSummarySaldoDefinitif?.parentElement?.querySelector('span'), labelSaldo);
        setText(headingRealisasi, labelRealisasi);
        setText(headingSaldo, isProyektif ? 'Saldo Proyektif' : 'Saldo Definitif');
        setText(formulaTotal, 'J = F + G + H + I');
        setText(formulaSaldo, 'K = E - J');
    }

    function renderTabelRealisasi(data) {
        bodyTabelRealisasi.innerHTML = '';
        if (data.length === 0) {
            const title = modeRekapRealisasi === 'proyektif' ? 'Belum ada data proyektif' : 'Belum ada realisasi anggaran';
            const desc = modeRekapRealisasi === 'proyektif'
                ? 'Catat RI pada tab Saldo RI agar versi proyektif dapat ditampilkan.'
                : 'Tambahkan Realisasi RI melalui tab Saldo RI.';
            bodyTabelRealisasi.innerHTML = tableState(11, 'empty', title, desc);
            return;
        }
        data.forEach((item, index) => {
            const saldoClass = Number(item.saldo_tersedia_program) < 0 ? 'realisasi-sisa-negative' : '';
            bodyTabelRealisasi.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${index + 1}</td>
                    <td><span class="kode-file-tag">${esc(item.kode_file)}</span></td>
                    <td class="td-truncate"><strong>${esc(item.nama_mitra)}</strong></td>
                    <td class="td-truncate">${esc(item.judul_pks)}</td>
                    <td>${esc(item.total_pembayaran_program_display)}</td>
                    <td class="td-number">${esc(item.pegawai_display)}</td>
                    <td class="td-number">${esc(item.barang_display)}</td>
                    <td class="td-number">${esc(item.jasa_display)}</td>
                    <td class="td-number">${esc(item.modal_display)}</td>
                    <td>${esc(item.total_realisasi_program_display)}</td>
                    <td class="${saldoClass}">${esc(item.saldo_tersedia_program_display)}</td>
                </tr>
            `);
        });
    }

    function updateRingkasanRekapRealisasi(data = []) {
        const total = data.reduce((acc, item) => {
            acc.penerimaan += Number(item.total_pembayaran_program) || 0;
            acc.pegawai += Number(item.pegawai) || 0;
            acc.barang += Number(item.barang) || 0;
            acc.jasa += Number(item.jasa) || 0;
            acc.modal += Number(item.modal) || 0;
            acc.realisasi += Number(item.total_realisasi_program) || 0;
            acc.saldoDefinitif += Number(item.saldo_tersedia_program) || 0;
            return acc;
        }, {
            penerimaan: 0,
            pegawai: 0,
            barang: 0,
            jasa: 0,
            modal: 0,
            realisasi: 0,
            saldoDefinitif: 0
        });

        setText(rekapSummaryPenerimaan, formatRupiahKomaDash(total.penerimaan));
        setText(rekapSummaryPegawai, formatRupiahKomaDash(total.pegawai));
        setText(rekapSummaryBarang, formatRupiahKomaDash(total.barang));
        setText(rekapSummaryJasa, formatRupiahKomaDash(total.jasa));
        setText(rekapSummaryModal, formatRupiahKomaDash(total.modal));
        setText(rekapSummaryRealisasi, formatRupiahKomaDash(total.realisasi));
        setText(rekapSummarySaldoDefinitif, formatRupiahKomaDash(total.saldoDefinitif));
    }

    function terapkanFilterRealisasi() {
        const cari = filterRealisasiCari.value.toLowerCase().trim();
        const kodeAktif = tabRealisasiAnggaran?.classList.contains('active') ? kodeFileRekapAktif() : '';
        const kodeAktifLower = kodeAktif.toLowerCase();
        const sumber = dataRekapRealisasiAktif();
        let hasil = sumber.filter(item => cocokPencarianGlobal(item, cari));
        if (kodeAktifLower) {
            hasil = hasil.filter(item => String(item.kode_file || '').trim().toLowerCase() === kodeAktifLower);
        }
        hasil = colFilterRealisasi.applyTo(hasil);
        hasil = [...hasil].sort(urutKodeFileTerbaru);
        updateRingkasanRekapRealisasi(hasil);
        renderTabelRealisasi(hasil);
        const adaFilter = cari || kodeAktif || Object.keys(colFilterRealisasi.colFilters).length > 0;
        infoHasilRealisasi.textContent = adaFilter ? `Menampilkan ${hasil.length} dari ${sumber.length} data` : '';
    }

    async function AmbilDataRealisasiDanRender() {
        try {
            await populateSelectKodeFileRealisasi();
            const tanggalPembayaran = formRealisasiPembayaran?.querySelector('[name="tanggal"]');
            if (tanggalPembayaran && !tanggalPembayaran.value) tanggalPembayaran.value = todayInputDate();
            setText(statRencanaPendapatanNilaiKontrak, 'Memuat...');
            setText(statRencanaPendapatanNilaiKontrakJumlah, '0 kontrak');
            setText(statRencanaPendapatanRealisasi, 'Memuat...');
            setText(statRencanaPendapatanRealisasiJumlah, '0 transaksi dibukukan');
            setText(statRencanaPendapatanTotal, 'Memuat...');
            setText(statRencanaPendapatanJumlah, '0 kontrak bersisa');
            if (headDetailRencanaPendapatanTermin) headDetailRencanaPendapatanTermin.innerHTML = '';
            if (bodyDetailRencanaPendapatan) {
                bodyDetailRencanaPendapatan.innerHTML = tableState(9, 'loading', 'Memuat detail rencana penerimaan', 'Mengelompokkan termin sesuai periode yang dipilih.');
            }
            if (bodyTabelRencanaPendapatan) {
                bodyTabelRencanaPendapatan.innerHTML = tableState(9, 'loading', 'Memuat rencana penerimaan', 'Mengambil jadwal pembayaran dari kontrak.');
            }
            if (bodyTabelRencanaPendapatanTermin) {
                bodyTabelRencanaPendapatanTermin.innerHTML = tableState(4, 'loading', 'Memuat versi termin', 'Mengelompokkan rencana penerimaan per kontrak.');
            }
            if (bodyTabelRabAnggaran) {
                bodyTabelRabAnggaran.innerHTML = tableState(11, 'loading', 'Memuat RAB', 'Mengambil data Rencana Anggaran Biaya.');
            }
            if (bodyTabelRencanaAnggaran) {
                bodyTabelRencanaAnggaran.innerHTML = tableState(7, 'loading', 'Memuat Saldo Penerimaan', 'Mengambil data realisasi penerimaan, RI, dan realisasi RI.');
            }
            if (bodyTabelRealisasiRiInvoice) {
                bodyTabelRealisasiRiInvoice.innerHTML = tableState(8, 'loading', 'Memuat Saldo RI', 'Mengambil data RI dan realisasi RI.');
            }
            bodyTabelPembayaran.innerHTML = tableState(10, 'loading', 'Memuat realisasi penerimaan', 'Mengambil realisasi uang diterima SBM.');
            bodyTabelRealisasi.innerHTML = tableState(11, 'loading', 'Memuat realisasi anggaran', 'Mengambil pengeluaran per kontrak.');
            const wajibJson = async (url) => {
                const res = await fetch(url);
                const payload = await res.json();
                if (!res.ok) throw new Error(payload.pesan || `Gagal memuat ${url}`);
                return payload;
            };
            const opsionalJson = async (url) => {
                try {
                    const res = await fetch(url);
                    const payload = await res.json();
                    if (!res.ok) throw new Error(payload.pesan || `Gagal memuat ${url}`);
                    return payload;
                } catch (err) {
                    console.warn(`Endpoint opsional gagal dimuat: ${url}`, err);
                    return null;
                }
            };
            const [payloadRencana, payloadRencanaTermin, payloadPembayaran, payloadRealisasi] = await Promise.all([
                wajibJson('/api/rencana-pendapatan'),
                opsionalJson('/api/rencana-pendapatan-termin'),
                wajibJson('/api/daftar-realisasi-pembayaran'),
                opsionalJson('/api/daftar-realisasi-anggaran')
            ]);
            allRencanaPendapatanData = payloadRencana.data || [];
            rencanaTerminFallbackMode = !payloadRencanaTermin?.data;
            allPembayaranData = payloadPembayaran.data || [];
            allRealisasiData = (payloadRealisasi?.data || [])
                .map(lengkapiKolomKategoriRealisasi)
                .sort(urutKodeFileTerbaru);
            const cicilanTerminByProgram = await ambilCicilanTerminKontrak(allData);
            allRencanaTerminData = lengkapiRencanaTerminDenganKontrak(
                payloadRencanaTermin?.data || allRencanaPendapatanData,
                allData,
                allPembayaranData,
                cicilanTerminByProgram
            );
            isiDefaultPembayaranDariKodeFile();
            terapkanFilterRencanaPendapatan();
            terapkanFilterPembayaran();
            if (payloadRealisasi) {
                terapkanFilterRealisasi();
            } else if (bodyTabelRealisasi) {
                bodyTabelRealisasi.innerHTML = tableState(11, 'error', 'Gagal memuat realisasi anggaran', 'Periksa koneksi server atau coba kembali.');
            }
            await muatRabAnggaran();
            await muatRencanaAnggaran();
            renderTabelRabAnggaran();
            updateKelayakanRealisasiAnggaran(false);
        } catch {
            if (bodyTabelRencanaPendapatan) {
                bodyTabelRencanaPendapatan.innerHTML = tableState(9, 'error', 'Gagal memuat rencana penerimaan', 'Periksa koneksi server atau coba kembali.');
            }
            if (bodyTabelRencanaPendapatanTermin) {
                bodyTabelRencanaPendapatanTermin.innerHTML = tableState(4, 'error', 'Gagal memuat versi termin', 'Periksa koneksi server atau coba kembali.');
            }
            bodyTabelPembayaran.innerHTML = tableState(10, 'error', 'Gagal memuat realisasi penerimaan', 'Periksa koneksi server atau coba kembali.');
            if (bodyTabelRencanaAnggaran) {
                bodyTabelRencanaAnggaran.innerHTML = tableState(7, 'error', 'Gagal memuat Saldo Penerimaan', 'Periksa koneksi server atau coba kembali.');
            }
            if (bodyTabelRealisasiRiInvoice) {
                bodyTabelRealisasiRiInvoice.innerHTML = tableState(8, 'error', 'Gagal memuat Saldo RI', 'Periksa koneksi server atau coba kembali.');
            }
            if (bodyTabelRabAnggaran) {
                bodyTabelRabAnggaran.innerHTML = tableState(11, 'error', 'Gagal memuat RAB', 'Periksa koneksi server atau coba kembali.');
            }
            bodyTabelRealisasi.innerHTML = tableState(11, 'error', 'Gagal memuat realisasi anggaran', 'Periksa koneksi server atau coba kembali.');
            allRencanaPendapatanData = [];
            allRencanaTerminData = [];
            rencanaTerminFallbackMode = false;
            allPembayaranData = [];
            allRabAnggaranData = [];
            allRencanaAnggaranData = [];
            rencanaAnggaranSudahDimuat = false;
            allRealisasiData = [];
            rencanaPendapatanRowsPeriodeAktif = [];
            updateRencanaPendapatanSummary();
            renderDetailRencanaPendapatan();
            updateRingkasanRabAnggaran([]);
            updateRingkasanRencanaAnggaran('', []);
            updateRingkasanRealisasiRiInvoice('', []);
            updateKelayakanRealisasiAnggaran(false);
        }
    }

    formRealisasiPembayaran.addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(formRealisasiPembayaran).entries());
        const sedangEdit = !!pembayaranDipilihUntukEdit;
        if (!sedangEdit && rencanaPendapatanDipilih && rencanaPendapatanDipilih.kode_file === data.kode_file) {
            data.rencana_key = rencanaPendapatanDipilih.rencana_key || '';
            data.rencana_tahap = rencanaPendapatanDipilih.tahap || '';
            data.rencana_tanggal = rencanaPendapatanDipilih.tanggal_input || '';
            data.rencana_nominal = Number(data.nominal) || nominalNetoRealisasiPenerimaan(rencanaPendapatanDipilih);
        }
        formAlertPembayaran.style.display = 'none';
        const btnSubmit = formRealisasiPembayaran.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = sedangEdit ? 'Memperbarui...' : 'Menyimpan...';
        try {
            const url = sedangEdit
                ? `/api/realisasi-pembayaran/${encodeURIComponent(pembayaranDipilihUntukEdit.id_pembayaran)}`
                : '/api/tambah-realisasi-pembayaran';
            const res = await fetch(url, {
                method: sedangEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const hasil = await res.json();
            if (res.ok) {
                formAlertPembayaran.className = 'form-alert form-alert--success';
                formAlertPembayaran.textContent = hasil.pesan;
                formAlertPembayaran.style.display = 'inline-block';
                const selectedKode = selectPembayaranKodeFile.value;
                formRealisasiPembayaran.reset();
                selectPembayaranKodeFile.value = selectedKode;
                rencanaPendapatanDipilih = null;
                pembayaranDipilihUntukEdit = null;
                aturModeFormPembayaran('tambah');
                const tanggalInput = formRealisasiPembayaran.querySelector('[name="tanggal"]');
                if (tanggalInput) tanggalInput.value = todayInputDate();
                isiKalkulasiPenerimaan({ bruto: 0, persenPotongan: persenPotonganDefaultPenerimaan(), hasil: 0 });
                await AmbilDataRealisasiDanRender();
                if (sectionPimpinan?.classList.contains('active')) await loadDashboardPimpinan();
            } else {
                formAlertPembayaran.className = 'form-alert form-alert--error';
                formAlertPembayaran.textContent = hasil.pesan;
                formAlertPembayaran.style.display = 'inline-block';
            }
        } catch {
            formAlertPembayaran.className = 'form-alert form-alert--error';
            formAlertPembayaran.textContent = 'Gagal terhubung ke server.';
            formAlertPembayaran.style.display = 'inline-block';
        } finally {
            btnSubmit.disabled = false;
            aturModeFormPembayaran(pembayaranDipilihUntukEdit ? 'edit' : 'tambah');
        }
    });

    formRealisasiAnggaran?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!updateKelayakanRealisasiAnggaran(true)) return;
        const data = Object.fromEntries(new FormData(formRealisasiAnggaran).entries());
        if (formAlertRealisasi) formAlertRealisasi.style.display = 'none';
        const btnSubmit = formRealisasiAnggaran.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Menyimpan...';
        try {
            const res = await fetch('/api/tambah-realisasi-anggaran', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const hasil = await res.json();
            if (res.ok) {
                if (formAlertRealisasi) {
                    formAlertRealisasi.className = 'form-alert form-alert--success';
                    formAlertRealisasi.textContent = hasil.pesan;
                    formAlertRealisasi.style.display = 'inline-block';
                }
                const selectedKode = selectRealisasiKodeFile?.value || '';
                formRealisasiAnggaran.reset();
                if (selectRealisasiKodeFile) selectRealisasiKodeFile.value = selectedKode;
                await AmbilDataRealisasiDanRender();
                if (sectionPimpinan?.classList.contains('active')) await loadDashboardPimpinan();
            } else if (formAlertRealisasi) {
                formAlertRealisasi.className = 'form-alert form-alert--error';
                formAlertRealisasi.textContent = hasil.pesan;
                formAlertRealisasi.style.display = 'inline-block';
            }
        } catch {
            if (formAlertRealisasi) {
                formAlertRealisasi.className = 'form-alert form-alert--error';
                formAlertRealisasi.textContent = 'Gagal terhubung ke server.';
                formAlertRealisasi.style.display = 'inline-block';
            }
        } finally {
            btnSubmit.textContent = 'Simpan Realisasi';
            updateKelayakanRealisasiAnggaran(false);
        }
    });

    bodyTabelRealisasi.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-hapus-realisasi');
        if (!btn) return;
        if (!confirm(`Hapus realisasi "${btn.dataset.label}"?\nTindakan ini akan mengubah saldo cash flow.`)) return;
        try {
            const res = await fetch(`/api/realisasi-anggaran/${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
            const hasil = await res.json();
            if (res.ok) {
                await AmbilDataRealisasiDanRender();
                if (sectionPimpinan?.classList.contains('active')) await loadDashboardPimpinan();
            } else {
                alert(hasil.pesan || 'Gagal menghapus realisasi.');
            }
        } catch {
            alert('Gagal terhubung ke server.');
        }
    });

    bodyTabelPembayaran.addEventListener('click', async e => {
        const btnEdit = e.target.closest('.btn-edit-pembayaran');
        if (btnEdit) {
            const item = allPembayaranData.find(row => row.id_pembayaran === btnEdit.dataset.id);
            isiFormEditPembayaran(item);
            return;
        }

        const btn = e.target.closest('.btn-hapus-pembayaran');
        if (!btn) return;
        if (!confirm(`Hapus pembayaran "${btn.dataset.label}"?\nTindakan ini akan mengubah uang masuk dan saldo cash flow.`)) return;
        try {
            const res = await fetch(`/api/realisasi-pembayaran/${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
            const hasil = await res.json();
            if (res.ok) {
                if (pembayaranDipilihUntukEdit?.id_pembayaran === btn.dataset.id) resetFormPembayaran();
                await AmbilDataRealisasiDanRender();
                if (sectionPimpinan?.classList.contains('active')) await loadDashboardPimpinan();
            } else {
                alert(hasil.pesan || 'Gagal menghapus pembayaran.');
            }
        } catch {
            alert('Gagal terhubung ke server.');
        }
    });

    btnBatalEditPembayaran.addEventListener('click', () => {
        resetFormPembayaran();
    });

    bodyTabelRencanaPendapatan?.addEventListener('click', e => {
        const btn = e.target.closest('.btn-realisasi-rencana');
        if (!btn || btn.disabled) return;
        const item = allRencanaPendapatanData.find(row => row.rencana_key === btn.dataset.key);
        isiFormRealisasiDariRencana(item);
    });

    bodyDetailRencanaPendapatan?.addEventListener('click', e => {
        const cell = e.target.closest('.rencana-termin-cell--clickable');
        if (cell) {
            pilihRencanaTerminDariCell(cell, { konfirmasi: true });
            return;
        }
        const btn = e.target.closest('.btn-realisasi-rencana');
        if (!btn || btn.disabled) return;
        const item = allRencanaPendapatanData.find(row => row.rencana_key === btn.dataset.key);
        isiFormRealisasiDariRencana(item);
    });

    bodyDetailRencanaPendapatan?.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const cell = e.target.closest('.rencana-termin-cell--clickable');
        if (!cell) return;
        e.preventDefault();
        pilihRencanaTerminDariCell(cell, { konfirmasi: true });
    });

    panelDetailRencanaPendapatan?.addEventListener('click', e => {
        const card = e.target.closest('[data-rencana-detail-filter]');
        if (!card) return;
        const nextFilter = card.dataset.rencanaDetailFilter || '';
        rencanaPendapatanDetailFilter = rencanaPendapatanDetailFilter === nextFilter ? '' : nextFilter;
        renderDetailRencanaPendapatan();
    });

    function pilihRencanaTerminDariCell(cell, opsi = {}) {
        if (!cell) return;
        const item = allRencanaTerminData.find(row => row.rencana_key === cell.dataset.key);
        if (!item) return;
        if (item.terealisasi) {
            alert('Termin ini sudah terealisasi sehingga tidak perlu direalisasikan ulang.');
            return;
        }
        if (opsi.konfirmasi && !confirm('Apakah anda yakin akan melakukan realisasi?')) return;
        isiFormRealisasiDariRencana(item);
    }

    bodyTabelRencanaPendapatanTermin?.addEventListener('click', e => {
        pilihRencanaTerminDariCell(e.target.closest('.rencana-termin-cell--clickable'));
    });

    bodyTabelRencanaPendapatanTermin?.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const cell = e.target.closest('.rencana-termin-cell--clickable');
        if (!cell) return;
        e.preventDefault();
        pilihRencanaTerminDariCell(cell);
    });

    selectPembayaranKodeFile.addEventListener('change', () => {
        if (rencanaPendapatanDipilih && selectPembayaranKodeFile.value !== rencanaPendapatanDipilih.kode_file) {
            rencanaPendapatanDipilih = null;
            formAlertPembayaran.style.display = 'none';
        }
        isiDefaultPembayaranDariKodeFile({ force: true, tampilkanInfo: true });
    });
    nominalPembayaranBruto?.addEventListener('input', updateHasilPenerimaanDariBox);
    persenPotonganPembayaran?.addEventListener('input', updateHasilPenerimaanDariBox);
    persenPotonganPembayaran?.addEventListener('change', () => {
        if (!persenPotonganPembayaran) return;
        const persen = Math.min(100, Math.max(0, Number(persenPotonganPembayaran.value) || 0));
        persenPotonganPembayaran.value = persen;
        updateHasilPenerimaanDariBox();
    });
    btnResetPembayaranKodeFile?.addEventListener('click', resetKodeFilePembayaran);

    selectRealisasiKodeFile?.addEventListener('input', () => updateKelayakanRealisasiAnggaran(true));
    selectRealisasiKodeFile?.addEventListener('change', () => updateKelayakanRealisasiAnggaran(true));
    formRealisasiAnggaran?.querySelector('[name="tanggal"]')?.addEventListener('change', () => updateKelayakanRealisasiAnggaran(true));
    formRealisasiAnggaran?.querySelector('[name="nominal"]')?.addEventListener('input', () => updateKelayakanRealisasiAnggaran(true));
    updateKelayakanRealisasiAnggaran(false);

    colFilterRencanaPendapatan = makeColFilter(
        'sectionRealisasi',
        () => rencanaPendapatanTerminFilterRows,
        terapkanFilterRencanaPendapatan,
        '#panelRencanaPendapatan .rencana-income-detail-table'
    );
    colFilterRencanaPendapatan.initBtns();
    const colFilterPembayaran = makeColFilter('sectionRealisasi', () => allPembayaranData, terapkanFilterPembayaran, '#panelUangMasuk');
    colFilterPembayaran.initBtns();

    filterRencanaPendapatanCari?.addEventListener('input', terapkanFilterRencanaPendapatan);
    filterRencanaPendapatanMulai.addEventListener('change', terapkanFilterRencanaPendapatan);
    filterRencanaPendapatanSelesai.addEventListener('change', terapkanFilterRencanaPendapatan);
    btnRencanaViewDaftar?.addEventListener('click', () => setRencanaPendapatanView('daftar'));
    btnRencanaViewTermin?.addEventListener('click', () => setRencanaPendapatanView('termin'));
    btnResetFilterRencanaPendapatan?.addEventListener('click', () => {
        if (filterRencanaPendapatanCari) filterRencanaPendapatanCari.value = '';
        filterRencanaPendapatanMulai.value = '';
        filterRencanaPendapatanSelesai.value = '';
        colFilterRencanaPendapatan.clearAll();
        terapkanFilterRencanaPendapatan();
    });

    filterPembayaranCari.addEventListener('input', terapkanFilterPembayaran);
    btnResetFilterPembayaran.addEventListener('click', () => {
        filterPembayaranCari.value = '';
        colFilterPembayaran.clearAll();
        terapkanFilterPembayaran();
    });
    filterSaldoKodeFile?.addEventListener('input', () => {
        clearTimeout(timerInputSaldoKodeFile);
        timerInputSaldoKodeFile = setTimeout(() => refreshSaldoBerdasarkanKodeFile(true), 220);
    });
    filterSaldoKodeFile?.addEventListener('change', () => {
        clearTimeout(timerInputSaldoKodeFile);
        refreshSaldoBerdasarkanKodeFile(true);
    });
    filterSaldoKodeFile?.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        clearTimeout(timerInputSaldoKodeFile);
        refreshSaldoBerdasarkanKodeFile(true);
    });
    btnResetSaldoKodeFile?.addEventListener('click', resetKodeFileSaldo);
    filterRabKodeFile?.addEventListener('input', () => {
        clearTimeout(timerInputRabKodeFile);
        timerInputRabKodeFile = setTimeout(refreshRabBerdasarkanKodeFile, 220);
    });
    filterRabKodeFile?.addEventListener('change', () => {
        clearTimeout(timerInputRabKodeFile);
        refreshRabBerdasarkanKodeFile();
    });
    filterRabKodeFile?.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        clearTimeout(timerInputRabKodeFile);
        refreshRabBerdasarkanKodeFile();
    });
    btnResetRabKodeFile?.addEventListener('click', resetKodeFileRab);
    filterRekapKodeFile?.addEventListener('input', () => {
        clearTimeout(timerInputRekapKodeFile);
        timerInputRekapKodeFile = setTimeout(refreshRekapBerdasarkanKodeFile, 220);
    });
    filterRekapKodeFile?.addEventListener('change', () => {
        clearTimeout(timerInputRekapKodeFile);
        refreshRekapBerdasarkanKodeFile();
    });
    btnResetRekapKodeFile?.addEventListener('click', resetKodeFileRekap);
    filterRekapKodeFile?.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        clearTimeout(timerInputRekapKodeFile);
        refreshRekapBerdasarkanKodeFile();
    });
    btnTambahRabAnggaran?.addEventListener('click', () => {
        rabEditId = null;
        rabDraftAfter = '__top__';
        renderTabelRabAnggaran();
    });
    btnBuatRiRab?.addEventListener('click', buatRiDariRabTerpilih);
    checkAllRabAnggaran?.addEventListener('change', event => {
        const checked = event.target.checked;
        dataRabTampil().forEach(row => {
            const rowId = String(row.id_rab || '');
            if (!rowId || !rabDapatDipilihUntukRi(row)) return;
            if (checked) rabTerpilih.add(rowId);
            else rabTerpilih.delete(rowId);
        });
        renderTabelRabAnggaran();
    });
    filterRencanaAnggaranKodeFile?.addEventListener('change', () => refreshSaldoBerdasarkanKodeFile(true));
    filterRealisasiRiKodeFile?.addEventListener('change', () => {
        refreshSaldoBerdasarkanKodeFile(true);
    });
    bodyTabelRabAnggaran?.addEventListener('input', event => {
        if (!event.target.closest('[data-rab-field="harga_satuan"], [data-rab-field="volume"]')) return;
        updatePreviewTotalRab(event.target.closest('tr'));
    });
    bodyTabelRabAnggaran?.addEventListener('change', event => {
        const select = event.target.closest('[data-rab-select]');
        if (!select) return;
        const rowId = String(select.dataset.rabSelect || '');
        if (!rowId) return;
        if (select.checked) rabTerpilih.add(rowId);
        else rabTerpilih.delete(rowId);
        updateKontrolPilihanRab();
    });
    bodyTabelRabAnggaran?.addEventListener('click', event => {
        const resetFilterBtn = event.target.closest('[data-rab-reset-filter]');
        if (resetFilterBtn) {
            resetKodeFileRab();
            return;
        }
        const cancelBtn = event.target.closest('[data-rab-cancel]');
        if (cancelBtn) {
            rabDraftAfter = null;
            rabEditId = null;
            renderTabelRabAnggaran();
            return;
        }
        const saveBtn = event.target.closest('[data-rab-save]');
        if (saveBtn) {
            simpanDraftRabAnggaran(saveBtn.closest('tr'));
        }
    });
    bodyTabelRealisasiRiInvoice?.addEventListener('click', event => {
        const addBtn = event.target.closest('[data-ri-add-after]');
        if (addBtn) {
            if (!kodeFileSaldoAktif()) {
                alert('Pilih Kode File terlebih dahulu.');
                return;
            }
            realisasiRiDraftPrefill = null;
            realisasiRiDraftAfter = addBtn.dataset.riAddAfter || '__empty__';
            terapkanFilterRealisasiRiInvoice();
            return;
        }
        const cancelBtn = event.target.closest('[data-ri-cancel]');
        if (cancelBtn) {
            realisasiRiDraftAfter = null;
            realisasiRiDraftPrefill = null;
            terapkanFilterRealisasiRiInvoice();
            return;
        }
        const saveBtn = event.target.closest('[data-ri-save]');
        if (saveBtn) {
            const rowEl = saveBtn.closest('tr');
            if (rowEl) simpanDraftRealisasiRiInvoice(rowEl);
        }
    });

    filterRealisasiCari.addEventListener('input', terapkanFilterRealisasi);
    btnResetFilterRealisasi.addEventListener('click', () => {
        filterRealisasiCari.value = '';
        colFilterRealisasi.clearAll();
        terapkanFilterRealisasi();
    });
    btnRekapVersiDefinitif?.addEventListener('click', () => {
        setModeRekapRealisasi('definitif');
        colFilterRealisasi.clearAll();
        terapkanFilterRealisasi();
    });
    btnRekapVersiProyektif?.addEventListener('click', () => {
        setModeRekapRealisasi('proyektif');
        colFilterRealisasi.clearAll();
        terapkanFilterRealisasi();
    });
    const colFilterRealisasi = makeColFilter('sectionRealisasi', () => dataRekapRealisasiAktif(), terapkanFilterRealisasi, '#panelRealisasiAnggaran');
    colFilterRealisasi.initBtns();
    updateLabelRekapRealisasi();

    // ---- FITUR SISA ANGGARAN ----
    const bodyTabelSisaAnggaran = document.getElementById('bodyTabelSisaAnggaran');
    const filterSisaAnggaranCari = document.getElementById('filterSisaAnggaranCari');
    const btnResetFilterSisaAnggaran = document.getElementById('btnResetFilterSisaAnggaran');
    const infoHasilSisaAnggaran = document.getElementById('infoHasilSisaAnggaran');
    const statSisaAnggaranTotal = document.getElementById('statSisaAnggaranTotal');
    const statSisaAnggaranKontrak = document.getElementById('statSisaAnggaranKontrak');
    const statSisaAnggaranNilai = document.getElementById('statSisaAnggaranNilai');
    const statSisaAnggaranPenerimaan = document.getElementById('statSisaAnggaranPenerimaan');
    const statSisaAnggaranBelumDiterima = document.getElementById('statSisaAnggaranBelumDiterima');
    const statSisaAnggaranRealisasi = document.getElementById('statSisaAnggaranRealisasi');
    const statSisaAnggaranSerapan = document.getElementById('statSisaAnggaranSerapan');
    const neracaKeuanganStatus = document.getElementById('neracaKeuanganStatus');
    const neracaKeuanganKas = document.getElementById('neracaKeuanganKas');
    const neracaKeuanganPiutang = document.getElementById('neracaKeuanganPiutang');
    const neracaKeuanganUangMuka = document.getElementById('neracaKeuanganUangMuka');
    const neracaKeuanganAsetLancarLainnya = document.getElementById('neracaKeuanganAsetLancarLainnya');
    const neracaKeuanganTotalAsetLancar = document.getElementById('neracaKeuanganTotalAsetLancar');
    const neracaKeuanganAsetTetap = document.getElementById('neracaKeuanganAsetTetap');
    const neracaKeuanganAkumulasiPenyusutan = document.getElementById('neracaKeuanganAkumulasiPenyusutan');
    const neracaKeuanganAsetTidakLancarLainnya = document.getElementById('neracaKeuanganAsetTidakLancarLainnya');
    const neracaKeuanganTotalAsetTidakLancar = document.getElementById('neracaKeuanganTotalAsetTidakLancar');
    const neracaKeuanganTotalAset = document.getElementById('neracaKeuanganTotalAset');
    const neracaKeuanganUtangUsaha = document.getElementById('neracaKeuanganUtangUsaha');
    const neracaKeuanganBebanAkrual = document.getElementById('neracaKeuanganBebanAkrual');
    const neracaKeuanganPenerimaanDimuka = document.getElementById('neracaKeuanganPenerimaanDimuka');
    const neracaKeuanganDefisitPendanaan = document.getElementById('neracaKeuanganDefisitPendanaan');
    const neracaKeuanganTotalKewajibanLancar = document.getElementById('neracaKeuanganTotalKewajibanLancar');
    const neracaKeuanganUtangJangkaPanjang = document.getElementById('neracaKeuanganUtangJangkaPanjang');
    const neracaKeuanganKewajibanTidakLancarLainnya = document.getElementById('neracaKeuanganKewajibanTidakLancarLainnya');
    const neracaKeuanganTotalKewajibanTidakLancar = document.getElementById('neracaKeuanganTotalKewajibanTidakLancar');
    const neracaKeuanganTotalKewajiban = document.getElementById('neracaKeuanganTotalKewajiban');
    const neracaKeuanganDanaTerikat = document.getElementById('neracaKeuanganDanaTerikat');
    const neracaKeuanganSurplusManajerial = document.getElementById('neracaKeuanganSurplusManajerial');
    const neracaKeuanganPenyesuaianDana = document.getElementById('neracaKeuanganPenyesuaianDana');
    const neracaKeuanganTotalPosisiDana = document.getElementById('neracaKeuanganTotalPosisiDana');
    const neracaKeuanganTotalPasiva = document.getElementById('neracaKeuanganTotalPasiva');
    const neracaKeuanganPersamaan = document.getElementById('neracaKeuanganPersamaan');
    const neracaKeuanganNilaiKontrak = document.getElementById('neracaKeuanganNilaiKontrak');
    const neracaKeuanganRealisasiAnggaran = document.getElementById('neracaKeuanganRealisasiAnggaran');
    const panelDetailNeracaAtas = document.getElementById('panelDetailNeracaAtas');
    const panelDetailNeracaBawah = document.getElementById('panelDetailNeracaBawah');
    const bodyDetailNeracaAtas = document.getElementById('bodyDetailNeracaAtas');
    const bodyDetailNeracaBawah = document.getElementById('bodyDetailNeracaBawah');
    const neracaDetailCards = Array.from(document.querySelectorAll('[data-neraca-detail]'));
    let allDetailPenerimaanRows = [];
    let allDetailRealisasiAnggaranRows = [];
    let allDetailSisaAnggaranRows = [];
    let allDetailBelumDiterimaRows = [];
    let activeDetailBelumDiterimaFilter = '';
    let detailBelumDiterimaPeriode = { awal: '', akhir: '' };
    let activeNeracaDetailType = '';
    let currentSisaAnggaranSummary = {};

    const detailNeracaConfig = {
        penerimaan: {
            panel: 'top',
            anchor: 2,
            tooltip: 'Daftar kontrak yang sudah memiliki realisasi penerimaan dari mitra.'
        },
        belum: {
            panel: 'top',
            anchor: 3,
            tooltip: 'Rencana penerimaan yang belum terealisasi, termasuk yang akan diterima pada tanggal mendatang.'
        },
        realisasi: {
            panel: 'bottom',
            anchor: 1,
            tooltip: 'Daftar kontrak yang sudah memiliki realisasi anggaran atau belanja tercatat.'
        },
        sisa: {
            panel: 'bottom',
            anchor: 2,
            tooltip: 'Sisa anggaran dari penerimaan yang sudah masuk pada setiap kontrak.'
        }
    };

    function setStatementMoney(el, value) {
        if (!el) return;
        el.textContent = formatRupiahPenuh(value);
        el.classList.toggle('is-negative', Number(value) < 0);
    }

    function renderNeracaKeuangan(summary = {}) {
        const nilaiKontrak = Number(summary.total_nilai_kontrak) || 0;
        const realisasiPenerimaan = Number(summary.total_realisasi_pendapatan) || 0;
        const realisasiAnggaran = Number(summary.total_realisasi_anggaran) || 0;
        const saldoKas = Number(summary.total_sisa_anggaran) || (realisasiPenerimaan - realisasiAnggaran);
        const kas = Math.max(0, saldoKas);
        const piutangKontrak = Number(summary.total_belum_diterima) || Math.max(0, nilaiKontrak - realisasiPenerimaan);
        const uangMuka = 0;
        const asetLancarLainnya = 0;
        const totalAsetLancar = kas + piutangKontrak + uangMuka + asetLancarLainnya;
        const asetTetap = 0;
        const akumulasiPenyusutan = 0;
        const asetTidakLancarLainnya = 0;
        const totalAsetTidakLancar = asetTetap - akumulasiPenyusutan + asetTidakLancarLainnya;
        const totalAset = totalAsetLancar + totalAsetTidakLancar;

        const utangUsaha = 0;
        const bebanAkrual = 0;
        const penerimaanDimuka = 0;
        const defisitPendanaan = Math.max(0, -saldoKas);
        const totalKewajibanLancar = utangUsaha + bebanAkrual + penerimaanDimuka + defisitPendanaan;
        const utangJangkaPanjang = 0;
        const kewajibanTidakLancarLainnya = 0;
        const totalKewajibanTidakLancar = utangJangkaPanjang + kewajibanTidakLancarLainnya;
        const totalKewajiban = totalKewajibanLancar + totalKewajibanTidakLancar;

        const danaTerikat = 0;
        const penyesuaianDana = 0;
        const surplusManajerial = totalAset - totalKewajiban - danaTerikat - penyesuaianDana;
        const totalPosisiDana = danaTerikat + surplusManajerial + penyesuaianDana;
        const totalPasiva = totalKewajiban + totalPosisiDana;
        const selisih = totalAset - totalPasiva;

        setStatementMoney(neracaKeuanganKas, kas);
        setStatementMoney(neracaKeuanganPiutang, piutangKontrak);
        setStatementMoney(neracaKeuanganUangMuka, uangMuka);
        setStatementMoney(neracaKeuanganAsetLancarLainnya, asetLancarLainnya);
        setStatementMoney(neracaKeuanganTotalAsetLancar, totalAsetLancar);
        setStatementMoney(neracaKeuanganAsetTetap, asetTetap);
        setStatementMoney(neracaKeuanganAkumulasiPenyusutan, akumulasiPenyusutan);
        setStatementMoney(neracaKeuanganAsetTidakLancarLainnya, asetTidakLancarLainnya);
        setStatementMoney(neracaKeuanganTotalAsetTidakLancar, totalAsetTidakLancar);
        setStatementMoney(neracaKeuanganTotalAset, totalAset);
        setStatementMoney(neracaKeuanganUtangUsaha, utangUsaha);
        setStatementMoney(neracaKeuanganBebanAkrual, bebanAkrual);
        setStatementMoney(neracaKeuanganPenerimaanDimuka, penerimaanDimuka);
        setStatementMoney(neracaKeuanganDefisitPendanaan, defisitPendanaan);
        setStatementMoney(neracaKeuanganTotalKewajibanLancar, totalKewajibanLancar);
        setStatementMoney(neracaKeuanganUtangJangkaPanjang, utangJangkaPanjang);
        setStatementMoney(neracaKeuanganKewajibanTidakLancarLainnya, kewajibanTidakLancarLainnya);
        setStatementMoney(neracaKeuanganTotalKewajibanTidakLancar, totalKewajibanTidakLancar);
        setStatementMoney(neracaKeuanganTotalKewajiban, totalKewajiban);
        setStatementMoney(neracaKeuanganDanaTerikat, danaTerikat);
        setStatementMoney(neracaKeuanganSurplusManajerial, surplusManajerial);
        setStatementMoney(neracaKeuanganPenyesuaianDana, penyesuaianDana);
        setStatementMoney(neracaKeuanganTotalPosisiDana, totalPosisiDana);
        setStatementMoney(neracaKeuanganTotalPasiva, totalPasiva);
        setStatementMoney(neracaKeuanganNilaiKontrak, nilaiKontrak);
        setStatementMoney(neracaKeuanganRealisasiAnggaran, realisasiAnggaran);

        const seimbang = Math.abs(selisih) < 1;
        setText(neracaKeuanganStatus, seimbang ? 'Seimbang' : 'Selisih');
        neracaKeuanganStatus?.classList.toggle('is-warning', !seimbang);
        setText(
            neracaKeuanganPersamaan,
            seimbang
                ? 'Aset = Kewajiban + Posisi Dana'
                : `Selisih neraca ${formatRupiahPenuh(selisih)}`
        );
    }

    function renderSisaAnggaranSummary(summary = {}) {
        currentSisaAnggaranSummary = summary;
        setText(statSisaAnggaranTotal, summary.total_sisa_anggaran_display || 'Rp 0');
        setText(statSisaAnggaranKontrak, `${summary.jumlah_kontrak_display || '0'} kontrak`);
        setText(statSisaAnggaranNilai, summary.total_nilai_kontrak_display || 'Rp 0');
        setText(statSisaAnggaranPenerimaan, summary.total_realisasi_pendapatan_display || 'Rp 0');
        setText(statSisaAnggaranBelumDiterima, summary.total_belum_diterima_display || 'Rp 0');
        setText(statSisaAnggaranRealisasi, summary.total_realisasi_anggaran_display || 'Rp 0');
        setText(statSisaAnggaranSerapan, summary.persentase_serapan_display || '0%');
        renderNeracaKeuangan(summary);
    }

    function getNeracaPanel(key) {
        return key === 'bottom'
            ? { panel: panelDetailNeracaBawah, body: bodyDetailNeracaBawah }
            : { panel: panelDetailNeracaAtas, body: bodyDetailNeracaAtas };
    }

    function prepareNeracaPanel(type) {
        const config = detailNeracaConfig[type];
        const target = getNeracaPanel(config.panel);
        target.panel?.classList.remove('is-anchor-1', 'is-anchor-2', 'is-anchor-3');
        target.panel?.classList.add(`is-anchor-${config.anchor}`);
        if (target.panel) target.panel.dataset.detailType = type;
        return target;
    }

    function closeNeracaDetailPanels() {
        [panelDetailNeracaAtas, panelDetailNeracaBawah].forEach(panel => {
            if (panel) {
                panel.hidden = true;
                delete panel.dataset.detailType;
            }
        });
        neracaDetailCards.forEach(card => {
            card.classList.remove('is-expanded');
            card.setAttribute('aria-expanded', 'false');
        });
        activeNeracaDetailType = '';
    }

    function renderDetailPenerimaanTable() {
        const data = [...allDetailPenerimaanRows];
        const tableRows = data.length === 0
            ? tableState(6, 'empty', 'Belum ada realisasi penerimaan', 'Belum ada data penerimaan aktual yang tercatat.')
            : data.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td><span class="kode-file-tag">${esc(item.kode_file || item.id_program || '-')}</span></td>
                    <td class="td-truncate"><strong>${esc(item.nama_mitra || '-')}</strong></td>
                    <td class="td-truncate">${esc(item.judul_pks || '-')}</td>
                    <td>${esc(item.tgl_penerimaan || 'N/A')}</td>
                    <td>${esc(item.nominal_display || 'Rp 0')}</td>
                </tr>
            `).join('');
        return `
            <div class="table-container table-container--compact neraca-detail-table">
                <table>
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Kode File</th>
                            <th>Mitra</th>
                            <th>Judul PKS</th>
                            <th>Tgl. Penerimaan</th>
                            <th>Nominal Penerimaan</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `;
    }

    function renderDetailRealisasiAnggaranTable() {
        const data = [...allDetailRealisasiAnggaranRows];
        const tableRows = data.length === 0
            ? tableState(7, 'empty', 'Belum ada realisasi anggaran', 'Belum ada data realisasi anggaran yang tercatat.')
            : data.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td><span class="kode-file-tag">${esc(item.kode_file || item.id_program || '-')}</span></td>
                    <td class="td-truncate"><strong>${esc(item.nama_mitra || '-')}</strong></td>
                    <td class="td-truncate">${esc(item.judul_pks || '-')}</td>
                    <td>${esc(item.kategori || '-')}</td>
                    <td>${esc(item.tgl_realisasi || 'N/A')}</td>
                    <td>${esc(item.nominal_display || 'Rp 0')}</td>
                </tr>
            `).join('');
        return `
            <div class="table-container table-container--compact neraca-detail-table">
                <table>
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Kode File</th>
                            <th>Mitra</th>
                            <th>Judul PKS</th>
                            <th>Kategori</th>
                            <th>Tgl. Realisasi</th>
                            <th>Nominal Realisasi</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `;
    }

    function renderDetailSisaAnggaranTable() {
        const data = colFilterDetailSisaAnggaran
            ? colFilterDetailSisaAnggaran.applyTo([...allDetailSisaAnggaranRows])
            : [...allDetailSisaAnggaranRows];
        const totalDapatDialokasikan = data
            .filter(item => item.status_sisa_anggaran === 'Dapat Dialokasikan')
            .reduce((sum, item) => sum + (Number(item.sisa_anggaran) || 0), 0);
        const jumlahAdaSisa = data.filter(item => item.status_sisa_anggaran === 'Dapat Dialokasikan').length;
        const totalPerluHitungUlang = data
            .filter(item => item.status_sisa_anggaran === 'Perlu Dihitung Kembali')
            .reduce((sum, item) => sum + (Number(item.sisa_anggaran) || 0), 0);
        const jumlahPerluHitungUlang = data.filter(item => item.status_sisa_anggaran === 'Perlu Dihitung Kembali').length;
        const tableRows = data.length === 0
            ? tableState(8, 'empty', 'Belum ada sisa anggaran', 'Belum ada kontrak yang memiliki realisasi penerimaan tercatat.')
            : data.map((item, index) => {
                const sisa = Number(item.sisa_anggaran) || 0;
                const sisaClass = sisa < 0 ? 'realisasi-sisa-negative' : '';
                const statusLabel = item.status_sisa_anggaran || (sisa < 0 ? 'Defisit' : sisa > 0 ? 'Dapat Dialokasikan' : 'Terserap');
                const statusClass = {
                    'Dapat Dialokasikan': 'badge-sisa-aman',
                    'Perlu Dihitung Kembali': 'badge-sisa-review',
                    'Defisit': 'badge-sisa-defisit',
                    'Terserap': 'badge-realisasi-default'
                }[statusLabel] || 'badge-realisasi-default';
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td><span class="kode-file-tag">${esc(item.kode_file || item.id_program || '-')}</span></td>
                        <td class="td-truncate"><strong>${esc(item.nama_mitra || '-')}</strong></td>
                        <td class="td-truncate">${esc(item.judul_pks || '-')}</td>
                        <td>${esc(item.total_realisasi_pendapatan_display || 'Rp 0')}</td>
                        <td>${esc(item.total_realisasi_anggaran_display || 'Rp 0')}</td>
                        <td class="${sisaClass}">${esc(item.sisa_anggaran_display || 'Rp 0')}</td>
                        <td><span class="badge ${statusClass}">${esc(statusLabel)}</span></td>
                    </tr>
                `;
            }).join('');
        return `
            <div class="neraca-detail-summary">
                <article>
                    <span>Dapat dialokasikan</span>
                    <strong>${formatRupiahPenuh(totalDapatDialokasikan)}</strong>
                    <small>Sisa positif dari dana yang sudah diterima</small>
                </article>
                <article>
                    <span>Jumlah Kontrak Bersisa</span>
                    <strong>${jumlahAdaSisa.toLocaleString('id-ID')}</strong>
                    <small>Kontrak berjalan dengan sisa positif</small>
                </article>
                <article>
                    <span>Perlu Dihitung Kembali</span>
                    <strong>${formatRupiahPenuh(totalPerluHitungUlang)}</strong>
                    <small>${jumlahPerluHitungUlang.toLocaleString('id-ID')} kontrak berakhir</small>
                </article>
            </div>
            <div class="table-container table-container--compact neraca-detail-table">
                <table>
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th data-col="kode_file">Kode File</th>
                            <th data-col="nama_mitra">Mitra</th>
                            <th data-col="judul_pks">Judul PKS</th>
                            <th data-col="total_realisasi_pendapatan_display">Realisasi Penerimaan</th>
                            <th data-col="total_realisasi_anggaran_display">Realisasi Anggaran</th>
                            <th data-col="sisa_anggaran_display">Sisa Anggaran</th>
                            <th data-col="status_sisa_anggaran">Status</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `;
    }

    function renderGenericNeracaTable(type) {
        if (type === 'penerimaan') return renderDetailPenerimaanTable();
        if (type === 'realisasi') return renderDetailRealisasiAnggaranTable();
        if (type === 'sisa') return renderDetailSisaAnggaranTable();
        return '';
    }

    function parseTanggalInputNeraca(value) {
        const date = parseDate(String(value || '').trim());
        if (!date) return null;
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function getDetailBelumDiterimaTerfilter(status = activeDetailBelumDiterimaFilter) {
        let data = status
            ? allDetailBelumDiterimaRows.filter(item => item.status_detail === status)
            : [...allDetailBelumDiterimaRows];
        if (status !== 'Akan Diterima') return data;

        const awal = parseTanggalInputNeraca(detailBelumDiterimaPeriode.awal);
        const akhir = parseTanggalInputNeraca(detailBelumDiterimaPeriode.akhir);
        if (!awal && !akhir) return data;

        return data.filter(item => {
            const tanggal = parseTanggalInputNeraca(item.rencana_pembayaran_input || item.rencana_pembayaran);
            if (!tanggal) return false;
            if (awal && tanggal < awal) return false;
            if (akhir && tanggal > akhir) return false;
            return true;
        });
    }

    function renderFilterPeriodeAkanDiterima() {
        if (activeDetailBelumDiterimaFilter !== 'Akan Diterima') return '';
        const data = getDetailBelumDiterimaTerfilter('Akan Diterima');
        const total = data.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
        const jumlah = data.length.toLocaleString('id-ID');
        return `
            <div class="neraca-period-filter" aria-label="Filter periode penerimaan akan masuk">
                <div>
                    <span>Periode akan masuk</span>
                    <strong>${formatRupiahKomaDash(total)}</strong>
                    <small>${jumlah} item sesuai rentang tanggal</small>
                </div>
                <label>
                    <span>Awal</span>
                    <input type="date" id="belumDiterimaPeriodeAwal" class="form-input" value="${esc(detailBelumDiterimaPeriode.awal)}">
                </label>
                <label>
                    <span>Akhir</span>
                    <input type="date" id="belumDiterimaPeriodeAkhir" class="form-input" value="${esc(detailBelumDiterimaPeriode.akhir)}">
                </label>
            </div>
        `;
    }

    function renderBelumDiterimaBody() {
        const summary = currentSisaAnggaranSummary.detail_belum_diterima?.summary || {};
        return `
            <div class="neraca-detail-summary">
                <article class="neraca-detail-filter-card" data-belum-diterima-filter="Akan Diterima" role="button" tabindex="0" aria-pressed="false" title="Tampilkan hanya yang akan diterima">
                    <span>Akan diterima</span>
                    <strong>${esc(summary.total_akan_diterima_display || 'Rp 0')}</strong>
                    <small>${esc(summary.jumlah_akan_diterima_display || '0')} item</small>
                </article>
                <article class="neraca-detail-filter-card" data-belum-diterima-filter="Lewat Rencana" role="button" tabindex="0" aria-pressed="false" title="Tampilkan hanya yang lewat rencana">
                    <span>Lewat rencana</span>
                    <strong>${esc(summary.total_lewat_rencana_display || 'Rp 0')}</strong>
                    <small>${esc(summary.jumlah_lewat_rencana_display || '0')} item</small>
                </article>
                <article class="neraca-detail-filter-card" data-belum-diterima-filter="Belum Terjadwal" role="button" tabindex="0" aria-pressed="false" title="Tampilkan hanya yang belum terjadwal">
                    <span>Belum terjadwal</span>
                    <strong>${esc(summary.total_belum_terjadwal_display || 'Rp 0')}</strong>
                    <small>${esc(summary.jumlah_belum_terjadwal_display || '0')} item</small>
                </article>
            </div>
            ${renderFilterPeriodeAkanDiterima()}
            <div class="table-container table-container--compact neraca-detail-table">
                <table>
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Kode File</th>
                            <th>Mitra</th>
                            <th>Judul PKS</th>
                            <th>Tahap</th>
                            <th>Rencana Pembayaran</th>
                            <th>Nominal</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="bodyTabelBelumDiterimaNeraca"></tbody>
                </table>
            </div>
        `;
    }

    function toggleDetailBelumDiterima(forceOpen) {
        toggleNeracaDetail('belum', forceOpen);
    }

    function setActiveFilterBelumDiterima(status = '') {
        activeDetailBelumDiterimaFilter = status;
        document.querySelectorAll('[data-belum-diterima-filter]').forEach(card => {
            const isActive = card.dataset.belumDiterimaFilter === status;
            card.classList.toggle('is-active', isActive);
            card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function renderTabelDetailBelumDiterima(status = activeDetailBelumDiterimaFilter) {
        const bodyTabelBelumDiterimaNeraca = document.getElementById('bodyTabelBelumDiterimaNeraca');
        if (!bodyTabelBelumDiterimaNeraca) return;
        const data = getDetailBelumDiterimaTerfilter(status);
        if (data.length === 0) {
            const emptyTitle = status ? `Tidak ada data ${status.toLowerCase()}` : 'Tidak ada detail belum diterima';
            const emptyMessage = status === 'Akan Diterima'
                ? 'Tidak ada rencana penerimaan yang akan masuk pada periode yang dipilih.'
                : status
                ? 'Kategori ini belum memiliki rencana penerimaan yang belum terealisasi.'
                : 'Semua rencana penerimaan sudah terealisasi atau belum ada rencana penerimaan.';
            bodyTabelBelumDiterimaNeraca.innerHTML = tableState(8, 'empty', emptyTitle, emptyMessage);
            return;
        }

        const badgeClass = {
            'Akan Diterima': 'badge-rencana-ok',
            'Lewat Rencana': 'badge-rencana-warning',
            'Belum Terjadwal': 'badge-realisasi-default'
        };
        bodyTabelBelumDiterimaNeraca.innerHTML = data.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><span class="kode-file-tag">${esc(item.kode_file || '-')}</span></td>
                <td class="td-truncate"><strong>${esc(item.nama_mitra || '-')}</strong></td>
                <td class="td-truncate">${esc(item.judul_pks || '-')}</td>
                <td>${esc(item.tahap || '-')}</td>
                <td>${esc(item.rencana_pembayaran || 'N/A')}</td>
                <td>${esc(item.nominal_display || 'Rp 0')}</td>
                <td><span class="badge ${badgeClass[item.status_detail] || 'badge-realisasi-default'}">${esc(item.status_detail || '-')}</span></td>
            </tr>
        `).join('');
    }

    function renderDetailBelumDiterima(detail = {}) {
        allDetailBelumDiterimaRows = Array.isArray(detail.data) ? detail.data : [];
        setActiveFilterBelumDiterima('');
        if (activeNeracaDetailType === 'belum') renderNeracaDetail('belum');
    }

    function renderDetailPenerimaan(detail = {}) {
        allDetailPenerimaanRows = Array.isArray(detail.data) ? detail.data : [];
        if (activeNeracaDetailType === 'penerimaan') renderNeracaDetail('penerimaan');
    }

    function renderDetailRealisasiAnggaran(detail = {}) {
        allDetailRealisasiAnggaranRows = Array.isArray(detail.data) ? detail.data : [];
        if (activeNeracaDetailType === 'realisasi') renderNeracaDetail('realisasi');
    }

    function renderDetailSisaAnggaran(rows = []) {
        allDetailSisaAnggaranRows = (Array.isArray(rows) ? rows : [])
            .filter(item => Number(item.total_realisasi_pendapatan) > 0)
            .map(item => {
                const sisa = Number(item.sisa_anggaran) || 0;
                const kontrakBerakhir = item.status_kontrak === 'Berakhir';
                let statusSisa = 'Terserap';
                if (sisa < 0) statusSisa = 'Defisit';
                else if (sisa > 0 && kontrakBerakhir) statusSisa = 'Perlu Dihitung Kembali';
                else if (sisa > 0) statusSisa = 'Dapat Dialokasikan';
                return {
                    ...item,
                    status_sisa_anggaran: statusSisa
                };
            })
            .sort((a, b) => {
                const byKodeYear = urutKodeFileTahunTerbaru(a, b);
                if (byKodeYear !== 0) return byKodeYear;
                return (Number(b.sisa_anggaran) || 0) - (Number(a.sisa_anggaran) || 0);
            });
        if (activeNeracaDetailType === 'sisa') renderNeracaDetail('sisa');
    }

    function renderNeracaDetail(type) {
        const config = detailNeracaConfig[type];
        if (!config) return null;
        const target = prepareNeracaPanel(type);
        if (!target.body) return null;
        target.body.innerHTML = type === 'belum'
            ? renderBelumDiterimaBody()
            : renderGenericNeracaTable(type);
        if (type === 'belum') {
            setActiveFilterBelumDiterima(activeDetailBelumDiterimaFilter);
            renderTabelDetailBelumDiterima();
        }
        if (type === 'sisa') {
            colFilterDetailSisaAnggaran?.initBtns();
        }
        return target.panel;
    }

    function toggleNeracaDetail(type, forceOpen) {
        const config = detailNeracaConfig[type];
        if (!config) return;
        const card = document.querySelector(`[data-neraca-detail="${type}"]`);
        const target = getNeracaPanel(config.panel);
        const isOpen = activeNeracaDetailType === type && target.panel && !target.panel.hidden;
        const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;
        if (!shouldOpen) {
            closeNeracaDetailPanels();
            return;
        }
        closeNeracaDetailPanels();
        const panel = renderNeracaDetail(type);
        if (!panel) return;
        panel.hidden = false;
        card?.classList.add('is-expanded');
        card?.setAttribute('aria-expanded', 'true');
        activeNeracaDetailType = type;
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    function renderTabelSisaAnggaran(data) {
        bodyTabelSisaAnggaran.innerHTML = '';
        if (data.length === 0) {
            bodyTabelSisaAnggaran.innerHTML = tableState(12, 'empty', 'Tidak ada data neraca', 'Coba ubah filter atau pastikan data kontrak sudah tersedia.');
            return;
        }
        data.forEach((item, index) => {
            const kontrakBadgeClass = item.status_kontrak === 'Berjalan' ? 'badge-berjalan' : 'badge-berakhir';
            const sisaClass = Number(item.sisa_anggaran) < 0 ? 'realisasi-sisa-negative' : '';
            const serapan = Math.max(0, Math.min(100, Number(item.persentase_serapan) || 0));
            bodyTabelSisaAnggaran.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${index + 1}</td>
                    <td><span class="kode-file-tag">${esc(item.kode_file || item.id_program || '-')}</span></td>
                    <td class="td-truncate"><strong>${esc(item.nama_mitra || '-')}</strong></td>
                    <td class="td-truncate">${esc(item.judul_pks || '-')}</td>
                    <td>${esc(item.nilai_kontrak_display || 'Rp 0')}</td>
                    <td>${esc(item.total_realisasi_pendapatan_display || 'Rp 0')}</td>
                    <td>${esc(item.total_realisasi_anggaran_display || 'Rp 0')}</td>
                    <td class="${sisaClass}">${esc(item.sisa_anggaran_display || 'Rp 0')}</td>
                    <td>
                        <div class="budget-progress" title="${esc(item.persentase_serapan_display || '0%')}">
                            <span><i style="width:${serapan.toFixed(2)}%;"></i></span>
                            <strong>${esc(item.persentase_serapan_display || '0%')}</strong>
                        </div>
                    </td>
                    <td><span class="badge ${kontrakBadgeClass}">${esc(item.status_kontrak || '-')}</span></td>
                    <td>${esc(item.tgl_kontrak || '-')}</td>
                    <td>${esc(item.tgl_akhir_kontrak || '-')}</td>
                </tr>
            `);
        });
    }

    function terapkanFilterSisaAnggaran() {
        const cari = filterSisaAnggaranCari.value.toLowerCase().trim();
        const hasilSearch = allSisaAnggaranData.filter(item => {
            return cocokPencarianGlobal(item, cari);
        });
        const hasil = colFilterSisaAnggaran.applyTo(hasilSearch);
        renderTabelSisaAnggaran(hasil);
        const adaFilter = cari || Object.keys(colFilterSisaAnggaran.colFilters).length > 0;
        infoHasilSisaAnggaran.textContent = adaFilter ? `Menampilkan ${hasil.length} dari ${allSisaAnggaranData.length} kontrak` : '';
    }

    async function loadSisaAnggaran() {
        try {
            bodyTabelSisaAnggaran.innerHTML = tableState(12, 'loading', 'Memuat neraca', 'Menghitung posisi nilai kontrak dan realisasi anggaran.');
            const res = await fetch('/api/sisa-anggaran');
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.pesan || 'Gagal memuat neraca.');
            allSisaAnggaranData = [...(payload.data || [])]
                .sort(urutKodeFileTahunTerbaru)
                .map((item, index) => ({ ...item, no: index + 1 }));
            dataSisaAnggaranPlottingDimuat = true;
            pesanErrorDaftarPksPlotting = '';
            renderSisaAnggaranSummary(payload.summary || {});
            renderDetailSisaAnggaran(allSisaAnggaranData);
            renderDetailPenerimaan(payload.summary?.detail_penerimaan || {});
            renderDetailRealisasiAnggaran(payload.summary?.detail_realisasi_anggaran || {});
            renderDetailBelumDiterima(payload.summary?.detail_belum_diterima || {});
            colFilterSisaAnggaran.initBtns();
            terapkanFilterSisaAnggaran();
            if (activeNeracaDetailType) renderNeracaDetail(activeNeracaDetailType);
        } catch {
            allSisaAnggaranData = [];
            renderSisaAnggaranSummary({});
            renderDetailSisaAnggaran([]);
            renderDetailPenerimaan({});
            renderDetailRealisasiAnggaran({});
            renderDetailBelumDiterima({});
            closeNeracaDetailPanels();
            bodyTabelSisaAnggaran.innerHTML = tableState(12, 'error', 'Gagal memuat neraca', 'Periksa koneksi server atau coba kembali.');
        }
    }

    const colFilterSisaAnggaran = makeColFilter('sectionSisaAnggaran', () => allSisaAnggaranData, terapkanFilterSisaAnggaran, '#sectionSisaAnggaran .sisa-anggaran-table');
    colFilterSisaAnggaran.initBtns();
    const colFilterDetailSisaAnggaran = makeColFilter(
        'sectionPimpinan',
        () => allDetailSisaAnggaranRows,
        () => {
            if (activeNeracaDetailType === 'sisa') renderNeracaDetail('sisa');
        },
        '#panelDetailNeracaBawah .neraca-detail-table'
    );

    filterSisaAnggaranCari.addEventListener('input', terapkanFilterSisaAnggaran);
    btnResetFilterSisaAnggaran.addEventListener('click', () => {
        filterSisaAnggaranCari.value = '';
        colFilterSisaAnggaran.clearAll();
        terapkanFilterSisaAnggaran();
    });
    neracaDetailCards.forEach(card => {
        const type = card.dataset.neracaDetail;
        card.addEventListener('click', e => {
            if (e.target.closest('.info-tooltip')) return;
            toggleNeracaDetail(type);
        });
        card.addEventListener('keydown', e => {
            if (e.target.closest('.info-tooltip')) return;
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            toggleNeracaDetail(type);
        });
    });
    document.addEventListener('click', e => {
        const card = e.target.closest('[data-belum-diterima-filter]');
        if (!card || !card.closest('.sisa-anggaran-summary')) return;
        const status = card.dataset.belumDiterimaFilter || '';
        const nextStatus = activeDetailBelumDiterimaFilter === status ? '' : status;
        setActiveFilterBelumDiterima(nextStatus);
        renderTabelDetailBelumDiterima(nextStatus);
        toggleDetailBelumDiterima(true);
    });
    document.addEventListener('change', e => {
        if (!e.target.closest('#bodyDetailNeracaAtas')) return;
        if (e.target.id === 'belumDiterimaPeriodeAwal') {
            detailBelumDiterimaPeriode.awal = e.target.value || '';
            renderNeracaDetail('belum');
        }
        if (e.target.id === 'belumDiterimaPeriodeAkhir') {
            detailBelumDiterimaPeriode.akhir = e.target.value || '';
            renderNeracaDetail('belum');
        }
    });
    document.addEventListener('keydown', e => {
        const card = e.target.closest('[data-belum-diterima-filter]');
        if (!card || !card.closest('.sisa-anggaran-summary')) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        const status = card.dataset.belumDiterimaFilter || '';
        const nextStatus = activeDetailBelumDiterimaFilter === status ? '' : status;
        setActiveFilterBelumDiterima(nextStatus);
        renderTabelDetailBelumDiterima(nextStatus);
        toggleDetailBelumDiterima(true);
    });
    if (isPimpinan && sectionPimpinan?.classList.contains('active')) {
        loadSisaAnggaran();
    }

    // ---- FITUR MAHASISWA ----
    const bodyTabelMahasiswa = document.getElementById('bodyTabelMahasiswa');
    const filterMahasiswaCari = document.getElementById('filterMahasiswaCari');
    const infoHasilMahasiswa = document.getElementById('infoHasilMahasiswa');
    const btnResetFilterMahasiswa = document.getElementById('btnResetFilterMahasiswa');
    const selectProgramMahasiswa = document.getElementById('selectProgramMahasiswa');
    const importSelectKerma = document.getElementById('importSelectKerma');
    const formTambahMahasiswa = document.getElementById('formTambahMahasiswa');
    const formAlertMahasiswa = document.getElementById('formAlertMahasiswa');
    const tabManual = document.getElementById('tabManual');
    const tabImport = document.getElementById('tabImport');
    const panelManual = document.getElementById('panelManual');
    const panelImport = document.getElementById('panelImport');
    const fileImportMahasiswa = document.getElementById('fileImportMahasiswa');
    const btnProseImport = document.getElementById('btnProseImport');
    const importAlert = document.getElementById('importAlert');

    const statusBadge = { 'Aktif': 'badge-berjalan', 'Undri': 'badge-undri', 'DO': 'badge-berakhir' };

    function renderTabelMahasiswa(data) {
        bodyTabelMahasiswa.innerHTML = '';
        updateSeleksiMahasiswa();
        if (data.length === 0) {
            bodyTabelMahasiswa.innerHTML = tableState(16, 'empty', 'Belum ada data mahasiswa', 'Tambahkan manual atau import Excel untuk mulai membangun roster program.');
            return;
        }
        data.forEach((item, i) => {
            const cls = statusBadge[item.status] || 'badge-berakhir';
            bodyTabelMahasiswa.insertAdjacentHTML('beforeend', `
                <tr>
                    <td style="text-align:center;">
                        <input type="checkbox" class="chk-mahasiswa"
                            data-id-program="${esc(item.id_program)}"
                            data-nim="${esc(item.nim)}">
                    </td>
                    <td>${i + 1}</td>
                    <td><span class="kode-file-tag">${esc(item.id_program)}</span></td>
                    <td class="td-truncate"><strong>${esc(item.nama)}</strong></td>
                    <td>${esc(item.nim)}</td>
                    <td>${esc(item.fakultas)}</td>
                    <td>${esc(item.prodi)}</td>
                    <td>${esc(item.tahun_masuk)}</td>
                    <td>${esc(item.semester_masuk)}</td>
                    <td><span class="badge ${cls}">${esc(item.status)}</span></td>
                    <td style="text-align:right;">${esc(item.sks_lulus)}</td>
                    <td style="text-align:right;">${esc(item.ipk)}</td>
                    <td class="td-truncate">${esc(item.dosen_wali)}</td>
                    <td class="td-truncate">${esc(item.pembimbing_1)}</td>
                    <td class="td-truncate">${esc(item.pembimbing_2)}</td>
                    <td style="white-space:nowrap;">
                        <button class="btn-edit-mahasiswa"
                            data-id-program="${esc(item.id_program)}"
                            data-nim="${esc(item.nim)}">✏ Edit</button>
                        <button class="btn-hapus-mahasiswa"
                            data-id-program="${esc(item.id_program)}"
                            data-nim="${esc(item.nim)}"
                            data-nama="${esc(item.nama)}">🗑 Hapus</button>
                    </td>
                </tr>
            `);
        });
    }

    const chkSelectAllMahasiswa    = document.getElementById('chkSelectAllMahasiswa');
    const btnHapusTerpilih         = document.getElementById('btnHapusTerpilihMahasiswa');
    const jumlahTerpilihEl         = document.getElementById('jumlahTerpilihMahasiswa');

    function updateSeleksiMahasiswa() {
        const semua  = bodyTabelMahasiswa.querySelectorAll('.chk-mahasiswa');
        const pilih  = bodyTabelMahasiswa.querySelectorAll('.chk-mahasiswa:checked');
        chkSelectAllMahasiswa.checked       = semua.length > 0 && pilih.length === semua.length;
        chkSelectAllMahasiswa.indeterminate = pilih.length > 0 && pilih.length < semua.length;
        jumlahTerpilihEl.textContent = pilih.length;
        btnHapusTerpilih.disabled    = pilih.length === 0;
    }

    chkSelectAllMahasiswa.addEventListener('change', () => {
        bodyTabelMahasiswa.querySelectorAll('.chk-mahasiswa')
            .forEach(chk => { chk.checked = chkSelectAllMahasiswa.checked; });
        updateSeleksiMahasiswa();
    });

    bodyTabelMahasiswa.addEventListener('change', e => {
        if (e.target.classList.contains('chk-mahasiswa')) updateSeleksiMahasiswa();
    });

    btnHapusTerpilih.addEventListener('click', async () => {
        const pilih = Array.from(bodyTabelMahasiswa.querySelectorAll('.chk-mahasiswa:checked'));
        if (pilih.length === 0) return;
        if (!confirm(`Hapus ${pilih.length} data mahasiswa yang dipilih?\nTindakan ini tidak dapat dibatalkan.`)) return;
        const daftar = pilih.map(chk => ({ id_program: chk.dataset.idProgram, nim: chk.dataset.nim }));
        try {
            const res = await fetch('/api/hapus-mahasiswa-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ daftar })
            });
            const hasil = await res.json();
            if (res.ok) await AmbilDataMahasiswaDanRender();
            else alert(hasil.pesan);
        } catch { alert('Gagal terhubung ke server.'); }
    });

    bodyTabelMahasiswa.addEventListener('click', async e => {
        const btnHapus = e.target.closest('.btn-hapus-mahasiswa');
        if (btnHapus) {
            const { idProgram, nim, nama } = btnHapus.dataset;
            if (!confirm(`Hapus data mahasiswa "${nama}" (${nim})?\nTindakan ini tidak dapat dibatalkan.`)) return;
            try {
                const res = await fetch('/api/hapus-mahasiswa', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_program: idProgram, nim })
                });
                const hasil = await res.json();
                if (res.ok) await AmbilDataMahasiswaDanRender();
                else alert(hasil.pesan);
            } catch { alert('Gagal terhubung ke server.'); }
        }

        const btnEdit = e.target.closest('.btn-edit-mahasiswa');
        if (btnEdit) {
            const item = allMahasiswaData.find(
                d => d.id_program === btnEdit.dataset.idProgram && d.nim === btnEdit.dataset.nim
            );
            if (item) bukaModalEditMahasiswa(item);
        }
    });

    function terapkanFilterMahasiswa() {
        const cari = filterMahasiswaCari.value.toLowerCase().trim();
        let hasil = allMahasiswaData.filter(item => cocokPencarianGlobal(item, cari));
        hasil = colFilterMhs.applyTo(hasil);
        renderTabelMahasiswa(hasil);
        const adaFilter = cari || Object.keys(colFilterMhs.colFilters).length > 0;
        infoHasilMahasiswa.textContent = adaFilter ? `Menampilkan ${hasil.length} dari ${allMahasiswaData.length} data` : '';
    }

    async function AmbilDataMahasiswaDanRender() {
        try {
            bodyTabelMahasiswa.innerHTML = tableState(16, 'loading', 'Memuat data mahasiswa', 'Mengambil roster mahasiswa lintas program.');
            const respon = await fetch('/api/daftar-mahasiswa');
            allMahasiswaData = await respon.json();
            terapkanFilterMahasiswa();
        } catch {
            bodyTabelMahasiswa.innerHTML = tableState(16, 'error', 'Gagal memuat data mahasiswa', 'Periksa koneksi server atau coba kembali beberapa saat lagi.');
        }
    }

    function populateKermaDropdowns() {
        const opts = allData.map(k => `<option value="${esc(k.id_program)}">${esc(k.id_program)} — ${esc(k.nama_mitra)}</option>`).join('');
        selectProgramMahasiswa.innerHTML = '<option value="">-- Pilih Program --</option>' + opts;
        importSelectKerma.innerHTML = '<option value="">-- Ambil dari file --</option>' + opts;
    }

    filterMahasiswaCari.addEventListener('input', terapkanFilterMahasiswa);
    btnResetFilterMahasiswa.addEventListener('click', () => {
        filterMahasiswaCari.value = '';
        colFilterMhs.clearAll();
        terapkanFilterMahasiswa();
    });

    const colFilterMhs = makeColFilter('sectionMahasiswa', () => allMahasiswaData, terapkanFilterMahasiswa);
    colFilterMhs.initBtns();

    // Tab switcher
    tabManual.addEventListener('click', () => {
        tabManual.classList.add('active'); tabImport.classList.remove('active');
        panelManual.style.display = ''; panelImport.style.display = 'none';
    });
    tabImport.addEventListener('click', () => {
        tabImport.classList.add('active'); tabManual.classList.remove('active');
        panelImport.style.display = ''; panelManual.style.display = 'none';
    });

    formTambahMahasiswa.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(formTambahMahasiswa).entries());
        formAlertMahasiswa.style.display = 'none';
        const btnSubmit = formTambahMahasiswa.querySelector('button[type="submit"]');
        btnSubmit.disabled = true; btnSubmit.textContent = 'Menyimpan...';
        try {
            const res = await fetch('/api/tambah-mahasiswa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const hasil = await res.json();
            if (res.ok) {
                formAlertMahasiswa.className = 'form-alert form-alert--success';
                formAlertMahasiswa.textContent = hasil.pesan;
                formAlertMahasiswa.style.display = 'inline-block';
                formTambahMahasiswa.reset();
                await AmbilDataMahasiswaDanRender();
            } else {
                formAlertMahasiswa.className = 'form-alert form-alert--error';
                formAlertMahasiswa.textContent = hasil.pesan;
                formAlertMahasiswa.style.display = 'inline-block';
            }
        } catch {
            formAlertMahasiswa.className = 'form-alert form-alert--error';
            formAlertMahasiswa.textContent = 'Gagal terhubung ke server.';
            formAlertMahasiswa.style.display = 'inline-block';
        } finally {
            btnSubmit.disabled = false; btnSubmit.textContent = 'Simpan Mahasiswa';
        }
    });

    btnProseImport.addEventListener('click', async () => {
        const file = fileImportMahasiswa.files[0];
        importAlert.style.display = 'none';
        if (!file) {
            importAlert.className = 'form-alert form-alert--error';
            importAlert.textContent = 'Pilih file Excel terlebih dahulu.';
            importAlert.style.display = 'block';
            return;
        }
        btnProseImport.disabled = true; btnProseImport.textContent = 'Memproses...';
        try {
            const fileBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const res = await fetch('/api/import-mahasiswa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileBase64, id_program_override: importSelectKerma.value || '' })
            });
            const hasil = await res.json();
            importAlert.className = res.ok ? 'form-alert form-alert--success' : 'form-alert form-alert--error';
            importAlert.textContent = hasil.pesan;
            importAlert.style.display = 'block';
            if (res.ok) { fileImportMahasiswa.value = ''; await AmbilDataMahasiswaDanRender(); }
        } catch {
            importAlert.className = 'form-alert form-alert--error';
            importAlert.textContent = 'Gagal terhubung ke server.';
            importAlert.style.display = 'block';
        } finally {
            btnProseImport.disabled = false; btnProseImport.textContent = 'Proses Import';
        }
    });

    btnDownload.addEventListener('click', () => {
        const checked = document.querySelectorAll('input[name="program"]:checked');
        const ids = Array.from(checked).map(cb => cb.value);
        if (ids.length === 0) return alert("Pilih minimal satu kerja sama.");
        window.location.href = `/api/generate-laporan?programIds=${ids.map(encodeURIComponent).join(',')}`;
    });

    // ---- MODAL EDIT MAHASISWA ----
    const modalEditMahasiswa     = document.getElementById('modalEditMahasiswa');
    const formEditMahasiswa      = document.getElementById('formEditMahasiswa');
    const formAlertEditMahasiswa = document.getElementById('formAlertEditMahasiswa');

    function bukaModalEditMahasiswa(item) {
        document.getElementById('editMhsIdProgramLama').value  = item.id_program;
        document.getElementById('editMhsNimLama').value        = item.nim;
        document.getElementById('editMhsNim').value            = item.nim;
        document.getElementById('editMhsNama').value           = item.nama;
        document.getElementById('editMhsFakultas').value       = item.fakultas || '';
        document.getElementById('editMhsProdi').value          = item.prodi || '';
        document.getElementById('editMhsTahunMasuk').value     = item.tahun_masuk || '';
        document.getElementById('editMhsSemesterMasuk').value  = item.semester_masuk || '';
        document.getElementById('editMhsDosenWali').value      = item.dosen_wali || '';
        document.getElementById('editMhsStatus').value         = item.status || 'Aktif';
        document.getElementById('editMhsSksLulus').value       = item.sks_lulus || '';
        document.getElementById('editMhsIpk').value            = item.ipk || '';
        document.getElementById('editMhsPembimbing1').value    = item.pembimbing_1 || '';
        document.getElementById('editMhsPembimbing2').value    = item.pembimbing_2 || '';
        // Populasi dropdown ID Program
        const sel = document.getElementById('editMhsIdProgram');
        const opts = allData.map(k => `<option value="${esc(k.id_program)}">${esc(k.id_program)} — ${esc(k.nama_mitra)}</option>`).join('');
        sel.innerHTML = '<option value="">-- Pilih Program --</option>' + opts;
        sel.value = item.id_program;
        formAlertEditMahasiswa.style.display = 'none';
        modalEditMahasiswa.style.display = 'flex';
    }

    function tutupModalEditMahasiswa() { modalEditMahasiswa.style.display = 'none'; }

    document.getElementById('btnTutupModalMahasiswa').addEventListener('click', tutupModalEditMahasiswa);
    document.getElementById('btnBatalEditMahasiswa').addEventListener('click', tutupModalEditMahasiswa);
    modalEditMahasiswa.addEventListener('click', e => { if (e.target === modalEditMahasiswa) tutupModalEditMahasiswa(); });

    formEditMahasiswa.addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(formEditMahasiswa).entries());
        data.id_program_lama = document.getElementById('editMhsIdProgramLama').value;
        data.nim_lama        = document.getElementById('editMhsNimLama').value;
        formAlertEditMahasiswa.style.display = 'none';
        const btnSubmit = formEditMahasiswa.querySelector('button[type="submit"]');
        btnSubmit.disabled = true; btnSubmit.textContent = 'Menyimpan...';
        try {
            const res = await fetch('/api/edit-mahasiswa', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const hasil = await res.json();
            if (res.ok) {
                tutupModalEditMahasiswa();
                await AmbilDataMahasiswaDanRender();
            } else {
                formAlertEditMahasiswa.className = 'form-alert form-alert--error';
                formAlertEditMahasiswa.textContent = hasil.pesan;
                formAlertEditMahasiswa.style.display = 'inline-block';
            }
        } catch {
            formAlertEditMahasiswa.className = 'form-alert form-alert--error';
            formAlertEditMahasiswa.textContent = 'Gagal terhubung ke server.';
            formAlertEditMahasiswa.style.display = 'inline-block';
        } finally {
            btnSubmit.disabled = false; btnSubmit.textContent = 'Simpan Perubahan';
        }
    });

    // ---- FITUR MITRA ----
    const bodyTabelMitra = document.getElementById('bodyTabelMitra');
    const filterMitraCari = document.getElementById('filterMitraCari');
    const infoHasilMitra = document.getElementById('infoHasilMitra');
    const btnResetFilterMitra = document.getElementById('btnResetFilterMitra');
    const formTambahMitra = document.getElementById('formTambahMitra');
    const formAlertMitra = document.getElementById('formAlertMitra');

    function renderTabelMitra(data) {
        bodyTabelMitra.innerHTML = '';
        if (data.length === 0) {
            bodyTabelMitra.innerHTML = tableState(9, 'empty', 'Belum ada data mitra', 'Tambahkan mitra agar bisa dipakai saat membuat data kerma atau kontrak.');
            return;
        }
        data.forEach((item, i) => {
            bodyTabelMitra.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${i + 1}</td>
                    <td><span class="kode-file-tag">${esc(item.id_mitra)}</span></td>
                    <td class="td-truncate"><strong>${esc(item.nama_mitra)}</strong></td>
                    <td>${esc(item.industri)}</td>
                    <td class="td-truncate">${esc(item.alamat)}</td>
                    <td>${esc(item.kota)}</td>
                    <td>${esc(item.provinsi)}</td>
                    <td>${esc(item.negara)}</td>
                    <td><button class="btn-edit-mitra" data-id="${esc(item.id_mitra)}">✏ Edit</button></td>
                </tr>
            `);
        });
    }

    function terapkanFilterMitra() {
        const cari = filterMitraCari.value.toLowerCase().trim();
        let hasil = allMitraData.filter(item => cocokPencarianGlobal(item, cari));
        hasil = colFilterMitra.applyTo(hasil);
        renderTabelMitra(hasil);
        const adaFilter = cari || Object.keys(colFilterMitra.colFilters).length > 0;
        infoHasilMitra.textContent = adaFilter ? `Menampilkan ${hasil.length} dari ${allMitraData.length} data` : '';
    }

    async function populateSelectNamaMitra() {
        const select = document.getElementById('selectNamaMitraKerma');
        if (!select) return;
        if (allMitraData.length === 0) {
            try {
                const res = await fetch('/api/daftar-mitra');
                allMitraData = await res.json();
            } catch { return; }
        }
        const nilaiSaat = select.value;
        select.innerHTML = '<option value="">-- Pilih Mitra --</option>'
            + allMitraData.map(item =>
                `<option value="${esc(item.nama_mitra)}">${esc(item.id_mitra)} — ${esc(item.nama_mitra)}</option>`
            ).join('');
        select.value = nilaiSaat;
    }

    async function AmbilDataMitraDanRender() {
        try {
            bodyTabelMitra.innerHTML = tableState(9, 'loading', 'Memuat data mitra', 'Mengambil direktori institusi dan perusahaan mitra.');
            const respon = await fetch('/api/daftar-mitra');
            allMitraData = await respon.json();

            terapkanFilterMitra();
        } catch {
            bodyTabelMitra.innerHTML = tableState(9, 'error', 'Gagal memuat data mitra', 'Periksa koneksi server atau coba kembali beberapa saat lagi.');
        }
    }

    filterMitraCari.addEventListener('input', terapkanFilterMitra);
    btnResetFilterMitra.addEventListener('click', () => {
        filterMitraCari.value = '';
        colFilterMitra.clearAll();
        terapkanFilterMitra();
    });

    const colFilterMitra = makeColFilter('sectionMitra', () => allMitraData, terapkanFilterMitra);
    colFilterMitra.initBtns();

    // Tab switching Tambah Mitra
    const tabManualMitra  = document.getElementById('tabManualMitra');
    const tabImportMitra  = document.getElementById('tabImportMitra');
    const panelManualMitra  = document.getElementById('panelManualMitra');
    const panelImportMitra  = document.getElementById('panelImportMitra');
    const selectFileMitra   = document.getElementById('selectFileMitra');
    const btnRefreshFileMitra = document.getElementById('btnRefreshFileMitra');
    const btnProsesImportMitra = document.getElementById('btnProsesImportMitra');
    const alertImportMitra  = document.getElementById('alertImportMitra');

    tabManualMitra.addEventListener('click', () => {
        tabManualMitra.classList.add('active'); tabImportMitra.classList.remove('active');
        panelManualMitra.style.display = ''; panelImportMitra.style.display = 'none';
    });
    tabImportMitra.addEventListener('click', () => {
        tabImportMitra.classList.add('active'); tabManualMitra.classList.remove('active');
        panelImportMitra.style.display = ''; panelManualMitra.style.display = 'none';
        muatDaftarFileMitra();
    });

    async function muatDaftarFileMitra() {
        selectFileMitra.innerHTML = '<option value="">-- Memuat... --</option>';
        btnProsesImportMitra.disabled = true;
        try {
            const res = await fetch('/api/daftar-file-data');
            const files = await res.json();
            if (files.length === 0) {
                selectFileMitra.innerHTML = '<option value="">-- Tidak ada file .xlsx di folder data/ --</option>';
            } else {
                selectFileMitra.innerHTML = '<option value="">-- Pilih file --</option>'
                    + files.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
            }
        } catch {
            selectFileMitra.innerHTML = '<option value="">-- Gagal memuat daftar file --</option>';
        }
    }

    selectFileMitra.addEventListener('change', () => {
        btnProsesImportMitra.disabled = !selectFileMitra.value;
        alertImportMitra.style.display = 'none';
    });
    btnRefreshFileMitra.addEventListener('click', muatDaftarFileMitra);

    btnProsesImportMitra.addEventListener('click', async () => {
        const namaFile = selectFileMitra.value;
        if (!namaFile) return;
        alertImportMitra.style.display = 'none';
        btnProsesImportMitra.disabled = true;
        btnProsesImportMitra.textContent = 'Mengimpor...';
        try {
            const res = await fetch('/api/import-mitra', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ namaFile })
            });
            const hasil = await res.json();
            alertImportMitra.className = res.ok ? 'form-alert form-alert--success' : 'form-alert form-alert--error';
            alertImportMitra.textContent = hasil.pesan;
            alertImportMitra.style.display = 'inline-block';
            if (res.ok) await AmbilDataMitraDanRender();
        } catch {
            alertImportMitra.className = 'form-alert form-alert--error';
            alertImportMitra.textContent = 'Gagal terhubung ke server.';
            alertImportMitra.style.display = 'inline-block';
        } finally {
            btnProsesImportMitra.disabled = false;
            btnProsesImportMitra.textContent = 'Import Mitra';
        }
    });

    formTambahMitra.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(formTambahMitra).entries());
        formAlertMitra.style.display = 'none';
        const btnSubmit = formTambahMitra.querySelector('button[type="submit"]');
        btnSubmit.disabled = true; btnSubmit.textContent = 'Menyimpan...';
        try {
            const res = await fetch('/api/tambah-mitra', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const hasil = await res.json();
            if (res.ok) {
                formAlertMitra.className = 'form-alert form-alert--success';
                formAlertMitra.textContent = hasil.pesan;
                formAlertMitra.style.display = 'inline-block';
                formTambahMitra.reset();
                await AmbilDataMitraDanRender();
            } else {
                formAlertMitra.className = 'form-alert form-alert--error';
                formAlertMitra.textContent = hasil.pesan;
                formAlertMitra.style.display = 'inline-block';
            }
        } catch {
            formAlertMitra.className = 'form-alert form-alert--error';
            formAlertMitra.textContent = 'Gagal terhubung ke server.';
            formAlertMitra.style.display = 'inline-block';
        } finally {
            btnSubmit.disabled = false; btnSubmit.textContent = 'Simpan Mitra';
        }
    });

    // ---- MODAL EDIT MITRA ----
    const modalEditMitra    = document.getElementById('modalEditMitra');
    const formEditMitra     = document.getElementById('formEditMitra');
    const formAlertEditMitra = document.getElementById('formAlertEditMitra');

    function bukaModalEdit(item) {
        document.getElementById('editIdMitra').value          = item.id_mitra;
        document.getElementById('editIdMitraDisplay').value   = item.id_mitra;
        document.getElementById('editNamaMitra').value        = item.nama_mitra;
        document.getElementById('editKota').value             = item.kota;
        document.getElementById('editAlamat').value           = item.alamat;
        document.getElementById('editProvinsi').value         = item.provinsi;
        document.getElementById('editNegara').value           = item.negara;
        formAlertEditMitra.style.display = 'none';

        // Isi dropdown industri
        const selIndustri = document.getElementById('editIndustri');
        selIndustri.innerHTML = '<option value="">-- Pilih Industri --</option>'
            + allIndustriData.map(ind =>
                `<option value="${esc(ind.nama_sektor)}">${esc(ind.kode_kategori)} — ${esc(ind.nama_sektor)}</option>`
            ).join('');
        selIndustri.value = item.industri;

        modalEditMitra.style.display = 'flex';
    }

    function tutupModalEdit() {
        modalEditMitra.style.display = 'none';
    }

    document.getElementById('btnTutupModalMitra').addEventListener('click', tutupModalEdit);
    document.getElementById('btnBatalEditMitra').addEventListener('click', tutupModalEdit);
    modalEditMitra.addEventListener('click', e => { if (e.target === modalEditMitra) tutupModalEdit(); });

    bodyTabelMitra.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-edit-mitra');
        if (!btn) return;
        const idMitra = btn.dataset.id;
        const item = allMitraData.find(m => m.id_mitra === idMitra);
        if (!item) return;
        // Pastikan data industri sudah termuat
        if (allIndustriData.length === 0) {
            try { const r = await fetch('/api/daftar-industri'); allIndustriData = await r.json(); } catch {}
        }
        bukaModalEdit(item);
    });

    formEditMitra.addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(formEditMitra).entries());
        formAlertEditMitra.style.display = 'none';
        const btnSubmit = formEditMitra.querySelector('button[type="submit"]');
        btnSubmit.disabled = true; btnSubmit.textContent = 'Menyimpan...';
        try {
            const res = await fetch('/api/edit-mitra', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const hasil = await res.json();
            if (res.ok) {
                tutupModalEdit();
                await AmbilDataMitraDanRender();
            } else {
                formAlertEditMitra.className = 'form-alert form-alert--error';
                formAlertEditMitra.textContent = hasil.pesan;
                formAlertEditMitra.style.display = 'inline-block';
            }
        } catch {
            formAlertEditMitra.className = 'form-alert form-alert--error';
            formAlertEditMitra.textContent = 'Gagal terhubung ke server.';
            formAlertEditMitra.style.display = 'inline-block';
        } finally {
            btnSubmit.disabled = false; btnSubmit.textContent = 'Simpan Perubahan';
        }
    });

    // ---- FITUR INDUSTRI ----
    async function populateSelectIndustri() {
        const select = document.getElementById('selectIndustriMitra');
        if (!select) return;
        if (allIndustriData.length === 0) {
            try {
                const res = await fetch('/api/daftar-industri');
                allIndustriData = await res.json();
            } catch { return; }
        }
        const nilaiSaat = select.value;
        select.innerHTML = '<option value="">-- Pilih Industri --</option>'
            + allIndustriData.map(item =>
                `<option value="${esc(item.nama_sektor)}">${esc(item.kode_kategori)} — ${esc(item.nama_sektor)}</option>`
            ).join('');
        select.value = nilaiSaat; // pertahankan pilihan jika sudah ada
    }
    const bodyTabelIndustri      = document.getElementById('bodyTabelIndustri');
    const filterIndustriCari     = document.getElementById('filterIndustriCari');
    const infoHasilIndustri      = document.getElementById('infoHasilIndustri');
    const btnResetFilterIndustri = document.getElementById('btnResetFilterIndustri');
    const formTambahIndustri     = document.getElementById('formTambahIndustri');
    const formAlertIndustri      = document.getElementById('formAlertIndustri');

    let allIndustriData = [];

    function renderTabelIndustri(data) {
        bodyTabelIndustri.innerHTML = '';
        if (data.length === 0) {
            bodyTabelIndustri.innerHTML = tableState(3, 'empty', 'Belum ada data industri', 'Tambahkan kategori industri agar klasifikasi mitra lebih rapi.');
            return;
        }
        data.forEach(item => {
            bodyTabelIndustri.insertAdjacentHTML('beforeend', `
                <tr>
                    <td style="text-align:center;font-weight:700;color:#004B87;">${esc(item.kode_kategori)}</td>
                    <td>${esc(item.nama_sektor)}</td>
                    <td style="color:#718096;">${esc(item.contoh_ruang_lingkup)}</td>
                </tr>
            `);
        });
    }

    function terapkanFilterIndustri() {
        const cari = filterIndustriCari.value.toLowerCase().trim();
        let hasil = cari
            ? allIndustriData.filter(item => cocokPencarianGlobal(item, cari))
            : allIndustriData;
        hasil = colFilterIndustri.applyTo(hasil);
        renderTabelIndustri(hasil);
        const adaFilter = cari || Object.keys(colFilterIndustri.colFilters).length > 0;
        infoHasilIndustri.textContent = adaFilter ? `Menampilkan ${hasil.length} dari ${allIndustriData.length} data` : '';
    }

    async function AmbilDataIndustriDanRender() {
        try {
            bodyTabelIndustri.innerHTML = tableState(3, 'loading', 'Memuat data industri', 'Mengambil daftar kategori sektor dan ruang lingkup.');
            const respon = await fetch('/api/daftar-industri');
            allIndustriData = await respon.json();
            renderTabelIndustri(allIndustriData);
        } catch {
            bodyTabelIndustri.innerHTML = tableState(3, 'error', 'Gagal memuat data industri', 'Periksa koneksi server atau coba kembali beberapa saat lagi.');
        }
    }

    filterIndustriCari.addEventListener('input', terapkanFilterIndustri);
    btnResetFilterIndustri.addEventListener('click', () => {
        filterIndustriCari.value = '';
        colFilterIndustri.clearAll();
        terapkanFilterIndustri();
    });

    const colFilterIndustri = makeColFilter('sectionIndustri', () => allIndustriData, terapkanFilterIndustri);
    colFilterIndustri.initBtns();

    formTambahIndustri.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(formTambahIndustri).entries());
        formAlertIndustri.style.display = 'none';
        const btnSubmit = formTambahIndustri.querySelector('button[type="submit"]');
        btnSubmit.disabled = true; btnSubmit.textContent = 'Menyimpan...';
        try {
            const res = await fetch('/api/tambah-industri', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const hasil = await res.json();
            if (res.ok) {
                formAlertIndustri.className = 'form-alert form-alert--success';
                formAlertIndustri.textContent = hasil.pesan;
                formAlertIndustri.style.display = 'inline-block';
                formTambahIndustri.reset();
                await AmbilDataIndustriDanRender();
            } else {
                formAlertIndustri.className = 'form-alert form-alert--error';
                formAlertIndustri.textContent = hasil.pesan;
                formAlertIndustri.style.display = 'inline-block';
            }
        } catch {
            formAlertIndustri.className = 'form-alert form-alert--error';
            formAlertIndustri.textContent = 'Gagal terhubung ke server.';
            formAlertIndustri.style.display = 'inline-block';
        } finally {
            btnSubmit.disabled = false; btnSubmit.textContent = 'Simpan Industri';
        }
    });

    // ── KONTRAK / PKS ─────────────────────────────────────────────────────────

    function terbilang(n) {
        n = Math.floor(n);
        if (isNaN(n) || n < 0) return '';
        if (n === 0) return 'nol';
        const satuan = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan',
                         'sepuluh','sebelas','dua belas','tiga belas','empat belas','lima belas',
                         'enam belas','tujuh belas','delapan belas','sembilan belas'];
        if (n < 20) return satuan[n];
        if (n < 100) return satuan[Math.floor(n/10)] + ' puluh' + (n%10 ? ' ' + satuan[n%10] : '');
        if (n < 200) return 'seratus' + (n > 100 ? ' ' + terbilang(n-100) : '');
        if (n < 1000) return satuan[Math.floor(n/100)] + ' ratus' + (n%100 ? ' ' + terbilang(n%100) : '');
        if (n < 2000) return 'seribu' + (n > 1000 ? ' ' + terbilang(n-1000) : '');
        if (n < 1000000) return terbilang(Math.floor(n/1000)) + ' ribu' + (n%1000 ? ' ' + terbilang(n%1000) : '');
        if (n < 1000000000) return terbilang(Math.floor(n/1000000)) + ' juta' + (n%1000000 ? ' ' + terbilang(n%1000000) : '');
        return terbilang(Math.floor(n/1000000000)) + ' miliar' + (n%1000000000 ? ' ' + terbilang(n%1000000000) : '');
    }

    const NAMA_BULAN = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

    const PRODI_MAP = {
        'Magister': ['Magister Administrasi Bisnis'],
        'Doktor':   ['Doktor Sains Manajemen']
    };

    // ─ DOM refs kontrak ────────────────────────────────────────────────────────
    const bodyTabelKontrak     = document.getElementById('bodyTabelKontrak');
    const btnBuatKontrak       = document.getElementById('btnBuatKontrak');
    const formKontrakHost      = document.getElementById('formKontrakHost');
    const kontrakFormJudul     = document.getElementById('kontrakFormJudul');
    const kontrakFormSubjudul  = document.getElementById('kontrakFormSubjudul');
    const btnKembaliDaftarKontrak = document.getElementById('btnKembaliDaftarKontrak');
    const modalKontrak         = document.getElementById('modalKontrak');
    const modalKontrakJudul    = document.getElementById('modalKontrakJudul');
    const modalKontrakSubjudul = document.getElementById('modalKontrakSubjudul');
    const btnTutupModalKontrak = document.getElementById('btnTutupModalKontrak');
    const btnBatalKontrak      = document.getElementById('btnBatalKontrak');
    const btnSimpanKontrak     = document.getElementById('btnSimpanKontrak');
    const kontrakDraftHint     = document.getElementById('kontrakDraftHint');
    const formKontrak          = document.getElementById('formKontrak');
    const kontrakIdEdit        = document.getElementById('kontrakIdEdit');
    if (formKontrak && formKontrakHost && formKontrak.parentElement !== formKontrakHost) {
        formKontrakHost.appendChild(formKontrak);
    }
    // Identitas
    const kontrakDibuatOleh   = document.getElementById('kontrakDibuatOleh');
    const kontrakIdProgram     = document.getElementById('kontrakIdProgram');
    // Administrasi
    const kontrakNoMitra       = document.getElementById('kontrakNoMitra');
    const kontrakNoSbm         = document.getElementById('kontrakNoSbm');
    // Tanggal TTD
    const kontrakHari          = document.getElementById('kontrakHari');
    const kontrakTglAngka      = document.getElementById('kontrakTglAngka');
    const kontrakTglKata       = document.getElementById('kontrakTglKata');
    const kontrakBulanAngka    = document.getElementById('kontrakBulanAngka');
    const kontrakBulanKata     = document.getElementById('kontrakBulanKata');
    const kontrakTahunAngka    = document.getElementById('kontrakTahunAngka');
    const kontrakTahunKata     = document.getElementById('kontrakTahunKata');
    // Info Program
    const kontrakStrata        = document.getElementById('kontrakStrata');
    const kontrakProdi         = document.getElementById('kontrakProdi');
    const kontrakSemester      = document.getElementById('kontrakSemester');
    const kontrakTahunAkademik = document.getElementById('kontrakTahunAkademik');
    // Profil Mitra
    const kontrakIdMitra             = document.getElementById('kontrakIdMitra');
    const kontrakNamaMitra           = document.getElementById('kontrakNamaMitra');
    const kontrakNamaMitraManual     = document.getElementById('kontrakNamaMitraManual');
    const kontrakBentukUsahaMitra    = document.getElementById('kontrakBentukUsahaMitra');
    const kontrakNamaPejabatMitra    = document.getElementById('kontrakNamaPejabatMitra');
    const kontrakJabatanPejabatMitra = document.getElementById('kontrakJabatanPejabatMitra');
    const kontrakDasarJabatanMitra   = document.getElementById('kontrakDasarJabatanMitra');
    const kontrakIndustriMitra       = document.getElementById('kontrakIndustriMitra');
    const kontrakDasarPendirianMitra = document.getElementById('kontrakDasarPendirianMitra');
    const kontrakAlamatMitra         = document.getElementById('kontrakAlamatMitra');
    const kontrakKotaMitra           = document.getElementById('kontrakKotaMitra');
    const kontrakProvinsiMitra       = document.getElementById('kontrakProvinsiMitra');
    const kontrakNegaraMitra         = document.getElementById('kontrakNegaraMitra');
    const kontrakKodeposMitra        = document.getElementById('kontrakKodeposMitra');
    // Korespondensi Mitra
    const kontrakNamaPicKorMitra    = document.getElementById('kontrakNamaPicKorMitra');
    const kontrakJabatanPicKorMitra = document.getElementById('kontrakJabatanPicKorMitra');
    const kontrakKodeTlpMitra       = document.getElementById('kontrakKodeTlpMitra');
    const kontrakNoTlpMitra         = document.getElementById('kontrakNoTlpMitra');
    const kontrakEmailMitra         = document.getElementById('kontrakEmailMitra');
    // Profil SBM
    const kontrakNamaSbm           = document.getElementById('kontrakNamaSbm');
    const kontrakNamaPejabatSbm    = document.getElementById('kontrakNamaPejabatSbm');
    const kontrakJabatanPejabatSbm = document.getElementById('kontrakJabatanPejabatSbm');
    const kontrakDasarJabatanSbm   = document.getElementById('kontrakDasarJabatanSbm');
    const kontrakIndustriSbm       = document.getElementById('kontrakIndustriSbm');
    const kontrakDasarPendirianSbm = document.getElementById('kontrakDasarPendirianSbm');
    const kontrakAlamatSbm         = document.getElementById('kontrakAlamatSbm');
    const kontrakKotaSbm           = document.getElementById('kontrakKotaSbm');
    const kontrakProvinsiSbm       = document.getElementById('kontrakProvinsiSbm');
    const kontrakNegaraSbm         = document.getElementById('kontrakNegaraSbm');
    const kontrakKodeposSbm        = document.getElementById('kontrakKodeposSbm');
    // Korespondensi SBM
    const kontrakNamaPicKorSbm    = document.getElementById('kontrakNamaPicKorSbm');
    const kontrakJabatanPicKorSbm = document.getElementById('kontrakJabatanPicKorSbm');
    const kontrakKodeTlpSbm       = document.getElementById('kontrakKodeTlpSbm');
    const kontrakNoTlpSbm         = document.getElementById('kontrakNoTlpSbm');
    const kontrakEmailSbm         = document.getElementById('kontrakEmailSbm');
    // Waktu Pelaksanaan
    const kontrakJangkaAngka            = document.getElementById('kontrakJangkaAngka');
    const kontrakJangkaKata             = document.getElementById('kontrakJangkaKata');
    const kontrakTglAwal                = document.getElementById('kontrakTglAwal');
    const kontrakTglAkhir               = document.getElementById('kontrakTglAkhir');
    const kontrakPerpanjSemesterAngka   = document.getElementById('kontrakPerpanjSemesterAngka');
    const kontrakPerpanjSemesterKata    = document.getElementById('kontrakPerpanjSemesterKata');
    const kontrakPerpanjBulanAngka      = document.getElementById('kontrakPerpanjBulanAngka');
    const kontrakPerpanjBulanKata       = document.getElementById('kontrakPerpanjBulanKata');
    // Jangka Waktu Perjanjian
    const kontrakJwKontrakAngka     = document.getElementById('kontrakJwKontrakAngka');
    const kontrakJwKontrakKata      = document.getElementById('kontrakJwKontrakKata');
    const kontrakTglBerakhirAngka   = document.getElementById('kontrakTglBerakhirAngka');
    const kontrakBulanBerakhirAngka = document.getElementById('kontrakBulanBerakhirAngka');
    const kontrakTahunBerakhirAngka = document.getElementById('kontrakTahunBerakhirAngka');
    // Pembiayaan
    const kontrakPicPembiayaan       = document.getElementById('kontrakPicPembiayaan');
    const kontrakNilaiKontrakAngka   = document.getElementById('kontrakNilaiKontrakAngka');
    const kontrakNilaiKontrakKata    = document.getElementById('kontrakNilaiKontrakKata');
    const kontrakJmlPesertaAngka     = document.getElementById('kontrakJmlPesertaAngka');
    const kontrakJmlPesertaKata      = document.getElementById('kontrakJmlPesertaKata');
    const kontrakBppPerPesertaAngka  = document.getElementById('kontrakBppPerPesertaAngka');
    const kontrakBppPerPesertaKata   = document.getElementById('kontrakBppPerPesertaKata');
    const kontrakBppSemPanjangAngka  = document.getElementById('kontrakBppSemPanjangAngka');
    const kontrakBppSemPanjangKata   = document.getElementById('kontrakBppSemPanjangKata');
    const kontrakBppSemPendekAngka   = document.getElementById('kontrakBppSemPendekAngka');
    const kontrakBppSemPendekKata    = document.getElementById('kontrakBppSemPendekKata');
    const kontrakBppUlangPanjangAngka= document.getElementById('kontrakBppUlangPanjangAngka');
    const kontrakBppUlangPendekAngka = document.getElementById('kontrakBppUlangPendekAngka');
    const kontrakBppTugasAkhirAngka  = document.getElementById('kontrakBppTugasAkhirAngka');
    const bodyRincianBpp             = document.getElementById('bodyRincianBpp');
    // Modal reject
    const modalRejectKontrak   = document.getElementById('modalRejectKontrak');
    const btnTutupModalReject  = document.getElementById('btnTutupModalReject');
    const btnBatalReject       = document.getElementById('btnBatalReject');
    const btnKonfirmasiReject  = document.getElementById('btnKonfirmasiReject');
    const kontrakCatatanReject = document.getElementById('kontrakCatatanReject');

    let kontrakRejectId = null;
    let mitraListData   = [];
    const KONTRAK_MITRA_BARU_VALUE = '__tambah_baru__';

    // ─ Bangun 5 baris tabel Rincian BPP ──────────────────────────────────────
    (function() {
        const gaya = 'padding:5px 4px;border:1px solid #d0dff0;';
        for (let i = 0; i < 5; i++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="${gaya}"><input type="text"   id="rincianTahap_${i}"   class="form-input" style="font-size:11px;padding:4px;" placeholder="Contoh: Sem.I – 2025/2026"></td>
                <td style="${gaya}"><input type="number" id="rincianBppMhs_${i}"  class="form-input" style="font-size:11px;padding:4px;" min="0" placeholder="0"></td>
                <td style="${gaya}"><input type="text"   id="rincianJmlMhs_${i}"  class="form-input" style="font-size:11px;padding:4px;background:#f7f8fa;color:#555;" readonly placeholder="dari Jml. Peserta Didik"></td>
                <td style="${gaya}"><input type="text"   id="rincianTotal_${i}"   class="form-input" style="font-size:11px;padding:4px;background:#f7f8fa;color:#555;" readonly placeholder="otomatis"></td>
                <td style="${gaya}"><input type="date"   id="rincianBatas_${i}"   class="form-input" style="font-size:11px;padding:4px;"></td>
            `;
            bodyRincianBpp.appendChild(tr);
        }
    })();

    const contractFlowSteps = Array.from(document.querySelectorAll('.form-flow--contract .flow-step[data-contract-flow]'));
    const contractStepMeta = [
        {
            key: 'para-pihak',
            no: '1',
            title: 'Para Pihak',
            desc: 'Profil, alamat, dan korespondensi pihak mitra serta SBM.',
            sections: ['Profil Pihak Mitra', 'Korespondensi — Pihak Mitra', 'Profil Pihak SBM', 'Korespondensi — Pihak SBM']
        },
        {
            key: 'program',
            no: '2',
            title: 'Program',
            desc: 'Informasi program, masa pelaksanaan, dan jangka waktu perjanjian.',
            sections: ['Info Program', 'Waktu Pelaksanaan Program', 'Jangka Waktu Perjanjian']
        },
        {
            key: 'pembiayaan',
            no: '3',
            title: 'Pembiayaan',
            desc: 'PIC pembiayaan, nilai kontrak, BPP, dan rincian jadwal pembayaran.',
            sections: ['Pembiayaan', 'Rincian Pembiayaan per Semester']
        },
        {
            key: 'administrasi',
            no: '4',
            title: 'Administrasi',
            desc: 'Identitas pembuat, nomor kontrak, dan tanggal tanda tangan.',
            sections: ['Identitas Pembuat', 'Administrasi Kontrak', 'Tanggal Tandatangan Kontrak']
        }
    ];
    let activeContractFlow = contractStepMeta[0].key;

    function normalizeSectionTitle(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function buildContractStepCards() {
        if (!formKontrak || formKontrak.querySelector('.contract-step-card')) return;
        const formActions = formKontrak.querySelector('.form-actions');
        const rawSections = [];
        Array.from(formKontrak.querySelectorAll(':scope > .form-section-label')).forEach(label => {
            const nodes = [label];
            let cursor = label.nextElementSibling;
            while (cursor && !cursor.classList.contains('form-section-label') && !cursor.classList.contains('form-actions')) {
                nodes.push(cursor);
                cursor = cursor.nextElementSibling;
            }
            rawSections.push({ title: normalizeSectionTitle(label.textContent), nodes });
        });
        const byTitle = new Map(rawSections.map(section => [section.title, section.nodes]));

        contractStepMeta.forEach(meta => {
            const card = document.createElement('section');
            card.className = 'contract-step-card';
            card.dataset.contractStep = meta.key;
            card.innerHTML = `
                <div class="contract-step-card-head">
                    <span>${meta.no}</span>
                    <div>
                        <h2>${meta.title}</h2>
                        <p>${meta.desc}</p>
                    </div>
                </div>
                <div class="contract-step-card-body"></div>
            `;
            const body = card.querySelector('.contract-step-card-body');
            meta.sections.forEach(title => {
                (byTitle.get(title) || []).forEach(node => body.appendChild(node));
            });
            formKontrak.insertBefore(card, formActions || null);
        });
    }

    const contractRequiredFields = {
        'para-pihak': [
            'kontrakIdMitra',
            'kontrakNamaMitra',
            'kontrakNamaPejabatMitra',
            'kontrakJabatanPejabatMitra',
            'kontrakDasarJabatanMitra',
            'kontrakBentukUsahaMitra',
            'kontrakIndustriMitra',
            'kontrakDasarPendirianMitra',
            'kontrakAlamatMitra',
            'kontrakKotaMitra',
            'kontrakProvinsiMitra',
            'kontrakNegaraMitra',
            'kontrakKodeposMitra',
            'kontrakNamaPicKorMitra',
            'kontrakJabatanPicKorMitra',
            'kontrakKodeTlpMitra',
            'kontrakNoTlpMitra',
            'kontrakEmailMitra',
            'kontrakNamaSbm',
            'kontrakNamaPejabatSbm',
            'kontrakJabatanPejabatSbm',
            'kontrakDasarJabatanSbm',
            'kontrakIndustriSbm',
            'kontrakDasarPendirianSbm',
            'kontrakAlamatSbm',
            'kontrakKotaSbm',
            'kontrakProvinsiSbm',
            'kontrakNegaraSbm',
            'kontrakKodeposSbm',
            'kontrakNamaPicKorSbm',
            'kontrakJabatanPicKorSbm',
            'kontrakKodeTlpSbm',
            'kontrakNoTlpSbm',
            'kontrakEmailSbm'
        ],
        program: [
            'kontrakStrata',
            'kontrakProdi',
            'kontrakSemester',
            'kontrakTahunAkademik',
            'kontrakJangkaAngka',
            'kontrakTglAwal',
            'kontrakTglAkhir',
            'kontrakPerpanjSemesterAngka',
            'kontrakPerpanjBulanAngka',
            'kontrakJwKontrakAngka',
            'kontrakTglBerakhirAngka',
            'kontrakBulanBerakhirAngka',
            'kontrakTahunBerakhirAngka'
        ],
        pembiayaan: [
            'kontrakPicPembiayaan',
            'kontrakJmlPesertaAngka',
            'kontrakNilaiKontrakAngka',
            'kontrakBppPerPesertaAngka',
            'kontrakBppSemPanjangAngka',
            'kontrakBppSemPendekAngka',
            'kontrakBppUlangPanjangAngka',
            'kontrakBppUlangPendekAngka',
            'kontrakBppTugasAkhirAngka'
        ],
        administrasi: [
            'kontrakDibuatOleh',
            'kontrakNoMitra',
            'kontrakNoSbm',
            'kontrakHari',
            'kontrakTglAngka',
            'kontrakBulanAngka',
            'kontrakTahunAngka'
        ]
    };

    function contractFieldLabel(el) {
        return el?.closest('.form-group')?.querySelector('.form-label')?.textContent
            ?.replace(/\s+/g, ' ')
            .replace('— otomatis', '')
            .trim() || el?.id || 'Field';
    }

    function isKontrakMitraBaruMode() {
        return kontrakNamaMitra?.value === KONTRAK_MITRA_BARU_VALUE;
    }

    function getKontrakNamaMitraValue() {
        return isKontrakMitraBaruMode()
            ? kontrakNamaMitraManual?.value.trim() || ''
            : kontrakNamaMitra?.value.trim() || '';
    }

    function contractFieldFilled(el) {
        if (!el) return false;
        if (el.id === 'kontrakNamaMitra') return !!getKontrakNamaMitraValue();
        const value = String(el.value ?? '').trim();
        if (!value || value === KONTRAK_MITRA_BARU_VALUE) return false;
        return typeof el.checkValidity === 'function' ? el.checkValidity() : true;
    }

    function setContractFieldMissing(el, missing) {
        el?.classList.toggle('is-missing', !!missing);
        if (el?.id === 'kontrakNamaMitra' && kontrakNamaMitraManual) {
            kontrakNamaMitraManual.classList.toggle('is-missing', !!missing && isKontrakMitraBaruMode());
        }
    }

    function validateRincianBpp(mark = false) {
        let hasCompleteRow = false;
        const missing = [];
        for (let i = 0; i < 5; i++) {
            const tahap = document.getElementById(`rincianTahap_${i}`);
            const bpp = document.getElementById(`rincianBppMhs_${i}`);
            const batas = document.getElementById(`rincianBatas_${i}`);
            const values = [tahap, bpp, batas].map(el => String(el?.value || '').trim());
            const any = values.some(Boolean);
            const complete = values.every(Boolean);
            if (complete) hasCompleteRow = true;
            if (mark) [tahap, bpp, batas].forEach(el => setContractFieldMissing(el, any && !String(el?.value || '').trim()));
            if (any && !complete) missing.push(`Rincian BPP baris ${i + 1}`);
        }
        if (!hasCompleteRow) missing.push('Minimal satu rincian BPP lengkap');
        return { valid: missing.length === 0, missing };
    }

    function validateContractFlow(key, { mark = false } = {}) {
        const missing = [];
        (contractRequiredFields[key] || []).forEach(id => {
            const el = document.getElementById(id);
            const ok = contractFieldFilled(el);
            if (mark) setContractFieldMissing(el, !ok);
            if (!ok) missing.push(contractFieldLabel(el));
        });
        if (key === 'pembiayaan') {
            const rincian = validateRincianBpp(mark);
            missing.push(...rincian.missing);
        }
        return { valid: missing.length === 0, missing };
    }

    function validateAllContractFlows(options = {}) {
        const result = contractStepMeta.map(meta => ({
            ...meta,
            ...validateContractFlow(meta.key, options)
        }));
        return {
            valid: result.every(row => row.valid),
            result
        };
    }

    function updateContractDraftState({ markActive = false } = {}) {
        if (!formKontrak || !btnSimpanKontrak) return;
        validateContractFlow(activeContractFlow, { mark: markActive });
        const allResult = validateAllContractFlows();
        contractFlowSteps.forEach(step => {
            const result = allResult.result.find(row => row.key === step.dataset.contractFlow);
            step.classList.toggle('is-complete', !!result?.valid);
            step.classList.toggle('is-incomplete', !result?.valid);
            step.title = result?.valid
                ? `${result.title} sudah lengkap`
                : `Belum lengkap untuk pengajuan: ${(result?.missing || []).slice(0, 4).join(', ')}`;
        });
        btnSimpanKontrak.disabled = false;
        btnSimpanKontrak.title = 'Simpan draft kapan saja, walaupun data flow belum lengkap.';
        if (kontrakDraftHint) {
            kontrakDraftHint.style.display = 'inline-flex';
            kontrakDraftHint.className = 'form-alert contract-draft-hint';
            kontrakDraftHint.textContent = allResult.valid
                ? 'Semua flow lengkap. Draft dapat diajukan kepada atasan dari daftar kontrak.'
                : 'Draft dapat disimpan kapan saja. Pengajuan kepada atasan aktif setelah semua flow lengkap.';
        }
    }

    function setActiveContractFlow(key) {
        activeContractFlow = key || contractStepMeta[0].key;
        contractFlowSteps.forEach(step => {
            const active = step.dataset.contractFlow === activeContractFlow;
            step.classList.toggle('is-active', active);
            step.setAttribute('aria-current', active ? 'step' : 'false');
        });
        updateContractDraftState();
    }

    function scrollToContractStep(key, behavior = 'smooth') {
        const card = formKontrak?.querySelector(`.contract-step-card[data-contract-step="${key}"]`);
        if (!card) return;
        setActiveContractFlow(key);
        card.scrollIntoView({ behavior, block: 'start' });
    }

    function syncContractFlowFromScroll() {
        if (!formKontrakHost) return;
        const hostTop = formKontrakHost.getBoundingClientRect().top;
        let current = contractStepMeta[0].key;
        formKontrak.querySelectorAll('.contract-step-card').forEach(card => {
            if (card.getBoundingClientRect().top - hostTop <= 150) {
                current = card.dataset.contractStep;
            }
        });
        setActiveContractFlow(current);
    }

    buildContractStepCards();
    contractFlowSteps.forEach(step => {
        step.addEventListener('click', () => scrollToContractStep(step.dataset.contractFlow));
        step.addEventListener('keydown', e => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            scrollToContractStep(step.dataset.contractFlow);
        });
    });
    formKontrak?.addEventListener('input', () => updateContractDraftState());
    formKontrak?.addEventListener('change', () => updateContractDraftState({ markActive: true }));
    formKontrakHost?.addEventListener('scroll', syncContractFlowFromScroll, { passive: true });
    updateContractDraftState();

    function syncJmlPesertaKeRincian() {
        const jml = +kontrakJmlPesertaAngka.value || 0;
        for (let i = 0; i < 5; i++) {
            document.getElementById(`rincianJmlMhs_${i}`).value = jml || '';
        }
        hitungTotalRincian();
    }

    function hitungTotalRincian(idx) {
        const jml = +kontrakJmlPesertaAngka.value || 0;
        const indices = idx !== undefined ? [idx] : [0,1,2,3,4];
        indices.forEach(i => {
            const bpp    = +document.getElementById(`rincianBppMhs_${i}`).value || 0;
            const totalEl = document.getElementById(`rincianTotal_${i}`);
            totalEl.value = bpp && jml ? (bpp * jml).toLocaleString('id-ID') : '';
        });
    }

    async function populateIndustriKontrak(nilaiTerpilih = '') {
        if (!kontrakIndustriMitra) return;
        if (allIndustriData.length === 0) {
            try {
                const res = await fetch('/api/daftar-industri');
                allIndustriData = await res.json();
            } catch { allIndustriData = []; }
        }
        kontrakIndustriMitra.innerHTML = '<option value="">-- Pilih Industri Mitra --</option>'
            + allIndustriData.map(item =>
                `<option value="${esc(item.nama_sektor)}">${esc(item.kode_kategori)} — ${esc(item.nama_sektor)}</option>`
            ).join('');
        if (nilaiTerpilih && !allIndustriData.some(item => item.nama_sektor === nilaiTerpilih)) {
            kontrakIndustriMitra.insertAdjacentHTML('beforeend', `<option value="${esc(nilaiTerpilih)}">${esc(nilaiTerpilih)}</option>`);
        }
        kontrakIndustriMitra.value = nilaiTerpilih || '';
    }

    function setIndustriKontrakValue(value = '') {
        if (!kontrakIndustriMitra) return;
        const nilai = value || '';
        const exists = Array.from(kontrakIndustriMitra.options).some(opt => opt.value === nilai);
        if (nilai && !exists) {
            kontrakIndustriMitra.insertAdjacentHTML('beforeend', `<option value="${esc(nilai)}">${esc(nilai)}</option>`);
        }
        kontrakIndustriMitra.value = nilai;
    }

    function setKontrakMitraBaruMode(active, namaManual) {
        if (kontrakNamaMitraManual) {
            kontrakNamaMitraManual.hidden = !active;
            kontrakNamaMitraManual.disabled = !active;
            if (active && typeof namaManual === 'string') kontrakNamaMitraManual.value = namaManual;
            if (!active) {
                kontrakNamaMitraManual.value = '';
                kontrakNamaMitraManual.classList.remove('is-missing');
            }
        }
        if (kontrakIdMitra) {
            kontrakIdMitra.readOnly = !active;
            kontrakIdMitra.placeholder = active ? 'Ketik ID mitra baru' : 'Terisi otomatis dari data mitra';
        }
    }

    function clearMitraAutofill({ clearId = true } = {}) {
        if (clearId) kontrakIdMitra.value = '';
        kontrakAlamatMitra.value = '';
        kontrakKotaMitra.value = '';
        kontrakProvinsiMitra.value = '';
        kontrakNegaraMitra.value = '';
        setIndustriKontrakValue('');
    }

    function pilihMitraKontrak(nilaiTerpilih = '') {
        const nilai = String(nilaiTerpilih || '').trim();
        const adaDiMaster = nilai && mitraListData.some(m => m.nama_mitra === nilai);
        if (nilai && !adaDiMaster) {
            kontrakNamaMitra.value = KONTRAK_MITRA_BARU_VALUE;
            setKontrakMitraBaruMode(true, nilai);
        } else {
            kontrakNamaMitra.value = nilai || '';
            setKontrakMitraBaruMode(false);
        }
    }

    // ─ Load mitra ke dropdown ─────────────────────────────────────────────────
    async function loadMitraUntukKontrak(nilaiTerpilih) {
        try {
            const res = await fetch('/api/daftar-mitra');
            mitraListData = await res.json();
        } catch { mitraListData = []; }
        await populateIndustriKontrak(kontrakIndustriMitra.value);

        kontrakNamaMitra.innerHTML = '<option value="">-- Pilih Mitra --</option>';
        mitraListData.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.nama_mitra;
            opt.textContent = `${m.id_mitra || '-'} — ${m.nama_mitra}`;
            kontrakNamaMitra.appendChild(opt);
        });
        const optTambah = document.createElement('option');
        optTambah.value = KONTRAK_MITRA_BARU_VALUE;
        optTambah.textContent = '+ Tambah Mitra Baru';
        optTambah.style.cssText = 'color:#004B87;font-weight:600;';
        kontrakNamaMitra.appendChild(optTambah);
        pilihMitraKontrak(nilaiTerpilih);
    }

    // Auto-fill data mitra saat dipilih dari dropdown
    kontrakNamaMitra.addEventListener('change', () => {
        const val = kontrakNamaMitra.value;
        if (val === KONTRAK_MITRA_BARU_VALUE) {
            setKontrakMitraBaruMode(true);
            clearMitraAutofill();
            kontrakNamaMitraManual?.focus();
            updateContractDraftState({ markActive: true });
            return;
        }
        setKontrakMitraBaruMode(false);
        const mitra = mitraListData.find(m => m.nama_mitra === val);
        if (mitra) {
            kontrakIdMitra.value        = mitra.id_mitra || '';
            kontrakAlamatMitra.value    = mitra.alamat   || '';
            kontrakKotaMitra.value      = mitra.kota     || '';
            kontrakProvinsiMitra.value  = mitra.provinsi || '';
            kontrakNegaraMitra.value    = mitra.negara   || '';
            setIndustriKontrakValue(mitra.industri || '');
        } else {
            kontrakIdMitra.value = '';
        }
        updateContractDraftState({ markActive: true });
    });

    // Isi dropdown Tahun Akademik
    (function() {
        const thn = new Date().getFullYear();
        for (let i = 0; i <= 9; i++) {
            const opt = document.createElement('option');
            opt.value = opt.textContent = `${thn + i}/${thn + i + 1}`;
            kontrakTahunAkademik.appendChild(opt);
        }
    })();

    // Auto-fill kata dari angka
    kontrakTglAngka.addEventListener('input',            () => { kontrakTglKata.value             = terbilang(+kontrakTglAngka.value); });
    kontrakBulanAngka.addEventListener('input',          () => { kontrakBulanKata.value           = NAMA_BULAN[+kontrakBulanAngka.value] || ''; });
    kontrakTahunAngka.addEventListener('input',          () => { kontrakTahunKata.value           = terbilang(+kontrakTahunAngka.value); });
    kontrakJangkaAngka.addEventListener('input',         () => { kontrakJangkaKata.value          = terbilang(+kontrakJangkaAngka.value); });
    kontrakPerpanjSemesterAngka.addEventListener('input',() => { kontrakPerpanjSemesterKata.value = terbilang(+kontrakPerpanjSemesterAngka.value); });
    kontrakPerpanjBulanAngka.addEventListener('input',   () => { kontrakPerpanjBulanKata.value    = terbilang(+kontrakPerpanjBulanAngka.value); });
    kontrakJwKontrakAngka.addEventListener('input',      () => { kontrakJwKontrakKata.value       = terbilang(+kontrakJwKontrakAngka.value); });
    kontrakNilaiKontrakAngka.addEventListener('input',   () => { kontrakNilaiKontrakKata.value    = terbilang(+kontrakNilaiKontrakAngka.value) + ' rupiah'; });
    kontrakJmlPesertaAngka.addEventListener('input', () => {
        kontrakJmlPesertaKata.value = terbilang(+kontrakJmlPesertaAngka.value);
        syncJmlPesertaKeRincian();
    });
    kontrakBppPerPesertaAngka.addEventListener('input',  () => { kontrakBppPerPesertaKata.value   = terbilang(+kontrakBppPerPesertaAngka.value) + ' rupiah'; });
    kontrakBppSemPanjangAngka.addEventListener('input',  () => { kontrakBppSemPanjangKata.value   = terbilang(+kontrakBppSemPanjangAngka.value) + ' rupiah'; });
    kontrakBppSemPendekAngka.addEventListener('input',   () => { kontrakBppSemPendekKata.value    = terbilang(+kontrakBppSemPendekAngka.value) + ' rupiah'; });

    // Recalc total saat BPP per baris berubah
    bodyRincianBpp.addEventListener('input', e => {
        for (let i = 0; i < 5; i++) {
            if (e.target.id === `rincianBppMhs_${i}`) {
                hitungTotalRincian(i);
                break;
            }
        }
    });

    // Strata → Prodi
    kontrakStrata.addEventListener('change', () => {
        const prodi = PRODI_MAP[kontrakStrata.value] || [];
        kontrakProdi.innerHTML = '<option value="">-- Pilih Prodi --</option>';
        prodi.forEach(p => {
            const o = document.createElement('option');
            o.value = o.textContent = p;
            kontrakProdi.appendChild(o);
        });
        if (prodi.length === 1) kontrakProdi.value = prodi[0];
    });

    function setJudulFormKontrak(judul, subjudul = '') {
        setText(kontrakFormJudul, judul);
        setText(kontrakFormSubjudul, subjudul || 'Lengkapi data kontrak dari administrasi, para pihak, program, sampai pembiayaan.');
        setText(modalKontrakJudul, judul);
        setText(modalKontrakSubjudul, subjudul);
    }

    function resetRincianKontrak() {
        for (let i = 0; i < 5; i++) {
            document.getElementById(`rincianTahap_${i}`).value  = '';
            document.getElementById(`rincianBppMhs_${i}`).value = '';
            document.getElementById(`rincianJmlMhs_${i}`).value = '';
            document.getElementById(`rincianTotal_${i}`).value  = '';
            document.getElementById(`rincianBatas_${i}`).value  = '';
        }
    }

    function tampilkanFormKontrak() {
        if (sectionFormKontrak) switchPage(menuKontrak, sectionFormKontrak);
        if (formKontrakHost) formKontrakHost.scrollTop = 0;
        setActiveContractFlow(contractStepMeta[0].key);
    }

    function kembaliKeDaftarKontrak(refresh = false) {
        switchPage(menuKontrak, sectionKontrak);
        if (refresh) loadKontrak();
    }

    function tutupModalKontrak() {
        kembaliKeDaftarKontrak();
    }

    // Buka halaman form buat baru
    btnBuatKontrak.addEventListener('click', async () => {
        kontrakIdEdit.value = '';
        formKontrak.reset();
        kontrakProdi.innerHTML = '<option value="">-- Pilih Strata dulu --</option>';
        resetRincianKontrak();
        setJudulFormKontrak('Buat Kontrak / PKS Baru');
        btnSimpanKontrak.textContent = 'Simpan sebagai Draft';
        await loadMitraUntukKontrak();
        tampilkanFormKontrak();
        updateContractDraftState();
    });

    btnTutupModalKontrak?.addEventListener('click', tutupModalKontrak);
    btnBatalKontrak.addEventListener('click', tutupModalKontrak);
    btnKembaliDaftarKontrak?.addEventListener('click', () => kembaliKeDaftarKontrak(true));
    modalKontrak?.addEventListener('click', e => { if (e.target === modalKontrak) tutupModalKontrak(); });

    // ─ Kumpulkan data form ────────────────────────────────────────────────────
    function ambilDataFormKontrak() {
        const rincian_bpp = [];
        for (let i = 0; i < 5; i++) {
            const bpp = +document.getElementById(`rincianBppMhs_${i}`).value || null;
            const jml = +kontrakJmlPesertaAngka.value || null;
            rincian_bpp.push({
                tahap:               document.getElementById(`rincianTahap_${i}`).value.trim(),
                BPP_per_mahasiswa:   bpp,
                jumlah_peserta_didik: jml,
                total_BPP:           bpp && jml ? bpp * jml : null,
                batas_pembayaran:    document.getElementById(`rincianBatas_${i}`).value
            });
        }
        return {
            dibuat_oleh:      kontrakDibuatOleh.value.trim(),
            id_program:       kontrakIdProgram.value.trim(),
            no_kontrak_mitra: kontrakNoMitra.value.trim(),
            no_kontrak_sbm:   kontrakNoSbm.value.trim(),
            hari:             kontrakHari.value,
            tgl_angka:        kontrakTglAngka.value      ? +kontrakTglAngka.value      : null,
            bulan_angka:      kontrakBulanAngka.value    ? +kontrakBulanAngka.value    : null,
            tahun_angka:      kontrakTahunAngka.value    ? +kontrakTahunAngka.value    : null,
            tgl_kata:         kontrakTglKata.value,
            bulan_kata:       kontrakBulanKata.value,
            tahun_kata:       kontrakTahunKata.value,
            strata_kata:      kontrakStrata.value,
            prodi:            kontrakProdi.value,
            semester:         kontrakSemester.value,
            tahun_akademik:   kontrakTahunAkademik.value,
            // Profil Mitra
            id_mitra:              kontrakIdMitra.value.trim(),
            nama_mitra:            getKontrakNamaMitraValue(),
            bentuk_usaha_mitra:    kontrakBentukUsahaMitra.value.trim(),
            nama_pejabat_mitra:    kontrakNamaPejabatMitra.value.trim(),
            jabatan_pejabat_mitra: kontrakJabatanPejabatMitra.value.trim(),
            dasar_jabatan_mitra:   kontrakDasarJabatanMitra.value.trim(),
            industri_mitra:        kontrakIndustriMitra.value.trim(),
            dasar_pendirian_mitra: kontrakDasarPendirianMitra.value.trim(),
            alamat_mitra:          kontrakAlamatMitra.value.trim(),
            kota_mitra:            kontrakKotaMitra.value.trim(),
            provinsi_mitra:        kontrakProvinsiMitra.value.trim(),
            negara_mitra:          kontrakNegaraMitra.value.trim(),
            kodepos_mitra:         kontrakKodeposMitra.value.trim(),
            // Korespondensi Mitra
            nama_pic_korespondensi_mitra:    kontrakNamaPicKorMitra.value.trim(),
            jabatan_pic_korespondensi_mitra: kontrakJabatanPicKorMitra.value.trim(),
            kode_tlp_mitra:                  kontrakKodeTlpMitra.value.trim(),
            no_tlp_mitra:                    kontrakNoTlpMitra.value.trim(),
            email_mitra:                     kontrakEmailMitra.value.trim(),
            // Profil SBM
            nama_sbm:            kontrakNamaSbm.value.trim(),
            nama_pejabat_sbm:    kontrakNamaPejabatSbm.value.trim(),
            jabatan_pejabat_sbm: kontrakJabatanPejabatSbm.value.trim(),
            dasar_jabatan_sbm:   kontrakDasarJabatanSbm.value.trim(),
            industri_sbm:        kontrakIndustriSbm.value.trim(),
            dasar_pendirian_sbm: kontrakDasarPendirianSbm.value.trim(),
            alamat_sbm:          kontrakAlamatSbm.value.trim(),
            kota_sbm:            kontrakKotaSbm.value.trim(),
            provinsi_sbm:        kontrakProvinsiSbm.value.trim(),
            negara_sbm:          kontrakNegaraSbm.value.trim(),
            kodepos_sbm:         kontrakKodeposSbm.value.trim(),
            // Korespondensi SBM
            nama_pic_korespondensi_sbm:    kontrakNamaPicKorSbm.value.trim(),
            jabatan_pic_korespondensi_sbm: kontrakJabatanPicKorSbm.value.trim(),
            kode_tlp_sbm:                  kontrakKodeTlpSbm.value.trim(),
            no_tlp_sbm:                    kontrakNoTlpSbm.value.trim(),
            email_sbm:                     kontrakEmailSbm.value.trim(),
            // Waktu Pelaksanaan
            jangka_waktu_pelaksanaan_angka_bulan: kontrakJangkaAngka.value           ? +kontrakJangkaAngka.value           : null,
            jangka_waktu_pelaksanaan_kata_bulan:  kontrakJangkaKata.value,
            tgl_awal_program:                     kontrakTglAwal.value,
            tgl_akhir_program:                    kontrakTglAkhir.value,
            lama_perpanjangan_angka_semester:     kontrakPerpanjSemesterAngka.value  ? +kontrakPerpanjSemesterAngka.value  : null,
            lama_perpanjangan_kata_semester:      kontrakPerpanjSemesterKata.value,
            lama_perpanjangan_angka_bulan:        kontrakPerpanjBulanAngka.value     ? +kontrakPerpanjBulanAngka.value     : null,
            lama_perpanjangan_kata_bulan:         kontrakPerpanjBulanKata.value,
            // Jangka Waktu Perjanjian
            jangka_waktu_kontrak_angka_bulan: kontrakJwKontrakAngka.value       ? +kontrakJwKontrakAngka.value       : null,
            jangka_waktu_kontrak_kata_bulan:  kontrakJwKontrakKata.value,
            tgl_berakhir_kontrak_angka:       kontrakTglBerakhirAngka.value     ? +kontrakTglBerakhirAngka.value     : null,
            bulan_berakhir_kontrak_angka:     kontrakBulanBerakhirAngka.value   ? +kontrakBulanBerakhirAngka.value   : null,
            tahun_berakhir_kontrak_angka:     kontrakTahunBerakhirAngka.value   ? +kontrakTahunBerakhirAngka.value   : null,
            // Pembiayaan
            pic_pembiayaan:         kontrakPicPembiayaan.value,
            nilai_kontrak_angka:    kontrakNilaiKontrakAngka.value   ? +kontrakNilaiKontrakAngka.value   : null,
            nilai_kontrak_kata:     kontrakNilaiKontrakKata.value,
            jumlah_peserta_didik_angka: kontrakJmlPesertaAngka.value ? +kontrakJmlPesertaAngka.value : null,
            jumlah_peserta_didik_kata:  kontrakJmlPesertaKata.value,
            BPP_per_peserta_angka:  kontrakBppPerPesertaAngka.value  ? +kontrakBppPerPesertaAngka.value  : null,
            BPP_per_peserta_kata:   kontrakBppPerPesertaKata.value,
            BPP_sem_panjang_angka:  kontrakBppSemPanjangAngka.value  ? +kontrakBppSemPanjangAngka.value  : null,
            BPP_sem_panjang_kata:   kontrakBppSemPanjangKata.value,
            BPP_sem_pendek_angka:   kontrakBppSemPendekAngka.value   ? +kontrakBppSemPendekAngka.value   : null,
            BPP_sem_pendek_kata:    kontrakBppSemPendekKata.value,
            BPP_ulang_panjang_angka: kontrakBppUlangPanjangAngka.value ? +kontrakBppUlangPanjangAngka.value : null,
            BPP_ulang_pendek_angka:  kontrakBppUlangPendekAngka.value  ? +kontrakBppUlangPendekAngka.value  : null,
            BPP_tugas_akhir_angka:   kontrakBppTugasAkhirAngka.value   ? +kontrakBppTugasAkhirAngka.value   : null,
            rincian_bpp
        };
    }

    // ─ Isi form untuk edit ────────────────────────────────────────────────────
    function isiFormKontrak(k) {
        kontrakIdEdit.value         = k.id_kontrak;
        kontrakDibuatOleh.value     = k.dibuat_oleh       || '';
        kontrakIdProgram.value      = k.id_program         || '';
        kontrakNoMitra.value        = k.no_kontrak_mitra   || '';
        kontrakNoSbm.value          = k.no_kontrak_sbm     || '';
        kontrakHari.value           = k.hari               || '';
        kontrakTglAngka.value       = k.tgl_angka   != null ? k.tgl_angka   : '';
        kontrakTglKata.value        = k.tgl_kata           || '';
        kontrakBulanAngka.value     = k.bulan_angka != null ? k.bulan_angka : '';
        kontrakBulanKata.value      = k.bulan_kata         || '';
        kontrakTahunAngka.value     = k.tahun_angka != null ? k.tahun_angka : '';
        kontrakTahunKata.value      = k.tahun_kata         || '';
        kontrakStrata.value         = k.strata_kata        || '';
        kontrakStrata.dispatchEvent(new Event('change'));
        kontrakProdi.value          = k.prodi              || '';
        kontrakSemester.value       = k.semester           || '';
        kontrakTahunAkademik.value  = k.tahun_akademik     || '';
        // Profil Mitra
        kontrakIdMitra.value             = k.id_mitra || mitraListData.find(m => m.nama_mitra === k.nama_mitra)?.id_mitra || '';
        pilihMitraKontrak(k.nama_mitra || '');
        kontrakBentukUsahaMitra.value    = k.bentuk_usaha_mitra    || '';
        kontrakNamaPejabatMitra.value    = k.nama_pejabat_mitra    || '';
        kontrakJabatanPejabatMitra.value = k.jabatan_pejabat_mitra || '';
        kontrakDasarJabatanMitra.value   = k.dasar_jabatan_mitra   || '';
        setIndustriKontrakValue(k.industri_mitra || '');
        kontrakDasarPendirianMitra.value = k.dasar_pendirian_mitra || '';
        kontrakAlamatMitra.value         = k.alamat_mitra          || '';
        kontrakKotaMitra.value           = k.kota_mitra            || '';
        kontrakProvinsiMitra.value       = k.provinsi_mitra        || '';
        kontrakNegaraMitra.value         = k.negara_mitra          || '';
        kontrakKodeposMitra.value        = k.kodepos_mitra         || '';
        // Korespondensi Mitra
        kontrakNamaPicKorMitra.value    = k.nama_pic_korespondensi_mitra    || '';
        kontrakJabatanPicKorMitra.value = k.jabatan_pic_korespondensi_mitra || '';
        kontrakKodeTlpMitra.value       = k.kode_tlp_mitra                  || '';
        kontrakNoTlpMitra.value         = k.no_tlp_mitra                    || '';
        kontrakEmailMitra.value         = k.email_mitra                     || '';
        // Profil SBM
        kontrakNamaSbm.value           = k.nama_sbm            || '';
        kontrakNamaPejabatSbm.value    = k.nama_pejabat_sbm    || '';
        kontrakJabatanPejabatSbm.value = k.jabatan_pejabat_sbm || '';
        kontrakDasarJabatanSbm.value   = k.dasar_jabatan_sbm   || '';
        kontrakIndustriSbm.value       = k.industri_sbm        || '';
        kontrakDasarPendirianSbm.value = k.dasar_pendirian_sbm || '';
        kontrakAlamatSbm.value         = k.alamat_sbm          || '';
        kontrakKotaSbm.value           = k.kota_sbm            || '';
        kontrakProvinsiSbm.value       = k.provinsi_sbm        || '';
        kontrakNegaraSbm.value         = k.negara_sbm          || '';
        kontrakKodeposSbm.value        = k.kodepos_sbm         || '';
        // Korespondensi SBM
        kontrakNamaPicKorSbm.value    = k.nama_pic_korespondensi_sbm    || '';
        kontrakJabatanPicKorSbm.value = k.jabatan_pic_korespondensi_sbm || '';
        kontrakKodeTlpSbm.value       = k.kode_tlp_sbm                  || '';
        kontrakNoTlpSbm.value         = k.no_tlp_sbm                    || '';
        kontrakEmailSbm.value         = k.email_sbm                     || '';
        // Waktu Pelaksanaan
        kontrakJangkaAngka.value          = k.jangka_waktu_pelaksanaan_angka_bulan != null ? k.jangka_waktu_pelaksanaan_angka_bulan : '';
        kontrakJangkaKata.value           = k.jangka_waktu_pelaksanaan_kata_bulan  || '';
        kontrakTglAwal.value              = k.tgl_awal_program  || '';
        kontrakTglAkhir.value             = k.tgl_akhir_program || '';
        kontrakPerpanjSemesterAngka.value = k.lama_perpanjangan_angka_semester != null ? k.lama_perpanjangan_angka_semester : '';
        kontrakPerpanjSemesterKata.value  = k.lama_perpanjangan_kata_semester  || '';
        kontrakPerpanjBulanAngka.value    = k.lama_perpanjangan_angka_bulan    != null ? k.lama_perpanjangan_angka_bulan    : '';
        kontrakPerpanjBulanKata.value     = k.lama_perpanjangan_kata_bulan     || '';
        // Jangka Waktu Perjanjian
        kontrakJwKontrakAngka.value     = k.jangka_waktu_kontrak_angka_bulan != null ? k.jangka_waktu_kontrak_angka_bulan : '';
        kontrakJwKontrakKata.value      = k.jangka_waktu_kontrak_kata_bulan  || '';
        kontrakTglBerakhirAngka.value   = k.tgl_berakhir_kontrak_angka   != null ? k.tgl_berakhir_kontrak_angka   : '';
        kontrakBulanBerakhirAngka.value = k.bulan_berakhir_kontrak_angka != null ? k.bulan_berakhir_kontrak_angka : '';
        kontrakTahunBerakhirAngka.value = k.tahun_berakhir_kontrak_angka != null ? k.tahun_berakhir_kontrak_angka : '';
        // Pembiayaan
        kontrakPicPembiayaan.value       = k.pic_pembiayaan           || '';
        kontrakNilaiKontrakAngka.value   = k.nilai_kontrak_angka   != null ? k.nilai_kontrak_angka   : '';
        kontrakNilaiKontrakKata.value    = k.nilai_kontrak_kata        || '';
        kontrakJmlPesertaAngka.value     = k.jumlah_peserta_didik_angka != null ? k.jumlah_peserta_didik_angka : '';
        kontrakJmlPesertaKata.value      = k.jumlah_peserta_didik_kata || '';
        kontrakBppPerPesertaAngka.value  = k.BPP_per_peserta_angka  != null ? k.BPP_per_peserta_angka  : '';
        kontrakBppPerPesertaKata.value   = k.BPP_per_peserta_kata   || '';
        kontrakBppSemPanjangAngka.value  = k.BPP_sem_panjang_angka  != null ? k.BPP_sem_panjang_angka  : '';
        kontrakBppSemPanjangKata.value   = k.BPP_sem_panjang_kata   || '';
        kontrakBppSemPendekAngka.value   = k.BPP_sem_pendek_angka   != null ? k.BPP_sem_pendek_angka   : '';
        kontrakBppSemPendekKata.value    = k.BPP_sem_pendek_kata    || '';
        kontrakBppUlangPanjangAngka.value= k.BPP_ulang_panjang_angka != null ? k.BPP_ulang_panjang_angka : '';
        kontrakBppUlangPendekAngka.value = k.BPP_ulang_pendek_angka != null ? k.BPP_ulang_pendek_angka : '';
        kontrakBppTugasAkhirAngka.value  = k.BPP_tugas_akhir_angka  != null ? k.BPP_tugas_akhir_angka  : '';
        // Rincian BPP
        const rincian = k.rincian_bpp || [];
        for (let i = 0; i < 5; i++) {
            const r = rincian[i] || {};
            document.getElementById(`rincianTahap_${i}`).value  = r.tahap              || '';
            document.getElementById(`rincianBppMhs_${i}`).value = r.BPP_per_mahasiswa != null ? r.BPP_per_mahasiswa : '';
            document.getElementById(`rincianJmlMhs_${i}`).value = k.jumlah_peserta_didik_angka != null ? k.jumlah_peserta_didik_angka : '';
            document.getElementById(`rincianTotal_${i}`).value  = r.total_BPP         != null ? r.total_BPP.toLocaleString('id-ID') : '';
            document.getElementById(`rincianBatas_${i}`).value  = r.batas_pembayaran  || '';
        }
        updateContractDraftState();
    }

    // Submit form (create/update)
    formKontrak.addEventListener('submit', async e => {
        e.preventDefault();
        const data     = ambilDataFormKontrak();
        const isEdit   = !!kontrakIdEdit.value;
        const url      = isEdit ? `/api/kontrak/${kontrakIdEdit.value}` : '/api/kontrak';
        const method   = isEdit ? 'PUT' : 'POST';
        btnSimpanKontrak.disabled = true; btnSimpanKontrak.textContent = 'Menyimpan...';
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const hasil = await res.json();
            if (res.ok) { kembaliKeDaftarKontrak(true); }
            else alert(hasil.pesan || 'Gagal menyimpan kontrak.');
        } catch { alert('Gagal terhubung ke server.'); }
        finally {
            btnSimpanKontrak.textContent = isEdit ? 'Simpan Perubahan' : 'Simpan sebagai Draft';
            updateContractDraftState();
        }
    });

    function hasKontrakValue(value) {
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    function validateRincianBppData(rincian = []) {
        let hasCompleteRow = false;
        const missing = [];
        (Array.isArray(rincian) ? rincian : []).forEach((row, index) => {
            const tahap = hasKontrakValue(row?.tahap);
            const bpp = hasKontrakValue(row?.BPP_per_mahasiswa);
            const batas = hasKontrakValue(row?.batas_pembayaran);
            const any = tahap || bpp || batas;
            const complete = tahap && bpp && batas;
            if (complete) hasCompleteRow = true;
            if (any && !complete) missing.push(`Rincian BPP baris ${index + 1}`);
        });
        if (!hasCompleteRow) missing.push('Minimal satu rincian BPP lengkap');
        return missing;
    }

    function validateKontrakDataLengkap(k = {}) {
        const checks = {
            'Para Pihak': [
                ['id_mitra', 'ID Mitra'],
                ['nama_mitra', 'Nama Mitra'],
                ['nama_pejabat_mitra', 'Nama Pejabat Mitra'],
                ['jabatan_pejabat_mitra', 'Jabatan Pejabat Mitra'],
                ['dasar_jabatan_mitra', 'Dasar Jabatan Mitra'],
                ['bentuk_usaha_mitra', 'Bentuk Usaha Mitra'],
                ['industri_mitra', 'Industri Mitra'],
                ['dasar_pendirian_mitra', 'Dasar Pendirian Mitra'],
                ['alamat_mitra', 'Alamat Mitra'],
                ['kota_mitra', 'Kota Mitra'],
                ['provinsi_mitra', 'Provinsi Mitra'],
                ['negara_mitra', 'Negara Mitra'],
                ['kodepos_mitra', 'Kode Pos Mitra'],
                ['nama_pic_korespondensi_mitra', 'PIC Korespondensi Mitra'],
                ['jabatan_pic_korespondensi_mitra', 'Jabatan PIC Mitra'],
                ['kode_tlp_mitra', 'Kode Tlp. Mitra'],
                ['no_tlp_mitra', 'No. Telepon Mitra'],
                ['email_mitra', 'Email Mitra'],
                ['nama_sbm', 'Nama Institusi SBM'],
                ['nama_pejabat_sbm', 'Nama Pejabat SBM'],
                ['jabatan_pejabat_sbm', 'Jabatan Pejabat SBM'],
                ['dasar_jabatan_sbm', 'Dasar Jabatan SBM'],
                ['industri_sbm', 'Industri SBM'],
                ['dasar_pendirian_sbm', 'Dasar Pendirian SBM'],
                ['alamat_sbm', 'Alamat SBM'],
                ['kota_sbm', 'Kota SBM'],
                ['provinsi_sbm', 'Provinsi SBM'],
                ['negara_sbm', 'Negara SBM'],
                ['kodepos_sbm', 'Kode Pos SBM'],
                ['nama_pic_korespondensi_sbm', 'PIC Korespondensi SBM'],
                ['jabatan_pic_korespondensi_sbm', 'Jabatan PIC SBM'],
                ['kode_tlp_sbm', 'Kode Tlp. SBM'],
                ['no_tlp_sbm', 'No. Telepon SBM'],
                ['email_sbm', 'Email SBM']
            ],
            Program: [
                ['strata_kata', 'Strata'],
                ['prodi', 'Program Studi'],
                ['semester', 'Semester'],
                ['tahun_akademik', 'Tahun Akademik'],
                ['jangka_waktu_pelaksanaan_angka_bulan', 'Jangka Waktu Program'],
                ['tgl_awal_program', 'Tgl. Awal Program'],
                ['tgl_akhir_program', 'Tgl. Akhir Program'],
                ['lama_perpanjangan_angka_semester', 'Lama Perpanjangan Semester'],
                ['lama_perpanjangan_angka_bulan', 'Lama Perpanjangan Bulan'],
                ['jangka_waktu_kontrak_angka_bulan', 'Jangka Waktu Perjanjian'],
                ['tgl_berakhir_kontrak_angka', 'Tgl. Berakhir Kontrak'],
                ['bulan_berakhir_kontrak_angka', 'Bulan Berakhir Kontrak'],
                ['tahun_berakhir_kontrak_angka', 'Tahun Berakhir Kontrak']
            ],
            Pembiayaan: [
                ['pic_pembiayaan', 'PIC Pembiayaan'],
                ['jumlah_peserta_didik_angka', 'Jumlah Peserta Didik'],
                ['nilai_kontrak_angka', 'Nilai Kontrak'],
                ['BPP_per_peserta_angka', 'BPP per Peserta'],
                ['BPP_sem_panjang_angka', 'BPP Semester Panjang'],
                ['BPP_sem_pendek_angka', 'BPP Semester Pendek'],
                ['BPP_ulang_panjang_angka', 'BPP Ulang Sem. Panjang'],
                ['BPP_ulang_pendek_angka', 'BPP Ulang Sem. Pendek'],
                ['BPP_tugas_akhir_angka', 'BPP Tugas Akhir']
            ],
            Administrasi: [
                ['dibuat_oleh', 'Nama Admin'],
                ['no_kontrak_mitra', 'No. Kontrak Mitra'],
                ['no_kontrak_sbm', 'No. Kontrak SBM'],
                ['hari', 'Hari'],
                ['tgl_angka', 'Tanggal TTD'],
                ['bulan_angka', 'Bulan TTD'],
                ['tahun_angka', 'Tahun TTD']
            ]
        };
        const missingByFlow = Object.entries(checks).map(([flow, fields]) => {
            const missing = fields.filter(([field]) => !hasKontrakValue(k[field])).map(([, label]) => label);
            if (flow === 'Pembiayaan') missing.push(...validateRincianBppData(k.rincian_bpp));
            return { flow, missing };
        });
        const incomplete = missingByFlow.filter(row => row.missing.length > 0);
        return {
            valid: incomplete.length === 0,
            incomplete,
            message: incomplete.length
                ? incomplete.map(row => `${row.flow}: ${row.missing.slice(0, 3).join(', ')}`).join(' | ')
                : 'Kontrak lengkap'
        };
    }

    // Load dan render tabel kontrak
    async function loadKontrak() {
        try {
            bodyTabelKontrak.innerHTML = tableState(8, 'loading', 'Memuat kontrak', 'Mengambil draft, approval, dan dokumen siap unduh.');
            const res = await fetch('/api/kontrak');
            const list = await res.json();
            const fmt = iso => {
                if (!iso) return '—';
                const d = new Date(iso);
                return `${d.getDate()} ${NAMA_BULAN[d.getMonth()+1]} ${d.getFullYear()}`;
            };
            const badgeStatus = s => {
                const map = { draft: 'Draft', submitted: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
                return `<span class="badge badge-${s}">${map[s] || s}</span>`;
            };

            bodyTabelKontrak.innerHTML = list.length === 0
                ? tableState(8, 'empty', 'Belum ada kontrak', 'Buat draft kontrak baru untuk memulai workflow persetujuan.')
                : list.map((k, i) => {
                    const tglTTD = k.tgl_angka && k.bulan_angka && k.tahun_angka
                        ? `${k.tgl_angka} ${NAMA_BULAN[k.bulan_angka]} ${k.tahun_angka}` : '—';
                    const isAtasan    = currentUser?.role === 'atasan';
                    const kelengkapan  = validateKontrakDataLengkap(k);
                    const canEdit     = k.status !== 'approved';
                    const canSubmit   = (k.status === 'draft' || k.status === 'rejected') && kelengkapan.valid;
                    const canAttemptSubmit = k.status === 'draft' || k.status === 'rejected';
                    const canApprove  = isAtasan && k.status === 'submitted';
                    const canReject   = isAtasan && k.status === 'submitted';
                    const canDownload = true;
                    return `<tr>
                        <td>${i+1}</td>
                        <td style="font-weight:600;font-size:11px;">${k.id_kontrak}</td>
                        <td>${k.no_kontrak_mitra || '—'}</td>
                        <td>${k.no_kontrak_sbm   || '—'}</td>
                        <td>${tglTTD}</td>
                        <td>${badgeStatus(k.status)}${k.catatan_reviewer && k.status==='rejected' ? `<br><small style="color:#742a2a;font-size:10px;">${k.catatan_reviewer}</small>` : ''}</td>
                        <td>${k.dibuat_oleh || '—'}</td>
                        <td style="white-space:nowrap;">
                            ${canEdit   ? `<button class="btn-aksi btn-edit-kontrak"   data-id="${k.id_kontrak}" title="Edit">✏️</button>` : ''}
                            ${canSubmit ? `<button class="btn-aksi btn-submit-kontrak" data-id="${k.id_kontrak}" title="Submit untuk Approval">📤</button>` : ''}
                            ${canAttemptSubmit && !canSubmit ? `<button class="btn-aksi" disabled title="${esc('Belum bisa submit: ' + kelengkapan.message)}">📤</button>` : ''}
                            ${canApprove? `<button class="btn-aksi btn-approve-kontrak" data-id="${k.id_kontrak}" title="Setujui">✅</button>` : ''}
                            ${canReject  ? `<button class="btn-aksi btn-reject-kontrak"  data-id="${k.id_kontrak}" title="Tolak">❌</button>` : ''}
                            ${canDownload? `<button class="btn-aksi btn-download-kontrak" data-id="${k.id_kontrak}" title="Unduh Dokumen">📄</button>` : ''}
                        </td>
                    </tr>`;
                }).join('');
        } catch { bodyTabelKontrak.innerHTML = tableState(8, 'error', 'Gagal memuat kontrak', 'Periksa koneksi server atau coba kembali beberapa saat lagi.'); }
    }

    // Event delegation untuk aksi di tabel
    document.getElementById('tabelKontrak').addEventListener('click', async e => {
        const btn = e.target.closest('button[data-id]');
        if (!btn) return;
        const id = btn.dataset.id;

        if (btn.classList.contains('btn-edit-kontrak')) {
            const res = await fetch('/api/kontrak');
            const list = await res.json();
            const k = list.find(x => x.id_kontrak === id);
            if (!k) return;
            await loadMitraUntukKontrak(k.nama_mitra);
            isiFormKontrak(k);
            setJudulFormKontrak('Edit Kontrak / PKS', id);
            btnSimpanKontrak.textContent = 'Simpan Perubahan';
            tampilkanFormKontrak();
        }

        if (btn.classList.contains('btn-submit-kontrak')) {
            const resList = await fetch('/api/kontrak');
            const listKontrak = await resList.json();
            const kontrak = listKontrak.find(x => x.id_kontrak === id);
            const kelengkapan = validateKontrakDataLengkap(kontrak || {});
            if (!kelengkapan.valid) {
                alert(`Kontrak belum lengkap dan belum bisa diajukan.\n\n${kelengkapan.message}`);
                return;
            }
            const nama = prompt('Nama admin yang mensubmit:');
            if (!nama) return;
            if (!confirm(`Submit kontrak ${id} untuk persetujuan?`)) return;
            const res = await fetch(`/api/kontrak/${id}/submit`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama_admin: nama })
            });
            const hasil = await res.json();
            alert(hasil.pesan);
            loadKontrak();
        }

        if (btn.classList.contains('btn-approve-kontrak')) {
            if (!confirm(`Setujui kontrak ${id}? Setelah disetujui, kontrak tidak dapat diubah.`)) return;
            const res = await fetch(`/api/kontrak/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            const hasil = await res.json();
            alert(hasil.pesan);
            loadKontrak();
        }

        if (btn.classList.contains('btn-reject-kontrak')) {
            kontrakRejectId = id;
            kontrakCatatanReject.value = '';
            modalRejectKontrak.style.display = 'flex';
        }

        if (btn.classList.contains('btn-download-kontrak')) {
            window.location.href = `/api/kontrak/${id}/download`;
        }
    });

    // Modal reject
    function tutupModalReject() { modalRejectKontrak.style.display = 'none'; kontrakRejectId = null; }
    btnTutupModalReject.addEventListener('click', tutupModalReject);
    btnBatalReject.addEventListener('click', tutupModalReject);
    modalRejectKontrak.addEventListener('click', e => { if (e.target === modalRejectKontrak) tutupModalReject(); });

    btnKonfirmasiReject.addEventListener('click', async () => {
        const catatan = kontrakCatatanReject.value.trim();
        if (!catatan) { alert('Catatan penolakan wajib diisi.'); return; }
        const res = await fetch(`/api/kontrak/${kontrakRejectId}/reject`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ catatan })
        });
        const hasil = await res.json();
        alert(hasil.pesan);
        tutupModalReject();
        loadKontrak();
    });

});
