const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const locationSchema = new mongoose.Schema({
    locationId: {
        type: String,
        required: true,
        lowercase: true,
    },
    locationSignature: { // this will be a fingerprint for the location of the user, probably gonna use longitude and latitude, when we get in a group call we can discuss this
        type: String,
        //required: true,
    },
    apartmentNumber: {
        type: String,
        required: true,
    },
    floorNumber: {
        type: Number,
        required: true,
    },
    streetName: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    active: {
        type: Boolean,
    },
    deleted: {
        type: Boolean,
        default: false
    }
});

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
        default: 'user',
        enum: ['user', 'driver', 'packageer', 'admin', 'support', 'doctor'],
    },
    password: {
        type: String,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    locations: [locationSchema],
    orders: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Order',
    },
    shoppingCart: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'CartItem',
    },
    chats: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Chat',
    },
    balance: {
        type: Number,
        default: 0,
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
    favorites: {
        type: [String], // Array of itemIds
        default: [],
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