const createModelAdapter = require('../services/repo/modelAdapter');

module.exports = createModelAdapter({
    tableName: 'users',
    fields: ['username', 'password', 'nama', 'role', 'aktif'],
    uniqueKeys: [['username']]
});
