const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    itemId: {
        type: String,
        required: true,
        unique: true, // todo make sure this doesnt cause a problem if theres multiple users
        lowercase: true,
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
    },
});

const CartItem = mongoose.model('CartItem', cartItemSchema);

module.exports = CartItem;