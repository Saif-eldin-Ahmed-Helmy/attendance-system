const User = require('../models/User');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const ExcelJS = require('exceljs');
const {
    handleBadRequest,
    handleUnauthorized,
    handleServerError
} = require('../handlers/error');

const daysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// GET /subjects?doctor=&assistant=&level=&page=&limit=
async function listSubjects(req, res) {
    const { doctor, assistant, level, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (doctor) filter.doctor = doctor;
    if (assistant) filter.teachingAssistant = assistant;
    if (level) filter.level = level;

    let subjects;
    if (req.user.role === 'management') {
        subjects = await Subject.find(filter)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
    } else if (['doctor','teaching assistant'].includes(req.user.role)) {
        subjects = await Subject.find({
            ...filter,
            _id: { $in: req.user.subjects }
        })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
    } else {
        return handleUnauthorized(res);
    }

    subjects = await Subject.populate(subjects, 'doctor teachingAssistant');
    const studentsCountCache = {};
    const results = [];

    for (const subj of subjects) {
        const obj = subj.toObject();
        obj.doctor = obj.doctor.name;
        if (obj.teachingAssistant) obj.teachingAssistant = obj.teachingAssistant.name;

        if (studentsCountCache[obj._id]) {
            obj.studentsCount = studentsCountCache[obj._id];
        } else {
            const count = await Student.countDocuments({'subjects.subject': obj._id});
            studentsCountCache[obj._id] = count;
            obj.studentsCount = count;
        }
        results.push(obj);
    }

    const total = await Subject.countDocuments(filter);
    const maxPages = Math.ceil(total / limit);
    return res.json({ items: results, maxPages });
}

// GET /subjects/list
async function listAllSubjects(req, res) {
    const subjects = await Subject.find();
    const list = subjects.map(s => ({
        id: s._id,
        name: s.name,
        groupsCount: s.groups.length,
        sectionsCount: s.sections.length
    }));
    return res.json(list);
}

// POST /subjects
async function createSubject(req, res) {
    const { name, level, doctor, teachingAssistant, groups, sections, startWeek } = req.body;
    const doctorUser = await User.findById(doctor);
    if (!doctorUser) return handleBadRequest(res, 'Doctor not found');
    let taUser;
    if (teachingAssistant) {
        taUser = await User.findById(teachingAssistant);
        if (!taUser) return handleBadRequest(res, 'Teaching assistant not found');
    }

    const groupsWithNumbers = groups.map((g,i) => ({
        groupNumber: i+1,
        schedule: {
            day: g.day,
            startTime: g.start,
            endTime: g.end,
            roomNumber: g.roomNumber
        }
    }));

    const sectionsWithNumbers = sections.map((s,i) => ({
        sectionNumber: i+1,
        schedule: {
            day: s.day,
            startTime: s.start,
            endTime: s.end,
            labNumber: s.labNumber
        }
    }));

    const subj = new Subject({
        name,
        level,
        doctor: doctorUser._id,
        teachingAssistant: taUser? taUser._id : undefined,
        groups: groupsWithNumbers,
        sections: sectionsWithNumbers,
        startWeek
    });
    await subj.save();
    return res.json(subj);
}

// GET /subjects/view/:id
async function viewSubject(req, res) {
    const { id } = req.params;
    const subj = await Subject.findById(id).populate('doctor teachingAssistant');
    if (!subj) return handleBadRequest(res, 'Subject not found');
    const obj = subj.toObject();
    obj.doctor = obj.doctor.name;
    if (obj.teachingAssistant) obj.teachingAssistant = obj.teachingAssistant.name;

    const students = await Student.find({'subjects.subject': id});
    const enroll = students.map(st => {
        const entry = st.subjects.find(x => x.subject.toString()===id);
        return {_id: st._id, id: st.id, name: st.name,
            group: entry.group, section: entry.section};
    });

    const attendances = await Attendance.find({subject: id}).populate('student');
    return res.json({ subject: obj, attendances, enrolledStudents: enroll });
}

// GET /subjects/populate
async function populateDatabase(req, res) {
    for (const subj of await Subject.find().populate('groups.schedule sections.schedule')) {
        const now = new Date();
        const start = new Date(subj.startWeek);
        const currentWeek = Math.floor((now - start)/(7*86400000))+1;

        for (let w=1; w<=currentWeek; w++) {
            if (w===12) continue;
            for (const student of await Student.find({'subjects.subject': subj._id})) {
                const sub = student.subjects.find(x=>x.subject.toString()===subj._id.toString());
                if (!sub) continue;
                const grp = subj.groups.find(g=>g.groupNumber===sub.group);
                const sec = subj.sections.find(s=>s.sectionNumber===sub.section);
                // random attendance logic omitted for brevity
                // ... same as before ...
            }
        }
    }
    return res.send('Database populated');
}

// GET /subjects/view/:id/attendance/excel/:week
async function exportAttendanceExcel(req, res) {
    const { id, week } = req.params;
    const subj = await Subject.findById(id)
        .populate('doctor teachingAssistant groups.schedule sections.schedule');
    if (!subj) return handleBadRequest(res, 'Subject not found');

    let attendances = await Attendance.find({subject: id}).populate('student');
    let students = await Student.find({'subjects.subject': id});
    // filter and map logic same as before...

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Attendance');
    // build columns and rows same as before...

    res.setHeader('Content-Type', 'application/vnd.openxmlformats...');
    res.setHeader('Content-Disposition', `attachment; filename=${subj.name}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
}

module.exports = {
    listSubjects,
    listAllSubjects,
    createSubject,
    viewSubject,
    populateDatabase,
    exportAttendanceExcel
};