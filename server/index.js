require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');

// Import configurations and services
const connectToDatabase = require('./config/database');
const PassportConfig = require('./src/config/passport.config');
const { setupSwagger } = require('./src/config/swagger.config');
const WebSocketService = require('./src/services/websocket.service');

// Import middleware
const { globalErrorHandler, notFoundHandler } = require('./src/middleware/error.middleware');
const { apiLimiter } = require('./src/middleware/rateLimiter.middleware');

const app = express();
const server = require('node:http').createServer(app);
const port = process.env.PORT || 3001;

/**
 * Initialize database connection
 */
connectToDatabase().then(() => {
    console.log('✅ Database connected successfully');
}).catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
});

/**
 * Configure CORS
 */
app.use(cors({
    origin: [
        process.env.CLIENT_URL || 'http://localhost:5173',
        'http://localhost:3001'
    ],
    credentials: true,
}));

/**
 * Basic middleware setup
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

/**
 * Apply rate limiting to all API routes
 */
app.use('/api', apiLimiter);

/**
 * Session configuration
 */
app.use(session({
    secret: process.env.ACCESS_TOKEN_SECRET || 'fallback-secret-key',
    name: 'attendance.sid',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600 // Lazy session update
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        rolling: true,
        httpOnly: true
    },
}));

/**
 * Initialize Passport authentication
 */
app.use(passport.initialize());
app.use(passport.session());
PassportConfig.initialize();

/**
 * Initialize WebSocket service
 */
WebSocketService.initialize(server);

/**
 * WebSocket message endpoint for hardware/external integration
 */
app.post('/websocket/message', (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'MISSING_MESSAGE',
                message: 'Message is required'
            }
        });
    }

    const sentCount = WebSocketService.broadcastMessage({
        type: 'system_notification',
        message,
        timestamp: new Date().toISOString()
    });

    res.json({
        success: true,
        message: `Message sent to ${sentCount} clients`,
        timestamp: new Date().toISOString()
    });
});

/**
 * API Routes
 */
const usersRouter = require('./routes/users.routes');
const studentsRouter = require('./routes/students.routes');
const subjectsRouter = require('./routes/subjects.routes');
const cameraRouter = require('./routes/camera.routes');
const announcementRouter = require('./routes/announcements.routes');
const materialRouter = require('./routes/materials.routes');

app.use('/api/users', usersRouter);
app.use('/api/students', studentsRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/camera', cameraRouter);
app.use('/api/announcement', announcementRouter);
app.use('/api/material', materialRouter);

/**
 * Setup API documentation
 */
setupSwagger(app);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Smart College Attendance System is running',
        timestamp: new Date().toISOString(),
        data: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            connectedClients: WebSocketService.getConnectedClientsCount()
        }
    });
});

/**
 * 404 handler for undefined routes
 */
app.use(notFoundHandler);

/**
 * Global error handler (must be last middleware)
 */
app.use(globalErrorHandler);

/**
 * Start server
 */
server.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`📖 API Documentation: http://localhost:${port}/api-docs`);
    console.log(`🔗 WebSocket Server initialized`);
    console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
});

/**
 * Graceful shutdown handling
 */
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    WebSocketService.shutdown();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully...');
    WebSocketService.shutdown();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});