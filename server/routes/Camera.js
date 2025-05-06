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

router.post('/attendance', async (req, res) => {
    const { id, location, admin } = req.body;
    const isAdmin = admin === true;

    console.log(`Received attendance request for ID: ${id}, Location: ${location}, Admin: ${isAdmin}`);

    if (!id || !location) {
        return res.status(400).send('Fail|Missing Parameters');
    }

    const [type, number] = location.split('|');
    if (!type || !number) {
        return res.status(400).send('Fail|Invalid Location Format');
    }

    try {
        const now = new Date();
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = now.getDay();
        const currentTime = now.getHours() + now.getMinutes() / 60;

        const student = await Student.findOne({ id });
        if (!student) {
            return res.status(404).send('Fail|Student Not Found');
        }

        // First check if there's a camera with ID "R001"
        const specialCamera = await Camera.findOne({ cameraId: "R001" });
        let activeSubject = null;
        let activeSchedule = null;

        if (specialCamera && specialCamera.subjectId) {
            // If special camera exists, use its configured subject and group/section
            activeSubject = await Subject.findById(specialCamera.subjectId)
                .populate('doctor teachingAssistant');

            if (activeSubject) {
                if (specialCamera.groupNumber) {
                    activeSchedule = { groupNumber: specialCamera.groupNumber };
                } else if (specialCamera.sectionNumber) {
                    activeSchedule = { sectionNumber: specialCamera.sectionNumber };
                }
            }
        }

        // If no special camera found or no subject configured, proceed with normal logic
        if (!activeSubject || !activeSchedule) {
            const subjects = await Subject.find({
                $or: [
                    { 'groups.schedule.roomNumber': type === 'ROOM' ? parseInt(number) : undefined },
                    { 'sections.schedule.labNumber': type === 'LAB' ? parseInt(number) : undefined }
                ]
            }).populate('doctor teachingAssistant');

            for (const subject of subjects) {
                if (type === 'ROOM') {
                    for (const group of subject.groups) {
                        if (
                            group.schedule &&
                            group.schedule.roomNumber === parseInt(number) &&
                            currentDay === daysOfWeek.indexOf(group.schedule.day) &&
                            currentTime >= parseTime(group.schedule.startTime) &&
                            currentTime <= parseTime(group.schedule.endTime)
                        ) {
                            activeSchedule = group;
                            activeSubject = subject;
                            break;
                        }
                    }
                }

                if (type === 'LAB') {
                    for (const section of subject.sections) {
                        if (
                            section.schedule &&
                            section.schedule.labNumber === parseInt(number) &&
                            currentDay === daysOfWeek.indexOf(section.schedule.day) &&
                            currentTime >= parseTime(section.schedule.startTime) &&
                            currentTime <= parseTime(section.schedule.endTime)
                        ) {
                            activeSchedule = section;
                            activeSubject = subject;
                            break;
                        }
                    }
                }

                if (activeSchedule) break;
            }
        }

        if (!activeSubject || !activeSchedule) {
            if (type === "ROOM") {
                return res.status(400).send('Fail|No Active Lec');
            }
            else if (type === "LAB") {
                return res.status(400).send('Fail|No Active Sec');
            }
        }

        // Get student's enrolled group and section for this subject
        const studentSubject = student.subjects.find(s => s.subject.toString() === activeSubject._id.toString());
        if (!studentSubject) {
            return res.status(400).send('Fail|Student Not Enrolled in Subject');
        }

        const studentGroup = studentSubject.group;
        const studentSection = studentSubject.section;

        if (!isAdmin) {
            if (activeSchedule.groupNumber && studentGroup !== activeSchedule.groupNumber) {
                return res.status(400).send('Fail|Student Not Part of Group');
            }
            if (activeSchedule.sectionNumber && studentSection !== activeSchedule.sectionNumber) {
                return res.status(400).send('Fail|Student Not Part of Section');
            }
        }

        // Calculate the week number
        const startWeekDate = new Date(activeSubject.startWeek);
        const diffInMs = now.getTime() - startWeekDate.getTime();
        const currentWeek = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000)) + 1;

        // Check for existing attendance record using student's actual group/section
        const existingAttendance = await Attendance.findOne({
            student: student._id,
            subject: activeSubject._id,
            week: currentWeek,
            group: studentGroup,
            section: studentSection
        });

        if (existingAttendance) {
            // Update existing record if needed
            if (activeSchedule.groupNumber && !existingAttendance.lectureAttendanceTime) {
                existingAttendance.lectureAttendanceTime = now;
                await existingAttendance.save();
            } else if (activeSchedule.sectionNumber && !existingAttendance.sectionAttendanceTime) {
                existingAttendance.sectionAttendanceTime = now;
                await existingAttendance.save();
            } else {
                console.log('Attendance already taken for this student');
                return res.status(400).send('Fail|Already Taken');
            }
        } else {
            // Create new attendance record with student's group and section
            const attendance = new Attendance({
                student: student._id,
                subject: activeSubject._id,
                group: studentGroup,
                section: studentSection,
                week: currentWeek,
                lectureAttendanceTime: activeSchedule.groupNumber ? now : null,
                sectionAttendanceTime: activeSchedule.sectionNumber ? now : null
            });
            await attendance.save();
        }

        // Count attendance for the active group/section
        const attendanceCount = await Attendance.countDocuments({
            subject: activeSubject._id,
            week: currentWeek,
            ...(activeSchedule.groupNumber ? {
                group: activeSchedule.groupNumber,
                lectureAttendanceTime: { $ne: null }
            } : {}),
            ...(activeSchedule.sectionNumber ? {
                section: activeSchedule.sectionNumber,
                sectionAttendanceTime: { $ne: null }
            } : {})
        });

        const role = activeSchedule.sectionNumber ? 'TA' : 'Dr';
        const name = activeSchedule.sectionNumber
            ? (activeSubject.teachingAssistant ? activeSubject.teachingAssistant.name : 'Unknown')
            : (activeSubject.doctor ? activeSubject.doctor.name : 'Unknown');
        const identifier = activeSchedule.sectionNumber
            ? `S${activeSchedule.sectionNumber}`
            : `G${activeSchedule.groupNumber}`;

        res.send(`${identifier} - ${role} ${name}|${attendanceCount}`);
        console.log(`Attendance recorded for ${id} in ${location} by ${role} ${name}. Attendance count: ${attendanceCount}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Fail|Server Error');
    }
});

router.get('/current-subject', async (req, res) => {
    const { location } = req.query;
    console.log(location, "request received");

    if (!location) {
        return res.status(400).send('Fail|Missing Location');
    }

    if (location === "unset") {
        return res.status(200).send('Please select|A Room/Lab');
    }

    const [type, number] = location.split('|');
    if (!type || !number) {
        return res.status(400).send('Fail|Invalid Location Format');
    }

    try {
        // Define days of week array for matching
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // First check if there's a camera with ID "R001"
        const specialCamera = await Camera.findOne({ cameraId: "R001" });

        if (specialCamera && specialCamera.subjectId) {
            // If special camera exists, get its configured subject and group/section
            const subject = await Subject.findById(specialCamera.subjectId)
                .populate('doctor')
                .populate('teachingAssistant');

            if (subject) {
                const attendanceCount = await Attendance.countDocuments({
                    subject: subject._id,
                    group: specialCamera.groupNumber || null,
                    section: specialCamera.sectionNumber || null
                });

                const identifier = specialCamera.sectionNumber
                    ? `S${specialCamera.sectionNumber}`
                    : `G${specialCamera.groupNumber}`;

                const role = specialCamera.sectionNumber ? 'TA' : 'Dr';
                const name = specialCamera.sectionNumber
                    ? (subject.teachingAssistant ? subject.teachingAssistant.name : 'Unknown')
                    : (subject.doctor ? subject.doctor.name : 'Unknown');

                return res.send(`${identifier}|${subject.name}`);
            }
        }

        // If no special camera found or it had issues, proceed with normal logic
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.getHours() + now.getMinutes() / 60;

        const subjects = await Subject.find({
            $or: [
                { 'groups.schedule.roomNumber': type === 'ROOM' ? parseInt(number) : undefined },
                { 'sections.schedule.labNumber': type === 'LAB' ? parseInt(number) : undefined }
            ]
        }).populate('doctor teachingAssistant');

        let activeSchedule = null;
        let activeSubject = null;

        for (const subject of subjects) {
            // Check groups for ROOM type
            if (type === 'ROOM') {
                for (const group of subject.groups) {
                    if (
                        group.schedule &&
                        group.schedule.roomNumber === parseInt(number) &&
                        currentDay === daysOfWeek.indexOf(group.schedule.day) &&
                        currentTime >= parseTime(group.schedule.startTime) &&
                        currentTime <= parseTime(group.schedule.endTime)
                    ) {
                        activeSchedule = group;
                        activeSubject = subject;
                        break;
                    }
                }
            }

            // Check sections for LAB type
            if (type === 'LAB') {
                for (const section of subject.sections) {
                    if (
                        section.schedule &&
                        section.schedule.labNumber === parseInt(number) &&
                        currentDay === daysOfWeek.indexOf(section.schedule.day) &&
                        currentTime >= parseTime(section.schedule.startTime) &&
                        currentTime <= parseTime(section.schedule.endTime)
                    ) {
                        activeSchedule = section;
                        activeSubject = subject;
                        break;
                    }
                }
            }

            if (activeSchedule) break;
        }

        if (activeSchedule) {
            // If there's an active schedule
            const attendanceCount = await Attendance.countDocuments({
                subject: activeSubject._id,
                group: activeSchedule.groupNumber || null,
                section: activeSchedule.sectionNumber || null
            });

            const identifier = activeSchedule.sectionNumber
                ? `S${activeSchedule.sectionNumber}`
                : `G${activeSchedule.groupNumber}`;

            return res.send(`${identifier}|${activeSubject.name}`);
        } else {
            // If no active schedule, find the next one
            let nextSchedule = null;
            let nextSubject = null;
            let minTimeUntilNext = Infinity;

            for (const subject of subjects) {
                // Check all schedules to find the next one
                const schedules = type === 'ROOM' ? subject.groups : subject.sections;

                for (const schedule of schedules) {
                    if (type === 'ROOM' && schedule.schedule.roomNumber !== parseInt(number)) continue;
                    if (type === 'LAB' && schedule.schedule.labNumber !== parseInt(number)) continue;

                    const scheduleDay = daysOfWeek.indexOf(schedule.schedule.day);
                    const scheduleTime = parseTime(schedule.schedule.startTime);

                    let daysUntilNext = (scheduleDay + 7 - currentDay) % 7;
                    if (daysUntilNext === 0 && scheduleTime <= currentTime) {
                        daysUntilNext = 7;
                    }

                    const timeUntilNext = daysUntilNext * 24 + scheduleTime - currentTime;

                    if (timeUntilNext < minTimeUntilNext) {
                        minTimeUntilNext = timeUntilNext;
                        nextSchedule = schedule;
                        nextSubject = subject;
                    }
                }
            }

            if (nextSchedule) {
                const identifier = nextSchedule.sectionNumber
                    ? `S${nextSchedule.sectionNumber}`
                    : `G${nextSchedule.groupNumber}`;

                return res.send(`Next: ${identifier}|${nextSubject.name}`);
            } else {
                return res.send('No Scheduled|Sessions');
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Fail|Server Error');
    }
});

// Helper function to parse time strings like "14:30" into decimal hours (14.5)
function parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
}

router.post('/video-stream/', async (req, res) => {
    const { location } = req.headers;
    console.log('Received image data from client:', location);

    if (!location) {
        return res.status(400).send('Fail|Location not provided');
    }

    const [type, number] = location.split('|');
    if (!type || !number || !['ROOM', 'LAB'].includes(type.toUpperCase())) {
        return res.status(400).send('Fail|Invalid Location Format');
    }

    const timeout = setTimeout(() => {
        console.log('Timeout reached. Processing incomplete image data.');
        processImageData();
    }, 1000);

    req.on('data', (dataChunk) => {
        // Accumulate incoming image data chunks
        imageDataBuffer = Buffer.concat([imageDataBuffer, dataChunk]);
    });

    req.on('end', () => {
        clearTimeout(timeout);
        processImageData();
    });

    async function processImageData() {
        const isAdmin = false;

        if (imageDataBuffer.length > 0) {
            // Process the accumulated image data
            const imageFilePath = `frame_${frameNumber}.jpg`;
            sharp(imageDataBuffer)
                .sharpen()
                .removeAlpha()
                .toBuffer()
                .then(async (buffer) => {
                    try {
                        await sharp(buffer).toFile(imageFilePath);
                        frameNumber++;

                        // Check if there's a camera with ID R001
                        const camera = await Camera.findOne({ cameraId: 'R001' });
                        let activeSubject, activeGroup, activeSection;

                        if (camera && camera.subjectId) {
                            // Use the camera's selected subject/group/section
                            activeSubject = await Subject.findById(camera.subjectId);
                            activeGroup = camera.groupNumber;
                            activeSection = camera.sectionNumber;
                        } else {
                            // Use the location information to find active subject
                            const now = new Date();
                            const currentDay = now.getDay();
                            const currentHour = now.getHours();
                            const currentMinute = now.getMinutes();
                            const currentTime = currentHour * 60 + currentMinute;

                            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                            const currentDayString = daysOfWeek[currentDay];

                            // Query to find subjects active at current time and location
                            let findQuery = { level: { $exists: true } }; // Base query

                            if (type.toUpperCase() === 'ROOM') {
                                findQuery['groups.schedule.roomNumber'] = parseInt(number);
                                findQuery['groups.schedule.day'] = currentDayString;
                            } else { // LAB
                                findQuery['sections.schedule.labNumber'] = parseInt(number);
                                findQuery['sections.schedule.day'] = currentDayString;
                            }

                            const subjects = await Subject.find(findQuery);

                            // Find the active subject based on current time
                            for (const subject of subjects) {
                                if (type.toUpperCase() === 'ROOM') {
                                    for (const group of subject.groups) {
                                        if (group.schedule.roomNumber === parseInt(number) &&
                                            group.schedule.day === currentDayString) {

                                            const startTime = group.schedule.startTime.split(':');
                                            const endTime = group.schedule.endTime.split(':');
                                            const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
                                            const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);

                                            if (currentTime >= startMinutes && currentTime <= endMinutes) {
                                                activeSubject = subject;
                                                activeGroup = group.groupNumber;
                                                break;
                                            }
                                        }
                                    }
                                } else { // LAB
                                    for (const section of subject.sections) {
                                        if (section.schedule.labNumber === parseInt(number) &&
                                            section.schedule.day === currentDayString) {

                                            const startTime = section.schedule.startTime.split(':');
                                            const endTime = section.schedule.endTime.split(':');
                                            const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
                                            const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);

                                            if (currentTime >= startMinutes && currentTime <= endMinutes) {
                                                activeSubject = subject;
                                                activeSection = section.sectionNumber;
                                                break;
                                            }
                                        }
                                    }
                                }

                                if (activeSubject) break;
                            }
                        }

                        // If no active subject, send an appropriate message and exit
                        if (!activeSubject) {
                            await fetch('http://localhost:3001/websocket/message', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ message: 'ERROR|No Active Lecture|Or Section' })
                            });
                            return res.status(200).send("Fail|No Active Lecture|Or Section");
                        }

                        // Perform OCR on the image
                        const worker = await createWorker("eng", 1, {
                            errorHandler: error => console.error(error),
                        });
                        await worker.setParameters({
                            tessedit_char_whitelist: '0123456789',
                        });
                        const { data: { text, confidence } } = await worker.recognize(imageFilePath);

                        // The rest of the OCR and attendance processing code remains similar
                        // Just replace camera references with activeSubject, activeGroup, activeSection
                        // ... (rest of OCR and attendance logic) ...

                        const lines = text.split('\n');
                        let idFound = false;

                        // Iterate over the lines
                        for (const line of lines) {
                            console.log(line);
                            // Check if the line contains the format "420230???" where "???" are any three digits
                            const match = line.match(/420230\d{3}/);
                            if (match) {
                                idFound = true;
                                const parsedStudentId = match[0];
                                console.log("Parsed ID:");
                                console.log(match[0]);
                                console.log(`OCR's confidence: ${confidence}%`);

                                if (idCache.lastReadId === parsedStudentId) {
                                    idCache.confirmed = true;
                                } else {
                                    idCache.lastReadId = parsedStudentId;
                                    idCache.confirmed = false;
                                }

                                if (!idCache.confirmed) {
                                    console.log('ID not confirmed yet:', parsedStudentId);
                                    res.status(200).send(match[0] + "|Fail|Confirmation");
                                    break;
                                }

                                // Check if the ID is in the cache and was processed less than 10 seconds ago
                                const now = new Date();
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

                                    // Check if the student is enrolled in the active subject
                                    if (!student.subjects.some(subject => subject.subject.toString() === activeSubject._id.toString())) {
                                        await fetch('http://localhost:3001/websocket/message', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ message: 'ERROR|Student is not enrolled in the subject' })
                                        });
                                        return res.status(200).send(match[0] + "|Fail|Student Not Enrolled in Subject");
                                    }

                                    // Check if the student is part of the group or section
                                    if (!isAdmin && activeGroup && !student.subjects.some(subject =>
                                        subject.subject.toString() === activeSubject._id.toString() && subject.group === activeGroup)) {
                                        await fetch('http://localhost:3001/websocket/message', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ message: 'ERROR|Student is not part of the group' })
                                        });
                                        return res.status(200).send(match[0] + "|Fail|Student Not Part of Group");
                                    }

                                    if (!isAdmin && activeSection && !student.subjects.some(subject =>
                                        subject.subject.toString() === activeSubject._id.toString() && subject.section === activeSection)) {
                                        await fetch('http://localhost:3001/websocket/message', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ message: 'ERROR|Student is not part of the section' })
                                        });
                                        return res.status(200).send(match[0] + "|Fail|Student Not Part of Section");
                                    }
                                }

                                // Continue with attendance process...
                                // Check schedule, save attendance record, etc.
                                const startWeekDate = new Date(activeSubject.startWeek);
                                const diffInMs = now.getTime() - startWeekDate.getTime();
                                const currentWeek = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000)) + 1;

                                const group = student.subjects.find(subject =>
                                    subject.subject.toString() === activeSubject._id.toString()).group;
                                const section = student.subjects.find(subject =>
                                    subject.subject.toString() === activeSubject._id.toString()).section;

                                // Check if the student already has attendance for this group or section
                                const existingAttendanceQuery = {
                                    student: student._id,
                                    subject: activeSubject._id,
                                    group: group,
                                    section: section,
                                    week: currentWeek
                                };

                                if (activeGroup) {
                                    existingAttendanceQuery.lectureAttendanceTime = { $exists: true };
                                }
                                if (activeSection) {
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
                                    subject: activeSubject._id,
                                    group: group,
                                    section: section,
                                    week: currentWeek,
                                    lectureAttendanceTime: activeGroup ? new Date() : null,
                                    sectionAttendanceTime: activeSection ? new Date() : null
                                });
                                await newAttendance.save();

                                await fetch('http://localhost:3001/websocket/message', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        message: 'SUCCESS|Student (' + student.name + ') attendance taken successfully at ' +
                                            new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                                    })
                                });

                                return res.status(200).send(match[0] + "|Success|Attendance Taken");
                            }
                        }

                        if (!idFound) {
                            console.log('ID not found in the OCR result');
                            res.status(200).send("Fail|ID not found");
                        }

                        await worker.terminate();
                    } catch (error) {
                        console.error('Error processing image:', error);
                        res.status(500).send("Fail|Processing Error");
                    }
                })
                .catch(error => {
                    console.error('Error processing image data:', error);
                    res.status(500).send("Fail|Image Processing Error");
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