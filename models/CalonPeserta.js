const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'calon_peserta',
    fields: ['id_program', 'no_seleksi', 'nama_lengkap'],
    uniqueKeys: [['id_program', 'no_seleksi']]
});
