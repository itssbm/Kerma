# Checklist Deploy Vercel (MongoDB + Keamanan) — Kerma

## 1) Env vars yang wajib (Vercel → Project Settings → Environment Variables)

- `NODE_ENV=production`
- `MONGODB_URI` (URI lengkap koneksi MongoDB Atlas)
- `SESSION_SECRET` (random panjang minimal 32 karakter)
- `ALLOWED_ORIGINS=https://<your-vercel-domain>`
- `TRUST_PROXY_COUNT=1`
- `MONGO_FILE_BUCKET=kerma_uploads`
- `FILE_UPLOAD_MAX_BYTES=15728640` (15 MB)
- `FILE_UPLOAD_CHUNK_BYTES=2097152` (2 MB, aman di bawah limit request Vercel)
- `FILE_UPLOAD_CHUNK_TTL_MS=3600000` (chunk sementara dibersihkan otomatis setelah 1 jam)
- `API_RATE_LIMIT_WINDOW_MS=60000`
- `API_RATE_LIMIT_MAX=120`
- `API_RATE_LIMIT_LOGIN_MAX=20`
- `API_RATE_USE_REDIS=true`
- `API_RATE_REDIS_URL=<upstash_redis_url_atau_redis_url>`
- `AUDIT_ENABLED=true`
- `SESSION_TTL_SECONDS=28800`
- `MONGO_SESSION_COLLECTION=kerma_sessions`

Opsional:
- `MONGODB_TLS_CA_FILE`
- `MONGODB_DNS_FAMILY`
- `MONGODB_TLS_ALLOW_INVALID_CERTIFICATES` *(harus `false` di production)*
- `MONGODB_MAX_POOL_SIZE=5`
- `MONGODB_MAX_IDLE_TIME_MS=30000`
- `VERCEL_URL` (otomatis dari platform, biasanya tidak perlu set manual)

## 2) Konfigurasi Atlas MongoDB

- Gunakan user khusus app (least privilege).
- Akses hanya ke database aplikasi.
- Cek network access:
  - Vercel biasanya butuh akses internet umum yang sesuai.
  - Jika ACL IP ketat, sesuaikan dengan jangkauan IP egress Vercel.
- Aktifkan/cek TLS 1.2+.

## 3) Verifikasi endpoint sebelum traffic real

- Pastikan Project Settings memakai Node.js `22.x`.
- Pastikan Fluid Compute aktif; `vercel.json` menetapkan durasi maksimum function 300 detik.
- `GET /healthz`
- `GET /readyz`
- `GET /api/health`
- `GET /api/ready`
- `POST /api/login` (uji login normal)
- `POST /api/upload-kontrak` (uji upload kecil yang valid)
- `POST /api/upload-chunk` (otomatis dipakai browser untuk file di atas 2 MB)
- `GET /uploads/kontrak/<filename>` (uji akses via session login)

Harus ada header:
- `X-Request-Id` pada response API
- `Cache-Control: no-store` pada API (dari config Vercel)

## 4) Session & auth state (wajib dicek)

- Pastikan `connect-mongo` aktif (memerlukan `npm install`) dan `MONGODB_URI` valid.
- Pastikan sesi tidak lagi memakai MemoryStore bawaan.
- Pastikan `SESSION_SECRET` dan `SESSION_TTL_SECONDS` sesuai kebijakan organisasi.

## 5) Hardening final (wajib dicek)

- `SESSION_SECRET` tidak default.
- `MONGODB_TLS_ALLOW_INVALID_CERTIFICATES` tidak pernah `true` di production.
- Endpoint mutating selain GET/HEAD/OPTIONS wajib valid origin jika `ALLOWED_ORIGINS` diisi.
- Jika API dipakai publik, pertimbangkan:
  - IP allowlist di WAF/Firewall eksternal
- Cek rate limit:
  - login tidak boleh 429 normalnya di kondisi normal test.

## 6) Rollback plan

- Simpan commit/versi yang sebelumnya stabil.
- Jika error setelah deploy:
  1. Lihat log di Vercel + `requestId` dari response
  2. Cek `/api/ready` untuk status Mongo
  3. Revert domain variable terkait yang kritikal (`SESSION_SECRET`, `MONGODB_URI`)
  4. Redeploy versi stabil terakhir.

## 7) Catatan penting Vercel + file

- Upload sudah pindah ke MongoDB GridFS (`simpanFileKontrak`, `simpanFileAddendum`) agar tidak bergantung ke disk lokal.
- File hingga 15 MB dikirim bertahap per 2 MB agar tidak melampaui batas request function.
- Chunk sementara tersimpan di collection `upload_chunks` dan memiliki TTL otomatis.
- Rendering PDF laporan memakai PDF.js + `@napi-rs/canvas`, tidak lagi membutuhkan Swift/AppKit.
- File baru tidak ditulis ke disk deployment; penyimpanan persisten memakai GridFS.
- Endpoint lama `/uploads/...` tetap dipakai dan diarahkan ke Express untuk file GridFS.
- `public/uploads/` hanya dipertahankan sebagai fallback file historis. Migrasikan isinya ke GridFS sebelum folder legacy tersebut dihapus dari deployment.
