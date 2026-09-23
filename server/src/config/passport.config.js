const passport = require('passport');
const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../../models/User');
const AppError = require('../utils/AppError');

/**
 * Passport Configuration
 * Handles authentication strategies and user serialization
 */
class PassportConfig {
  /**
   * Initialize Passport strategies
   */
  static initialize() {
    this.configureLocalStrategy();
    this.configureGoogleStrategy();
    this.configureSerialization();

    console.log('Passport authentication strategies initialized');
  }

  /**
   * Configure Local Authentication Strategy
   */
  static configureLocalStrategy() {
    // Local Login Strategy
    passport.use('local-login', new LocalStrategy({
      usernameField: 'email',
      passReqToCallback: true
    }, async (req, email, password, done) => {
      try {
        const user = await User.findOne({ email }).lean();

        if (!user || user.deleted || !user.password) {
          return done(null, false, {
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
          });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, {
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
          });
        }

        // Return user payload for session
        const userPayload = {
          _id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
          preferredLanguage: user.preferredLanguage
        };

        return done(null, userPayload);
      } catch (error) {
        console.error('Local login error:', error);
        return done(error);
      }
    }));

    // Local Register Strategy
    passport.use('local-register', new LocalStrategy({
      usernameField: 'email',
      passReqToCallback: true
    }, async (req, email, password, done) => {
      try {
        const { name, gender, dateOfBirth } = req.body;

        // Validate required fields
        if (!name || name.length < 2) {
          return done(null, false, {
            error: 'Name must be at least 2 characters long',
            code: 'INVALID_NAME'
          });
        }

        if (!password || password.length < 6) {
          return done(null, false, {
            error: 'Password must be at least 6 characters long',
            code: 'INVALID_PASSWORD'
          });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email }).lean();
        if (existingUser) {
          return done(null, false, {
            error: 'Email already exists',
            code: 'EMAIL_EXISTS'
          });
        }

        // Create new user
        const newUser = await User.create({
          email,
          password, // The User pre-save hook hashes this exactly once.
          name,
          gender: ['male', 'female'].includes(gender) ? gender : undefined,
          dateOfBirth: dateOfBirth || undefined,
          role: 'unverified'
        });

        // Return user payload for session
        const userPayload = {
          _id: newUser._id,
          email: newUser.email,
          role: newUser.role,
          name: newUser.name,
          preferredLanguage: newUser.preferredLanguage
        };

        return done(null, userPayload);
      } catch (error) {
        console.error('Local register error:', error);

        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
          return done(null, false, {
            error: 'Email already exists',
            code: 'EMAIL_EXISTS'
          });
        }

        return done(error);
      }
    }));
  }

  /**
   * Configure Google OAuth Strategy
   */
  static configureGoogleStrategy() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn('Google OAuth credentials not found in environment variables');
      return;
    }

    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/users/google/callback',
      state: true
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(null, false, {
            error: 'No email found in Google profile',
            code: 'GOOGLE_NO_EMAIL'
          });
        }

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
          if (user.deleted) return done(null, false);
          // Update Google ID if not set
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
        } else {
          // Create new user from Google profile
          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName || 'Google User',
            role: 'unverified',
            profilePicture: profile.photos?.[0]?.value
          });
        }

        // Return user payload for session
        const userPayload = {
          _id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
          preferredLanguage: user.preferredLanguage
        };

        return done(null, userPayload);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error);
      }
    }));
  }

  /**
   * Configure user serialization for sessions
   */
  static configureSerialization() {
    // Serialize user for session
    passport.serializeUser((user, done) => {
      done(null, user.email);
    });

    // Deserialize user from session
    passport.deserializeUser(async (email, done) => {
      try {
        const user = await User.findOne({ email })
          .populate('subjects', 'name code')
          .lean();

        if (!user || user.deleted) {
          return done(null, false);
        }

        // Return sanitized user data for req.user
        const userPayload = {
          _id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
          preferredLanguage: user.preferredLanguage || 'en',
          subjects: user.subjects || [],
          profilePicture: user.profilePicture
        };

        return done(null, userPayload);
      } catch (error) {
        console.error('User deserialization error:', error);
        return done(error);
      }
    });
  }

  /**
   * Middleware to authenticate local login
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next function
   */
  static authenticateLogin(req, res, next) {
    passport.authenticate('local-login', (err, user, info) => {
      if (err) {
        return next(new AppError('Authentication error', 500, 'AUTH_ERROR'));
      }

      if (!user) {
        return next(new AppError(
          info.error || 'Authentication failed',
          401,
          info.code || 'AUTH_FAILED'
        ));
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(new AppError('Login session error', 500, 'SESSION_ERROR'));
        }

        // Successful login
        res.json({
          success: true,
          message: 'Login successful',
          user: {
            email: user.email,
            role: user.role,
            name: user.name
          }
        });
      });
    })(req, res, next);
  }

  /**
   * Middleware to authenticate local registration
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next function
   */
  static authenticateRegister(req, res, next) {
    passport.authenticate('local-register', (err, user, info) => {
      if (err) {
        return next(new AppError('Registration error', 500, 'REGISTRATION_ERROR'));
      }

      if (!user) {
        return next(new AppError(
          info.error || 'Registration failed',
          400,
          info.code || 'REGISTRATION_FAILED'
        ));
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(new AppError('Registration session error', 500, 'SESSION_ERROR'));
        }

        // Successful registration
        res.status(201).json({
          success: true,
          message: 'Registration successful',
          user: {
            email: user.email,
            role: user.role,
            name: user.name
          }
        });
      });
    })(req, res, next);
  }

  /**
   * Middleware for Google OAuth initiation
   */
  static initiateGoogleAuth() {
    return passport.authenticate('google', {
      scope: ['profile', 'email']
    });
  }

  /**
   * Middleware for Google OAuth callback
   */
  static handleGoogleCallback() {
    return passport.authenticate('google', {
      failureRedirect: process.env.CLIENT_URL + '/login?error=google_auth_failed'
    });
  }
}

module.exports = PassportConfig;
