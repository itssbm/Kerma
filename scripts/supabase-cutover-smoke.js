#!/usr/bin/env node

require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');

const BASE_URL = process.env.CUTOVER_BASE_URL || 'http://localhost:3000';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'kerma_session';
const CUTOVER_USERNAME = process.env.CUTOVER_USERNAME || process.env.SMOKE_USERNAME || '';
const CUTOVER_PASSWORD = process.env.CUTOVER_PASSWORD || process.env.SMOKE_PASSWORD || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || '';
const REPORT_DIR = process.env.CUTOVER_REPORT_DIR || path.join(process.cwd(), 'data', 'backups', 'kerma-backup-20260810-104237-7664');
const REPORT_GLOB_PREFIX = 'supabase-manual-import-report-';
const REQUEST_TIMEOUT_MS = Number(process.env.CUTOVER_TIMEOUT_MS || 15000);

function parseArg(name, fallback = undefined) {
    const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
    return arg ? arg.slice(name.length + 3) : fallback;
}

async function fetchJson(url, options = {}) {
    const timeout = Number(options.timeoutMs || REQUEST_TIMEOUT_MS);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        const raw = await res.text();
        let body = null;
        if (raw) {
            try {
                body = JSON.parse(raw);
            } catch {
                body = raw;
            }
        }
        return {
            ok: res.ok,
            status: res.status,
            headers: res.headers,
            body
        };
    } catch (err) {
        const cause = err && err.cause ? ` (cause: ${err.cause.code || err.cause.message || err.cause})` : '';
        throw new Error(`fetch failed for ${url}: ${err?.message || err}${cause}`);
    } finally {
        clearTimeout(timer);
    }
}

function parseArgs() {
    const args = {
        baseUrl: parseArg('base-url', BASE_URL),
        reportDir: parseArg('report-dir', REPORT_DIR),
        strict: process.argv.includes('--strict')
    };
    return args;
}

function assertPath(pathname, expected) {
    return async (cookie = '') => {
        const response = await fetchJson(`${config.baseUrl.replace(/\/$/, '')}${pathname}`, {
            method: 'GET',
            headers: cookie ? { Cookie: cookie } : {}
        });
        const ok = expected.includes(response.status);
        return {
            path: pathname,
            status: response.status,
            body: response.body,
            passed: ok,
            requiredStatus: expected.join('|')
        };
    };
}

function extractCookie(setCookieHeader, cookieName) {
    if (!setCookieHeader) return '';
    const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
    if (!first) return '';
    const tokenPair = String(first).split(';')[0] || '';
    if (!tokenPair.includes('=')) return '';
    return tokenPair.includes(cookieName) ? tokenPair : '';
}

async function doLogin() {
    const loginResponse = await fetchJson(`${config.baseUrl.replace(/\/$/, '')}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: CUTOVER_USERNAME, password: CUTOVER_PASSWORD })
    });
    if (!loginResponse.ok) {
        throw new Error(`Login gagal: status ${loginResponse.status} body=${JSON.stringify(loginResponse.body)}`);
    }
    const cookie = extractCookie(loginResponse.headers.get('set-cookie') || loginResponse.headers.get('Set-Cookie'), AUTH_COOKIE_NAME);
    if (!cookie) {
        throw new Error('Login sukses tapi cookie sesi tidak terbaca dari Set-Cookie.');
    }
    return cookie;
}

async function compareCriticalCounts() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return {
            passed: false,
            reason: 'SUPABASE_URL / SUPABASE_KEY belum disetel. Lewatkan verifikasi count.'
        };
    }

    const reportEntries = await loadLatestReport();
    if (!Array.isArray(reportEntries) || reportEntries.length === 0) {
        return {
            passed: false,
            reason: `Report not found in ${config.reportDir}`
        };
    }

    const checks = [];
    let allGood = true;
    const headers = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact'
    };

    for (const row of reportEntries) {
        const table = row.table || row.collection;
        const reportCount = Number(row.imported ?? row.sourceCount ?? 0);
        const targetCount = await fetchSupabaseCount(table, headers);
        const passed = targetCount === reportCount;
        if (!passed) allGood = false;
        checks.push({
            table,
            sourceCount: reportCount,
            dbCount: targetCount,
            diff: targetCount - reportCount,
            passed
        });
    }

    return { passed: allGood, details: checks };
}

async function fetchSupabaseCount(table, headers) {
    const encodedTable = encodeURIComponent(table);
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${encodedTable}?select=legacy_id&limit=0`;
    const response = await fetchJson(url, { method: 'GET', headers });
    if (!response.ok) {
        throw new Error(`Count error ${table}: ${response.status}`);
    }

    const rangeHeader = response.headers.get('content-range') || '';
    const match = /\/(\d+)$/.exec(rangeHeader);
    if (match) return Number(match[1]);

    const body = response.body;
    if (Array.isArray(body)) return body.length;
    return 0;
}

async function loadLatestReport() {
    const entries = await fs.readdir(config.reportDir);
    const candidates = [];
    for (const entry of entries) {
        if (!entry.startsWith(REPORT_GLOB_PREFIX) || !entry.endsWith('.json')) continue;
        const fullPath = path.join(config.reportDir, entry);
        const stats = await fs.stat(fullPath);
        candidates.push({ fullPath, mtimeMs: stats.mtimeMs });
    }
    if (candidates.length === 0) return [];
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const latest = candidates[0].fullPath;
    const raw = await fs.readFile(latest, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.counts || [];
}

async function run() {
    config = parseArgs();
    const results = [];
    const checks = [];

    const healthChecks = [
        { name: 'GET /healthz', fn: assertPath('/healthz', [200]) },
        { name: 'GET /readyz', fn: assertPath('/readyz', [200]) },
        { name: 'GET /api/health', fn: assertPath('/api/health', [200]) },
        { name: 'GET /api/ready', fn: assertPath('/api/ready', [200]) },
        { name: 'GET /api/me (tanpa login)', fn: assertPath('/api/me', [401, 403]) }
    ];

    for (const check of healthChecks) {
        const result = await check.fn();
        results.push({
            scenario: check.name,
            status: result.status,
            passed: result.passed,
            detail: result.body
        });
    }

    const loginReady = Boolean(CUTOVER_USERNAME && CUTOVER_PASSWORD);
    let cookie = '';
    if (loginReady) {
        try {
            cookie = await doLogin();
            results.push({ scenario: 'POST /api/login', status: 200, passed: true });
        } catch (err) {
            results.push({ scenario: 'POST /api/login', status: 0, passed: false, detail: err.message });
        }
    } else {
        results.push({
            scenario: 'Login check',
            status: 0,
            passed: false,
            detail: 'SKIP: CUTOVER_USERNAME / CUTOVER_PASSWORD tidak disetel.'
        });
    }

    const authedEndpoints = [
        '/api/daftar-kerma',
        '/api/daftar-mahasiswa',
        '/api/daftar-industri',
        '/api/daftar-mitra',
        '/api/daftar-calon-peserta',
        '/api/rencana-anggaran',
        '/api/daftar-realisasi-pembayaran',
        '/api/daftar-realisasi-anggaran',
        '/api/sisa-anggaran',
        '/api/invoice-pembayaran',
        '/api/kontrak'
    ];

    if (cookie) {
        for (const path of authedEndpoints) {
            const res = await assertPath(path, [200])(cookie);
            results.push({
                scenario: `GET ${path}`,
                status: res.status,
                passed: res.passed,
                detail: res.body
            });
        }
        try {
            const me = await assertPath('/api/me', [200])(cookie);
            results.push({
                scenario: 'GET /api/me (setelah login)',
                status: me.status,
                passed: me.passed
            });
        } catch (err) {
            results.push({
                scenario: 'GET /api/me (setelah login)',
                status: 0,
                passed: false,
                detail: err.message
            });
        }
    } else {
        results.push({
            scenario: 'Endpoint berizin auth',
            status: 0,
            passed: false,
            detail: 'SKIP karena login tidak bisa dilakukan.'
        });
    }

    const countSummary = await compareCriticalCounts();
    if (countSummary.passed === false) {
        results.push({
            scenario: 'Perbandingan jumlah record dengan backup',
            status: 0,
            passed: false,
            detail: countSummary.reason || countSummary.details
        });
    } else {
        results.push({
            scenario: 'Perbandingan jumlah record dengan backup',
            status: 200,
            passed: true,
            detail: countSummary.details
        });
    }

    const failed = results.filter(item => !item.passed);
    if (failed.length > 0) {
        console.error('SMOKE TEST: GAGAL');
        console.error(JSON.stringify({ failed }, null, 2));
        if (process.argv.includes('--strict')) {
            process.exitCode = 1;
            return;
        }
        console.log(`Peringatan: ${failed.length} item belum pass. Jalankan dengan --strict untuk menegaskan kegagalan ini.`);
    } else {
        console.log('SMOKE TEST: SUKSES');
    }

    console.log(JSON.stringify(results, null, 2));
}

let config = {
    baseUrl: BASE_URL,
    reportDir: REPORT_DIR
};

run().catch(err => {
    console.error('SMOKE TEST: ERROR', err.message || err);
    process.exit(1);
});
