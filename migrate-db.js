const mongoose = require('mongoose');

const sourceUri = 'mongodb+srv://ids:kerma123@clusterkerma.lnngia2.mongodb.net/kerma?retryWrites=true&w=majority&appName=ClusterKerma';
const targetUri = 'mongodb+srv://its_db_user:kerma123@cluster-kerma.uirmrda.mongodb.net/kerma?appName=Cluster-Kerma';

async function migrate() {
  console.log('Menghubungkan ke database asal...');
  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  console.log('Koneksi ke database asal berhasil!');

  console.log('Menghubungkan ke database tujuan...');
  const targetConn = await mongoose.createConnection(targetUri).asPromise();
  console.log('Koneksi ke database tujuan berhasil!');

  // Dapatkan semua koleksi dari database asal
  const collections = await sourceConn.db.listCollections().toArray();
  const collectionNames = collections
    .map(c => c.name)
    .filter(name => !name.startsWith('system.')); // Jangan menyalin koleksi internal MongoDB

  console.log(`Menemukan ${collectionNames.length} koleksi untuk dimigrasi.`);

  for (const colName of collectionNames) {
    console.log(`\nMemigrasi koleksi: "${colName}"...`);
    
    const sourceCol = sourceConn.db.collection(colName);
    const documents = await sourceCol.find({}).toArray();
    console.log(`- Ditemukan ${documents.length} dokumen.`);

    const targetCol = targetConn.db.collection(colName);
    
    // Hapus data yang sudah ada di database tujuan untuk koleksi ini (agar bersih)
    await targetCol.deleteMany({});
    console.log(`- Koleksi tujuan dibersihkan.`);

    if (documents.length > 0) {
      await targetCol.insertMany(documents);
      console.log(`- Berhasil menyalin ${documents.length} dokumen.`);
    } else {
      console.log(`- Koleksi kosong, dilewati.`);
    }
  }

  console.log('\nMigrasi data berhasil diselesaikan!');
  await sourceConn.close();
  await targetConn.close();
}

migrate().catch(err => {
  console.error('\nMigrasi Gagal:', err);
  process.exit(1);
});
