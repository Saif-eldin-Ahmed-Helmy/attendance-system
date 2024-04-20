const express = require('express');
const router = express.Router();
const CartItem = require('../models/CartItem');
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require("../middlewares/attachUserData");
const { handleServerError, handleBadRequest } = require('../handlers/error');
const Item = require("../models/Item");

router.use(verifySession);
router.use((req, res, next) => attachUserDataToRequest(req, res, next, ['shoppingCart']));

router.get('/', async (req, res) => {
    try {
        let items = [];
        for (const cartItem of req.user.shoppingCart) {
            const item = await Item.findOne({ itemId: cartItem.itemId });
            if (!item || item.deleted) {
                req.user.shoppingCart.pull(cartItem);
                await CartItem.deleteOne({ _id: cartItem._id });
            }
            items.push({ itemId: item.itemId, description: item.description, picture: item.picture, name: item.name, pricePerItem: item.price, quantity: cartItem.quantity });
        }
        res.json(items);
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.post('/', async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        if (!itemId) {
            return handleBadRequest(res);
        }

        const existingItem = req.user.shoppingCart.find(cartItem => cartItem.itemId === itemId);
        if (existingItem) {
            existingItem.quantity += quantity || 1;
            await existingItem.save();
        } else {
            const newItem = await CartItem.create({ itemId, quantity: quantity || 1 });
            req.user.shoppingCart.push(newItem);
            await req.user.save();
        }

        res.json(req.user.shoppingCart);
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.delete('/', async (req, res) => {
    try {
        const { itemId, removeFromBasket } = req.body;
        if (!itemId) {
            return handleBadRequest(res);
        }

        const cartItemIndex = req.user.shoppingCart.findIndex(cartItem => cartItem.itemId === itemId);

        if (cartItemIndex !== -1) {
            const cartItem = req.user.shoppingCart[cartItemIndex];
            if (removeFromBasket || cartItem.quantity === 1) {
                req.user.shoppingCart.splice(cartItemIndex, 1);
                await CartItem.deleteOne({ _id: cartItem._id });
            } else {
                cartItem.quantity--;
                await cartItem.save();
            }

            await req.user.save();
        }

        res.json(req.user.shoppingCart);
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.put('/', async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        if (!itemId || !quantity) {
            return handleBadRequest(res);
        }

        const cartItem = req.user.shoppingCart.find(cartItem => cartItem.itemId === itemId);
        if (cartItem) {
            cartItem.quantity = quantity;
            await cartItem.save();
        }

        res.json(req.user.shoppingCart);
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

module.exports = router;