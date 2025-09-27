// Test script to validate all imports and check for errors
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Smart College Attendance System Backend...');
console.log('Current directory:', __dirname);

try {
  // Test basic dependencies
  console.log('✅ Testing basic dependencies...');
  require('dotenv').config();

  // Test database connection
  console.log('✅ Testing database connection...');
  const connectToDatabase = require('./config/database');

  // Test our new services
  console.log('✅ Testing new services...');
  const PassportConfig = require('./src/config/passport.config');
  const WebSocketService = require('./src/services/websocket.service');
  const StudentService = require('./src/services/student.service');
  const AttendanceService = require('./src/services/attendance.service');
  const OCRService = require('./src/services/ocr.service');

  // Test middleware
  console.log('✅ Testing middleware...');
  const { globalErrorHandler, notFoundHandler } = require('./src/middleware/error.middleware');
  const { apiLimiter } = require('./src/middleware/rateLimiter.middleware');
  const { validate, schemas } = require('./src/middleware/validation.middleware');

  // Test utils
  console.log('✅ Testing utilities...');
  const AppError = require('./src/utils/AppError');
  const { sendSuccess } = require('./src/utils/responseHandler');

  // Test controllers
  console.log('✅ Testing controllers...');
  const authController = require('./controllers/auth.controller');
  const studentsController = require('./controllers/students.controller');
  const subjectsController = require('./controllers/subjects.controller');

  console.log('🎉 All imports successful! Backend is ready to start.');

} catch (error) {
  console.error('❌ Import error found:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
