const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require("../models/Attendance");
const { handleBadRequest, handleUnauthorized, handleServerError, handleUserNotFound} = require('../handlers/error');
const {verifySession} = require("../middlewares/auth");
const {attachUserDataToRequest} = require("../middlewares/attachUserData");
const ExcelJS = require('exceljs');

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
    else {
        res.status(404).send('Not Found');
        return;
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
            endTime: group.end,
            roomNumber: group.roomNumber
        }
    }));

    const sectionsWithNumbers = sections.map((section, index) => ({
        sectionNumber: index + 1,
        schedule: {
            day: section.day,
            startTime: section.start,
            endTime: section.end,
            labNumber: section.labNumber
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
    subject = await Subject.populate(subject, {path: 'doctor teachingAssistant'});
    subject = subject.toObject();
    subject.doctor = subject.doctor.name;
    if (subject.teachingAssistant) {
        subject.teachingAssistant = subject.teachingAssistant.name;
    }

    let enrolledStudents = await Student.find({'subjects.subject': req.params.id});
    const attendances = await Attendance.find({subject: req.params.id}).populate('student');

    enrolledStudents = enrolledStudents.map(student => {
        return {
            _id: student._id,
            id: student.id,
            name: student.name,
            subject: req.params.id,
            group: student.subjects.find(subject => subject.subject.toString() === req.params.id).group,
            section: student.subjects.find(subject => subject.subject.toString() === req.params.id).section
        };
    });

    res.send({subject, attendances, enrolledStudents});
});

router.get('/populate', async (req, res) => {
    try {
        const subjects = await Subject.find().populate('groups.schedule sections.schedule');

        for (let subject of subjects) {
            const now = new Date();
            const startWeekDate = new Date(subject.startWeek);
            const currentWeek = Math.floor((now.getTime() - startWeekDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

            for (let weekNumber = 1; weekNumber <= currentWeek; weekNumber++) {
                if (weekNumber === 11) {
                    continue;
                }
                const students = await Student.find({'subjects.subject': subject._id});

                const whitelistedStudents = ['420230168', '420230230', '420230305', '420230295', '420230285', '420230243'];

                for (let student of students) {
                    const subjectInStudent = student.subjects.find(s => {
                        return s.subject.toString() === subject._id.toString();
                    });
                    if (!subjectInStudent) {
                        continue;
                    }
                    const group = subjectInStudent ? subject.groups.find(group => group.groupNumber === subjectInStudent.group) : undefined;
                    const section = subjectInStudent ? subject.sections.find(section => section.sectionNumber === subjectInStudent.section) : undefined;
                    const lectureStartTime = group.schedule.startTime.split(':').map(Number);
                    const lectureEndTime = group.schedule.endTime.split(':').map(Number);
                    const sectionStartTime = section.schedule.startTime.split(':').map(Number);
                    const sectionEndTime = section.schedule.endTime.split(':').map(Number);

                    let lectureAttendanceTime = null;
                    if (Math.random() < 0.5 || whitelistedStudents.includes(student.id)) {
                        lectureAttendanceTime = new Date(startWeekDate);
                        lectureAttendanceTime.setDate(lectureAttendanceTime.getDate() + (weekNumber - 1) * 7 + daysOfWeek.indexOf(group.schedule.day));
                        const randomHour = lectureStartTime[0] + Math.floor(Math.random() * (lectureEndTime[0] - lectureStartTime[0]));
                        const randomMinute = Math.floor(Math.random() * 60);
                        lectureAttendanceTime.setHours(randomHour);
                        lectureAttendanceTime.setMinutes(randomMinute);
                    }

                    let sectionAttendanceTime = null;
                    if (Math.random() < 0.5 || whitelistedStudents.includes(student.id)) {
                        sectionAttendanceTime = new Date(startWeekDate);
                        sectionAttendanceTime.setDate(sectionAttendanceTime.getDate() + (weekNumber - 1) * 7 + daysOfWeek.indexOf(section.schedule.day));
                        const randomHour = sectionStartTime[0] + Math.floor(Math.random() * (sectionEndTime[0] - sectionStartTime[0]));
                        const randomMinute = Math.floor(Math.random() * 60);
                        sectionAttendanceTime.setHours(randomHour);
                        sectionAttendanceTime.setMinutes(randomMinute);
                    }

                    if (!lectureAttendanceTime && !sectionAttendanceTime) {
                        continue;
                    }

                    // first check if the attendance already exists for this week and student and subject
                    const existingAttendance = await Attendance.findOne({
                        student: student._id,
                        subject: subject._id,
                        week: weekNumber
                    });

                    if (existingAttendance) {
                        if (lectureAttendanceTime) {
                            existingAttendance.lectureAttendanceTime = lectureAttendanceTime;
                        }
                        if (sectionAttendanceTime) {
                            existingAttendance.sectionAttendanceTime = sectionAttendanceTime;
                        }
                        await existingAttendance.save();
                        continue;
                    }

                    const attendance = new Attendance({
                        student: student._id,
                        lectureAttendanceTime,
                        sectionAttendanceTime,
                        subject: subject._id,
                        group: group.groupNumber,
                        section: section.sectionNumber,
                        week: weekNumber
                    });
                    await attendance.save();
                }
            }
        }

        res.send('Database populated');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

router.get('/view/:id/attendance/excel/:week', async (req, res) => {
    const subjectId = req.params.id;
    const weekParam = req.params.week

    const subjectDetail = await Subject.findById(subjectId).populate('doctor teachingAssistant groups.schedule sections.schedule');
    if (!subjectDetail) {
        return handleBadRequest(res, 'Subject not found');
    }

    // Fetch the attendance data from the database
    let attendances = await Attendance.find({ subject: subjectId }).populate('student');

    // Fetch the enrolled students from the database
    let enrolledStudents = await Student.find({ 'subjects.subject': subjectId });

    enrolledStudents = enrolledStudents.map(student => {
        return {
            _id: student._id,
            id: student.id,
            name: student.name,
            subject: req.params.id,
            group: student.subjects.find(subject => subject.subject.toString() === req.params.id).group,
            section: student.subjects.find(subject => subject.subject.toString() === req.params.id).section
        };
    });

    // If the week parameter is a number, filter the attendance data to only include the attendances for the specified week
    if (weekParam && !isNaN(Number(weekParam))) {
        const weekNumber = parseInt(weekParam);
        attendances = attendances.filter(attendance => attendance.week === weekNumber);
    }

    const now = new Date();
    const startWeekDate = new Date(subjectDetail.startWeek);
    const currentWeek = Math.floor((now.getTime() - startWeekDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

    const weeksMap = {};

    for (let weekNumber = 1; weekNumber <= currentWeek; weekNumber++) {
        weeksMap[weekNumber.toString()] = [];
    }

    attendances.forEach(attendance => {
        weeksMap[attendance.week.toString()].push(attendance);
    });

    enrolledStudents.forEach(student => {
        Object.keys(weeksMap).forEach(weekNumber => {
            if (!weeksMap[weekNumber].find(attendance => attendance.student._id === student._id)) {
                weeksMap[weekNumber].push({
                    student: {
                        _id: student._id,
                        id: student.id,
                        name: student.name
                    },
                    lectureAttendanceTime: null,
                    sectionAttendanceTime: null,
                    subject: student.subject,
                    group: student.group,
                    section: student.section,
                    week: parseInt(weekNumber)
                });
            }
        });
    });

    Object.keys(weeksMap).forEach(weekNumber => {
        weeksMap[weekNumber].sort((a, b) => a.student.id.localeCompare(b.student.id));
    });

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    // If the week parameter is "Total", add the total attendance and marks to the worksheet
    if (!weekParam || weekParam.toLowerCase() === 'total') {
        // Add the headers to the worksheet
        worksheet.columns = [
            { header: 'Student ID', key: 'studentId' },
            { header: 'Name', key: 'name' },
            { header: 'Group', key: 'group' },
            { header: 'Lecture Attendance', key: 'lectureAttendance' },
            { header: 'Lecture Mark', key: 'lectureMark' },
            { header: 'Section', key: 'section' },
            { header: 'Section Attendance', key: 'sectionAttendance' },
            { header: 'Section Mark', key: 'sectionMark' },
            { header: 'Attendance Percentage', key: 'attendancePercentage' },
            { header: 'Total Mark', key: 'totalMark' }
        ];

        const totalAttendanceMap = {};

        Object.keys(weeksMap).forEach(weekNumber => {
            weeksMap[weekNumber].forEach(attendance => {
                if (!totalAttendanceMap[attendance.student._id]) {
                    totalAttendanceMap[attendance.student._id] = { lectureAttendanceCount: 0, sectionAttendanceCount: 0 };
                }
                if (attendance.lectureAttendanceTime) {
                    totalAttendanceMap[attendance.student._id].lectureAttendanceCount++;
                }
                if (attendance.sectionAttendanceTime) {
                    totalAttendanceMap[attendance.student._id].sectionAttendanceCount++;
                }
            });
        });

        // Add the total attendance and marks to the worksheet
        Object.keys(totalAttendanceMap).map(studentId => {
            const now = new Date();
            const todayDayOfWeek = now.getDay();
            const todayTime = now.getHours() * 60 + now.getMinutes();
            const currentWeek = Math.floor((now.getTime() - new Date(subjectDetail.startWeek).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

            const student = enrolledStudents.find(student => student._id.toString() === studentId);
            const lectureAttendanceCount = totalAttendanceMap[studentId].lectureAttendanceCount;
            const sectionAttendanceCount = totalAttendanceMap[studentId].sectionAttendanceCount;
            const lectureMark = Math.ceil((lectureAttendanceCount / currentWeek) * 5);
            const sectionMark = Math.ceil((sectionAttendanceCount / currentWeek) * 5);
            const totalMark = lectureMark + sectionMark;

            const groupSchedule = subjectDetail.groups.find(group => group.groupNumber === student.group)?.schedule;
            const sectionSchedule = subjectDetail.sections.find(section => section.sectionNumber === student.section)?.schedule;

            const groupDayOfWeek = daysOfWeek.indexOf(groupSchedule?.day || '');
            const groupTime = groupSchedule ? parseInt(groupSchedule.startTime.split(':')[0]) * 60 + parseInt(groupSchedule.startTime.split(':')[1]) : Infinity;

            const sectionDayOfWeek = daysOfWeek.indexOf(sectionSchedule?.day || '');
            const sectionTime = sectionSchedule ? parseInt(sectionSchedule.startTime.split(':')[0]) * 60 + parseInt(sectionSchedule.startTime.split(':')[1]) : Infinity;

            const isFutureGroup = (todayDayOfWeek < groupDayOfWeek || (todayDayOfWeek === groupDayOfWeek && todayTime < groupTime));
            const isFutureSection = (todayDayOfWeek < sectionDayOfWeek || (todayDayOfWeek === sectionDayOfWeek && todayTime < sectionTime));

            // Calculate the total lectures and sections count
            const totalLecturesCount = isFutureGroup ? currentWeek - 1 : currentWeek;
            const totalSectionsCount = isFutureSection ? currentWeek - 1 : currentWeek;

            const percentage = Math.round(((lectureAttendanceCount + sectionAttendanceCount) / (totalLecturesCount + totalSectionsCount)) * 100);

            worksheet.addRow({
                studentId: student.id,
                name: student.name,
                group: `Group ${student.group}`,
                lectureAttendance: lectureAttendanceCount,
                lectureMark,
                section: `Section ${student.section}`,
                sectionAttendance: sectionAttendanceCount,
                sectionMark,
                attendancePercentage: `${percentage}%`,
                totalMark
            });
        });
    } else {
        // Add the headers to the worksheet
        worksheet.columns = [
            { header: 'Week', key: 'week' },
            { header: 'Student ID', key: 'studentId' },
            { header: 'Name', key: 'name' },
            { header: 'Group', key: 'group' },
            { header: 'Lecture Attendance', key: 'lectureAttendance' },
            { header: 'Section', key: 'section' },
            { header: 'Section Attendance', key: 'sectionAttendance' }
        ];

        // Add the attendance data to the worksheet
            weeksMap[parseInt(weekParam)].map((attendance, i) => {
                const now = new Date();
                const todayDayOfWeek = now.getDay();
                const todayTime = now.getHours() * 60 + now.getMinutes();
                const currentWeek = Math.floor((now.getTime() - new Date(subjectDetail.startWeek).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

                const groupSchedule = subjectDetail.groups.find(group => group.groupNumber === attendance.group)?.schedule;
                const sectionSchedule = subjectDetail.sections.find(section => section.sectionNumber === attendance.section)?.schedule;

                const groupDayOfWeek = daysOfWeek.indexOf(groupSchedule?.day || '');
                const groupTime = groupSchedule ? parseInt(groupSchedule.startTime.split(':')[0]) * 60 + parseInt(groupSchedule.startTime.split(':')[1]) : Infinity;

                const sectionDayOfWeek = daysOfWeek.indexOf(sectionSchedule?.day || '');
                const sectionTime = sectionSchedule ? parseInt(sectionSchedule.startTime.split(':')[0]) * 60 + parseInt(sectionSchedule.startTime.split(':')[1]) : Infinity;

                const isFutureGroup = attendance.week >= currentWeek && (todayDayOfWeek < groupDayOfWeek || (todayDayOfWeek === groupDayOfWeek && todayTime < groupTime));
                const isFutureSection = attendance.week >= currentWeek && (todayDayOfWeek < sectionDayOfWeek || (todayDayOfWeek === sectionDayOfWeek && todayTime < sectionTime));

                const lectureAttendanceTime = attendance.lectureAttendanceTime ? new Date(attendance.lectureAttendanceTime) : null;
                const sectionAttendanceTime = attendance.sectionAttendanceTime ? new Date(attendance.sectionAttendanceTime) : null;

                const lectureAttendanceDateTime = lectureAttendanceTime ? `${lectureAttendanceTime.toLocaleDateString()}, ${lectureAttendanceTime.toLocaleTimeString()}` : null;
                const sectionAttendanceDateTime = sectionAttendanceTime ? `${sectionAttendanceTime.toLocaleDateString()}, ${sectionAttendanceTime.toLocaleTimeString()}` : null;
            worksheet.addRow({
                week: attendance.week,
                studentId: attendance.student.id,
                name: attendance.student.name,
                group: `Group ${attendance.group}`,
                lectureAttendance: attendance.lectureAttendanceTime ? lectureAttendanceDateTime : (isFutureGroup ? 'Upcoming' : 'Absent'),
                section: `Section ${attendance.section}`,
                sectionAttendance: attendance.sectionAttendanceTime ? sectionAttendanceDateTime : (isFutureSection ? 'Upcoming' : 'Absent')
            });
        });
    }

    // Send the Excel file as a response
    const fileName = `${subjectDetail.name} (Dr. ${subjectDetail.doctor.name}) - ${!weekParam || isNaN(Number(weekParam)) ? 'Total' : `Week ${weekParam}`}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    res.end();
});



module.exports = router;