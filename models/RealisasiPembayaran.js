const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'realisasi_pembayaran',
    fields: [
        'id_program',
        'kode_file',
        'tanggal',
        'nominal_bruto',
        'potongan_persen',
        'nominal',
        'keterangan',
        'rencana_key',
        'rencana_tahap',
        'rencana_tanggal',
        'rencana_nominal',
        'createdAt',
        'updatedAt'
    ],
    uniqueKeys: [['rencana_key']]
});
