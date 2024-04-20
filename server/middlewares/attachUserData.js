const User = require("../models/User");

const attachUserDataToRequest = async (req, res, next, populateFields = []) => {
    try {
        const {email} = req.user;
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (populateFields.length > 0) {
            user = await user.populate(populateFields);
        }

        req.user = user;
        req.email = email;
        req.role = user.role;
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { attachUserDataToRequest };