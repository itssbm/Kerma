const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'mahasiswa',
    fields: [
        'id_program',
        'nim',
        'nama',
        'fakultas',
        'prodi',
        'tahun_masuk',
        'semester_masuk',
        'dosen_wali',
        'status',
        'sks_lulus',
        'ipk',
        'pembimbing_1',
        'pembimbing_2'
    ],
    uniqueKeys: [['id_program', 'nim']]
});
