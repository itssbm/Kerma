const bcrypt = require('bcryptjs');
const BaseRepo = require('./baseRepo');

class UserRepo extends BaseRepo {
    constructor() {
        super('users');
    }

    async findByUsername(username) {
        const cleanUsername = (username || '').trim();
        if (!cleanUsername) return null;
        return this.findOne({ username: cleanUsername, aktif: true });
    }

    comparePassword(plainPassword, hashedPassword) {
        if (!hashedPassword || !plainPassword) return false;
        return bcrypt.compareSync(String(plainPassword), String(hashedPassword));
    }
}

module.exports = UserRepo;
