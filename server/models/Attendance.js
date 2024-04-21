const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    lectureAttendanceTime: {
        type: Date,
        required: false
    },
    sectionAttendanceTime: {
        type: Date,
        required: false
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    group: {
        type: Number,
        enum: [1, 2],
        required: false
    },
    section: {
        type: Number,
        enum: [1, 2, 3, 4],
        required: false
    },
    week: {
        type: Number,
        required: false
    }
}, {
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
});

AttendanceSchema.pre('save', async function(next) {
    await this.populate('subject');
    const startWeek = this.subject.startWeek;
    const attendanceTime = this.lectureAttendanceTime || this.sectionAttendanceTime || new Date();
    const diffInMs = attendanceTime.getTime() - startWeek.getTime();
    const diffInWeeks = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000));
    this.week = diffInWeeks + 1;
    next();
});

const Attendance = mongoose.model('Attendance', AttendanceSchema);

module.exports = Attendance;