// controllers/studentController.js
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const fs = require('fs');

// GET /students/             (management only)
async function listManagedStudents(req, res) {
    if (req.user.role !== 'management') {
        return res.status(403).json({ error: 'UNAUTHORIZED' });
    }
    const students = await Student.find({
        $or: [
            { 'subjects.doctor': req.user._id },
            { 'subjects.teachingAssistant': req.user._id }
        ]
    });
    return res.json(students);
}

// GET /students/list?page=&limit=&level=&search=
async function listStudents(req, res) {
    const { level, page = 1, limit = 10, search = '' } = req.query;
    const filter = {};
    if (level) filter.level = level;
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { id:   { $regex: search, $options: 'i' } }
        ];
    }
    const skip = (page - 1) * limit;
    const students = await Student.find(filter)
        .populate('subjects.subject', 'name')
        .skip(skip)
        .limit(parseInt(limit));
    const total = await Student.countDocuments(filter);
    const maxPages = Math.ceil(total / limit);
    const items = students.map(s => ({
        id: s.id,
        name: s.name,
        level: s.level,
        subjects: s.subjects.map(x => x.subject.name)
    }));
    return res.json({ items, maxPages });
}

// POST /students/upload  (multipart file)
async function uploadStudents(req, res) {
    let { subject: subjName, group, section } = req.body;
    const subject = await Subject.findOne({ name: subjName });
    if (!subject) {
        return res.status(400).json({ error: 'SUBJECT_NOT_FOUND' });
    }
    const subjectId = subject._id;
    const text = req.file.buffer.toString('utf8');
    const lines = text.split(/\r?\n/);
    const studentRegex = /^\s*(\d{6,})\s+([\u0600-\u06FF\s]+)/;

    for (let line of lines) {
        if (!line.trim() || /كود الطالب/.test(line)) continue;
        const clean = line.replace(/\s+/g, ' ')
            .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
            .trim();
        const m = clean.match(studentRegex);
        if (!m) continue;
        const [ , id, rawName ] = m;
        const name = rawName.replace(/\d+$/, '').trim();
        if (id.length < 6 || name.length < 5) continue;
        await processStudentRecord(name, id, subjectId, group, section);
    }
    return res.json({ status: 'OK' });
}

// Helpers
async function processStudentRecord(name, id, subjectId, group, section) {
    let student = await Student.findOne({ id }).populate('subjects');
    if (!student) {
        student = new Student({ id, name, level: 1 });
    } else {
        student.name = name;
    }
    const idx = student.subjects.findIndex(s => s.subject.toString() === subjectId.toString());
    if (idx !== -1) {
        if (group)   student.subjects[idx].group   = group;
        if (section) student.subjects[idx].section = section;
    } else {
        student.subjects.push({ subject: subjectId, group: group || null, section: section || null });
    }
    await student.save();
}

// GET /students/info?id=
async function getStudentInfo(req, res) {
    const { id } = req.query;
    const student = await Student.findOne({ id });
    return res.send(student ? student.name : 'Not Found');
}

// GET /students/view/:id
async function viewStudent(req, res) {
    const { id } = req.params;
    const student = await Student.findById(id).populate('subjects.subject');
    if (!student) {
        return res.status(404).json({ error: 'STUDENT_NOT_FOUND' });
    }
    const sObj = student.toObject();
    sObj.subjects = sObj.subjects.map(x => ({
        ...x,
        subject: x.subject.name
    }));
    const attendances = await Attendance.find({ student: id }).populate('subject');
    return res.json({ student: sObj, attendances });
}

module.exports = {
    listManagedStudents,
    listStudents,
    uploadStudents,
    getStudentInfo,
    viewStudent
};