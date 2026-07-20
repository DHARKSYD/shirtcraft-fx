// server/routes/users.js
const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const User    = require('../models/User');
const router  = express.Router();

// GET /api/users/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch { res.status(500).json({ message: 'Failed to get profile.' }); }
});

// PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id, { name, phone, avatar }, { new: true }
    );
    res.json(user);
  } catch { res.status(500).json({ message: 'Failed to update profile.' }); }
});

// POST /api/users/addresses
router.post('/addresses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (req.body.isDefault) user.addresses.forEach(a => a.isDefault = false);
    user.addresses.push(req.body);
    await user.save();
    res.status(201).json(user.addresses);
  } catch { res.status(500).json({ message: 'Failed to add address.' }); }
});

// DELETE /api/users/addresses/:addrId
router.delete('/addresses/:addrId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.addrId);
    await user.save();
    res.json(user.addresses);
  } catch { res.status(500).json({ message: 'Failed to delete address.' }); }
});

// PUT /api/users/wishlist/:productId
router.put('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx  = user.wishlist.indexOf(req.params.productId);
    if (idx >= 0) user.wishlist.splice(idx, 1);
    else user.wishlist.push(req.params.productId);
    await user.save();
    res.json({ wishlist: user.wishlist });
  } catch { res.status(500).json({ message: 'Failed to update wishlist.' }); }
});

// Admin: GET /api/users
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await User.countDocuments({ role: 'customer' });
    const users = await User.find({ role: 'customer' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ users, total });
  } catch { res.status(500).json({ message: 'Failed to fetch users.' }); }
});

module.exports = router;
