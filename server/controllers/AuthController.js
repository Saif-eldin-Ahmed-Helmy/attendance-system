const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Subject = require('../models/Subject');
const { handleBadRequest, handleUnauthorized, handleServerError, handleUserNotFound } = require('../handlers/error');

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/users/google/callback'
}, async (accessToken, refreshToken, profile, cb) => {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
        user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName
        });
    } else {
        user.googleId = profile.id;
        await user.save();
    }
    return cb(null, user);
}));

passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passReqToCallback: true
}, async (req, email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
            return done(null, false, { error: 'Invalid email or password.' });
        }
        const payload = { email: user.email, role: user.role };
        req.login(payload, err => { if (err) return done(err); });
        return done(null, payload);
    } catch (err) {
        return done(err);
    }
}));

passport.use('local-register', new LocalStrategy({
    usernameField: 'email',
    passReqToCallback: true
}, async (req, email, password, done) => {
    try {
        const { name, gender, dateOfBirth } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return done(null, false, { error: 'Email already exists.' });
        const hashed = await bcrypt.hash(password, 10);
        const newUser = await User.create({ email, password: hashed, name, gender, dateOfBirth });
        const payload = { email: newUser.email, role: newUser.role };
        req.login(payload, err => { if (err) return done(err); });
        return done(null, payload);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => done(null, user.email));
passport.deserializeUser(async (email, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false);
        return done(null, {
            email: user.email,
            role: user.role,
            name: user.name,
            preferredLanguage: user.preferredLanguage,
            subjects: user.subjects
        });
    } catch (err) {
        return done(err);
    }
});

// Controller functions
async function googleCallback(req, res) {
    const user = req.user;
    if (!user) return handleUserNotFound(res);
    return res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
}

function initiateGoogleAuth(req, res, next) {
    return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
}

function authenticateGoogleCallback(req, res, next) {
    return passport.authenticate('google', { failureRedirect: process.env.CLIENT_URL + '/login' })(req, res, next);
}

function localLogin(req, res, next) {
    return passport.authenticate('local-login', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json(info);
        req.logIn(user, err => { if (err) return next(err); return res.json({ email: user.email, role: user.role }); });
    })(req, res, next);
}

function localRegister(req, res, next) {
    return passport.authenticate('local-register', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(400).json(info);
        req.logIn(user, err => { if (err) return next(err); return res.json({ email: user.email, role: user.role }); });
    })(req, res, next);
}

function getSession(req, res) {
    if (req.isAuthenticated()) {
        const user = req.user;
        return res.json({ isAuthenticated: true, email: user.email, role: user.role, name: user.name });
    }
    return res.json({ isAuthenticated: false });
}

function logout(req, res) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'You are not logged in.' });
    }
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Error occurred while logging out.' });
        return res.json({ success: true });
    });
}

async function updateLanguage(req, res) {
    try {
        const { language } = req.body;
        if (!language) return handleBadRequest(res, 'Language not specified.');
        req.user.preferredLanguage = language;
        await req.user.save();
        return res.json({ language });
    } catch (err) {
        console.error(err);
        return handleServerError(res, err);
    }
}

async function listDoctors(req, res) {
    if (req.user.role !== 'management') return handleUnauthorized(res);
    const docs = await User.find({ role: 'doctor' });
    return res.json(docs.map(d => ({ _id: d._id, name: d.name })));
}

async function listAssistants(req, res) {
    if (req.user.role !== 'management') return handleUnauthorized(res);
    const assts = await User.find({ role: 'teaching assistant' });
    return res.json(assts.map(a => ({ _id: a._id, name: a.name })));
}

async function listTeachers(req, res) {
    if (req.user.role !== 'management') return handleUnauthorized(res);
    const { level, page = 1, limit = 10, search = '' } = req.query;
    const filter = { role: { $in: ['doctor','teaching assistant'] } };
    if (search) filter.name = { $regex: search, $options: 'i' };
    const skip = (page-1)*limit;
    const teachers = await User.find(filter).skip(skip).limit(parseInt(limit));
    const total = await User.countDocuments(filter);
    const subjects = await Subject.find({
        $or: [
            { doctor: { $in: teachers.map(t => t._id) } },
            { teachingAssistant: { $in: teachers.map(t => t._id) } }
        ],
        ...(level ? { level: Number(level) } : {})
    });
    const subsByTeacher = subjects.reduce((acc, s) => {
        const keyDoc = s.doctor.toString();
        const keyTa = s.teachingAssistant && s.teachingAssistant.toString();
        acc[keyDoc] = acc[keyDoc] || [];
        acc[keyDoc].push(s);
        if (keyTa) {
            acc[keyTa] = acc[keyTa] || [];
            acc[keyTa].push(s);
        }
        return acc;
    }, {});

    const items = teachers.map(t => ({
        _id: t._id,
        name: t.name,
        role: t.role,
        subjects: (subsByTeacher[t._id.toString()] || [])
    }));
    const maxPages = Math.ceil(total/limit);
    return res.json({ items, maxPages });
}

module.exports = {
    initiateGoogleAuth,
    authenticateGoogleCallback,
    googleCallback,
    localLogin,
    localRegister,
    getSession,
    logout,
    updateLanguage,
    listDoctors,
    listAssistants,
    listTeachers
};