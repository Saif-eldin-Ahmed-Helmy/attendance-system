const express = require('express');
const router = express.Router();
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require('../middlewares/attachUserData');
const { requireVerifiedRole } = require('../middlewares/access');
const subjectsController = require('../controllers/subjects.controller');
router.use(verifySession, attachUserDataToRequest, requireVerifiedRole);

// protected listing
router.get('/', subjectsController.listSubjects);

// simple list
router.get('/list', subjectsController.listAllSubjects);

// create new subject
router.post('/', subjectsController.createSubject);

// detail view
router.get('/view/:id', subjectsController.viewSubject);

// excel export
router.get('/view/:id/attendance/excel/:week', subjectsController.exportAttendanceExcel);

module.exports = router;
