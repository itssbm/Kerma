const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'realisasi_anggaran',
    fields: [
        'id_program',
        'kode_file',
        'id_rencana_anggaran',
        'sumber',
        'kategori',
        'tanggal',
        'nominal',
        'keterangan',
        'createdAt',
        'updatedAt'
    ],
    uniqueKeys: [['id_rencana_anggaran']]
});
