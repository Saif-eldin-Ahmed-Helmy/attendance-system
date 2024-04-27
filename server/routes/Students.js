const express = require('express');
const router = express.Router();
const { handleUnauthorized, handleServerError } = require('../handlers/error');
const { verifySession } = require("../middlewares/auth");
const multer = require('multer');
const { Buffer } = require('buffer');
const Student = require('../models/Student');
const {attachUserDataToRequest} = require("../middlewares/attachUserData");
const fs = require('fs');
const Subject = require("../models/Subject");
const Attendance = require("../models/Attendance");

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', verifySession, attachUserDataToRequest, async (req, res) => {
    try {
        if (req.user.role !== 'management') {
            return handleUnauthorized(res);
        }
        const students = await Student.find({
            $or: [
                {
                    'subjects.doctor': req.user._id
                },
                {
                    'subjects.teachingAssistant': req.user._id
                }
            ]
        });
        await res.json(students);
    } catch (error) {
        handleServerError(res, error);
    }
});

router.get('/list', async (req, res) => {
    const { level, page = 1, limit = 10, search = '' } = req.query;
    let filter = {};

    if (level) {
        filter.level = level;
    }

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { id: { $regex: search, $options: 'i' } }
        ];
    }

    try {
        const students = await Student.find(filter).populate('subjects.subject', 'name')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalStudents = await Student.countDocuments(filter);
        const maxPages = Math.ceil(totalStudents / limit);

        const studentsToSend = students.map(student => {
            return {
                id: student.id,
                name: student.name,
                level: student.level,
                subjects: student.subjects.map(subject => subject.subject.name),
            };
        });

        res.send({ items: studentsToSend, maxPages });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching students');
    }
});

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        let subjectId = req.body.subject;
        const subject = await Subject.findOne({ name: subjectId });
        if (!subject) {
            return res.status(400).send('Subject not found');
        }
        else {
            subjectId = subject._id;
        }
        const groupId = req.body.group;
        const sectionId = req.body.section;
        const text = req.file.buffer.toString('utf8');

        const lines = text.split('\n');

        const regex = /^\s*(\S+)\s+(\S+)\s+(.+)\s*$/;

        for (let line of lines) {
            const match = line.match(regex);
            if (match) {
                const id = match[1];
                const number = match[2];
                const name = match[3];
                console.log(id, number, name);
                await processStudent(name, id, res, subjectId, groupId, sectionId);
            }
            else {
                console.error('Invalid line:', line);
            }
        }

    } catch (error) {
        console.error('Error processing text file:', error);
        res.status(500).send('Error processing text file');
    }
});

async function processStudent(name, id, res, subjectId, groupId, sectionId) {
    try {
        let student = await Student.findOne({ id });
        if (!student) {
            student = new Student({ id, name, level: 1 });
        } else {
            student.name = name;
        }

        student = await student.populate('subjects');

        if (subjectId) {
            const subjectIndex = student.subjects.findIndex(subject => subject.subject.toString() === subjectId.toString());
            if (subjectIndex !== -1) {
                if (groupId) {
                    student.subjects[subjectIndex].group = groupId;
                }
                if (sectionId) {
                    student.subjects[subjectIndex].section = sectionId;
                }
            } else {
                student.subjects.push({
                    subject: subjectId,
                    group: groupId || null,
                    section: sectionId || null
                });
            }
        }

        await student.save();

    } catch (error) {
        console.error('Error processing student:', error);
        res.status(500).send('Error processing student');
    }
}

router.get('/info', async (req, res) => {
    console.log('received request from esp32');
    const {id} = req.query;

    console.log(req.query);
    let student = await Student.findOne({ id: id });
    if (student) {
        res.send(student.name);
    }
    else {
        res.send("Not Found");
    }
});

router.get('/view/:id', async (req, res) => {
    const { id } = req.params;

    let student = await Student.findById(id).populate('subjects.subject');
    if (!student) {
        return res.status(404).send('Student not found');
    }

    student = student.toObject();
    student.subjects = student.subjects.map(subject => ({
        ...subject,
        subject: subject.subject.name
    }));

    const attendances = await Attendance.find({ student: id }).populate('subject');

    res.send({ student, attendances });
});

module.exports = router;