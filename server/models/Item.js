const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    itemId: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    name: {
        type: String,
        required: true,
    },
    picture: {
        type: String,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    subCategory: {
        type: String,
        required: true,
    },
    deleted: {
        type: Boolean,
        default: false
    }
});

const Item = mongoose.model('Item', itemSchema);

itemSchema.pre('save', function (next) {
    const item = this;
    item.itemId = item.itemId.replace('+', '');
    next();
});

module.exports = Item;