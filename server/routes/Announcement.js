const express = require('express');
const { getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, getAnnouncementById } = require('../controllers/Announcement.js');

const router = express.Router();

// Route to create a new announcement
router.post('/', createAnnouncement);

// Route to get all announcements
router.get('/', getAllAnnouncements);

// Route to get an announcement by ID
router.get('/:id', getAnnouncementById);

// Route to update an announcement by ID
router.put('/:id', updateAnnouncement);

// Route to delete an announcement by ID
router.delete('/:id', deleteAnnouncement);

module.exports = router;