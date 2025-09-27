const express = require('express');
const router = express.Router();
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require('../middlewares/attachUserData');
const subjectsController = require('../controllers/subjects.controller');

// protected listing
router.get('/', verifySession, attachUserDataToRequest, subjectsController.listSubjects);

// simple list
router.get('/list', verifySession, attachUserDataToRequest, subjectsController.listAllSubjects);

// create new subject
router.post('/', verifySession, attachUserDataToRequest, subjectsController.createSubject);

// detail view
router.get('/view/:id', verifySession, attachUserDataToRequest, subjectsController.viewSubject);

// populate DB with random data
router.get('/populate', subjectsController.populateDatabase);

// excel export
router.get('/view/:id/attendance/excel/:week', subjectsController.exportAttendanceExcel);

module.exports = router;