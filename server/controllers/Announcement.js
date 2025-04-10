const Announcement = require('../models/Announcement');

const createAnnouncement = async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: 'Title, content are required' });
        }

        const announcement = new Announcement({ title, content });
        await announcement.save();

        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getAnnouncementById = async (req, res) => {
    try {
        const { id } = req.params;
        if(!id){
            return res.status(400).json({message: 'Announcement id is required'})
        }

        const announcement = await Announcement.findById(id);
        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.status(200).json(announcement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find();
        res.status(200).json(announcements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;

        if(!id || !title || !content){
            return res.status(400).json({message: 'Announcement id is required'})
        }

        const announcement = await Announcement.findByIdAndUpdate(
            id, 
            { title, content, lastUpdatedAt: new Date()}, 
            { new: true }
        );
        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.status(200).json(announcement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        if(!id){
            return res.status(400).json({message: 'Announcement id is required'})
        }

        const announcement = await Announcement.findByIdAndDelete(id);
        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.status(200).json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    createAnnouncement,
    getAnnouncementById,
    getAllAnnouncements,
    updateAnnouncement,
    deleteAnnouncement
};