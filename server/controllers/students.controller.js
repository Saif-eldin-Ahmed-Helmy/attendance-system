// controllers/studentController.js
const StudentService = require('../src/services/student.service');
const { asyncHandler } = require('../src/middleware/error.middleware');
const { validate, validateQuery, schemas, querySchemas } = require('../src/middleware/validation.middleware');
const { sendSuccess, sendPaginatedResponse, sendError } = require('../src/utils/responseHandler');
const AppError = require('../src/utils/AppError');

/**
 * @swagger
 * /api/students:
 *   get:
 *     tags: [Students]
 *     summary: Get managed students for current user
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
const listManagedStudents = asyncHandler(async (req, res) => {
    if (req.user.role !== 'management') {
        throw new AppError('Access denied - Management role required', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const students = await StudentService.getManagedStudents(req.user._id);
    return sendSuccess(res, students, 'Managed students retrieved successfully');
});

/**
 * @swagger
 * /api/students/list:
 *   get:
 *     tags: [Students]
 *     summary: Get paginated list of students with filters
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 */
const listStudents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, level, search } = req.query;

    const filters = {};
    if (level) filters.level = parseInt(level);
    if (search) filters.search = search;

    const result = await StudentService.getStudents(filters, { page: parseInt(page), limit: parseInt(limit) });

    return sendPaginatedResponse(
        res,
        result.students,
        result.pagination.currentPage,
        result.pagination.totalPages,
        result.pagination.totalItems,
        'Students retrieved successfully'
    );
});

/**
 * @swagger
 * /api/students/upload:
 *   post:
 *     tags: [Students]
 *     summary: Bulk upload students from file
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - subject
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               subject:
 *                 type: string
 *               group:
 *                 type: integer
 *               section:
 *                 type: integer
 */
const uploadStudents = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('File is required', 400, 'MISSING_FILE');
    }

    const { subject, group, section } = req.body;
    if (!subject) {
        throw new AppError('Subject is required', 400, 'MISSING_SUBJECT');
    }

    // Parse uploaded file content
    const text = req.file.buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    const studentRegex = /^\s*(\d{6,})\s+([\u0600-\u06FF\s\u0041-\u005A\u0061-\u007A]+)/;

    const studentRecords = [];
    for (const line of lines) {
        if (!line.trim() || /كود الطالب|Student ID/i.test(line)) continue;

        const cleanLine = line.replace(/\s+/g, ' ')
            .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
            .trim();

        const match = cleanLine.match(studentRegex);
        if (!match) continue;

        const [, id, rawName] = match;
        const name = rawName.replace(/\d+$/, '').trim();

        if (id.length >= 6 && name.length >= 3) {
            studentRecords.push({ id, name });
        }
    }

    if (studentRecords.length === 0) {
        throw new AppError('No valid student records found in file', 400, 'INVALID_FILE_FORMAT');
    }

    const result = await StudentService.processStudentUpload(
        studentRecords,
        subject,
        { group: group ? parseInt(group) : null, section: section ? parseInt(section) : null }
    );

    return sendSuccess(res, result, `Successfully processed ${result.processed} students`);
});

/**
 * @swagger
 * /api/students/info:
 *   get:
 *     tags: [Students]
 *     summary: Get basic student info by ID
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 */
const getStudentInfo = asyncHandler(async (req, res) => {
    const { id } = req.query;
    if (!id) {
        throw new AppError('Student ID is required', 400, 'MISSING_STUDENT_ID');
    }

    try {
        const student = await StudentService.getStudentById(id);
        return res.send(student.name);
    } catch (error) {
        if (error.errorCode === 'STUDENT_NOT_FOUND') {
            return res.send('Not Found');
        }
        throw error;
    }
});

/**
 * @swagger
 * /api/students/view/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Get detailed student information
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 */
const viewStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const student = await StudentService.getStudentById(id);
    const attendance = await StudentService.getStudentAttendance(id);

    return sendSuccess(res, { student, attendance }, 'Student details retrieved successfully');
});

/**
 * Create new student
 */
const createStudent = asyncHandler(async (req, res) => {
    const { name, id, level } = req.body;

    const student = await StudentService.createOrUpdateStudent({ name, id, level });
    return sendSuccess(res, student, 'Student created successfully', 201);
});

/**
 * Update existing student
 */
const updateStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const student = await StudentService.updateStudent(id, updateData);
    return sendSuccess(res, student, 'Student updated successfully');
});

/**
 * Delete student
 */
const deleteStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await StudentService.deleteStudent(id);
    return sendSuccess(res, null, 'Student deleted successfully');
});

/**
 * Get student attendance records
 */
const getStudentAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { subject } = req.query;

    const attendance = await StudentService.getStudentAttendance(id, subject);
    return sendSuccess(res, attendance, 'Attendance records retrieved successfully');
});

module.exports = {
    listManagedStudents,
    listStudents: [validateQuery(querySchemas.pagination), listStudents],
    uploadStudents: [validate(schemas.studentUpload), uploadStudents],
    getStudentInfo,
    viewStudent,
    createStudent: [validate(schemas.student), createStudent],
    updateStudent,
    deleteStudent,
    getStudentAttendance
};