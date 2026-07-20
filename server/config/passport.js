// server/config/passport.js
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User           = require('../models/User');
const { generateToken } = require('../middleware/auth');

// DEPLOYMENT.md documents GOOGLE_CLIENT_ID/SECRET as optional ("only needed
// if Google sign-in is enabled") — but passport-google-oauth20's strategy
// constructor throws synchronously if they're missing, and this file used
// to call it unconditionally at import time. Since index.js requires this
// module before the app even starts listening, that throw took the whole
// server down, not just Google sign-in. Registering the strategy only when
// both values are present makes "optional" actually true.
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
passport.googleEnabled = googleEnabled;

if (googleEnabled) {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    scope: ['profile', 'email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email  = profile.emails?.[0]?.value;
      const name   = profile.displayName;
      const avatar = profile.photos?.[0]?.value;

      if (!email) return done(new Error('No email returned from Google'), null);

      // Check if user exists
      let user = await User.findOne({ email });

      if (user) {
        // Update avatar from Google if not set
        if (!user.avatar && avatar) {
          user.avatar = avatar;
          await user.save({ validateBeforeSave: false });
        }
      } else {
        // Create new user from Google profile
        user = await User.create({
          name,
          email,
          avatar,
          // Random password — user will never use it (OAuth only)
          password: `google_${profile.id}_${Math.random().toString(36)}`,
          isActive: true,
        });
      }

      // Attach a JWT to the user object so the callback route can send it
      user._jwtToken = generateToken(user._id);
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
} else {
  console.log('ℹ️  Google sign-in disabled (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set) — email/password auth still works normally.');
}

// We don't use sessions (JWT-based), but passport requires these stubs
passport.serializeUser((user, done)   => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) { done(err, null); }
});

module.exports = passport;
