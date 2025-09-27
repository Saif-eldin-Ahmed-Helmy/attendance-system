const AppError = require('../utils/AppError');

/**
 * Global Error Handler Middleware
 * Handles all errors in a consistent format
 */
const globalErrorHandler = (err, req, res, next) => {
  // Default error values
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404, 'RESOURCE_NOT_FOUND');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const value = Object.values(err.keyValue)[0];
    const message = `Duplicate field value: ${value}`;
    error = new AppError(message, 400, 'DUPLICATE_FIELD');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    const message = `Invalid input data: ${errors.join('. ')}`;
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired';
    error = new AppError(message, 401, 'TOKEN_EXPIRED');
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      code: error.errorCode || 'INTERNAL_ERROR',
      message: error.message,
      timestamp: error.timestamp || new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * Async Error Handler
 * Wraps async functions to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

module.exports = {
  globalErrorHandler,
  asyncHandler,
  notFoundHandler
};
