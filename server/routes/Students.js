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

module.exports = router;