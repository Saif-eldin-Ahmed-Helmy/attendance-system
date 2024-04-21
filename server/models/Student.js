const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    id: {
        type: String,
        required: true
    },
    level: {
        type: Number,
        enum: [1, 2, 3, 4],
        required: true
    },
    subjects: [{
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: true
        },
        group: {
            type: Number,
            enum: [1, 2],
        },
        section: {
            type: Number,
            enum: [1, 2, 3, 4],
            required: false
        }
    }]
});

const Student = mongoose.model('Student', StudentSchema);

module.exports = Student;