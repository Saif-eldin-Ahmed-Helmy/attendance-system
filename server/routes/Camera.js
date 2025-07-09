const express = require('express');
const {getCurrentSubject, handleVideoStream, getCamerasList, handleAttendance, addCamera, getCameraById,
    updateCameraInfo, deleteCameraById
} = require("../controllers/CameraController");

const router = express.Router();

// Route to handle attendance
router.post("/attendance", handleAttendance);

// Route to get the current subject
router.get('/current-subject', getCurrentSubject);

// Route to handle video stream
router.post('/video-stream/', handleVideoStream);

// Route to get the list of cameras
router.get('/', getCamerasList);

// Route to add a new camera
router.post('/', addCamera);

// Route to get a camera by ID
router.get('/:id', getCameraById);

// Route to update camera information by ID
router.put('/:id', updateCameraInfo);

// Route to delete a camera by ID
router.delete('/:id', deleteCameraById);

module.exports = router;