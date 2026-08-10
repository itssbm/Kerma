const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'upload_chunks',
    fields: [
        'uploadId',
        'userId',
        'kind',
        'idProgram',
        'fileName',
        'fileSize',
        'chunkIndex',
        'totalChunks',
        'data',
        'expiresAt',
        'createdAt',
        'updatedAt'
    ],
    uniqueKeys: [['uploadId', 'userId', 'chunkIndex']],
    normalizeIn(doc = {}) {
        if (Buffer.isBuffer(doc.data)) {
            doc.data = doc.data.toString('base64');
        }
        if (doc.expiresAt instanceof Date) {
            doc.expiresAt = doc.expiresAt.toISOString();
        }
        return doc;
    },
    normalizeOut(doc = {}) {
        if (typeof doc.data === 'string') {
            doc.data = Buffer.from(doc.data, 'base64');
        }
        return doc;
    }
});
