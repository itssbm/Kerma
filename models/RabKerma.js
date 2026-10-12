const createModelAdapter = require('../services/repo/modelAdapter');

// RAB Kerma dibuat sebelum kontrak, sehingga sengaja dipisahkan dari RKA
// Kerma (rab_anggaran) yang sudah terhubung ke PKS/RI.
module.exports = createModelAdapter({
    tableName: 'rab_kerma',
    fields: [
        'id_mitra',
        'kegiatan',
        'detail_kegiatan',
        'item_belanja',
        'satuan',
        'volume',
        'harga_satuan',
        'total',
        'jan',
        'feb',
        'mar',
        'apr',
        'mei',
        'jun',
        'jul',
        'agu',
        'sep',
        'okt',
        'nov',
        'des',
        'total_bulanan',
        'selisih',
        'createdAt',
        'updatedAt'
    ]
});
