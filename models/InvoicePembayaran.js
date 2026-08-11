const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'invoice_pembayaran',
    fields: [
        'id_program',
        'kode_file',
        'rencana_key',
        'rencana_tahap',
        'rencana_tanggal',
        'rencana_nominal',
        'nomor_invoice',
        'tanggal_invoice',
        'status',
        'keterangan',
        'dibuat_oleh',
        'createdAt',
        'updatedAt'
    ],
    uniqueKeys: [['rencana_key']]
});
