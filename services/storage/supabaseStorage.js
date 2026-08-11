const fs = require('fs');
const os = require('os');
const path = require('path');
const { SUPABASE_URL, SUPABASE_KEY, request } = require('../db/supabaseClient');

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'kerma-uploads';
const METADATA_TABLE = process.env.SUPABASE_UPLOADS_METADATA_TABLE || 'kerma_uploads_files';

let metadataTableWarningShown = false;

function storageHeaders(extra = {}) {
    return {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        ...extra
    };
}

function encodeObjectPath(objectPath = '') {
    return String(objectPath)
        .split('/')
        .filter(Boolean)
        .map((part) => encodeURIComponent(part))
        .join('/');
}

async function uploadObject(objectPath, buffer, options = {}) {
    const encodedPath = encodeObjectPath(objectPath);
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(STORAGE_BUCKET)}/${encodedPath}`, {
        method: 'POST',
        headers: storageHeaders({
            'Content-Type': options.contentType || 'application/octet-stream',
            'x-upsert': 'true'
        }),
        body: buffer
    });

    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        throw new Error(`Supabase Storage upload gagal: ${response.status} ${response.statusText}: ${typeof data === 'string' ? data : JSON.stringify(data || {})}`);
    }

    return data;
}

async function downloadObject(objectPath) {
    const encodedPath = encodeObjectPath(objectPath);
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/${encodeURIComponent(STORAGE_BUCKET)}/${encodedPath}`, {
        method: 'GET',
        headers: storageHeaders()
    });

    if (response.status === 404) return null;
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase Storage download gagal: ${response.status} ${response.statusText}: ${text}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
        buffer: Buffer.from(arrayBuffer),
        contentType: response.headers.get('content-type') || 'application/octet-stream'
    };
}

async function persistFileMetadata(record = {}) {
    try {
        await request(METADATA_TABLE, {
            method: 'POST',
            query: {
                columns: 'bucket_name,object_path,kind,id_program,original_name,stored_name,mime_type,size_bytes,uploaded_by,uploaded_at',
                on_conflict: 'bucket_name,object_path'
            },
            headers: {
                Prefer: 'resolution=merge-duplicates,return=minimal'
            },
            body: [{
                bucket_name: STORAGE_BUCKET,
                object_path: record.object_path,
                kind: record.kind || '',
                id_program: record.id_program || '',
                original_name: record.original_name || '',
                stored_name: record.stored_name || '',
                mime_type: record.mime_type || 'application/octet-stream',
                size_bytes: Number(record.size_bytes) || 0,
                uploaded_by: record.uploaded_by || '',
                uploaded_at: record.uploaded_at || new Date().toISOString()
            }]
        });
    } catch (err) {
        if (!metadataTableWarningShown) {
            metadataTableWarningShown = true;
            console.warn(`Metadata upload file dilewati: ${err?.message || err}`);
        }
    }
}

async function uploadAppFile({ kind, storedName, originalName, idProgram, uploadedBy, buffer, mimeType }) {
    const objectPath = `${kind}/${storedName}`;
    await uploadObject(objectPath, buffer, { contentType: mimeType });
    await persistFileMetadata({
        object_path: objectPath,
        kind,
        id_program: idProgram,
        original_name: originalName,
        stored_name: storedName,
        mime_type: mimeType,
        size_bytes: buffer.length,
        uploaded_by: uploadedBy || '',
        uploaded_at: new Date().toISOString()
    });
    return storedName;
}

async function streamAppFileToResponse(res, { kind, storedName, fallbackPath, setDownloadHeaders }) {
    const baseName = path.basename(storedName || '');
    if (!baseName) return { found: false };

    if (fallbackPath && fs.existsSync(fallbackPath)) {
        const mimeType = path.extname(baseName) ? undefined : 'application/octet-stream';
        setDownloadHeaders(res, baseName, mimeType);
        res.send(fs.readFileSync(fallbackPath));
        return { found: true };
    }

    const downloaded = await downloadObject(`${kind}/${baseName}`);
    if (!downloaded) return { found: false };
    setDownloadHeaders(res, baseName, downloaded.contentType);
    res.send(downloaded.buffer);
    return { found: true };
}

async function prepareAppPdfLocal({ kind, storedName }) {
    const baseName = path.basename(storedName || '');
    if (!baseName) return null;
    const downloaded = await downloadObject(`${kind}/${baseName}`);
    if (!downloaded) return null;

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kerma-storage-'));
    const outputPath = path.join(outputDir, baseName);
    fs.writeFileSync(outputPath, downloaded.buffer);
    return {
        path: outputPath,
        cleanup: () => fs.rmSync(outputDir, { recursive: true, force: true })
    };
}

module.exports = {
    STORAGE_BUCKET,
    uploadAppFile,
    streamAppFileToResponse,
    prepareAppPdfLocal
};
