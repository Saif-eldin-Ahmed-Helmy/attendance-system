const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    filePath: {
        type: String,
        required: false
    },
    fileType: {
        type: String,
        required: false
    },
    fileSize: {
        type: Number,
        required: false
    },
    link: {
        type: String,
        required: false
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for better query performance
MaterialSchema.index({ subject: 1, createdAt: -1 });
MaterialSchema.index({ uploadedBy: 1 });

// Virtual for file URL if using cloud storage
MaterialSchema.virtual('fileUrl').get(function() {
    if (this.filePath) {
        return process.env.CLOUDINARY_BASE_URL ? `${process.env.CLOUDINARY_BASE_URL}/${this.filePath}` : this.filePath;
    }
    return this.link;
});

const Material = mongoose.model('Material', MaterialSchema);

module.exports = Material;
