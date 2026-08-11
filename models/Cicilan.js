const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'cicilan',
    fields: ['id_program', 'no_cicilan', 'label', 'nominal', 'batas_akhir'],
    uniqueKeys: [['id_program', 'no_cicilan']]
});
