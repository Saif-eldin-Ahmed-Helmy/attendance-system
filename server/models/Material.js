import mongoose from 'mongoose';

const MaterialSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    link: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

const Material = mongoose.model('Material', MaterialSchema);
export default Material;