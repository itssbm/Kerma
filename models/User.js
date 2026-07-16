const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    nama:     { type: String, default: '' },
    role:     { type: String, enum: ['admin', 'atasan'], default: 'admin' },
    aktif:    { type: Boolean, default: true }
}, { timestamps: false });

userSchema.methods.cocokkanPassword = function(plain) {
    return bcrypt.compareSync(plain, this.password);
};

module.exports = mongoose.model('User', userSchema, 'users');
