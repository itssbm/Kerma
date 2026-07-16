const mongoose = require('mongoose');

const addendumSchema = new mongoose.Schema({
    id_program: { type: String, required: true, trim: true },
    no:         { type: Number, required: true },
    nama_file:  { type: String, default: '' },
    tgl_upload: { type: String, default: '' }
}, { timestamps: false });

module.exports = mongoose.model('Addendum', addendumSchema, 'addendum');
