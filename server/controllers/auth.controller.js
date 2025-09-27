const PassportConfig = require('../src/config/passport.config');
const { asyncHandler } = require('../src/middleware/error.middleware');
const { validate, schemas } = require('../src/middleware/validation.middleware');
const { sendSuccess, sendError } = require('../src/utils/responseHandler');
const { authLimiter } = require('../src/middleware/rateLimiter.middleware');
const AppError = require('../src/utils/AppError');
const User = require('../models/User');
const Subject = require('../models/Subject');

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login with email and password
 *     description: Authenticate user and create session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
const localLogin = [
    authLimiter,
    validate(schemas.login),
    PassportConfig.authenticateLogin
];

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register new user account
 *     description: Create new user account with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *                 minLength: 2
 *               gender:
 *                 type: string
 *                 enum: [male, female, not_specified]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
const localRegister = [
    authLimiter,
    validate(schemas.register),
    PassportConfig.authenticateRegister
];

/**
 * @swagger
 * /api/users/google:
 *   get:
 *     tags: [Authentication]
 *     summary: Initiate Google OAuth authentication
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */
const initiateGoogleAuth = PassportConfig.initiateGoogleAuth();

/**
 * @swagger
 * /api/users/google/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: Google OAuth callback
 *     responses:
 *       302:
 *         description: Redirect after authentication
 */
const authenticateGoogleCallback = PassportConfig.handleGoogleCallback();

/**
 * Handle Google OAuth callback and redirect
 */
const googleCallback = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
    }

    // Successful Google authentication
    return res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
});

/**
 * @swagger
 * /api/users/session:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user session information
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Current user session
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
const getSession = asyncHandler(async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
        throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    const user = await User.findOne({ email: req.user.email })
        .populate('subjects', 'name code')
        .select('-password')
        .lean();

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const sessionData = {
        email: user.email,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        subjects: user.subjects,
        profilePicture: user.profilePicture
    };

    return sendSuccess(res, sessionData, 'Session retrieved successfully');
});

/**
 * @swagger
 * /api/users/logout:
 *   get:
 *     tags: [Authentication]
 *     summary: Logout current user
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
const logout = asyncHandler(async (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            throw new AppError('Logout failed', 500, 'LOGOUT_ERROR');
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.clearCookie('attendance.sid');
            return sendSuccess(res, null, 'Logged out successfully');
        });
    });
});

/**
 * @swagger
 * /api/users/language:
 *   put:
 *     tags: [Authentication]
 *     summary: Update user preferred language
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language
 *             properties:
 *               language:
 *                 type: string
 *                 enum: [en, ar]
 *     responses:
 *       200:
 *         description: Language updated successfully
 */
const updateLanguage = asyncHandler(async (req, res) => {
    const { language } = req.body;

    if (!['en', 'ar'].includes(language)) {
        throw new AppError('Invalid language. Must be "en" or "ar"', 400, 'INVALID_LANGUAGE');
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { preferredLanguage: language },
        { new: true, select: '-password' }
    );

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return sendSuccess(res, { language: user.preferredLanguage }, 'Language updated successfully');
});

/**
 * @swagger
 * /api/users/doctors:
 *   get:
 *     tags: [Authentication]
 *     summary: Get list of all doctors
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of doctors
 */
const listDoctors = asyncHandler(async (req, res) => {
    const doctors = await User.find({ role: 'doctor' })
        .select('name email')
        .sort({ name: 1 })
        .lean();

    return sendSuccess(res, doctors, 'Doctors retrieved successfully');
});

/**
 * @swagger
 * /api/users/assistants:
 *   get:
 *     tags: [Authentication]
 *     summary: Get list of all teaching assistants
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of teaching assistants
 */
const listAssistants = asyncHandler(async (req, res) => {
    const assistants = await User.find({ role: 'teaching assistant' })
        .select('name email')
        .sort({ name: 1 })
        .lean();

    return sendSuccess(res, assistants, 'Teaching assistants retrieved successfully');
});

/**
 * @swagger
 * /api/users/teachers:
 *   get:
 *     tags: [Authentication]
 *     summary: Get list of all teachers (doctors and assistants)
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of teachers
 */
const listTeachers = asyncHandler(async (req, res) => {
    const teachers = await User.find({
        role: { $in: ['doctor', 'teaching assistant'] }
    })
        .select('name email role')
        .sort({ role: 1, name: 1 })
        .lean();

    return sendSuccess(res, teachers, 'Teachers retrieved successfully');
});

/**
 * Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
    const { name, gender, dateOfBirth } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (gender) updateData.gender = gender;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, select: '-password' }
    );

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return sendSuccess(res, user, 'Profile updated successfully');
});

/**
 * Change user password
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password are required', 400, 'MISSING_PASSWORDS');
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.password) {
        throw new AppError('User not found or invalid account type', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const bcrypt = require('bcrypt');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    return sendSuccess(res, null, 'Password changed successfully');
});

module.exports = {
    localLogin,
    localRegister,
    initiateGoogleAuth,
    authenticateGoogleCallback,
    googleCallback,
    getSession,
    logout,
    updateLanguage,
    listDoctors,
    listAssistants,
    listTeachers,
    updateProfile,
    changePassword
};