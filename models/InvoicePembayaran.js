const mongoose = require('mongoose');

const invoicePembayaranSchema = new mongoose.Schema({
    id_program:      { type: String, required: true, trim: true },
    kode_file:       { type: String, required: true, trim: true },
    rencana_key:     { type: String, required: true, trim: true },
    rencana_tahap:   { type: String, default: '', trim: true },
    rencana_tanggal: { type: String, default: '', trim: true },
    rencana_nominal: { type: Number, required: true, default: 0 },
    nomor_invoice:   { type: String, required: true, trim: true },
    tanggal_invoice: { type: String, required: true, trim: true },
    status:          { type: String, enum: ['draft', 'dibuat', 'dibatalkan'], default: 'dibuat' },
    keterangan:      { type: String, default: '', trim: true },
    dibuat_oleh:     { type: String, default: '', trim: true }
}, { timestamps: true });

invoicePembayaranSchema.index({ rencana_key: 1 }, { unique: true });
invoicePembayaranSchema.index({ kode_file: 1, rencana_tanggal: 1 });
invoicePembayaranSchema.index({ tanggal_invoice: 1, createdAt: 1 });

module.exports = mongoose.model('InvoicePembayaran', invoicePembayaranSchema, 'invoice_pembayaran');
