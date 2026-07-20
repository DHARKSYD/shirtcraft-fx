// server/controllers/authController.js
const crypto           = require('crypto');
const { validationResult } = require('express-validator');
const User             = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { sendEmail }    = require('../utils/email');
const { getAllowedOrigins } = require('../utils/corsOrigins');

// ── Helper: send validation errors ───────────────────────────────
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg });
    return false;
  }
  return true;
};

// ── POST /api/auth/register ───────────────────────────────────────
exports.register = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { name, email, password } = req.body;

    // Check duplicate
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user  = await User.create({ name, email, password });
    const token = generateToken(user._id);

    // Welcome email (non-blocking)
    sendEmail({
      to:      user.email,
      subject: 'Welcome to ShirtCraft 🎉',
      html:    `<h2>Welcome, ${user.name}!</h2><p>Your ShirtCraft account is ready. Start designing your custom t-shirts today.</p>`,
    }).catch(console.error);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────
exports.login = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { email, password } = req.body;

    // Include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
    if (!user.isActive) return res.status(403).json({ message: 'Your account has been deactivated.' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = generateToken(user._id);

    // Return user without password
    const safe = user.toJSON();
    res.json({ token, user: safe });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

// ── POST /api/auth/forgot-password ───────────────────────────────
exports.forgotPassword = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond 200 to prevent email enumeration
    if (!user) return res.json({ message: 'If an account exists, a reset link has been sent.' });

    // Generate reset token (raw → hash to store)
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken   = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${getAllowedOrigins()[0]}/reset-password/${rawToken}`;

    await sendEmail({
      to:      user.email,
      subject: 'ShirtCraft — Password Reset Request',
      html:    `
        <h2>Password Reset</h2>
        <p>You requested a password reset for your ShirtCraft account.</p>
        <p><a href="${resetUrl}" style="padding:12px 24px;background:#FF4F1F;color:white;border-radius:8px;text-decoration:none;">Reset Password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `,
    });

    res.json({ message: 'Password reset email sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to send reset email.' });
  }
};

// ── POST /api/auth/reset-password/:token ─────────────────────────
exports.resetPassword = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    user.password             = req.body.password;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.json({ token, message: 'Password reset successful.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Password reset failed.' });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────
exports.logout = (req, res) => {
  // JWT is stateless; client deletes the token.
  // Optionally add token to a blacklist (Redis) for stricter invalidation.
  res.json({ message: 'Logged out successfully.' });
};
