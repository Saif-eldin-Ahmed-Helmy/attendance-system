const express = require('express');
const router = express.Router();
const { verifySession } = require('../middlewares/auth');
const { attachUserDataToRequest } = require("../middlewares/attachUserData");
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload', upload.single('image'), (req, res) => {
    try {
        const image = req.file.buffer;

        cloudinary.uploader.upload_stream({resource_type: 'auto'}, (error, result) => {
            if (error) {
                return res.status(500).json({error: 'Error uploading image to Cloudinary'});
            }

            res.json({url: result.secure_url});
        }).end(image);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({error: 'Server error'});
    }
});

module.exports = router;