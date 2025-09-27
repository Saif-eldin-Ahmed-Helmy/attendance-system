const { asyncHandler } = require('../src/middleware/error.middleware');
const { validate, validateQuery, schemas, querySchemas } = require('../src/middleware/validation.middleware');
const { sendSuccess, sendPaginatedResponse, sendCreated } = require('../src/utils/responseHandler');
const AppError = require('../src/utils/AppError');
const Announcement = require('../models/Announcement');
const Subject = require('../models/Subject');

/**
 * @swagger
 * /api/announcement:
 *   get:
 *     tags: [Announcements]
 *     summary: Get all announcements with pagination
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: subject
 *         in: query
 *         description: Filter by subject ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 */
const getAllAnnouncements = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, subject } = req.query;

    const filter = {};
    if (subject) {
        filter.subject = subject;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [announcements, total] = await Promise.all([
        Announcement.find(filter)
            .populate('author', 'name email')
            .populate('subject', 'name code')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Announcement.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    return sendPaginatedResponse(
        res,
        announcements,
        parseInt(page),
        totalPages,
        total,
        'Announcements retrieved successfully'
    );
});

/**
 * @swagger
 * /api/announcement:
 *   post:
 *     tags: [Announcements]
 *     summary: Create new announcement
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               subject:
 *                 type: string
 *                 description: Subject ID (optional)
 *     responses:
 *       201:
 *         description: Announcement created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
const createAnnouncement = [
    validate(schemas.announcement),
    asyncHandler(async (req, res) => {
        const { title, content, subject } = req.body;

        // Verify subject exists if provided
        if (subject) {
            const subjectExists = await Subject.findById(subject);
            if (!subjectExists) {
                throw new AppError('Subject not found', 404, 'SUBJECT_NOT_FOUND');
            }
        }

        const announcement = new Announcement({
            title: title.trim(),
            content: content.trim(),
            author: req.user._id,
            subject: subject || null,
            createdAt: new Date(),
            lastUpdatedAt: new Date()
        });

        await announcement.save();
        await announcement.populate([
            { path: 'author', select: 'name email' },
            { path: 'subject', select: 'name code' }
        ]);

        return sendCreated(res, announcement, 'Announcement created successfully');
    })
];

/**
 * @swagger
 * /api/announcement/{id}:
 *   get:
 *     tags: [Announcements]
 *     summary: Get announcement by ID
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Announcement ID
 *     responses:
 *       200:
 *         description: Announcement retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const getAnnouncementById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const announcement = await Announcement.findById(id)
        .populate('author', 'name email role')
        .populate('subject', 'name code level')
        .lean();

    if (!announcement) {
        throw new AppError('Announcement not found', 404, 'ANNOUNCEMENT_NOT_FOUND');
    }

    return sendSuccess(res, announcement, 'Announcement retrieved successfully');
});

/**
 * @swagger
 * /api/announcement/{id}:
 *   put:
 *     tags: [Announcements]
 *     summary: Update announcement
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               subject:
 *                 type: string
 *     responses:
 *       200:
 *         description: Announcement updated successfully
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const updateAnnouncement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content, subject } = req.body;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
        throw new AppError('Announcement not found', 404, 'ANNOUNCEMENT_NOT_FOUND');
    }

    // Check if user is the author or has management role
    if (announcement.author.toString() !== req.user._id.toString() && req.user.role !== 'management') {
        throw new AppError('Not authorized to update this announcement', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Verify subject exists if provided
    if (subject && subject !== announcement.subject?.toString()) {
        const subjectExists = await Subject.findById(subject);
        if (!subjectExists) {
            throw new AppError('Subject not found', 404, 'SUBJECT_NOT_FOUND');
        }
    }

    // Update fields
    const updateData = { lastUpdatedAt: new Date() };
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (subject !== undefined) updateData.subject = subject || null;

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate([
        { path: 'author', select: 'name email' },
        { path: 'subject', select: 'name code' }
    ]);

    return sendSuccess(res, updatedAnnouncement, 'Announcement updated successfully');
});

/**
 * @swagger
 * /api/announcement/{id}:
 *   delete:
 *     tags: [Announcements]
 *     summary: Delete announcement
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Announcement deleted successfully
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const deleteAnnouncement = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
        throw new AppError('Announcement not found', 404, 'ANNOUNCEMENT_NOT_FOUND');
    }

    // Check if user is the author or has management role
    if (announcement.author.toString() !== req.user._id.toString() && req.user.role !== 'management') {
        throw new AppError('Not authorized to delete this announcement', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    await Announcement.findByIdAndDelete(id);

    return sendSuccess(res, null, 'Announcement deleted successfully');
});

/**
 * Get announcements for a specific subject
 */
const getAnnouncementsBySubject = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Verify subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
        throw new AppError('Subject not found', 404, 'SUBJECT_NOT_FOUND');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [announcements, total] = await Promise.all([
        Announcement.find({ subject: subjectId })
            .populate('author', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Announcement.countDocuments({ subject: subjectId })
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    return sendPaginatedResponse(
        res,
        announcements,
        parseInt(page),
        totalPages,
        total,
        `Announcements for ${subject.name} retrieved successfully`
    );
});

module.exports = {
    getAllAnnouncements: [validateQuery(querySchemas.pagination), getAllAnnouncements],
    createAnnouncement,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    getAnnouncementsBySubject
};