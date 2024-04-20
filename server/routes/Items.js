const express = require('express');
const router = express.Router();

const Items = require("../models/Item");
const { handleUnauthorized, handleBadRequest, handleServerError} = require("../handlers/error");
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require("../middlewares/attachUserData");
const stringSimilarity = require('string-similarity');
const User = require("../models/User");

/**
 * Query options
 * - category
 * - inStock
 * - priceMin
 * - priceMax
 * - itemId
 * - limit
 *
 * Examples:
 * - example.com/items?category=dogs&inStock=true&priceMin=50&priceMax=150&limit=24
 * - example.com/items?itemId=465
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 1000, category, subCategory, itemId, similarTo, page = 1 } = req.query
        const inStock = req.query.inStock === 'true';
        const priceMin = req.query.priceMin || 0;
        const priceMax = req.query.priceMax || 1000000;
        const deleted = req.query.deleted === 'true';
        const favorites = req.query.favorites === 'true';

        if (deleted) {
            if (!req.isAuthenticated() || !req.user) {
                return handleUnauthorized(res);
            }
            const {role} = req.user;
            if (role !== 'admin') {
                return handleUnauthorized(res);
            }
        }

        let query = {
            deleted: deleted === false ? false : {$exists: true},
            itemId: itemId || {$exists: true},
            category: category || {$exists: true},
            subCategory: subCategory || {$exists: true},
            stock: inStock ? {$gt: 0} : {$gte: 0},
            price: {$gte: priceMin, $lte: priceMax}
        };

        if (favorites) {
            if (!req.isAuthenticated() || !req.user) {
                return handleUnauthorized(res);
            }
            const user = await User.findOne({email: req.user.email});
            query.itemId ={$in: user.favorites};
        }

        const similarItem = await Items.findOne({itemId: similarTo});
        if (similarTo) {
            if (similarItem) {
                query.itemId = {$ne: similarTo};
            }
        }
        
        let items = await Items.find(query);

        if (similarTo) {
            if (similarItem) {
                items = items.filter(item => {
                    const similarity = stringSimilarity.compareTwoStrings(similarItem.name, item.name);
                    return similarity >= 0.6 || (item.category === similarItem.category && item.subCategory === similarItem.subCategory);
                });

                items.sort((a, b) => {
                    const similarityToA = stringSimilarity.compareTwoStrings(similarItem.name, a.name);
                    const similarityToB = stringSimilarity.compareTwoStrings(similarItem.name, b.name);
                    return similarityToB - similarityToA;
                });
            }
        }
        let itemCount = await Items.countDocuments(query);
        let maxPages = Math.ceil(itemCount / limit);

        items = iitems = items.slice((page - 1) * limit, page * limit);

        res.json({items: items, maxPages: maxPages});
    }
    catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.use(verifySession);
router.use(attachUserDataToRequest);

router.post('/', async (req, res) => {
    try {
        const role = req.role;
        if (role !== 'admin') {
            return handleUnauthorized(res);
        }

        const {itemId, name, picture, stock, price, description, category, subCategory, deleted} = req.body;

        const existingItem = await Items.findOne({itemId});
        if (existingItem) {
            return handleBadRequest(res, "Item with that ID already exists");
        }

        const newItem = await Items.create({itemId, name, picture, stock, price, description, category, subCategory, deleted});

        res.json({newItem});
    }
    catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.put('/', async (req, res) => {
    try {
        const role = req.role;
        if (role !== 'admin') {
            return handleUnauthorized(res);
        }

        const {oldItemId, itemId, name, picture, stock, price, description, category, subCategory, deleted} = req.body;

        const existingItem = await Items.findOne({itemId: oldItemId});
        if (!existingItem) {
            return handleItemNotFound(res);
        }

        const updatedItem = await Items.findOneAndUpdate({itemId: oldItemId}, {itemId, name, picture, stock, price, description, category, subCategory, deleted});

        res.json({updatedItem});
    }
    catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.delete('/', async (req, res) => {
    try {
        const role = req.role;
        if (role !== 'admin') {
            return handleUnauthorized(res);
        }

        const itemId = req.body.itemId;
        const existingItem = await Items.findOne({itemId});
        if (!existingItem) {
            return handleBadRequest(res, "Item with that ID does not exists");
        }

        const updatedItem = await Items.findOneAndUpdate({itemId}, {deleted: true});

        res.json({deleted: true});
    }
    catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

module.exports = router;