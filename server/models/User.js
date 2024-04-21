const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
    },
    preferredLanguage: {
        type: String,
        default: 'en',
        enum: ['en', 'ar'],
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    role: {
        type: String,
        default: 'unverified',
        enum: ['management', 'doctor', 'teaching assistant', 'unverified'],
        required: true
    },
    subjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }],
    password: {
        type: String,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
    },
    dateOfBirth: {
        type: String,
    },
    deleted: {
        type: Boolean,
        default: false,
    },
});

userSchema.pre('save', async function(next) {
    const user = this;

    if (!user.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;