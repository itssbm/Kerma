# SPESIFIKASI SISTEM OTOMATISASI DOKUMEN PKS (CONTRACT AUTOMATION SPECIFICATION)

## 1. RINGKASAN & PRINSIP DESAIN SISTEM

Sistem ini bertugas mengotomatiskan pembuatan draf Perjanjian Kerja Sama (PKS) berdasarkan 4 master template baku. Untuk menangani variasi PKS yang berbeda-beda di lapangan, sistem menerapkan 3 prinsip utama:
1. **Dynamic Party Position**: SBM ITB dapat bertindak sebagai PIHAK PERTAMA atau PIHAK KEDUA tergantung struktur kesepakatan.
2. **Multi-Signatory Support**: Mendukung lebih dari 1 penandatangan dalam satu pihak (contoh: Kuasa Direksi ganda pada PKS Danamon).
3. **Conditional Logic Blocks**: Pasal-pasal tertentu (seperti Skema Pembayaran, HKI, dan Implementation Agreement) dirender berdasarkan input opsi dari Admin.

---

## 2. VARIABEL UMUM / UNIVERSAL SCHEMA (ADA DI SEMUA KATEGORI)

Setiap PKS wajib mengumpulkan data dasar berikut sebelum masuk ke variabel spesifik kategori:

### A. Header & Identitas Perjanjian
- `posisi_sbm_itb`: Enum [`PIHAK_PERTAMA`, `PIHAK_KEDUA`] (Default: `PIHAK_KEDUA`)
- `nomor_pks_pihak_1`: String (Nomor internal Mitra/Pihak 1)
- `nomor_pks_pihak_2`: String (Nomor internal SBM ITB)
- `judul_perjanjian_tambahan`: String (Materi spesifik setelah kata TENTANG, contoh: *"Sinergi Pendidikan, Penelitian, dan Peningkatan Daya Saing Daerah"*)
- `tanggal_penandatanganan`: Date (Otomatis dikonversi ke format terbilang legal, misal: *"Jumat, tanggal sembilan belas bulan Desember tahun dua ribu dua puluh lima"* / `19-12-2025`)
- `tempat_penandatanganan`: String (Contoh: *"Bandung"*, *"Mataram"*, *"Jakarta"*)

### B. Komparisi Pihak 1 & Pihak 2 (Multi-Penandatangan)
Setiap pihak berupa *Array of Objects* untuk mengakomodasi penandatangan tunggal maupun gabungan/kuasa:
- `pihak_1` / `pihak_2`:
  - `nama_instansi_lembaga`: String (contoh: *"PT Bank Danamon Indonesia Tbk"*, *"Pemerintah Kota Palu"*)
  - `jenis_lembaga`: Enum [`Perseroan Terbatas`, `Perguruan Tinggi Negeri`, `Pemerintah Daerah`, `Yayasan`, `Lainnya`]
  - `alamat_lengkap_instansi`: String
  - `kode_pos`: String
  - `penandatangan_list`: Array of Objects:
    - `nama_lengkap`: String (dengan gelar)
    - `jabatan`: String (contoh: *"Learning, Engagement & Corporate University Head"*, *"Wali Kota Palu"*, *"Dekan"*)
    - `dasar_kewenangan_legalitas`: String (contoh: *"Akta Kuasa No. 80 tanggal 26 Oktober 2022 di hadapan Notaris Mala Mukti, S.H."* / *"Keputusan Rektor No. 1019/IT1.A/SK-KP/2025"* / *"Keputusan Mendagri No. 100.2.1.3-1719 Tahun 2025"*)

### C. Korespondensi & Operational PIC (Pasal Surat Menyurat)
- `korespondensi_pihak_1` & `korespondensi_pihak_2`:
  - `unit_pengelola_up`: String (contoh: *"Sekolah Bisnis dan Manajemen"*, *"Bagian Pemerintahan"*)
  - `alamat_surat`: String
  - `nama_pic`: String
  - `nomor_telepon_hp`: String
  - `email_resmi`: String

### D. Ketentuan Hukum & Jangka Waktu
- `jangka_waktu_nilai`: Number (contoh: `3`, `5`, `48`)
- `jangka_waktu_satuan`: Enum [`Tahun`, `Bulan`]
- `tanggal_mulai_berlaku`: Date
- `tanggal_berakhir`: Date
- `tenggat_notifikasi_perpanjangan`: Number (contoh: `30` hari, `2` bulan, `3` bulan)
- `forum_penyelesaian_perselisihan`: String (Default: *"Kantor Kepaniteraan Pengadilan Negeri Bandung Kelas 1A Khusus"*)

---

## 3. VARIABEL FORM KHUSUS PER KATEGORI (EXHAUSTIVE FORM FIELDS)

### KATEGORI 1: PKS PENDIDIKAN (Acuan File: `PKS Pendidikan.pdf` - Bank Danamon)
Digunakan khusus untuk penyelenggaraan kelas kerja sama, beasiswa, atau program magister/eksekutif.

- **Detail Program Studi & Akademik**:
  - `nama_program_studi`: String (contoh: *"Program Studi Magister Administrasi Bisnis"*)
  - `nama_kelas_batch`: String (contoh: *"BLEMBA 39 Jakarta"*)
  - `tahun_akademik_penerimaan`: String (contoh: *"Semester 2 Tahun Akademik 2025/2026"*)
  - `lokasi_perkuliahan`: Enum [`Kampus ITB Bandung`, `Kampus ITB Jakarta`, `In-House Mitra`, `Hybrid/Online`]
  - `jadwal_hari_perkuliahan`: String (contoh: *"Sabtu dan Minggu"*)
  - `durasi_studi_normal_bulan`: Number (contoh: `18`)
  - `durasi_studi_maksimum_tahun`: Number (contoh: `4` tahun / `8` semester)
  - `persyaratan_minimum_peserta`: String (contoh: *"Wajib memiliki sertifikat TOEFL/English proficiency dan TPA sesuai standar ITB"*)
  - `unit_pengawas_mutu`: String (Default: *"Gugus Kendali Mutu SBM ITB"*)

- **Keuangan & Skema Pembayaran BPP**:
  - `jumlah_peserta_didik_penerima_beasiswa`: Number (contoh: `4`)
  - `biaya_bpp_per_peserta`: Number (contoh: `126150000`)
  - `bpp_semester_panjang`: Number (opsional)
  - `bpp_semester_panjang_terbilang`: String (otomatis)
  - `bpp_semester_pendek`: Number (opsional)
  - `bpp_semester_pendek_terbilang`: String (otomatis)
  - `bpp_ulang_semester_panjang`: Number (opsional)
  - `bpp_ulang_semester_panjang_terbilang`: String (otomatis)
  - `bpp_ulang_semester_pendek`: Number (opsional)
  - `bpp_ulang_semester_pendek_terbilang`: String (otomatis)
  - `bpp_tugas_akhir`: Number (opsional)
  - `bpp_tugas_akhir_terbilang`: String (otomatis)
  - `total_biaya_pendidikan`: Number (Kalkulasi otomatis: `jumlah_peserta` x `biaya_per_peserta`)
  - `total_komponen_biaya_lain_pendidikan`: Number (Kalkulasi otomatis: penjumlahan seluruh total komponen biaya lain)
  - `nilai_kontrak`: Number (Kalkulasi otomatis: `total_biaya_pendidikan` + `total_komponen_biaya_lain_pendidikan`)
  - `komponen_biaya_lain_pendidikan`: Array of Objects:
    - `nama_komponen`: String
    - `volume`: Number
    - `satuan`: String
    - `harga`: Number
    - `total`: Number (Kalkulasi otomatis: `volume` x `harga`)
  - `status_pajak`: String (contoh: *"Ditanggung oleh masing-masing Pihak sesuai regulasi yang berlaku"*)
  - `skema_pembayaran_termin`: Array of Objects:
    - `termin_ke`: String (contoh: *"Termin I / Semester 2 2025/2026"*)
    - `total_pembayaran`: Number
    - `batas_akhir_pembayaran`: Date
  - `rekening_penerima_pembayaran`:
    - `nama_bank`: String (contoh: *"PT BNI (Persero) Tbk"*)
    - `kantor_cabang`: String (contoh: *"KCP Perguruan Tinggi Bandung"*)
    - `alamat`: String (contoh: *"Jl. Tamansari No 80"*)
    - `nomor_virtual_account`: String
    - `nama_rekening_va`: String

---

### KATEGORI 2: PKS MITRA INDUSTRI (Acuan File: `PKS Mitra Industri.pdf` - PT Adecco)
Digunakan untuk kemitraan korporasi, rekrutmen, magang, *knowledge partner*, dan *executive education*.

- **Konsiderans & Fokus Industri**:
  - `profil_singkat_mitra_industri`: String (contoh: *"Perseroan Terbatas yang menyediakan solusi Sumber Daya Manusia"*)
  - `skema_pendanaan_industri`: Enum [`Nirbiaya (Beban Masing-masing)`, `Sponsor / Investasi Industri`, `Kontrak Terpisah (Adendum/IA)`]

- **Detail Ruang Lingkup (Checkbox + Custom Input)**:
  - `is_knowledge_partner`: Boolean (Dosen tamu, lokakarya, employer branding, kunjungan industri)
  - `is_pengembangan_kurikulum`: Boolean (Penyusunan materi kuliah bersama industri)
  - `is_rekrutmen_magang`: Boolean (Peluang kerja & program magang mahasiswa)
  - `is_aacsb_esg_support`: Boolean (Dukungan akreditasi AACSB untuk dampak sosial & lingkungan)
  - `is_executive_education`: Boolean (Program magister/in-house training karyawan)
  - `ruang_lingkup_kustom`: Array of Strings (Point tambahan di luar opsi standar)

- **Tugas Spesifik Mitra Industri**:
  - `daftar_tugas_mitra`: Array of Strings (Daftar kewajiban spesifik yang diminta industri)
- **Klausul Perlindungan Korporasi**:
  - `is_non_hubungan_kerja_clause`: Boolean (Default: `True` - Membebaskan ITB dari tanggung jawab ketenagakerjaan karyawan mitra)
  - `is_confidentiality_strict`: Boolean (Pengaturan perlindungan data rahasia bisnis)

---

### KATEGORI 3: PKS MITRA KAMPUS (Acuan File: `PKS Mitra Kampus.docx` - FEB Unram)
Digunakan untuk kerja sama antar-Perguruan Tinggi (PTN/PTS) skala nasional maupun internasional.

- **Status Akademik & Tridharma**:
  - `nama_fakultas_unit_mitra`: String (contoh: *"Fakultas Ekonomi dan Bisnis Universitas Mataram"*)
  - `sk_pendirian_pengangkatan_pimpinan_mitra`: String
  - `program_studi_terlibat_pihak_1`: Array of Strings (contoh: `["Manajemen", "Kewirausahaan", "Akuntansi"]`)
  - `program_studi_terlibat_pihak_2`: Array of Strings (contoh: `["S1 Manajemen SBM ITB", "S1 Kewirausahaan SBM ITB"]`)

- **Rincian Hak & Kewajiban Spesifik (Simetris Tridharma)**:
  - `fokus_pendidikan`: List/Text (Pertukaran mahasiswa, credit transfer, kuliah tamu, seminar)
  - `fokus_penelitian`: List/Text (Joint research, pertukaran data, kolaborasi penulisan jurnal ilmiah)
  - `fokus_pengabdian_masyarakat`: List/Text (Pemberdayaan masyarakat bersama, penerapan inovasi)
  - `fokus_publikasi`: List/Text (Hak mencantumkan logo/nama institusi, diseminasi ilmiah)
- **Struktur Tim Pelaksana (Joint Committee)**:
  - `ketentuan_tim_pelaksana`: String (Aturan pembentukan tim kerja bersama antara kedua kampus)

---

### KATEGORI 4: PKS MITRA PEMERINTAH (Acuan File: `PKS Mitra Pemerintah.docx` - Pemkot Palu)
Digunakan untuk kerja sama dengan Kementerian, Lembaga Pemerintah Non-Kementerian (LPNK), atau Pemerintah Daerah (Pemprov/Pemkot/Pemkab).

- **Legalitas Kebijakan & Pemerintahan**:
  - `sk_pengangkatan_kepala_daerah_pejabat`: String (contoh: *"Keputusan Menteri Dalam Negeri Nomor: 100.2.1.3-1719 Tahun 2025"*)
  - `dasar_hukum_daerah`: Array of Strings (Landasan UU, Perda, atau Permen yang melandasi kerja sama)
  - `perangkat_daerah_pelaksana_mitra`: String (contoh: *"Dinas Koperasi & UMKM / Bappeda Pemerintah Kota Palu"*)

- **Fokus Program Pembangunan Daerah**:
  - `nama_program_inovasi_daerah`: String (contoh: *"Penelitian Pengembangan SADULUR / Transformasi Digital UMKM"*)
  - `fokus_kegiatan_pemerintah`: Array of Strings:
    - Penelitian & kajian pengembangan potensi daerah
    - Pendampingan UMKM & Ekonomi Kreatif
    - Transformasi digital & teknologi tepat guna
    - Penyusunan Rekomendasi Kebijakan (*Policy Brief*)
- **Mekanisme Legal Lanjutan & HKI**:
  - `is_membutuhkan_implementation_agreement`: Boolean (Default: `True` - Mengharuskan turunan berupa IA antar-Program Studi & Perangkat Daerah)
  - `skema_kepemilikan_hki`: Enum [`Milik Bersama (Joint IP)`, `Perjanjian Terpisah`, `Sesuai Kontribusi`]
  - `frekuensi_evaluasi`: Enum [`Tahunan`, `Semesteran`]

---

## 4. LOGIKA KONDISIONAL & RULES ENGINE (.DOCX TEMPLATING)

Sistem akan memilih file `.docx` template baku berdasarkan `kategori_pks`, lalu mengeksekusi logika rendering berikut:

1. **Posisi Pihak (Pihak I vs Pihak II)**:
   - Jika `posisi_sbm_itb == "PIHAK_PERTAMA"`, maka penandatangan SBM ITB dicetak pada blok `PIHAK PERTAMA` di awal dan akhir dokumen.
2. **Skema Pembiayaan (Berbiaya vs Nirbiaya)**:
   - Jika `kategori_pks == "PKS_PENDIDIKAN"`, cetak **Pasal BPP**, **Tabel Termin Pembayaran**, dan **Detail Rekening Bank**.
   - Jika `kategori_pks == "PKS_MITRA_INDUSTRI"` atau `"PKS_MITRA_PEMERINTAH"`, cetak pasal *"Biaya yang timbul dibahas lebih lanjut dalam perjanjian/kontrak terpisah (Implementation Agreement)"*.
3. **Multi-Penandatangan**:
   - Jika `penandatangan_list.length > 1`, sistem akan merender paragraf komparisi berbentuk kolektif (seperti pada PKS Danamon) serta membuat kolom tanda tangan berdampingan/sejajar.

---

## 5. REKOMENDASI TECH STACK IMPLEMENTASI

- **Frontend Form**: Next.js / React + `react-hook-form` + `zod` (untuk validasi skema form dinamis per kategori).
- **Document Engine**: `docxtemplater` + `pizzip` (di Node.js Backend) untuk injeksi variabel JSON ke file `.docx`.
- **Convetor Engine**: `libreoffice-convert` / Docker `gotenberg` untuk merender draf `.docx` menjadi `.pdf` siap preview.

---

## 6. PETUNJUK UNTUK AI ASSISTANT (VS CODE INSTRUCTIONS)

Ketika memproses tugas kode berdasarkan file ini, AI harus mengikuti urutan berikut:
1. **Langkah 1**: Buat Zod Schema (`pksValidationSchema.ts`) yang mencakup Universal Schema dan Discriminated Union untuk 4 form khusus di atas.
2. **Langkah 2**: Siapkan *sample payload JSON* untuk masing-masing kategori PKS berdasarkan data aktual di file PDF/DOCX acuan.
3. **Langkah 3**: Buat *Server Action / API Route* untuk menerima payload JSON dan menyuntikkannya ke file master template `.docx`.
4. **Langkah 4**: Buat komponen UI Form Builder dengan Tab/Dropdown pemilihan kategori yang otomatis merender field spesifik sesuai skema.
