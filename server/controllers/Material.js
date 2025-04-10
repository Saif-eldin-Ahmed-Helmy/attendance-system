import Material from '../models/Material.js';
import Subject from '../models/Subject.js';

const createMaterial = async (req, res) => {
    try {
        const { name, subjectId, link } = req.body;

        if (!name || !subjectId || !link) {
            return res.status(400).json({ message: 'Name, subjectId and link are required' });
        }

        const material = new Material({ name, subjectId, link });
        await material.save();

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        res.status(201).json(material);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getMaterialById = async (req, res) => {
    try {
        const { id } = req.params;
        if(!id){
            return res.status(400).json({message: 'Material id is required'})
        }

        const material = await Material.findById(id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        res.status(200).json(material);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getAllMaterials = async (req, res) => {
    try {
        const materials = await Material.find().populate('subjectId', 'name');
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subjectId, link } = req.body;

        if (!name || !subjectId || !link) {
            return res.status(400).json({ message: 'Name, subjectId and link are required' });
        }

        const material = await Material.findByIdAndUpdate(id, { name, subjectId, link }, { new: true });
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        res.status(200).json(material);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        if(!id){
            return res.status(400).json({message: 'Material id is required'})
        }

        const material = await Material.findByIdAndDelete(id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        res.status(200).json({ message: 'Material deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export {
    createMaterial,
    getMaterialById,
    getAllMaterials,
    updateMaterial,
    deleteMaterial
}