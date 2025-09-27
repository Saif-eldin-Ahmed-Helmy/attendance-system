const express = require('express');
const router = express.Router();
const { verifySession, attachUserDataToRequest } = require('../middlewares/auth');
const announcementController = require('../controllers/announcement.controller');

// Route to create a new announcement
router.post('/', announcementController.createAnnouncement);

// Route to get all announcements
router.get('/', announcementController.getAllAnnouncements);

// Route to get an announcement by ID
router.get('/:id', announcementController.getAnnouncementById);

// Route to update an announcement by ID
router.put('/:id', announcementController.updateAnnouncement);

// Route to delete an announcement by ID
router.delete('/:id', announcementController.deleteAnnouncement);

module.exports = router;