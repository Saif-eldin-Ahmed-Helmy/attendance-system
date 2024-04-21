const mongoose = require('mongoose');
const Student = require("./Student");

const ScheduleSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    }
});

const GroupSchema = new mongoose.Schema({
    groupNumber: {
        type: Number,
        enum: [1, 2],
        required: true
    },
    schedule: ScheduleSchema
});

const SectionSchema = new mongoose.Schema({
    sectionNumber: {
        type: Number,
        enum: [1, 2, 3, 4],
        required: true
    },
    schedule: ScheduleSchema
});

const SubjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    level: {
        type: Number,
        enum: [1, 2, 3, 4],
        required: true
    },
    section: {
        type: String,
        required: false
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teachingAssistant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    groups: [GroupSchema],
    sections: [SectionSchema],
    startWeek: {
        type: Date,
        required: true
    }
});

const Subject = mongoose.model('Subject', SubjectSchema);

module.exports = Subject;