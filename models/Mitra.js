const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'mitra',
    fields: ['id_mitra', 'nama_mitra', 'industri', 'alamat', 'provinsi', 'kota', 'negara'],
    uniqueKeys: [['id_mitra']]
});
