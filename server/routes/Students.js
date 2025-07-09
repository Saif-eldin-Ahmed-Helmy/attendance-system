const express = require('express');
const multer = require('multer');
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require('../middlewares/attachUserData');
const {
    listManagedStudents,
    listStudents,
    uploadStudents,
    getStudentInfo,
    viewStudent
} = require('../controllers/StudentsController');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Management-protected
router.get('/', verifySession, attachUserDataToRequest, listManagedStudents);

// Public listing
router.get('/list', listStudents);

// File upload
router.post('/upload', upload.single('file'), uploadStudents);

// Lookup by ID
router.get('/info', getStudentInfo);

// Detailed view
router.get('/view/:id', viewStudent);

module.exports = router;
