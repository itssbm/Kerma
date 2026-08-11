const path = require('path');

const configuredEnvPath = process.env.DOTENV_CONFIG_PATH
    ? path.resolve(process.cwd(), process.env.DOTENV_CONFIG_PATH)
    : path.resolve(__dirname, '.env');

require('dotenv').config({
    path: [configuredEnvPath, path.resolve(__dirname, '../.env')]
});
const { SUPABASE_URL, SUPABASE_KEY, SCHEMA } = require('./services/db/supabaseClient');

let connectInFlight = null;

async function connectDB() {
    if (connectInFlight) return connectInFlight;

    connectInFlight = (async () => {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            throw new Error('SUPABASE_URL (atau SUPABASE_PROJECT_REF) dan SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY wajib disetel.');
        }

        const hostname = new URL(SUPABASE_URL).hostname;
        console.log(`Supabase siap: ${hostname}${SCHEMA ? ` (schema=${SCHEMA})` : ''}`);
        return {
            provider: 'supabase',
            url: SUPABASE_URL,
            schema: SCHEMA || 'public'
        };
    })();

    try {
        return await connectInFlight;
    } finally {
        connectInFlight = null;
    }
}

module.exports = connectDB;
