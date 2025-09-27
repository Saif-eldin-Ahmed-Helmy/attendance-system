const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Swagger Configuration
 * OpenAPI 3.0 specification for the Smart College Attendance System API
 */

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart College Attendance System API',
      version: '1.0.0',
      description: `
        A comprehensive attendance tracking system API built with Node.js and Express.
        This API handles student management, attendance tracking, subject management,
        and integrates with hardware devices (OCR, RFID, keypad) for seamless attendance recording.
      `,
      contact: {
        name: 'API Support',
        email: 'saif.eldin.ahmed92@gmail.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Session-based authentication using cookies'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            name: { type: 'string', example: 'First LastName' },
            role: { 
              type: 'string', 
              enum: ['student', 'teacher', 'management', 'admin'],
              example: 'student'
            },
            preferredLanguage: { type: 'string', example: 'en' },
            subjects: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        Student: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            id: { type: 'string', example: '20210001' },
            name: { type: 'string', example: 'Ahmed Mohamed' },
            level: { type: 'integer', minimum: 1, maximum: 4, example: 2 },
            subjects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  subject: { type: 'string', example: '507f1f77bcf86cd799439011' },
                  group: { type: 'integer', minimum: 1, maximum: 2, example: 1 },
                  section: { type: 'integer', minimum: 1, maximum: 4, example: 2 }
                }
              }
            }
          }
        },
        Subject: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Database Systems' },
            code: { type: 'string', example: 'CS301' },
            level: { type: 'integer', minimum: 1, maximum: 4, example: 3 },
            startWeek: { type: 'string', format: 'date', example: '2024-02-01' },
            doctor: { $ref: '#/components/schemas/User' },
            teachingAssistant: { $ref: '#/components/schemas/User' }
          }
        },
        Attendance: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            student: { type: 'string', example: '507f1f77bcf86cd799439011' },
            subject: { type: 'string', example: '507f1f77bcf86cd799439011' },
            week: { type: 'integer', example: 5 },
            group: { type: 'integer', minimum: 1, maximum: 2, example: 1 },
            section: { type: 'integer', minimum: 1, maximum: 4, example: 2 },
            lectureAttendanceTime: { type: 'string', format: 'date-time' },
            sectionAttendanceTime: { type: 'string', format: 'date-time' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            timestamp: { type: 'string', format: 'date-time' },
            data: { type: 'object' }
          }
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid input data' },
                timestamp: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Data retrieved successfully' },
            timestamp: { type: 'string', format: 'date-time' },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: { type: 'object' } },
                pagination: {
                  type: 'object',
                  properties: {
                    currentPage: { type: 'integer', example: 1 },
                    totalPages: { type: 'integer', example: 5 },
                    totalItems: { type: 'integer', example: 47 },
                    hasNext: { type: 'boolean', example: true },
                    hasPrev: { type: 'boolean', example: false }
                  }
                }
              }
            }
          }
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          }
        },
        SearchParam: {
          name: 'search',
          in: 'query',
          description: 'Search query string',
          required: false,
          schema: {
            type: 'string',
            maxLength: 100
          }
        }
      },
      responses: {
        Success: {
          description: 'Operation successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' }
            }
          }
        },
        BadRequest: {
          description: 'Bad request - Invalid input data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' }
            }
          }
        },
        RateLimitExceeded: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Students',
        description: 'Student management operations'
      },
      {
        name: 'Subjects',
        description: 'Subject and course management'
      },
      {
        name: 'Attendance',
        description: 'Attendance tracking and statistics'
      },
      {
        name: 'Hardware',
        description: 'Hardware device integration (OCR, RFID, Keypad)'
      },
      {
        name: 'Announcements',
        description: 'Announcement management'
      },
      {
        name: 'Materials',
        description: 'Course materials and file management'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './routes/*.js',
    './src/controllers/*.js',
    './controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

/**
 * Setup Swagger UI middleware
 * @param {Express} app - Express application instance
 */
const setupSwagger = (app) => {
  // Swagger UI endpoint
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #007bff; }
    `,
    customSiteTitle: 'Smart College Attendance System API Documentation'
  }));

  // JSON endpoint for OpenAPI specification
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('Swagger UI available at: http://localhost:3001/api-docs');
};

module.exports = { setupSwagger, specs };
