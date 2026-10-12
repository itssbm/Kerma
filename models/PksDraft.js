const createModelAdapter = require('../services/repo/modelAdapter');

// Draft generator PKS disimpan terpisah dari kontrak lama agar form baru dapat
// berkembang tanpa mengubah alur Kontrak / PKS yang sudah berjalan.
module.exports = createModelAdapter({
    tableName: 'pks_drafts',
    fields: [
        'id_pks_draft',
        'kategori_pks',
        'judul_perjanjian_tambahan',
        'nama_pihak_1',
        'nama_pihak_2',
        'status',
        'data',
        'dibuat_oleh',
        'diperbarui_oleh',
        'createdAt',
        'updatedAt'
    ],
    uniqueKeys: [['id_pks_draft']]
});
