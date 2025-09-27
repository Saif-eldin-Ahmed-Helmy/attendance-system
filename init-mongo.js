// MongoDB initialization script for Smart College Attendance System
// This script creates the database, collections, and indexes

db = db.getSiblingDB('attendance_system');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'User email - required and must be unique'
        },
        name: {
          bsonType: 'string',
          description: 'User name - required'
        },
        role: {
          bsonType: 'string',
          enum: ['student', 'teacher', 'doctor', 'teaching assistant', 'management', 'admin'],
          description: 'User role - required'
        }
      }
    }
  }
});

db.createCollection('students', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'id', 'level'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Student name - required'
        },
        id: {
          bsonType: 'string',
          description: 'Student ID - required and must be unique'
        },
        level: {
          bsonType: 'int',
          minimum: 1,
          maximum: 4,
          description: 'Student level (1-4) - required'
        }
      }
    }
  }
});

db.createCollection('subjects', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'code', 'level', 'startWeek'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Subject name - required'
        },
        code: {
          bsonType: 'string',
          description: 'Subject code - required and must be unique'
        },
        level: {
          bsonType: 'int',
          minimum: 1,
          maximum: 4,
          description: 'Subject level (1-4) - required'
        }
      }
    }
  }
});

// Create indexes for better performance
print('Creating database indexes...');

// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ 'subjects': 1 });

// Students collection indexes
db.students.createIndex({ id: 1 }, { unique: true });
db.students.createIndex({ name: 1 });
db.students.createIndex({ level: 1 });
db.students.createIndex({ 'subjects.subject': 1 });

// Subjects collection indexes
db.subjects.createIndex({ code: 1 }, { unique: true });
db.subjects.createIndex({ name: 1 });
db.subjects.createIndex({ level: 1 });
db.subjects.createIndex({ doctor: 1 });
db.subjects.createIndex({ teachingAssistant: 1 });

// Attendance collection indexes
db.attendance.createIndex({ student: 1, subject: 1, week: 1 });
db.attendance.createIndex({ subject: 1, week: 1 });
db.attendance.createIndex({ lectureAttendanceTime: 1 });
db.attendance.createIndex({ sectionAttendanceTime: 1 });

// Announcements collection indexes
db.announcements.createIndex({ author: 1 });
db.announcements.createIndex({ subject: 1 });
db.announcements.createIndex({ createdAt: -1 });

// Materials collection indexes
db.materials.createIndex({ subject: 1 });
db.materials.createIndex({ uploadedBy: 1 });
db.materials.createIndex({ createdAt: -1 });
db.materials.createIndex({ isActive: 1 });

// Cameras collection indexes
db.cameras.createIndex({ cameraId: 1 }, { unique: true });
db.cameras.createIndex({ subjectId: 1 });

// Create default admin user
print('Creating default admin user...');
db.users.insertOne({
  email: 'admin@attendance.system',
  name: 'System Administrator',
  role: 'admin',
  password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/CxHAkl4qB9Dn5V4Ra', // password: admin123
  preferredLanguage: 'en',
  subjects: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialization completed successfully!');
print('Default admin credentials: admin@attendance.system / admin123');
print('Please change the default password after first login.');
