const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { handleBadRequest, handleUnauthorized, handleServerError, handleUserNotFound} = require('../handlers/error');
const {verifySession} = require("../middlewares/auth");
const {attachUserDataToRequest} = require("../middlewares/attachUserData");
const Subject = require("../models/Subject");

passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/users/google/callback"
    },
    async function(accessToken, refreshToken, profile, cb) {

        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
            user = await User.create({ googleId: profile.id, email: profile.emails[0].value, name: profile.displayName });
        }
        else {
            user.googleId = profile.id;
            await user.save();
        }
        cb(null, user);
    }
));

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login' }),
    (req, res) => {
        const user = req.user;

        if (!user) {
            return handleUserNotFound(res);

        }

        res.redirect('http://localhost:5173');
});

passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passReqToCallback: true,
}, async (req, email, password, done) => {
    try {
        const user = await User.findOne({ email });

        if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
            return done(null, false, { error: 'Invalid email or password.' });
        }

        const payload = {
            email: user.email,
        };

        req.login(payload, (err) => {
            if (err) {
                return done(err);
            }
        });

        return done(null, payload);
    } catch (error) {
        return done(error);
    }
}));

router.get('/', function(req, res, next) {
    passport.authenticate('local-login', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.status(404).json(info) }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.status(200).json({email: user.email});
        });
    })(req, res, next);
});

passport.use('local-register', new LocalStrategy({
    usernameField: 'email',
    passReqToCallback: true,
}, async (req, email, password, done) => {
    try {
        const { name, gender, dateOfBirth } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return done(null, false, { error: 'Email already exists.' });
        }

        const newUser = await User.create({ email, password, name, gender, dateOfBirth });

        const userObj = {
            email: newUser.email,
            role: newUser.role,
        };
        req.login(userObj, (err) => {
            if (err) {
                return done(err);
            }
        });

        return done(null, userObj);
    } catch (error) {
        return done(error);
    }
}));

router.post('/', function(req, res, next) {
    passport.authenticate('local-register', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.status(404).json(info) }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.status(200).json({email: user.email});
        });
    })(req, res, next);
});

passport.serializeUser((user, done) => {
    done(null, user.email);
});

passport.deserializeUser(async (email, done) => {
    try {
        const user = await User.findOne({ email });
        if (!email || !user) {
            return done(null, false);
        }
        done(null, {
            email: user.email,
            role: user.role,
            name: user.name,
            preferredLanguage: user.preferredLanguage,
        });
    } catch (error) {
        done(error);
    }
});

router.get('/session', (req, res) => {
    if (req.isAuthenticated()) {
        const userEmail = req.user ? req.user : null;
        res.json({ isAuthenticated: true, email: userEmail.email, role: userEmail.role, name: userEmail.name });
    } else {
        res.json({ isAuthenticated: false });
    }
});

router.get('/logout', (req, res) => {
    if (req.isAuthenticated()) {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({error: 'Error occurred while logging out.'});
            }
            res.json({ success: true });
        });
    }
    else {
        res.status(401).json({error: 'You are not logged in.'});
    }
});

router.use(verifySession);
router.use(attachUserDataToRequest);

router.put('/language', async (req, res) => {
    try {
        const { language } = req.body;
        if (!language) {
            return handleBadRequest(res, 'Language not specified.');
        }

        req.user.preferredLanguage = language;
        await req.user.save();

        res.json({ language: req.user.preferredLanguage });
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.get('/doctors', verifySession, attachUserDataToRequest, async (req, res) => {
    if (req.user.role !== 'management') {
        return res.status(403).send('Access denied');
    }
    const doctors = await User.find({ role: 'doctor' });
    const doctorsData = doctors.map(doctor => ({ _id: doctor._id, name: doctor.name }));
    res.send(doctorsData);
});

router.get('/assistants', verifySession, attachUserDataToRequest, async (req, res) => {
    if (req.user.role !== 'management') {
        return res.status(403).send('Access denied');
    }
    const assistants = await User.find({ role: 'teaching assistant' });
    const assistantsData = assistants.map(assistant => ({ _id: assistant._id, name: assistant.name }));
    res.send(assistantsData);
});

router.get('/teachers', verifySession, attachUserDataToRequest, async (req, res) => {
    if (req.user.role !== 'management') {
        return res.status(403).send('Access denied');
    }

    const { level, page, limit, search } = req.query;

    const searchFilter = search ? { name: { $regex: search, $options: 'i' } } : {};

    const teachers = await User.find({
        role: { $in: ['teaching assistant', 'doctor'] },
        ...searchFilter
    })
        .skip((page - 1) * limit)
        .limit(limit);

    let teachersData = teachers.map(teacher => ({
        _id: teacher._id,
        name: teacher.name,
        role: teacher.role,
    }));

    const subjects = await Subject.find({
        $or: [
            { doctor: { $in: teachers.map(teacher => teacher._id) } },
            { teachingAssistant: { $in: teachers.map(teacher => teacher._id) } }
        ],
        level: level ? Number(level) : { $exists: true } // filter subjects by level if specified
    });

    const subjectsData = subjects.map(subject => ({
        _id: subject._id,
        name: subject.name,
        doctor: subject.doctor,
        teachingAssistant: subject.teachingAssistant,
        level: subject.level
    }));

    teachersData.forEach(teacher => {
        teacher.subjects = subjectsData.filter(subject => subject.doctor.toString() === teacher._id.toString() || subject.teachingAssistant.toString() === teacher._id.toString());
    });

    teachersData = teachersData.filter(teacher => teacher.subjects.length > 0);

    const totalTeachers = await User.countDocuments({
        role: { $in: ['teaching assistant', 'doctor'] },
        ...searchFilter
    });

    const maxPages = Math.ceil(totalTeachers / limit);

    res.send({ items: teachersData, maxPages });
});

module.exports = router;
