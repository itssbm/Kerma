require('dotenv').config();

const SUPABASE_URL = (process.env.SUPABASE_URL || (process.env.SUPABASE_PROJECT_REF && `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`))
    ?.replace(/\/+$/g, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL (atau SUPABASE_PROJECT_REF) dan SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY wajib diisi.');
}

const SCHEMA = process.env.SUPABASE_SCHEMA || 'public';

function createHeaders() {
    return {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
    };
}

function parseJsonResponse(responseText) {
    if (!responseText) return null;
    try {
        return JSON.parse(responseText);
    } catch {
        return responseText;
    }
}

async function request(path, options = {}) {
    const { method = 'GET', query = {}, body = null, headers = {}, timeoutMs = 30000 } = options;

    const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        url.searchParams.set(key, String(value));
    });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
        const response = await fetch(url.toString(), {
            method,
            headers: {
                ...createHeaders(),
                ...headers
            },
            body: body == null ? undefined : JSON.stringify(body),
            signal: ctrl.signal
        });

        const text = await response.text();
        const data = parseJsonResponse(text);

        if (!response.ok) {
            const message = typeof data === 'string' ? data : JSON.stringify(data || {});
            const error = new Error(`Supabase request gagal: ${response.status} ${response.statusText}: ${message}`);
            error.status = response.status;
            error.body = data;
            throw error;
        }

        return {
            data,
            count: response.headers.get('content-range') || null,
            headers: response.headers,
            raw: response
        };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = {
    request,
    SCHEMA,
    SUPABASE_URL,
    SUPABASE_KEY
};
