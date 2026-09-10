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
        'dpi_sudah_disimpan',
        'keterangan',
        'rencana_key',
        'rencana_tahap',
        'rencana_tanggal',
        'rencana_nominal',
        'bkm_sudah_disimpan',
        'bkm_nomor',
        'bkm_tanggal',
        'bkm_jumlah',
        'bkm_nama_bank',
        'bkm_no_rekening',
        'bkm_nama_rekening',
        'bkm_nama_unit',
        'bkm_no_bukti',
        'bkm_uraian',
        'bkm_dibuat_oleh',
        'bkm_disimpan_pada',
        'createdAt',
        'updatedAt'
    ],
    uniqueKeys: [['rencana_key']]
});
