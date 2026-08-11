const path = require('path');

const configuredEnvPath = process.env.DOTENV_CONFIG_PATH
    ? path.resolve(process.cwd(), process.env.DOTENV_CONFIG_PATH)
    : path.resolve(__dirname, '.env');

require('dotenv').config({
    path: [configuredEnvPath, path.resolve(__dirname, '../.env')]
});
const express    = require('express');
const bcrypt     = require('bcryptjs');
const ExcelJS    = require('exceljs');
const PizZip     = require('pizzip');
const Docxtemplater = require('docxtemplater');
const AdmZip     = require('adm-zip');
const fs         = require('fs');
const os         = require('os');
const { execFileSync } = require('child_process');
const crypto     = require('crypto');
const Redis = require('ioredis');

const Program      = require('./models/Program');
const Mahasiswa    = require('./models/Mahasiswa');
const Mitra        = require('./models/Mitra');
const Industri     = require('./models/Industri');
const Cicilan      = require('./models/Cicilan');
const Addendum     = require('./models/Addendum');
const CalonPeserta = require('./models/CalonPeserta');
const Kontrak      = require('./models/Kontrak');
const UserRepo     = require('./services/repo/userRepo');
const RencanaAnggaran = require('./models/RencanaAnggaran');
const RabAnggaran = require('./models/RabAnggaran');
const PaguAnggaran = require('./models/PaguAnggaran');
const RealisasiAnggaran = require('./models/RealisasiAnggaran');
const RealisasiPembayaran = require('./models/RealisasiPembayaran');
const InvoicePembayaran = require('./models/InvoicePembayaran');
const PlottingKerma = require('./models/PlottingKerma');
const UploadChunk = require('./models/UploadChunk');
const {
    uploadAppFile,
    streamAppFileToResponse,
    prepareAppPdfLocal
} = require('./services/storage/supabaseStorage');
const {
    request: supabaseRequest,
    SUPABASE_URL,
    SCHEMA: SUPABASE_SCHEMA
} = require('./services/db/supabaseClient');
const userRepo = new UserRepo();
const isProd = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || (isProd ? '' : 'kerma-sbm-itb-secret-2024');
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'kerma_session';
const TRUST_PROXY_COUNT = Number(process.env.TRUST_PROXY_COUNT || 1);
const API_RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60 * 1000);
const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX || (isProd ? 120 : 300));
const API_RATE_LIMIT_LOGIN_MAX = Number(process.env.API_RATE_LIMIT_LOGIN_MAX || (isProd ? 20 : 60));
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 8 * 60 * 60);
const AUDIT_ENABLED = String(process.env.AUDIT_ENABLED || (isProd ? 'true' : 'false')).toLowerCase() === 'true';
const API_RATE_REDIS_URL = process.env.API_RATE_REDIS_URL || process.env.REDIS_URL || '';
const API_RATE_USE_REDIS = String(process.env.API_RATE_USE_REDIS || (isProd ? 'true' : 'false')).toLowerCase() === 'true';
const ALLOWED_ORIGINS = new Set(
    (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
);
const apiRateMap = new Map();
let rateLimitRedis = null;
let nextApiRateCleanupAt = 0;

function cleanupApiRateMap(now = Date.now()) {
    if (now < nextApiRateCleanupAt) return;
    for (const [key, item] of apiRateMap.entries()) {
        if (!item || now > item.reset) apiRateMap.delete(key);
    }
    nextApiRateCleanupAt = now + Math.max(10_000, API_RATE_LIMIT_WINDOW_MS);
}

if (API_RATE_USE_REDIS && API_RATE_REDIS_URL) {
    try {
        if (!/^rediss?:\/\//i.test(API_RATE_REDIS_URL)) {
            throw new Error('API_RATE_REDIS_URL harus memakai protokol redis:// atau rediss://.');
        }
        rateLimitRedis = new Redis(API_RATE_REDIS_URL, {
            connectTimeout: 5000,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            retryStrategy: times => times <= 3 ? Math.min(times * 200, 1000) : null
        });
        rateLimitRedis.on('error', (err) => {
            console.error('Redis rate limit error:', err?.message || err);
        });
        rateLimitRedis.on('end', () => { rateLimitRedis = null; });
        rateLimitRedis.on('ready', () => console.log('Rate limit Redis siap.'));
    } catch (e) {
        console.error('Gagal inisialisasi Redis limiter:', e?.message || e);
        rateLimitRedis = null;
    }
}

process.once('SIGTERM', () => {
    try { rateLimitRedis?.disconnect(); } catch {}
});

async function checkRateLimitWithRedis(req, limitKey, limit) {
    const bucket = Math.floor(Date.now() / API_RATE_LIMIT_WINDOW_MS);
    const redisKey = `rate:${bucket}:${limitKey}`;
    const count = await rateLimitRedis.incr(redisKey);
    if (count === 1) {
        await rateLimitRedis.pexpire(redisKey, API_RATE_LIMIT_WINDOW_MS);
    }
    const ttlMs = await rateLimitRedis.pttl(redisKey);
    const resetTs = Date.now() + Math.max(0, ttlMs);
    return { hits: count, limit, resetTs, remaining: Math.max(0, limit - count) };
}

function checkRateLimitInMemory(req, limitKey, limit) {
    const now = Date.now();
    cleanupApiRateMap(now);
    const entry = apiRateMap.get(limitKey) || { reset: now + API_RATE_LIMIT_WINDOW_MS, hits: 0 };
    if (now > entry.reset) {
        entry.reset = now + API_RATE_LIMIT_WINDOW_MS;
        entry.hits = 0;
    }
    entry.hits += 1;
    apiRateMap.set(limitKey, entry);
    return {
        hits: entry.hits,
        limit,
        resetTs: entry.reset,
        remaining: Math.max(0, limit - entry.hits)
    };
}

function generateRequestId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.floor(Math.random() * 1e9).toString(16)}`;
}

function auditSafeIp(req) {
    if (!req.ip) return 'unknown';
    return crypto.createHash('sha256').update(req.ip).digest('hex').slice(0, 12);
}

function logApiAudit(req, statusCode, durationMs) {
    if (!AUDIT_ENABLED) return;
    const payload = {
        ts: new Date().toISOString(),
        rid: req.requestId,
        ip: auditSafeIp(req),
        method: req.method,
        path: req.path,
        status: statusCode,
        user: req.session?.user ? String(req.session.user.username || req.session.user.id || 'authenticated') : 'guest',
        durationMs
    };
    console.log('AUDIT', JSON.stringify(payload));
}

if (isProd && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET wajib diset di production untuk keamanan session.');
}

const app = express();
app.use(express.json({ limit: '20mb' }));
app.set('trust proxy', TRUST_PROXY_COUNT);
const INDEX_HTML_PATH = path.join(__dirname, 'public', 'app.html');
const LOGIN_HTML_PATH = path.join(__dirname, 'public', 'login.html');
let indexHtmlCache = null;
let loginHtmlCache = null;

function bacaHtmlBundle(filePath, cacheName) {
    const mtimeMs = fs.statSync(filePath).mtimeMs;
    if (cacheName === 'index' && indexHtmlCache?.mtimeMs === mtimeMs) return indexHtmlCache.html;
    if (cacheName === 'login' && loginHtmlCache?.mtimeMs === mtimeMs) return loginHtmlCache.html;
    const html = fs.readFileSync(filePath, 'utf8');
    if (cacheName === 'index') indexHtmlCache = { mtimeMs, html };
    if (cacheName === 'login') loginHtmlCache = { mtimeMs, html };
    return html;
}

function kirimHtmlBundle(res, filePath, cacheName) {
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.type('html').send(bacaHtmlBundle(filePath, cacheName));
}

async function pingSupabase() {
    await supabaseRequest('users', {
        method: 'GET',
        query: {
            select: 'legacy_id',
            limit: 1
        },
        headers: {
            Prefer: 'return=representation'
        },
        timeoutMs: 8000
    });
}

function buildSupabaseStatusPayload(extra = {}) {
    const host = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : '';
    return {
        provider: 'supabase',
        status: 'active',
        host,
        schema: SUPABASE_SCHEMA || 'public',
        ...extra
    };
}

async function safeMongoRead(label, reader, fallbackValue = []) {
    return reader();
}

function toBase64Url(value) {
    return Buffer.from(value)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function fromBase64Url(value) {
    const normalized = String(value || '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    return Buffer.from(padded, 'base64').toString('utf8');
}

function signSessionToken(payload) {
    const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = toBase64Url(JSON.stringify(payload));
    const signature = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(`${header}.${body}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
    return `${header}.${body}.${signature}`;
}

function verifySessionToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(`${header}.${body}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');

    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
        return null;
    }

    try {
        const payload = JSON.parse(fromBase64Url(body));
        if (!payload || typeof payload !== 'object') return null;
        if (payload.exp && Date.now() >= Number(payload.exp) * 1000) return null;
        return payload;
    } catch {
        return null;
    }
}

function parseCookies(req) {
    const rawCookie = req.headers?.cookie;
    if (!rawCookie) return {};

    return rawCookie.split(';').reduce((acc, entry) => {
        const separatorIndex = entry.indexOf('=');
        if (separatorIndex < 0) return acc;
        const key = entry.slice(0, separatorIndex).trim();
        const value = entry.slice(separatorIndex + 1).trim();
        if (!key) return acc;
        acc[key] = decodeURIComponent(value);
        return acc;
    }, {});
}

function buildCookie(name, value, maxAgeSeconds = SESSION_TTL_SECONDS) {
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
    ];

    if (isProd) parts.push('Secure');
    return parts.join('; ');
}

function setAuthCookie(res, user) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        sub: String(user.id),
        username: user.username,
        nama: user.nama,
        role: user.role,
        iat: now,
        exp: now + SESSION_TTL_SECONDS
    };
    const token = signSessionToken(payload);
    res.setHeader('Set-Cookie', buildCookie(AUTH_COOKIE_NAME, token, SESSION_TTL_SECONDS));
}

function clearAuthCookie(res) {
    res.setHeader('Set-Cookie', buildCookie(AUTH_COOKIE_NAME, '', 0));
}

function attachSession(req, res, next) {
    const cookies = parseCookies(req);
    const tokenPayload = verifySessionToken(cookies[AUTH_COOKIE_NAME]);
    const sessionUser = tokenPayload ? {
        id: String(tokenPayload.sub || ''),
        username: tokenPayload.username || '',
        nama: tokenPayload.nama || '',
        role: tokenPayload.role || ''
    } : null;

    req.session = {
        user: sessionUser,
        save(callback) {
            if (typeof callback === 'function') callback(null);
        },
        destroy(callback) {
            clearAuthCookie(res);
            this.user = null;
            if (typeof callback === 'function') callback(null);
        }
    };

    next();
}

app.use(attachSession);

function getOrigin(urlString) {
    try {
        return new URL(urlString).origin;
    } catch {
        return '';
    }
}

async function checkRateLimit(req, res, next) {
    if (!req.path.startsWith('/api/')) return next();
    const key = `${req.ip || 'anon'}:${req.method}:${req.path}`;
    const isLogin = req.path === '/api/login' && req.method === 'POST';
    const limit = isLogin ? API_RATE_LIMIT_LOGIN_MAX : API_RATE_LIMIT_MAX;
    try {
        const stats = rateLimitRedis
            ? await checkRateLimitWithRedis(req, key, limit)
            : checkRateLimitInMemory(req, key, limit);

        res.setHeader('RateLimit-Limit', String(stats.limit));
        res.setHeader('RateLimit-Remaining', String(Math.max(0, stats.remaining)));
        res.setHeader('RateLimit-Reset', String(Math.floor(stats.resetTs / 1000)));

        if (stats.hits > stats.limit) {
            return res.status(429).json({ pesan: 'Terlalu banyak request. Coba lagi beberapa menit.' });
        }
        next();
    } catch (err) {
        console.error('Rate limit fallback due to error:', err?.message || err);
        const limitState = checkRateLimitInMemory(req, key, limit);
        res.setHeader('RateLimit-Limit', String(limitState.limit));
        res.setHeader('RateLimit-Remaining', String(Math.max(0, limitState.remaining)));
        res.setHeader('RateLimit-Reset', String(Math.floor(limitState.resetTs / 1000)));
        if (limitState.hits > limitState.limit) {
            return res.status(429).json({ pesan: 'Terlalu banyak request. Coba lagi beberapa menit.' });
        }
        next();
    }
}

function requireApiSession(req, res, next) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} (IP: ${req.ip || 'unknown'}, User: ${req.session?.user ? req.session.user.username || req.session.user.id : 'guest'})`);
    // Karena middleware dipasang pada prefix /api, req.path di sini
    // hanya berisi /login, /logout, /health, atau /ready.
    const publicApiEndpoints = new Set(['/login', '/logout', '/health', '/ready']);
    if (publicApiEndpoints.has(req.path)) return next();
    if (!req.session.user) return res.status(401).json({ pesan: 'Sesi berakhir. Silakan login kembali.' });
    next();
}

function checkApiOrigin(req, res, next) {
    const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (!mutating || !req.path.startsWith('/api/') || ALLOWED_ORIGINS.size === 0) return next();
    const origin = req.get('origin');
    const referer = req.get('referer');
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return res.status(403).json({ pesan: 'Origin tidak diizinkan.' });
    }
    if (referer) {
        const refererOrigin = getOrigin(referer);
        if (refererOrigin && !ALLOWED_ORIGINS.has(refererOrigin)) {
            return res.status(403).json({ pesan: 'Referer tidak diizinkan.' });
        }
    }
    next();
}

app.use(checkApiOrigin);
app.use(checkRateLimit);
app.use('/api', requireApiSession);
app.use((req, res, next) => {
    req.requestId = generateRequestId();
    res.setHeader('X-Request-Id', req.requestId);
    if (!req.path.startsWith('/api/')) return next();
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        logApiAudit(req, res.statusCode, Math.max(0, Number(durationMs.toFixed(2))));
    });
    next();
});

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    next();
});

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireLogin(req, res, next) {
    if (!req.session.user) return res.status(401).json({ pesan: 'Sesi berakhir. Silakan login kembali.' });
    next();
}
function requireAtasan(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'atasan')
        return res.status(403).json({ pesan: 'Hanya atasan yang dapat melakukan aksi ini.' });
    next();
}

app.use('/api/pimpinan/indikator', requireLogin, requireAtasan, handleIndikatorPimpinan);
app.use('/pimpinan/indikator', requireLogin, requireAtasan, handleIndikatorPimpinan);

// ─── Route publik: login page & asset statis ─────────────────────────────────
app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    return kirimHtmlBundle(res, LOGIN_HTML_PATH, 'login');
});

app.get(['/','/index.html'], (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    return kirimHtmlBundle(res, INDEX_HTML_PATH, 'index');
});

// Semua asset statis lain butuh login (kecuali /login itu sendiri)
app.use((req, res, next) => {
    const pub = ['/login', '/login.html'];
    if (pub.includes(req.path)) return next();
    if (!req.session.user && !req.path.startsWith('/api/')) {
        return res.redirect('/login');
    }
    next();
});

app.get('/uploads/kontrak/:file', requireLogin, async (req, res) => {
    try {
        const file = path.basename(req.params.file || '');
        const local = getUploadLocalFallback('kontrak', file);
        const result = await streamGridFSFileToResponse(res, file, UPLOAD_KIND_KONTRAK, local);
        if (!result.found) return res.status(404).send('File tidak ditemukan.');
    } catch (e) {
        console.error('Gagal ambil file kontrak:', e);
        res.status(500).send('Gagal memuat file kontrak.');
    }
});

app.get('/uploads/addendum/:file', requireLogin, async (req, res) => {
    try {
        const file = path.basename(req.params.file || '');
        const local = getUploadLocalFallback('addendum', file);
        const result = await streamGridFSFileToResponse(res, file, UPLOAD_KIND_ADDENDUM, local);
        if (!result.found) return res.status(404).send('File tidak ditemukan.');
    } catch (e) {
        console.error('Gagal ambil file addendum:', e);
        res.status(500).send('Gagal memuat file addendum.');
    }
});
app.use(express.static(path.join(__dirname, 'public'), {
    index: false,
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
        if (/\.(html|css|js)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
        }
    }
}));

// ─── API: login / logout / me ─────────────────────────────────────────────────
app.get('/healthz', (req, res) => {
    res.status(200).json({
        service: 'kerma',
        status: 'ok',
        ts: new Date().toISOString(),
        supabase: buildSupabaseStatusPayload()
    });
});

app.get('/readyz', async (req, res) => {
    try {
        await pingSupabase();
        return res.status(200).json({
            service: 'kerma',
            status: 'ready',
            ts: new Date().toISOString(),
            requestId: req.requestId,
            supabase: buildSupabaseStatusPayload({ check: 'data_api_ping' })
        });
    } catch (e) {
        console.error('Ready check Supabase gagal:', e?.message || e);
        return res.status(503).json({
            service: 'kerma',
            status: 'not_ready',
            ts: new Date().toISOString(),
            requestId: req.requestId,
            supabase: {
                ...buildSupabaseStatusPayload({ status: 'error', check: 'data_api_ping' }),
                error: e?.message || 'Supabase ping gagal.'
            }
        });
    }
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        service: 'kerma',
        api: 'ok',
        ts: new Date().toISOString(),
        requestId: req.requestId,
        supabase: buildSupabaseStatusPayload()
    });
});

app.get('/api/ready', async (req, res) => {
    try {
        await pingSupabase();
        return res.json({
            service: 'kerma',
            api: 'ready',
            requestId: req.requestId,
            supabase: buildSupabaseStatusPayload({ check: 'data_api_ping' })
        });
    } catch (e) {
        console.error('API ready check Supabase gagal:', e?.message || e);
        return res.status(503).json({
            service: 'kerma',
            api: 'not_ready',
            requestId: req.requestId,
            supabase: {
                ...buildSupabaseStatusPayload({ status: 'error', check: 'data_api_ping' }),
                error: e?.message || 'Supabase ping gagal.'
            }
        });
    }
});

app.post('/api/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const user = await userRepo.findByUsername(username);
        if (!user || !userRepo.comparePassword(password, user.password))
            return res.status(401).json({ pesan: 'Username atau password salah.' });
        req.session.user = { id: String(user._id), username: user.username, nama: user.nama, role: user.role };
        setAuthCookie(res, req.session.user);
        req.session.save((err) => {
            if (err) return next(err);
            return res.json({ pesan: 'Login berhasil.', role: user.role, nama: user.nama });
        });
    } catch (e) {
        return next(e);
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ pesan: 'Logout berhasil.' }));
});

app.get('/api/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ pesan: 'Belum login.' });
    res.json(req.session.user);
});

function payloadPlottingAman(payload = {}) {
    const sumber = payload && typeof payload === 'object' ? payload : {};
    const schemaVersion = Number(sumber.plottingSchemaVersion) || 0;
    const konfigurasiBidang = schemaVersion < PLOTTING_SCHEMA_VERSION
        ? konfigurasiBidangPlottingCanonical()
        : (sumber.jabatanBidangPlottingKerma && typeof sumber.jabatanBidangPlottingKerma === 'object'
            ? sumber.jabatanBidangPlottingKerma
            : {});
    const daftarHasilSimulasi = sanitasiRiwayatJabatanPlotting(
        sumber.daftarHasilSimulasiPlotting,
        konfigurasiBidang
    );
    return {
        plottingSchemaVersion: Math.max(schemaVersion, PLOTTING_SCHEMA_VERSION),
        presetPerhitunganDasarIdeal2026S2: sumber.presetPerhitunganDasarIdeal2026S2 ?? 0,
        plotSkIdealDibuat2026S2: sumber.plotSkIdealDibuat2026S2 ?? 0,
        jumlahPksPlotting: sumber.jumlahPksPlotting ?? 2,
        jumlahPksDitetapkanPlotting: sumber.jumlahPksDitetapkanPlotting ?? 0,
        hargaJabatanCollapsed: Boolean(sumber.hargaJabatanCollapsed),
        periodePengelolaKerma: sumber.periodePengelolaKerma && typeof sumber.periodePengelolaKerma === 'object'
            ? sumber.periodePengelolaKerma
            : {},
        tarifMasterJabatanPlotting: sumber.tarifMasterJabatanPlotting && typeof sumber.tarifMasterJabatanPlotting === 'object'
            ? sumber.tarifMasterJabatanPlotting
            : {},
        jabatanBidangPlottingKerma: konfigurasiBidang,
        perhitunganDasarPlotting: sumber.perhitunganDasarPlotting && typeof sumber.perhitunganDasarPlotting === 'object'
            ? sumber.perhitunganDasarPlotting
            : {},
        daftarPksTerpilihPlotting: Array.isArray(sumber.daftarPksTerpilihPlotting) ? sumber.daftarPksTerpilihPlotting : [],
        plotSkBidangManual: sumber.plotSkBidangManual && typeof sumber.plotSkBidangManual === 'object'
            ? sumber.plotSkBidangManual
            : {},
        targetDistribusiBebanManual: sumber.targetDistribusiBebanManual && typeof sumber.targetDistribusiBebanManual === 'object'
            ? sumber.targetDistribusiBebanManual
            : {},
        masterLevelJabatanPlotting: sumber.masterLevelJabatanPlotting && typeof sumber.masterLevelJabatanPlotting === 'object'
            ? sumber.masterLevelJabatanPlotting
            : {},
        batasanSimulasiPlotting: sumber.batasanSimulasiPlotting && typeof sumber.batasanSimulasiPlotting === 'object'
            ? sumber.batasanSimulasiPlotting
            : {},
        statusMulaiPlottingKerma: sumber.statusMulaiPlottingKerma && typeof sumber.statusMulaiPlottingKerma === 'object'
            ? sumber.statusMulaiPlottingKerma
            : {},
        daftarHasilSimulasiPlotting: daftarHasilSimulasi,
        nomorSkByPksTersimpan: sumber.nomorSkByPksTersimpan && typeof sumber.nomorSkByPksTersimpan === 'object'
            ? sumber.nomorSkByPksTersimpan
            : {},
        rows: Array.isArray(sumber.rows) ? sumber.rows : []
    };
}

function extractPayloadPlotting(doc = {}) {
    if (!doc || typeof doc !== 'object') return {};
    if (doc.payload && typeof doc.payload === 'object' && !Array.isArray(doc.payload)) {
        return doc.payload;
    }
    return doc;
}

async function resolvePlottingKermaDoc(userId) {
    const exactUserId = String(userId || '').trim();
    const fallbackQueries = [];

    if (exactUserId) fallbackQueries.push({ label: 'current-user', filter: { userId: exactUserId } });
    if (exactUserId !== 'admin') fallbackQueries.push({ label: 'admin-user', filter: { userId: 'admin' } });
    fallbackQueries.push({ label: 'latest-imported', filter: { source: { $in: ['app', 'plotting-backup.json'] } } });
    fallbackQueries.push({ label: 'latest-any', filter: {} });

    for (const candidate of fallbackQueries) {
        const doc = await PlottingKerma.findOne(candidate.filter)
            .sort({ updatedAt: -1, importedAt: -1, createdAt: -1, _id: -1 })
            .lean();
        if (doc) return { doc, resolvedBy: candidate.label };
    }

    return { doc: null, resolvedBy: 'none' };
}

app.get('/api/plotting_kerma', requireLogin, async (req, res) => {
    try {
        const userId = String(req.session.user?.username || req.session.user?.id || 'admin');
        const { doc, resolvedBy } = await resolvePlottingKermaDoc(userId);
        const payload = doc ? extractPayloadPlotting(doc) : null;

        res.json({
            data: doc ? payloadPlottingAman(payload) : null,
            meta: doc ? {
                id: doc._id,
                userId: doc.userId || '',
                source: doc.source || '',
                updatedAt: doc.updatedAt || doc.createdAt || null,
                resolvedBy
            } : { resolvedBy }
        });
    } catch (e) {
        console.error('Gagal membaca plotting kerma:', e);
        res.status(500).json({ pesan: 'Gagal membaca data plotting kerma.' });
    }
});

app.put('/api/plotting-kerma', requireLogin, async (req, res) => {
    try {
        const userId = String(req.session.user?.username || req.session.user?.id || 'admin');
        const exactExisting = await PlottingKerma.findOne({ userId }).sort({ updatedAt: -1, importedAt: -1, createdAt: -1, _id: -1 });
        const resolved = exactExisting ? { doc: exactExisting, resolvedBy: 'current-user' } : await resolvePlottingKermaDoc(userId);
        const existing = resolved.doc ? await PlottingKerma.findById(resolved.doc._id) : null;
        const requestSchemaVersion = Number(req.body?.plottingSchemaVersion) || 0;
        const payload = payloadPlottingAman(req.body);

        // Tab lama dapat tetap terbuka setelah migrasi. Pertahankan isian
        // workbook yang sudah ada agar payload lama tidak menghapusnya.
        if (requestSchemaVersion < PLOTTING_SCHEMA_VERSION && existing) {
            const existingPayload = extractPayloadPlotting(existing);
            payload.plotSkBidangManual = {
                ...(existingPayload.plotSkBidangManual && typeof existingPayload.plotSkBidangManual === 'object'
                    ? existingPayload.plotSkBidangManual
                    : {}),
                ...(payload.plotSkBidangManual && typeof payload.plotSkBidangManual === 'object'
                    ? payload.plotSkBidangManual
                    : {})
            };
        }

        if (existing) {
            existing.payload = payload;
            existing.source = 'app';
            existing.version = Number(existing.version) || 1;
            existing.note = 'Update dari aplikasi';
            if (!existing.userId) existing.userId = userId || 'admin';
            await existing.save();
            return res.json({
                pesan: 'Data plotting kerma berhasil disimpan.',
                data: payload,
                meta: {
                    id: existing._id,
                    userId: existing.userId || '',
                    resolvedBy: resolved.resolvedBy
                }
            });
        }

        const created = await PlottingKerma.create({
            userId,
            source: 'app',
            version: 1,
            payload,
            note: 'Dibuat dari aplikasi'
        });
        res.json({
            pesan: 'Data plotting kerma berhasil dibuat.',
            data: payload,
            id: created._id,
            meta: {
                id: created._id,
                userId: created.userId || '',
                resolvedBy: 'created-new'
            }
        });
    } catch (e) {
        console.error('Gagal menyimpan plotting kerma:', e);
        res.status(500).json({ pesan: 'Gagal menyimpan data plotting kerma.' });
    }
});

const MAX_UPLOAD_BYTES = Number(process.env.FILE_UPLOAD_MAX_BYTES || 15 * 1024 * 1024);
const configuredUploadChunkBytes = Number(process.env.FILE_UPLOAD_CHUNK_BYTES || 2 * 1024 * 1024);
const UPLOAD_CHUNK_BYTES = Number.isFinite(configuredUploadChunkBytes)
    && configuredUploadChunkBytes >= 256 * 1024
    && configuredUploadChunkBytes <= 2.5 * 1024 * 1024
    ? Math.floor(configuredUploadChunkBytes)
    : 2 * 1024 * 1024;
const UPLOAD_CHUNK_TTL_MS = Number(process.env.FILE_UPLOAD_CHUNK_TTL_MS || 60 * 60 * 1000);
const UPLOAD_KIND_KONTRAK = 'kontrak';
const UPLOAD_KIND_ADDENDUM = 'addendum';
const UPLOAD_KIND_IMPORT_MAHASISWA = 'import_mahasiswa';
const UPLOAD_KIND_IMPORT_CALON_PESERTA = 'import_calon_peserta';
const UPLOAD_KINDS = new Set([
    UPLOAD_KIND_KONTRAK,
    UPLOAD_KIND_ADDENDUM,
    UPLOAD_KIND_IMPORT_MAHASISWA,
    UPLOAD_KIND_IMPORT_CALON_PESERTA
]);
const MAX_FILENAME_BYTES = 120;
const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']);
const KATEGORI_REALISASI_ANGGARAN = [
    'Belanja Pegawai',
    'Belanja Barang',
    'Belanja Jasa',
    'Belanja Modal'
];
const FIELD_PAGU_BY_KATEGORI = Object.freeze({
    'Belanja Pegawai': 'pagu_pegawai',
    'Belanja Barang': 'pagu_barang',
    'Belanja Jasa': 'pagu_jasa',
    'Belanja Modal': 'pagu_modal'
});
const LABEL_PAGU_BY_FIELD = Object.freeze({
    pagu_pegawai: 'PAGU Pegawai',
    pagu_barang: 'PAGU Barang',
    pagu_jasa: 'PAGU Jasa',
    pagu_modal: 'PAGU Modal'
});
function normalisasiNamaFileInput(namaAsli = '') {
    return String(namaAsli).replace(/[\u0000-\u001f\u007f]/g, '').replace(/[\\\/:*?"<>|]/g, '_').trim();
}

function safeNamaFileDasar(idProgram, ext, suffix = '') {
    const dasar = normalisasiNamaFileInput(idProgram).replace(/[^a-zA-Z0-9_\-]/g, '_');
    return `${dasar || 'kerma'}${suffix}${ext}`.replace(/_{2,}/g, '_').slice(0, MAX_FILENAME_BYTES);
}

function mimeDariEkstensi(ext) {
    const key = ext.toLowerCase();
    if (key === '.pdf') return 'application/pdf';
    if (key === '.doc') return 'application/msword';
    if (key === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (key === '.xls') return 'application/vnd.ms-excel';
    if (key === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (key === '.jpg') return 'image/jpeg';
    if (key === '.jpeg') return 'image/jpeg';
    if (key === '.png') return 'image/png';
    return 'application/octet-stream';
}

function parseUploadBase64(fileBase64) {
    if (typeof fileBase64 !== 'string') throw new Error('file_base64 wajib berupa base64 string.');
    const clean = fileBase64.trim().replace(/^data:[^;]+;base64,/, '');
    if (!clean) throw new Error('file_base64 kosong.');
    const base64 = clean.replace(/\s+/g, '');
    if (base64.length > (MAX_UPLOAD_BYTES * 4) / 3 + 64) {
        throw new Error(`File terlalu besar (maks ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
    }
    if (!/^[A-Za-z0-9+/=]+$/.test(base64) || base64.length % 4 === 1) {
        throw new Error('Format file_base64 tidak valid.');
    }
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer || !buffer.length) throw new Error('File tidak dapat diproses.');
    if (!Number.isFinite(MAX_UPLOAD_BYTES)) throw new Error('Konfigurasi batas upload tidak valid.');
    if (Number.isFinite(MAX_UPLOAD_BYTES) && buffer.length > MAX_UPLOAD_BYTES) {
        throw new Error(`File terlalu besar (maks ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
    }
    return buffer;
}

function deteksiMime(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 8) return null;
    const prefix4 = buffer.slice(0, 4).toString('hex');
    const prefix2 = buffer.slice(0, 2).toString('hex');
    if (prefix4 === '25504446') return 'application/pdf';
    if (prefix4 === 'd0cf11e0') return 'application/msword';
    if (prefix4 === '504b0304' || prefix4 === '504b0506' || prefix4 === '504b0708') return 'application/zip';
    if (prefix2 === 'ffd8') return 'image/jpeg';
    if (buffer.length >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 &&
        buffer[2] === 0x4e && buffer[3] === 0x47 &&
        buffer[4] === 0x0d && buffer[5] === 0x0a &&
        buffer[6] === 0x1a && buffer[7] === 0x0a
    ) return 'image/png';
    return null;
}

function normalisasiNamaFileUpload(fileNama = '') {
    if (typeof fileNama !== 'string') throw new Error('Nama file tidak valid.');
    const base = path.basename(fileNama).trim();
    if (!base) throw new Error('Nama file wajib diisi.');
    if (base.includes('\0')) throw new Error('Nama file mengandung karakter tidak valid.');
    if (base.length > 255) throw new Error('Nama file terlalu panjang.');
    return base;
}

function validateUploadBuffer(ext, buffer, originalName) {
    const mimeClaimed = mimeDariEkstensi(ext);
    const mimeDetected = deteksiMime(buffer);
    if (!mimeDetected) throw new Error('Tipe file tidak dikenali.');
    if (ext === '.pdf' && mimeDetected !== 'application/pdf') {
        throw new Error('Isi file tidak sesuai ekstensi PDF.');
    }
    if ((ext === '.doc' || ext === '.xls') && mimeDetected !== 'application/msword') {
        throw new Error('Isi file tidak sesuai ekstensi dokumen lama.');
    }
    if ((ext === '.docx' || ext === '.xlsx') && mimeDetected !== 'application/zip') {
        throw new Error('Isi file tidak sesuai ekstensi dokumen Office modern.');
    }
    if ((ext === '.jpg' || ext === '.jpeg') && mimeDetected !== 'image/jpeg') {
        throw new Error('Isi file tidak sesuai ekstensi JPG/JPEG.');
    }
    if (ext === '.png' && mimeDetected !== 'image/png') {
        throw new Error('Isi file tidak sesuai ekstensi PNG.');
    }
    return mimeClaimed || mimeDetected;
}

function setDownloadHeaders(res, filename, mimeType) {
    const safeFilename = path.basename(String(filename || '')).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const encoded = encodeURIComponent(safeFilename);
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${encoded}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
}

async function simpanBufferKontrak(idProgram, buffer, fileNama, uploadedBy) {
    const fileNameSafe = normalisasiNamaFileUpload(fileNama);
    const ext = path.extname(fileNameSafe).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) throw new Error(`Ekstensi file tidak diizinkan: ${ext}`);
    const safeName = safeNamaFileDasar(idProgram, ext);
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('File tidak dapat diproses.');
    if (buffer.length > MAX_UPLOAD_BYTES) {
        throw new Error(`File terlalu besar (maks ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
    }
    const mimeType = validateUploadBuffer(ext, buffer, fileNameSafe);
    return uploadAppFile({
        kind: UPLOAD_KIND_KONTRAK,
        storedName: safeName,
        originalName: fileNameSafe,
        idProgram,
        uploadedBy,
        buffer,
        mimeType
    });
}

async function simpanFileKontrak(idProgram, fileBase64, fileNama, uploadedBy) {
    return simpanBufferKontrak(idProgram, parseUploadBase64(fileBase64), fileNama, uploadedBy);
}

async function simpanBufferAddendum(idProgram, buffer, fileNama, noUrut, uploadedBy) {
    const fileNameSafe = normalisasiNamaFileUpload(fileNama);
    const ext = path.extname(fileNameSafe).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) throw new Error(`Ekstensi file tidak diizinkan: ${ext}`);
    const safeName = safeNamaFileDasar(idProgram, ext, `_add_${Number(noUrut) || 1}`);
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('File tidak dapat diproses.');
    if (buffer.length > MAX_UPLOAD_BYTES) {
        throw new Error(`File terlalu besar (maks ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
    }
    const mimeType = validateUploadBuffer(ext, buffer, fileNameSafe);
    return uploadAppFile({
        kind: UPLOAD_KIND_ADDENDUM,
        storedName: safeName,
        originalName: fileNameSafe,
        idProgram,
        uploadedBy,
        buffer,
        mimeType
    });
}

async function simpanFileAddendum(idProgram, fileBase64, fileNama, noUrut, uploadedBy) {
    return simpanBufferAddendum(idProgram, parseUploadBase64(fileBase64), fileNama, noUrut, uploadedBy);
}

function normalisasiUploadId(uploadId = '') {
    const normalized = String(uploadId).trim();
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(normalized)) {
        throw new Error('ID upload tidak valid.');
    }
    return normalized;
}

function parseUploadChunkBase64(chunkBase64) {
    if (typeof chunkBase64 !== 'string' || !chunkBase64.trim()) {
        throw new Error('Chunk upload kosong.');
    }
    const clean = chunkBase64.trim().replace(/\s+/g, '');
    if (clean.length > Math.ceil((UPLOAD_CHUNK_BYTES * 4) / 3) + 64) {
        throw new Error('Ukuran chunk upload melebihi batas.');
    }
    if (!/^[A-Za-z0-9+/=]+$/.test(clean) || clean.length % 4 === 1) {
        throw new Error('Format chunk upload tidak valid.');
    }
    const buffer = Buffer.from(clean, 'base64');
    if (!buffer.length || buffer.length > UPLOAD_CHUNK_BYTES) {
        throw new Error('Ukuran chunk upload tidak valid.');
    }
    return buffer;
}

async function ambilBufferUploadChunked({
    uploadId,
    userId,
    kind,
    idProgram,
    fileName,
    fileSize,
    totalChunks
}) {
    const normalizedUploadId = normalisasiUploadId(uploadId);
    const normalizedUserId = String(userId || '').trim();
    const normalizedKind = String(kind || '').trim();
    const normalizedProgram = String(idProgram || '').trim();
    const normalizedName = normalisasiNamaFileUpload(fileName);
    const normalizedSize = Number(fileSize);
    const normalizedTotal = Number(totalChunks);

    if (!normalizedUserId) throw new Error('Sesi upload tidak valid.');
    if (!UPLOAD_KINDS.has(normalizedKind)) {
        throw new Error('Jenis upload tidak valid.');
    }
    if (!normalizedProgram) throw new Error('ID program upload tidak valid.');
    if (!Number.isInteger(normalizedSize) || normalizedSize <= 0 || normalizedSize > MAX_UPLOAD_BYTES) {
        throw new Error(`Ukuran file tidak valid (maks ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
    }
    if (!Number.isInteger(normalizedTotal) || normalizedTotal <= 0
        || normalizedTotal > Math.ceil(MAX_UPLOAD_BYTES / UPLOAD_CHUNK_BYTES) + 1) {
        throw new Error('Jumlah chunk upload tidak valid.');
    }

    const chunks = await UploadChunk.find({
        uploadId: normalizedUploadId,
        userId: normalizedUserId
    }).sort({ chunkIndex: 1 }).lean();

    if (chunks.length !== normalizedTotal) {
        throw new Error(`Upload belum lengkap (${chunks.length}/${normalizedTotal} chunk).`);
    }

    for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        if (chunk.chunkIndex !== index
            || chunk.totalChunks !== normalizedTotal
            || chunk.fileSize !== normalizedSize
            || chunk.kind !== normalizedKind
            || chunk.idProgram !== normalizedProgram
            || chunk.fileName !== normalizedName
        ) {
            throw new Error('Metadata chunk upload tidak konsisten.');
        }
    }

    const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk.data)));
    if (buffer.length !== normalizedSize) {
        throw new Error('Ukuran file hasil upload tidak sesuai.');
    }
    return buffer;
}

async function hapusUploadChunked(uploadId, userId) {
    if (!uploadId || !userId) return;
    await UploadChunk.deleteMany({
        uploadId: normalisasiUploadId(uploadId),
        userId: String(userId)
    });
}

async function resolveUploadBuffer({
    fileBase64,
    uploadId,
    userId,
    kind,
    idProgram,
    fileName,
    fileSize,
    totalChunks
}) {
    if (uploadId) {
        return ambilBufferUploadChunked({
            uploadId,
            userId,
            kind,
            idProgram,
            fileName,
            fileSize,
            totalChunks
        });
    }
    return parseUploadBase64(fileBase64);
}

function getUploadLocalFallback(jenis, file) {
    const base = path.basename(file || '');
    if (!base) return null;
    const localPath = path.join(__dirname, 'public', 'uploads', jenis, base);
    return fs.existsSync(localPath) ? localPath : null;
}

async function streamGridFSFileToResponse(res, filename, kind, fallbackPath = null) {
    return streamAppFileToResponse(res, {
        kind,
        storedName: filename,
        fallbackPath,
        setDownloadHeaders
    });
}

async function siapkanFileKontrakLokal(data = {}) {
    const file = path.basename(data.file_kontrak || '');
    if (!file || path.extname(file).toLowerCase() !== '.pdf') {
        return { data, cleanup: () => {} };
    }

    const localFallback = getUploadLocalFallback(UPLOAD_KIND_KONTRAK, file);
    if (localFallback) {
        return {
            data: { ...data, file_kontrak_local_path: localFallback },
            cleanup: () => {}
        };
    }

    try {
        const prepared = await prepareAppPdfLocal({
            kind: UPLOAD_KIND_KONTRAK,
            storedName: file
        });
        if (!prepared) return { data, cleanup: () => {} };
        return {
            data: { ...data, file_kontrak_local_path: prepared.path },
            cleanup: prepared.cleanup
        };
    } catch (err) {
        throw err;
    }
}

app.post('/api/upload-chunk', async (req, res) => {
    try {
        const {
            upload_id,
            kind,
            id_program,
            file_nama,
            file_size,
            chunk_index,
            total_chunks,
            chunk_base64
        } = req.body || {};
        const uploadId = normalisasiUploadId(upload_id);
        const userId = String(req.session?.user?.id || '').trim();
        const uploadKind = String(kind || '').trim();
        const idProgram = String(id_program || '').trim();
        const fileName = normalisasiNamaFileUpload(file_nama);
        const fileSize = Number(file_size);
        const chunkIndex = Number(chunk_index);
        const totalChunks = Number(total_chunks);
        const ext = path.extname(fileName).toLowerCase();

        if (!userId) throw new Error('Sesi upload tidak valid.');
        if (!UPLOAD_KINDS.has(uploadKind)) {
            throw new Error('Jenis upload tidak valid.');
        }
        if (!idProgram) throw new Error('ID program wajib diisi.');
        const allowedForKind = uploadKind.startsWith('import_')
            ? new Set(['.xls', '.xlsx'])
            : ALLOWED_EXT;
        if (!allowedForKind.has(ext)) throw new Error(`Ekstensi file tidak diizinkan: ${ext}`);
        if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) {
            throw new Error(`File terlalu besar (maks ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
        }
        if (!Number.isInteger(totalChunks) || totalChunks <= 0
            || totalChunks > Math.ceil(MAX_UPLOAD_BYTES / UPLOAD_CHUNK_BYTES) + 1) {
            throw new Error('Jumlah chunk upload tidak valid.');
        }
        if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= totalChunks) {
            throw new Error('Index chunk upload tidak valid.');
        }

        const data = parseUploadChunkBase64(chunk_base64);
        const ttlMs = Number.isFinite(UPLOAD_CHUNK_TTL_MS) && UPLOAD_CHUNK_TTL_MS > 0
            ? UPLOAD_CHUNK_TTL_MS
            : 60 * 60 * 1000;

        await UploadChunk.updateOne(
            { uploadId, userId, chunkIndex },
            {
                $set: {
                    kind: uploadKind,
                    idProgram,
                    fileName,
                    fileSize,
                    totalChunks,
                    data,
                    expiresAt: new Date(Date.now() + ttlMs)
                }
            },
            { upsert: true }
        );

        return res.json({
            ok: true,
            chunk_index: chunkIndex,
            total_chunks: totalChunks
        });
    } catch (err) {
        console.error('Gagal menyimpan chunk upload:', err?.message || err);
        return res.status(400).json({ pesan: err?.message || 'Gagal menyimpan bagian file.' });
    }
});

// tidak digunakan lagi: fallback local dipakai langsung saat kebutuhan kompatibilitas route lama

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatTanggalDisplay(val) {
    if (!val) return '';
    let d = null;
    if (val instanceof Date) { d = val; }
    else {
        const s = val.toString().trim();
        const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
        else { const p = new Date(s); if (!isNaN(p)) d = p; }
    }
    if (!d || isNaN(d)) return val?.toString() || '';
    return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTanggalInput(val) {
    if (!val) return '';
    if (val instanceof Date) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = val.toString().trim();
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    return s;
}

function klasifikasiJenisKerma(kodeFile) {
    const kode = String(kodeFile || '').trim().toUpperCase();
    const match = kode.match(/(?:^|[^A-Z0-9])SBM\.(PD|PN|PM)(?=[^A-Z0-9]|$)/);
    const labelByKode = {
        PD: 'Kerma Pendidikan',
        PN: 'Kerma Penelitian',
        PM: 'Kerma Pengabdian Masyarakat'
    };
    const kodeJenis = match?.[1] || '';
    return {
        kode: kodeJenis,
        label: labelByKode[kodeJenis] || 'Belum terklasifikasi'
    };
}

const KODE_FILE_ALOKASI_AKTIF = new Set([
    'SBM.PD-1-78-2024',
    'SBM.PD-1-73-2024',
    'SBM.PD-1-49-2024',
    'SBM.PD-1-39-2024',
    'SBM.PD-1-34-2024',
    'SBM.PD-1-81-2024',
    'SBM.PD-1-54-2025',
    'SBM.PD-1-53-2025',
    'SBM.PD-1-51-2025',
    'SBM.PD-1-50-2025',
    'SBM.PD-1-40-2025',
    'SBM.PD-1-1-2025',
    'SBM.PD-1-58-2025',
    'SBM.PD-1-55-2025',
    'SBM.PD-1-6-2026',
    'SBM.PD-1-9-2026',
    'SBM.PD-1-12-2026'
]);

function kodeFileAlokasiAktif(kodeFile) {
    return KODE_FILE_ALOKASI_AKTIF.has(String(kodeFile || '').trim().toUpperCase());
}

function statusAlokasiKerma(kodeFile) {
    return kodeFileAlokasiAktif(kodeFile) ? 'Aktif' : 'Tidak Aktif';
}

async function cariProgramDariKodeFile(kodeFileRaw) {
    const kodeFile = kodeFileRaw?.trim();
    if (!kodeFile) return { error: 'Kode File wajib diisi.' };
    const list = await Program.find({ kode_file: kodeFile }).lean();
    if (list.length === 0) return { error: 'Kode File tidak ditemukan.' };
    if (list.length > 1) return { error: 'Kode File tidak unik. Rapikan Kode File terlebih dahulu agar realisasi dapat dicatat dengan akurat.' };
    return { program: list[0], kodeFile };
}

function tanggalMasukRentangSaldo(rowTanggal, sampaiTanggal, hitungTanpaTanggal = true) {
    if (!sampaiTanggal) return true;
    const tanggal = parseTanggalDashboard(rowTanggal);
    if (!tanggal) return hitungTanpaTanggal;
    tanggal.setHours(0, 0, 0, 0);
    return tanggal <= sampaiTanggal;
}

function persenDpiPenerimaan(row = {}) {
    const raw = Number(row.potongan_persen);
    const punyaNominalBruto = Number(row.nominal_bruto) > 0;
    if (Number.isFinite(raw) && (punyaNominalBruto || raw > 0)) {
        return Math.min(100, Math.max(0, raw));
    }
    return 20;
}

function nominalHampirSama(a, b, tolerance = 1) {
    return Math.abs((Number(a) || 0) - (Number(b) || 0)) <= tolerance;
}

function nominalBrutoPenerimaan(row = {}) {
    const bruto = Number(row.nominal_bruto);
    const nominalTersimpan = Math.max(0, Number(row.nominal) || 0);
    const nominalRencana = Math.max(0, Number(row.rencana_nominal) || 0);
    const persen = persenDpiPenerimaan(row);
    const faktorNetto = 1 - (persen / 100);
    const punyaBruto = Number.isFinite(bruto) && bruto > 0;
    const brutoDariNetto = nominalTersimpan > 0 && faktorNetto > 0 && faktorNetto < 1
        ? Math.round(nominalTersimpan / faktorNetto)
        : nominalTersimpan;

    if (nominalRencana > 0 && nominalTersimpan > 0) {
        if (nominalHampirSama(nominalTersimpan, nominalRencana) && (!punyaBruto || nominalHampirSama(bruto, brutoDariNetto))) {
            return nominalTersimpan;
        }
        if (!punyaBruto && nominalHampirSama(brutoDariNetto, nominalRencana)) {
            return nominalRencana;
        }
        if (punyaBruto && nominalHampirSama(bruto, nominalRencana)) {
            return bruto;
        }
        if (!punyaBruto) {
            return brutoDariNetto <= nominalRencana + 1 ? brutoDariNetto : nominalTersimpan;
        }
    }
    if (punyaBruto) return bruto;
    if (nominalTersimpan > 0 && persen > 0 && persen < 100) return brutoDariNetto;
    return nominalTersimpan;
}

function nominalDpiPenerimaan(row = {}) {
    const bruto = nominalBrutoPenerimaan(row);
    const brutoTersimpan = Number(row.nominal_bruto);
    const nominalTersimpan = Number(row.nominal) || 0;
    const persen = persenDpiPenerimaan(row);
    const dpiPersen = Math.round(bruto * (persen / 100));
    const samaNominal = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) <= 1;
    if (Number.isFinite(brutoTersimpan) && brutoTersimpan > 0) {
        if (persen > 0 && (samaNominal(nominalTersimpan, dpiPersen) || samaNominal(nominalTersimpan, bruto))) {
            return Math.max(0, dpiPersen);
        }
        return Math.max(0, bruto - nominalTersimpan);
    }
    return dpiPersen;
}

function nominalRealisasiPenerimaan(row = {}) {
    const brutoTersimpan = Number(row.nominal_bruto);
    if (Number.isFinite(brutoTersimpan) && brutoTersimpan > 0) {
        return Math.max(0, nominalBrutoPenerimaan(row) - nominalDpiPenerimaan(row));
    }
    return Math.max(0, nominalBrutoPenerimaan(row) - nominalDpiPenerimaan(row));
}

function keteranganRealisasiPembayaranTampil(value = '') {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^Realisasi\s+.+\s+dari\s+rencana\s+(penerimaan|pendapatan)\.?$/i.test(text)) return '';
    if (text.toLowerCase() === 'realisasi penerimaan yang sudah dibukukan.') return '';
    return text;
}

async function hitungSaldoRiProgram(idProgram, sampaiTanggal = null) {
    const batasTanggal = sampaiTanggal ? new Date(sampaiTanggal) : null;
    if (batasTanggal) batasTanggal.setHours(0, 0, 0, 0);
    const [pembayaranRows, rencanaRows, realisasiRows] = await Promise.all([
        safeMongoRead('RealisasiPembayaran.find(id_program)', () => RealisasiPembayaran.find({ id_program: idProgram }).lean(), []),
        RencanaAnggaran.find({ id_program: idProgram }).lean(),
        safeMongoRead('RealisasiAnggaran.find(id_program)', () => RealisasiAnggaran.find({ id_program: idProgram }).lean(), [])
    ]);
    const totalPenerimaan = pembayaranRows
        .filter(row => tanggalMasukRentangSaldo(row.tanggal, batasTanggal, false))
        .reduce((sum, row) => sum + nominalRealisasiPenerimaan(row), 0);
    const totalRiRencana = rencanaRows
        .filter(row => tanggalMasukRentangSaldo(row.tanggal_ri, batasTanggal, true))
        .reduce((sum, row) => sum + (Number(row.ri) || 0), 0);
    const totalRiDefinitif = rencanaRows
        .filter(row => tanggalMasukRentangSaldo(row.tanggal_realisasi_ri || row.tgl_invoice || row.tanggal_ri, batasTanggal, true))
        .reduce((sum, row) => sum + (Number(row.pengeluaran_ri) || 0), 0);
    const totalRealisasiAnggaran = realisasiRows
        .filter(row => tanggalMasukRentangSaldo(row.tanggal, batasTanggal, true))
        .reduce((sum, row) => sum + (Number(row.nominal) || 0), 0);
    return {
        totalPenerimaan,
        totalRiRencana,
        totalRiDefinitif,
        totalRealisasiAnggaran,
        riTersediaUntukRealisasi: totalRiRencana - totalRiDefinitif,
        saldoProyektif: totalPenerimaan - totalRiRencana,
        saldoDefinitif: totalPenerimaan - totalRiDefinitif
    };
}

async function sinkronkanRealisasiAnggaranDariRi(row, program = {}) {
    const nominal = Number(row?.pengeluaran_ri) || 0;
    if (nominal <= 0) return null;

    const kategori = String(row.kategori_belanja || '').trim();
    if (!KATEGORI_REALISASI_ANGGARAN.includes(kategori)) {
        throw new Error('Kategori Belanja wajib valid agar Realisasi RI dapat masuk ke Rekapitulasi Realisasi Anggaran.');
    }

    const idRencana = String(row._id || row.id_rencana_anggaran || '').trim();
    if (!idRencana) {
        throw new Error('ID Rencana Anggaran tidak ditemukan untuk sinkronisasi Realisasi Anggaran.');
    }

    return RealisasiAnggaran.findOneAndUpdate(
        { id_rencana_anggaran: idRencana },
        {
            id_program: row.id_program || program.id_program || '',
            kode_file: row.kode_file || program.kode_file || '',
            id_rencana_anggaran: idRencana,
            sumber: 'saldo_ri',
            kategori,
            tanggal: row.tanggal_realisasi_ri || row.tgl_invoice || row.tanggal_ri || '',
            nominal,
            keterangan: row.uraian || ''
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
}

function hitungStatusKontrak(tglAkhirRaw) {
    if (!tglAkhirRaw) return 'Berakhir';
    let tglAkhir = null;
    if (tglAkhirRaw instanceof Date) { tglAkhir = new Date(tglAkhirRaw); }
    else {
        const str = tglAkhirRaw.toString().trim();
        const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) tglAkhir = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
        else { const d = new Date(str); if (!isNaN(d)) tglAkhir = d; }
    }
    if (!tglAkhir || isNaN(tglAkhir)) return 'Berakhir';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    tglAkhir.setHours(0, 0, 0, 0);
    return tglAkhir >= today ? 'Berjalan' : 'Berakhir';
}

function parseTanggalDashboard(val) {
    if (!val) return null;
    if (val instanceof Date) {
        const d = new Date(val);
        d.setHours(0, 0, 0, 0);
        return isNaN(d) ? null : d;
    }
    const s = val.toString().trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    const d = new Date(s);
    if (isNaN(d)) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatTanggalISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function tambahHari(d, jumlah) {
    const next = new Date(d);
    next.setDate(next.getDate() + jumlah);
    next.setHours(0, 0, 0, 0);
    return next;
}

function tambahTahun(d, jumlah) {
    const next = new Date(d);
    next.setFullYear(next.getFullYear() + jumlah);
    next.setHours(0, 0, 0, 0);
    return next;
}

function awalBulan(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function tambahBulan(d, jumlah) {
    return new Date(d.getFullYear(), d.getMonth() + jumlah, 1);
}

function akhirBulan(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function keyBulan(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function labelBulan(d) {
    return `${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function formatRupiahAngka(n) {
    return Number(n || 0).toLocaleString('id-ID');
}

function clampAngka(n, min, max, fallback) {
    const angka = Number(n);
    if (!Number.isFinite(angka)) return fallback;
    return Math.min(max, Math.max(min, angka));
}

function labelRentangTanggal(mulai, selesai) {
    return `${formatTanggalDisplay(formatTanggalISO(mulai))} - ${formatTanggalDisplay(formatTanggalISO(selesai))}`;
}

function awalTahun(d) {
    return new Date(d.getFullYear(), 0, 1);
}

function akhirTahun(d) {
    return new Date(d.getFullYear(), 11, 31);
}

function normalisasiRentangTanggal(mulaiRaw, selesaiRaw, defaultMulai, defaultSelesai) {
    let mulai = parseTanggalDashboard(mulaiRaw) || new Date(defaultMulai);
    let selesai = parseTanggalDashboard(selesaiRaw) || new Date(defaultSelesai);

    if (mulai > selesai) {
        const tmp = mulai;
        mulai = selesai;
        selesai = tmp;
    }

    mulai.setHours(0, 0, 0, 0);
    selesai.setHours(0, 0, 0, 0);
    return {
        mulai,
        selesai,
        tanggal_mulai: formatTanggalISO(mulai),
        tanggal_selesai: formatTanggalISO(selesai),
        label: labelRentangTanggal(mulai, selesai),
        rentang_display: labelRentangTanggal(mulai, selesai)
    };
}

function adaNilaiTanggal(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
}

function bangunPeriodeKontrak(query, acuan) {
    const mulaiRaw = query.tanggal_awal_general || query.mulai_general || query.general_mulai;
    const selesaiRaw = query.tanggal_akhir_general || query.selesai_general || query.general_selesai;
    if (!adaNilaiTanggal(mulaiRaw) && !adaNilaiTanggal(selesaiRaw)) {
        const mulai = new Date(1900, 0, 1);
        const selesai = new Date(9999, 11, 31);
        mulai.setHours(0, 0, 0, 0);
        selesai.setHours(0, 0, 0, 0);
        return {
            mulai,
            selesai,
            tanggal_mulai: '',
            tanggal_selesai: '',
            label: 'All',
            rentang_display: 'All'
        };
    }

    const rentang = normalisasiRentangTanggal(
        mulaiRaw,
        selesaiRaw,
        awalTahun(acuan),
        akhirTahun(acuan)
    );
    return { ...rentang, label: 'Periode General' };
}

function bangunRentangArus(query, acuan) {
    const mulaiRaw = query.tanggal_awal_keuangan || query.mulai_keuangan || query.keuangan_mulai || query.mulai_arus;
    const selesaiRaw = query.tanggal_akhir_keuangan || query.selesai_keuangan || query.keuangan_selesai || query.selesai_arus;
    if (!adaNilaiTanggal(mulaiRaw) && !adaNilaiTanggal(selesaiRaw)) {
        const mulai = new Date(1900, 0, 1);
        const selesai = new Date(9999, 11, 31);
        mulai.setHours(0, 0, 0, 0);
        selesai.setHours(0, 0, 0, 0);
        return {
            mulai,
            selesai,
            tanggal_mulai: '',
            tanggal_selesai: '',
            label: 'All',
            rentang_display: 'All'
        };
    }

    return normalisasiRentangTanggal(
        mulaiRaw,
        selesaiRaw,
        awalTahun(acuan),
        akhirTahun(acuan)
    );
}

function hitungPenerimaanTahunan(jadwalPenerimaan = [], periode = null) {
    const map = new Map();
    jadwalPenerimaan.forEach(item => {
        if (!item?.dueDate) return;
        if (periode && (item.dueDate < periode.mulai || item.dueDate > periode.selesai)) return;
        const tahun = item.dueDate.getFullYear();
        if (!map.has(tahun)) {
            map.set(tahun, {
                tahun,
                jumlah_penerimaan: 0,
                total_penerimaan: 0
            });
        }
        const row = map.get(tahun);
        row.jumlah_penerimaan += 1;
        row.total_penerimaan += Number(item.nominal) || 0;
    });
    return Array.from(map.values())
        .sort((a, b) => a.tahun - b.tahun)
        .map(row => ({
            ...row,
            basis_tanggal: 'Realisasi Pembayaran',
            jumlah_penerimaan_display: row.jumlah_penerimaan.toLocaleString('id-ID'),
            total_penerimaan_display: `Rp ${formatRupiahAngka(row.total_penerimaan)}`
        }));
}

function hitungIndikatorKontrak(programs, periode) {
    const dalamPeriode = [];
    let tanpaTanggal = 0;
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    programs.forEach(p => {
        const tanggalKontrak = parseTanggalDashboard(p.tgl_kontrak);
        if (!tanggalKontrak) {
            tanpaTanggal += 1;
            return;
        }
        if (tanggalKontrak >= periode.mulai && tanggalKontrak <= periode.selesai) {
            dalamPeriode.push(p);
        }
    });

    const totalNominal = dalamPeriode.reduce((sum, p) => sum + (Number(p.nilai_kontrak) || 0), 0);
    const nominalTahunanMap = new Map();
    dalamPeriode.forEach(p => {
        const tanggalKontrak = parseTanggalDashboard(p.tgl_kontrak);
        if (!tanggalKontrak) return;
        const tahun = tanggalKontrak.getFullYear();
        if (!nominalTahunanMap.has(tahun)) {
            nominalTahunanMap.set(tahun, {
                tahun,
                jumlah_kontrak: 0,
                total_nominal: 0
            });
        }
        const row = nominalTahunanMap.get(tahun);
        row.jumlah_kontrak += 1;
        row.total_nominal += Number(p.nilai_kontrak) || 0;
    });
    const nominalTahunan = Array.from(nominalTahunanMap.values())
        .sort((a, b) => a.tahun - b.tahun)
        .map(row => ({
            ...row,
            jumlah_kontrak_display: row.jumlah_kontrak.toLocaleString('id-ID'),
            total_nominal_display: `Rp ${formatRupiahAngka(row.total_nominal)}`
        }));
    const nominalValid = dalamPeriode.map(p => Number(p.nilai_kontrak) || 0).filter(n => n > 0);
    const nominalTerendah = nominalValid.length ? Math.min(...nominalValid) : 0;
    const nominalTertinggi = nominalValid.length ? Math.max(...nominalValid) : 0;
    const ringkasKontrakNominal = p => p ? ({
        id_program: p.id_program || '-',
        judul: p.judul_pks || p.no_kontrak_institusi || p.nama_mitra || '-',
        nama_mitra: p.nama_mitra || '-',
        nominal: Number(p.nilai_kontrak) || 0,
        nominal_display: `Rp ${formatRupiahAngka(p.nilai_kontrak)}`
    }) : null;
    const kontrakTerendah = nominalTerendah
        ? dalamPeriode.find(p => (Number(p.nilai_kontrak) || 0) === nominalTerendah)
        : null;
    const kontrakTertinggi = nominalTertinggi
        ? dalamPeriode.find(p => (Number(p.nilai_kontrak) || 0) === nominalTertinggi)
        : null;
    const keyMitra = nama => ((nama || 'Tanpa Nama Mitra').trim() || 'Tanpa Nama Mitra').toLowerCase().replace(/\s+/g, ' ');
    const labelMitra = nama => (nama || 'Tanpa Nama Mitra').trim() || 'Tanpa Nama Mitra';
    const semuaProgramByMitra = new Map();
    programs.forEach(p => {
        const tanggalKontrak = parseTanggalDashboard(p.tgl_kontrak);
        if (!tanggalKontrak) return;
        const key = keyMitra(p.nama_mitra);
        if (!semuaProgramByMitra.has(key)) semuaProgramByMitra.set(key, []);
        semuaProgramByMitra.get(key).push({ ...p, tanggalKontrak });
    });
    semuaProgramByMitra.forEach(list => list.sort((a, b) => a.tanggalKontrak - b.tanggalKontrak));

    const mitraMap = new Map();
    dalamPeriode.forEach(p => {
        const nama = labelMitra(p.nama_mitra);
        const key = keyMitra(nama);
        if (!mitraMap.has(key)) {
            mitraMap.set(key, {
                nama_mitra: nama,
                jumlah_kerja_sama: 0,
                total_nominal: 0,
                program: []
            });
        }
        const row = mitraMap.get(key);
        row.jumlah_kerja_sama += 1;
        row.total_nominal += Number(p.nilai_kontrak) || 0;
        const tanggalKontrak = parseTanggalDashboard(p.tgl_kontrak);
        row.program.push({
            id_program: p.id_program || '-',
            judul: p.judul_pks || p.no_kontrak_institusi || p.nama_mitra || '-',
            tahun_kerja_sama: tanggalKontrak ? tanggalKontrak.getFullYear() : null,
            nominal: Number(p.nilai_kontrak) || 0,
            nominal_display: `Rp ${formatRupiahAngka(p.nilai_kontrak)}`
        });
    });
    const kerjaSamaBerulang = Array.from(mitraMap.values())
        .filter(row => row.jumlah_kerja_sama > 1)
        .sort((a, b) => b.jumlah_kerja_sama - a.jumlah_kerja_sama || b.total_nominal - a.total_nominal)
        .map(row => ({
            ...row,
            total_nominal_display: `Rp ${formatRupiahAngka(row.total_nominal)}`
        }));
    const tidakBerulangMap = new Map();
    dalamPeriode.forEach(p => {
        const tanggalKontrak = parseTanggalDashboard(p.tgl_kontrak);
        if (!tanggalKontrak) return;
        if (tambahTahun(tanggalKontrak, 1) > hariIni) return;

        const key = keyMitra(p.nama_mitra);
        const riwayat = semuaProgramByMitra.get(key) || [];
        const adaBerikutnya = riwayat.some(row => row.tanggalKontrak > tanggalKontrak);
        if (adaBerikutnya) return;

        const existing = tidakBerulangMap.get(key);
        if (existing && existing.tanggal_kontrak_raw >= tanggalKontrak) return;
        tidakBerulangMap.set(key, {
            nama_mitra: labelMitra(p.nama_mitra),
            jumlah_kerja_sama: riwayat.length,
            id_program: p.id_program || '-',
            judul: p.judul_pks || p.no_kontrak_institusi || p.nama_mitra || '-',
            tanggal_kontrak: formatTanggalDisplay(p.tgl_kontrak),
            tanggal_kontrak_raw: tanggalKontrak,
            nominal: Number(p.nilai_kontrak) || 0,
            nominal_display: `Rp ${formatRupiahAngka(p.nilai_kontrak)}`,
            program: [{
                id_program: p.id_program || '-',
                judul: p.judul_pks || p.no_kontrak_institusi || p.nama_mitra || '-'
            }]
        });
    });
    const kerjaSamaTidakBerulang = Array.from(tidakBerulangMap.values())
        .sort((a, b) => a.tanggal_kontrak_raw - b.tanggal_kontrak_raw)
        .map(({ tanggal_kontrak_raw, ...row }) => row);
    const kerjaSamaBaru = dalamPeriode
        .map(p => {
            const tanggalKontrak = parseTanggalDashboard(p.tgl_kontrak);
            if (!tanggalKontrak) return null;
            if (tambahTahun(tanggalKontrak, 1) <= hariIni) return null;

            const key = keyMitra(p.nama_mitra);
            const riwayat = semuaProgramByMitra.get(key) || [];
            if (riwayat.length !== 1) return null;

            return {
                nama_mitra: labelMitra(p.nama_mitra),
                jumlah_kerja_sama: 1,
                id_program: p.id_program || '-',
                judul: p.judul_pks || p.no_kontrak_institusi || p.nama_mitra || '-',
                tanggal_kontrak: formatTanggalDisplay(p.tgl_kontrak),
                tanggal_kontrak_raw: tanggalKontrak,
                nominal: Number(p.nilai_kontrak) || 0,
                nominal_display: `Rp ${formatRupiahAngka(p.nilai_kontrak)}`,
                program: [{
                    id_program: p.id_program || '-',
                    judul: p.judul_pks || p.no_kontrak_institusi || p.nama_mitra || '-'
                }]
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.tanggal_kontrak_raw - b.tanggal_kontrak_raw)
        .map(({ tanggal_kontrak_raw, ...row }) => row);
    const batasAkhirEnamBulan = new Date(hariIni);
    batasAkhirEnamBulan.setMonth(batasAkhirEnamBulan.getMonth() + 6);
    batasAkhirEnamBulan.setHours(0, 0, 0, 0);
    const daftarStatus = {
        berjalan_dibawah_1_tahun: [],
        berjalan_diatas_1_tahun: [],
        berjalan_akan_berakhir_6_bulan: [],
        berakhir: []
    };
    const labelStatusStrategis = {
        berjalan_dibawah_1_tahun: 'Berjalan < 1 tahun',
        berjalan_diatas_1_tahun: 'Berjalan > 1 tahun',
        berjalan_akan_berakhir_6_bulan: 'Berjalan akan berakhir < 6 bulan',
        berakhir: 'Berakhir'
    };
    const tentukanKategoriStatus = p => {
        const tanggalAkhir = parseTanggalDashboard(p.tgl_akhir_kontrak);
        if (!tanggalAkhir || tanggalAkhir < hariIni) return 'berakhir';
        if (tanggalAkhir <= batasAkhirEnamBulan) return 'berjalan_akan_berakhir_6_bulan';

        const tanggalKontrak = parseTanggalDashboard(p.tgl_kontrak);
        if (tanggalKontrak && tambahTahun(tanggalKontrak, 1) > hariIni) return 'berjalan_dibawah_1_tahun';
        return 'berjalan_diatas_1_tahun';
    };
    const status = dalamPeriode.reduce((acc, p) => {
        const key = tentukanKategoriStatus(p);
        acc[key] += 1;
        daftarStatus[key].push({
            id_program: p.id_program || '-',
            judul: p.judul_pks || p.nama_mitra || p.no_kontrak_institusi || '-',
            nama_mitra: p.nama_mitra || '',
            tanggal_kontrak: formatTanggalDisplay(p.tgl_kontrak),
            tanggal_akhir_kontrak: formatTanggalDisplay(p.tgl_akhir_kontrak)
        });
        return acc;
    }, {
        berjalan_dibawah_1_tahun: 0,
        berjalan_diatas_1_tahun: 0,
        berjalan_akan_berakhir_6_bulan: 0,
        berakhir: 0
    });
    const totalBerjalan = status.berjalan_dibawah_1_tahun
        + status.berjalan_diatas_1_tahun
        + status.berjalan_akan_berakhir_6_bulan;
    const jumlah = dalamPeriode.length;
    const urutanStatus = [
        'berjalan_dibawah_1_tahun',
        'berjalan_diatas_1_tahun',
        'berjalan_akan_berakhir_6_bulan',
        'berakhir'
    ];
    const kategoriStatus = urutanStatus.map(key => ({
        key,
        label: labelStatusStrategis[key],
        jumlah: status[key],
        jumlah_display: status[key].toLocaleString('id-ID'),
        persen: jumlah ? Math.round((status[key] / jumlah) * 100) : 0,
        daftar: daftarStatus[key]
    }));

    return {
        jumlah_kontrak: jumlah,
        jumlah_kontrak_display: jumlah.toLocaleString('id-ID'),
        total_mitra: mitraMap.size,
        total_mitra_display: mitraMap.size.toLocaleString('id-ID'),
        total_nominal: totalNominal,
        total_nominal_display: `Rp ${formatRupiahAngka(totalNominal)}`,
        nominal_tahunan: nominalTahunan,
        nominal_terendah: nominalTerendah,
        nominal_terendah_display: `Rp ${formatRupiahAngka(nominalTerendah)}`,
        nominal_terendah_kontrak: ringkasKontrakNominal(kontrakTerendah),
        nominal_tertinggi: nominalTertinggi,
        nominal_tertinggi_display: `Rp ${formatRupiahAngka(nominalTertinggi)}`,
        nominal_tertinggi_kontrak: ringkasKontrakNominal(kontrakTertinggi),
        rata_rata_nominal: jumlah ? Math.round(totalNominal / jumlah) : 0,
        rata_rata_nominal_display: `Rp ${formatRupiahAngka(jumlah ? Math.round(totalNominal / jumlah) : 0)}`,
        kerja_sama_berulang: kerjaSamaBerulang,
        jumlah_mitra_berulang: kerjaSamaBerulang.length,
        jumlah_mitra_berulang_display: kerjaSamaBerulang.length.toLocaleString('id-ID'),
        kerja_sama_tidak_berulang: kerjaSamaTidakBerulang,
        jumlah_mitra_tidak_berulang: kerjaSamaTidakBerulang.length,
        jumlah_mitra_tidak_berulang_display: kerjaSamaTidakBerulang.length.toLocaleString('id-ID'),
        kerja_sama_baru: kerjaSamaBaru,
        jumlah_mitra_baru: kerjaSamaBaru.length,
        jumlah_mitra_baru_display: kerjaSamaBaru.length.toLocaleString('id-ID'),
        status: {
            berjalan: totalBerjalan,
            berakhir: status.berakhir,
            berjalan_display: totalBerjalan.toLocaleString('id-ID'),
            berakhir_display: status.berakhir.toLocaleString('id-ID'),
            berjalan_persen: jumlah ? Math.round((totalBerjalan / jumlah) * 100) : 0,
            berakhir_persen: jumlah ? Math.round((status.berakhir / jumlah) * 100) : 0,
            berjalan_dibawah_1_tahun: status.berjalan_dibawah_1_tahun,
            berjalan_dibawah_1_tahun_display: status.berjalan_dibawah_1_tahun.toLocaleString('id-ID'),
            berjalan_dibawah_1_tahun_persen: jumlah ? Math.round((status.berjalan_dibawah_1_tahun / jumlah) * 100) : 0,
            berjalan_diatas_1_tahun: status.berjalan_diatas_1_tahun,
            berjalan_diatas_1_tahun_display: status.berjalan_diatas_1_tahun.toLocaleString('id-ID'),
            berjalan_diatas_1_tahun_persen: jumlah ? Math.round((status.berjalan_diatas_1_tahun / jumlah) * 100) : 0,
            berjalan_akan_berakhir_6_bulan: status.berjalan_akan_berakhir_6_bulan,
            berjalan_akan_berakhir_6_bulan_display: status.berjalan_akan_berakhir_6_bulan.toLocaleString('id-ID'),
            berjalan_akan_berakhir_6_bulan_persen: jumlah ? Math.round((status.berjalan_akan_berakhir_6_bulan / jumlah) * 100) : 0,
            kategori: kategoriStatus,
            daftar_berjalan_dibawah_1_tahun: daftarStatus.berjalan_dibawah_1_tahun,
            daftar_berjalan_diatas_1_tahun: daftarStatus.berjalan_diatas_1_tahun,
            daftar_berjalan_akan_berakhir_6_bulan: daftarStatus.berjalan_akan_berakhir_6_bulan,
            daftar_berakhir: daftarStatus.berakhir
        },
        tanpa_tanggal_kontrak: tanpaTanggal,
        periode_label: periode.rentang_display
    };
}

function itemJadwalUntukResponse(item) {
    const { dueDate, ...rest } = item;
    return rest;
}

function bangunArusUang(jadwalMasuk, jadwalKeluar, rentang, hariIni) {
    const masukDalamRentang = jadwalMasuk.filter(item => item.dueDate >= rentang.mulai && item.dueDate <= rentang.selesai);
    const keluarDalamRentang = jadwalKeluar.filter(item => item.dueDate >= rentang.mulai && item.dueDate <= rentang.selesai);
    const byTanggal = new Map();

    const ensureRow = item => {
        if (!byTanggal.has(item.tanggal)) {
            byTanggal.set(item.tanggal, {
                tanggal: item.tanggal,
                tanggal_display: item.tanggal_display,
                dueDate: item.dueDate,
                uang_masuk: 0,
                uang_keluar: 0,
                jumlah_masuk: 0,
                jumlah_keluar: 0
            });
        }
        return byTanggal.get(item.tanggal);
    };

    masukDalamRentang.forEach(item => {
        const row = ensureRow(item);
        row.uang_masuk += item.nominal;
        row.jumlah_masuk += 1;
    });

    keluarDalamRentang.forEach(item => {
        const row = ensureRow(item);
        row.uang_keluar += item.nominal;
        row.jumlah_keluar += 1;
    });

    let saldo = 0;
    const titik = Array.from(byTanggal.values())
        .sort((a, b) => a.dueDate - b.dueDate)
        .map(row => {
            saldo += row.uang_masuk - row.uang_keluar;
            return {
                tanggal: row.tanggal,
                tanggal_display: row.tanggal_display,
                uang_masuk: row.uang_masuk,
                uang_masuk_display: `Rp ${formatRupiahAngka(row.uang_masuk)}`,
                uang_keluar: row.uang_keluar,
                uang_keluar_display: `Rp ${formatRupiahAngka(row.uang_keluar)}`,
                saldo,
                saldo_display: `Rp ${formatRupiahAngka(saldo)}`,
                nominal: row.uang_masuk,
                nominal_display: `Rp ${formatRupiahAngka(row.uang_masuk)}`,
                jumlah_item: row.jumlah_masuk + row.jumlah_keluar,
                jumlah_masuk: row.jumlah_masuk,
                jumlah_keluar: row.jumlah_keluar
            };
        });

    const totalMasuk = masukDalamRentang.reduce((sum, item) => sum + item.nominal, 0);
    const totalKeluar = keluarDalamRentang.reduce((sum, item) => sum + item.nominal, 0);
    const saldoAkhir = totalMasuk - totalKeluar;
    const agendaLampau = masukDalamRentang
        .filter(item => item.dueDate < hariIni)
        .slice(-8)
        .reverse()
        .map(itemJadwalUntukResponse);
    const agendaMendatang = masukDalamRentang
        .filter(item => item.dueDate >= hariIni)
        .slice(0, 8)
        .map(itemJadwalUntukResponse);

    return {
        total: totalMasuk,
        total_display: `Rp ${formatRupiahAngka(totalMasuk)}`,
        total_masuk: totalMasuk,
        total_masuk_display: `Rp ${formatRupiahAngka(totalMasuk)}`,
        total_keluar: totalKeluar,
        total_keluar_display: `Rp ${formatRupiahAngka(totalKeluar)}`,
        saldo_akhir: saldoAkhir,
        saldo_akhir_display: `Rp ${formatRupiahAngka(saldoAkhir)}`,
        jumlah_item: masukDalamRentang.length + keluarDalamRentang.length,
        jumlah_masuk: masukDalamRentang.length,
        jumlah_keluar: keluarDalamRentang.length,
        jumlah_titik: titik.length,
        max_nominal: Math.max(0, ...titik.flatMap(row => [row.uang_masuk, row.uang_keluar, Math.abs(row.saldo)])),
        titik,
        agenda_lampau: agendaLampau,
        agenda_mendatang: agendaMendatang,
        catatan: 'Uang keluar dihitung dari data realisasi anggaran yang sudah dicatat pada sistem.'
    };
}

async function bangunJadwalPembiayaan() {
    const [programs, cicilanList, kontrakList] = await Promise.all([
        Program.find({}).lean(),
        Cicilan.find({}).sort({ id_program: 1, no_cicilan: 1 }).lean(),
        Kontrak.find({ status: 'approved' }).lean()
    ]);

    const cicilanByProgram = new Map();
    cicilanList.forEach(c => {
        if (!cicilanByProgram.has(c.id_program)) cicilanByProgram.set(c.id_program, []);
        cicilanByProgram.get(c.id_program).push(c);
    });

    const jadwal = [];
    const tanpaJadwal = [];
    const programDenganJadwal = new Set();

    const nominalCicilanProgram = (p, c) => {
        const nominalDasar = Number(c?.nominal) || 0;
        if (p?.cara_pembayaran !== 'Unit Price') return nominalDasar;
        const jumlahMahasiswa = Number(p?.jumlah_mahasiswa) || 0;
        return nominalDasar * jumlahMahasiswa;
    };

    const pushJadwal = ({ tanggal, nominal, id_program, kode_file, nama_mitra, judul, label, sumber, status_kontrak, termin_order }) => {
        const dueDate = parseTanggalDashboard(tanggal);
        const nilai = Number(nominal) || 0;
        const kodeFile = kode_file || '';
        if (!dueDate || nilai <= 0) return false;
        jadwal.push({
            tanggal: formatTanggalISO(dueDate),
            tanggal_display: formatTanggalDisplay(tanggal),
            dueDate,
            nominal: nilai,
            nominal_display: `Rp ${formatRupiahAngka(nilai)}`,
            id_program: id_program || '',
            kode_file: kodeFile,
            nama_mitra: nama_mitra || '',
            judul: judul || '',
            label: label || 'Pembayaran',
            sumber: sumber || 'Program',
            status_kontrak: status_kontrak || '',
            status_alokasi: statusAlokasiKerma(kodeFile),
            termin_order: Number(termin_order) || null
        });
        if (id_program) programDenganJadwal.add(id_program);
        return true;
    };

    programs.forEach(p => {
        const statusKontrak = hitungStatusKontrak(p.tgl_akhir_kontrak);
        const cicilanProgram = cicilanByProgram.get(p.id_program) || [];
        let adaRencanaPembayaran = false;

        const pushTanpaTanggal = ({ nominal, label, sumber, termin_order }) => {
            const nilai = Number(nominal) || 0;
            if (nilai <= 0) return;
            adaRencanaPembayaran = true;
            tanpaJadwal.push({
                id_program: p.id_program,
                kode_file: p.kode_file,
                nama_mitra: p.nama_mitra,
                judul: p.judul_pks,
                label: label || 'Pembayaran',
                sumber: sumber || p.cara_pembayaran || 'Program',
                nominal: nilai,
                nominal_display: `Rp ${formatRupiahAngka(nilai)}`,
                status_kontrak: statusKontrak,
                status_alokasi: statusAlokasiKerma(p.kode_file),
                termin_order: Number(termin_order) || null
            });
        };

        if ((p.cara_pembayaran === 'Termin' || p.cara_pembayaran === 'Unit Price') && cicilanProgram.length > 0) {
            cicilanProgram.forEach(c => {
                const nominalCicilan = nominalCicilanProgram(p, c);
                const pushed = pushJadwal({
                    tanggal: c.batas_akhir,
                    nominal: nominalCicilan,
                    id_program: p.id_program,
                    kode_file: p.kode_file,
                    nama_mitra: p.nama_mitra,
                    judul: p.judul_pks,
                    label: c.label || `Cicilan ${c.no_cicilan}`,
                    sumber: p.cara_pembayaran,
                    status_kontrak: statusKontrak,
                    termin_order: c.no_cicilan
                });
                if (pushed) adaRencanaPembayaran = true;
                else pushTanpaTanggal({
                    nominal: nominalCicilan,
                    label: c.label || `Cicilan ${c.no_cicilan}`,
                    sumber: p.cara_pembayaran,
                    termin_order: c.no_cicilan
                });
            });
        } else {
            const nilaiKontrak = Number(p.nilai_kontrak) || 0;
            const pushed = pushJadwal({
                tanggal: p.batas_akhir_pembayaran,
                nominal: nilaiKontrak,
                id_program: p.id_program,
                kode_file: p.kode_file,
                nama_mitra: p.nama_mitra,
                judul: p.judul_pks,
                label: p.cara_pembayaran || 'Lump Sum',
                sumber: 'Program',
                status_kontrak: statusKontrak
            });
            if (pushed) adaRencanaPembayaran = true;
            else pushTanpaTanggal({
                nominal: nilaiKontrak,
                label: p.cara_pembayaran || 'Lump Sum',
                sumber: 'Program'
            });
        }

        if (!adaRencanaPembayaran && Number(p.nilai_kontrak) > 0) {
            pushTanpaTanggal({
                nominal: p.nilai_kontrak,
                label: p.cara_pembayaran || 'Pembayaran',
                sumber: p.cara_pembayaran || 'Program'
            });
        }
    });

    const programMap = new Map(programs.map(p => [p.id_program, p]));
    kontrakList.forEach(k => {
        if (k.id_program && programDenganJadwal.has(k.id_program)) return;
        const program = programMap.get(k.id_program) || {};
        (k.rincian_bpp || []).forEach((r, i) => {
            const nominal = Number(r.total_BPP) || 0;
            const pushed = pushJadwal({
                tanggal: r.batas_pembayaran,
                nominal,
                id_program: k.id_program || k.id_kontrak,
                kode_file: program.kode_file || '',
                nama_mitra: k.nama_mitra,
                    judul: k.no_kontrak_sbm || k.no_kontrak_mitra || k.id_kontrak,
                    label: r.tahap || `Rincian BPP ${i + 1}`,
                    sumber: 'Kontrak Approved',
                    status_kontrak: k.status,
                    termin_order: i + 1
                });
            if (!pushed && nominal > 0) {
                tanpaJadwal.push({
                    id_program: k.id_program || k.id_kontrak,
                    kode_file: program.kode_file || '',
                    nama_mitra: k.nama_mitra,
                    judul: k.no_kontrak_sbm || k.no_kontrak_mitra || k.id_kontrak,
                    label: r.tahap || `Rincian BPP ${i + 1}`,
                    sumber: 'Kontrak Approved',
                    nominal,
                    nominal_display: `Rp ${formatRupiahAngka(nominal)}`,
                    status_kontrak: k.status,
                    termin_order: i + 1
                });
            }
        });
    });

    jadwal.sort((a, b) => a.dueDate - b.dueDate || a.nama_mitra.localeCompare(b.nama_mitra, 'id'));
    return { jadwal, tanpaJadwal, programs };
}

async function bangunJadwalRealisasiAnggaran() {
    const [realisasiList, programs] = await Promise.all([
        RealisasiAnggaran.find({}).sort({ tanggal: 1, kategori: 1 }).lean(),
        Program.find({}).lean()
    ]);
    const programMap = new Map(programs.map(p => [p.id_program, p]));

    const tanpaTanggal = [];
    const jadwal = realisasiList
        .map(row => {
            const dueDate = parseTanggalDashboard(row.tanggal);
            const nominal = Number(row.nominal) || 0;
            if (nominal <= 0) return null;
            const program = programMap.get(row.id_program) || {};
            if (!dueDate) {
                tanpaTanggal.push({
                    id_program: row.id_program || '',
                    kode_file: row.kode_file || program.kode_file || '',
                    nama_mitra: program.nama_mitra || '',
                    judul: program.judul_pks || '',
                    kategori: row.kategori || '',
                    nominal,
                    nominal_display: `Rp ${formatRupiahAngka(nominal)}`,
                    keterangan: row.keterangan || ''
                });
                return null;
            }
            return {
                tanggal: formatTanggalISO(dueDate),
                tanggal_display: formatTanggalDisplay(row.tanggal),
                dueDate,
                nominal,
                nominal_display: `Rp ${formatRupiahAngka(nominal)}`,
                id_program: row.id_program || '',
                nama_mitra: program.nama_mitra || '',
                judul: program.judul_pks || '',
                label: row.kategori || 'Realisasi Anggaran',
                sumber: 'Realisasi Anggaran',
                kategori: row.kategori || '',
                keterangan: row.keterangan || '',
                status_kontrak: hitungStatusKontrak(program.tgl_akhir_kontrak)
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.dueDate - b.dueDate || a.id_program.localeCompare(b.id_program, 'id'));

    const kategori = KATEGORI_REALISASI_ANGGARAN.map(label => {
        const total = realisasiList
            .filter(row => row.kategori === label)
            .reduce((sum, row) => sum + (Number(row.nominal) || 0), 0);
        return {
            kategori: label,
            total,
            total_display: `Rp ${formatRupiahAngka(total)}`
        };
    });

    return {
        jadwal,
        total: realisasiList.reduce((sum, row) => sum + (Number(row.nominal) || 0), 0),
        total_bertanggal: jadwal.reduce((sum, row) => sum + row.nominal, 0),
        total_tanpa_tanggal: tanpaTanggal.reduce((sum, row) => sum + row.nominal, 0),
        jumlah_tanpa_tanggal: tanpaTanggal.length,
        kategori,
        tanpaTanggal
    };
}

async function bangunJadwalRealisasiPembayaran(options = {}) {
    const basisTanggal = options.basisTanggal || 'realisasi';
    const gunakanTanggalRencana = basisTanggal === 'rencana';
    const [pembayaranList, programs, rencanaPembiayaan] = await Promise.all([
        safeMongoRead('RealisasiPembayaran.find(all)', () => RealisasiPembayaran.find({}).sort({ tanggal: 1 }).lean(), []),
        Program.find({}).lean(),
        gunakanTanggalRencana
            ? Promise.resolve(options.jadwalPembiayaan ? { jadwal: options.jadwalPembiayaan } : bangunJadwalPembiayaan())
            : Promise.resolve(null)
    ]);
    const programMap = new Map(programs.map(p => [p.id_program, p]));
    const rencanaIndex = gunakanTanggalRencana ? buatIndexRencanaPembayaran(rencanaPembiayaan?.jadwal || []) : null;

    const jadwal = pembayaranList
        .map(row => {
            const rencana = rencanaIndex ? cariRencanaPembayaranUntukRealisasi(row, rencanaIndex) : null;
            const tanggalAcuan = gunakanTanggalRencana ? rencana?.tanggal_input : row.tanggal;
            const dueDate = parseTanggalDashboard(tanggalAcuan);
            const nominal = nominalRealisasiPenerimaan(row);
            if (!dueDate || nominal <= 0) return null;
            const program = programMap.get(row.id_program) || {};
            return {
                tanggal: formatTanggalISO(dueDate),
                tanggal_display: formatTanggalDisplay(tanggalAcuan),
                dueDate,
                nominal,
                nominal_display: `Rp ${formatRupiahAngka(nominal)}`,
                id_program: row.id_program || '',
                kode_file: row.kode_file || program.kode_file || '',
                nama_mitra: program.nama_mitra || '',
                judul: program.judul_pks || '',
                label: 'Pembayaran diterima SBM',
                sumber: 'Realisasi Pembayaran',
                basis_tanggal: gunakanTanggalRencana ? 'Rencana Pembayaran Kontrak' : 'Realisasi Pembayaran',
                tanggal_realisasi: formatTanggalInput(row.tanggal),
                tanggal_rencana: rencana?.tanggal_input || '',
                keterangan: keteranganRealisasiPembayaranTampil(row.keterangan),
                status_kontrak: hitungStatusKontrak(program.tgl_akhir_kontrak)
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.dueDate - b.dueDate || a.kode_file.localeCompare(b.kode_file, 'id'));

    return {
        jadwal,
        total: jadwal.reduce((sum, row) => sum + row.nominal, 0),
        jumlah_item: jadwal.length,
        basis_tanggal: gunakanTanggalRencana ? 'Rencana Pembayaran Kontrak' : 'Realisasi Pembayaran',
        jumlah_tanpa_tanggal: pembayaranList.length - jadwal.length
    };
}

function prosesTemplatWord(dataMentah, templatePath) {
    const tp = templatePath || path.resolve(__dirname, 'template.docx');
    const fileTemplate = fs.readFileSync(tp, 'binary');
    const zip = new PizZip(fileTemplate);
    let doc;
    try {
        doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    } catch (e) {
        if (e.properties?.errors) e.properties.errors.forEach((err, i) =>
            console.error(`  Template error #${i+1}:`, JSON.stringify(err.properties || err.message)));
        throw e;
    }
    try {
        doc.render(dataMentah);
    } catch (e) {
        if (e.properties?.errors) e.properties.errors.forEach((err, i) =>
            console.error(`  Render error #${i+1}:`, JSON.stringify(err.properties || err.message)));
        throw e;
    }
    if (path.basename(tp) === 'template.docx') {
        const renderedZip = doc.getZip();
        rapikanTabelLaporan(renderedZip);
        kunciMergeFieldLaporan(renderedZip);
        sisipkanLampiranKontrakLaporan(renderedZip, dataMentah);
        aktifkanDaftarIsiLaporan(renderedZip);
    }
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function teksPolosXml(xml = '') {
    return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function aturLebarCellWord(tcXml, width) {
    const tcW = `<w:tcW w:w="${width}" w:type="dxa"/>`;
    if (/<w:tcW\b[^>]*\/>/.test(tcXml)) {
        return tcXml.replace(/<w:tcW\b[^>]*\/>/, tcW);
    }
    return tcXml.replace(/<w:tcPr>/, `<w:tcPr>${tcW}`);
}

function aturFontKecilTabelWord(tblXml, size = 18) {
    const sz = `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
    return tblXml.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, rPr => {
        let next = rPr
            .replace(/<w:sz\b[^>]*\/>/g, '')
            .replace(/<w:szCs\b[^>]*\/>/g, '');
        return next.replace('</w:rPr>', `${sz}</w:rPr>`);
    });
}

function ratakanTengahParagrafWord(pXml) {
    if (/<w:pPr>[\s\S]*?<\/w:pPr>/.test(pXml)) {
        return pXml.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, pPr => {
            if (/<w:jc\b[^>]*\/>/.test(pPr)) return pPr.replace(/<w:jc\b[^>]*\/>/, '<w:jc w:val="center"/>');
            return pPr.replace('</w:pPr>', '<w:jc w:val="center"/></w:pPr>');
        });
    }
    return pXml.replace(/<w:p\b([^>]*)>/, '<w:p$1><w:pPr><w:jc w:val="center"/></w:pPr>');
}

function ratakanTengahCellWord(tcXml) {
    return tcXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, ratakanTengahParagrafWord);
}

function aturLebarKolomWord(tblXml, widths) {
    const grid = `<w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
    let updated = /<w:tblGrid>[\s\S]*?<\/w:tblGrid>/.test(tblXml)
        ? tblXml.replace(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/, grid)
        : tblXml.replace(/<\/w:tblPr>/, `</w:tblPr>${grid}`);

    updated = updated.replace(/<w:tblLayout\b[^>]*\/>/, '<w:tblLayout w:type="fixed"/>');
    if (!/<w:tblLayout\b/.test(updated)) {
        updated = updated.replace(/<w:tblPr>/, '<w:tblPr><w:tblLayout w:type="fixed"/>');
    }

    return updated.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, rowXml => {
        let colIndex = 0;
        return rowXml.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, tcXml => {
            const width = widths[colIndex] || widths[widths.length - 1];
            const centered = colIndex === 0;
            colIndex += 1;
            const sizedCell = aturLebarCellWord(tcXml, width);
            return centered ? ratakanTengahCellWord(sizedCell) : sizedCell;
        });
    });
}

function rapikanTabelLaporan(zip) {
    const doc = zip.file('word/document.xml');
    if (!doc) return;
    const xml = doc.asText();
    const updated = xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, tblXml => {
        const plain = teksPolosXml(tblXml);
        if (plain.includes('No NIM Nama IPK Status SKS Lulus')) {
            return aturFontKecilTabelWord(aturLebarKolomWord(tblXml, [520, 1350, 3350, 700, 2100, 1330]));
        }
        if (plain.includes('No NIM Nama Pembimbing 1 Pembimbing 2')) {
            return aturFontKecilTabelWord(aturLebarKolomWord(tblXml, [520, 1350, 3000, 2315, 2315]));
        }
        return tblXml;
    });
    zip.file('word/document.xml', updated);
}

function kunciMergeFieldWord(xml) {
    const runRegex = /<w:r\b[\s\S]*?<\/w:r>/g;
    let output = '';
    let cursor = 0;
    let match;

    while ((match = runRegex.exec(xml))) {
        const runXml = match[0];
        output += xml.slice(cursor, match.index);

        if (!/<w:fldChar\b[^>]*w:fldCharType="begin"/.test(runXml)) {
            output += runXml;
            cursor = runRegex.lastIndex;
            continue;
        }

        const fieldStart = match.index;
        const runs = [runXml];
        let next;
        while ((next = runRegex.exec(xml))) {
            runs.push(next[0]);
            if (/<w:fldChar\b[^>]*w:fldCharType="end"/.test(next[0])) break;
        }

        const fieldEnd = runRegex.lastIndex;
        const fieldXml = runs.join('');
        const isMergeField = /<w:instrText[^>]*>\s*MERGEFIELD\b/i.test(fieldXml);
        const hasSeparate = /<w:fldChar\b[^>]*w:fldCharType="separate"/.test(fieldXml);

        if (!isMergeField || !hasSeparate) {
            output += xml.slice(fieldStart, fieldEnd);
            cursor = fieldEnd;
            continue;
        }

        const resultRuns = [];
        let collectingResult = false;
        for (const fieldRun of runs) {
            if (/<w:fldChar\b[^>]*w:fldCharType="separate"/.test(fieldRun)) {
                collectingResult = true;
                continue;
            }
            if (/<w:fldChar\b[^>]*w:fldCharType="end"/.test(fieldRun)) break;
            if (collectingResult) resultRuns.push(fieldRun);
        }

        output += resultRuns.join('');
        cursor = fieldEnd;
    }

    return output + xml.slice(cursor);
}

function kunciMergeFieldLaporan(zip) {
    const doc = zip.file('word/document.xml');
    if (!doc) return;
    zip.file('word/document.xml', kunciMergeFieldWord(doc.asText()));
}

function escapeXmlWord(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buatParagrafWord(text, options = {}) {
    const align = options.align ? `<w:jc w:val="${options.align}"/>` : '';
    const outline = options.outlineLevel != null ? `<w:outlineLvl w:val="${options.outlineLevel}"/>` : '';
    const pageBreakBefore = options.pageBreakBefore ? '<w:pageBreakBefore/>' : '';
    const bold = options.bold ? '<w:b/><w:bCs/>' : '';
    const size = options.size || 24;
    return [
        '<w:p>',
        `<w:pPr>${pageBreakBefore}${outline}${align}<w:spacing w:after="${options.after ?? 120}"/><w:rPr>${bold}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:pPr>`,
        `<w:r><w:rPr>${bold}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXmlWord(text)}</w:t></w:r>`,
        '</w:p>'
    ].join('');
}

function buatParagrafHyperlinkWord(text, relId) {
    return [
        '<w:p>',
        '<w:pPr><w:spacing w:after="120"/></w:pPr>',
        `<w:hyperlink r:id="${relId}" w:history="1">`,
        '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>',
        `<w:t xml:space="preserve">${escapeXmlWord(text)}</w:t>`,
        '</w:r>',
        '</w:hyperlink>',
        '</w:p>'
    ].join('');
}

function tambahRelasiHyperlinkWord(zip, target) {
    if (!target) return '';
    const relPath = 'word/_rels/document.xml.rels';
    const relFile = zip.file(relPath);
    const defaultRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    const relXml = relFile ? relFile.asText() : defaultRels;
    const existing = [...relXml.matchAll(/<Relationship\b[^>]*>/g)].find(m => {
        const rel = m[0];
        return /Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/hyperlink"/.test(rel)
            && rel.includes(`Target="${escapeXmlWord(target)}"`);
    });
    if (existing) return (existing[0].match(/Id="([^"]+)"/) || [])[1] || '';

    const maxId = [...relXml.matchAll(/Id="rId(\d+)"/g)]
        .reduce((max, m) => Math.max(max, Number(m[1]) || 0), 0);
    const relId = `rId${maxId + 1}`;
    const relationship = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXmlWord(target)}" TargetMode="External"/>`;
    const updated = relXml.includes('</Relationships>')
        ? relXml.replace('</Relationships>', `${relationship}</Relationships>`)
        : defaultRels.replace('</Relationships>', `${relationship}</Relationships>`);
    zip.file(relPath, updated);
    return relId;
}

function tambahRelasiGambarWord(zip, target) {
    const relPath = 'word/_rels/document.xml.rels';
    const relFile = zip.file(relPath);
    const defaultRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    const relXml = relFile ? relFile.asText() : defaultRels;
    const maxId = [...relXml.matchAll(/Id="rId(\d+)"/g)]
        .reduce((max, m) => Math.max(max, Number(m[1]) || 0), 0);
    const relId = `rId${maxId + 1}`;
    const relationship = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${escapeXmlWord(target)}"/>`;
    const updated = relXml.includes('</Relationships>')
        ? relXml.replace('</Relationships>', `${relationship}</Relationships>`)
        : defaultRels.replace('</Relationships>', `${relationship}</Relationships>`);
    zip.file(relPath, updated);
    return relId;
}

function buildUrlLampiranKontrak(data = {}) {
    if (data.file_kontrak_url) return data.file_kontrak_url;
    const file = path.basename(data.file_kontrak || '');
    if (!file) return '';
    return `/uploads/kontrak/${encodeURIComponent(file)}`;
}

function buatGambarWord(relId, filename, widthPx, heightPx, index, pageBreakBefore = true) {
    const maxWidthEmu = 5750000;
    const maxHeightEmu = 7200000;
    let widthEmu = maxWidthEmu;
    let heightEmu = widthPx > 0 ? Math.round(widthEmu * (heightPx / widthPx)) : maxHeightEmu;
    if (heightEmu > maxHeightEmu) {
        heightEmu = maxHeightEmu;
        widthEmu = heightPx > 0 ? Math.round(heightEmu * (widthPx / heightPx)) : maxWidthEmu;
    }
    const docPrId = 9000 + index;
    const pageBreak = pageBreakBefore ? '<w:pageBreakBefore/>' : '';
    return [
        '<w:p>',
        `<w:pPr>${pageBreak}<w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>`,
        '<w:r><w:drawing>',
        '<wp:inline distT="0" distB="0" distL="0" distR="0">',
        `<wp:extent cx="${widthEmu}" cy="${heightEmu}"/>`,
        `<wp:docPr id="${docPrId}" name="${escapeXmlWord(filename)}"/>`,
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>',
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
        '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
        `<pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${escapeXmlWord(filename)}"/><pic:cNvPicPr/></pic:nvPicPr>`,
        `<pic:blipFill><a:blip r:embed="${relId}" cstate="print"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`,
        `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`,
        '</pic:pic>',
        '</a:graphicData>',
        '</a:graphic>',
        '</wp:inline>',
        '</w:drawing></w:r>',
        '</w:p>'
    ].join('');
}

function pastikanContentTypeJpegWord(zip) {
    const contentTypesPath = '[Content_Types].xml';
    const file = zip.file(contentTypesPath);
    if (!file) return;
    let xml = file.asText();
    const insertDefault = entry => {
        if (xml.includes(entry)) return;
        xml = xml.includes('<Override ')
            ? xml.replace('<Override ', `${entry}<Override `)
            : xml.replace('</Types>', `${entry}</Types>`);
    };
    insertDefault('<Default Extension="jpg" ContentType="image/jpeg"/>');
    insertDefault('<Default Extension="jpeg" ContentType="image/jpeg"/>');
    zip.file(contentTypesPath, xml);
}

function renderPdfKontrakKeGambar(filePath) {
    const scriptPath = path.resolve(__dirname, 'scripts', 'render-pdf-pages.mjs');
    if (!fs.existsSync(scriptPath)) return [];
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kerma-kontrak-pdf-'));
    try {
        const stdout = execFileSync(process.execPath, [scriptPath, filePath, outputDir, '1000', '0'], {
            encoding: 'utf8',
            timeout: 240000,
            maxBuffer: 1024 * 1024 * 4
        });
        return stdout.split(/\r?\n/)
            .map(s => s.trim())
            .filter(Boolean)
            .map(line => {
                const [pagePath, width, height] = line.split('\t');
                return { path: pagePath, width: Number(width) || 1000, height: Number(height) || 1415 };
            });
    } catch (err) {
        console.error('Gagal render PDF kontrak:', err.message);
        fs.rmSync(outputDir, { recursive: true, force: true });
        return [];
    }
}

function sisipkanGambarPdfKontrakWord(zip, data = {}) {
    const file = path.basename(data.file_kontrak || '');
    if (!file || path.extname(file).toLowerCase() !== '.pdf') return '';
    const preparedPath = data.file_kontrak_local_path
        ? path.resolve(String(data.file_kontrak_local_path))
        : '';
    const filePath = preparedPath && fs.existsSync(preparedPath)
        ? preparedPath
        : getUploadLocalFallback('kontrak', file);
    if (!filePath) return buatParagrafWord('File PDF kontrak tidak ditemukan pada folder unggahan.', { size: 22, after: 80 });

    const pageImages = renderPdfKontrakKeGambar(filePath);
    if (pageImages.length === 0) return buatParagrafWord('PDF kontrak belum dapat dirender menjadi gambar pada server ini.', { size: 22, after: 80 });
    pastikanContentTypeJpegWord(zip);

    const imageXml = [];

    try {
        pageImages.forEach((page, i) => {
            const mediaName = `lampiran-kontrak-${i + 1}.jpg`;
            const mediaPath = `word/media/${mediaName}`;
            zip.file(mediaPath, fs.readFileSync(page.path));
            const relId = tambahRelasiGambarWord(zip, `media/${mediaName}`);
            imageXml.push(buatGambarWord(relId, mediaName, page.width, page.height, i + 1, i > 0));
        });
    } finally {
        const outputDir = path.dirname(pageImages[0].path);
        fs.rmSync(outputDir, { recursive: true, force: true });
    }

    return imageXml.join('');
}

function buatLampiranKontrakWord(zip, data = {}, includeHeading = true) {
    return [
        includeHeading ? buatParagrafWord('Lampiran 1. Dokumen Kontrak/PKS', { bold: true, size: 28, outlineLevel: 0, pageBreakBefore: true, after: 180 }) : '',
        sisipkanGambarPdfKontrakWord(zip, data)
    ].join('');
}

function sisipkanLampiranKontrakLaporan(zip, data = {}) {
    const doc = zip.file('word/document.xml');
    if (!doc) return;
    const xml = doc.asText();
    if (xml.includes('lampiran-kontrak-1.jpg')) return;

    const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)];
    const lampiranSatu = paragraphs.find(p => /^Lampiran\s+1[.:]\s+.+$/i.test(teksParagrafWord(p[0])));
    if (lampiranSatu) {
        const insertAt = lampiranSatu.index + lampiranSatu[0].length;
        const lampiranXml = buatLampiranKontrakWord(zip, data, false);
        zip.file('word/document.xml', xml.slice(0, insertAt) + lampiranXml + xml.slice(insertAt));
        return;
    }

    const lampiranXml = buatLampiranKontrakWord(zip, data, true);
    const updated = xml.includes('<w:sectPr')
        ? xml.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/, match => `${lampiranXml}${match}`)
        : xml.replace('</w:body>', `${lampiranXml}</w:body>`);
    zip.file('word/document.xml', updated);
}

function teksParagrafWord(pXml = '') {
    return [...pXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map(m => m[1])
        .join('')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function levelHeadingDaftarIsi(text) {
    if (/^Lampiran\s+\d+[.:]\s+.+$/i.test(text)) return 0;
    if (/^(IKHTISAR EKSEKUTIF|BAB\s+[IVX]+[.:]\s+.+)$/i.test(text)) return 0;
    if (/^(Latar Belakang Kerja Sama|Tujuan Kerja Sama|Tujuan Laporan)$/i.test(text)) return 1;
    if (/^(Evaluasi Capaian Akademik Peserta Didik|Keterlibatan Modal Insani \(Human Capital Engagement\)|Pendukung Operasional Akademik)$/i.test(text)) return 1;
    if (/^(Kinerja per Semester|MK yang diambil|Silabus \(SPACE\))$/i.test(text)) return 1;
    return null;
}

function isJudulBabLaporan(text) {
    return /^BAB\s+[IVX]+[.:]\s+.+$/i.test(text);
}

function isJudulLampiranLaporan(text) {
    return /^Lampiran\s+\d+[.:]\s+.+$/i.test(text);
}

function aturOutlineParagrafWord(pXml, level) {
    const outline = `<w:outlineLvl w:val="${level}"/>`;
    if (/<w:pPr>[\s\S]*?<\/w:pPr>/.test(pXml)) {
        return pXml.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, pPr => {
            if (/<w:outlineLvl\b[^>]*\/>/.test(pPr)) return pPr.replace(/<w:outlineLvl\b[^>]*\/>/, outline);
            return pPr.replace('</w:pPr>', `${outline}</w:pPr>`);
        });
    }
    return pXml.replace(/<w:p\b([^>]*)>/, `<w:p$1><w:pPr>${outline}</w:pPr>`);
}

function aturPageBreakBeforeParagrafWord(pXml) {
    if (/<w:pPr>[\s\S]*?<\/w:pPr>/.test(pXml)) {
        return pXml.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, pPr => {
            if (/<w:pageBreakBefore\b[^>]*\/>/.test(pPr)) return pPr;
            return pPr.replace('</w:pPr>', '<w:pageBreakBefore/></w:pPr>');
        });
    }
    return pXml.replace(/<w:p\b([^>]*)>/, '<w:p$1><w:pPr><w:pageBreakBefore/></w:pPr>');
}

function tandaiHeadingDaftarIsiWord(xml) {
    return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, pXml => {
        const level = levelHeadingDaftarIsi(teksParagrafWord(pXml));
        return level === null ? pXml : aturOutlineParagrafWord(pXml, level);
    });
}

function aturBabMulaiHalamanBaruWord(xml) {
    return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, pXml => {
        const text = teksParagrafWord(pXml);
        return (isJudulBabLaporan(text) || isJudulLampiranLaporan(text))
            ? aturPageBreakBeforeParagrafWord(pXml)
            : pXml;
    });
}

function buatFieldDaftarIsiWord() {
    return [
        '<w:p>',
        '<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>',
        '<w:r><w:instrText xml:space="preserve">TOC \\o "1-2" \\h \\z \\u</w:instrText></w:r>',
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>',
        '<w:r><w:t>Klik kanan daftar isi, lalu pilih Update Field untuk memperbarui nomor halaman.</w:t></w:r>',
        '<w:r><w:fldChar w:fldCharType="end"/></w:r>',
        '</w:p>'
    ].join('');
}

function buatPageBreakWord() {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function sisipkanFieldDaftarIsiWord(xml) {
    if (/TOC\s+\\\\o\s+"1-2"/.test(xml)) return xml;
    const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)];
    const daftarIndex = paragraphs.findIndex(p => teksParagrafWord(p[0]).toUpperCase() === 'DAFTAR ISI');
    if (daftarIndex === -1) return xml;

    const nextContent = paragraphs.slice(daftarIndex + 1).find(p => teksParagrafWord(p[0]));
    const daftarParagraph = paragraphs[daftarIndex];
    const insertAt = daftarParagraph.index + daftarParagraph[0].length;
    const continueAt = nextContent ? nextContent.index : insertAt;
    return xml.slice(0, insertAt) + buatFieldDaftarIsiWord() + buatPageBreakWord() + xml.slice(continueAt);
}

function nonaktifkanUpdateFieldsWord(zip) {
    const settings = zip.file('word/settings.xml');
    if (!settings) return;
    const xml = settings.asText();
    const updated = xml.replace(/<w:updateFields\b[^>]*\/>/g, '');
    zip.file('word/settings.xml', updated);
}

function aktifkanDaftarIsiLaporan(zip) {
    const doc = zip.file('word/document.xml');
    if (!doc) return;
    const withHeadings = tandaiHeadingDaftarIsiWord(doc.asText());
    const withBabBreaks = aturBabMulaiHalamanBaruWord(withHeadings);
    zip.file('word/document.xml', sisipkanFieldDaftarIsiWord(withBabBreaks));
    nonaktifkanUpdateFieldsWord(zip);
}

// ─── Excel import helpers ─────────────────────────────────────────────────────

const KOLOM_MAHASISWA = ['id_program','nim','nama','fakultas','prodi','tahun_masuk','semester_masuk','dosen_wali','status','sks_lulus','ipk','pembimbing_1','pembimbing_2'];

const ALIAS_HEADER = {
    nama_mahasiswa: 'nama', nama_lengkap: 'nama',
    program_studi: 'prodi', program: 'prodi',
    tahun_angkatan: 'tahun_masuk', angkatan: 'tahun_masuk',
    semester: 'semester_masuk', sem_masuk: 'semester_masuk',
    sks: 'sks_lulus', sks_telah_lulus: 'sks_lulus',
    pembimbing1: 'pembimbing_1', dosen_pembimbing_1: 'pembimbing_1',
    pembimbing2: 'pembimbing_2', dosen_pembimbing_2: 'pembimbing_2',
    id_kerma: 'id_program', program_id: 'id_program',
    wali: 'dosen_wali', dosen_wali_akademik: 'dosen_wali'
};

function normHeader(h) {
    return h.toString().toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
function resolveHeader(raw) {
    const n = normHeader(raw);
    return ALIAS_HEADER[n] || n;
}

// Semua API di bawah ini butuh login
app.use('/api', requireLogin);

// ─── API: Dashboard pimpinan ─────────────────────────────────────────────────

async function handleIndikatorPimpinan(req, res) {
    try {
        const tanggalDipilih = parseTanggalDashboard(req.query.tanggal) || (() => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d;
        })();
        const hariIni = new Date();
        hariIni.setHours(0, 0, 0, 0);
        const batas30Hari = tambahHari(tanggalDipilih, 30);
        const { jadwal: jadwalPembiayaan, tanpaJadwal, programs } = await bangunJadwalPembiayaan();
        const realisasiPembayaran = await bangunJadwalRealisasiPembayaran();
        const realisasiPembayaranTanggalRencana = await bangunJadwalRealisasiPembayaran({
            basisTanggal: 'rencana',
            jadwalPembiayaan
        });
        const realisasiAnggaran = await bangunJadwalRealisasiAnggaran();
        const jadwalRealisasiPembayaran = realisasiPembayaran.jadwal;
        const jadwalKeluar = realisasiAnggaran.jadwal;
        const periodeKontrak = bangunPeriodeKontrak(req.query, tanggalDipilih);
        const rentangArus = bangunRentangArus(req.query, tanggalDipilih);
        const indikatorKontrak = hitungIndikatorKontrak(programs, periodeKontrak);
        const arusUang = bangunArusUang(jadwalRealisasiPembayaran, jadwalKeluar, rentangArus, hariIni);
        indikatorKontrak.penerimaan_tahunan = hitungPenerimaanTahunan(realisasiPembayaranTanggalRencana.jadwal, rentangArus);
        indikatorKontrak.penerimaan_tahunan_basis_tanggal = realisasiPembayaranTanggalRencana.basis_tanggal;
        indikatorKontrak.penerimaan_tahunan_tanpa_tanggal = realisasiPembayaranTanggalRencana.jumlah_tanpa_tanggal;

        const totalJadwal = jadwalPembiayaan.reduce((sum, item) => sum + item.nominal, 0);
        const totalNilaiKontrakSeluruh = programs.reduce((sum, item) => sum + (Number(item.nilai_kontrak) || 0), 0);
        const uangMasukSampaiTanggal = jadwalRealisasiPembayaran
            .filter(item => item.dueDate <= tanggalDipilih)
            .reduce((sum, item) => sum + item.nominal, 0);
        const uangBelumDiterimaKontrak = Math.max(0, totalNilaiKontrakSeluruh - uangMasukSampaiTanggal);
        const uangKeluarSampaiTanggal = jadwalKeluar
            .filter(item => item.dueDate <= tanggalDipilih)
            .reduce((sum, item) => sum + item.nominal, 0);
        const realisasiAnggaranTanpaTanggal = Number(realisasiAnggaran.total_tanpa_tanggal) || 0;
        const rencanaAnggaranSampaiTanggal = 0;
        const totalAnggaranTerkunciSampaiTanggal = rencanaAnggaranSampaiTanggal + uangKeluarSampaiTanggal + realisasiAnggaranTanpaTanggal;
        const saldoSampaiTanggal = uangMasukSampaiTanggal - totalAnggaranTerkunciSampaiTanggal;
        const uangTanggalDipilih = jadwalRealisasiPembayaran
            .filter(item => item.dueDate.getTime() === tanggalDipilih.getTime())
            .reduce((sum, item) => sum + item.nominal, 0);
        const uangKeluarTanggalDipilih = jadwalKeluar
            .filter(item => item.dueDate.getTime() === tanggalDipilih.getTime())
            .reduce((sum, item) => sum + item.nominal, 0);
        const proyeksi30Hari = jadwalRealisasiPembayaran
            .filter(item => item.dueDate > tanggalDipilih && item.dueDate <= batas30Hari)
            .reduce((sum, item) => sum + item.nominal, 0);
        const jatuhTempoLewat = jadwalRealisasiPembayaran
            .filter(item => item.dueDate < hariIni)
            .reduce((sum, item) => sum + item.nominal, 0);
        const belumTerjadwal = tanpaJadwal.reduce((sum, item) => sum + item.nominal, 0);

        const bulanAwal = awalBulan(tanggalDipilih);
        const bulanMap = new Map();
        for (let i = 0; i < 6; i++) {
            const d = tambahBulan(bulanAwal, i);
            bulanMap.set(keyBulan(d), { key: keyBulan(d), label: labelBulan(d), nominal: 0, jumlah_item: 0 });
        }
        jadwalRealisasiPembayaran.forEach(item => {
            const key = keyBulan(item.dueDate);
            if (!bulanMap.has(key)) return;
            const row = bulanMap.get(key);
            row.nominal += item.nominal;
            row.jumlah_item += 1;
        });
        const trenBulanan = Array.from(bulanMap.values()).map(row => ({
            ...row,
            nominal_display: `Rp ${formatRupiahAngka(row.nominal)}`
        }));
        const maxBulanan = Math.max(1, ...trenBulanan.map(row => row.nominal));
        trenBulanan.forEach(row => { row.persen = Math.round((row.nominal / maxBulanan) * 100); });

        const agendaMendatang = jadwalRealisasiPembayaran
            .filter(item => item.dueDate >= tanggalDipilih)
            .slice(0, 8)
            .map(({ dueDate, ...item }) => item);
        const agendaLewat = jadwalRealisasiPembayaran
            .filter(item => item.dueDate < hariIni)
            .slice(-6)
            .reverse()
            .map(({ dueDate, ...item }) => item);

        res.json({
            tanggal: formatTanggalISO(tanggalDipilih),
            tanggal_display: formatTanggalDisplay(formatTanggalISO(tanggalDipilih)),
            catatan: 'Indikator saldo menunjukkan penerimaan yang sudah diterima SBM dan belum direalisasikan sebagai belanja. Detail perencanaan biaya dapat dicatat melalui RKA Kerma dan proses implementasi tetap dicatat melalui RI/Realisasi RI.',
            filter: {
                periode_kontrak: {
                    label: periodeKontrak.label,
                    rentang_display: periodeKontrak.rentang_display,
                    tanggal_mulai: periodeKontrak.tanggal_mulai,
                    tanggal_selesai: periodeKontrak.tanggal_selesai
                },
                arus_uang: {
                    label: rentangArus.label,
                    tanggal_mulai: rentangArus.tanggal_mulai,
                    tanggal_selesai: rentangArus.tanggal_selesai
                }
            },
            general: indikatorKontrak,
            ringkasan: {
                saldo_sampai_tanggal: saldoSampaiTanggal,
                saldo_sampai_tanggal_display: `Rp ${formatRupiahAngka(saldoSampaiTanggal)}`,
                uang_masuk_sampai_tanggal: uangMasukSampaiTanggal,
                uang_masuk_sampai_tanggal_display: `Rp ${formatRupiahAngka(uangMasukSampaiTanggal)}`,
                total_nilai_kontrak_seluruh: totalNilaiKontrakSeluruh,
                total_nilai_kontrak_seluruh_display: `Rp ${formatRupiahAngka(totalNilaiKontrakSeluruh)}`,
                uang_belum_diterima_kontrak: uangBelumDiterimaKontrak,
                uang_belum_diterima_kontrak_display: `Rp ${formatRupiahAngka(uangBelumDiterimaKontrak)}`,
                uang_keluar_sampai_tanggal: uangKeluarSampaiTanggal,
                uang_keluar_sampai_tanggal_display: `Rp ${formatRupiahAngka(uangKeluarSampaiTanggal)}`,
                realisasi_anggaran_tanpa_tanggal: realisasiAnggaranTanpaTanggal,
                realisasi_anggaran_tanpa_tanggal_display: `Rp ${formatRupiahAngka(realisasiAnggaranTanpaTanggal)}`,
                rencana_anggaran_sampai_tanggal: rencanaAnggaranSampaiTanggal,
                rencana_anggaran_sampai_tanggal_display: `Rp ${formatRupiahAngka(rencanaAnggaranSampaiTanggal)}`,
                total_anggaran_terkunci_sampai_tanggal: totalAnggaranTerkunciSampaiTanggal,
                total_anggaran_terkunci_sampai_tanggal_display: `Rp ${formatRupiahAngka(totalAnggaranTerkunciSampaiTanggal)}`,
                uang_tanggal_dipilih: uangTanggalDipilih,
                uang_tanggal_dipilih_display: `Rp ${formatRupiahAngka(uangTanggalDipilih)}`,
                uang_keluar_tanggal_dipilih: uangKeluarTanggalDipilih,
                uang_keluar_tanggal_dipilih_display: `Rp ${formatRupiahAngka(uangKeluarTanggalDipilih)}`,
                proyeksi_30_hari: proyeksi30Hari,
                proyeksi_30_hari_display: `Rp ${formatRupiahAngka(proyeksi30Hari)}`,
                jatuh_tempo_lewat: jatuhTempoLewat,
                jatuh_tempo_lewat_display: `Rp ${formatRupiahAngka(jatuhTempoLewat)}`,
                total_jadwal: totalJadwal,
                total_jadwal_display: `Rp ${formatRupiahAngka(totalJadwal)}`,
                total_pembayaran_masuk: realisasiPembayaran.total,
                total_pembayaran_masuk_display: `Rp ${formatRupiahAngka(realisasiPembayaran.total)}`,
                jumlah_item_pembayaran_masuk: realisasiPembayaran.jumlah_item,
                total_realisasi_anggaran: realisasiAnggaran.total,
                total_realisasi_anggaran_display: `Rp ${formatRupiahAngka(realisasiAnggaran.total)}`,
                total_realisasi_anggaran_bertanggal: realisasiAnggaran.total_bertanggal,
                total_realisasi_anggaran_bertanggal_display: `Rp ${formatRupiahAngka(realisasiAnggaran.total_bertanggal)}`,
                total_realisasi_anggaran_tanpa_tanggal: realisasiAnggaran.total_tanpa_tanggal,
                total_realisasi_anggaran_tanpa_tanggal_display: `Rp ${formatRupiahAngka(realisasiAnggaran.total_tanpa_tanggal)}`,
                jumlah_realisasi_anggaran_tanpa_tanggal: realisasiAnggaran.jumlah_tanpa_tanggal,
                realisasi_anggaran_kategori: realisasiAnggaran.kategori,
                belum_terjadwal: belumTerjadwal,
                belum_terjadwal_display: `Rp ${formatRupiahAngka(belumTerjadwal)}`,
                jumlah_item_jadwal: jadwalPembiayaan.length,
                jumlah_item_belum_terjadwal: tanpaJadwal.length
            },
            arus_uang: arusUang,
            tren_bulanan: trenBulanan,
            agenda_mendatang: agendaMendatang,
            agenda_lewat: agendaLewat,
            belum_terjadwal: tanpaJadwal.slice(0, 8)
        });
    } catch (err) {
        console.error('Gagal membaca indikator pimpinan:', err);
        res.status(500).json({ pesan: 'Gagal membaca indikator pimpinan.' });
    }
}

// ─── API 1: Daftar kerma ──────────────────────────────────────────────────────

app.get('/api/daftar-kerma', async (req, res) => {
    try {
        const [programs, addendumList] = await Promise.all([
            Program.find({}).lean(),
            Addendum.find({}).lean()
        ]);

        const addMap = {};
        addendumList.forEach((row) => {
            const key = String(row.id_program || '').trim();
            if (!key) return;
            addMap[key] = (addMap[key] || 0) + 1;
        });

        const urutProgram = [...programs].sort((a, b) => {
            const tglA = parseTanggalDashboard(a.tgl_kontrak);
            const tglB = parseTanggalDashboard(b.tgl_kontrak);
            const timeA = tglA ? tglA.getTime() : Number.NEGATIVE_INFINITY;
            const timeB = tglB ? tglB.getTime() : Number.NEGATIVE_INFINITY;
            if (timeA !== timeB) return timeB - timeA;
            return String(a.id_program || '').localeCompare(String(b.id_program || ''), 'id');
        });

        const hasil = urutProgram.map((p, i) => {
            const jenisKerma = klasifikasiJenisKerma(p.kode_file);
            return {
                no:                      i + 1,
                id_program:              p.id_program,
                nama_mitra:              p.nama_mitra,
                no_kontrak_institusi:    p.no_kontrak_institusi,
                no_kontrak_mitra:        p.no_kontrak_mitra,
                judul_pks:               p.judul_pks,
                strata:                  p.strata,
                jumlah_addendum:         addMap[p.id_program] || 0,
                tgl_kontrak:             formatTanggalDisplay(p.tgl_kontrak),
                tgl_akhir_kontrak:       formatTanggalDisplay(p.tgl_akhir_kontrak),
                nilai_kontrak:           p.nilai_kontrak ? 'Rp ' + Number(p.nilai_kontrak).toLocaleString('id-ID') : 'Rp 0',
                kode_file:               p.kode_file,
                kode_jenis_kerma:        jenisKerma.kode,
                jenis_kerma:             jenisKerma.label,
                status_kontrak:          hitungStatusKontrak(p.tgl_akhir_kontrak),
                status_alokasi:          statusAlokasiKerma(p.kode_file),
                file_kontrak:            p.file_kontrak,
                nilai_kontrak_raw:       p.nilai_kontrak || 0,
                tgl_kontrak_input:       formatTanggalInput(p.tgl_kontrak),
                tgl_akhir_kontrak_input: formatTanggalInput(p.tgl_akhir_kontrak),
                jumlah_mahasiswa:        p.jumlah_mahasiswa != null ? String(p.jumlah_mahasiswa) : '',
                cara_pembayaran:         p.cara_pembayaran,
                tipe_cicilan:            p.tipe_cicilan,
                batas_akhir_pembayaran:  p.batas_akhir_pembayaran ? formatTanggalInput(p.batas_akhir_pembayaran) : '',
                harga_per_mahasiswa:     p.harga_per_mahasiswa != null ? p.harga_per_mahasiswa : ''
            };
        });

        res.json(hasil);
    } catch (err) {
        console.error('Gagal membaca daftar kerma:', err);
        res.status(500).send('Gagal membaca database.');
    }
});

// ─── API 2: Generate laporan Word ─────────────────────────────────────────────

app.get('/api/generate-laporan', async (req, res) => {
    try {
        const { programIds } = req.query;
        if (!programIds) return res.status(400).send('Pilih program terlebih dahulu.');
        const idList = programIds.split(',').map(id => id.trim()).filter(Boolean);
        if (idList.length === 0) return res.status(400).send('ID program tidak valid.');

        const buildData = async (id) => {
            const [program, mhsList] = await Promise.all([
                Program.findOne({ id_program: id }).lean(),
                Mahasiswa.find({ id_program: id }).lean()
            ]);
            const fileKontrak = program?.file_kontrak || '';
            const fileKontrakUrl = fileKontrak
                ? `${req.protocol}://${req.get('host')}/uploads/kontrak/${encodeURIComponent(path.basename(fileKontrak))}`
                : '';
            const jenisKerma = klasifikasiJenisKerma(program?.kode_file);

            const tabel_status    = mhsList.map((m, i) => ({
                no:          String(i + 1),
                nim:         m.nim,
                nama:        m.nama,
                fakultas:    m.fakultas,
                prodi:       m.prodi,
                status:      m.status,
                sks_lulus:   m.sks_lulus != null ? String(m.sks_lulus) : '',
                ipk:         m.ipk != null ? Number(m.ipk).toFixed(2) : ''
            }));
            const tabel_pembimbing = mhsList.map((m, i) => ({
                no:           String(i + 1),
                nim:          m.nim,
                nama:         m.nama,
                pembimbing_1: m.pembimbing_1,
                pembimbing_2: m.pembimbing_2
            }));

            return {
                id_program:             id,
                nama_mitra:             program?.nama_mitra || '',
                judul_pks:              program?.judul_pks  || '',
                judul_kontrak:          program?.judul_pks  || '',
                judul:                  program?.judul_pks  || '',
                Judul:                  program?.judul_pks  || '',
                no_kontrak_institusi:   program?.no_kontrak_institusi || '',
                no_kontrak_mitra:       program?.no_kontrak_mitra || '',
                tgl_kontrak:            formatTanggalDisplay(program?.tgl_kontrak || ''),
                tgl_akhir_kontrak:      formatTanggalDisplay(program?.tgl_akhir_kontrak || ''),
                nilai_kontrak:          program?.nilai_kontrak ? `Rp ${Number(program.nilai_kontrak).toLocaleString('id-ID')}` : 'Rp 0',
                kode_file:              program?.kode_file || '',
                kode_jenis_kerma:       jenisKerma.kode,
                jenis_kerma:            jenisKerma.label,
                file_kontrak:           fileKontrak,
                file_kontrak_url:       fileKontrakUrl,
                jumlah_mahasiswa:       String(mhsList.length),
                table_status:           tabel_status,
                table_pembimbing:       tabel_pembimbing
            };
        };

        const renderLaporan = async data => {
            const prepared = await siapkanFileKontrakLokal(data);
            try {
                return prosesTemplatWord(prepared.data);
            } finally {
                prepared.cleanup();
            }
        };

        if (idList.length === 1) {
            const data = await buildData(idList[0]);
            const wordBuffer = await renderLaporan(data);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename=Laporan_${data.nama_mitra.replace(/ /g, '_')}.docx`);
            return res.send(wordBuffer);
        }

        const hasilLaporan = await Promise.all(idList.map(async id => {
            const data = await buildData(id);
            return { nama: data.nama_mitra.replace(/ /g, '_'), buffer: await renderLaporan(data) };
        }));

        const zipArsip = new AdmZip();
        hasilLaporan.forEach(({ nama, buffer }) => zipArsip.addFile(`Laporan_${nama}.docx`, buffer));
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=Bundel_Laporan.zip');
        return res.send(zipArsip.toBuffer());
    } catch (err) {
        console.error('Gagal membuat laporan:', err);
        res.status(500).send('Gagal membuat dokumen laporan.');
    }
});

// ─── API 3: Daftar mahasiswa ──────────────────────────────────────────────────

app.get('/api/daftar-mahasiswa', async (req, res) => {
    try {
        const filter = req.query.programId ? { id_program: req.query.programId } : {};
        const list = await Mahasiswa.find(filter).lean();
        const hasil = list.map((m, i) => ({
            no:             i + 1,
            id_program:     m.id_program,
            nim:            m.nim,
            nama:           m.nama,
            fakultas:       m.fakultas,
            prodi:          m.prodi,
            tahun_masuk:    m.tahun_masuk,
            semester_masuk: m.semester_masuk,
            dosen_wali:     m.dosen_wali,
            status:         m.status,
            sks_lulus:      m.sks_lulus != null ? String(m.sks_lulus) : '',
            ipk:            m.ipk != null ? Number(m.ipk).toFixed(2) : '',
            pembimbing_1:   m.pembimbing_1,
            pembimbing_2:   m.pembimbing_2
        }));
        res.json(hasil);
    } catch (err) {
        console.error('Gagal membaca data mahasiswa:', err);
        res.status(500).json({ pesan: 'Gagal membaca database.' });
    }
});

// ─── API 4: Tambah mahasiswa ──────────────────────────────────────────────────

app.post('/api/tambah-mahasiswa', async (req, res) => {
    try {
        const { id_program, nim, nama, fakultas, prodi, tahun_masuk, semester_masuk,
                dosen_wali, status, sks_lulus, ipk, pembimbing_1, pembimbing_2 } = req.body;
        if (!id_program || !nim || !nama)
            return res.status(400).json({ pesan: 'ID Program, NIM, dan Nama wajib diisi.' });

        await Mahasiswa.create({
            id_program: id_program.trim(), nim: nim.trim(), nama: nama.trim(),
            fakultas: fakultas?.trim() || '', prodi: prodi?.trim() || '',
            tahun_masuk: tahun_masuk?.trim() || '', semester_masuk: semester_masuk?.trim() || '',
            dosen_wali: dosen_wali?.trim() || '', status: status?.trim() || '',
            sks_lulus: sks_lulus ? Number(sks_lulus) : null,
            ipk: ipk ? Number(ipk) : null,
            pembimbing_1: pembimbing_1?.trim() || '', pembimbing_2: pembimbing_2?.trim() || ''
        });
        res.json({ pesan: 'Data mahasiswa berhasil ditambahkan.' });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ pesan: 'NIM sudah terdaftar di program ini.' });
        console.error('Gagal menambahkan data mahasiswa:', err);
        res.status(500).json({ pesan: 'Gagal menyimpan data mahasiswa.' });
    }
});

// ─── API 5: Template Excel mahasiswa ─────────────────────────────────────────

app.get('/api/template-mahasiswa', async (req, res) => {
    try {
        const wb = new ExcelJS.Workbook();
        const sheet = wb.addWorksheet('Data_Mahasiswa');
        const headerRow = sheet.addRow(KOLOM_MAHASISWA);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004B87' } };
        });
        sheet.addRow(['PKS-2024-001', '29120001', 'Budi Santoso', 'SBM', 'MBA', '2022', 'Sem. 1', 'Dr. Wali', 'Aktif', 120, 3.75, 'Dr. Ahmad', 'Prof. Budi']);
        sheet.columns.forEach(col => { col.width = 18; });
        const buffer = await wb.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Template_Data_Mahasiswa.xlsx');
        res.send(buffer);
    } catch (err) {
        console.error('Gagal membuat template:', err);
        res.status(500).send('Gagal membuat template.');
    }
});

// ─── API 6: Import mahasiswa dari Excel ──────────────────────────────────────

app.post('/api/import-mahasiswa', async (req, res) => {
    try {
        const {
            fileBase64,
            file_base64,
            file_upload_id,
            file_size,
            total_chunks,
            file_nama,
            id_program_override
        } = req.body;
        const base64Value = fileBase64 || file_base64;
        if (!base64Value && !file_upload_id) {
            return res.status(400).json({ pesan: 'File tidak ditemukan.' });
        }

        const userId = req.session?.user?.id;
        const uploadProgramKey = id_program_override || '__from_file__';
        const importBuffer = await resolveUploadBuffer({
            fileBase64: base64Value,
            uploadId: file_upload_id,
            userId,
            kind: UPLOAD_KIND_IMPORT_MAHASISWA,
            idProgram: uploadProgramKey,
            fileName: file_nama || 'import-mahasiswa.xlsx',
            fileSize: file_size,
            totalChunks: total_chunks
        });

        const tempWb = new ExcelJS.Workbook();
        await tempWb.xlsx.load(importBuffer);
        if (file_upload_id) {
            await hapusUploadChunked(file_upload_id, userId)
                .catch(err => console.warn('Gagal membersihkan chunk import:', err?.message || err));
        }
        const srcSheet = tempWb.worksheets[0];
        if (!srcSheet) return res.status(400).json({ pesan: 'Sheet tidak ditemukan dalam file.' });

        const headerValues = srcSheet.getRow(1).values;
        const colIdx = {};
        headerValues.forEach((h, i) => { if (h) colIdx[resolveHeader(h)] = i; });

        const docs = [];
        srcSheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const get = field => {
                const idx = colIdx[field];
                if (!idx) return '';
                const val = row.getCell(idx).value;
                return val != null ? val.toString().trim() : '';
            };
            const id   = id_program_override?.trim() || get('id_program');
            const nim  = get('nim');
            const nama = get('nama');
            if (!id && !nim && !nama) return;
            docs.push({
                id_program: id, nim, nama,
                fakultas: get('fakultas'), prodi: get('prodi'),
                tahun_masuk: get('tahun_masuk'), semester_masuk: get('semester_masuk'),
                dosen_wali: get('dosen_wali'), status: get('status'),
                sks_lulus: get('sks_lulus') ? Number(get('sks_lulus')) : null,
                ipk:       get('ipk')       ? Number(get('ipk'))       : null,
                pembimbing_1: get('pembimbing_1'), pembimbing_2: get('pembimbing_2')
            });
        });

        if (docs.length === 0) return res.status(400).json({ pesan: 'Tidak ada data yang dapat diimpor.' });

        const result = await Mahasiswa.insertMany(docs, { ordered: false }).catch(err => {
            if (err.code === 11000) return { insertedCount: err.result?.nInserted || 0 };
            throw err;
        });
        res.json({ pesan: `${result.insertedCount ?? docs.length} data mahasiswa berhasil diimpor.` });
    } catch (err) {
        console.error('Gagal import mahasiswa:', err);
        res.status(500).json({ pesan: 'Gagal memproses file Excel.' });
    }
});

// ─── API: Hapus mahasiswa ─────────────────────────────────────────────────────

app.delete('/api/hapus-mahasiswa', async (req, res) => {
    try {
        const { id_program, nim } = req.body;
        if (!id_program || !nim) return res.status(400).json({ pesan: 'id_program dan nim wajib diisi.' });
        const result = await Mahasiswa.deleteOne({ id_program: id_program.trim(), nim: nim.trim() });
        if (result.deletedCount === 0) return res.status(404).json({ pesan: 'Data mahasiswa tidak ditemukan.' });
        res.json({ pesan: 'Data mahasiswa berhasil dihapus.' });
    } catch (err) {
        console.error('Gagal hapus mahasiswa:', err);
        res.status(500).json({ pesan: 'Gagal menghapus data mahasiswa.' });
    }
});

// ─── API: Hapus mahasiswa bulk ────────────────────────────────────────────────

app.post('/api/hapus-mahasiswa-bulk', async (req, res) => {
    try {
        const { daftar } = req.body;
        if (!Array.isArray(daftar) || daftar.length === 0)
            return res.status(400).json({ pesan: 'Daftar mahasiswa tidak boleh kosong.' });

        const conditions = daftar.map(d => ({ id_program: d.id_program.trim(), nim: d.nim.trim() }));
        const result = await Mahasiswa.deleteMany({ $or: conditions });
        res.json({ pesan: `${result.deletedCount} data mahasiswa berhasil dihapus.` });
    } catch (err) {
        console.error('Gagal hapus mahasiswa bulk:', err);
        res.status(500).json({ pesan: 'Gagal menghapus data mahasiswa.' });
    }
});

// ─── API: Edit mahasiswa ──────────────────────────────────────────────────────

app.put('/api/edit-mahasiswa', async (req, res) => {
    try {
        const { id_program_lama, nim_lama, id_program, nim, nama, fakultas, prodi,
                tahun_masuk, semester_masuk, dosen_wali, status, sks_lulus, ipk,
                pembimbing_1, pembimbing_2 } = req.body;
        if (!id_program_lama || !nim_lama || !id_program || !nim || !nama)
            return res.status(400).json({ pesan: 'ID Program, NIM, dan Nama wajib diisi.' });

        const result = await Mahasiswa.findOneAndUpdate(
            { id_program: id_program_lama.trim(), nim: nim_lama.trim() },
            {
                id_program: id_program.trim(), nim: nim.trim(), nama: nama.trim(),
                fakultas: fakultas?.trim() || '', prodi: prodi?.trim() || '',
                tahun_masuk: tahun_masuk?.trim() || '', semester_masuk: semester_masuk?.trim() || '',
                dosen_wali: dosen_wali?.trim() || '', status: status?.trim() || '',
                sks_lulus: sks_lulus ? Number(sks_lulus) : null,
                ipk: ipk ? Number(ipk) : null,
                pembimbing_1: pembimbing_1?.trim() || '', pembimbing_2: pembimbing_2?.trim() || ''
            }
        );
        if (!result) return res.status(404).json({ pesan: 'Data mahasiswa tidak ditemukan.' });
        res.json({ pesan: 'Data mahasiswa berhasil diperbarui.' });
    } catch (err) {
        console.error('Gagal edit mahasiswa:', err);
        res.status(500).json({ pesan: 'Gagal memperbarui data mahasiswa.' });
    }
});

// ─── API 7: Daftar mitra ──────────────────────────────────────────────────────

app.get('/api/daftar-mitra', async (req, res) => {
    try {
        const list = await Mitra.find({}).lean();
        res.json(list.map((m, i) => ({ no: i + 1, ...m, _id: undefined })));
    } catch (err) {
        console.error('Gagal membaca data mitra:', err);
        res.status(500).json({ pesan: 'Gagal membaca database.' });
    }
});

// ─── API 8: Tambah mitra ──────────────────────────────────────────────────────

app.post('/api/tambah-mitra', async (req, res) => {
    try {
        const { id_mitra, nama_mitra, industri, alamat, provinsi, kota, negara } = req.body;
        if (!id_mitra || !nama_mitra) return res.status(400).json({ pesan: 'ID Mitra dan Nama Mitra wajib diisi.' });
        await Mitra.create({ id_mitra: id_mitra.trim(), nama_mitra: nama_mitra.trim(),
            industri: industri?.trim() || '', alamat: alamat?.trim() || '',
            provinsi: provinsi?.trim() || '', kota: kota?.trim() || '', negara: negara?.trim() || '' });
        res.json({ pesan: 'Data mitra berhasil ditambahkan.' });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ pesan: `ID Mitra "${req.body.id_mitra}" sudah ada.` });
        console.error('Gagal menambahkan data mitra:', err);
        res.status(500).json({ pesan: 'Gagal menyimpan data mitra.' });
    }
});

// ─── API: Edit mitra ──────────────────────────────────────────────────────────

app.put('/api/edit-mitra', async (req, res) => {
    try {
        const { id_mitra, nama_mitra, industri, alamat, provinsi, kota, negara } = req.body;
        if (!id_mitra || !nama_mitra) return res.status(400).json({ pesan: 'ID Mitra dan Nama Mitra wajib diisi.' });
        const result = await Mitra.findOneAndUpdate(
            { id_mitra: id_mitra.trim() },
            { nama_mitra: nama_mitra.trim(), industri: industri?.trim() || '',
              alamat: alamat?.trim() || '', provinsi: provinsi?.trim() || '',
              kota: kota?.trim() || '', negara: negara?.trim() || '' }
        );
        if (!result) return res.status(404).json({ pesan: `Mitra dengan ID "${id_mitra}" tidak ditemukan.` });
        res.json({ pesan: 'Data mitra berhasil diperbarui.' });
    } catch (err) {
        console.error('Gagal edit mitra:', err);
        res.status(500).json({ pesan: 'Gagal memperbarui data mitra.' });
    }
});

// ─── API: Daftar file .xlsx di folder data/ ───────────────────────────────────

app.get('/api/daftar-file-data', (req, res) => {
    try {
        const dataDir = path.join(__dirname, 'data');
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') && f !== 'database_kerma.xlsx');
        res.json(files);
    } catch (e) {
        res.status(500).json({ pesan: 'Gagal membaca folder data.' });
    }
});

// ─── API: Template Excel mitra ────────────────────────────────────────────────

app.get('/api/template-mitra', async (req, res) => {
    try {
        const wb = new ExcelJS.Workbook();
        const sheet = wb.addWorksheet('Data_Mitra');
        const headerRow = sheet.addRow(['id_mitra', 'nama_mitra', 'industri', 'alamat', 'provinsi', 'kota', 'negara']);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004B87' } };
        });
        sheet.addRow(['KPC', 'PT Kaltim Prima Coal', 'Pertambangan dan Penggalian', 'Jl. Jenderal Sudirman No.1', 'Kalimantan Timur', 'Sangatta', 'Indonesia']);
        sheet.columns.forEach(col => { col.width = 22; });
        const buffer = await wb.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Template_Data_Mitra.xlsx');
        res.send(buffer);
    } catch (e) {
        res.status(500).send('Gagal membuat template.');
    }
});

// ─── API: Import mitra dari file .xlsx ───────────────────────────────────────

app.post('/api/import-mitra', async (req, res) => {
    try {
        const { namaFile } = req.body;
        if (!namaFile) return res.status(400).json({ pesan: 'Nama file wajib diisi.' });

        const safeNama = path.basename(namaFile);
        if (!safeNama.endsWith('.xlsx') || safeNama === 'database_kerma.xlsx')
            return res.status(400).json({ pesan: 'File tidak valid.' });

        const filePath = path.join(__dirname, 'data', safeNama);
        if (!fs.existsSync(filePath)) return res.status(404).json({ pesan: `File "${safeNama}" tidak ditemukan.` });

        const srcWb = new ExcelJS.Workbook();
        await srcWb.xlsx.readFile(filePath);
        const srcSheet = srcWb.worksheets[0];
        if (!srcSheet) return res.status(400).json({ pesan: 'Sheet tidak ditemukan dalam file.' });

        const alias = {
            nama: 'nama_mitra', name: 'nama_mitra', company: 'nama_mitra', perusahaan: 'nama_mitra',
            id: 'id_mitra', kode: 'id_mitra', kode_mitra: 'id_mitra',
            sektor: 'industri', sector: 'industri', kategori_industri: 'industri',
            address: 'alamat', city: 'kota', province: 'provinsi', country: 'negara'
        };
        const norm = h => h.toString().toLowerCase().trim().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
        const colIdx = {};
        srcSheet.getRow(1).values.forEach((h, i) => {
            if (!h) return;
            const n = norm(h);
            colIdx[alias[n] || n] = i;
        });

        const docs = [];
        srcSheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const get = field => {
                const idx = colIdx[field]; if (!idx) return '';
                const v = row.getCell(idx).value;
                return v != null ? v.toString().trim() : '';
            };
            const idMitra = get('id_mitra'), namaMitra = get('nama_mitra');
            if (!idMitra && !namaMitra) return;
            docs.push({ id_mitra: idMitra, nama_mitra: namaMitra,
                industri: get('industri'), alamat: get('alamat'),
                provinsi: get('provinsi'), kota: get('kota'), negara: get('negara') });
        });

        if (docs.length === 0) return res.status(400).json({ pesan: 'Tidak ada data yang dapat diimpor.' });

        let ditambah = 0, dilewati = 0;
        for (const d of docs) {
            try {
                await Mitra.create(d);
                ditambah++;
            } catch (e) {
                if (e.code === 11000) dilewati++;
                else throw e;
            }
        }

        let pesan = `${ditambah} mitra berhasil diimpor.`;
        if (dilewati > 0) pesan += ` ${dilewati} dilewati (ID sudah ada).`;
        res.json({ pesan, ditambah, dilewati });
    } catch (e) {
        console.error('Gagal import mitra:', e);
        res.status(500).json({ pesan: 'Gagal memproses file Excel.' });
    }
});

// ─── API 9: Tambah kerma ──────────────────────────────────────────────────────

app.post('/api/tambah-kerma', async (req, res) => {
    try {
        const { id_program, nama_mitra, no_kontrak_institusi, no_kontrak_mitra,
                judul_pks, strata, tgl_kontrak, tgl_akhir_kontrak, nilai_kontrak,
                kode_file, file_base64, file_upload_id, file_size, total_chunks, file_nama,
                jumlah_mahasiswa, cara_pembayaran, tipe_cicilan,
                batas_akhir_pembayaran, harga_per_mahasiswa, cicilan } = req.body;

        if (!id_program || !nama_mitra || !judul_pks)
            return res.status(400).json({ pesan: 'ID Program, Nama Mitra, dan Judul PKS wajib diisi.' });

        let namaFileTersimpan = '';
        if ((file_base64 || file_upload_id) && file_nama) {
            try {
                const userId = req.session?.user?.id;
                const buffer = await resolveUploadBuffer({
                    fileBase64: file_base64,
                    uploadId: file_upload_id,
                    userId,
                    kind: UPLOAD_KIND_KONTRAK,
                    idProgram: id_program,
                    fileName: file_nama,
                    fileSize: file_size,
                    totalChunks: total_chunks
                });
                namaFileTersimpan = await simpanBufferKontrak(id_program, buffer, file_nama, userId);
                if (file_upload_id) {
                    await hapusUploadChunked(file_upload_id, userId)
                        .catch(err => console.warn('Gagal membersihkan chunk upload:', err?.message || err));
                }
            } catch (e) {
                return res.status(400).json({ pesan: e.message });
            }
        }

        await Program.create({
            id_program: id_program.trim(), nama_mitra: nama_mitra.trim(),
            no_kontrak_institusi: no_kontrak_institusi?.trim() || '',
            no_kontrak_mitra: no_kontrak_mitra?.trim() || '',
            judul_pks: judul_pks.trim(), strata: strata?.trim() || '',
            tgl_kontrak: tgl_kontrak || '', tgl_akhir_kontrak: tgl_akhir_kontrak || '',
            nilai_kontrak: nilai_kontrak ? Number(nilai_kontrak) : 0,
            kode_file: kode_file?.trim() || '', file_kontrak: namaFileTersimpan,
            status_alokasi: statusAlokasiKerma(kode_file),
            jumlah_mahasiswa: jumlah_mahasiswa ? Number(jumlah_mahasiswa) : null,
            cara_pembayaran: cara_pembayaran?.trim() || '',
            tipe_cicilan: tipe_cicilan?.trim() || '',
            batas_akhir_pembayaran: batas_akhir_pembayaran || '',
            harga_per_mahasiswa: harga_per_mahasiswa ? Number(harga_per_mahasiswa) : null
        });

        if ((cara_pembayaran === 'Unit Price' || cara_pembayaran === 'Termin') && cicilan) {
            const cicilanList = JSON.parse(cicilan);
            await Cicilan.insertMany(cicilanList.map((c, i) => ({
                id_program: id_program.trim(), no_cicilan: i + 1,
                label: c.label, nominal: c.nominal ? Number(c.nominal) : 0,
                batas_akhir: c.batas_akhir || ''
            })));
        }

        res.json({ pesan: 'Data berhasil ditambahkan.' });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ pesan: `ID Program "${req.body.id_program}" sudah ada.` });
        console.error('Gagal menambahkan data:', err);
        res.status(500).json({ pesan: 'Gagal menyimpan data ke database.' });
    }
});

// ─── API 10: Upload kontrak ───────────────────────────────────────────────────

app.post('/api/upload-kontrak', async (req, res) => {
    try {
        const { id_program, file_base64, file_upload_id, file_size, total_chunks, file_nama } = req.body;
        if (!id_program || (!file_base64 && !file_upload_id) || !file_nama)
            return res.status(400).json({ pesan: 'id_program, file, dan file_nama wajib diisi.' });

        let namaFileTersimpan;
        try {
            const userId = req.session?.user?.id;
            const buffer = await resolveUploadBuffer({
                fileBase64: file_base64,
                uploadId: file_upload_id,
                userId,
                kind: UPLOAD_KIND_KONTRAK,
                idProgram: id_program,
                fileName: file_nama,
                fileSize: file_size,
                totalChunks: total_chunks
            });
            namaFileTersimpan = await simpanBufferKontrak(id_program, buffer, file_nama, userId);
            if (file_upload_id) {
                await hapusUploadChunked(file_upload_id, userId)
                    .catch(err => console.warn('Gagal membersihkan chunk upload:', err?.message || err));
            }
        } catch (e) {
            return res.status(400).json({ pesan: e.message });
        }

        const result = await Program.findOneAndUpdate(
            { id_program: id_program.trim() },
            { file_kontrak: namaFileTersimpan }
        );
        if (!result) return res.status(404).json({ pesan: 'ID Program tidak ditemukan.' });
        res.json({ pesan: 'File berhasil diupload.', file_kontrak: namaFileTersimpan });
    } catch (err) {
        console.error('Gagal upload kontrak:', err);
        res.status(500).json({ pesan: 'Gagal menyimpan file.' });
    }
});

// ─── API: Edit kerma ──────────────────────────────────────────────────────────

app.put('/api/edit-kerma', async (req, res) => {
    try {
        const { id_program, new_id_program, nama_mitra, no_kontrak_institusi, no_kontrak_mitra,
                judul_pks, strata, tgl_kontrak, tgl_akhir_kontrak, nilai_kontrak, kode_file,
                jumlah_mahasiswa, cara_pembayaran, tipe_cicilan,
                batas_akhir_pembayaran, harga_per_mahasiswa, cicilan } = req.body;
        const idLama = id_program.trim();
        const idBaru = new_id_program?.trim() || idLama;
        if (!idLama || !nama_mitra || !judul_pks)
            return res.status(400).json({ pesan: 'ID Program, Nama Mitra, dan Judul PKS wajib diisi.' });

        const result = await Program.findOneAndUpdate(
            { id_program: idLama },
            {
                id_program: idBaru, nama_mitra: nama_mitra.trim(),
                no_kontrak_institusi: no_kontrak_institusi?.trim() || '',
                no_kontrak_mitra: no_kontrak_mitra?.trim() || '',
                judul_pks: judul_pks.trim(), strata: strata?.trim() || '',
                tgl_kontrak: tgl_kontrak || '', tgl_akhir_kontrak: tgl_akhir_kontrak || '',
                nilai_kontrak: nilai_kontrak ? Number(nilai_kontrak) : 0,
                kode_file: kode_file?.trim() || '',
                status_alokasi: statusAlokasiKerma(kode_file),
                jumlah_mahasiswa: jumlah_mahasiswa ? Number(jumlah_mahasiswa) : null,
                cara_pembayaran: cara_pembayaran?.trim() || '',
                tipe_cicilan: tipe_cicilan?.trim() || '',
                batas_akhir_pembayaran: batas_akhir_pembayaran || '',
                harga_per_mahasiswa: harga_per_mahasiswa ? Number(harga_per_mahasiswa) : null
            }
        );
        if (!result) return res.status(404).json({ pesan: 'Data tidak ditemukan.' });

        // Hapus cicilan lama
        await Cicilan.deleteMany({ id_program: idLama });

        const kodeBaru = kode_file?.trim() || '';
        const syncOps = [
            RencanaAnggaran.updateMany({ id_program: idLama }, { id_program: idBaru, kode_file: kodeBaru }),
            RealisasiAnggaran.updateMany({ id_program: idLama }, { id_program: idBaru, kode_file: kodeBaru }),
            RealisasiPembayaran.updateMany({ id_program: idLama }, { id_program: idBaru, kode_file: kodeBaru })
        ];
        if (idBaru !== idLama) {
            syncOps.push(
                Mahasiswa.updateMany({ id_program: idLama }, { id_program: idBaru }),
                Addendum.updateMany({ id_program: idLama }, { id_program: idBaru })
            );
        }
        await Promise.all(syncOps);

        // Simpan cicilan baru
        if ((cara_pembayaran === 'Unit Price' || cara_pembayaran === 'Termin') && cicilan) {
            await Cicilan.insertMany(JSON.parse(cicilan).map((c, i) => ({
                id_program: idBaru, no_cicilan: i + 1,
                label: c.label, nominal: c.nominal ? Number(c.nominal) : 0,
                batas_akhir: c.batas_akhir || ''
            })));
        }

        res.json({ pesan: 'Data kerma berhasil diperbarui.' });
    } catch (err) {
        console.error('Gagal edit kerma:', err);
        res.status(500).json({ pesan: 'Gagal memperbarui data kerma.' });
    }
});

// ─── API: Hapus kerma ─────────────────────────────────────────────────────────

app.delete('/api/hapus-kerma/:id_program', async (req, res) => {
    try {
        const idProgram = decodeURIComponent(req.params.id_program);
        const result = await Program.deleteOne({ id_program: idProgram });
        if (result.deletedCount === 0) return res.status(404).json({ pesan: 'Data tidak ditemukan.' });
        await RealisasiAnggaran.deleteMany({ id_program: idProgram });
        await RealisasiPembayaran.deleteMany({ id_program: idProgram });
        res.json({ pesan: 'Data kerma berhasil dihapus.' });
    } catch (err) {
        console.error('Gagal hapus kerma:', err);
        res.status(500).json({ pesan: 'Gagal menghapus data kerma.' });
    }
});

// ─── API: Realisasi Pembayaran ───────────────────────────────────────────────

function buatRencanaPendapatanKey(row) {
    return [
        row.id_program || '',
        row.kode_file || '',
        row.sumber || '',
        row.tahap || row.label || '',
        row.tanggal_input || row.tanggal || '',
        Number(row.nominal) || 0
    ].map(part => String(part).trim()).join('|');
}

function buatRencanaPendapatanFallbackKey(row) {
    const tanggal = formatTanggalInput(row.tanggal_input || row.rencana_tanggal || row.tanggal || '');
    const isRealisasiPembayaran = !!(row.tanggal || row.rencana_tanggal || row.nominal_bruto !== undefined || row.potongan_persen !== undefined);
    const nominal = isRealisasiPembayaran
        ? nominalBrutoPenerimaan(row)
        : (Number(row.rencana_nominal) || Number(row.nominal) || 0);
    if (!row.id_program || !row.kode_file || !tanggal || nominal <= 0) return '';
    return [
        row.id_program,
        row.kode_file,
        tanggal,
        nominal
    ].map(part => String(part).trim()).join('|');
}

function buatMatcherRealisasiRencana(realisasiPembayaran = []) {
    const candidates = realisasiPembayaran.map(row => ({
        key: String(row.rencana_key || '').trim(),
        fallbackKey: buatRencanaPendapatanFallbackKey(row),
        used: false
    }));

    return row => {
        const key = String(row.rencana_key || '').trim();
        let candidate = candidates.find(item => !item.used && item.key && item.key === key);
        if (!candidate) {
            const fallbackKey = buatRencanaPendapatanFallbackKey(row);
            candidate = candidates.find(item => !item.used && item.fallbackKey && item.fallbackKey === fallbackKey);
        }
        if (!candidate) return false;
        candidate.used = true;
        return true;
    };
}

function buatRencanaPendapatanRowDariJadwal(item) {
    const row = {
        id_program: item.id_program || '',
        kode_file: item.kode_file || '',
        nama_mitra: item.nama_mitra || '',
        judul_pks: item.judul || '',
        tahap: item.label || 'Pembayaran',
        sumber: item.sumber || 'Kontrak',
        tanggal_diterima: item.tanggal_display || 'N/A',
        tanggal_input: item.tanggal || '',
        nominal: Number(item.nominal) || 0,
        nominal_display: item.nominal_display || `Rp ${formatRupiahAngka(item.nominal)}`,
        status_jadwal: 'Terjadwal',
        status_alokasi: item.status_alokasi || statusAlokasiKerma(item.kode_file),
        keterangan: 'Tanggal pembayaran sudah tersedia pada data kontrak.',
        termin_order: Number(item.termin_order) || null
    };
    return { ...row, rencana_key: buatRencanaPendapatanKey(row) };
}

function normalisasiKeyBagian(value) {
    return String(value || '')
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function buatIndexRencanaPembayaran(jadwal = []) {
    const byKey = new Map();
    const byProgramTahap = new Map();
    const byKodeTahap = new Map();
    const byProgramTahapNominal = new Map();
    const byKodeTahapNominal = new Map();
    const byProgramNominal = new Map();
    const byKodeNominal = new Map();
    const byProgram = new Map();
    const byKode = new Map();

    const add = (map, key, item) => {
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    };

    const rows = jadwal
        .map(buatRencanaPendapatanRowDariJadwal)
        .filter(row => row.tanggal_input)
        .sort((a, b) => {
            const tA = parseTanggalDashboard(a.tanggal_input)?.getTime() || 0;
            const tB = parseTanggalDashboard(b.tanggal_input)?.getTime() || 0;
            if (tA !== tB) return tA - tB;
            return String(a.tahap || '').localeCompare(String(b.tahap || ''), 'id', { numeric: true });
        });

    rows.forEach(row => {
        const idProgram = String(row.id_program || '').trim();
        const kodeFile = String(row.kode_file || '').trim();
        const tahap = normalisasiKeyBagian(row.tahap);
        const nominal = Number(row.nominal) || 0;
        add(byKey, row.rencana_key, row);
        add(byProgramTahap, `${idProgram}|${tahap}`, row);
        add(byKodeTahap, `${kodeFile}|${tahap}`, row);
        add(byProgramTahapNominal, `${idProgram}|${tahap}|${nominal}`, row);
        add(byKodeTahapNominal, `${kodeFile}|${tahap}|${nominal}`, row);
        add(byProgramNominal, `${idProgram}|${nominal}`, row);
        add(byKodeNominal, `${kodeFile}|${nominal}`, row);
        add(byProgram, idProgram, row);
        add(byKode, kodeFile, row);
    });

    return { byKey, byProgramTahap, byKodeTahap, byProgramTahapNominal, byKodeTahapNominal, byProgramNominal, byKodeNominal, byProgram, byKode };
}

function ambilRencanaBelumDipakai(map, key) {
    if (!key) return null;
    const queue = map.get(key);
    if (!queue) return null;
    while (queue.length && queue[0].__dipakai) queue.shift();
    const item = queue.shift();
    if (item) item.__dipakai = true;
    return item || null;
}

function cariRencanaPembayaranUntukRealisasi(row, index) {
    const rencanaKey = String(row.rencana_key || '').trim();
    const exact = ambilRencanaBelumDipakai(index.byKey, rencanaKey);
    if (exact) return exact;

    const idProgram = String(row.id_program || '').trim();
    const kodeFile = String(row.kode_file || '').trim();
    const tahap = normalisasiKeyBagian(row.rencana_tahap || '');
    const nominal = nominalBrutoPenerimaan(row);
    const rencana =
        ambilRencanaBelumDipakai(index.byProgramTahapNominal, `${idProgram}|${tahap}|${nominal}`) ||
        ambilRencanaBelumDipakai(index.byKodeTahapNominal, `${kodeFile}|${tahap}|${nominal}`) ||
        ambilRencanaBelumDipakai(index.byProgramTahap, `${idProgram}|${tahap}`) ||
        ambilRencanaBelumDipakai(index.byKodeTahap, `${kodeFile}|${tahap}`) ||
        ambilRencanaBelumDipakai(index.byProgramNominal, `${idProgram}|${nominal}`) ||
        ambilRencanaBelumDipakai(index.byKodeNominal, `${kodeFile}|${nominal}`) ||
        ambilRencanaBelumDipakai(index.byProgram, idProgram) ||
        ambilRencanaBelumDipakai(index.byKode, kodeFile);
    if (rencana) return rencana;

    const tanggalTersimpan = formatTanggalInput(row.rencana_tanggal || '');
    if (tanggalTersimpan) {
        return {
            tanggal_input: tanggalTersimpan,
            tanggal_diterima: formatTanggalDisplay(tanggalTersimpan)
        };
    }

    return null;
}

function buatRencanaPendapatanRowTanpaTanggal(item) {
    const row = {
        id_program: item.id_program || '',
        kode_file: item.kode_file || '',
        nama_mitra: item.nama_mitra || '',
        judul_pks: item.judul || '',
        tahap: item.label || 'Pembayaran',
        sumber: item.sumber || 'Kontrak',
        tanggal_diterima: 'N/A',
        tanggal_input: '',
        nominal: Number(item.nominal) || 0,
        nominal_display: item.nominal_display || `Rp ${formatRupiahAngka(item.nominal)}`,
        status_jadwal: 'Perlu tanggal',
        status_alokasi: item.status_alokasi || statusAlokasiKerma(item.kode_file),
        keterangan: 'Update informasi kontrak dengan tanggal pembayaran spesifik.',
        termin_order: Number(item.termin_order) || null
    };
    return { ...row, rencana_key: buatRencanaPendapatanKey(row) };
}

function keyKontrakRencanaPendapatan(row = {}) {
    const idProgram = String(row.id_program || '').trim();
    if (idProgram) return `id:${idProgram}`;
    const kodeFile = String(row.kode_file || '').trim();
    if (kodeFile) return `kode:${kodeFile}`;
    return '';
}

function urutRencanaUntukAlokasi(a, b) {
    const tA = parseTanggalDashboard(a.tanggal_input)?.getTime();
    const tB = parseTanggalDashboard(b.tanggal_input)?.getTime();
    if (tA != null && tB != null && tA !== tB) return tA - tB;
    if (tA != null && tB == null) return -1;
    if (tA == null && tB != null) return 1;
    const orderA = Number(a.termin_order) || 9999;
    const orderB = Number(b.termin_order) || 9999;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.tahap || '').localeCompare(String(b.tahap || ''), 'id', { numeric: true });
}

function alokasikanRealisasiPembayaranKeRencana(rencanaRows = [], realisasiPembayaran = []) {
    const rows = rencanaRows.map((row, index) => {
        const nominalRencana = Number(row.nominal) || 0;
        return {
            ...row,
            __index: index,
            __kontrak_key: keyKontrakRencanaPendapatan(row),
            nominal: nominalRencana,
            nominal_rencana: nominalRencana,
            nominal_rencana_display: `Rp ${formatRupiahAngka(nominalRencana)}`,
            nominal_terealisasi: 0,
            nominal_sisa: nominalRencana
        };
    });
    const byRencanaKey = new Map();
    const byFallbackKey = new Map();
    const byProgramTahap = new Map();
    const byKodeTahap = new Map();
    const byKontrakKey = new Map();
    const add = (map, key, row) => {
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(row);
    };

    rows.forEach(row => {
        const idProgram = String(row.id_program || '').trim();
        const kodeFile = String(row.kode_file || '').trim();
        const tahap = normalisasiKeyBagian(row.tahap || '');
        add(byRencanaKey, String(row.rencana_key || '').trim(), row);
        add(byFallbackKey, buatRencanaPendapatanFallbackKey(row), row);
        add(byProgramTahap, `${idProgram}|${tahap}`, row);
        add(byKodeTahap, `${kodeFile}|${tahap}`, row);
        add(byKontrakKey, row.__kontrak_key, row);
    });

    const alokasiKeRow = (row, amount, { allowOverflow = false } = {}) => {
        if (!row || amount <= 0 || row.nominal_sisa <= 0) return amount;
        if (allowOverflow) {
            row.nominal_sisa = Math.max(0, row.nominal_sisa - amount);
            row.nominal_terealisasi += amount;
            return 0;
        }
        const dipakai = Math.min(row.nominal_sisa, amount);
        row.nominal_sisa -= dipakai;
        row.nominal_terealisasi += dipakai;
        return amount - dipakai;
    };
    const alokasiKeCandidates = (candidates = [], amount = 0, options = {}) => {
        let sisa = amount;
        candidates.sort(urutRencanaUntukAlokasi).forEach(row => {
            if (sisa <= 0) return;
            sisa = alokasiKeRow(row, sisa, options);
        });
        return sisa;
    };

    const realisasiTanpaKey = new Map();
    const realisasiTanpaTahap = new Map();
    const tambahRealisasiTanpaKey = (map, key, amount) => {
        if (!key || amount <= 0) return;
        map.set(key, (map.get(key) || 0) + amount);
    };

    realisasiPembayaran.forEach(row => {
        let nominalRealisasi = nominalBrutoPenerimaan(row);
        if (nominalRealisasi <= 0) return;
        const idProgram = String(row.id_program || '').trim();
        const kodeFile = String(row.kode_file || '').trim();
        const tahap = normalisasiKeyBagian(row.rencana_tahap || '');

        const rencanaKey = String(row.rencana_key || '').trim();
        if (rencanaKey) {
            nominalRealisasi = alokasiKeCandidates(byRencanaKey.get(rencanaKey) || [], nominalRealisasi, { allowOverflow: true });
        }

        const fallbackKey = buatRencanaPendapatanFallbackKey(row);
        if (nominalRealisasi > 0 && fallbackKey) {
            nominalRealisasi = alokasiKeCandidates(byFallbackKey.get(fallbackKey) || [], nominalRealisasi, { allowOverflow: true });
        }

        if (nominalRealisasi > 0 && tahap) {
            nominalRealisasi = alokasiKeCandidates(byProgramTahap.get(`${idProgram}|${tahap}`) || [], nominalRealisasi, { allowOverflow: true });
        }

        if (nominalRealisasi > 0 && tahap) {
            nominalRealisasi = alokasiKeCandidates(byKodeTahap.get(`${kodeFile}|${tahap}`) || [], nominalRealisasi, { allowOverflow: true });
        }

        if (nominalRealisasi > 0) {
            tambahRealisasiTanpaKey(tahap ? realisasiTanpaKey : realisasiTanpaTahap, keyKontrakRencanaPendapatan(row), nominalRealisasi);
        }
    });

    realisasiTanpaKey.forEach((nominalRealisasi, kontrakKey) => {
        alokasiKeCandidates(byKontrakKey.get(kontrakKey) || [], nominalRealisasi, { allowOverflow: true });
    });
    realisasiTanpaTahap.forEach((nominalRealisasi, kontrakKey) => {
        alokasiKeCandidates(byKontrakKey.get(kontrakKey) || [], nominalRealisasi);
    });

    return rows
        .sort((a, b) => a.__index - b.__index)
        .map(row => {
            const {
                __index,
                __kontrak_key,
                nominal_sisa,
                nominal_terealisasi,
                nominal_rencana,
                ...clean
            } = row;
            const sisa = Math.max(0, Math.round(nominal_sisa));
            const statusAlokasi = clean.status_alokasi || statusAlokasiKerma(clean.kode_file);
            const tutupKeuangan = statusAlokasi !== 'Aktif';
            const nominalTerealisasiTampil = tutupKeuangan
                ? Math.max(Math.round(nominal_terealisasi), nominal_rencana)
                : Math.round(nominal_terealisasi);
            const nominalSisaTampil = tutupKeuangan ? 0 : sisa;
            const terealisasi = tutupKeuangan || (sisa <= 0 && nominal_rencana > 0);
            return {
                ...clean,
                status_alokasi: statusAlokasi,
                nominal_rencana,
                nominal_rencana_display: `Rp ${formatRupiahAngka(nominal_rencana)}`,
                nominal_terealisasi: nominalTerealisasiTampil,
                nominal_terealisasi_display: `Rp ${formatRupiahAngka(nominalTerealisasiTampil)}`,
                nominal_sisa: nominalSisaTampil,
                nominal_sisa_display: `Rp ${formatRupiahAngka(nominalSisaTampil)}`,
                terealisasi,
                status_realisasi: terealisasi
                    ? 'Terealisasi'
                    : nominalTerealisasiTampil > 0 ? 'Sebagian Terealisasi' : 'Belum Terealisasi'
            };
        });
}

async function bangunRencanaPendapatanBelumDirealisasikan() {
    const realisasiPembayaran = await safeMongoRead(
        'RealisasiPembayaran.find(rencana-belum-direalisasikan)',
        () => RealisasiPembayaran.find({}, 'id_program kode_file tanggal nominal nominal_bruto potongan_persen rencana_key rencana_tahap rencana_tanggal rencana_nominal').lean(),
        []
    );
    const { jadwal, tanpaJadwal } = await bangunJadwalPembiayaan();
    const rowsTerjadwal = jadwal.map(buatRencanaPendapatanRowDariJadwal);
    const rowsTanpaTanggal = tanpaJadwal.map(buatRencanaPendapatanRowTanpaTanggal);
    const rowsBelum = alokasikanRealisasiPembayaranKeRencana([...rowsTerjadwal, ...rowsTanpaTanggal], realisasiPembayaran)
        .filter(row => Number(row.nominal_sisa) > 0)
        .map(row => {
            const nominalSisa = Number(row.nominal_sisa) || 0;
            return {
                ...row,
                nominal: nominalSisa,
                nominal_display: `Rp ${formatRupiahAngka(nominalSisa)}`
            };
        });
    const terjadwal = rowsBelum.filter(row => row.tanggal_input);
    const perluTanggal = rowsBelum.filter(row => !row.tanggal_input);
    const data = [...terjadwal, ...perluTanggal].map((row, i) => ({ no: i + 1, ...row }));
    const totalTerjadwal = terjadwal.reduce((sum, row) => sum + row.nominal, 0);
    const totalPerluTanggal = perluTanggal.reduce((sum, row) => sum + row.nominal, 0);

    return {
        data,
        summary: {
            total_rencana: totalTerjadwal + totalPerluTanggal,
            total_rencana_display: `Rp ${formatRupiahAngka(totalTerjadwal + totalPerluTanggal)}`,
            total_terjadwal: totalTerjadwal,
            total_terjadwal_display: `Rp ${formatRupiahAngka(totalTerjadwal)}`,
            total_perlu_tanggal: totalPerluTanggal,
            total_perlu_tanggal_display: `Rp ${formatRupiahAngka(totalPerluTanggal)}`,
            jumlah_item: data.length,
            jumlah_item_display: data.length.toLocaleString('id-ID'),
            jumlah_terjadwal: terjadwal.length,
            jumlah_perlu_tanggal: perluTanggal.length
        }
    };
}

async function bangunRencanaPendapatanTermin() {
    const realisasiPembayaran = await safeMongoRead(
        'RealisasiPembayaran.find(rencana-termin)',
        () => RealisasiPembayaran.find({}, 'id_program kode_file tanggal nominal nominal_bruto potongan_persen rencana_key rencana_tahap rencana_tanggal rencana_nominal').lean(),
        []
    );

    const { jadwal, tanpaJadwal } = await bangunJadwalPembiayaan();
    const rowsTerjadwal = jadwal.map(buatRencanaPendapatanRowDariJadwal);
    const rowsTanpaTanggal = tanpaJadwal.map(buatRencanaPendapatanRowTanpaTanggal);
    const data = alokasikanRealisasiPembayaranKeRencana([...rowsTerjadwal, ...rowsTanpaTanggal], realisasiPembayaran)
        .map((row, i) => ({ no: i + 1, ...row }));

    return {
        data,
        summary: {
            jumlah_item: data.length,
            jumlah_item_display: data.length.toLocaleString('id-ID'),
            jumlah_terealisasi: data.filter(row => row.terealisasi).length,
            jumlah_belum: data.filter(row => !row.terealisasi).length
        }
    };
}

const TEMPLATE_INVOICE_PATH = process.env.INVOICE_TEMPLATE_PATH || path.resolve(__dirname, 'templates', 'template_invoice.xlsx');

function escapeRegExp(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatJudulTerbilang(value) {
    const text = terbilangRupiah(value);
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function terbilangRupiah(value) {
    const angka = Math.max(0, Math.round(Number(value) || 0));
    if (!angka) return 'nol rupiah';
    return `${terbilangAngka(angka)} rupiah`;
}

function terbilangAngka(value) {
    const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    const n = Math.floor(Number(value) || 0);
    if (n < 12) return satuan[n];
    if (n < 20) return `${terbilangAngka(n - 10)} belas`;
    if (n < 100) return `${terbilangAngka(Math.floor(n / 10))} puluh${n % 10 ? ` ${terbilangAngka(n % 10)}` : ''}`;
    if (n < 200) return `seratus${n - 100 ? ` ${terbilangAngka(n - 100)}` : ''}`;
    if (n < 1000) return `${terbilangAngka(Math.floor(n / 100))} ratus${n % 100 ? ` ${terbilangAngka(n % 100)}` : ''}`;
    if (n < 2000) return `seribu${n - 1000 ? ` ${terbilangAngka(n - 1000)}` : ''}`;
    if (n < 1000000) return `${terbilangAngka(Math.floor(n / 1000))} ribu${n % 1000 ? ` ${terbilangAngka(n % 1000)}` : ''}`;
    if (n < 1000000000) return `${terbilangAngka(Math.floor(n / 1000000))} juta${n % 1000000 ? ` ${terbilangAngka(n % 1000000)}` : ''}`;
    if (n < 1000000000000) return `${terbilangAngka(Math.floor(n / 1000000000))} miliar${n % 1000000000 ? ` ${terbilangAngka(n % 1000000000)}` : ''}`;
    return `${terbilangAngka(Math.floor(n / 1000000000000))} triliun${n % 1000000000000 ? ` ${terbilangAngka(n % 1000000000000)}` : ''}`;
}

function nilaiSelInvoice(value) {
    if (value === undefined || value === null) return '';
    return value;
}

function setCellInvoice(ws, address, value) {
    const cell = ws.getCell(address);
    const target = cell.isMerged && cell.master ? cell.master : cell;
    target.value = nilaiSelInvoice(value);
}

function pecahAlamatInvoice(program = {}, mitra = {}) {
    const alamat = String(mitra.alamat || program.alamat || '').trim();
    const wilayah = [mitra.kota, mitra.provinsi, mitra.negara]
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .join(', ');
    if (!alamat && !wilayah) return ['', ''];
    if (!alamat) return [wilayah, ''];
    if (!wilayah) {
        const parts = alamat.split(/\s{2,}|\n/).map(s => s.trim()).filter(Boolean);
        return [parts[0] || alamat, parts.slice(1).join(' ')];
    }
    return [alamat, wilayah];
}

function sanitizeFilename(value = '') {
    return String(value || '')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120) || 'invoice';
}

const TEMPLATE_SK_TIM_PENGELOLA_PATH = process.env.SK_TIM_PENGELOLA_TEMPLATE_PATH
    || path.resolve(__dirname, 'templates', 'template_sk_tim_pengelola_kerma.docx');
const ROLE_SK_TIM_PENGELOLA = ['PJ', 'Pengarah', 'Ketua', 'Kepala Admin', 'Anggota'];
const LABEL_ROLE_SK_TIM_PENGELOLA = Object.freeze({
    PJ: 'Penanggung Jawab',
    Pengarah: 'Pengarah',
    Ketua: 'Ketua',
    'Kepala Admin': 'Kepala Administrasi',
    Anggota: 'Anggota'
});
const PERSONIL_SK_TERKUNCI = Object.freeze({
    PJ: 4,
    Ketua: 1
});
const PERSONIL_SK_DEFAULT = Object.freeze({
    PJ: 4,
    Pengarah: 6,
    Ketua: 1,
    'Kepala Admin': 6,
    Anggota: 6
});
const BIDANG_SK_TIM_PENGELOLA = Object.freeze({
    PJ: [
        'Penanggung Jawab Bidang Akademik',
        'Penanggung Jawab Bidang Sumber Daya',
        'Penanggung Jawab Bidang Kerja Sama',
        'Penanggung Jawab Bidang Administrasi'
    ],
    Pengarah: [
        'Pengarah Bidang Risiko Bisnis dan Keuangan',
        'Pengarah Bidang Strategi Bisnis dan Pemasaran',
        'Pengarah Bidang Pengambilan Keputusan dan Negosiasi Strategis',
        'Pengarah Bidang Kewirausahaan dan Manajemen Teknologi',
        'Pengarah Bidang Manajemen Operasi dan Kinerja',
        'Pengarah Bidang Manajemen Manusia dan Pengetahuan',
        'Pengarah Bidang Penjaminan Mutu',
        'Pengarah Bidang Sumber Daya Manusia',
        'Pengarah Bidang Perencanaan dan Keuangan',
        'Pengarah Bidang Sarana, Prasarana, Teknologi, dan Sistem Informasi'
    ],
    'Kepala Admin': [
        'Kepala Administrasi Bidang Akademik',
        'Kepala Administrasi Bidang Kemahasiswaan',
        'Kepala Administrasi Bidang Penjaminan Mutu',
        'Kepala Administrasi Bidang Sumber Daya Manusia',
        'Kepala Administrasi Bidang Perencanaan',
        'Kepala Administrasi Bidang Keuangan',
        'Kepala Administrasi Bidang Sarana dan Prasarana',
        'Kepala Administrasi Bidang Teknologi, dan Sistem Informasi',
        'Kepala Administrasi Bidang Kerja Sama',
        'Kepala Administrasi Bidang Monitoring dan Evaluasi'
    ],
    Anggota: [
        'Anggota Administrasi Bidang Akademik',
        'Anggota Administrasi Bidang Kemahasiswaan',
        'Anggota Administrasi Bidang Penjaminan Mutu',
        'Anggota Administrasi Bidang Sumber Daya Manusia',
        'Anggota Administrasi Bidang Perencanaan',
        'Anggota Administrasi Bidang Keuangan',
        'Anggota Administrasi Bidang Sarana dan Prasarana',
        'Anggota Administrasi Bidang Teknologi, dan Sistem Informasi',
        'Anggota Administrasi Bidang Kerja Sama',
        'Anggota Administrasi Bidang Monitoring dan Evaluasi'
    ],
    Ketua: ['Ketua']
});

const PLOTTING_SCHEMA_VERSION = 3;

function konfigurasiBidangPlottingCanonical() {
    return Object.fromEntries(Object.entries(BIDANG_SK_TIM_PENGELOLA).map(([role, names]) => [
        role,
        names.map((nama, index) => ({
            id: `${role}-${index + 1}`,
            nama,
            aktif: true
        }))
    ]));
}

function sanitasiRiwayatJabatanPlotting(raw = [], konfigurasi = konfigurasiBidangPlottingCanonical()) {
    if (!Array.isArray(raw)) return [];
    return raw.map(item => {
        if (!item || typeof item !== 'object') return item;
        if (!item.snapshot || typeof item.snapshot !== 'object') return item;
        return {
            ...item,
            snapshot: {
                ...item.snapshot,
                jabatanBidangPlottingKerma: konfigurasi
            }
        };
    });
}

function angkaDesimalSk(value) {
    if (value === null || value === undefined || value === '') return 0;
    const angka = Number(String(value).replace(/\./g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)?.[0] ?? value);
    return Number.isFinite(angka) ? angka : 0;
}

function rowPerhitunganDasarSk(snapshot = {}, role = '') {
    const rows = Array.isArray(snapshot?.perhitunganDasarPlotting?.rows)
        ? snapshot.perhitunganDasarPlotting.rows
        : [];
    return rows.find(row => row?.jabatan === role) || {};
}

function personilPerKermaSk(snapshot = {}, role = '') {
    if (role === 'Anggota') return personilPerKermaSk(snapshot, 'Kepala Admin');
    if (Object.prototype.hasOwnProperty.call(PERSONIL_SK_TERKUNCI, role)) return PERSONIL_SK_TERKUNCI[role];
    const row = rowPerhitunganDasarSk(snapshot, role);
    const angka = Math.max(0, Math.floor(angkaDesimalSk(row.personil_per_kerma ?? PERSONIL_SK_DEFAULT[role] ?? 0)));
    return Number.isFinite(angka) ? angka : 0;
}

function labelJabatanBidangSk(role, index) {
    const bidang = Array.isArray(BIDANG_SK_TIM_PENGELOLA[role]) ? BIDANG_SK_TIM_PENGELOLA[role] : [];
    if (bidang[index]) return bidang[index];
    const defaultRows = Math.max(0, Math.floor(Number(PERSONIL_SK_DEFAULT[role]) || 0));
    const baseline = Math.max(defaultRows, bidang.length);
    const label = LABEL_ROLE_SK_TIM_PENGELOLA[role] || role || 'Jabatan';
    if (index >= baseline) return `${label} - Tambahan ${index - baseline + 1}`;
    return defaultRows > 1 ? `${label} - Posisi ${index + 1}` : label;
}

function jumlahBarisSk(snapshot = {}, role = '') {
    if (role === 'Anggota') return personilPerKermaSk(snapshot, role);
    return Math.max(
        Math.max(0, Math.floor(Number(PERSONIL_SK_DEFAULT[role]) || 0)),
        personilPerKermaSk(snapshot, role)
    );
}

function keyPlotSkBidangSk(role, bidangIndex, noPks) {
    return `${role}|${Number(bidangIndex) || 0}|${Number(noPks) || 0}`;
}

function normalisasiNamaPersonilSk(value = '') {
    return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function indeksProfilPersonilSk(snapshot = {}, rowsPegawai = []) {
    const profiles = new Map();
    const sumber = [
        ...(Array.isArray(rowsPegawai) ? rowsPegawai : []),
        ...(Array.isArray(snapshot?.rows) ? snapshot.rows : [])
    ];
    sumber.forEach(row => {
        const nama = String(row?.nama || '').trim();
        const key = normalisasiNamaPersonilSk(nama);
        if (!key) return;
        const existing = profiles.get(key) || { nama };
        profiles.set(key, {
            ...existing,
            nama: existing.nama || nama,
            gelar_depan: existing.gelar_depan || String(row?.gelar_depan || row?.gelarDepan || '').trim(),
            gelar_belakang: existing.gelar_belakang || String(row?.gelar_belakang || row?.gelarBelakang || '').trim()
        });
    });
    return profiles;
}

function formatNamaPersonilSk(nama = '', profiles = new Map(), item = {}) {
    const namaDasar = String(nama || '').trim();
    if (!namaDasar) return '-';
    const profile = profiles.get(normalisasiNamaPersonilSk(namaDasar)) || {};
    const gelarDepan = String(item.gelar_depan || item.gelarDepan || profile.gelar_depan || '').trim();
    const gelarBelakang = String(item.gelar_belakang || item.gelarBelakang || profile.gelar_belakang || '').trim();
    return [gelarDepan, namaDasar, gelarBelakang].filter(Boolean).join(' ');
}

function daftarTimPengelolaSk(snapshot = {}, noPks = 1, rowsPegawai = []) {
    const manual = snapshot?.plotSkBidangManual && typeof snapshot.plotSkBidangManual === 'object'
        ? snapshot.plotSkBidangManual
        : {};
    const profiles = indeksProfilPersonilSk(snapshot, rowsPegawai);
    const rows = [];
    ROLE_SK_TIM_PENGELOLA.forEach(role => {
        const jumlah = jumlahBarisSk(snapshot, role);
        for (let index = 0; index < jumlah; index += 1) {
            const item = manual[keyPlotSkBidangSk(role, index, noPks)] || {};
            const nama = String(item.nama || '').trim();
            rows.push({
                no: rows.length + 1,
                role,
                jabatan: labelJabatanBidangSk(role, index),
                nama: formatNamaPersonilSk(nama, profiles, item)
            });
        }
    });
    return rows;
}

function buatCellTabelSk(text, width, options = {}) {
    const align = options.align ? `<w:jc w:val="${options.align}"/>` : '';
    const bold = options.bold ? '<w:b/><w:bCs/>' : '';
    const shade = options.shade ? `<w:shd w:fill="${options.shade}"/>` : '';
    return [
        '<w:tc>',
        `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shade}<w:vAlign w:val="center"/></w:tcPr>`,
        `<w:p><w:pPr>${align}<w:spacing w:before="40" w:after="40"/><w:rPr>${bold}<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>`,
        `<w:r><w:rPr>${bold}<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXmlWord(text)}</w:t></w:r>`,
        '</w:p>',
        '</w:tc>'
    ].join('');
}

function buatTabelTimPengelolaSk(rows = [], templateTable = '') {
    const templateRows = templateTable.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
    if (templateRows.length >= 2) {
        const headerRow = templateRows[0];
        const bodyTemplate = templateRows[1];
        const tablePrefix = templateTable.slice(0, templateTable.indexOf(templateRows[0]));
        const rowOpen = bodyTemplate.match(/^<w:tr\b[^>]*>/)?.[0] || '<w:tr>';
        const rowProperties = bodyTemplate.match(/<w:trPr>[\s\S]*?<\/w:trPr>/)?.[0] || '';
        const templateCells = bodyTemplate.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
        if (templateCells.length >= 3) {
            const header = buatHeaderTabelTimPengelolaSk(headerRow);
            const cells = rows.map(row => [
                buatCellDariTemplateSk(templateCells[0], String(row.no), 'center'),
                buatCellDariTemplateSk(templateCells[1], row.jabatan || '-', 'left'),
                buatCellDariTemplateSk(templateCells[2], row.nama || '-', 'left')
            ].join(''));
            return `${tablePrefix}${header}${rows.map((row, index) => `${rowOpen}${rowProperties}${cells[index]}</w:tr>`).join('')}</w:tbl>`;
        }
    }

    const bodyRows = rows.map(row => [
        '<w:tr>',
        buatCellTabelSk(row.no, 720, { align: 'center' }),
        buatCellTabelSk(row.jabatan || '-', 5600),
        buatCellTabelSk(row.nama || '-', 3040),
        '</w:tr>'
    ].join('')).join('');
    return [
        '<w:tbl>',
        '<w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>',
        '<w:tblGrid><w:gridCol w:w="720"/><w:gridCol w:w="5600"/><w:gridCol w:w="3040"/></w:tblGrid>',
        '<w:tr>',
        buatCellTabelSk('No.', 720, { align: 'center', bold: true, shade: 'D9EAF7' }),
        buatCellTabelSk('Jabatan', 5600, { align: 'center', bold: true, shade: 'D9EAF7' }),
        buatCellTabelSk('Nama', 3040, { align: 'center', bold: true, shade: 'D9EAF7' }),
        '</w:tr>',
        bodyRows,
        '</w:tbl>'
    ].join('');
}

function buatCellDariTemplateSk(templateCell, text, align = '') {
    const tcOpen = templateCell.match(/^<w:tc\b[^>]*>/)?.[0] || '<w:tc>';
    const tcProperties = templateCell.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] || '';
    const paragraph = templateCell.match(/<w:p\b[\s\S]*?<\/w:p>/)?.[0] || '<w:p></w:p>';
    const pOpen = paragraph.match(/^<w:p\b[^>]*>/)?.[0] || '<w:p>';
    const pProperties = paragraph.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || '';
    const textRun = (paragraph.match(/<w:r\b[\s\S]*?<w:t[\s\S]*?<\/w:t>[\s\S]*?<\/w:r>/g) || [])[0] || '';
    const runProperties = textRun.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] || '';
    let paragraphProperties = pProperties;
    if (align) {
        paragraphProperties = paragraphProperties.replace(/<w:jc\b[^>]*\/>/g, '');
        if (align === 'center') paragraphProperties = paragraphProperties.replace(/<w:ind\b[^>]*\/>/g, '');
        const alignment = `<w:jc w:val="${align}"/>`;
        const runPropertiesIndex = paragraphProperties.indexOf('<w:rPr>');
        if (runPropertiesIndex >= 0) {
            paragraphProperties = `${paragraphProperties.slice(0, runPropertiesIndex)}${alignment}${paragraphProperties.slice(runPropertiesIndex)}`;
        } else if (paragraphProperties.includes('</w:pPr>')) {
            paragraphProperties = paragraphProperties.replace('</w:pPr>', `${alignment}</w:pPr>`);
        } else {
            paragraphProperties = `<w:pPr>${alignment}</w:pPr>`;
        }
    }
    return [
        tcOpen,
        tcProperties,
        pOpen,
        paragraphProperties,
        `<w:r>${runProperties}<w:t xml:space="preserve">${escapeXmlWord(text)}</w:t></w:r>`,
        '</w:p>',
        '</w:tc>'
    ].join('');
}

function buatHeaderTabelTimPengelolaSk(headerRow = '') {
    const rowOpen = headerRow.match(/^<w:tr\b[^>]*>/)?.[0] || '<w:tr>';
    const rowProperties = headerRow.match(/<w:trPr>[\s\S]*?<\/w:trPr>/)?.[0] || '';
    const cells = headerRow.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
    if (cells.length < 3) return headerRow;
    return [
        rowOpen,
        rowProperties,
        buatCellDariTemplateSk(cells[0], 'No.', 'center'),
        buatCellDariTemplateSk(cells[1], 'Jabatan', 'center'),
        buatCellDariTemplateSk(cells[2], 'Nama', 'center'),
        '</w:tr>'
    ].join('');
}

function gantiTabelTimPengelolaSk(xml, rows) {
    const tables = xml.match(/<w:tbl[\s\S]*?<\/w:tbl>/g) || [];
    const target = tables.find(tbl => tbl.includes('Penanggung_Jawab_Bidang_Akademik'));
    if (!target) throw new Error('Tabel Tim Pengelola Kerma pada template SK tidak ditemukan.');
    return xml.replace(target, buatTabelTimPengelolaSk(rows, target));
}

function polaTeksTerbagiSk(text) {
    const encoded = escapeXmlWord(text);
    return Array.from(encoded).map((char, index) => `${escapeRegExp(char)}${index === encoded.length - 1 ? '' : '(?:<[^>]+>)*'}`).join('');
}

function gantiTeksTerbagiSk(xml, target, replacement) {
    if (!target) return xml;
    const pattern = new RegExp(polaTeksTerbagiSk(target), 'g');
    return xml.replace(pattern, escapeXmlWord(replacement));
}

function hapusBoldDariRunSk(paragraph, escapedText) {
    if (!escapedText) return paragraph;
    return paragraph.replace(/<w:r\b[\s\S]*?<\/w:r>/g, run => {
        if (!run.includes(escapedText)) return run;
        return run.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/, (_, properties) => (
            '<w:rPr>' + properties.replace(/<w:b(?:Cs)?\b[^>]*\/>/g, '') + '</w:rPr>'
        ));
    });
}

function gantiJudulPksSk(xml, judul = '') {
    const value = String(judul || '');
    const valueUpper = value.toUpperCase();
    let judulKepalaSudahDiganti = false;
    let output = xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, paragraph => {
        const memuatPlaceholder = paragraph.includes('Judul_PKS') || paragraph.includes('«Judul_PKS»');
        const isJudulKepala = !judulKepalaSudahDiganti && /TIM PELAKSANA/.test(paragraph) && memuatPlaceholder;
        const replacement = isJudulKepala ? valueUpper : value;
        let updated = gantiTeksTerbagiSk(paragraph, '<Judul_PKS>', replacement);
        updated = updated.replace(/«Judul_PKS»/g, escapeXmlWord(replacement));
        if (isJudulKepala) judulKepalaSudahDiganti = true;
        return updated;
    });
    output = gantiTeksTerbagiSk(output, '<Judul_PKS>', value);
    output = output.replace(/«Judul_PKS»/g, escapeXmlWord(value));

    const escapedBodyTitle = escapeXmlWord(value);
    if (!escapedBodyTitle) return output;
    return output.replace(/<w:p\b[\s\S]*?<\/w:p>/g, paragraph => {
        if (!paragraph.includes(escapedBodyTitle) || /TIM PELAKSANA/.test(paragraph)) return paragraph;
        return hapusBoldDariRunSk(paragraph, escapedBodyTitle);
    });
}

function gantiPlaceholderSk(xml, data = {}) {
    let output = xml;
    Object.entries(data).forEach(([key, value]) => {
        output = output.split(`«${key}»`).join(escapeXmlWord(value));
        output = gantiTeksTerbagiSk(output, `<${key}>`, value);
    });
    return output;
}

function gantiTanggalSk(xml, tanggalSkDisplay) {
    const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
    const target = paragraphs.find(p => p.includes('pada tanggal'));
    if (!target) return xml;
    const open = target.match(/^<w:p\b[^>]*>/)?.[0] || '<w:p>';
    const pPr = target.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || '';
    const updated = `${open}${pPr}<w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXmlWord(`pada tanggal ${tanggalSkDisplay}`)}</w:t></w:r></w:p>`;
    return xml.replace(target, updated);
}

function daftarPksSnapshotSk(snapshot = {}) {
    const ids = Array.isArray(snapshot.daftarPksTerpilihPlotting)
        ? snapshot.daftarPksTerpilihPlotting.map(id => String(id || '').trim())
        : [];
    const jumlah = Math.max(0, Math.floor(Number(snapshot.jumlahPksPlotting) || ids.length));
    return Array.from({ length: jumlah }, (_, index) => ({
        noPks: index + 1,
        id: ids[index] || ''
    })).filter(item => item.id);
}

async function ambilProgramUntukSk(ids = []) {
    const unik = [...new Set(ids.map(id => String(id || '').trim()).filter(Boolean))];
    if (!unik.length) return new Map();
    const programs = await Program.find({
        $or: [
            { id_program: { $in: unik } },
            { kode_file: { $in: unik } }
        ]
    }).lean();
    const map = new Map();
    programs.forEach(program => {
        if (program.id_program) map.set(String(program.id_program), program);
        if (program.kode_file) map.set(String(program.kode_file), program);
    });
    return map;
}

function formatNamaFileSk(program = {}, noPks = 1, ext = 'docx') {
    const nomorPks = Math.max(1, Math.floor(Number(noPks) || 1));
    const kodeFile = String(program.kode_file || program.id_program || `PKS ${nomorPks}`).trim();
    const mitra = String(program.nama_mitra || 'Mitra').trim();
    const namaFile = `SK Tim Pengelola Kerma_PKS ${nomorPks}_${kodeFile}_${mitra}`;
    return `${sanitizeFilename(namaFile)}.${ext}`;
}

function dataPlaceholderSk(program = {}, input = {}, noPks = 1) {
    const judul = String(program.judul_pks || input.judul_pks || '').trim();
    const tanggalSk = parseTanggalDashboard(input.tanggal_sk) || new Date();
    const tanggalBerlaku = parseTanggalDashboard(input.tanggal_berlaku_sampai);
    const namaKerma = String(input.nama_kerma || '').trim() || `TIM PELAKSANA ${judul || program.nama_mitra || program.kode_file || `PKS ${noPks}`}`;
    const namaMitra = String(program.nama_mitra || '').trim();
    const nomorKontrakMitra = String(program.no_kontrak_mitra || '').trim();
    const nomorKontrakInstitusi = String(program.no_kontrak_institusi || '').trim();
    const tanggalKontrak = formatTanggalDisplay(program.tgl_kontrak || '');
    const kodeFile = String(program.kode_file || program.id_program || '').trim();
    return {
        NO_SK_TIM_PENGELOLA_KERMA_BARU: input.nomor_sk || '',
        NAMA_KERMA_BARU: namaKerma.toUpperCase(),
        MITRALOW_CASE: namaMitra,
        NOMOR_PKS_MITRA: nomorKontrakMitra,
        NOMOR_PKS_SBM_ITB: nomorKontrakInstitusi,
        TGL_PKS: tanggalKontrak,
        No: judul,
        TAHUN_AKADEMIK: input.tahun_akademik || '',
        JUDUL_PERJANJIAN_KERJA_SAMA_PKSLOW_C: judul,
        KODE_FILE: kodeFile,
        TANGGAL_SK: formatTanggalDisplay(tanggalSk),
        TANGGAL_BERLAKU_SAMPAI: tanggalBerlaku ? formatTanggalDisplay(tanggalBerlaku) : '',
        'No. SK': String(input.nomor_sk || '').trim(),
        Judul_PKS: judul,
        Nama_Mitra: namaMitra,
        'No. Kontrak Mitra': nomorKontrakMitra,
        'No. Kontrak Institusi': nomorKontrakInstitusi,
        'Tgl. Kontrak': tanggalKontrak,
        Kode_File: kodeFile
    };
}

function renderSkTimPengelolaDocx({ snapshot, program, input, noPks, rowsPegawai = [] }) {
    if (!fs.existsSync(TEMPLATE_SK_TIM_PENGELOLA_PATH)) {
        throw new Error('Template SK Tim Pengelola Kerma belum tersedia.');
    }
    const zip = new PizZip(fs.readFileSync(TEMPLATE_SK_TIM_PENGELOLA_PATH, 'binary'));
    const docFile = zip.file('word/document.xml');
    if (!docFile) throw new Error('Template SK tidak memiliki dokumen utama.');
    const placeholder = dataPlaceholderSk(program, input, noPks);
    const tim = daftarTimPengelolaSk(snapshot, noPks, rowsPegawai);
    let xml = docFile.asText();
    xml = gantiTabelTimPengelolaSk(xml, tim);
    const { Judul_PKS: judulPks, ...placeholderLainnya } = placeholder;
    xml = gantiJudulPksSk(xml, judulPks);
    xml = gantiPlaceholderSk(xml, placeholderLainnya);
    xml = gantiTanggalSk(xml, placeholder.TANGGAL_SK);
    if (placeholder.TANGGAL_BERLAKU_SAMPAI) {
        xml = gantiTeksTerbagiSk(xml, '31 Desember 2025', placeholder.TANGGAL_BERLAKU_SAMPAI);
        xml = gantiTeksTerbagiSk(xml, '31 Desember 2026', placeholder.TANGGAL_BERLAKU_SAMPAI);
    }
    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function cariLibreOfficeBinary() {
    const candidates = [
        process.env.LIBREOFFICE_PATH,
        'libreoffice',
        'soffice',
        '/Applications/LibreOffice.app/Contents/MacOS/soffice'
    ].filter(Boolean);
    for (const candidate of candidates) {
        if (path.isAbsolute(candidate)) {
            if (fs.existsSync(candidate)) return candidate;
            continue;
        }
        try {
            const resolved = execFileSync('which', [candidate], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
            if (resolved) return resolved;
        } catch {
            // Lanjut ke kandidat berikutnya.
        }
    }
    return '';
}

function konversiDocxKePdf(buffer, filename = 'SK.docx') {
    const binary = cariLibreOfficeBinary();
    if (!binary) throw new Error('Konversi PDF membutuhkan LibreOffice/soffice pada server. Unduh format DOCX terlebih dahulu atau pasang LibreOffice untuk mengaktifkan PDF.');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kerma-sk-pdf-'));
    try {
        const inputPath = path.join(dir, sanitizeFilename(filename));
        fs.writeFileSync(inputPath, buffer);
        execFileSync(binary, ['--headless', '--convert-to', 'pdf', '--outdir', dir, inputPath], {
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 90_000
        });
        const pdfPath = inputPath.replace(/\.docx$/i, '.pdf');
        if (!fs.existsSync(pdfPath)) throw new Error('File PDF hasil konversi tidak ditemukan.');
        return fs.readFileSync(pdfPath);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

app.post('/api/plotting-kerma/sk-tim-pengelola', requireLogin, async (req, res) => {
    try {
        const snapshot = req.body?.snapshot && typeof req.body.snapshot === 'object' ? req.body.snapshot : {};
        const format = String(req.body?.format || 'docx').toLowerCase() === 'pdf' ? 'pdf' : 'docx';
        const tanggalSkDate = parseTanggalDashboard(req.body?.tanggal_sk);
        if (!tanggalSkDate) return res.status(400).json({ pesan: 'Tanggal SK wajib diisi dengan format yang valid.' });
        const tahunAkademik = String(req.body?.tahun_akademik || '').trim();
        if (!tahunAkademik) return res.status(400).json({ pesan: 'Tahun Akademik wajib diisi.' });

        const daftarPks = daftarPksSnapshotSk(snapshot);
        if (!daftarPks.length) return res.status(400).json({ pesan: 'Simulasi belum memiliki daftar PKS yang dapat dibuatkan SK.' });

        const nomorSkByPks = req.body?.nomor_sk_by_pks && typeof req.body.nomor_sk_by_pks === 'object'
            ? req.body.nomor_sk_by_pks
            : {};
        const kosong = daftarPks.filter(item => !String(nomorSkByPks[item.noPks] || '').trim());
        if (kosong.length) {
            return res.status(400).json({
                pesan: `Nomor SK wajib diisi untuk ${kosong.length} PKS: ${kosong.slice(0, 5).map(item => `PKS ${item.noPks}`).join(', ')}${kosong.length > 5 ? ', ...' : ''}.`
            });
        }

        const userId = String(req.session.user?.username || req.session.user?.id || 'admin');
        const resolvedPlotting = await resolvePlottingKermaDoc(userId);
        const currentPayload = resolvedPlotting.doc ? extractPayloadPlotting(resolvedPlotting.doc) : {};
        const rowsPegawai = Array.isArray(currentPayload?.rows) ? currentPayload.rows : [];
        const programMap = await ambilProgramUntukSk(daftarPks.map(item => item.id));
        const docs = daftarPks.map(item => {
            const program = programMap.get(item.id) || { id_program: item.id, kode_file: item.id };
            const input = {
                nomor_sk: String(nomorSkByPks[item.noPks] || '').trim(),
                tanggal_sk: formatTanggalISO(tanggalSkDate),
                tanggal_berlaku_sampai: req.body?.tanggal_berlaku_sampai || '',
                tahun_akademik: tahunAkademik,
                nama_kerma: req.body?.nama_kerma || ''
            };
            const bufferDocx = renderSkTimPengelolaDocx({ snapshot, program, input, noPks: item.noPks, rowsPegawai });
            const filenameDocx = formatNamaFileSk(program, item.noPks, 'docx');
            if (format === 'pdf') {
                return {
                    filename: filenameDocx.replace(/\.docx$/i, '.pdf'),
                    buffer: konversiDocxKePdf(bufferDocx, filenameDocx),
                    mime: 'application/pdf'
                };
            }
            return {
                filename: filenameDocx,
                buffer: bufferDocx,
                mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
        });

        if (docs.length === 1) {
            res.setHeader('Content-Type', docs[0].mime);
            res.setHeader('Content-Disposition', `attachment; filename="${docs[0].filename}"`);
            return res.send(docs[0].buffer);
        }

        const zip = new AdmZip();
        docs.forEach(doc => zip.addFile(doc.filename, doc.buffer));
        const extLabel = format === 'pdf' ? 'PDF' : 'DOCX';
        const filename = sanitizeFilename(`Bundel SK Tim Pengelola Kerma ${extLabel} ${req.body?.nama_simulasi || ''}`) + '.zip';
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(zip.toBuffer());
    } catch (err) {
        const pesan = err?.message || 'Gagal membuat SK Tim Pengelola Kerma.';
        console.error('Gagal membuat SK Tim Pengelola Kerma:', err);
        const status = /LibreOffice|soffice|PDF/i.test(pesan) ? 503 : 500;
        res.status(status).json({ pesan });
    }
});

function serialisasiInvoicePembayaran(row = {}, program = {}) {
    const id = String(row._id || row.id_invoice || '');
    const nominal = Number(row.rencana_nominal) || 0;
    return {
        id_invoice: id,
        id_program: row.id_program || program.id_program || '',
        kode_file: row.kode_file || program.kode_file || '',
        nama_mitra: program.nama_mitra || row.nama_mitra || '',
        judul_pks: program.judul_pks || row.judul_pks || '',
        rencana_key: row.rencana_key || '',
        rencana_tahap: row.rencana_tahap || '',
        rencana_tanggal: formatTanggalDisplay(row.rencana_tanggal),
        rencana_tanggal_input: formatTanggalInput(row.rencana_tanggal),
        rencana_nominal: nominal,
        rencana_nominal_display: `Rp ${formatRupiahAngka(nominal)}`,
        nomor_invoice: row.nomor_invoice || '',
        tanggal_invoice: formatTanggalDisplay(row.tanggal_invoice),
        tanggal_invoice_input: formatTanggalInput(row.tanggal_invoice),
        status: row.status || 'dibuat',
        keterangan: row.keterangan || '',
        download_url: id ? `/api/invoice-pembayaran/${id}/download` : '',
        print_url: id ? `/api/invoice-pembayaran/${id}/print` : ''
    };
}

async function cariMitraUntukInvoice(program = {}) {
    const nama = String(program.nama_mitra || '').trim();
    if (!nama) return null;
    return await Mitra.findOne({ nama_mitra: nama }).lean()
        || await Mitra.findOne({ nama_mitra: new RegExp(`^${escapeRegExp(nama)}$`, 'i') }).lean();
}

async function buatNomorInvoicePembayaran(tanggalInvoice) {
    const tanggal = parseTanggalDashboard(tanggalInvoice) || new Date();
    const tahun = tanggal.getFullYear();
    const jumlahTahunIni = await InvoicePembayaran.countDocuments({ tanggal_invoice: new RegExp(`^${tahun}-`) });
    return `NO. ${String(jumlahTahunIni + 1).padStart(3, '0')}/IT1.C09.2/KU/${tahun}`;
}

async function cariRencanaTerminInvoice(rencanaKey) {
    const key = String(rencanaKey || '').trim();
    if (!key) return null;
    const payload = await bangunRencanaPendapatanTermin();
    return (payload.data || []).find(row => String(row.rencana_key || '').trim() === key) || null;
}

function escapeHtml(value = '') {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function dataPreviewInvoicePembayaran(invoice = {}, program = {}, mitra = {}) {
    const nominal = Math.max(0, Math.round(Number(invoice.rencana_nominal) || 0));
    const [alamat1, alamat2] = pecahAlamatInvoice(program, mitra || {});
    return {
        id_invoice: String(invoice._id || invoice.id_invoice || ''),
        rencana_key: invoice.rencana_key || '',
        kode_file: invoice.kode_file || program.kode_file || '',
        nama_mitra: program.nama_mitra || invoice.nama_mitra || '',
        judul_pks: program.judul_pks || invoice.judul_pks || '',
        no_kontrak_mitra: program.no_kontrak_mitra || '',
        no_kontrak_institusi: program.no_kontrak_institusi || '',
        alamat_1: alamat1,
        alamat_2: alamat2,
        rencana_tahap: invoice.rencana_tahap || '',
        rencana_tanggal: formatTanggalDisplay(invoice.rencana_tanggal),
        rencana_tanggal_input: formatTanggalInput(invoice.rencana_tanggal),
        rencana_nominal: nominal,
        rencana_nominal_display: `Rp ${formatRupiahAngka(nominal)},-`,
        terbilang: `#${formatJudulTerbilang(nominal)}#`,
        nomor_invoice: invoice.nomor_invoice || '',
        tanggal_invoice: formatTanggalDisplay(invoice.tanggal_invoice),
        tanggal_invoice_input: formatTanggalInput(invoice.tanggal_invoice),
        status: invoice.status || 'draft'
    };
}

function renderHtmlPrintInvoice(invoice = {}, program = {}, mitra = {}) {
    const data = dataPreviewInvoicePembayaran(invoice, program, mitra);
    return `<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(data.nomor_invoice || 'Invoice')}</title>
    <style>
        @page { size: A4; margin: 18mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #f3f4f6; }
        .toolbar { position: sticky; top: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 10px 14px; background: #ffffff; border-bottom: 1px solid #e5e7eb; }
        .toolbar button { border: 0; border-radius: 6px; padding: 8px 12px; font-weight: 700; cursor: pointer; }
        .toolbar .print { background: #1d4ed8; color: #ffffff; }
        .toolbar .close { background: #e5e7eb; color: #111827; }
        .sheet { width: 210mm; min-height: 297mm; margin: 18px auto; padding: 18mm; background: #ffffff; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16); }
        .header { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: start; border-bottom: 2px solid #111827; padding-bottom: 14px; }
        .brand h1 { margin: 0; font-size: 16px; }
        .brand h2 { margin: 4px 0 6px; font-size: 15px; }
        .brand p { margin: 0; font-size: 10px; line-height: 1.4; max-width: 440px; }
        .title { text-align: right; }
        .title h1 { margin: 0; font-size: 24px; letter-spacing: 0; }
        .title p { margin: 8px 0 0; font-size: 12px; font-weight: 700; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 22px; }
        .box h3 { margin: 0 0 9px; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
        .row { display: grid; grid-template-columns: 112px 1fr; gap: 8px; margin-bottom: 7px; font-size: 11px; line-height: 1.35; }
        .row span:first-child { color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 22px; font-size: 11px; }
        th, td { border: 1px solid #9ca3af; padding: 8px; vertical-align: top; }
        th { background: #f3f4f6; text-align: left; }
        .num { text-align: right; white-space: nowrap; }
        .terbilang { margin-top: 18px; display: grid; grid-template-columns: 90px 1fr; gap: 10px; font-size: 11px; }
        .summary { width: 42%; margin-left: auto; margin-top: 14px; font-size: 11px; }
        .summary .line { display: grid; grid-template-columns: 1fr 130px; border-bottom: 1px solid #d1d5db; padding: 7px 0; }
        .summary .total { font-weight: 800; border-bottom: 2px solid #111827; }
        .signature { width: 44%; margin-left: auto; margin-top: 34px; text-align: center; font-size: 11px; }
        .signature .space { height: 72px; }
        .signature strong { display: block; }
        @media print {
            body { background: #ffffff; }
            .toolbar { display: none; }
            .sheet { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 0; }
        }
    </style>
</head>
<body onload="setTimeout(() => window.print(), 300)">
    <div class="toolbar">
        <button class="print" type="button" onclick="window.print()">Print</button>
        <button class="close" type="button" onclick="window.close()">Tutup</button>
    </div>
    <main class="sheet">
        <section class="header">
            <div class="brand">
                <h1>Institut Teknologi Bandung</h1>
                <h2>Sekolah Bisnis dan Manajemen</h2>
                <p>Jl. Ganesa No. 10, Gedung Sekolah Bisnis dan Manajemen Bandung 40132 Telp : +6222 2531923, Fax : +6222 2504249 www.sbm.itb.ac.id</p>
            </div>
            <div class="title">
                <h1>INVOICE</h1>
                <p>${escapeHtml(data.nomor_invoice)}</p>
            </div>
        </section>
        <section class="meta">
            <div class="box">
                <h3>Pelanggan</h3>
                <div class="row"><span>Nama</span><strong>${escapeHtml(data.nama_mitra)}</strong></div>
                <div class="row"><span>Alamat</span><div>${escapeHtml(data.alamat_1)}<br>${escapeHtml(data.alamat_2)}</div></div>
            </div>
            <div class="box">
                <h3>Keterangan</h3>
                <div class="row"><span>Tanggal</span><strong>${escapeHtml(data.tanggal_invoice)}</strong></div>
                <div class="row"><span>No. DO/Kontrak</span><div>${escapeHtml(data.no_kontrak_mitra)}<br>${escapeHtml(data.no_kontrak_institusi)}</div></div>
                <div class="row"><span>Mata Uang</span><strong>Rupiah</strong></div>
            </div>
        </section>
        <table>
            <thead>
                <tr>
                    <th style="width:42px;">No</th>
                    <th>Keterangan</th>
                    <th style="width:72px;">Jumlah</th>
                    <th style="width:72px;">Satuan</th>
                    <th style="width:130px;">Harga Satuan</th>
                    <th style="width:130px;">Harga</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>1</td>
                    <td>
                        <strong>${escapeHtml(data.rencana_tahap || 'Pembayaran')}</strong><br>
                        Biaya Penyelenggaraan Pendidikan<br>
                        ${escapeHtml(data.judul_pks || data.nama_mitra)}<br>
                        ${data.rencana_tanggal ? `Jatuh tempo ${escapeHtml(data.rencana_tanggal)}` : ''}
                    </td>
                    <td class="num">1</td>
                    <td>paket</td>
                    <td class="num">${escapeHtml(data.rencana_nominal_display)}</td>
                    <td class="num">${escapeHtml(data.rencana_nominal_display)}</td>
                </tr>
            </tbody>
        </table>
        <div class="terbilang"><strong>Terbilang</strong><span>${escapeHtml(data.terbilang)}</span></div>
        <div class="summary">
            <div class="line"><span>Sub-Total</span><strong class="num">${escapeHtml(data.rencana_nominal_display)}</strong></div>
            <div class="line"><span>Lain-lain</span><strong class="num">Rp 0,-</strong></div>
            <div class="line total"><span>Total</span><strong class="num">${escapeHtml(data.rencana_nominal_display)}</strong></div>
        </div>
        <div class="signature">
            <p>Wakil Dekan Bidang Sumber Daya</p>
            <div class="space"></div>
            <strong>Prof. Donald Crestofel Lantu, S.T., M.B.A., Ph.D.</strong>
            <span>NIP 19760925 201012 1 001</span>
        </div>
    </main>
</body>
</html>`;
}

async function buatWorkbookInvoicePembayaran(invoice, program = {}, mitra = {}) {
    if (!fs.existsSync(TEMPLATE_INVOICE_PATH)) {
        throw new Error('Template invoice belum tersedia.');
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(TEMPLATE_INVOICE_PATH);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('Template invoice tidak memiliki worksheet.');
    wb.worksheets.slice(1).forEach(sheet => wb.removeWorksheet(sheet.id));
    ws.name = 'Invoice';

    const nominal = Math.max(0, Math.round(Number(invoice.rencana_nominal) || 0));
    const [alamat1, alamat2] = pecahAlamatInvoice(program, mitra || {});
    const tahap = invoice.rencana_tahap || 'Pembayaran';
    const judulPks = program.judul_pks || '';
    const terbilang = `#${formatJudulTerbilang(nominal)}#`;

    setCellInvoice(ws, 'J2', 'INVOICE');
    setCellInvoice(ws, 'J3', 'INVOICE');
    setCellInvoice(ws, 'J5', invoice.nomor_invoice || '');
    setCellInvoice(ws, 'E10', program.nama_mitra || '');
    setCellInvoice(ws, 'L10', formatTanggalDisplay(invoice.tanggal_invoice));
    setCellInvoice(ws, 'E14', alamat1);
    setCellInvoice(ws, 'E15', alamat2);
    setCellInvoice(ws, 'L14', program.no_kontrak_mitra || '');
    setCellInvoice(ws, 'L15', program.no_kontrak_institusi || '');
    setCellInvoice(ws, 'L19', 'Rupiah');
    setCellInvoice(ws, 'E21', '');
    setCellInvoice(ws, 'L21', '');
    setCellInvoice(ws, 'C25', tahap);
    setCellInvoice(ws, 'G25', 1);
    setCellInvoice(ws, 'H25', 'paket');
    ['I25', 'J25', 'K25', 'L25', 'M25'].forEach(address => setCellInvoice(ws, address, nominal));
    setCellInvoice(ws, 'C26', 'Biaya Penyelenggaraan Pendidikan');
    setCellInvoice(ws, 'C27', judulPks || program.nama_mitra || '');
    setCellInvoice(ws, 'C28', invoice.rencana_tanggal ? `Jatuh tempo ${formatTanggalDisplay(invoice.rencana_tanggal)}` : '');
    setCellInvoice(ws, 'E31', terbilang);
    setCellInvoice(ws, 'E32', terbilang);
    ['L31', 'M31', 'L33', 'M33'].forEach(address => setCellInvoice(ws, address, nominal));
    ['L32', 'M32'].forEach(address => setCellInvoice(ws, address, 0));

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

app.get('/api/invoice-pembayaran', async (req, res) => {
    try {
        const filter = req.query.kodeFile ? { kode_file: req.query.kodeFile } : {};
        const [list, programs] = await Promise.all([
            InvoicePembayaran.find(filter).sort({ tanggal_invoice: -1, createdAt: -1 }).lean(),
            Program.find({}).lean()
        ]);
        const programMap = new Map(programs.map(row => [row.id_program, row]));
        const data = list.map(row => serialisasiInvoicePembayaran(row, programMap.get(row.id_program) || {}));
        res.json({
            data,
            summary: {
                jumlah_item: data.length,
                jumlah_item_display: data.length.toLocaleString('id-ID')
            }
        });
    } catch (err) {
        console.error('Gagal membaca invoice pembayaran:', err);
        res.status(500).json({ pesan: 'Gagal membaca data invoice pembayaran.' });
    }
});

app.get('/api/invoice-pembayaran/preview', async (req, res) => {
    try {
        const rencanaKey = String(req.query?.rencana_key || '').trim();
        if (!rencanaKey) return res.status(400).json({ pesan: 'Rencana pembayaran wajib dipilih.' });

        const existing = await InvoicePembayaran.findOne({ rencana_key: rencanaKey }).lean();
        if (existing) {
            const program = await Program.findOne({ id_program: existing.id_program }).lean();
            const mitra = program ? await cariMitraUntukInvoice(program) : null;
            return res.json({
                sudah_dibuat: true,
                data: {
                    ...dataPreviewInvoicePembayaran(existing, program || {}, mitra || {}),
                    ...serialisasiInvoicePembayaran(existing, program || {})
                }
            });
        }

        const rencana = await cariRencanaTerminInvoice(rencanaKey);
        if (!rencana) return res.status(404).json({ pesan: 'Rencana pembayaran tidak ditemukan.' });
        if (rencana.terealisasi) return res.status(400).json({ pesan: 'Termin ini sudah lunas, sehingga invoice tidak perlu dibuat.' });

        const lookup = await cariProgramDariKodeFile(rencana.kode_file || '');
        if (lookup.error) return res.status(400).json({ pesan: lookup.error });

        const tanggalInvoiceRaw = req.query?.tanggal_invoice || formatTanggalISO(new Date());
        const tanggalInvoiceDate = parseTanggalDashboard(tanggalInvoiceRaw);
        if (!tanggalInvoiceDate) return res.status(400).json({ pesan: 'Tanggal invoice tidak valid.' });
        const tanggalInvoice = formatTanggalISO(tanggalInvoiceDate);
        const mitra = await cariMitraUntukInvoice(lookup.program);
        const nominal = Math.max(0, Math.round(Number(rencana.nominal_sisa) || Number(rencana.nominal) || Number(rencana.nominal_rencana) || 0));
        const nomorInvoice = String(req.query?.nomor_invoice || '').trim() || await buatNomorInvoicePembayaran(tanggalInvoice);
        const invoicePreview = {
            id_program: lookup.program.id_program,
            kode_file: lookup.kodeFile,
            rencana_key: rencanaKey,
            rencana_tahap: rencana.tahap || '',
            rencana_tanggal: rencana.tanggal_input || '',
            rencana_nominal: nominal,
            nomor_invoice: nomorInvoice,
            tanggal_invoice: tanggalInvoice,
            status: 'draft'
        };

        res.json({
            sudah_dibuat: false,
            data: dataPreviewInvoicePembayaran(invoicePreview, lookup.program, mitra || {})
        });
    } catch (err) {
        console.error('Gagal membuat preview invoice pembayaran:', err);
        res.status(500).json({ pesan: 'Gagal membuat preview invoice pembayaran.' });
    }
});

app.post('/api/invoice-pembayaran', async (req, res) => {
    try {
        const rencanaKey = String(req.body?.rencana_key || '').trim();
        if (!rencanaKey) return res.status(400).json({ pesan: 'Rencana pembayaran wajib dipilih.' });

        const rencana = await cariRencanaTerminInvoice(rencanaKey);
        if (!rencana) return res.status(404).json({ pesan: 'Rencana pembayaran tidak ditemukan.' });
        if (rencana.terealisasi) return res.status(400).json({ pesan: 'Termin ini sudah lunas, sehingga invoice tidak perlu dibuat.' });

        const lookup = await cariProgramDariKodeFile(rencana.kode_file || req.body?.kode_file || '');
        if (lookup.error) return res.status(400).json({ pesan: lookup.error });

        const existing = await InvoicePembayaran.findOne({ rencana_key: rencanaKey });
        if (existing) {
            return res.json({
                pesan: 'Invoice untuk termin ini sudah dibuat.',
                data: serialisasiInvoicePembayaran(existing, lookup.program)
            });
        }

        const tanggalInvoiceDate = parseTanggalDashboard(req.body?.tanggal_invoice || new Date());
        if (!tanggalInvoiceDate) return res.status(400).json({ pesan: 'Tanggal invoice tidak valid.' });
        const tanggalInvoice = formatTanggalISO(tanggalInvoiceDate);
        const nominal = Math.max(0, Math.round(Number(rencana.nominal_sisa) || Number(rencana.nominal) || Number(rencana.nominal_rencana) || 0));
        if (nominal <= 0) return res.status(400).json({ pesan: 'Nominal invoice harus lebih dari 0.' });

        const nomorInvoice = String(req.body?.nomor_invoice || '').trim() || await buatNomorInvoicePembayaran(tanggalInvoice);
        const created = await InvoicePembayaran.create({
            id_program: lookup.program.id_program,
            kode_file: lookup.kodeFile,
            rencana_key: rencanaKey,
            rencana_tahap: rencana.tahap || '',
            rencana_tanggal: rencana.tanggal_input || '',
            rencana_nominal: nominal,
            nomor_invoice: nomorInvoice,
            tanggal_invoice: tanggalInvoice,
            status: 'dibuat',
            keterangan: String(req.body?.keterangan || '').trim(),
            dibuat_oleh: req.session?.user?.username || req.session?.user?.nama || ''
        });

        res.status(201).json({
            pesan: 'Invoice berhasil dibuat.',
            data: serialisasiInvoicePembayaran(created, lookup.program)
        });
    } catch (err) {
        if (err?.code === 11000 && req.body?.rencana_key) {
            const existing = await InvoicePembayaran.findOne({ rencana_key: String(req.body.rencana_key || '').trim() }).lean();
            if (existing) {
                const program = await Program.findOne({ id_program: existing.id_program }).lean();
                return res.json({
                    pesan: 'Invoice untuk termin ini sudah dibuat.',
                    data: serialisasiInvoicePembayaran(existing, program || {})
                });
            }
        }
        console.error('Gagal membuat invoice pembayaran:', err);
        res.status(500).json({ pesan: 'Gagal membuat invoice pembayaran.' });
    }
});

app.get('/api/invoice-pembayaran/:id/download', async (req, res) => {
    try {
        const invoice = await InvoicePembayaran.findById(req.params.id).lean();
        if (!invoice) return res.status(404).send('Invoice tidak ditemukan.');
        const program = await Program.findOne({ id_program: invoice.id_program }).lean();
        if (!program) return res.status(404).send('Data kontrak untuk invoice tidak ditemukan.');
        const mitra = await cariMitraUntukInvoice(program);
        const buffer = await buatWorkbookInvoicePembayaran(invoice, program, mitra || {});
        const filename = sanitizeFilename(`Invoice ${invoice.kode_file} ${invoice.rencana_tahap || ''}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (err) {
        console.error('Gagal download invoice pembayaran:', err);
        res.status(500).send(err.message || 'Gagal membuat file invoice.');
    }
});

app.get('/api/invoice-pembayaran/:id/print', async (req, res) => {
    try {
        const invoice = await InvoicePembayaran.findById(req.params.id).lean();
        if (!invoice) return res.status(404).send('Invoice tidak ditemukan.');
        const program = await Program.findOne({ id_program: invoice.id_program }).lean();
        if (!program) return res.status(404).send('Data kontrak untuk invoice tidak ditemukan.');
        const mitra = await cariMitraUntukInvoice(program);
        res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
        res.type('html').send(renderHtmlPrintInvoice(invoice, program, mitra || {}));
    } catch (err) {
        console.error('Gagal membuka print invoice pembayaran:', err);
        res.status(500).send(err.message || 'Gagal membuka halaman print invoice.');
    }
});

app.get('/api/rencana-pendapatan', async (req, res) => {
    try {
        res.json(await bangunRencanaPendapatanBelumDirealisasikan());
    } catch (err) {
        console.error('Gagal membaca rencana penerimaan:', err);
        res.status(500).json({ pesan: 'Gagal membaca data rencana penerimaan.' });
    }
});

app.get('/api/rencana-pendapatan-termin', async (req, res) => {
    try {
        res.json(await bangunRencanaPendapatanTermin());
    } catch (err) {
        console.error('Gagal membaca rencana penerimaan versi termin:', err);
        res.status(500).json({ pesan: 'Gagal membaca data rencana penerimaan versi termin.' });
    }
});

app.get('/api/daftar-realisasi-pembayaran', async (req, res) => {
    try {
        const filter = req.query.kodeFile ? { kode_file: req.query.kodeFile } : {};
        const [list, programs, rencanaPembayaran] = await Promise.all([
            safeMongoRead('RealisasiPembayaran.find(daftar)', () => RealisasiPembayaran.find(filter).sort({ tanggal: -1 }).lean(), []),
            Program.find({}).lean(),
            bangunJadwalPembiayaan()
        ]);
        const programMap = new Map(programs.map(p => [p.id_program, p]));
        const rencanaIndex = buatIndexRencanaPembayaran(rencanaPembayaran.jadwal || []);
        const data = list.map((row, i) => {
            const program = programMap.get(row.id_program) || {};
            const rencana = cariRencanaPembayaranUntukRealisasi(row, rencanaIndex);
            const tanggalRencanaInput = rencana?.tanggal_input || '';
            const tanggalRencanaDisplay = tanggalRencanaInput ? formatTanggalDisplay(tanggalRencanaInput) : 'N/A';
            const nominalBruto = nominalBrutoPenerimaan(row);
            const potonganPersen = persenDpiPenerimaan(row);
            const nominalDpi = nominalDpiPenerimaan(row);
            const nominalRealisasi = nominalRealisasiPenerimaan(row);
            return {
                no: i + 1,
                id_pembayaran: String(row._id),
                id_program: row.id_program,
                kode_file: row.kode_file || program.kode_file || '',
                nama_mitra: program.nama_mitra || '',
                judul_pks: program.judul_pks || '',
                tanggal: tanggalRencanaDisplay,
                tanggal_input: formatTanggalInput(row.tanggal),
                tanggal_realisasi: formatTanggalDisplay(row.tanggal),
                tanggal_realisasi_input: formatTanggalInput(row.tanggal),
                tanggal_rencana: tanggalRencanaDisplay,
                tanggal_rencana_input: tanggalRencanaInput,
                nominal_bruto: nominalBruto,
                nominal_bruto_display: `Rp ${formatRupiahAngka(nominalBruto)}`,
                potongan_persen: potonganPersen,
                potongan_persen_display: `${potonganPersen.toLocaleString('id-ID')}%`,
                nominal_dpi: nominalDpi,
                nominal_dpi_display: `Rp ${formatRupiahAngka(nominalDpi)}`,
                nominal: nominalRealisasi,
                nominal_display: `Rp ${formatRupiahAngka(nominalRealisasi)}`,
                keterangan: keteranganRealisasiPembayaranTampil(row.keterangan),
                rencana_key: row.rencana_key || '',
                rencana_tahap: row.rencana_tahap || '',
                rencana_tanggal: row.rencana_tanggal || '',
                rencana_nominal: Number(row.rencana_nominal) || 0,
                rencana_nominal_display: row.rencana_nominal ? `Rp ${formatRupiahAngka(row.rencana_nominal)}` : ''
            };
        });
        const total = data.reduce((sum, row) => sum + (Number(row.nominal) || 0), 0);
        res.json({
            data,
            summary: {
                total,
                total_display: `Rp ${formatRupiahAngka(total)}`,
                jumlah_item: list.length,
                jumlah_item_display: list.length.toLocaleString('id-ID')
            }
        });
    } catch (err) {
        console.error('Gagal membaca realisasi pembayaran:', err);
        res.status(500).json({ pesan: 'Gagal membaca data realisasi pembayaran.' });
    }
});

app.post('/api/tambah-realisasi-pembayaran', async (req, res) => {
    try {
        const { kode_file, tanggal, nominal, nominal_bruto, potongan_persen, keterangan, rencana_key, rencana_tahap, rencana_tanggal, rencana_nominal } = req.body;
        const lookup = await cariProgramDariKodeFile(kode_file);
        if (lookup.error) return res.status(400).json({ pesan: lookup.error });
        const tanggalPembayaran = parseTanggalDashboard(tanggal);
        const nominalAngka = Number(nominal);
        const nominalBrutoAngka = Number(nominal_bruto);
        const nominalBrutoFinal = Number.isFinite(nominalBrutoAngka) && nominalBrutoAngka > 0 ? nominalBrutoAngka : nominalAngka;
        const potonganPersenAngka = Number(potongan_persen);
        const potonganPersenFinal = potongan_persen !== undefined && potongan_persen !== null && potongan_persen !== '' && Number.isFinite(potonganPersenAngka)
            ? Math.min(100, Math.max(0, potonganPersenAngka))
            : 20;
        if (!tanggal || !tanggalPembayaran)
            return res.status(400).json({ pesan: 'Tanggal uang diterima SBM wajib diisi dan harus valid.' });
        if (!Number.isFinite(nominalAngka) || nominalAngka <= 0)
            return res.status(400).json({ pesan: 'Nominal pembayaran harus lebih dari 0.' });
        if (nominalBrutoFinal < nominalAngka)
            return res.status(400).json({ pesan: 'Nominal bruto tidak boleh lebih kecil dari Realisasi Penerimaan.' });
        const rencanaKey = rencana_key?.trim() || '';
        if (rencanaKey) {
            const sudahDirealisasikan = await RealisasiPembayaran.exists({ rencana_key: rencanaKey });
            if (sudahDirealisasikan)
                return res.status(409).json({ pesan: 'Rencana penerimaan ini sudah direalisasikan.' });
        }

        await RealisasiPembayaran.create({
            id_program: lookup.program.id_program,
            kode_file: lookup.kodeFile,
            tanggal: formatTanggalISO(tanggalPembayaran),
            nominal_bruto: nominalBrutoFinal,
            potongan_persen: potonganPersenFinal,
            nominal: nominalAngka,
            keterangan: keterangan?.trim() || '',
            rencana_key: rencanaKey,
            rencana_tahap: rencana_tahap?.trim() || '',
            rencana_tanggal: rencana_tanggal?.trim() || '',
            rencana_nominal: Number(rencana_nominal) || nominalBrutoFinal
        });
        res.json({ pesan: 'Realisasi pembayaran berhasil ditambahkan.' });
    } catch (err) {
        console.error('Gagal menambah realisasi pembayaran:', err);
        res.status(500).json({ pesan: 'Gagal menyimpan realisasi pembayaran.' });
    }
});

app.put('/api/realisasi-pembayaran/:id', async (req, res) => {
    try {
        const { kode_file, tanggal, nominal, nominal_bruto, potongan_persen, keterangan } = req.body;
        const existing = await RealisasiPembayaran.findById(req.params.id);
        if (!existing) return res.status(404).json({ pesan: 'Realisasi pembayaran tidak ditemukan.' });

        const lookup = await cariProgramDariKodeFile(kode_file);
        if (lookup.error) return res.status(400).json({ pesan: lookup.error });

        const tanggalPembayaran = parseTanggalDashboard(tanggal);
        const nominalAngka = Number(nominal);
        const nominalBrutoAngka = Number(nominal_bruto);
        const nominalBrutoFinal = Number.isFinite(nominalBrutoAngka) && nominalBrutoAngka > 0 ? nominalBrutoAngka : nominalAngka;
        const potonganPersenAngka = Number(potongan_persen);
        const potonganPersenFinal = potongan_persen !== undefined && potongan_persen !== null && potongan_persen !== '' && Number.isFinite(potonganPersenAngka)
            ? Math.min(100, Math.max(0, potonganPersenAngka))
            : 20;
        if (!tanggal || !tanggalPembayaran)
            return res.status(400).json({ pesan: 'Tanggal realisasi pembayaran wajib diisi dan harus valid.' });
        if (!Number.isFinite(nominalAngka) || nominalAngka <= 0)
            return res.status(400).json({ pesan: 'Nominal pembayaran harus lebih dari 0.' });
        if (nominalBrutoFinal < nominalAngka)
            return res.status(400).json({ pesan: 'Nominal bruto tidak boleh lebih kecil dari Realisasi Penerimaan.' });

        const hitungPosisiProgram = async (idProgram, nominalPembayaranBaru = 0) => {
            const [pembayaranRows, anggaranRows] = await Promise.all([
                safeMongoRead('RealisasiPembayaran.find(posisi-program)', () => RealisasiPembayaran.find({ id_program: idProgram }).lean(), []),
                safeMongoRead('RealisasiAnggaran.find(posisi-program)', () => RealisasiAnggaran.find({ id_program: idProgram }).lean(), [])
            ]);
            const totalPembayaran = pembayaranRows
                .filter(row => String(row._id) !== String(existing._id))
                .reduce((sum, row) => sum + nominalRealisasiPenerimaan(row), 0) + nominalPembayaranBaru;
            const totalAnggaran = anggaranRows.reduce((sum, row) => sum + (Number(row.nominal) || 0), 0);
            return { totalPembayaran, totalAnggaran };
        };

        const targetPosisi = await hitungPosisiProgram(lookup.program.id_program, nominalAngka);
        if (targetPosisi.totalAnggaran > targetPosisi.totalPembayaran) {
            return res.status(400).json({
                pesan: `Realisasi penerimaan tidak dapat diperbarui karena Realisasi Anggaran pada Kode File ini sudah Rp ${formatRupiahAngka(targetPosisi.totalAnggaran)}, sedangkan penerimaan setelah update menjadi Rp ${formatRupiahAngka(targetPosisi.totalPembayaran)}.`
            });
        }
        if (existing.id_program !== lookup.program.id_program) {
            const sumberPosisi = await hitungPosisiProgram(existing.id_program, 0);
            if (sumberPosisi.totalAnggaran > sumberPosisi.totalPembayaran) {
                return res.status(400).json({
                    pesan: `Kode File tidak dapat diubah karena kontrak asal masih memiliki Realisasi Anggaran Rp ${formatRupiahAngka(sumberPosisi.totalAnggaran)}, sedangkan penerimaan tersisa menjadi Rp ${formatRupiahAngka(sumberPosisi.totalPembayaran)}.`
                });
            }
        }

        const programBerubah = existing.id_program !== lookup.program.id_program;
        existing.id_program = lookup.program.id_program;
        existing.kode_file = lookup.kodeFile;
        existing.tanggal = formatTanggalISO(tanggalPembayaran);
        existing.nominal_bruto = nominalBrutoFinal;
        existing.potongan_persen = potonganPersenFinal;
        existing.nominal = nominalAngka;
        existing.keterangan = keterangan?.trim() || '';
        if (programBerubah) {
            existing.rencana_key = '';
            existing.rencana_tahap = '';
            existing.rencana_tanggal = '';
            existing.rencana_nominal = 0;
        }
        await existing.save();
        res.json({ pesan: 'Realisasi penerimaan berhasil diperbarui.' });
    } catch (err) {
        console.error('Gagal update realisasi pembayaran:', err);
        res.status(500).json({ pesan: 'Gagal memperbarui realisasi penerimaan.' });
    }
});

app.delete('/api/realisasi-pembayaran/:id', async (req, res) => {
    try {
        const result = await RealisasiPembayaran.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ pesan: 'Realisasi pembayaran tidak ditemukan.' });
        res.json({ pesan: 'Realisasi pembayaran berhasil dihapus.' });
    } catch (err) {
        console.error('Gagal hapus realisasi pembayaran:', err);
        res.status(500).json({ pesan: 'Gagal menghapus realisasi pembayaran.' });
    }
});

// ─── API: PAGU ───────────────────────────────────────────────────────────────

function angkaPaguAnggaran(value) {
    const angka = Number(value);
    if (!Number.isFinite(angka)) return 0;
    return Math.max(0, Math.round(angka));
}

function punyaNilaiPaguAnggaran(value) {
    if (value === null || value === undefined || value === '') return false;
    return Number.isFinite(Number(value));
}

function totalPaguAnggaran(row = {}) {
    return angkaPaguAnggaran(row.pagu_pegawai)
        + angkaPaguAnggaran(row.pagu_barang)
        + angkaPaguAnggaran(row.pagu_jasa)
        + angkaPaguAnggaran(row.pagu_modal);
}

function dataPaguKosong(idProgram, kodeFile) {
    return {
        id_program: idProgram,
        kode_file: kodeFile,
        pagu_pegawai: 0,
        pagu_barang: 0,
        pagu_jasa: 0,
        pagu_modal: 0,
        sisa_pagu_total: null
    };
}

function fieldTerkunciPagu(field = '') {
    return ({
        pagu_pegawai: 'rka_terkunci_pegawai',
        pagu_barang: 'rka_terkunci_barang',
        pagu_jasa: 'rka_terkunci_jasa',
        pagu_modal: 'rka_terkunci_modal'
    })[field] || '';
}

function dataRkaTerkunciKosong() {
    return {
        rka_terkunci_pegawai: 0,
        rka_terkunci_barang: 0,
        rka_terkunci_jasa: 0,
        rka_terkunci_modal: 0
    };
}

function totalRkaTerkunci(row = {}) {
    return angkaPaguAnggaran(row.rka_terkunci_pegawai)
        + angkaPaguAnggaran(row.rka_terkunci_barang)
        + angkaPaguAnggaran(row.rka_terkunci_jasa)
        + angkaPaguAnggaran(row.rka_terkunci_modal);
}

function paguEfektifDariRkaTerkunci(row = {}, rkaTerkunci = {}) {
    return {
        ...row,
        pagu_pegawai: Math.max(angkaPaguAnggaran(row.pagu_pegawai), angkaPaguAnggaran(rkaTerkunci.rka_terkunci_pegawai)),
        pagu_barang: Math.max(angkaPaguAnggaran(row.pagu_barang), angkaPaguAnggaran(rkaTerkunci.rka_terkunci_barang)),
        pagu_jasa: Math.max(angkaPaguAnggaran(row.pagu_jasa), angkaPaguAnggaran(rkaTerkunci.rka_terkunci_jasa)),
        pagu_modal: Math.max(angkaPaguAnggaran(row.pagu_modal), angkaPaguAnggaran(rkaTerkunci.rka_terkunci_modal))
    };
}

function tambahRkaTerkunci(data, row = {}) {
    const fieldPagu = FIELD_PAGU_BY_KATEGORI[row.kategori_belanja];
    const fieldTerkunci = fieldTerkunciPagu(fieldPagu);
    if (!fieldTerkunci) return data;
    data[fieldTerkunci] += angkaPaguAnggaran(totalNominalRab(row));
    return data;
}

async function rkaTerkunciUntukPagu(idProgram, kodeFile, excludeRabId = '') {
    const id = String(idProgram || '').trim();
    const kode = String(kodeFile || '').trim();
    const exclude = String(excludeRabId || '').trim();
    const data = dataRkaTerkunciKosong();
    if (!id || !kode) return data;
    const rows = await RabAnggaran.find({ id_program: id, kode_file: kode }).lean();
    rows
        .filter(row => !exclude || String(row._id || '') !== exclude)
        .forEach(row => tambahRkaTerkunci(data, row));
    return data;
}

function pesanPaguDiBawahRka(row = {}, rkaTerkunci = {}, kodeFile = '') {
    for (const field of Object.keys(LABEL_PAGU_BY_FIELD)) {
        const fieldTerkunci = fieldTerkunciPagu(field);
        const pagu = angkaPaguAnggaran(row[field]);
        const terkunci = angkaPaguAnggaran(rkaTerkunci[fieldTerkunci]);
        if (pagu + 1 < terkunci) {
            return `${LABEL_PAGU_BY_FIELD[field]} untuk Kode File ${kodeFile} tidak boleh lebih kecil dari RKA Kerma yang sudah mengunci PAGU. Minimal: Rp ${formatRupiahAngka(terkunci)},-.`;
        }
    }
    return '';
}

function bentukPaguAnggaran(row, program = {}, realisasiPenerimaan = 0, rkaTerkunci = {}) {
    const rowEfektif = paguEfektifDariRkaTerkunci(row, rkaTerkunci);
    const statusAlokasi = statusAlokasiKerma(rowEfektif.kode_file || program.kode_file);
    const tutupKeuangan = statusAlokasi !== 'Aktif';
    const paguPegawai = angkaPaguAnggaran(rowEfektif.pagu_pegawai);
    const paguBarang = angkaPaguAnggaran(rowEfektif.pagu_barang);
    const paguJasa = angkaPaguAnggaran(rowEfektif.pagu_jasa);
    const paguModal = angkaPaguAnggaran(rowEfektif.pagu_modal);
    const totalPagu = paguPegawai + paguBarang + paguJasa + paguModal;
    const terkunciPegawai = angkaPaguAnggaran(rkaTerkunci.rka_terkunci_pegawai);
    const terkunciBarang = angkaPaguAnggaran(rkaTerkunci.rka_terkunci_barang);
    const terkunciJasa = angkaPaguAnggaran(rkaTerkunci.rka_terkunci_jasa);
    const terkunciModal = angkaPaguAnggaran(rkaTerkunci.rka_terkunci_modal);
    const totalTerkunci = terkunciPegawai + terkunciBarang + terkunciJasa + terkunciModal;
    const sisaPaguPegawai = tutupKeuangan ? 0 : paguPegawai - terkunciPegawai;
    const sisaPaguBarang = tutupKeuangan ? 0 : paguBarang - terkunciBarang;
    const sisaPaguJasa = tutupKeuangan ? 0 : paguJasa - terkunciJasa;
    const sisaPaguModal = tutupKeuangan ? 0 : paguModal - terkunciModal;
    const sisaPaguHitung = tutupKeuangan ? 0 : totalPagu - totalTerkunci;
    const pakaiSisaPaguTotalManual = !tutupKeuangan && punyaNilaiPaguAnggaran(rowEfektif.sisa_pagu_total);
    const sisaPaguTotal = pakaiSisaPaguTotalManual
        ? angkaPaguAnggaran(rowEfektif.sisa_pagu_total)
        : sisaPaguHitung;
    return {
        id_pagu: String(row._id || ''),
        id_program: row.id_program || program.id_program || '',
        kode_file: row.kode_file || program.kode_file || '',
        nama_mitra: program.nama_mitra || '',
        judul_pks: program.judul_pks || '',
        status_alokasi: statusAlokasi,
        realisasi_penerimaan: angkaPaguAnggaran(realisasiPenerimaan),
        realisasi_penerimaan_display: `Rp ${formatRupiahAngka(realisasiPenerimaan)},-`,
        pagu_pegawai: paguPegawai,
        pagu_pegawai_display: `Rp ${formatRupiahAngka(paguPegawai)},-`,
        pagu_barang: paguBarang,
        pagu_barang_display: `Rp ${formatRupiahAngka(paguBarang)},-`,
        pagu_jasa: paguJasa,
        pagu_jasa_display: `Rp ${formatRupiahAngka(paguJasa)},-`,
        pagu_modal: paguModal,
        pagu_modal_display: `Rp ${formatRupiahAngka(paguModal)},-`,
        total_pagu: totalPagu,
        total_pagu_display: `Rp ${formatRupiahAngka(totalPagu)},-`,
        rka_terkunci_pegawai: terkunciPegawai,
        rka_terkunci_barang: terkunciBarang,
        rka_terkunci_jasa: terkunciJasa,
        rka_terkunci_modal: terkunciModal,
        total_rka_terkunci: totalTerkunci,
        sisa_pagu_pegawai: sisaPaguPegawai,
        sisa_pagu_barang: sisaPaguBarang,
        sisa_pagu_jasa: sisaPaguJasa,
        sisa_pagu_modal: sisaPaguModal,
        sisa_pagu_total: pakaiSisaPaguTotalManual ? sisaPaguTotal : null,
        sisa_pagu_total_manual: pakaiSisaPaguTotalManual,
        sisa_pagu: sisaPaguTotal,
        sisa_pagu_display: `Rp ${formatRupiahAngka(sisaPaguTotal)},-`
    };
}

async function totalRealisasiPenerimaanProgram(idProgram) {
    const id = String(idProgram || '').trim();
    if (!id) return 0;
    const pembayaranRows = await safeMongoRead('RealisasiPembayaran.find(total-program)', () => RealisasiPembayaran.find({ id_program: id }).lean(), []);
    return pembayaranRows.reduce((sum, row) => sum + nominalRealisasiPenerimaan(row), 0);
}

async function validasiPayloadPagu(body = {}) {
    const lookup = await cariProgramDariKodeFile(body.kode_file);
    if (lookup.error) return { error: lookup.error };

    const paguPegawai = angkaPaguAnggaran(body.pagu_pegawai);
    const paguBarang = angkaPaguAnggaran(body.pagu_barang);
    const paguJasa = angkaPaguAnggaran(body.pagu_jasa);
    const paguModal = angkaPaguAnggaran(body.pagu_modal);
    const totalPagu = paguPegawai + paguBarang + paguJasa + paguModal;
    const totalPenerimaan = await totalRealisasiPenerimaanProgram(lookup.program.id_program);
    const rkaTerkunci = await rkaTerkunciUntukPagu(lookup.program.id_program, lookup.kodeFile);

    if (totalPagu > totalPenerimaan + 1) {
        return {
            error: `Total PAGU melebihi Realisasi Penerimaan yang tersedia. Realisasi Penerimaan tersedia: Rp ${formatRupiahAngka(totalPenerimaan)},-.`
        };
    }
    const pesanTerkunci = pesanPaguDiBawahRka({
        pagu_pegawai: paguPegawai,
        pagu_barang: paguBarang,
        pagu_jasa: paguJasa,
        pagu_modal: paguModal
    }, rkaTerkunci, lookup.kodeFile);
    if (pesanTerkunci) return { error: pesanTerkunci };

    return {
        data: {
            id_program: lookup.program.id_program,
            kode_file: lookup.kodeFile,
            pagu_pegawai: paguPegawai,
            pagu_barang: paguBarang,
            pagu_jasa: paguJasa,
            pagu_modal: paguModal
        },
        program: lookup.program,
        totalPenerimaan,
        rkaTerkunci
    };
}

app.get('/api/pagu-anggaran', async (req, res) => {
    try {
        const [list, programs, pembayaranRows, rkaRows] = await Promise.all([
            PaguAnggaran.find({}).sort({ kode_file: 1 }).lean(),
            Program.find({}).lean(),
            RealisasiPembayaran.find({}).lean(),
            RabAnggaran.find({}).lean()
        ]);
        const programById = new Map(programs.map(program => [program.id_program, program]));
        const programByKode = new Map(programs
            .filter(program => String(program.kode_file || '').trim())
            .map(program => [String(program.kode_file || '').trim(), program]));
        const rkaTerkunciByKode = new Map();
        rkaRows.forEach(row => {
            const kodeFile = String(row.kode_file || '').trim();
            if (!kodeFile) return;
            if (!rkaTerkunciByKode.has(kodeFile)) rkaTerkunciByKode.set(kodeFile, dataRkaTerkunciKosong());
            tambahRkaTerkunci(rkaTerkunciByKode.get(kodeFile), row);
        });
        const penerimaanByProgram = new Map();
        pembayaranRows.forEach(row => {
            const id = String(row.id_program || '').trim();
            if (!id) return;
            penerimaanByProgram.set(id, (penerimaanByProgram.get(id) || 0) + nominalRealisasiPenerimaan(row));
        });
        const savedByKode = new Map(list
            .map(row => [String(row.kode_file || '').trim(), row])
            .filter(([kodeFile]) => Boolean(kodeFile)));
        const kodeFiles = new Set([...savedByKode.keys(), ...rkaTerkunciByKode.keys()]);
        const data = [...kodeFiles].sort().map(kodeFile => {
            const saved = savedByKode.get(kodeFile) || dataPaguKosong('', kodeFile);
            const program = programById.get(saved.id_program)
                || programByKode.get(kodeFile)
                || {};
            const idProgram = saved.id_program || program.id_program || '';
            return bentukPaguAnggaran({
                ...saved,
                _id: saved._id,
                id_program: idProgram,
                kode_file: kodeFile
            }, program, penerimaanByProgram.get(idProgram) || 0, rkaTerkunciByKode.get(kodeFile));
        });
        const totalPagu = data.reduce((sum, row) => sum + (Number(row.total_pagu) || 0), 0);
        res.json({
            data,
            summary: {
                total_pagu: totalPagu,
                total_pagu_display: `Rp ${formatRupiahAngka(totalPagu)},-`,
                jumlah_item: data.length,
                jumlah_item_display: data.length.toLocaleString('id-ID')
            }
        });
    } catch (err) {
        console.error('Gagal membaca PAGU:', err);
        res.status(500).json({ pesan: 'Gagal membaca data PAGU.' });
    }
});

app.post('/api/pagu-anggaran', async (req, res) => {
    try {
        const hasil = await validasiPayloadPagu(req.body);
        if (hasil.error) return res.status(400).json({ pesan: hasil.error });
        const updated = await PaguAnggaran.findOneAndUpdate(
            { kode_file: hasil.data.kode_file },
            { $set: hasil.data },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json({
            pesan: 'PAGU berhasil disimpan.',
            data: bentukPaguAnggaran(updated, hasil.program, hasil.totalPenerimaan, hasil.rkaTerkunci)
        });
    } catch (err) {
        console.error('Gagal menyimpan PAGU:', err);
        res.status(500).json({ pesan: 'Gagal menyimpan PAGU.' });
    }
});

// ─── API: RKA Kerma ──────────────────────────────────────────────────────────

function normalisasiUraianRab(value = '') {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.replace(/^(?:PAGU|RI)(?=$|\s|[-:–—])\s*[-:–—]?\s*/i, '');
}

function normalisasiKeyRab(value = '') {
    return normalisasiUraianRab(value).toLowerCase();
}

function totalNominalRab(row = {}) {
    const hargaSatuan = Number(row.harga_satuan) || 0;
    const volume = Number(row.volume) || 0;
    const total = hargaSatuan * volume;
    return Number.isFinite(total) ? Math.max(0, total) : 0;
}

async function paguAnggaranUntukRab(idProgram, kodeFile) {
    const or = [];
    const id = String(idProgram || '').trim();
    const kode = String(kodeFile || '').trim();
    if (id) or.push({ id_program: id });
    if (kode) or.push({ kode_file: kode });
    if (!or.length) return null;
    return PaguAnggaran.findOne({ $or: or }).lean();
}

async function validasiKunciPaguRab(data = {}, excludeRabId = '') {
    const fieldPagu = FIELD_PAGU_BY_KATEGORI[data.kategori_belanja];
    const fieldTerkunci = fieldTerkunciPagu(fieldPagu);
    if (!fieldPagu || !fieldTerkunci) return { error: 'Kategori Belanja tidak valid.' };

    const [pagu, rkaTerkunciSaatIni, rkaTerkunciTanpaCurrent] = await Promise.all([
        paguAnggaranUntukRab(data.id_program, data.kode_file),
        rkaTerkunciUntukPagu(data.id_program, data.kode_file),
        rkaTerkunciUntukPagu(data.id_program, data.kode_file, excludeRabId)
    ]);
    const nominalPaguKategori = Math.max(
        angkaPaguAnggaran(pagu?.[fieldPagu]),
        angkaPaguAnggaran(rkaTerkunciSaatIni[fieldTerkunci])
    );
    const totalSetelahSimpan = angkaPaguAnggaran(rkaTerkunciTanpaCurrent[fieldTerkunci]) + angkaPaguAnggaran(totalNominalRab(data));

    if (totalSetelahSimpan > nominalPaguKategori + 1) {
        const label = LABEL_PAGU_BY_FIELD[fieldPagu] || 'PAGU';
        return {
            error: `RKA Kerma kategori ${data.kategori_belanja} melebihi ${label} yang tersedia untuk Kode File ${data.kode_file}. ${label}: Rp ${formatRupiahAngka(nominalPaguKategori)},-. RKA Kerma terkunci setelah simpan: Rp ${formatRupiahAngka(totalSetelahSimpan)},-. Tambah atau pindahkan PAGU Anggaran kategori ini terlebih dahulu.`
        };
    }

    return { ok: true };
}

function rencanaRiCocokDenganRab(row = {}, rab = {}) {
    const totalRab = totalNominalRab(rab);
    const totalRi = Number(row.ri) || 0;
    return String(row.kode_file || '').trim() === String(rab.kode_file || '').trim()
        && String(row.id_program || '').trim() === String(rab.id_program || '').trim()
        && String(row.kategori_belanja || '').trim() === String(rab.kategori_belanja || '').trim()
        && normalisasiKeyRab(row.uraian) === normalisasiKeyRab(rab.uraian)
        && Math.abs(totalRi - totalRab) < 1;
}

async function cariRencanaRiDariRab(rab = {}) {
    const idRab = String(rab._id || rab.id_rab || '').trim();
    const pencarian = [];
    if (idRab) {
        pencarian.push(RencanaAnggaran.find({ sumber: 'rab', id_rab: idRab }).lean());
    }
    pencarian.push(RencanaAnggaran.find({
        sumber: 'rab',
        id_program: rab.id_program,
        kode_file: rab.kode_file,
        kategori_belanja: rab.kategori_belanja
    }).lean());

    const rows = (await Promise.all(pencarian)).flat();
    const unik = new Map();
    rows.forEach(row => {
        const cocokById = idRab && String(row.id_rab || '').trim() === idRab;
        if (!cocokById && !rencanaRiCocokDenganRab(row, rab)) return;
        unik.set(String(row._id), row);
    });
    return [...unik.values()];
}

async function cariRealisasiRiDariRab(rab = {}) {
    const rows = await RencanaAnggaran.find({
        id_program: rab.id_program,
        kode_file: rab.kode_file,
        kategori_belanja: rab.kategori_belanja,
        pengeluaran_ri: { $gt: 0 }
    }).lean();
    const keyUraian = normalisasiKeyRab(rab.uraian);
    return rows.filter(row => normalisasiKeyRab(row.uraian) === keyUraian);
}

function bentukRabAnggaran(row, program = {}) {
    const hargaSatuan = Number(row.harga_satuan) || 0;
    const volume = Number(row.volume) || 0;
    const total = hargaSatuan * volume;
    return {
        id_rab: String(row._id),
        id_program: row.id_program || program.id_program || '',
        kode_file: row.kode_file || program.kode_file || '',
        nama_mitra: program.nama_mitra || '',
        judul_pks: program.judul_pks || '',
        uraian: normalisasiUraianRab(row.uraian),
        kategori_belanja: row.kategori_belanja || '',
        satuan: row.satuan || '',
        harga_satuan: hargaSatuan,
        harga_satuan_display: `Rp ${formatRupiahAngka(hargaSatuan)}`,
        volume,
        volume_display: volume.toLocaleString('id-ID'),
        total,
        total_display: `Rp ${formatRupiahAngka(total)}`,
        keterangan: row.keterangan || ''
    };
}

app.get('/api/rab-anggaran', async (req, res) => {
    try {
        const [list, programs] = await Promise.all([
            RabAnggaran.find({}).sort({ kode_file: 1, createdAt: 1 }).lean(),
            Program.find({}).lean()
        ]);
        const programById = new Map(programs.map(program => [program.id_program, program]));
        const programByKode = new Map(programs
            .filter(program => String(program.kode_file || '').trim())
            .map(program => [String(program.kode_file || '').trim(), program]));
        const data = list.map(row => {
            const program = programById.get(row.id_program) || programByKode.get(String(row.kode_file || '').trim()) || {};
            return bentukRabAnggaran(row, program);
        });
        const total = data.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
        res.json({
            data,
            summary: {
                total,
                total_display: `Rp ${formatRupiahAngka(total)}`,
                jumlah_item: data.length,
                jumlah_item_display: data.length.toLocaleString('id-ID')
            }
        });
    } catch (err) {
        console.error('Gagal membaca RKA Kerma:', err);
        res.status(500).json({ pesan: 'Gagal membaca data RKA Kerma.' });
    }
});

async function validasiPayloadRab(body = {}, options = {}) {
    const lookup = await cariProgramDariKodeFile(body.kode_file);
    if (lookup.error) return { error: lookup.error };
    const uraian = normalisasiUraianRab(body.uraian);
    const kategoriBelanja = String(body.kategori_belanja || '').trim();
    const satuan = String(body.satuan || '').trim();
    const hargaSatuan = Number(body.harga_satuan);
    const volume = Number(body.volume);

    if (!uraian) return { error: 'Uraian wajib diisi.' };
    if (!kategoriBelanja) return { error: 'Kategori Belanja wajib diisi.' };
    if (!KATEGORI_REALISASI_ANGGARAN.includes(kategoriBelanja)) return { error: 'Kategori Belanja tidak valid.' };
    if (!Number.isFinite(hargaSatuan) || hargaSatuan < 0) return { error: 'Harga Satuan harus berupa angka dan tidak boleh negatif.' };
    if (!Number.isFinite(volume) || volume < 0) return { error: 'Volume harus berupa angka dan tidak boleh negatif.' };

    const data = {
        id_program: lookup.program.id_program,
        kode_file: lookup.kodeFile,
        uraian,
        kategori_belanja: kategoriBelanja,
        satuan,
        harga_satuan: hargaSatuan,
        volume,
        keterangan: ''
    };
    const validasiPagu = await validasiKunciPaguRab(data, options.excludeRabId);
    if (validasiPagu.error) return { error: validasiPagu.error };

    return { data };
}

app.post('/api/rab-anggaran', async (req, res) => {
    try {
        const hasil = await validasiPayloadRab(req.body);
        if (hasil.error) return res.status(400).json({ pesan: hasil.error });
        await RabAnggaran.create(hasil.data);
        res.json({ pesan: 'RKA Kerma berhasil ditambahkan.' });
    } catch (err) {
        console.error('Gagal menambah RKA Kerma:', err);
        res.status(500).json({ pesan: 'Gagal menyimpan RKA Kerma.' });
    }
});

app.put('/api/rab-anggaran/:id', async (req, res) => {
    try {
        const current = await RabAnggaran.findById(req.params.id).lean();
        if (!current) return res.status(404).json({ pesan: 'Data RKA Kerma tidak ditemukan.' });
        const riTerkait = await cariRencanaRiDariRab(current);
        if (riTerkait.length) {
            return res.status(400).json({
                pesan: 'RKA Kerma sudah dibuat menjadi RI sehingga tidak dapat diedit. Hapus RKA Kerma untuk membatalkan RI yang belum direalisasikan, lalu buat ulang bila diperlukan.'
            });
        }
        const hasil = await validasiPayloadRab(req.body, { excludeRabId: req.params.id });
        if (hasil.error) return res.status(400).json({ pesan: hasil.error });
        const updated = await RabAnggaran.findByIdAndUpdate(req.params.id, hasil.data, { new: true });
        if (!updated) return res.status(404).json({ pesan: 'Data RKA Kerma tidak ditemukan.' });
        res.json({ pesan: 'RKA Kerma berhasil diperbarui.' });
    } catch (err) {
        console.error('Gagal update RKA Kerma:', err);
        res.status(500).json({ pesan: 'Gagal memperbarui RKA Kerma.' });
    }
});

app.delete('/api/rab-anggaran/:id', async (req, res) => {
    try {
        const rab = await RabAnggaran.findById(req.params.id).lean();
        if (!rab) return res.status(404).json({ pesan: 'Data RKA Kerma tidak ditemukan.' });

        const realisasiRiTerkait = await cariRealisasiRiDariRab(rab);
        if (realisasiRiTerkait.length) {
            return res.status(400).json({
                pesan: 'RKA Kerma tidak dapat dihapus karena RI dari RKA Kerma ini sudah direalisasikan. Batalkan Realisasi RI terlebih dahulu.'
            });
        }

        const riTerkait = await cariRencanaRiDariRab(rab);
        const riBelumRealisasiIds = riTerkait
            .filter(row => (Number(row.pengeluaran_ri) || 0) <= 0)
            .map(row => row._id);
        if (riBelumRealisasiIds.length) {
            await RencanaAnggaran.deleteMany({ _id: { $in: riBelumRealisasiIds } });
        }

        const deleted = await RabAnggaran.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ pesan: 'Data RKA Kerma tidak ditemukan.' });
        const tambahanPesan = riBelumRealisasiIds.length ? ` ${riBelumRealisasiIds.length} RI terkait ikut dibatalkan.` : '';
        res.json({ pesan: `RKA Kerma berhasil dihapus.${tambahanPesan}`, ri_dihapus: riBelumRealisasiIds.length });
    } catch (err) {
        console.error('Gagal hapus RKA Kerma:', err);
        res.status(500).json({ pesan: 'Gagal menghapus RKA Kerma.' });
    }
});

// ─── API: Rencana Anggaran ───────────────────────────────────────────────────

app.get('/api/rencana-anggaran', async (req, res) => {
    try {
        const [list, programs] = await Promise.all([
            RencanaAnggaran.find({}).sort({ tanggal_ri: 1, createdAt: 1 }).lean(),
            Program.find({}).lean()
        ]);
        const programById = new Map(programs.map(program => [program.id_program, program]));
        const programByKode = new Map(programs
            .filter(program => String(program.kode_file || '').trim())
            .map(program => [String(program.kode_file || '').trim(), program]));
        let saldo = 0;
        let totalPemasukan = 0;
        let totalPengeluaran = 0;
        const data = list.map(row => {
            const program = programById.get(row.id_program) || programByKode.get(String(row.kode_file || '').trim()) || {};
            const pemasukan = Number(row.pemasukan) || 0;
            const pengeluaran = Number(row.pengeluaran_ri) || 0;
            const ri = Number(row.ri) || 0;
            totalPemasukan += pemasukan;
            totalPengeluaran += pengeluaran;
            saldo += pemasukan - pengeluaran;
            return {
                id_rencana_anggaran: String(row._id),
                id_program: row.id_program || program.id_program || '',
                kode_file: row.kode_file || program.kode_file || '',
                judul_kerma: program.judul_pks || '',
                mitra: program.nama_mitra || '',
                nilai_kontrak: Number(program.nilai_kontrak) || 0,
                nilai_kontrak_display: `Rp ${formatRupiahAngka(program.nilai_kontrak)}`,
                tanggal_ri: formatTanggalDisplay(row.tanggal_ri),
                tanggal_ri_input: formatTanggalInput(row.tanggal_ri),
                tgl_invoice: formatTanggalDisplay(row.tgl_invoice || row.tanggal_ri),
                tgl_invoice_input: formatTanggalInput(row.tgl_invoice || row.tanggal_ri),
                tanggal_realisasi_ri: formatTanggalDisplay(row.tanggal_realisasi_ri || row.tgl_invoice || row.tanggal_ri),
                tanggal_realisasi_ri_input: formatTanggalInput(row.tanggal_realisasi_ri || row.tgl_invoice || row.tanggal_ri),
                no_invoice: row.no_invoice || '',
                uraian: row.uraian || '',
                kategori_belanja: row.kategori_belanja || '',
                sumber: row.sumber || '',
                id_rab: row.id_rab || '',
                ri,
                ri_display: ri ? `Rp ${formatRupiahAngka(ri)}` : '-',
                pemasukan,
                pemasukan_display: pemasukan ? `Rp ${formatRupiahAngka(pemasukan)}` : '-',
                pengeluaran_ri: pengeluaran,
                realisasi_ri: pengeluaran,
                pengeluaran_ri_display: pengeluaran ? `Rp ${formatRupiahAngka(pengeluaran)}` : '-',
                realisasi_ri_display: pengeluaran ? `Rp ${formatRupiahAngka(pengeluaran)}` : '-',
                saldo,
                saldo_display: `Rp ${formatRupiahAngka(saldo)}`
            };
        });

        res.json({
            data,
            summary: {
                total_pemasukan: totalPemasukan,
                total_pemasukan_display: `Rp ${formatRupiahAngka(totalPemasukan)}`,
                total_pengeluaran_ri: totalPengeluaran,
                total_pengeluaran_ri_display: `Rp ${formatRupiahAngka(totalPengeluaran)}`,
                saldo_akhir: saldo,
                saldo_akhir_display: `Rp ${formatRupiahAngka(saldo)}`,
                jumlah_item: data.length,
                jumlah_item_display: data.length.toLocaleString('id-ID')
            }
        });
    } catch (err) {
        console.error('Gagal membaca rencana anggaran:', err);
        res.status(500).json({ pesan: 'Gagal membaca data rencana anggaran.' });
    }
});

app.post('/api/rencana-anggaran', async (req, res) => {
    try {
        const { kode_file, tanggal_ri, tanggal_realisasi_ri, tgl_invoice, no_invoice, uraian, kategori_belanja, ri, pemasukan, pengeluaran_ri, realisasi_ri, sumber, id_rab } = req.body;
        const lookup = await cariProgramDariKodeFile(kode_file);
        if (lookup.error) return res.status(400).json({ pesan: lookup.error });
        const tanggal = parseTanggalDashboard(tanggal_ri || tgl_invoice || tanggal_realisasi_ri);
        const tanggalRealisasiRi = parseTanggalDashboard(tanggal_realisasi_ri || tgl_invoice || tanggal_ri);
        const tanggalInvoice = parseTanggalDashboard(tgl_invoice || tanggal_ri);
        const kategoriBelanja = String(kategori_belanja || '').trim();
        const riAngka = Number(ri) || 0;
        const pemasukanAngka = Number(pemasukan) || 0;
        const pengeluaranAngka = Number(realisasi_ri ?? pengeluaran_ri) || 0;
        const sumberInput = String(sumber || '').trim();

        if (!(tanggal_ri || tgl_invoice) || !tanggal)
            return res.status(400).json({ pesan: 'Tanggal Invoice/Pembukuan wajib diisi dan harus valid.' });
        if (!uraian?.trim())
            return res.status(400).json({ pesan: 'Uraian wajib diisi.' });
        if (kategoriBelanja && !KATEGORI_REALISASI_ANGGARAN.includes(kategoriBelanja))
            return res.status(400).json({ pesan: 'Kategori Belanja tidak valid.' });
        if (pengeluaranAngka > 0 && !kategoriBelanja)
            return res.status(400).json({ pesan: 'Kategori Belanja wajib diisi untuk Realisasi RI.' });
        if (riAngka < 0 || pemasukanAngka < 0 || pengeluaranAngka < 0)
            return res.status(400).json({ pesan: 'RI, Realisasi Penerimaan, dan Realisasi RI tidak boleh bernilai negatif.' });
        if (riAngka <= 0 && pemasukanAngka <= 0 && pengeluaranAngka <= 0)
            return res.status(400).json({ pesan: 'Isi minimal salah satu nominal: RI, Realisasi Penerimaan, atau Realisasi RI.' });
        if (riAngka > 0 && sumberInput !== 'rab') {
            return res.status(400).json({ pesan: 'RI hanya dapat dibuat melalui tombol Buat RI pada tabel RKA Kerma.' });
        }
        if (riAngka > 0 && pengeluaranAngka > 0) {
            return res.status(400).json({ pesan: 'RI dan Realisasi RI harus dicatat pada baris terpisah karena tanggal transaksinya berbeda.' });
        }

        if (riAngka > 0 || pengeluaranAngka > 0) {
            const saldo = await hitungSaldoRiProgram(lookup.program.id_program, riAngka > 0 ? tanggal : tanggalRealisasiRi);
            if (saldo.totalPenerimaan <= 0) {
                return res.status(400).json({ pesan: 'RI belum dapat dicatat karena belum ada realisasi penerimaan untuk Kode File ini.' });
            }
            if (riAngka > saldo.saldoProyektif) {
                return res.status(400).json({
                    pesan: `RI melebihi saldo penerimaan yang tersedia. Saldo tersedia: Rp ${formatRupiahAngka(saldo.saldoProyektif)}.`
                });
            }
            if (pengeluaranAngka > saldo.saldoDefinitif) {
                return res.status(400).json({
                    pesan: `Tidak bisa menyimpan Realisasi RI karena nominal melebihi saldo yang tersedia. Saldo tersedia: Rp ${formatRupiahAngka(saldo.saldoDefinitif)}.`
                });
            }
            if (pengeluaranAngka > saldo.riTersediaUntukRealisasi) {
                return res.status(400).json({
                    pesan: `Tidak bisa menyimpan Realisasi RI karena nominal melebihi PAGU yang sudah diregistrasikan. Sisa PAGU yang dapat direalisasikan: Rp ${formatRupiahAngka(saldo.riTersediaUntukRealisasi)}.`
                });
            }
        }

        const rencanaBaru = await RencanaAnggaran.create({
            id_program: lookup.program.id_program,
            kode_file: lookup.kodeFile,
            tanggal_ri: formatTanggalISO(tanggal),
            tanggal_realisasi_ri: pengeluaranAngka > 0 && tanggalRealisasiRi ? formatTanggalISO(tanggalRealisasiRi) : '',
            tgl_invoice: tanggalInvoice ? formatTanggalISO(tanggalInvoice) : '',
            no_invoice: String(no_invoice || '').trim(),
            uraian: uraian.trim(),
            kategori_belanja: kategoriBelanja,
            ri: riAngka,
            pemasukan: pemasukanAngka,
            pengeluaran_ri: pengeluaranAngka,
            sumber: sumberInput || 'manual',
            id_rab: sumberInput === 'rab' ? String(id_rab || '').trim() : ''
        });

        if (pengeluaranAngka > 0) {
            try {
                await sinkronkanRealisasiAnggaranDariRi(rencanaBaru, lookup.program);
            } catch (syncErr) {
                await RencanaAnggaran.findByIdAndDelete(rencanaBaru._id);
                throw syncErr;
            }
        }
        res.json({ pesan: 'Data RI berhasil ditambahkan.' });
    } catch (err) {
        console.error('Gagal menambah rencana anggaran:', err);
        res.status(500).json({ pesan: 'Gagal menyimpan rencana anggaran.' });
    }
});

// ─── API: Realisasi Anggaran ─────────────────────────────────────────────────

app.get('/api/daftar-realisasi-anggaran', async (req, res) => {
    try {
        const filter = req.query.kodeFile ? { kode_file: req.query.kodeFile } : {};
        const [list, programs, semuaRealisasi, semuaPembayaran] = await Promise.all([
            RealisasiAnggaran.find(filter).sort({ tanggal: -1, kategori: 1 }).lean(),
            Program.find({}).lean(),
            RealisasiAnggaran.find({}).lean(),
            RealisasiPembayaran.find({}).lean()
        ]);
        const programMap = new Map(programs.map(p => [p.id_program, p]));
        const totalRealisasiByProgram = new Map();
        semuaRealisasi.forEach(row => {
            totalRealisasiByProgram.set(row.id_program, (totalRealisasiByProgram.get(row.id_program) || 0) + (Number(row.nominal) || 0));
        });
        const totalPembayaranByProgram = new Map();
        semuaPembayaran.forEach(row => {
            totalPembayaranByProgram.set(row.id_program, (totalPembayaranByProgram.get(row.id_program) || 0) + nominalRealisasiPenerimaan(row));
        });

        const kategoriSummary = KATEGORI_REALISASI_ANGGARAN.map(kategori => {
            const total = list
                .filter(row => row.kategori === kategori)
                .reduce((sum, row) => sum + (Number(row.nominal) || 0), 0);
            return { kategori, total, total_display: `Rp ${formatRupiahAngka(total)}` };
        });
        const total = list.reduce((sum, row) => sum + (Number(row.nominal) || 0), 0);

        const groupedMap = new Map();
        list.forEach(row => {
            const program = programMap.get(row.id_program) || {};
            const key = row.id_program || row.kode_file || String(row._id);
            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    id_program: row.id_program,
                    kode_file: row.kode_file || program.kode_file || '',
                    nama_mitra: program.nama_mitra || '',
                    judul_pks: program.judul_pks || '',
                    nilai_kontrak: Number(program.nilai_kontrak) || 0,
                    kategori_totals: Object.fromEntries(KATEGORI_REALISASI_ANGGARAN.map(kategori => [kategori, 0])),
                    id_realisasi_list: [],
                    keterangan_set: new Set(),
                    tanggal_sort: 0,
                    jumlah_transaksi: 0
                });
            }
            const item = groupedMap.get(key);
            const nominal = Number(row.nominal) || 0;
            if (KATEGORI_REALISASI_ANGGARAN.includes(row.kategori)) {
                item.kategori_totals[row.kategori] += nominal;
            }
            item.id_realisasi_list.push(String(row._id));
            if (row.keterangan) item.keterangan_set.add(row.keterangan);
            const tanggal = parseTanggalDashboard(row.tanggal);
            if (tanggal) item.tanggal_sort = Math.max(item.tanggal_sort, tanggal.getTime());
            item.jumlah_transaksi += 1;
        });

        const data = [...groupedMap.values()].map((row, i) => {
            const program = programMap.get(row.id_program) || {};
            const nilaiKontrak = Number(program.nilai_kontrak) || 0;
            const totalProgram = totalRealisasiByProgram.get(row.id_program) || Object.values(row.kategori_totals).reduce((sum, value) => sum + value, 0);
            const totalPembayaran = totalPembayaranByProgram.get(row.id_program) || 0;
            const sisaProgram = nilaiKontrak - totalProgram;
            const saldoTersedia = totalPembayaran - totalProgram;
            const pegawai = row.kategori_totals['Belanja Pegawai'] || 0;
            const barang = row.kategori_totals['Belanja Barang'] || 0;
            const jasa = row.kategori_totals['Belanja Jasa'] || 0;
            const modal = row.kategori_totals['Belanja Modal'] || 0;
            return {
                no: i + 1,
                id_realisasi: row.id_realisasi_list[0] || '',
                id_realisasi_list: row.id_realisasi_list,
                id_program: row.id_program,
                kode_file: row.kode_file || program.kode_file || '',
                nama_mitra: row.nama_mitra || program.nama_mitra || '',
                judul_pks: row.judul_pks || program.judul_pks || '',
                kategori: 'Rekapitulasi',
                tanggal: row.tanggal_sort ? formatTanggalDisplay(new Date(row.tanggal_sort)) : 'Belum bertanggal',
                tanggal_input: row.tanggal_sort ? formatTanggalInput(new Date(row.tanggal_sort)) : '',
                nominal: totalProgram,
                nominal_display: `Rp ${formatRupiahAngka(totalProgram)}`,
                pegawai,
                barang,
                jasa,
                modal,
                pegawai_display: pegawai ? `Rp ${formatRupiahAngka(pegawai)}` : '-',
                barang_display: barang ? `Rp ${formatRupiahAngka(barang)}` : '-',
                jasa_display: jasa ? `Rp ${formatRupiahAngka(jasa)}` : '-',
                modal_display: modal ? `Rp ${formatRupiahAngka(modal)}` : '-',
                keterangan: '',
                jumlah_transaksi: row.jumlah_transaksi,
                nilai_kontrak: nilaiKontrak,
                nilai_kontrak_display: `Rp ${formatRupiahAngka(nilaiKontrak)}`,
                total_pembayaran_program: totalPembayaran,
                total_pembayaran_program_display: `Rp ${formatRupiahAngka(totalPembayaran)}`,
                total_realisasi_program: totalProgram,
                total_realisasi_program_display: `Rp ${formatRupiahAngka(totalProgram)}`,
                saldo_tersedia_program: saldoTersedia,
                saldo_tersedia_program_display: `Rp ${formatRupiahAngka(saldoTersedia)}`,
                sisa_anggaran_program: sisaProgram,
                sisa_anggaran_program_display: `Rp ${formatRupiahAngka(sisaProgram)}`
            };
        });

        res.json({
            data,
            summary: {
                total,
                total_display: `Rp ${formatRupiahAngka(total)}`,
                jumlah_item: list.length,
                jumlah_item_display: list.length.toLocaleString('id-ID'),
                kategori: kategoriSummary
            }
        });
    } catch (err) {
        console.error('Gagal membaca realisasi anggaran:', err);
        res.status(500).json({ pesan: 'Gagal membaca data realisasi anggaran.' });
    }
});

app.get('/api/sisa-anggaran', async (req, res) => {
    try {
        const [programs, semuaRealisasi, semuaPembayaran, rencanaBelumDiterima] = await Promise.all([
            Program.find({}).lean(),
            safeMongoRead('RealisasiAnggaran.find(sisa-anggaran)', () => RealisasiAnggaran.find({}).lean(), []),
            safeMongoRead('RealisasiPembayaran.find(sisa-anggaran)', () => RealisasiPembayaran.find({}).lean(), []),
            bangunRencanaPendapatanBelumDirealisasikan()
        ]);
        const totalRealisasiByProgram = new Map();
        const totalPembayaranByProgram = new Map();
        const programById = new Map(programs.map(program => [program.id_program, program]));
        const kategoriSummaryMap = new Map(KATEGORI_REALISASI_ANGGARAN.map(kategori => [kategori, 0]));

        semuaRealisasi.forEach(row => {
            const nominal = Number(row.nominal) || 0;
            totalRealisasiByProgram.set(row.id_program, (totalRealisasiByProgram.get(row.id_program) || 0) + nominal);
            kategoriSummaryMap.set(row.kategori, (kategoriSummaryMap.get(row.kategori) || 0) + nominal);
        });
        semuaPembayaran.forEach(row => {
            const nominal = nominalRealisasiPenerimaan(row);
            totalPembayaranByProgram.set(row.id_program, (totalPembayaranByProgram.get(row.id_program) || 0) + nominal);
        });

        const rows = programs.map(program => {
            const nilaiKontrak = Number(program.nilai_kontrak) || 0;
            const statusAlokasi = statusAlokasiKerma(program.kode_file);
            const tutupKeuangan = statusAlokasi !== 'Aktif';
            const totalRealisasiAktual = totalRealisasiByProgram.get(program.id_program) || 0;
            const totalPembayaranAktual = totalPembayaranByProgram.get(program.id_program) || 0;
            const nominalPenutup = Math.max(nilaiKontrak, totalPembayaranAktual, totalRealisasiAktual);
            const totalPembayaran = tutupKeuangan ? nominalPenutup : totalPembayaranAktual;
            const totalRealisasi = tutupKeuangan ? nominalPenutup : totalRealisasiAktual;
            const sisaAnggaran = tutupKeuangan ? 0 : totalPembayaran - totalRealisasi;
            const serapan = totalPembayaran > 0 ? (totalRealisasi / totalPembayaran) * 100 : 0;
            const statusKontrak = hitungStatusKontrak(program.tgl_akhir_kontrak);
            let statusAnggaran = tutupKeuangan ? 'Terserap' : 'Aman';
            if (!tutupKeuangan) {
                if (sisaAnggaran < 0) statusAnggaran = 'Defisit';
                else if (totalRealisasi <= 0) statusAnggaran = 'Belum Realisasi';
                else if (serapan >= 80) statusAnggaran = 'Serapan Tinggi';
            }

            return {
                id_program: program.id_program,
                kode_file: program.kode_file || '',
                nama_mitra: program.nama_mitra || '',
                judul_pks: program.judul_pks || '',
                tgl_kontrak: formatTanggalDisplay(program.tgl_kontrak),
                tgl_kontrak_input: formatTanggalInput(program.tgl_kontrak),
                tgl_akhir_kontrak: formatTanggalDisplay(program.tgl_akhir_kontrak),
                tgl_akhir_kontrak_input: formatTanggalInput(program.tgl_akhir_kontrak),
                status_kontrak: statusKontrak,
                status_alokasi: statusAlokasi,
                nilai_kontrak: nilaiKontrak,
                nilai_kontrak_display: `Rp ${formatRupiahAngka(nilaiKontrak)}`,
                total_realisasi_pendapatan: totalPembayaran,
                total_realisasi_pendapatan_display: `Rp ${formatRupiahAngka(totalPembayaran)}`,
                total_realisasi_anggaran: totalRealisasi,
                total_realisasi_anggaran_display: `Rp ${formatRupiahAngka(totalRealisasi)}`,
                sisa_anggaran: sisaAnggaran,
                sisa_anggaran_display: `Rp ${formatRupiahAngka(sisaAnggaran)}`,
                persentase_serapan: serapan,
                persentase_serapan_display: `${serapan.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`,
                status_anggaran: statusAnggaran
            };
        }).sort((a, b) => {
            const tA = parseTanggalDashboard(a.tgl_kontrak_input)?.getTime() || 0;
            const tB = parseTanggalDashboard(b.tgl_kontrak_input)?.getTime() || 0;
            if (tA !== tB) return tB - tA;
            return String(a.kode_file || a.id_program || '').localeCompare(String(b.kode_file || b.id_program || ''), 'id');
        }).map((row, i) => ({ no: i + 1, ...row }));

        const totalNilaiKontrak = rows.reduce((sum, row) => sum + row.nilai_kontrak, 0);
        const totalRealisasiPendapatan = rows.reduce((sum, row) => sum + row.total_realisasi_pendapatan, 0);
        const totalRealisasi = rows.reduce((sum, row) => sum + row.total_realisasi_anggaran, 0);
        const totalBelumDiterima = Math.max(0, totalNilaiKontrak - totalRealisasiPendapatan);
        const totalSisa = totalRealisasiPendapatan - totalRealisasi;
        const totalSisaPositif = rows
            .filter(row => row.sisa_anggaran > 0)
            .reduce((sum, row) => sum + row.sisa_anggaran, 0);
        const totalDefisit = rows
            .filter(row => row.sisa_anggaran < 0)
            .reduce((sum, row) => sum + Math.abs(row.sisa_anggaran), 0);
        const serapanTotal = totalRealisasiPendapatan > 0 ? (totalRealisasi / totalRealisasiPendapatan) * 100 : 0;
        const hariIni = new Date();
        hariIni.setHours(0, 0, 0, 0);
        const detailBelumDiterimaRows = (rencanaBelumDiterima.data || []).map(row => {
            const tanggal = parseTanggalDashboard(row.tanggal_input);
            const statusDetail = !tanggal
                ? 'Belum Terjadwal'
                : tanggal >= hariIni ? 'Akan Diterima' : 'Lewat Rencana';
            return {
                ...row,
                status_detail: statusDetail,
                tanggal_sort: tanggal ? tanggal.getTime() : null
            };
        }).sort((a, b) => {
            const rank = { 'Akan Diterima': 0, 'Lewat Rencana': 1, 'Belum Terjadwal': 2 };
            const rA = rank[a.status_detail] ?? 9;
            const rB = rank[b.status_detail] ?? 9;
            if (rA !== rB) return rA - rB;
            if (a.tanggal_sort !== null && b.tanggal_sort !== null && a.tanggal_sort !== b.tanggal_sort) {
                return a.status_detail === 'Lewat Rencana' ? b.tanggal_sort - a.tanggal_sort : a.tanggal_sort - b.tanggal_sort;
            }
            if (a.tanggal_sort !== null && b.tanggal_sort === null) return -1;
            if (a.tanggal_sort === null && b.tanggal_sort !== null) return 1;
            return String(a.kode_file || '').localeCompare(String(b.kode_file || ''), 'id');
        }).map((row, i) => ({
            no: i + 1,
            id_program: row.id_program || '',
            kode_file: row.kode_file || '',
            nama_mitra: row.nama_mitra || '',
            judul_pks: row.judul_pks || '',
            tahap: row.tahap || 'Pembayaran',
            rencana_pembayaran: row.tanggal_diterima || 'N/A',
            rencana_pembayaran_input: row.tanggal_input || '',
            nominal: Number(row.nominal) || 0,
            nominal_display: row.nominal_display || `Rp ${formatRupiahAngka(row.nominal)}`,
            status_detail: row.status_detail
        }));
        const sumDetail = status => detailBelumDiterimaRows
            .filter(row => row.status_detail === status)
            .reduce((sum, row) => sum + row.nominal, 0);
        const countDetail = status => detailBelumDiterimaRows.filter(row => row.status_detail === status).length;
        const detailBelumDiterimaSummary = {
            total_akan_diterima: sumDetail('Akan Diterima'),
            total_akan_diterima_display: `Rp ${formatRupiahAngka(sumDetail('Akan Diterima'))}`,
            jumlah_akan_diterima: countDetail('Akan Diterima'),
            jumlah_akan_diterima_display: countDetail('Akan Diterima').toLocaleString('id-ID'),
            total_lewat_rencana: sumDetail('Lewat Rencana'),
            total_lewat_rencana_display: `Rp ${formatRupiahAngka(sumDetail('Lewat Rencana'))}`,
            jumlah_lewat_rencana: countDetail('Lewat Rencana'),
            jumlah_lewat_rencana_display: countDetail('Lewat Rencana').toLocaleString('id-ID'),
            total_belum_terjadwal: sumDetail('Belum Terjadwal'),
            total_belum_terjadwal_display: `Rp ${formatRupiahAngka(sumDetail('Belum Terjadwal'))}`,
            jumlah_belum_terjadwal: countDetail('Belum Terjadwal'),
            jumlah_belum_terjadwal_display: countDetail('Belum Terjadwal').toLocaleString('id-ID')
        };
        const detailPenerimaanRows = semuaPembayaran.map(row => {
            const program = programById.get(row.id_program) || {};
            const tanggal = parseTanggalDashboard(row.tanggal);
            const nominalRealisasi = nominalRealisasiPenerimaan(row);
            return {
                id_pembayaran: String(row._id),
                id_program: row.id_program || '',
                kode_file: row.kode_file || program.kode_file || '',
                nama_mitra: program.nama_mitra || '',
                judul_pks: program.judul_pks || '',
                tahap: row.rencana_tahap || 'Pembayaran',
                tgl_penerimaan: formatTanggalDisplay(row.tanggal) || 'N/A',
                tgl_penerimaan_input: formatTanggalInput(row.tanggal) || row.tanggal || '',
                tanggal_sort: tanggal ? tanggal.getTime() : null,
                nominal: nominalRealisasi,
                nominal_display: `Rp ${formatRupiahAngka(nominalRealisasi)}`,
                keterangan: row.keterangan || ''
            };
        }).sort((a, b) => {
            if (a.tanggal_sort !== null && b.tanggal_sort !== null && a.tanggal_sort !== b.tanggal_sort) {
                return b.tanggal_sort - a.tanggal_sort;
            }
            if (a.tanggal_sort !== null && b.tanggal_sort === null) return -1;
            if (a.tanggal_sort === null && b.tanggal_sort !== null) return 1;
            return String(a.kode_file || '').localeCompare(String(b.kode_file || ''), 'id');
        }).map((row, i) => ({ no: i + 1, ...row }));
        const detailRealisasiAnggaranRows = semuaRealisasi.map(row => {
            const program = programById.get(row.id_program) || {};
            const tanggal = parseTanggalDashboard(row.tanggal);
            return {
                id_realisasi: String(row._id),
                id_program: row.id_program || '',
                kode_file: row.kode_file || program.kode_file || '',
                nama_mitra: program.nama_mitra || '',
                judul_pks: program.judul_pks || '',
                kategori: row.kategori || '',
                tgl_realisasi: formatTanggalDisplay(row.tanggal) || 'N/A',
                tgl_realisasi_input: formatTanggalInput(row.tanggal) || row.tanggal || '',
                tanggal_sort: tanggal ? tanggal.getTime() : null,
                nominal: Number(row.nominal) || 0,
                nominal_display: `Rp ${formatRupiahAngka(row.nominal)}`,
                keterangan: row.keterangan || ''
            };
        }).sort((a, b) => {
            if (a.tanggal_sort !== null && b.tanggal_sort !== null && a.tanggal_sort !== b.tanggal_sort) {
                return b.tanggal_sort - a.tanggal_sort;
            }
            if (a.tanggal_sort !== null && b.tanggal_sort === null) return -1;
            if (a.tanggal_sort === null && b.tanggal_sort !== null) return 1;
            return String(a.kode_file || '').localeCompare(String(b.kode_file || ''), 'id');
        }).map((row, i) => ({ no: i + 1, ...row }));
        const kategori = [...kategoriSummaryMap.entries()].map(([nama, total]) => ({
            kategori: nama,
            total,
            total_display: `Rp ${formatRupiahAngka(total)}`
        }));

        res.json({
            data: rows,
            summary: {
                total_nilai_kontrak: totalNilaiKontrak,
                total_nilai_kontrak_display: `Rp ${formatRupiahAngka(totalNilaiKontrak)}`,
                total_realisasi_pendapatan: totalRealisasiPendapatan,
                total_realisasi_pendapatan_display: `Rp ${formatRupiahAngka(totalRealisasiPendapatan)}`,
                total_belum_diterima: totalBelumDiterima,
                total_belum_diterima_display: `Rp ${formatRupiahAngka(totalBelumDiterima)}`,
                total_realisasi_anggaran: totalRealisasi,
                total_realisasi_anggaran_display: `Rp ${formatRupiahAngka(totalRealisasi)}`,
                total_sisa_anggaran: totalSisa,
                total_sisa_anggaran_display: `Rp ${formatRupiahAngka(totalSisa)}`,
                total_sisa_positif: totalSisaPositif,
                total_sisa_positif_display: `Rp ${formatRupiahAngka(totalSisaPositif)}`,
                total_defisit: totalDefisit,
                total_defisit_display: `Rp ${formatRupiahAngka(totalDefisit)}`,
                persentase_serapan: serapanTotal,
                persentase_serapan_display: `${serapanTotal.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`,
                jumlah_kontrak: rows.length,
                jumlah_kontrak_display: rows.length.toLocaleString('id-ID'),
                jumlah_defisit: rows.filter(row => row.status_anggaran === 'Defisit').length,
                jumlah_serapan_tinggi: rows.filter(row => row.status_anggaran === 'Serapan Tinggi').length,
                jumlah_belum_realisasi: rows.filter(row => row.status_anggaran === 'Belum Realisasi').length,
                kategori,
                detail_penerimaan: {
                    data: detailPenerimaanRows
                },
                detail_realisasi_anggaran: {
                    data: detailRealisasiAnggaranRows
                },
                detail_belum_diterima: {
                    summary: detailBelumDiterimaSummary,
                    data: detailBelumDiterimaRows
                }
            }
        });
    } catch (err) {
        console.error('Gagal membaca sisa anggaran:', err);
        res.status(500).json({ pesan: 'Gagal membaca data sisa anggaran.' });
    }
});

app.post('/api/tambah-realisasi-anggaran', async (req, res) => {
    try {
        const { kode_file, kategori, tanggal, nominal, keterangan } = req.body;
        const lookup = await cariProgramDariKodeFile(kode_file);
        if (lookup.error) return res.status(400).json({ pesan: lookup.error });
        const kategoriBelanja = kategori?.trim();
        const nominalAngka = Number(nominal);
        const tanggalRealisasi = tanggal ? parseTanggalDashboard(tanggal) : null;

        if (!kategoriBelanja || !nominal)
            return res.status(400).json({ pesan: 'Kode File, kategori, dan nominal wajib diisi.' });
        if (!KATEGORI_REALISASI_ANGGARAN.includes(kategoriBelanja))
            return res.status(400).json({ pesan: 'Kategori realisasi anggaran tidak valid.' });
        if (tanggal && !tanggalRealisasi)
            return res.status(400).json({ pesan: 'Tanggal realisasi tidak valid.' });
        if (!Number.isFinite(nominalAngka) || nominalAngka <= 0)
            return res.status(400).json({ pesan: 'Nominal realisasi harus lebih dari 0.' });
        if (!tanggalRealisasi)
            return res.status(400).json({ pesan: 'Tanggal realisasi wajib diisi agar Realisasi RI dapat dicatat pada Saldo RI.' });

        const saldo = await hitungSaldoRiProgram(lookup.program.id_program, tanggalRealisasi);
        const saldoTersedia = saldo.saldoDefinitif;
        if (saldo.totalPenerimaan <= 0) {
            return res.status(400).json({ pesan: 'Belum ada realisasi pembayaran yang diterima SBM untuk Kode File ini. Tambahkan realisasi pembayaran terlebih dahulu.' });
        }
        if (nominalAngka > saldoTersedia) {
            return res.status(400).json({
                pesan: `Nominal realisasi melebihi saldo pembayaran tersedia untuk Kode File ini. Saldo tersedia: Rp ${formatRupiahAngka(saldoTersedia)}.`
            });
        }
        if (nominalAngka > saldo.riTersediaUntukRealisasi) {
            return res.status(400).json({
                pesan: `Nominal realisasi melebihi RI yang sudah diregistrasikan. Sisa RI yang dapat direalisasikan: Rp ${formatRupiahAngka(saldo.riTersediaUntukRealisasi)}.`
            });
        }

        const rencanaBaru = await RencanaAnggaran.create({
            id_program: lookup.program.id_program,
            kode_file: lookup.kodeFile,
            tanggal_ri: formatTanggalISO(tanggalRealisasi),
            tanggal_realisasi_ri: formatTanggalISO(tanggalRealisasi),
            tgl_invoice: formatTanggalISO(tanggalRealisasi),
            no_invoice: '',
            uraian: keterangan?.trim() || kategoriBelanja,
            kategori_belanja: kategoriBelanja,
            ri: 0,
            pemasukan: 0,
            pengeluaran_ri: nominalAngka
        });
        try {
            await sinkronkanRealisasiAnggaranDariRi(rencanaBaru, lookup.program);
        } catch (syncErr) {
            await RencanaAnggaran.findByIdAndDelete(rencanaBaru._id);
            throw syncErr;
        }
        res.json({ pesan: 'Realisasi anggaran berhasil ditambahkan ke Saldo RI dan Rekapitulasi Realisasi Anggaran.' });
    } catch (err) {
        console.error('Gagal menambah realisasi anggaran:', err);
        res.status(500).json({ pesan: 'Gagal menyimpan realisasi anggaran.' });
    }
});

app.delete('/api/realisasi-anggaran/:id', async (req, res) => {
    try {
        const result = await RealisasiAnggaran.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ pesan: 'Realisasi anggaran tidak ditemukan.' });
        if (result.id_rencana_anggaran) {
            await RencanaAnggaran.findByIdAndDelete(result.id_rencana_anggaran);
        }
        res.json({ pesan: 'Realisasi anggaran berhasil dihapus.' });
    } catch (err) {
        console.error('Gagal hapus realisasi anggaran:', err);
        res.status(500).json({ pesan: 'Gagal menghapus realisasi anggaran.' });
    }
});

// ─── API: Cicilan ─────────────────────────────────────────────────────────────

app.get('/api/cicilan/:id_program', async (req, res) => {
    try {
        const id = decodeURIComponent(req.params.id_program);
        const list = await Cicilan.find({ id_program: id }).sort({ no_cicilan: 1 }).lean();
        res.json(list.map(c => ({
            no: String(c.no_cicilan), label: c.label,
            nominal: c.nominal, batas_akhir: formatTanggalInput(c.batas_akhir)
        })));
    } catch (e) {
        res.status(500).json({ pesan: 'Gagal membaca cicilan.' });
    }
});

// ─── API 12: Industri ─────────────────────────────────────────────────────────

app.get('/api/daftar-industri', async (req, res) => {
    try {
        const list = await Industri.find({}).lean();
        res.json(list.map(d => ({
            kode_kategori: d.kode_kategori,
            nama_sektor: d.nama_sektor,
            contoh_ruang_lingkup: d.contoh_ruang_lingkup
        })));
    } catch (e) {
        console.error('Gagal membaca industri:', e);
        res.status(500).json({ pesan: 'Gagal membaca database.' });
    }
});

app.post('/api/tambah-industri', async (req, res) => {
    try {
        const { kode_kategori, nama_sektor, contoh_ruang_lingkup } = req.body;
        if (!kode_kategori || !nama_sektor)
            return res.status(400).json({ pesan: 'Kode Kategori dan Nama Sektor wajib diisi.' });
        await Industri.create({
            kode_kategori: kode_kategori.trim().toUpperCase(),
            nama_sektor: nama_sektor.trim(),
            contoh_ruang_lingkup: contoh_ruang_lingkup?.trim() || ''
        });
        res.json({ pesan: 'Data industri berhasil ditambahkan.' });
    } catch (e) {
        if (e.code === 11000) return res.status(400).json({ pesan: `Kode kategori "${req.body.kode_kategori}" sudah ada.` });
        console.error('Gagal tambah industri:', e);
        res.status(500).json({ pesan: 'Gagal menyimpan data industri.' });
    }
});

// ─── API: Addendum ────────────────────────────────────────────────────────────

app.get('/api/addendum/:id_program', async (req, res) => {
    try {
        const id = decodeURIComponent(req.params.id_program);
        const list = await Addendum.find({ id_program: id }).sort({ no: 1 }).lean();
        res.json(list.map(a => ({ no: String(a.no), nama_file: a.nama_file, tgl_upload: a.tgl_upload })));
    } catch (e) {
        res.status(500).json({ pesan: 'Gagal membaca addendum.' });
    }
});

app.post('/api/upload-addendum', async (req, res) => {
    try {
        const { id_program, file_base64, file_upload_id, file_size, total_chunks, file_nama } = req.body;
        if (!id_program || (!file_base64 && !file_upload_id) || !file_nama)
            return res.status(400).json({ pesan: 'id_program, file, dan nama file wajib diisi.' });

        const ext = path.extname(file_nama).toLowerCase();
        if (!ALLOWED_EXT.has(ext)) return res.status(400).json({ pesan: `Ekstensi file tidak diizinkan: ${ext}` });

        const noBerikut = (await Addendum.countDocuments({ id_program: id_program.trim() })) + 1;
        const namaFile = safeNamaFileDasar(id_program, ext, `_add_${noBerikut}`);

        try {
            const userId = req.session?.user?.id;
            const buffer = await resolveUploadBuffer({
                fileBase64: file_base64,
                uploadId: file_upload_id,
                userId,
                kind: UPLOAD_KIND_ADDENDUM,
                idProgram: id_program,
                fileName: file_nama,
                fileSize: file_size,
                totalChunks: total_chunks
            });
            await simpanBufferAddendum(id_program, buffer, file_nama, noBerikut, userId);
            if (file_upload_id) {
                await hapusUploadChunked(file_upload_id, userId)
                    .catch(err => console.warn('Gagal membersihkan chunk upload:', err?.message || err));
            }
        } catch (errUpload) {
            return res.status(400).json({ pesan: errUpload.message || 'Gagal menyimpan file addendum.' });
        }

        const tglUpload = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        await Addendum.create({ id_program: id_program.trim(), no: noBerikut, nama_file: namaFile, tgl_upload: tglUpload });

        res.json({ pesan: `Addendum ${noBerikut} berhasil diupload.`, nama_file: namaFile, no: noBerikut, tgl_upload: tglUpload });
    } catch (e) {
        console.error('Gagal upload addendum:', e);
        res.status(500).json({ pesan: 'Gagal menyimpan addendum.' });
    }
});

// ─── API: Calon Peserta ───────────────────────────────────────────────────────

app.get('/api/template-calon-peserta', async (req, res) => {
    try {
        const wb = new ExcelJS.Workbook();
        const sheet = wb.addWorksheet('Data_CalonPeserta');
        const headerRow = sheet.addRow(['id_program', 'no_seleksi', 'nama_lengkap']);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004B87' } };
        });
        sheet.addRow(['PKS-2024-001', 'SEL-001', 'Budi Santoso']);
        sheet.addRow(['PKS-2024-001', 'SEL-002', 'Siti Rahayu']);
        sheet.columns.forEach(col => { col.width = 22; });
        const buffer = await wb.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Template_CalonPeserta.xlsx');
        res.send(buffer);
    } catch (e) {
        res.status(500).send('Gagal membuat template.');
    }
});

app.post('/api/import-calon-peserta', async (req, res) => {
    try {
        const {
            fileBase64,
            file_base64,
            file_upload_id,
            file_size,
            total_chunks,
            file_nama,
            id_program_override
        } = req.body;
        const base64Value = fileBase64 || file_base64;
        if (!base64Value && !file_upload_id) {
            return res.status(400).json({ pesan: 'File tidak ditemukan.' });
        }

        const userId = req.session?.user?.id;
        const uploadProgramKey = id_program_override || '__from_file__';
        const importBuffer = await resolveUploadBuffer({
            fileBase64: base64Value,
            uploadId: file_upload_id,
            userId,
            kind: UPLOAD_KIND_IMPORT_CALON_PESERTA,
            idProgram: uploadProgramKey,
            fileName: file_nama || 'import-calon-peserta.xlsx',
            fileSize: file_size,
            totalChunks: total_chunks
        });

        const tempWb = new ExcelJS.Workbook();
        await tempWb.xlsx.load(importBuffer);
        if (file_upload_id) {
            await hapusUploadChunked(file_upload_id, userId)
                .catch(err => console.warn('Gagal membersihkan chunk import:', err?.message || err));
        }
        const srcSheet = tempWb.worksheets[0];
        if (!srcSheet) return res.status(400).json({ pesan: 'Sheet tidak ditemukan dalam file.' });

        const colIdx = {};
        srcSheet.getRow(1).values.forEach((h, i) => {
            if (h) colIdx[h.toString().toLowerCase().trim().replace(/\s+/g, '_')] = i;
        });

        const docs = [];
        srcSheet.eachRow((row, rowNum) => {
            if (rowNum === 1) return;
            const get = field => {
                const idx = colIdx[field]; if (!idx) return '';
                const val = row.getCell(idx).value;
                return val != null ? val.toString().trim() : '';
            };
            const id = id_program_override?.trim() || get('id_program');
            const no_seleksi = get('no_seleksi');
            const nama_lengkap = get('nama_lengkap');
            if (!id && !no_seleksi && !nama_lengkap) return;
            docs.push({ id_program: id, no_seleksi, nama_lengkap });
        });

        if (docs.length === 0) return res.status(400).json({ pesan: 'Tidak ada data yang dapat diimpor.' });
        const invalid = docs.find(r => !r.id_program || !r.no_seleksi || !r.nama_lengkap);
        if (invalid) return res.status(400).json({ pesan: 'Setiap baris harus memiliki ID Program, No. Seleksi, dan Nama Lengkap.' });

        await CalonPeserta.insertMany(docs);
        res.json({ pesan: `${docs.length} data calon peserta berhasil diimpor.` });
    } catch (e) {
        console.error('Gagal import calon peserta:', e);
        res.status(500).json({ pesan: 'Gagal memproses file Excel.' });
    }
});

app.get('/api/daftar-calon-peserta', async (req, res) => {
    try {
        const filter = req.query.programId ? { id_program: req.query.programId } : {};
        const list = await CalonPeserta.find(filter).lean();
        res.json(list.map((p, i) => ({
            no: i + 1, id_program: p.id_program,
            no_seleksi: p.no_seleksi, nama_lengkap: p.nama_lengkap
        })));
    } catch (e) {
        console.error('Gagal membaca calon peserta:', e);
        res.status(500).json({ pesan: 'Gagal membaca database.' });
    }
});

app.get('/api/export-calon-peserta', async (req, res) => {
    try {
        const { programId } = req.query;
        const [programs, calonList] = await Promise.all([
            Program.find({}).lean(),
            CalonPeserta.find(programId ? { id_program: programId } : {}).lean()
        ]);

        const mitraMap = {};
        programs.forEach(p => { mitraMap[p.id_program] = p.nama_mitra; });

        const wb = new ExcelJS.Workbook();
        const sheet = wb.addWorksheet('Calon Peserta Didik');
        const headerRow = sheet.addRow(['No.', 'ID Program', 'Nama Mitra', 'No. Seleksi', 'Nama Lengkap']);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004B87' } };
        });

        calonList.forEach((p, i) => {
            sheet.addRow([i + 1, p.id_program, mitraMap[p.id_program] || '', p.no_seleksi, p.nama_lengkap]);
        });

        [6, 18, 36, 18, 32].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

        const buffer = await wb.xlsx.writeBuffer();
        const filename = programId ? `Calon_Peserta_${programId}.xlsx` : 'Calon_Peserta_Didik.xlsx';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);
    } catch (e) {
        console.error('Gagal export calon peserta:', e);
        res.status(500).send('Gagal mengekspor data.');
    }
});

app.post('/api/tambah-calon-peserta', async (req, res) => {
    try {
        const { id_program, peserta } = req.body;
        if (!id_program || !Array.isArray(peserta) || peserta.length === 0)
            return res.status(400).json({ pesan: 'ID Program dan data peserta wajib diisi.' });
        if (peserta.some(p => !p.no_seleksi || !p.nama_lengkap))
            return res.status(400).json({ pesan: 'No. Seleksi dan Nama Lengkap wajib diisi untuk semua peserta.' });

        await CalonPeserta.insertMany(peserta.map(p => ({
            id_program: id_program.trim(),
            no_seleksi: p.no_seleksi.trim(),
            nama_lengkap: p.nama_lengkap.trim()
        })));
        res.json({ pesan: `${peserta.length} data calon peserta didik berhasil ditambahkan.` });
    } catch (e) {
        console.error('Gagal tambah calon peserta:', e);
        res.status(500).json({ pesan: 'Gagal menyimpan data calon peserta didik.' });
    }
});

// ─── Inisialisasi & Start ─────────────────────────────────────────────────────

// ─── API: Kontrak / PKS ───────────────────────────────────────────────────────

async function generateIdKontrak() {
    const year = new Date().getFullYear();
    const prefix = `KONTRAK-${year}-`;
    const last = await Kontrak.findOne({ id_kontrak: new RegExp(`^${prefix}`) })
        .sort({ id_kontrak: -1 }).lean();
    const lastNum = last ? parseInt(last.id_kontrak.split('-').pop(), 10) : 0;
    return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

function adaNilaiKontrak(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
}

function validasiRincianBppKontrak(rincian = []) {
    let adaBarisLengkap = false;
    const kurang = [];
    (Array.isArray(rincian) ? rincian : []).forEach((row, i) => {
        const tahap = adaNilaiKontrak(row?.tahap);
        const bpp = adaNilaiKontrak(row?.BPP_per_mahasiswa);
        const batas = adaNilaiKontrak(row?.batas_pembayaran);
        const adaIsi = tahap || bpp || batas;
        const lengkap = tahap && bpp && batas;
        if (lengkap) adaBarisLengkap = true;
        if (adaIsi && !lengkap) kurang.push(`Rincian BPP baris ${i + 1}`);
    });
    if (!adaBarisLengkap) kurang.push('Minimal satu rincian BPP lengkap');
    return kurang;
}

function validasiKelengkapanKontrak(k = {}) {
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
    const incomplete = Object.entries(checks).map(([flow, fields]) => {
        const missing = fields.filter(([field]) => !adaNilaiKontrak(k[field])).map(([, label]) => label);
        if (flow === 'Pembiayaan') missing.push(...validasiRincianBppKontrak(k.rincian_bpp));
        return { flow, missing };
    }).filter(row => row.missing.length > 0);
    return {
        valid: incomplete.length === 0,
        incomplete,
        message: incomplete.length
            ? incomplete.map(row => `${row.flow}: ${row.missing.slice(0, 3).join(', ')}`).join(' | ')
            : 'Kontrak lengkap'
    };
}

app.get('/api/kontrak', async (req, res) => {
    try {
        const list = await Kontrak.find({}).sort({ dibuat_pada: -1 }).lean();
        res.json(list);
    } catch (e) {
        res.status(500).json({ pesan: 'Gagal membaca data kontrak.' });
    }
});

app.post('/api/kontrak', async (req, res) => {
    try {
        const id_kontrak = await generateIdKontrak();
        const data = { ...req.body, id_kontrak, status: 'draft' };
        delete data._id;
        const kontrak = await Kontrak.create(data);
        res.json({ pesan: 'Draft kontrak berhasil disimpan.', id_kontrak: kontrak.id_kontrak });
    } catch (e) {
        console.error('Gagal buat kontrak:', e);
        res.status(500).json({ pesan: 'Gagal menyimpan kontrak.' });
    }
});

app.put('/api/kontrak/:id', async (req, res) => {
    try {
        const existing = await Kontrak.findOne({ id_kontrak: req.params.id }).lean();
        if (!existing) return res.status(404).json({ pesan: 'Kontrak tidak ditemukan.' });
        if (existing.status === 'approved')
            return res.status(400).json({ pesan: 'Kontrak yang sudah disetujui tidak dapat diubah.' });
        const updates = { ...req.body };
        delete updates.id_kontrak; delete updates.status;
        delete updates.dibuat_pada; delete updates._id;
        await Kontrak.findOneAndUpdate({ id_kontrak: req.params.id }, updates);
        res.json({ pesan: 'Kontrak berhasil diperbarui.' });
    } catch (e) {
        console.error('Gagal edit kontrak:', e);
        res.status(500).json({ pesan: 'Gagal memperbarui kontrak.' });
    }
});

app.post('/api/kontrak/:id/submit', async (req, res) => {
    try {
        const { nama_admin } = req.body;
        const kontrak = await Kontrak.findOne({ id_kontrak: req.params.id, status: { $in: ['draft', 'rejected'] } }).lean();
        if (!kontrak) return res.status(400).json({ pesan: 'Kontrak tidak dapat disubmit.' });
        const kelengkapan = validasiKelengkapanKontrak(kontrak);
        if (!kelengkapan.valid) {
            return res.status(400).json({
                pesan: `Kontrak belum lengkap dan belum dapat diajukan. ${kelengkapan.message}`,
                detail: kelengkapan.incomplete
            });
        }
        await Kontrak.findOneAndUpdate(
            { id_kontrak: req.params.id },
            { status: 'submitted', disubmit_pada: new Date(), dibuat_oleh: nama_admin || '' }
        );
        res.json({ pesan: 'Kontrak berhasil disubmit untuk persetujuan.' });
    } catch (e) {
        res.status(500).json({ pesan: 'Gagal submit kontrak.' });
    }
});

app.post('/api/kontrak/:id/approve', requireAtasan, async (req, res) => {
    try {
        const nama_approver = req.session.user.nama;
        const result = await Kontrak.findOneAndUpdate(
            { id_kontrak: req.params.id, status: 'submitted' },
            { status: 'approved', diapprove_oleh: nama_approver || '', diapprove_pada: new Date() }
        );
        if (!result) return res.status(400).json({ pesan: 'Kontrak tidak dapat disetujui.' });

        // Sync data kembali ke Program jika terhubung
        if (result.id_program) {
            await Program.findOneAndUpdate(
                { id_program: result.id_program },
                { no_kontrak_mitra: result.no_kontrak_mitra, no_kontrak_institusi: result.no_kontrak_sbm }
            );
        }
        res.json({ pesan: 'Kontrak berhasil disetujui.' });
    } catch (e) {
        res.status(500).json({ pesan: 'Gagal approve kontrak.' });
    }
});

app.post('/api/kontrak/:id/reject', requireAtasan, async (req, res) => {
    try {
        const { catatan } = req.body;
        const result = await Kontrak.findOneAndUpdate(
            { id_kontrak: req.params.id, status: 'submitted' },
            { status: 'rejected', catatan_reviewer: catatan || '' }
        );
        if (!result) return res.status(400).json({ pesan: 'Kontrak tidak dapat ditolak.' });
        res.json({ pesan: 'Kontrak ditolak. Admin dapat merevisi dan submit ulang.' });
    } catch (e) {
        res.status(500).json({ pesan: 'Gagal menolak kontrak.' });
    }
});

app.get('/api/kontrak/:id/download', async (req, res) => {
    try {
        const kontrak = await Kontrak.findOne({ id_kontrak: req.params.id }).lean();
        if (!kontrak) return res.status(404).json({ pesan: 'Kontrak tidak ditemukan.' });

        const templatePath = path.resolve(__dirname, 'template_kontrak.docx');
        if (!fs.existsSync(templatePath)) {
            return res.status(503).send('Template kontrak belum tersedia. Harap letakkan file template_kontrak.docx di folder utama aplikasi.');
        }

        const data = { ...kontrak, _id: undefined };

        // Normalisasi: pastikan semua field di schema ada di data (record lama mungkin tidak punya field baru)
        Kontrak.schema.eachPath((pathname) => {
            if (pathname === '_id' || pathname === '__v' || pathname.startsWith('rincian_bpp.')) return;
            if (data[pathname] === undefined) data[pathname] = '';
        });

        // Field tambahan untuk template
        data.prodi_caps      = (data.prodi      || '').toUpperCase();
        data.nama_mitra_caps = (data.nama_mitra || '').toUpperCase();

        // Format angka uang: titik ribuan + penutup ",-"  contoh: 5000000 → "5.000.000,-"
        const fmtUang = n => (n !== null && n !== undefined && n !== '' && !isNaN(n))
            ? Number(n).toLocaleString('id-ID') + ',-'
            : '';

        const fieldUang = [
            'nilai_kontrak_angka',
            'BPP_per_peserta_angka',
            'BPP_sem_panjang_angka',
            'BPP_sem_pendek_angka',
            'BPP_ulang_panjang_angka',
            'BPP_ulang_pendek_angka',
            'BPP_tugas_akhir_angka',
        ];
        fieldUang.forEach(f => { if (data[f]) data[f] = fmtUang(data[f]); });

        // Format angka uang di baris rincian BPP (dan hapus baris yang kosong semua)
        if (Array.isArray(data.rincian_bpp)) {
            data.rincian_bpp = data.rincian_bpp
                .filter(r => r.tahap || r.BPP_per_mahasiswa || r.batas_pembayaran)
                .map(r => ({
                    ...r,
                    BPP_per_mahasiswa: fmtUang(r.BPP_per_mahasiswa),
                    total_BPP:         fmtUang(r.total_BPP),
                }));
        }

        const wordBuffer = prosesTemplatWord(data, templatePath);
        const filename = `Kontrak_${kontrak.id_kontrak}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(wordBuffer);
    } catch (e) {
        console.error('Gagal download kontrak:', e);
        res.status(500).send('Gagal membuat dokumen kontrak.');
    }
});

// ─────────────────────────────────────────────────────────────────────────────

const DATA_INDUSTRI_AWAL = [
    ['A', 'Pertanian, Kehutanan dan Perikanan', 'Perkebunan, peternakan, perikanan tangkap, kehutanan.'],
    ['B', 'Pertambangan dan Penggalian', 'PT Bukit Asam Tbk, Freeport, tambang minyak bumi, gas alam.'],
    ['C', 'Industri Pengolahan', 'Pabrik manufaktur, tekstil, makanan, perakitan mesin, fashion, kriya.'],
    ['D', 'Pengadaan Listrik, Gas, Uap/Air Panas Dan Udara Dingin', 'PT PLN (Persero), perusahaan pembangkit listrik, transmisi gas.'],
    ['E', 'Treatment Air, Limbah, Pemulihan Material Sampah & Remediasi', 'Perusahaan pengolahan limbah B3, PDAM, jasa daur ulang sampah.'],
    ['F', 'Konstruksi', 'Kontraktor bangunan gedung, jalan tol, jembatan, instalasi listrik.'],
    ['G', 'Perdagangan Besar & Eceran; Reparasi Mobil & Sepeda Motor', 'Distributor utama, swalayan, diler kendaraan, bengkel.'],
    ['H', 'Pengangkutan dan Pergudangan', 'PT KAI, maskapai penerbangan, ekspedisi kurir, jasa logistik gudang.'],
    ['I', 'Penyediaan Akomodasi Dan Penyediaan Makan Minum', 'Hotel, restoran, kafe, katering, coffee shop (Sektor Kuliner).'],
    ['J', 'Informasi Dan Komunikasi', 'Software house, operator seluler, studio film, penyiaran TV/Radio.'],
    ['K', 'Aktivitas Keuangan dan Asuransi', 'Bank (Mandiri, BCA, dll), modal ventura, perusahaan asuransi.'],
    ['L', 'Real Estat', 'Developer perumahan, agen properti, penyewaan gedung apartemen.'],
    ['M', 'Aktivitas Profesional, Ilmiah Dan Teknis', 'Konsultan hukum/pajak, arsitek, riset komersial, agensi periklanan.'],
    ['N', 'Aktivitas Penyewaan, Ketenagakerjaan, Agen Perjalanan & Penunjang', 'Agensi outsourcing (satpam/CS), rental mobil, biro travel umroh.'],
    ['O', 'Administrasi Pemerintahan, Pertahanan & Jaminan Sosial', 'Kementerian, dinas daerah, TNI/Polri, BPJS Kesehatan/Ketenagakerjaan.'],
    ['P', 'Pendidikan', 'Universitas, Institut, Sekolah, Lembaga Kursus/Bimbel.'],
    ['Q', 'Aktivitas Kesehatan Manusia Dan Aktivitas Sosial', 'Rumah sakit, klinik dokter, panti asuhan, laboratorium klinis.'],
    ['R', 'Kesenian, Hiburan Dan Rekreasi', 'Gedung bioskop, taman hiburan, museum, klub olahraga, promotor musik.'],
    ['S', 'Aktivitas Jasa Lainnya', 'Organisasi masyarakat (Ormas), LSM, jasa reparasi komputer, salon.'],
    ['T', 'Aktivitas Rumah Tangga Sebagai Pemberi Kerja', 'Jasa penyedia ART/Asisten Rumah Tangga mandiri.'],
    ['U', 'Aktivitas Badan Internasional & Badan Ekstra Internasional', 'PBB, UNESCO, WHO, Kedutaan Besar negara asing.'],
];

async function initDataIndustri() {
    const count = await Industri.countDocuments();
    if (count === 0) {
        await Industri.insertMany(DATA_INDUSTRI_AWAL.map(([kode_kategori, nama_sektor, contoh_ruang_lingkup]) =>
            ({ kode_kategori, nama_sektor, contoh_ruang_lingkup })
        ));
        console.log('Data industri awal berhasil dibuat (21 kategori).');
    }
}

function sanitizeErrorMessage(err, req, includeDetail = false) {
    const defaultMessage = 'Terjadi kesalahan server.';
    if (isProd && !includeDetail) return defaultMessage;
    return {
        pesan: err?.message || defaultMessage,
        requestId: req.requestId,
        detail: includeDetail ? String(err?.stack || err || '') : undefined
    };
}

app.use((err, req, res, next) => {
    if (err) {
        const includeDetail = !isProd;
        console.error('[ERR]', req.requestId, err?.message || err);
        if (req.path.startsWith('/api/')) {
            return res.status(500).json(sanitizeErrorMessage(err, req, includeDetail));
        }
        return res.status(500).send('Terjadi kesalahan server.');
    }
    next();
});

app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ pesan: 'Endpoint tidak ditemukan.', requestId: req.requestId });
    }
    return res.status(404).send('Halaman tidak ditemukan.');
});

module.exports = app;
module.exports.initDataIndustri = initDataIndustri;
