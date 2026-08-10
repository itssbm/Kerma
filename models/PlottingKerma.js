const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'plotting_kerma',
    fields: ['userId', 'source', 'version', 'payload', 'note', 'importedAt', 'createdAt', 'updatedAt']
});
