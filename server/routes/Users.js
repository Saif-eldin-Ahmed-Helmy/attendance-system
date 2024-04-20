const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
//const FacebookStrategy = require('passport-facebook').Strategy;
const { handleBadRequest, handleUnauthorized, handleServerError, handleUserNotFound} = require('../handlers/error');
const {verifySession} = require("../middlewares/auth");
const {attachUserDataToRequest} = require("../middlewares/attachUserData");

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

/*passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "/api/users/facebook/callback"
    },
    async function(accessToken, refreshToken, profile, cb) {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
            user = await User.create({ email: profile.emails[0].value, name: profile.displayName });
        }
        cb(null, user);
    }
));

router.get('/facebook', passport.authenticate('facebook', {scope: ['public_profile', 'email']})); @todo: figure out why the request fails if I send the scope of permissions I want

router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
        const user = req.user;

        if (!user) {
            return handleUserNotFound(res);
        }

        res.redirect('/api/users/test');
    });*/

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

router.get('/balance', async (req, res) => {
    try {
        res.json({ balance: req.user.balance });
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.post('/balance', async (req, res) => {
    try {
        const role = req.role;
        if (role !== 'admin') {
            return handleUnauthorized(res);
        }

        const { email, amount } = req.body;

        await adjustUserBalance(email, amount, true, res);
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.delete('/balance', async (req, res) => {
    try {
        const role = req.role;
        if (role !== 'admin') {
            return handleUnauthorized(res);
        }

        const { email, amount } = req.body;

        await adjustUserBalance(email, amount, false, res);
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

const adjustUserBalance = async (email, amount, add, res) => {
    try {
        if (!amount || isNaN(amount) || amount <= 0) {
            return handleBadRequest(res, 'Invalid amount.');
        }

        const user = await User.findOne({ email });
        if (!user) {
            return handleUserNotFound(res);
        }

        const parsedAmount = parseFloat(amount);
        user.balance += add ? parsedAmount : -parsedAmount;
        user.balance = Math.max(user.balance, 0);
        await user.save();

        res.json({ balance: user.balance });
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
}

router.get('/locations', async (req, res) => {
    try {
        const { locationId } = req.query;
        if (locationId) {
            const location = req.user.locations.find(loc => loc.locationId === locationId.toLowerCase());
            if (!location) {
                return handleBadRequest(res, 'Location not found.');
            }
            return res.json(location);
        }
        return res.json(req.user.locations);
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.post('/locations', async (req, res) => {
    try {
        const { locationId, locationSignature, apartmentNumber, floorNumber, streetName, city, phoneNumber } = req.body;

        const index = req.user.locations.findIndex(loc => loc.locationId === locationId.toLowerCase());

        if (index !== -1) {
            return handleBadRequest(res, 'Location with this ID already exists.');
        }

        const newLocation = {
            locationId,
            locationSignature,
            apartmentNumber,
            floorNumber,
            streetName,
            city,
            phoneNumber,
        };

        req.user.locations.push(newLocation);
        await req.user.save();

        res.json(req.user.locations);
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.put('/locations', async (req, res) => {
   try {
       const { oldLocationId, locationId, locationSignature, apartmentNumber, floorNumber, streetName, city, phoneNumber } = req.body;

       const index = req.user.locations.findIndex(loc => loc.locationId === oldLocationId.toLowerCase());

       if (index === -1) {
           return handleBadRequest(res, 'Location not found.');
       }

       req.user.locations[index] = {
           locationId,
           locationSignature,
           apartmentNumber,
           floorNumber,
           streetName,
           city,
           phoneNumber,
       };
       await req.user.save();

       res.json(req.user.locations);
   }
    catch (error) {
         console.error(error);
         handleServerError(res);
    }
});

router.delete('/locations', async (req, res) => {
    try {
        const {locationId} = req.body;

        const indexToRemove = req.user.locations.findIndex(loc => loc.locationId === locationId.toLowerCase());

        if (indexToRemove === -1) {
            return handleBadRequest(res, 'Location not found.');
        }

        req.user.locations.splice(indexToRemove, 1);
        await req.user.save();

        res.json(req.user.locations);
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

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

router.get('/favorites', async (req, res) => {
    try {
        const user = req.user;
        res.json({ favorites: user.favorites });
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

router.post('/favorites', async (req, res) => {
    try {
        const user = req.user;
        const { itemId } = req.body;

        const index = user.favorites.indexOf(itemId);
        if (index === -1) {
            user.favorites.push(itemId);
        } else {
            user.favorites.splice(index, 1);
        }

        await user.save();
        res.json({ favorites: user.favorites });
    } catch (error) {
        console.error(error);
        handleServerError(res);
    }
});

module.exports = router;