const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'pagu_anggaran',
    fields: [
        'id_program',
        'kode_file',
        'pagu_pegawai',
        'pagu_barang',
        'pagu_jasa',
        'pagu_modal',
        'sisa_pagu_total',
        'createdAt',
        'updatedAt'
    ],
    uniqueKeys: [['kode_file']]
});
