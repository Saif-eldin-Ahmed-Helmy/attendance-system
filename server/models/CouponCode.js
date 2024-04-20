const mongoose = require("mongoose");

const couponCode = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    expiryDate: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    discountType: {
        type: String,
        default: 'percentage',
        enum: ['percentage', 'amount']
    },
    couponType: {
        type: String,
        default: 'order',
        enum: ['order', 'item'] //whether the discount on the whole order or just one item
    },
    itemId: {
        type: String
    },
    maximumAmount: {
        type: Number,
    },
    deleted: {
        type: Boolean,
        default: false
    }
})

const couponCodes = mongoose.model('CouponCode', couponCode);

module.exports = couponCodes;