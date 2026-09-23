const { timingSafeEqual } = require('node:crypto');

const requireManagement = (req, res, next) => {
    if (req.role !== 'management') {
        return res.status(403).json({ error: 'Management access required' });
    }
    next();
};

const requireVerifiedRole = (req, res, next) => {
    if (!['management', 'doctor', 'teaching assistant'].includes(req.role)) {
        return res.status(403).json({ error: 'Verified role required' });
    }
    next();
};

const requireCameraApiKey = (req, res, next) => {
    const configured = process.env.CAMERA_API_KEY;
    if (!configured) {
        return res.status(503).json({ error: 'Camera integration is not configured' });
    }

    const supplied = req.get('x-camera-api-key');
    const expected = Buffer.from(configured);
    const actual = Buffer.from(supplied || '');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

module.exports = { requireManagement, requireVerifiedRole, requireCameraApiKey };
