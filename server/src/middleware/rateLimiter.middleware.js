const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

/**
 * General API Rate Limiter
 * Applies to all API routes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

/**
 * Authentication Rate Limiter
 * Stricter limits for login/register endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Attendance Rate Limiter
 * For attendance submission endpoints
 */
const attendanceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Allow up to 30 attendance submissions per minute
  message: {
    success: false,
    error: {
      code: 'ATTENDANCE_RATE_LIMIT_EXCEEDED',
      message: 'Too many attendance submissions, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * File Upload Rate Limiter
 * For file upload endpoints
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 file uploads per hour
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  attendanceLimiter,
  uploadLimiter
};
