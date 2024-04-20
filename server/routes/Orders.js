const express = require('express');
const router = express.Router();

const Order = require("../models/Order");
const Item = require("../models/Item");
const CouponCode = require("../models/CouponCode");
const CartItem = require("../models/CartItem");

const { handleBadRequest } = require("../handlers/error");
const { getMilliSeconds } = require("../utils/timeUtils");
const { newId } = require("../utils/numberUtils");
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require("../middlewares/attachUserData");

router.use(verifySession)
router.use((req, res, next) => attachUserDataToRequest(req, res, next, ['orders', 'shoppingCart']));

router.get("/", async (req, res) => {
    const { orderId, traceType, itemId, itemCategory, couponCode, city } = req.query;
    const role = req.role;

    if(orderId) {
        const hasOrder = req.user.orders.find(order => order.orderId === orderId);
        if(!hasOrder && role !== 'admin') {
            handleBadRequest(res, `There is no order with the id ${orderId}`)
            return;
        }

        const order = await Order.find({ orderId: orderId });
        res.json({ order });
        return;
    }

    const orders = (role === 'admin') ? await Order.find() : req.user.orders;
    const filteredOrders = orders.filter(order => {
        return (!traceType || order.trace.some(trace => trace.type === traceType)) &&
            (!itemId || order.items.some(item => item.itemId === itemId)) &&
            (!itemCategory || order.items.some(item => item.category === itemCategory)) &&
            (!couponCode || order.couponCodes.some(coupon => coupon.code === couponCode)) &&
            (!city || order.location.city === city);
    });

    res.json({ filteredOrders })
})

router.post("/", async(req, res) => {
    try {
        const executor = req.email;
        const {paymentMethod, locationId, deliveryInstructions, tip, couponCodes = []} = req.body;
        const orderId = newId();
        let amount = 0;
        let finalAmount = 0;

        const location = req.user.locations.find(loc => loc.locationId === locationId);
        if (!location) return handleBadRequest(res, `There is no location with the id ${locationId}`);

        const items = [];
        const couponData = [];

        for (const item of req.user.shoppingCart) {
            const itemData = await Item.findOne({itemId: item.itemId});

            if (item.quantity > itemData.stock || itemData.deleted) {
                return handleBadRequest(res, `There isn't enough stock for ${itemData.name}`);
            }

            items.push({
                itemId: item.itemId,
                name: itemData.name,
                quantity: item.quantity,
                pricePerItem: itemData.price,
                category: itemData.category,
                subCategory: itemData.subCategory,
                picture: itemData.picture,
            });

            amount += itemData.price * item.quantity;
            finalAmount += itemData.price * item.quantity;

            itemData.stock -= item.quantity;
            await itemData.save();
        }

        for (const code of couponCodes) {
            const data = await CouponCode.findOne({code});

            if (Number(data.expiryDate) > getMilliSeconds() || data.deleted) {
                return handleBadRequest(res, `Coupon code ${code} is invalid`);
            }

            couponData.push({
                code: code,
                expiryDate: data.expiryDate,
                discount: data.discount,
                discountType: data.discountType,
                couponType: data.couponType,
                itemId: data.itemId ? data.itemId : 0,
                maximumAmount: data.maximumAmount ? data.maximumAmount : 0
            })

            if (data.discountType === "percentage" && data.couponType === "order") {
                const discount = finalAmount * (data.discount / 100);
                finalAmount -= (discount > data.maximumAmount ? data.maximumAmount : discount);
            } else if (data.discountType === "percentage" && data.couponType === "item") {
                const item = items.find(item => item.itemId === data.itemId);
                const discount = (item.pricePerItem * item.quantity) * (data.discount / 100);
                if (item) finalAmount -= (discount > data.maximumAmount ? data.maximumAmount : discount);
            } else if (data.discountType === "amount" && data.couponType === "order") {
                finalAmount -= data.discount;
            } else if (data.discountType === "amount" && data.couponType === "item") {
                const item = items.find(item => item.itemId === data.itemId);
                const discount = (item.pricePerItem * item.quantity) - (data.discount * item.quantity);
                if (item) finalAmount -= (discount > data.maximumAmount ? data.maximumAmount : discount);
            }
        }

        const deliveryFee = 20;
        const grandTotal = Number(amount + deliveryFee + (String(tip).startsWith('-') ? 0 : Number(tip)));

        let cashAmount = 0;
        if (paymentMethod === 'balance') {
            const grandTotalWithBalance = Number(amount + deliveryFee + tip - Math.min(grandTotal, req.user.balance));
            cashAmount = grandTotalWithBalance;
            finalAmount = grandTotal;
            req.user.balance -= grandTotalWithBalance;
            console.log('Payment method is balance', cashAmount, finalAmount);
        }
        else {
            cashAmount = grandTotal;
        }
        console.log(cashAmount, finalAmount, grandTotal, amount, deliveryFee, tip);

        const newOrder = await Order.create({
            orderId: orderId,
            trace: {
                type: "placed",
                date: new Date().toISOString(),
                executor: executor,
                active: true
            },
            date: new Date().toISOString(),
            items: items,
            couponCodes: couponData,
            location: location,
            amount: amount,
            finalAmount: finalAmount,
            cashAmount: cashAmount,
            paymentMethod: paymentMethod,
            deliveryInstructions: deliveryInstructions,
            tip: tip,
        });

        req.user.orders.push(newOrder);
        for (const item of req.user.shoppingCart) {
            const cartItem = await CartItem.findOneAndDelete({_id: item._id});
        }
        req.user.shoppingCart = [];
        await req.user.save();
        res.json({ success: true, order: newOrder });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
})

router.put("/", async(req, res) => {
    const { orderId, traceType, rating, comment, userRating, userComment, driverRating, driverComment } = req.body;
    const executor = req.email;

    const order = await Order.findOne({ orderId });
    if(!order) return handleBadRequest(res, `no order with this id, ${orderId}`);

    if(traceType) {
        if(traceType === 'packed' && (req.role === 'packager' || req.role === 'admin')) {
            order.trace.push({
                type: traceType,
                date: new Date().toISOString(),
                executor: executor,
                active: true
            })
        }
    } else if (rating || comment || userRating || userComment) {
        if((order.trace.find(trace => trace.active === true).type === 'delivered')
            && ((req.user.orders.find(order => order.orderId === orderId))
            && req.role === 'admin')) {
            order.rating = rating;
            order.comment = comment;
            order.userRating = userRating;
            order.userComment = userComment;
        }
    } else if(driverRating || driverComment) {
        if((order.trace.find(trace => trace.type === 'delivering').executor === req.email)) {
            order.driverRating = driverRating;
            order.driverComment = driverComment;
        }
    }

    await order.save();
    return res.json({ order });
})

router.get('/test', async (req, res) => {
    try {
        const items = await Item.find({ stock: { $gte: 10 }, deleted: false });

        const orderItems = items.map(item => ({
            itemId: item.itemId,
            name: item.name,
            quantity: 10,
            pricePerItem: item.price,
            category: item.category,
            subCategory: item.subCategory,
            picture: item.picture
        }));

        const amount = orderItems.reduce((total, item) => total + (item.quantity * item.pricePerItem), 0);

        const orderTrace = {
            type: 'placed',
            date: new Date().toISOString(),
            executor: 'admin',
            active: true,
        };

        const order = Order.create({
            orderId: newId(),
            date: new Date().toISOString(),
            items: orderItems,
            amount: amount,
            finalAmount: amount,
            trace: [orderTrace],
            location: {
                locationId: '12345',
                city: 'Nasr City',
                locationSignature: 'Nasr City, Cairo, Egypt',
                apartmentNumber: 10,
                floorNumber: 5,
                streetName: 'El Nasr Street',
                phoneNumber: '01154152523',
            },
        });

        req.user.orders.push(order);
        await req.user.save();

        res.json({ success: true, order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;