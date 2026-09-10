const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'rab_anggaran',
    fields: [
        'id_program',
        'kode_file',
        'uraian',
        'kategori_belanja',
        'satuan',
        'harga_satuan',
        'volume',
        'keterangan',
        'sumber',
        'id_pengajuan',
        'simulation_id',
        'simulation_name',
        'createdAt',
        'updatedAt'
    ]
});
