const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'rencana_anggaran',
    fields: [
        'id_program',
        'kode_file',
        'tanggal_ri',
        'tanggal_realisasi_ri',
        'tgl_invoice',
        'no_invoice',
        'uraian',
        'kategori_belanja',
        'ri',
        'pemasukan',
        'pengeluaran_ri',
        'sumber',
        'id_rab',
        'id_realisasi_anggaran_lama',
        'createdAt',
        'updatedAt'
    ]
});
