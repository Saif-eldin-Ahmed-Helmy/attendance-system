const mongoose = require('mongoose');

const CameraSchema = new mongoose.Schema({
    cameraId: {
        type: String,
        required: true,
        unique: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: false
    },
    groupNumber: {
        type: Number,
        required: false
    },
    sectionNumber: {
        type: Number,
        required: false
    }
});

const Camera = mongoose.model('Camera', CameraSchema);

module.exports = Camera;