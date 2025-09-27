const Joi = require('joi');
const AppError = require('../utils/AppError');

/**
 * Validation Middleware Factory
 * Creates middleware for request validation
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('. ');
      return next(new AppError(errorMessage, 400, 'VALIDATION_ERROR'));
    }

    next();
  };
};

/**
 * Validation Schemas
 */
const schemas = {
  // Authentication schemas
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).max(50).required(),
    gender: Joi.string().valid('male', 'female').optional(),
    dateOfBirth: Joi.date().optional()
  }),

  // Student schemas
  student: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    id: Joi.string().min(6).required(),
    level: Joi.number().valid(1, 2, 3, 4).required()
  }),

  studentUpload: Joi.object({
    subject: Joi.string().required(),
    group: Joi.number().valid(1, 2).optional(),
    section: Joi.number().valid(1, 2, 3, 4).optional()
  }),

  // Subject schemas
  subject: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(20).required(),
    level: Joi.number().valid(1, 2, 3, 4).required(),
    startWeek: Joi.date().required()
  }),

  // Attendance schemas
  attendance: Joi.object({
    id: Joi.string().required(),
    location: Joi.string().pattern(/^(ROOM|LAB)\|\d+$/).required()
  }),

  // Announcement schemas
  announcement: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    content: Joi.string().min(10).max(2000).required(),
    subject: Joi.string().optional()
  }),

  // Material schemas
  material: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(500).optional(),
    subject: Joi.string().required()
  })
};

/**
 * Query Parameter Validation
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('. ');
      return next(new AppError(errorMessage, 400, 'QUERY_VALIDATION_ERROR'));
    }

    next();
  };
};

/**
 * Common Query Schemas
 */
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(100).optional(),
    level: Joi.number().valid(1, 2, 3, 4).optional()
  })
};

module.exports = {
  validate,
  validateQuery,
  schemas,
  querySchemas
};
