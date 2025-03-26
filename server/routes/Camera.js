const express = require('express');
const router = express.Router();
const fs = require('fs');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');
const Camera = require("../models/Camera");
const Subject = require("../models/Subject");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

let frameNumber = 0;
let imageDataBuffer = Buffer.from([]);

router.get('/test', async (req, res) => {
    await fetch('http://localhost:3001/websocket/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello' })
    }).then(data => console.log(data)).then((r) => res.send(r));
});

const cache = {};
const idCache = { lastReadId: null, confirmed: false };

router.post('/video-stream/', async (req, res) => {
    const { id } = req.params;
    console.log('Received image data from ESP32-CAM:', id);

    const timeout = setTimeout(() => {
        console.log('Timeout reached. Processing incomplete image data.');

        // Process the accumulated image data when timeout is reached
        processImageData();
    }, 1000); // Timeout after 1 second

    req.on('data', (dataChunk) => {
        // Accumulate incoming image data chunks
        imageDataBuffer = Buffer.concat([imageDataBuffer, dataChunk]);
    });

    req.on('end', () => {
        // Clear the timeout when request ends
        clearTimeout(timeout);

        // Process the accumulated image data
        processImageData();
    });

    async function processImageData() {
        if (imageDataBuffer.length > 0) {
            // Process the accumulated image data
            const imageFilePath = `frame_${frameNumber}.jpg`;
            sharp(imageDataBuffer)
                .sharpen() // Sharpen the image
                .removeAlpha() // Remove the alpha channel
                .toBuffer()
                .then(async (buffer) => {
                    await sharp(buffer)
                        .toFile(imageFilePath)
                        .then(async () => {
                            frameNumber++;

                            // Perform OCR on the image
                            const worker = await createWorker("eng", 1, {
                                errorHandler: error => console.error(error),
                            });
                            await worker.setParameters({
                                tessedit_char_whitelist: '0123456789',
                            });
                            const { data: { text, confidence } } = await worker.recognize(imageFilePath);

                            // Split the text into lines
                            const lines = text.split('\n');

                            let idFound = false;

                            // Iterate over the lines
                            for (const line of lines) {
                                console.log(line)
                                // Check if the line contains the format "420230???" where "???" are any three digits
                                const match = line.match(/420230\d{3}/);
                                if (match) {
                                    idFound = true;
                                    const parsedStudentId = match[0];
                                    // Parse the matching part of the line
                                    console.log("Parsed ID:")
                                    console.log(match[0]);
                                    console.log(`OCR's confidence: ${confidence}%`);

                                    if (idCache.lastReadId === parsedStudentId) {
                                        // If it's the same, confirm it
                                        idCache.confirmed = true;
                                    } else {
                                        // If it's not the same, store it as the new last read ID and set confirmed to false
                                        idCache.lastReadId = parsedStudentId;
                                        idCache.confirmed = false;
                                    }

                                    // If the ID is not confirmed, skip the rest of the processing
                                    if (!idCache.confirmed) {
                                        console.log('ID not confirmed yet:', parsedStudentId);
                                        res.status(200).send(match[0] + "|Fail|Confirmation");
                                        break;
                                    }

                                    // Check if the ID is in the cache and was processed less than 10 seconds ago
                                    const now = Date.now();
                                    if (cache[parsedStudentId] && now - cache[parsedStudentId] < 10000) {
                                        console.log('Skipping processing of ID:', parsedStudentId);
                                        res.status(200).send(match[0] + "|Fail|Cooldown");
                                        break;
                                    }

                                    // Update the cache
                                    cache[parsedStudentId] = now;

                                    await fetch('http://localhost:3001/websocket/message', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ message: 'ID: ' + match[0] })
                                    });

                                    const camera = await Camera.findOne({ cameraId: id });
                                    if (!camera) {
                                        // send post request to localhost:3001/websocket/message with message 'Camera not found'
                                        await fetch('http://localhost:3001/websocket/message', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ message: 'ERROR|Camera not found' })
                                        });
                                        return res.status(200).send(match[0] + "|Fail|Invalid Camera");
                                    }
                                    console.log('camera', id, camera);

                                    // The camera must have a group or section selected
                                    if (!camera.groupNumber && !camera.sectionNumber) {
                                        await fetch('http://localhost:3001/websocket/message', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ message: 'ERROR|Group or section not selected' })
                                        });
                                        return res.status(200).send(match[0] + "|Fail|Group or Section Not Selected");
                                    }

                                    // Find the student whose ID was parsed from the image
                                    const student = await Student.findOne({ id: parsedStudentId }).populate('subjects');
                                    if (!student) {
                                        await fetch('http://localhost:3001/websocket/message', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ message: 'ERROR|Student not found' })
                                        });
                                        return res.status(200).send(match[0] + "|Fail|Invalid Student");
                                    }
                                    else {
                                        console.log('Student found:', student);

                                        // Check if the student is enrolled in the subject of the camera
                                        if (camera.subjectId && !student.subjects.some(subject => subject.subject.toString() === camera.subjectId.toString())) {
                                            await fetch('http://localhost:3001/websocket/message', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ message: 'ERROR|Student is not enrolled in the subject' })
                                            });
                                            return res.status(200).send(match[0] + "|Fail|Student Not Enrolled in Subject");
                                        }

                                        // Check if the student is part of the group or section of the camera
                                        if (camera.groupNumber && !student.subjects.some(subject => subject.group === camera.groupNumber)) {
                                            await fetch('http://localhost:3001/websocket/message', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ message: 'ERROR|Student is not part of the group' })
                                            });
                                            return res.status(200).send(match[0] + "|Fail|Student Not Part of Group");
                                        }

                                        // loop subjects and and check if enrolled in section
                                        if (camera.sectionNumber && !student.subjects.some(subject => subject.section === camera.sectionNumber)) {
                                            await fetch('http://localhost:3001/websocket/message', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ message: 'ERROR|Student is not part of the section' })
                                            });
                                            return res.status(200).send(match[0] + "|Fail|Student Not Part of Section");
                                        }
                                    }

                                    const subject = await Subject.findById(camera.subjectId).populate('groups').populate('sections');
                                    if (!subject) {
                                        await fetch('http://localhost:3001/websocket/message', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ message: 'ERROR|Subject not found' })
                                        });
                                        return res.status(200).send(match[0] + "|Fail|Invalid Subject");
                                    }

                                    // Check if the current day, time and week are within the start and end day, time and week of the selected group or section
                                    const startWeekDate = new Date(subject.startWeek);
                                    const diffInMs = now.getTime() - startWeekDate.getTime();
                                    const currentWeek = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000)) + 1;
                                    const currentDay = now.getDay();

                                    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                    const schedule = camera.sectionNumber ? subject.sections[camera.sectionNumber - 1].schedule : subject.groups[camera.groupNumber - 1].schedule;
                                    const scheduleDay = daysOfWeek.indexOf(schedule.day);
                                    const startTime = new Date(`1970-01-01T${schedule.startTime}Z`).getHours();
                                    const endTime = new Date(`1970-01-01T${schedule.endTime}Z`).getHours();
                                    const currentHour = now.getHours();

                                    if (currentDay !== scheduleDay || currentHour < startTime || currentHour > endTime) {
                                        await fetch('http://localhost:3001/websocket/message', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ message: 'ERROR|Attendance is not allowed at this time' })
                                        });
                                        return res.status(200).send(match[0] + "|Fail|Attendance is not allowed at this time");
                                    }

                                    const group = student.subjects.find(subject => subject.subject.toString() === camera.subjectId.toString()).group;
                                    const section = student.subjects.find(subject => subject.subject.toString() === camera.subjectId.toString()).section;

                                    // Check if the student already has attendance for this group or section
                                    const existingAttendanceQuery = { student: student._id, subject: camera.subjectId, group: group, section: section, week: currentWeek };
                                    if (camera.groupNumber) {
                                        existingAttendanceQuery.lectureAttendanceTime = { $exists: true };
                                    }
                                    if (camera.sectionNumber) {
                                        existingAttendanceQuery.sectionAttendanceTime = { $exists: true };
                                    }
                                    const existingAttendance = await Attendance.findOne(existingAttendanceQuery);
                                    if (existingAttendance) {
                                        await fetch('http://localhost:3001/websocket/message', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ message: 'ERROR|Attendance already taken for this student' })
                                        });
                                        return res.status(200).send(match[0] + "|Fail|Already Taken");
                                    }

                                    // Create a new attendance record for the student
                                    const newAttendance = new Attendance({
                                        student: student._id,
                                        subject: camera.subjectId,
                                        group: group,
                                        section: section,
                                        week: currentWeek,
                                        lectureAttendanceTime: camera.groupNumber ? new Date() : null,
                                        sectionAttendanceTime: camera.sectionNumber ? new Date() : null
                                    });
                                    await newAttendance.save();

                                    await fetch('http://localhost:3001/websocket/message', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ message: 'SUCCESS|Student (' + student.name + ') attendance taken successfully at ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) })
                                    });

                                    return res.status(200).send(match[0] + "|Success");
                                }
                            }

                            if (!idFound) {
                                console.log('ID not found in the OCR result');
                                res.status(200).send("Fail|ID not found");
                            }

                            await worker.terminate();
                        })
                        .catch(error => {
                            console.error('Error saving image file:', error);
                        });
                })
                .catch(error => {
                    console.error('Error processing image data:', error);
                });

            // Clear the image data buffer for the next image
            imageDataBuffer = Buffer.from([]);
        }
    }
});

router.get('/', async (req, res) => {
    const cameras = await Camera.find().populate('subjectId');
    res.json(cameras);
});

router.post('/', async (req, res) => {
    const { cameraId, subjectId, groupNumber, sectionNumber } = req.body;
    const camera = new Camera({ cameraId, subjectId, groupNumber, sectionNumber });
    await camera.save();
    res.json(camera);
});

router.get('/:id', async (req, res) => {
    const camera = await Camera.findById(req.params.id).populate('subjectId');
    res.json(camera);
});

router.put('/:id', async (req, res) => {
    const { cameraId, subjectId, groupNumber, sectionNumber } = req.body;
    const update = {};

    if (cameraId !== undefined) {
        update.cameraId = cameraId;
    }

    if (subjectId !== undefined) {
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(400).send('Subject not found');
        }
        update.subjectId = subject._id;
        update.groupNumber = null;
        update.sectionNumber = null;
    }

    if (groupNumber) {
        update.groupNumber = groupNumber;
        // Unset the section if a group is set
        update.sectionNumber = null;
    }

    if (sectionNumber) {
        update.sectionNumber = sectionNumber;
        // Unset the group if a section is set
        update.groupNumber = null;
    }

    const camera = await Camera.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    res.json(camera);
});

router.delete('/:id', async (req, res) => {
    await Camera.findByIdAndDelete(req.params.id);
    res.json({ message: 'Camera deleted' });
});

module.exports = router;