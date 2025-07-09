const express = require('express');
const router = express.Router();
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require('../middlewares/attachUserData');
const {
    listSubjects,
    listAllSubjects,
    createSubject,
    viewSubject,
    populateDatabase,
    exportAttendanceExcel
} = require('../controllers/SubjectController');

// protected listing
router.get('/', verifySession, attachUserDataToRequest, listSubjects);

// simple list
router.get('/list', verifySession, attachUserDataToRequest, listAllSubjects);

// create new subject
router.post('/', verifySession, attachUserDataToRequest, createSubject);

// detail view
router.get('/view/:id', verifySession, attachUserDataToRequest, viewSubject);

// populate DB with random data
router.get('/populate', populateDatabase);

// excel export
router.get('/view/:id/attendance/excel/:week', exportAttendanceExcel);

module.exports = router;