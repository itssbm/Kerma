# Checklist Deploy Vercel (MongoDB + Keamanan) — Kerma

## 1) Env vars yang wajib (Vercel → Project Settings → Environment Variables)

- `NODE_ENV=production`
- `MONGODB_URI` (URI lengkap koneksi MongoDB Atlas)
- `SESSION_SECRET` (random panjang minimal 32 karakter)
- `ALLOWED_ORIGINS=https://<your-vercel-domain>`
- `TRUST_PROXY_COUNT=1`
- `MONGO_FILE_BUCKET=kerma_uploads`
- `FILE_UPLOAD_MAX_BYTES=15728640` (15 MB)
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
- `MONGODB_MAX_POOL_SIZE=10`
- `VERCEL_URL` (otomatis dari platform, biasanya tidak perlu set manual)

## 2) Konfigurasi Atlas MongoDB

- Gunakan user khusus app (least privilege).
- Akses hanya ke database aplikasi.
- Cek network access:
  - Vercel biasanya butuh akses internet umum yang sesuai.
  - Jika ACL IP ketat, sesuaikan dengan jangkauan IP egress Vercel.
- Aktifkan/cek TLS 1.2+.

## 3) Verifikasi endpoint sebelum traffic real

- `GET /healthz`
- `GET /readyz`
- `GET /api/health`
- `GET /api/ready`
- `POST /api/login` (uji login normal)
- `POST /api/upload-kontrak` (uji upload kecil yang valid)
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
- `app.js` tidak lagi serve folder upload sebagai static publik.
- Endpoint lama `/uploads/...` tetap dipakai tapi di-guard oleh session login.
