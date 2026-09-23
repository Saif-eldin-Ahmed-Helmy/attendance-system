const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const service = require('../src/services/attendance.service');

test('concurrent attendance records are unique and lecture/section updates survive', { skip: !process.env.MONGODB_TEST_URI }, async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI, { dbName: 'attendance_test_' + randomUUID().replaceAll('-', '') });
    try {
        await Attendance.init();
        const record = { student: new mongoose.Types.ObjectId(), subject: new mongoose.Types.ObjectId(), week: 1, group: 1, section: 1, isLecture: true };
        const results = await Promise.allSettled(Array.from({ length: 12 }, () => service.createOrUpdateAttendance(record)));
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(await Attendance.countDocuments(), 1);
        assert.ok(results.filter(r => r.status === 'rejected').every(r => r.reason.errorCode === 'ALREADY_RECORDED'));
        record.week = 2;
        await Promise.all([service.createOrUpdateAttendance(record), service.createOrUpdateAttendance({ ...record, isLecture: false })]);
        const combined = await Attendance.findOne({ week: 2 });
        assert.ok(combined.lectureAttendanceTime);
        assert.ok(combined.sectionAttendanceTime);
        assert.equal(await Attendance.countDocuments({ week: 2 }), 1);
    } finally {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
});

test('real login/session routes and teacher views respect subject membership', { skip: !process.env.MONGODB_TEST_URI }, async () => {
    const express = require('express');
    const session = require('express-session');
    const passport = require('passport');
    const { once } = require('node:events');
    const User = require('../models/User');
    const Subject = require('../models/Subject');
    const Student = require('../models/Student');
    await mongoose.connect(process.env.MONGODB_TEST_URI, { dbName: 'attendance_test_' + randomUUID().replaceAll('-', '') });
    const app = express();
    app.use(require('../middlewares/origin').requireTrustedOrigin);
    app.use(express.json());
    app.use(session({ secret: 'test-session-secret-not-for-deployment', resave: false, saveUninitialized: false }));
    app.use(passport.initialize()); app.use(passport.session());
    require('../src/config/passport.config').initialize();
    app.use('/api/users', require('../routes/users.routes'));
    app.use('/api/students', require('../routes/students.routes'));
    app.use('/api/subjects', require('../routes/subjects.routes'));
    app.use(require('../src/middleware/error.middleware').globalErrorHandler);
    const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = { 'content-type': 'application/json', origin: process.env.CLIENT_URL || 'http://localhost:5173' };
    try {
        const teacher = await User.create({ name: 'Teacher', email: 'teacher@example.com', password: 'test-only-password', role: 'doctor' });
        const colleague = await User.create({ name: 'Colleague', email: 'other@example.com', role: 'doctor' });
        const own = await Subject.create({ name: 'Own course', doctor: teacher._id, level: 1, startWeek: new Date() });
        const other = await Subject.create({ name: 'Other course', doctor: colleague._id, level: 1, startWeek: new Date() });
        await Student.collection.insertMany([
            { id: 'student-own', name: 'Own Student', level: 1, subjects: [{ subject: own._id }] },
            { id: 'student-other', name: 'Other Student', level: 1, subjects: [{ subject: other._id }] }
        ]);
        const login = await fetch(base + '/api/users/login', { method: 'POST', headers, body: JSON.stringify({ email: teacher.email, password: 'test-only-password' }) });
        assert.equal(login.status, 200);
        headers.cookie = login.headers.get('set-cookie').split(';')[0];
        assert.equal((await fetch(base + '/api/users/session', { headers })).status, 200);
        assert.equal((await fetch(base + '/api/students/view/student-other', { headers })).status, 403);
        const listing = await (await fetch(base + '/api/students/list', { headers })).json();
        assert.equal(listing.data.items.length, 1);
        assert.equal(listing.data.items[0].id, 'student-own');
        const detail = await (await fetch(base + '/api/subjects/view/' + own._id, { headers })).json();
        assert.equal(detail.data.subject.name, own.name);
        assert.equal(detail.data.enrolledStudents.length, 1);
        assert.equal((await fetch(base + '/api/subjects/view/' + other._id, { headers })).status, 403);
        assert.equal((await fetch(base + '/api/users/logout', { method: 'POST', headers })).status, 200);
        assert.equal((await fetch(base + '/api/users/session', { headers })).status, 401);
    } finally {
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
        await mongoose.connection.dropDatabase(); await mongoose.disconnect();
    }
});
