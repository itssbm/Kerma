const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'addendum',
    fields: ['id_program', 'no', 'nama_file', 'tgl_upload'],
    uniqueKeys: [['id_program', 'no']]
});
