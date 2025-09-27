/**
 * Custom Application Error Class
 * Provides structured error handling across the application
 */
class AppError extends Error {
  /**
   * Creates a new AppError instance
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Application-specific error code
   * @param {boolean} isOperational - Whether this is an operational error
   */
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
