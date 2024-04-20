const { handleUnauthorized } = require('../handlers/error');

const verifySession = (req, res, next) => {
    if (!req.isAuthenticated() || !req.user) {
        return handleUnauthorized(res);
    }
    const {email, role} = req.user;

    if (!email || !role) {
        return handleUnauthorized(res);
    }
    next();
};

module.exports = { verifySession };