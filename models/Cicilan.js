const mongoose = require('mongoose');

const cicilanSchema = new mongoose.Schema({
    id_program: { type: String, required: true, trim: true },
    no_cicilan: { type: Number, required: true },
    label:      { type: String, default: '' },
    nominal:    { type: Number, default: 0 },
    batas_akhir:{ type: String, default: '' }
}, { timestamps: false });

module.exports = mongoose.model('Cicilan', cicilanSchema, 'cicilan');
