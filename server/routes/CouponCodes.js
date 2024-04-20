const express = require('express');
const router = express.Router();

const CouponCode = require("../models/CouponCode");
const Item = require("../models/Item");

const { handleBadRequest, handleUnauthorized, handleServerError } = require("../handlers/error");
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require("../middlewares/attachUserData");

router.use(verifySession)
router.use(attachUserDataToRequest);

router.get("/", async(req, res) => {
    try {
        if(!req.role === 'admin') return handleUnauthorized(res);

        const code = req.query.code;
    
        const codes = await CouponCode.find({ code: code || { $exists: true }});
        res.json({ codes });
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
})

router.post("/", async(req, res) => {
    try {
        if(!req.role === 'admin') return handleUnauthorized(res);

        const code = await CouponCode.findOne({ code: req.body.code });
        if(code) return handleBadRequest(res, 'coupon code with that id already exists');
    
        const newCode = await CouponCode.create(req.body);
        res.json({ newCode })
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
})

router.put("/", async(req, res) => {
    try {
        if(!req.role === 'admin') return handleUnauthorized(res);

        const { code, expiryDate, discount, discountType, couponType, itemId, maximumAmount } = req.body;
        
        const coupon = await CouponCode.findOne({ code });
        if(!coupon) return handleBadRequest(res, 'there is no coupon code with that id to update');

        coupon.code = code;
        coupon.expiryDate = expiryDate;
        coupon.discount = discount;
        coupon.discountType = discountType;
        coupon.couponType = couponType;
        coupon.itemId = itemId;
        coupon.maximumAmount = maximumAmount;

        await coupon.save();
        res.json({ coupon });
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
})

module.exports = router;