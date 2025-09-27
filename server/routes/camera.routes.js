const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require('../middlewares/attachUserData');
const cameraController = require('../controllers/camera.controller');

// Route to handle attendance
router.post("/attendance", cameraController.handleAttendance);

// Route to get the current subject
router.get('/current-subject', cameraController.getCurrentSubject);

// Route to handle video stream
router.post('/video-stream/', cameraController.handleVideoStream);

// Route to get the list of cameras
router.get('/', cameraController.getCamerasList);

// Route to add a new camera
router.post('/', cameraController.addCamera);

// Route to get a camera by ID
router.get('/:id', cameraController.getCameraById);

// Route to update camera information by ID
router.put('/:id', cameraController.updateCameraInfo);

// Route to delete a camera by ID
router.delete('/:id', cameraController.deleteCameraById);

module.exports = router;