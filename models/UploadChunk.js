const mongoose = require('mongoose');

const uploadChunkSchema = new mongoose.Schema({
    uploadId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    kind: {
        type: String,
        required: true,
        enum: ['kontrak', 'addendum', 'import_mahasiswa', 'import_calon_peserta']
    },
    idProgram: { type: String, required: true, trim: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    chunkIndex: { type: Number, required: true },
    totalChunks: { type: Number, required: true },
    data: { type: Buffer, required: true },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 60 * 60 * 1000),
        expires: 0
    }
}, {
    timestamps: true
});

uploadChunkSchema.index(
    { uploadId: 1, userId: 1, chunkIndex: 1 },
    { unique: true }
);

module.exports = mongoose.model('UploadChunk', uploadChunkSchema, 'upload_chunks');
