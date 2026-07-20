// server/routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const ctrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], ctrl.register);

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], ctrl.login);

// GET /api/auth/me
router.get('/me', protect, ctrl.getMe);

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], ctrl.forgotPassword);

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', [
  body('password').isLength({ min: 8 }),
], ctrl.resetPassword);

// POST /api/auth/logout
router.post('/logout', protect, ctrl.logout);

module.exports = router;
