const allowedOrigins = () => [process.env.CLIENT_URL || 'http://localhost:5173', process.env.SERVER_URL || 'http://localhost:3001'];

const requireTrustedOrigin = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    // Device routes authenticate independently with the camera API key.
    if (['/api/camera/attendance', '/api/camera/current-subject', '/api/camera/video-stream/', '/websocket/message'].includes(req.path)) return next();
    if (!allowedOrigins().includes(req.get('origin'))) {
        return res.status(403).json({ error: 'Untrusted request origin' });
    }
    next();
};

module.exports = { allowedOrigins, requireTrustedOrigin };
