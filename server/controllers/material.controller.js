const { asyncHandler } = require('../src/middleware/error.middleware');
const { validate, validateQuery, schemas, querySchemas } = require('../src/middleware/validation.middleware');
const { sendSuccess, sendPaginatedResponse, sendCreated } = require('../src/utils/responseHandler');
const { uploadLimiter } = require('../src/middleware/rateLimiter.middleware');
const AppError = require('../src/utils/AppError');
const Material = require('../models/Material');
const Subject = require('../models/Subject');

/**
 * @swagger
 * /api/material:
 *   post:
 *     tags: [Materials]
 *     summary: Create new material
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
 *               - subject
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               subject:
 *                 type: string
 *                 description: Subject ID
 *               link:
 *                 type: string
 *                 description: External link to material
 *     responses:
 *       201:
 *         description: Material created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
const createMaterial = [
    uploadLimiter,
    validate(schemas.material),
    asyncHandler(async (req, res) => {
        const { title, description, subject, link } = req.body;

        // Verify subject exists
        const subjectExists = await Subject.findById(subject);
        if (!subjectExists) {
            throw new AppError('Subject not found', 404, 'SUBJECT_NOT_FOUND');
        }

        // Check if user has permission to add materials to this subject
        const hasPermission = req.user.role === 'management' ||
            subjectExists.doctor?.toString() === req.user._id.toString() ||
            subjectExists.teachingAssistant?.toString() === req.user._id.toString();

        if (!hasPermission) {
            throw new AppError('Not authorized to add materials to this subject', 403, 'INSUFFICIENT_PERMISSIONS');
        }

        const materialData = {
            title: title.trim(),
            description: description?.trim(),
            subject,
            uploadedBy: req.user._id,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (link) {
            materialData.link = link.trim();
        }

        // Handle file upload if present
        if (req.file) {
            materialData.filePath = req.file.path || req.file.filename;
            materialData.fileType = req.file.mimetype;
            materialData.fileSize = req.file.size;
        }

        const material = new Material(materialData);
        await material.save();

        await material.populate([
            { path: 'subject', select: 'name code' },
            { path: 'uploadedBy', select: 'name email' }
        ]);

        return sendCreated(res, material, 'Material created successfully');
    })
];

/**
 * @swagger
 * /api/material:
 *   get:
 *     tags: [Materials]
 *     summary: Get all materials with pagination and filtering
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
 *       - name: uploadedBy
 *         in: query
 *         description: Filter by uploader user ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 */
const getAllMaterials = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, subject, uploadedBy } = req.query;

    const filter = { isActive: true };
    if (subject) filter.subject = subject;
    if (uploadedBy) filter.uploadedBy = uploadedBy;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [materials, total] = await Promise.all([
        Material.find(filter)
            .populate('subject', 'name code level')
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Material.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    return sendPaginatedResponse(
        res,
        materials,
        parseInt(page),
        totalPages,
        total,
        'Materials retrieved successfully'
    );
});

/**
 * @swagger
 * /api/material/{id}:
 *   get:
 *     tags: [Materials]
 *     summary: Get material by ID
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Material ID
 *     responses:
 *       200:
 *         description: Material retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const getMaterialById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const material = await Material.findOne({ _id: id, isActive: true })
        .populate('subject', 'name code level')
        .populate('uploadedBy', 'name email role')
        .lean();

    if (!material) {
        throw new AppError('Material not found', 404, 'MATERIAL_NOT_FOUND');
    }

    // Increment download count if accessing file
    if (req.query.download === 'true') {
        await Material.findByIdAndUpdate(id, { $inc: { downloadCount: 1 } });
    }

    return sendSuccess(res, material, 'Material retrieved successfully');
});

/**
 * @swagger
 * /api/material/{id}:
 *   put:
 *     tags: [Materials]
 *     summary: Update material
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
 *               description:
 *                 type: string
 *               link:
 *                 type: string
 *     responses:
 *       200:
 *         description: Material updated successfully
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const updateMaterial = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, link } = req.body;

    const material = await Material.findOne({ _id: id, isActive: true });
    if (!material) {
        throw new AppError('Material not found', 404, 'MATERIAL_NOT_FOUND');
    }

    // Check if user is the uploader or has management role
    if (material.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'management') {
        throw new AppError('Not authorized to update this material', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Update fields
    const updateData = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (link !== undefined) updateData.link = link?.trim();

    const updatedMaterial = await Material.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate([
        { path: 'subject', select: 'name code' },
        { path: 'uploadedBy', select: 'name email' }
    ]);

    return sendSuccess(res, updatedMaterial, 'Material updated successfully');
});

/**
 * @swagger
 * /api/material/{id}:
 *   delete:
 *     tags: [Materials]
 *     summary: Delete material (soft delete)
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
 *         description: Material deleted successfully
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const deleteMaterial = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const material = await Material.findOne({ _id: id, isActive: true });
    if (!material) {
        throw new AppError('Material not found', 404, 'MATERIAL_NOT_FOUND');
    }

    // Check if user is the uploader or has management role
    if (material.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'management') {
        throw new AppError('Not authorized to delete this material', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Soft delete
    await Material.findByIdAndUpdate(id, {
        isActive: false,
        updatedAt: new Date()
    });

    return sendSuccess(res, null, 'Material deleted successfully');
});

/**
 * Get materials for a specific subject
 */
const getMaterialsBySubject = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Verify subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
        throw new AppError('Subject not found', 404, 'SUBJECT_NOT_FOUND');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [materials, total] = await Promise.all([
        Material.find({ subject: subjectId, isActive: true })
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Material.countDocuments({ subject: subjectId, isActive: true })
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    return sendPaginatedResponse(
        res,
        materials,
        parseInt(page),
        totalPages,
        total,
        `Materials for ${subject.name} retrieved successfully`
    );
});

/**
 * Get material statistics
 */
const getMaterialStats = asyncHandler(async (req, res) => {
    const stats = await Material.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$subject',
                totalMaterials: { $sum: 1 },
                totalDownloads: { $sum: '$downloadCount' },
                avgFileSize: { $avg: '$fileSize' }
            }
        },
        {
            $lookup: {
                from: 'subjects',
                localField: '_id',
                foreignField: '_id',
                as: 'subject'
            }
        },
        { $unwind: '$subject' },
        {
            $project: {
                subject: { name: '$subject.name', code: '$subject.code' },
                totalMaterials: 1,
                totalDownloads: 1,
                avgFileSize: { $round: ['$avgFileSize', 2] }
            }
        }
    ]);

    return sendSuccess(res, stats, 'Material statistics retrieved successfully');
});

module.exports = {
    createMaterial,
    getAllMaterials: [validateQuery(querySchemas.pagination), getAllMaterials],
    getMaterialById,
    updateMaterial,
    deleteMaterial
};
