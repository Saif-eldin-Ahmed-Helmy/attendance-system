module.exports = {
    handleUnauthorized: (res) => res.status(401).json({ error: 'Unauthorized - Invalid Token' }),
    handleServerError: (res) => res.status(500).json({ error: 'Internal Server Error' }),
    handleUserNotFound: (res) => res.status(404).json({ error: 'User not found' }),
    handleBadRequest: (res, message) => res.status(400).json({ error: message }),
};