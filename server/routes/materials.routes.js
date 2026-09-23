const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require('../middlewares/attachUserData');
const { requireVerifiedRole } = require('../middlewares/access');
const materialController = require('../controllers/material.controller');
router.use(verifySession, attachUserDataToRequest, requireVerifiedRole);

// Route to create a new material
router.post('/', materialController.createMaterial);

// Route to get all materials
router.get('/', materialController.getAllMaterials);

// Route to get a material by ID
router.get('/:id', materialController.getMaterialById);

// Route to update a material by ID
router.put('/:id', materialController.updateMaterial);

// Route to delete a material by ID
router.delete('/:id', materialController.deleteMaterial);

module.exports = router;
