const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require('../middlewares/attachUserData');
const { requireManagement, requireVerifiedRole } = require('../middlewares/access');
const studentsController = require('../controllers/students.controller');

const upload = multer({ storage: multer.memoryStorage() });
router.use(verifySession, attachUserDataToRequest, requireVerifiedRole);

// Management-protected
router.get('/', requireManagement, studentsController.listManagedStudents);

// Authenticated listing
router.get('/list', studentsController.listStudents);

// File upload
router.post('/upload', requireManagement, upload.single('file'), studentsController.uploadStudents);

// Lookup by ID
router.get('/info', studentsController.getStudentInfo);

// Detailed view
router.get('/view/:id', studentsController.viewStudent);

module.exports = router;
