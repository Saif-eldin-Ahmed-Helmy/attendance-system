const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const { handleBadRequest, handleUnauthorized, handleServerError, handleUserNotFound} = require('../handlers/error');
const {verifySession} = require("../middlewares/auth");
const {attachUserDataToRequest} = require("../middlewares/attachUserData");
const Attendance = require("../models/Attendance");

const studentsCountCache = {};

router.get('/', verifySession, attachUserDataToRequest, async (req, res) => {
    const { doctor, assistant, level, page = 1, limit = 10 } = req.query;
    let filter = {};

    if (doctor) {
        filter.doctor = doctor;
    }

    if (assistant) {
        filter.teachingAssistant = assistant;
    }

    if (level) {
        filter.level = level;
    }

    let subjects;
    if (req.user.role === 'management') {
        subjects = await Subject.find(filter)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
    } else if (req.user.role === 'doctor' || req.user.role === 'teaching assistant') {
        subjects = await Subject.find({ ...filter, '_id': { $in: req.user.subjects } })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
    }
    subjects = await Subject.populate(subjects, { path: 'doctor teachingAssistant' });
    subjects = subjects.map(subject => {
        subject = subject.toObject();
        subject.doctor = subject.doctor.name;
        if (subject.teachingAssistant) {
            subject.teachingAssistant = subject.teachingAssistant.name;
        }
        return subject;
    });

    for (let subject of subjects) {
        if (studentsCountCache[subject._id]) {
            subject.studentsCount = studentsCountCache[subject._id];
        } else {
            const studentsCount = await Student.countDocuments({ 'subjects.subject': subject._id });
            studentsCountCache[subject._id] = studentsCount;
            subject.studentsCount = studentsCount;
        }
    }

    const totalSubjects = await Subject.countDocuments(filter);
    const maxPages = Math.ceil(totalSubjects / limit);

    res.send({ items: subjects, maxPages });
});

router.get('/list', verifySession, attachUserDataToRequest, async (req, res) => {
    const subjects = await Subject.find();
    const subjectsList = subjects.map(subject => {
        return {
            id: subject._id,
            name: subject.name,
            groupsCount: subject.groups.length,
            sectionsCount: subject.sections.length
        };
    });
    res.send(subjectsList);
});

router.post('/', verifySession, attachUserDataToRequest, async (req, res) => {
    const { name, level, doctor, teachingAssistant, groups, sections, startWeek } = req.body;

    const doctorUser = await User.findById(doctor);
    if (!doctorUser) {
        return res.status(400).send('Doctor not found');
    }

    let teachingAssistantUser;
    if (teachingAssistant) {
        teachingAssistantUser = await User.findById(teachingAssistant);
        if (!teachingAssistantUser) {
            return res.status(400).send('Teaching assistant not found');
        }
    }

    const groupsWithNumbers = groups.map((group, index) => ({
        groupNumber: index + 1,
        schedule: {
            day: group.day,
            startTime: group.start,
            endTime: group.end
        }
    }));

    const sectionsWithNumbers = sections.map((section, index) => ({
        sectionNumber: index + 1,
        schedule: {
            day: section.day,
            startTime: section.start,
            endTime: section.end
        }
    }));

    const subject = new Subject({
        name,
        level,
        doctor: doctorUser._id,
        teachingAssistant: teachingAssistantUser ? teachingAssistantUser._id : undefined,
        groups: groupsWithNumbers,
        sections: sectionsWithNumbers,
        startWeek
    });

    await subject.save();

    res.send(subject);
});

router.get('/view/:id', verifySession, attachUserDataToRequest, async (req, res) => {
    let subject = await Subject.findById(req.params.id);
    subject = await Subject.populate(subject, { path: 'doctor teachingAssistant' });
    subject = subject.toObject();
    subject.doctor = subject.doctor.name;
    if (subject.teachingAssistant) {
        subject.teachingAssistant = subject.teachingAssistant.name;
    }

    const enrolledStudents = await Student.find({ 'subjects.subject': req.params.id });

    const attendances = await Attendance.find({ subject: req.params.id }).populate('student');

    const attendanceMap = {};
    for (let attendance of attendances) {
        attendanceMap[attendance.student._id.toString()] = attendance;
    }

    const diffInMs = new Date().getTime() - new Date(subject.startWeek).getTime();
    const diffInWeeks = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000));
    const currentWeek = diffInWeeks + 1;

    const studentsWithAttendance = enrolledStudents.map(student => {
        return attendanceMap[student._id.toString()] || {
            student: {
                id: student.id,
                name: student.name
            },
            lectureAttendanceTime: null,
            sectionAttendanceTime: null,
            subject: req.params.id,
            group: student.subjects.find(subject => subject.subject.toString() === req.params.id).group,
            section: student.subjects.find(subject => subject.subject.toString() === req.params.id).section,
            week: currentWeek
        };
    });
    attendances.push(...studentsWithAttendance);

    //sort attendances by id
    attendances.sort((a, b) => a.student.id.localeCompare(b.student.id));

    res.send({ subject, attendances });
});

router.get('/populate', async (req, res) => {
    try {
        const subjectId = req.query.id;

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).send('Subject not found');
        }

        for (let i = 0; i < 10; i++) {
            const student = new Student({
                name: `Student ${i + 1}`,
                id: `student${i + 1}`,
                level: 1,
                subjects: [{
                    subject: subject._id,
                    group: Math.floor(Math.random() * 2) + 1,
                    section: Math.floor(Math.random() * 2) + 1
                }]
            });
            await student.save();

            const attendedLecture = Math.random() < 0.5;
            const attendedSection = Math.random() < 0.5;

            const attendance = new Attendance({
                student: student._id,
                lectureAttendanceTime: attendedLecture ? new Date() : null,
                sectionAttendanceTime: attendedSection ? new Date() : null,
                subject: subject._id,
                group: student.subjects[0].group,
                section: student.subjects[0].section
            });
            await attendance.save();
        }

        res.send('Database populated');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = router;