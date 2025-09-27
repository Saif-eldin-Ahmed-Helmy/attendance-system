// CameraController.js

const AttendanceService = require('../src/services/attendance.service');
const OCRService = require('../src/services/ocr.service');
const WebSocketService = require('../src/services/websocket.service');
const { asyncHandler } = require('../src/middleware/error.middleware');
const { validate, schemas } = require('../src/middleware/validation.middleware');
const { sendSuccess, sendError } = require('../src/utils/responseHandler');
const { attendanceLimiter } = require('../src/middleware/rateLimiter.middleware');
const AppError = require('../src/utils/AppError');
const Camera = require('../models/Camera');
const Subject = require('../models/Subject');

let frameNumber = 0;
let imageDataBuffer = Buffer.from([]);
const idCache = { lastReadId: null, confirmed: false };

/**
 * @swagger
 * /api/camera/attendance:
 *   post:
 *     tags: [Hardware]
 *     summary: Process attendance from hardware device
 *     description: Record attendance using student ID and location information
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - location
 *             properties:
 *               id:
 *                 type: string
 *                 description: Student ID
 *                 example: "20210001"
 *               location:
 *                 type: string
 *                 pattern: '^(ROOM|LAB)\|\d+$'
 *                 description: Location format (ROOM|number or LAB|number)
 *                 example: "ROOM|101"
 *     responses:
 *       200:
 *         description: Attendance recorded successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
const handleAttendance = [
    attendanceLimiter,
    validate(schemas.attendance),
    asyncHandler(async (req, res) => {
        const { id, location } = req.body;

        try {
            const result = await AttendanceService.processAttendance(id, location);
            
            // Broadcast attendance notification via WebSocket
            WebSocketService.handleAttendanceUpdate({
                student: result.student,
                subject: result.subject,
                sessionType: result.sessionType,
                week: result.week,
                timestamp: result.timestamp
            });

            return sendSuccess(res, result, 'Attendance recorded successfully');
        } catch (error) {
            // Handle specific attendance errors
            if (error.errorCode === 'STUDENT_NOT_FOUND') {
                return sendError(res, 'Student not found', 'STUDENT_NOT_FOUND', 404);
            }
            if (error.errorCode === 'NO_ACTIVE_SESSION') {
                return sendError(res, 'No active lecture or section found', 'NO_ACTIVE_SESSION', 400);
            }
            if (error.errorCode === 'NOT_ENROLLED') {
                return sendError(res, 'Student not enrolled in this subject', 'NOT_ENROLLED', 400);
            }
            if (error.errorCode === 'ALREADY_RECORDED') {
                return sendError(res, 'Attendance already recorded for this session', 'ALREADY_RECORDED', 400);
            }
            
            throw error;
        }
    })
];

/**
 * @swagger
 * /api/camera/current-subject:
 *   get:
 *     tags: [Hardware]
 *     summary: Get currently active subject information
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Current subject information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
const getCurrentSubject = asyncHandler(async (req, res) => {
    const specialCamera = await Camera.findOne({ cameraId: 'R001' });
    
    if (!specialCamera?.subjectId) {
        return sendSuccess(res, null, 'No active subject configured');
    }

    const subject = await Subject.findById(specialCamera.subjectId)
        .populate('doctor teachingAssistant', 'name email')
        .lean();

    if (!subject) {
        return sendSuccess(res, null, 'Configured subject not found');
    }

    const subjectInfo = {
        ...subject,
        activeGroup: specialCamera.groupNumber,
        activeSection: specialCamera.sectionNumber
    };

    return sendSuccess(res, subjectInfo, 'Current subject retrieved successfully');
});

/**
 * @swagger
 * /api/camera/video-stream:
 *   post:
 *     tags: [Hardware]
 *     summary: Process video stream for OCR recognition
 *     description: Upload image frames for student ID recognition
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               frame:
 *                 type: string
 *                 format: binary
 *                 description: Video frame image
 *     responses:
 *       200:
 *         description: OCR processing result
 */
const handleVideoStream = asyncHandler(async (req, res) => {
    if (!req.file && !req.body.imageData) {
        throw new AppError('Image data is required', 400, 'MISSING_IMAGE_DATA');
    }

    let imageBuffer;
    if (req.file) {
        imageBuffer = req.file.buffer;
    } else if (req.body.imageData) {
        // Handle base64 encoded image data
        const base64Data = req.body.imageData.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
    }

    frameNumber++;
    
    try {
        // Initialize OCR service if not already done
        await OCRService.initialize();
        
        // Process image for student ID recognition
        const ocrResult = await OCRService.processImage(imageBuffer, {
            enhanceImage: true,
            minConfidence: 75,
            expectedLength: 8
        });

        const response = {
            frameNumber,
            timestamp: new Date().toISOString(),
            ocr: ocrResult
        };

        // If student ID detected with high confidence, cache it
        if (ocrResult.success && ocrResult.confidence > 80) {
            if (idCache.lastReadId !== ocrResult.studentId) {
                idCache.lastReadId = ocrResult.studentId;
                idCache.confirmed = false;
                response.newIdDetected = true;
            } else {
                idCache.confirmed = true;
                response.idConfirmed = true;
            }
        }

        return sendSuccess(res, response, 'Frame processed successfully');
    } catch (error) {
        console.error('OCR processing error:', error);
        return sendError(res, 'Failed to process image frame', 'OCR_PROCESSING_ERROR', 500);
    }
});

/**
 * @swagger
 * /api/camera:
 *   get:
 *     tags: [Hardware]
 *     summary: Get list of all cameras
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of cameras
 */
const getCamerasList = asyncHandler(async (req, res) => {
    const cameras = await Camera.find()
        .populate('subjectId', 'name code')
        .lean();

    return sendSuccess(res, cameras, 'Cameras retrieved successfully');
});

/**
 * @swagger
 * /api/camera:
 *   post:
 *     tags: [Hardware]
 *     summary: Add new camera
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cameraId
 *             properties:
 *               cameraId:
 *                 type: string
 *               subjectId:
 *                 type: string
 *               groupNumber:
 *                 type: integer
 *               sectionNumber:
 *                 type: integer
 */
const addCamera = asyncHandler(async (req, res) => {
    const { cameraId, subjectId, groupNumber, sectionNumber } = req.body;

    if (!cameraId) {
        throw new AppError('Camera ID is required', 400, 'MISSING_CAMERA_ID');
    }

    // Check if camera already exists
    const existingCamera = await Camera.findOne({ cameraId });
    if (existingCamera) {
        throw new AppError('Camera with this ID already exists', 400, 'CAMERA_EXISTS');
    }

    const camera = new Camera({
        cameraId,
        subjectId: subjectId || null,
        groupNumber: groupNumber || null,
        sectionNumber: sectionNumber || null
    });

    await camera.save();
    await camera.populate('subjectId', 'name code');

    return sendSuccess(res, camera, 'Camera added successfully', 201);
});

/**
 * @swagger
 * /api/camera/{id}:
 *   get:
 *     tags: [Hardware]
 *     summary: Get camera by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 */
const getCameraById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const camera = await Camera.findById(id)
        .populate('subjectId', 'name code')
        .lean();

    if (!camera) {
        throw new AppError('Camera not found', 404, 'CAMERA_NOT_FOUND');
    }

    return sendSuccess(res, camera, 'Camera retrieved successfully');
});

/**
 * @swagger
 * /api/camera/{id}:
 *   put:
 *     tags: [Hardware]
 *     summary: Update camera information
 */
const updateCameraInfo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const camera = await Camera.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
    }).populate('subjectId', 'name code');

    if (!camera) {
        throw new AppError('Camera not found', 404, 'CAMERA_NOT_FOUND');
    }

    return sendSuccess(res, camera, 'Camera updated successfully');
});

/**
 * @swagger
 * /api/camera/{id}:
 *   delete:
 *     tags: [Hardware]
 *     summary: Delete camera
 */
const deleteCameraById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const camera = await Camera.findByIdAndDelete(id);
    if (!camera) {
        throw new AppError('Camera not found', 404, 'CAMERA_NOT_FOUND');
    }

    return sendSuccess(res, null, 'Camera deleted successfully');
});

/**
 * Get OCR service status and statistics
 */
const getOCRStatus = asyncHandler(async (req, res) => {
    const status = OCRService.getStatus();
    return sendSuccess(res, status, 'OCR service status retrieved successfully');
});

/**
 * Reset OCR cache
 */
const resetOCRCache = asyncHandler(async (req, res) => {
    idCache.lastReadId = null;
    idCache.confirmed = false;
    return sendSuccess(res, null, 'OCR cache reset successfully');
});

module.exports = {
    handleAttendance,
    getCurrentSubject,
    handleVideoStream,
    getCamerasList,
    addCamera,
    getCameraById,
    updateCameraInfo,
    deleteCameraById,
    getOCRStatus,
    resetOCRCache
};
