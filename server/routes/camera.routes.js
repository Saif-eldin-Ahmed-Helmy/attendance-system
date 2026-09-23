const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require('../middlewares/attachUserData');
const { requireManagement, requireVerifiedRole, requireCameraApiKey } = require('../middlewares/access');
const cameraController = require('../controllers/camera.controller');

// Route to handle attendance
router.post("/attendance", requireCameraApiKey, cameraController.handleAttendance);

// Route to get the current subject
router.get('/current-subject', requireCameraApiKey, cameraController.getCurrentSubject);

// Route to handle video stream
router.post('/video-stream/', requireCameraApiKey, cameraController.handleVideoStream);

router.use(verifySession, attachUserDataToRequest, requireVerifiedRole);

// Route to get the list of cameras
router.get('/', cameraController.getCamerasList);

// Route to add a new camera
router.post('/', requireManagement, cameraController.addCamera);

// Route to get a camera by ID
router.get('/:id', cameraController.getCameraById);

// Route to update camera information by ID
router.put('/:id', requireManagement, cameraController.updateCameraInfo);

// Route to delete a camera by ID
router.delete('/:id', requireManagement, cameraController.deleteCameraById);

module.exports = router;
