const AttendanceService = require('../src/services/attendance.service');
const { asyncHandler } = require('../src/middleware/error.middleware');
const { validate, validateQuery, schemas, querySchemas } = require('../src/middleware/validation.middleware');
const { sendSuccess, sendPaginatedResponse, sendCreated } = require('../src/utils/responseHandler');
const AppError = require('../src/utils/AppError');
const User = require('../models/User');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const ExcelJS = require('exceljs');

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     tags: [Subjects]
 *     summary: Get subjects for current user with role-based filtering
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: doctor
 *         in: query
 *         schema:
 *           type: string
 *       - name: assistant
 *         in: query
 *         schema:
 *           type: string
 *       - name: level
 *         in: query
 *         schema:
 *           type: integer
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 */
const listSubjects = asyncHandler(async (req, res) => {
    const { doctor, assistant, level, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (doctor) filter.doctor = doctor;
    if (assistant) filter.teachingAssistant = assistant;
    if (level) filter.level = parseInt(level);

    let subjectQuery;
    if (req.user.role === 'management') {
        subjectQuery = Subject.find(filter);
    } else if (['doctor', 'teaching assistant'].includes(req.user.role)) {
        subjectQuery = Subject.find({
            ...filter,
            _id: { $in: req.user.subjects }
        });
    } else {
        throw new AppError('Insufficient permissions to view subjects', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [subjects, total] = await Promise.all([
        subjectQuery
            .populate('doctor', 'name email')
            .populate('teachingAssistant', 'name email')
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Subject.countDocuments(filter)
    ]);

    // Get student counts for each subject
    const subjectIds = subjects.map(s => s._id);
    const studentCounts = await Student.aggregate([
        { $match: { 'subjects.subject': { $in: subjectIds } } },
        { $unwind: '$subjects' },
        { $match: { 'subjects.subject': { $in: subjectIds } } },
        { $group: { _id: '$subjects.subject', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    studentCounts.forEach(sc => {
        countMap[sc._id.toString()] = sc.count;
    });

    // Format response
    const formattedSubjects = subjects.map(subject => ({
        ...subject,
        doctor: subject.doctor?.name,
        teachingAssistant: subject.teachingAssistant?.name,
        studentsCount: countMap[subject._id.toString()] || 0
    }));

    const totalPages = Math.ceil(total / parseInt(limit));

    return sendPaginatedResponse(
        res,
        formattedSubjects,
        parseInt(page),
        totalPages,
        total,
        'Subjects retrieved successfully'
    );
});

/**
 * @swagger
 * /api/subjects/list:
 *   get:
 *     tags: [Subjects]
 *     summary: Get simple list of all subjects for current user
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Simple subject list
 */
const listAllSubjects = asyncHandler(async (req, res) => {
    let filter = {};

    if (req.user.role !== 'management') {
        if (['doctor', 'teaching assistant'].includes(req.user.role)) {
            filter._id = { $in: req.user.subjects };
        } else {
            throw new AppError('Insufficient permissions to view subjects', 403, 'INSUFFICIENT_PERMISSIONS');
        }
    }

    const subjects = await Subject.find(filter)
        .select('name code level')
        .sort({ level: 1, name: 1 })
        .lean();

    return sendSuccess(res, subjects, 'Subject list retrieved successfully');
});

/**
 * @swagger
 * /api/subjects:
 *   post:
 *     tags: [Subjects]
 *     summary: Create new subject
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - level
 *               - startWeek
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               level:
 *                 type: integer
 *               startWeek:
 *                 type: string
 *                 format: date
 *               doctor:
 *                 type: string
 *               teachingAssistant:
 *                 type: string
 */
const createSubject = [
    validate(schemas.subject),
    asyncHandler(async (req, res) => {
        if (req.user.role !== 'management') {
            throw new AppError('Only management can create subjects', 403, 'INSUFFICIENT_PERMISSIONS');
        }

        const { name, code, level, startWeek, doctor, teachingAssistant } = req.body;

        // Check if subject code already exists
        const existingSubject = await Subject.findOne({ code });
        if (existingSubject) {
            throw new AppError('Subject code already exists', 400, 'DUPLICATE_SUBJECT_CODE');
        }

        // Verify doctor exists if provided
        if (doctor) {
            const doctorUser = await User.findOne({ _id: doctor, role: 'doctor' });
            if (!doctorUser) {
                throw new AppError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
            }
        }

        // Verify teaching assistant exists if provided
        if (teachingAssistant) {
            const assistantUser = await User.findOne({
                _id: teachingAssistant,
                role: 'teaching assistant'
            });
            if (!assistantUser) {
                throw new AppError('Teaching assistant not found', 404, 'ASSISTANT_NOT_FOUND');
            }
        }

        const subject = new Subject({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            level: parseInt(level),
            startWeek: new Date(startWeek),
            doctor: doctor || null,
            teachingAssistant: teachingAssistant || null,
            groups: [],
            sections: []
        });

        await subject.save();
        await subject.populate([
            { path: 'doctor', select: 'name email' },
            { path: 'teachingAssistant', select: 'name email' }
        ]);

        return sendCreated(res, subject, 'Subject created successfully');
    })
];

/**
 * @swagger
 * /api/subjects/view/{id}:
 *   get:
 *     tags: [Subjects]
 *     summary: Get detailed subject information
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 */
const viewSubject = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const subject = await Subject.findById(id)
        .populate('doctor', 'name email')
        .populate('teachingAssistant', 'name email')
        .lean();

    if (!subject) {
        throw new AppError('Subject not found', 404, 'SUBJECT_NOT_FOUND');
    }

    // Check permissions
    const hasAccess = req.user.role === 'management' ||
        subject.doctor?._id.toString() === req.user._id.toString() ||
        subject.teachingAssistant?._id.toString() === req.user._id.toString();

    if (!hasAccess) {
        throw new AppError('Access denied to this subject', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Get student count
    const studentsCount = await Student.countDocuments({ 'subjects.subject': id });

    // Get attendance statistics
    const attendanceStats = await AttendanceService.getSubjectAttendanceStats(id);

    const response = {
        ...subject,
        studentsCount,
        attendanceStats: attendanceStats.statistics
    };

    return sendSuccess(res, response, 'Subject details retrieved successfully');
});

/**
 * @swagger
 * /api/subjects/view/{id}/attendance/excel/{week}:
 *   get:
 *     tags: [Subjects]
 *     summary: Export attendance data to Excel
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: week
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 */
const exportAttendanceExcel = asyncHandler(async (req, res) => {
    const { id, week } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
        throw new AppError('Subject not found', 404, 'SUBJECT_NOT_FOUND');
    }

    // Check permissions
    const hasAccess = req.user.role === 'management' ||
        subject.doctor?.toString() === req.user._id.toString() ||
        subject.teachingAssistant?.toString() === req.user._id.toString();

    if (!hasAccess) {
        throw new AppError('Access denied to export attendance for this subject', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Get attendance data
    const attendanceRecords = await Attendance.find({
        subject: id,
        week: parseInt(week)
    }).populate('student', 'name id').lean();

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Week ${week} Attendance`);

    // Add headers
    worksheet.columns = [
        { header: 'Student ID', key: 'studentId', width: 15 },
        { header: 'Student Name', key: 'studentName', width: 25 },
        { header: 'Group', key: 'group', width: 10 },
        { header: 'Section', key: 'section', width: 10 },
        { header: 'Lecture Attendance', key: 'lectureAttendance', width: 20 },
        { header: 'Section Attendance', key: 'sectionAttendance', width: 20 }
    ];

    // Add data
    attendanceRecords.forEach(record => {
        worksheet.addRow({
            studentId: record.student.id,
            studentName: record.student.name,
            group: record.group || 'N/A',
            section: record.section || 'N/A',
            lectureAttendance: record.lectureAttendanceTime ?
                new Date(record.lectureAttendanceTime).toLocaleString() : 'Absent',
            sectionAttendance: record.sectionAttendanceTime ?
                new Date(record.sectionAttendanceTime).toLocaleString() : 'Absent'
        });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-week-${week}.xlsx`);

    // Send Excel file
    await workbook.xlsx.write(res);
    res.end();
});

/**
 * Populate database with sample data (development only)
 */
const populateDatabase = asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        throw new AppError('Database population is not allowed in production', 403, 'OPERATION_NOT_ALLOWED');
    }

    // Implementation for populating sample data would go here
    return sendSuccess(res, null, 'Database population completed');
});

module.exports = {
    listSubjects: [validateQuery(querySchemas.pagination), listSubjects],
    listAllSubjects,
    createSubject,
    viewSubject,
    exportAttendanceExcel,
    populateDatabase
};