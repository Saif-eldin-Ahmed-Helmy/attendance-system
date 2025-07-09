const express = require('express');
const router = express.Router();
const { verifySession, attachUserDataToRequest } = require('../middlewares/auth');
const authController = require('../controllers/AuthController');

// Google OAuth
router.get('/google', authController.initiateGoogleAuth);
router.get('/google/callback', authController.authenticateGoogleCallback, authController.googleCallback);

// Local auth
router.get('/', authController.localLogin);
router.post('/', authController.localRegister);

// Session & logout
router.get('/session', authController.getSession);
router.get('/logout', authController.logout);

router.use(verifySession, attachUserDataToRequest);
router.put('/language', authController.updateLanguage);
router.get('/doctors', authController.listDoctors);
router.get('/assistants', authController.listAssistants);
router.get('/teachers', authController.listTeachers);

module.exports = router;
