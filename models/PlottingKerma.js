const mongoose = require('mongoose');

const plottingKermaSchema = new mongoose.Schema({
    userId: { type: String, default: 'admin', index: true },
    source: { type: String, default: 'app' },
    version: { type: Number, default: 1 },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    note: { type: String, default: '' },
    importedAt: { type: Date, default: null }
}, {
    strict: false,
    timestamps: true
});

module.exports = mongoose.model('PlottingKerma', plottingKermaSchema, 'plotting_kerma');
