require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');

const USERS = [
    { username: 'admin',  password: 'admin123',  nama: 'Admin KERMA',          role: 'admin'   },
    { username: 'atasan', password: 'atasan123', nama: 'Kepala Divisi KERMA',  role: 'atasan'  },
];

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    for (const u of USERS) {
        const exists = await User.findOne({ username: u.username });
        if (exists) { console.log(`[skip] ${u.username} sudah ada.`); continue; }
        const hash = bcrypt.hashSync(u.password, 10);
        await User.create({ ...u, password: hash });
        console.log(`[ok]   ${u.username} (${u.role}) berhasil dibuat.`);
    }
    await mongoose.disconnect();
    console.log('Selesai.');
})();
