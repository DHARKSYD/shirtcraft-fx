// server/middleware/auth.js
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const Driver = require('../models/Driver');

/**
 * protect – verifies Bearer JWT and attaches req.user
 */
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided. Please log in.' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shirtcraft_secret_2025');
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or deactivated.' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

/**
 * adminOnly – must be used after protect
 */
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

/**
 * protectDriver – verifies a driver Bearer JWT (signed with { driverId }
 * at /drivers/login) and attaches req.driver. Driver accounts are a
 * separate collection from users, so this does not reuse `protect`.
 */
exports.protectDriver = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided. Please log in.' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shirtcraft_secret_2025');
    if (!decoded.driverId) {
      return res.status(401).json({ message: 'Invalid driver token.' });
    }
    const driver = await Driver.findById(decoded.driverId);
    if (!driver) return res.status(401).json({ message: 'Driver account not found.' });
    if (driver.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
    }
    req.driver = driver;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

/**
 * generateToken – signs a JWT
 */
exports.generateToken = (userId, expiresIn = '7d') => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'shirtcraft_secret_2025',
    { expiresIn }
  );
};
