/**
 * Standardized API Response Utilities
 * Provides consistent response format across all endpoints
 */

/**
 * Success Response Handler
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...(data && { data })
  };

  return res.status(statusCode).json(response);
};

/**
 * Paginated Response Handler
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of items
 * @param {string} message - Success message
 */
const sendPaginatedResponse = (
  res,
  items,
  currentPage,
  totalPages,
  totalItems,
  message = 'Success'
) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data: {
      items,
      pagination: {
        currentPage: parseInt(currentPage),
        totalPages: parseInt(totalPages),
        totalItems: parseInt(totalItems),
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    }
  };

  return res.status(200).json(response);
};

/**
 * Created Response Handler
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 */
const sendCreated = (res, data = null, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * No Content Response Handler
 * @param {Object} res - Express response object
 */
const sendNoContent = (res) => {
  return res.status(204).send();
};

/**
 * Error Response Handler
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} errorCode - Application error code
 * @param {number} statusCode - HTTP status code
 */
const sendError = (res, message = 'Internal Server Error', errorCode = 'INTERNAL_ERROR', statusCode = 500) => {
  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
      timestamp: new Date().toISOString()
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Validation Error Response Handler
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 */
const sendValidationError = (res, errors) => {
  const response = {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    }
  };

  return res.status(400).json(response);
};

module.exports = {
  sendSuccess,
  sendPaginatedResponse,
  sendCreated,
  sendNoContent,
  sendError,
  sendValidationError
};
