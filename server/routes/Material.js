const express = require('express');
const { createMaterial, getMaterialById, getAllMaterials, updateMaterial, deleteMaterial } = require('../controllers/Material');

const router = express.Router();
// Route to create a new material
router.post('/', createMaterial);

// Route to get all materials
router.get('/', getAllMaterials);

// Route to get a material by ID
router.get('/:id', getMaterialById);

// Route to update a material by ID
router.put('/:id', updateMaterial);

// Route to delete a material by ID
router.delete('/:id', deleteMaterial);

module.exports = router;