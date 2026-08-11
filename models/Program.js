const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'programs',
    fields: [
        'id_program',
        'nama_mitra',
        'no_kontrak_institusi',
        'no_kontrak_mitra',
        'judul_pks',
        'tgl_kontrak',
        'tgl_akhir_kontrak',
        'nilai_kontrak',
        'kode_file',
        'file_kontrak',
        'jumlah_mahasiswa',
        'cara_pembayaran',
        'tipe_cicilan',
        'batas_akhir_pembayaran',
        'harga_per_mahasiswa',
        'strata',
        'status_alokasi'
    ],
    uniqueKeys: [['id_program']]
});
