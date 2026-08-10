# Migrasi Bisnis Kerma ke Supabase (tanpa mongo_) — Urutan yang Harus Diikuti

Dokumen ini dibuat supaya kamu bisa migrate dari `MongoDB + Mongoose` ke `Supabase` secara bertahap tanpa mematikan fitur bisnis.

## Keadaan saat ini
- Backup `kerma-backup-20260810-104237-7664` sudah sukses di-load ke Supabase.
- Tabel aktif yang digunakan sekarang: `users`, `programs`, `mahasiswa`, `mitra`, `industri`, `kontrak`, `cicilan`, `addendum`, `calon_peserta`, `rencana_anggaran`, `realisasi_anggaran`, `pagu_anggaran`, `rab_anggaran`, `realisasi_pembayaran`, `invoice_pembayaran`, `plotting_kerma`, `upload_chunks`, `kerma_sessions`, `kerma_uploads_files`, `kerma_uploads_chunks`.
- Tabel `mongo_*` sudah dihapus.
- Runtime app masih memakai Mongoose, jadi migrasi belum selesai.

## Urutan pengerjaan yang direkomendasikan (WAJIB)

### Fase 0 — Validasi dan penjagaan data (siap sebelum coding)
1. Pastikan import tetap dari backup terbaru sudah konsisten (`supabase-manual-import-report-*`).
2. Catat skenario uji prioritas:
   - Login
   - List Program
   - Tambah Kontrak
   - Upload file
   - Laporan pembayaran
3. Simpan branch backup agar mudah rollback.

**Done criteria Fase 0:** data terbaru aman dan semua anggota tim tahu endpoint uji yang dipakai.

### Fase 1 — Pisahkan layer akses data (adapter) dulu
Tujuan: semua query bisa diarahkan ke satu service, tidak langsung ke Mongoose di seluruh file.

1. Buat folder service baru untuk Supabase repository, contoh:
   - `services/db/supabaseClient.js`
   - `services/repo/baseRepo.js`
   - `services/repo/userRepo.js`
2. Adapter menyediakan method setara Mongoose yang banyak dipakai:
   - `findOne`, `findMany`, `findOneAndUpdate`, `insertOne`, `insertMany`, `deleteOne`, `upsertOne`.
3. Map query ke schema legacy JSONB:
   - `findOne({ username })` => filter `legacy_payload->> 'username' = username`
   - `find({ id_program })` => filter `legacy_payload->> 'id_program' = value`
   - `sort/limit` tetap pakai query options Supabase.

**Done criteria Fase 1:** 1 endpoint login sudah jalan dari adapter, tanpa pemanggilan Mongoose.

### Fase 2 — Ganti entrypoint koneksi dulu (db/server)
**Prioritas tertinggi** karena menentukan lifecycle aplikasi.

1. Edit `db.js`
   - Hapus `mongoose.connect`.
   - Inisialisasi Supabase client.
2. Edit `server.js`
   - Ganti init `connectDB()` menjadi inisialisasi Supabase.
3. Edit `api/index.js`
   - Pastikan API handler menunggu init Supabase.
4. Hilangkan referensi `mongoose.connection.readyState` di flow startup.

**Done criteria Fase 2:** aplikasi dapat start dengan sukses tanpa koneksi Mongo.

### Fase 3 — Auth & session (paling krusial agar fitur bisa dipakai)
1. Edit `app.js` bagian login/logout + middleware.
2. Ganti `express-session + connect-mongo` menjadi alternatif non-Mongo:
   - opsi cepat: JWT + cookie aman
   - opsi stabil: table-based session di PostgreSQL.
3. Pastikan mekanisme `requireApiSession` tetap menjaga akses.
4. Sementara kamu masih pakai user dari tabel `users` di Supabase, gunakan `bcrypt` seperti saat ini.

**Done criteria Fase 3:** endpoint login/logout/middleware akses jalan normal di Supabase.

### Fase 4 — Ganti model/domain core pertama (minimal agar alur bisnis jalan)
Ubah urutan ini di `app.js` + model terkait:
1. `models/User.js`
2. `models/Program.js`
3. `models/Mahasiswa.js`
4. `models/Kontrak.js`
5. `models/Cicilan.js`
6. `models/PlottingKerma.js`

Yang dikerjakan pada masing-masing model:
- Hilangkan `mongoose.model(...)` runtime.
- Delegasikan method ke adapter repository.
- Pastikan field penting (`_id`, status, tanggal) dipetakan dari `legacy_id` dan `legacy_payload`.

**Done criteria Fase 4:** dashboard utama, daftar program/mahasiswa/kontrak, dan flow tambah data inti berfungsi.

### Fase 5 — CRUD dan rule bisnis keuangan/anggaran
Urutan berikutnya yang rawan bug:
1. `models/RealisasiPembayaran.js`
2. `models/RencanaAnggaran.js`
3. `models/RabAnggaran.js`
4. `models/PaguAnggaran.js`
5. `models/RealisasiAnggaran.js`
6. `models/InvoicePembayaran.js`

Fokus perubahan:
- replace `find`/`findOne`/`update` ke query JSONB yang konsisten
- pastikan urutan sort (`tanggal`, `no_cicilan`, `createdAt`) sama hasilnya.

**Done criteria Fase 5:** fitur laporan keuangan tidak berubah hasilnya dibanding baseline.

### Fase 6 — Fitur pendukung yang belum ditangani
1. `models/Mitra.js`
2. `models/Industri.js`
3. `models/Addendum.js`
4. `models/CalonPeserta.js`
5. `models/UploadChunk.js`

**Done criteria Fase 6:** sisa fitur CRUD biasa tetap lancar.

### Fase 7 — Upload file dari GridFS ke Supabase Storage
1. Edit bagian upload/download di `app.js`.
2. Ganti operasi `GridFSBucket` untuk `kerma_uploads.files/chunks`.
3. Simpan metadata ke tabel (mis. `kerma_uploads_files`, `kerma_uploads_chunks`).
4. Pastikan path public download tetap kompatibel.

**Done criteria Fase 7:** upload dan download kontrak/addendum berfungsi normal.

### Fase 8 — Health/monitoring dan observabilitas
1. Edit endpoint readiness/health di `app.js`.
2. Hapus status Mongo (mis. `mongoose.connection.readyState`).
3. Tambahkan health check ke Supabase (`SELECT 1`/ping table).

**Done criteria Fase 8:** halaman siap dan monitoring menampilkan status Supabase aktif.

### Fase 9 — Config + cleanup runtime
1. Atur env akhir:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PROJECT_REF`
   - (opsional) `SUPABASE_DB_URL`
2. Nonaktifkan konfigurasi runtime Mongo (`MONGODB_URI`, `MONGO_*`).
3. Update `package.json` dependencies jika perlu.

**Done criteria Fase 9:** runtime tidak lagi membutuhkan driver Mongo untuk request biasa.

### Fase 10 — Uji akhir dan cutover
1. Jalankan smoke test penuh pada semua endpoint prioritas.
2. Bandingkan jumlah record kritis (sebelum/sesudah) untuk mencegah kehilangan data.
3. Setelah stabil, deploy dan hapus route fallback lama.

**Done criteria Fase 10:** siap produksi (tanpa dependency Mongo aktif).

## Urutan file yang harus dikerjakan

### Paling awal (harus selesai dulu)
- `db.js`
- `server.js`
- `api/index.js`
- `app.js`

### Core model/business
- `models/User.js`
- `models/Program.js`
- `models/Mahasiswa.js`
- `models/Kontrak.js`
- `models/Cicilan.js`
- `models/PlottingKerma.js`
- `models/RealisasiPembayaran.js`
- `models/RencanaAnggaran.js`
- `models/RabAnggaran.js`
- `models/PaguAnggaran.js`
- `models/RealisasiAnggaran.js`
- `models/InvoicePembayaran.js`
- `models/Addendum.js`
- `models/CalonPeserta.js`
- `models/Mitra.js`
- `models/Industri.js`
- `models/UploadChunk.js`

## Catatan teknis penting
- Bentuk data saat ini adalah legacy JSONB (`legacy_collection`, `legacy_id`, `legacy_payload`).
- Query tidak otomatis secepat skema relasional penuh.
- Setelah fase ini stabil, lanjutkan normalisasi ke tabel relasional agar performa jangka panjang lebih baik.
