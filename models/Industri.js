const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'industri',
    fields: ['kode_kategori', 'nama_sektor', 'contoh_ruang_lingkup'],
    uniqueKeys: [['kode_kategori']]
});
