// server/routes/admin.js — analytics + full user management
const express = require('express');
const bcrypt  = require('bcryptjs');
const { protect, adminOnly } = require('../middleware/auth');
const Order   = require('../models/Order');
const User    = require('../models/User');
const Product = require('../models/Product');
const router  = express.Router();

router.use(protect, adminOnly);

// ── GET /api/admin/stats ──────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [revenueAgg, totalOrders, totalCustomers, topProducts] = await Promise.all([
      Order.aggregate([{ $match: { paymentStatus:'paid' } }, { $group: { _id:null, total: { $sum:'$total' } } }]),
      Order.countDocuments(),
      User.countDocuments({ role:'customer' }),
      Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id:'$items.name', sales:{ $sum:'$items.quantity' }, revenue:{ $sum:{ $multiply:['$items.price','$items.quantity'] } } } },
        { $sort: { revenue:-1 } }, { $limit:5 },
      ]),
    ]);
    res.json({ totalRevenue: revenueAgg[0]?.total || 0, totalOrders, totalCustomers, topProducts });
  } catch (err) { res.status(500).json({ message:'Failed to fetch stats.' }); }
});

// ── GET /api/admin/revenue ────────────────────────────────────────
router.get('/revenue', async (req, res) => {
  try {
    const start = new Date(); start.setMonth(start.getMonth() - 6);
    const data  = await Order.aggregate([
      { $match: { createdAt:{ $gte:start }, paymentStatus:'paid' } },
      { $group: { _id:{ year:{ $year:'$createdAt' }, month:{ $month:'$createdAt' } }, amount:{ $sum:'$total' }, count:{ $sum:1 } } },
      { $sort: { '_id.year':1, '_id.month':1 } },
    ]);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    res.json(data.map(d => ({ month: monthNames[d._id.month-1], amount:d.amount, orders:d.count })));
  } catch (err) { res.status(500).json({ message:'Failed to fetch revenue.' }); }
});

// ── GET /api/admin/users ──────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { search = '', role = '', page = 1, limit = 15 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options:'i' } },
        { email: { $regex: search, $options:'i' } },
      ];
    }
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt:-1 })
      .skip((Number(page)-1) * Number(limit))
      .limit(Number(limit));
    res.json({ users, total, pages: Math.ceil(total/Number(limit)) });
  } catch (err) { res.status(500).json({ message:'Failed to fetch users.' }); }
});

// ── PUT /api/admin/users/:id/role ─────────────────────────────────
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer','admin'].includes(role))
      return res.status(400).json({ message:'Invalid role. Must be customer or admin.' });
    // Prevent removing the only admin
    if (role === 'customer') {
      const adminCount = await User.countDocuments({ role:'admin' });
      if (adminCount <= 1) return res.status(400).json({ message:'Cannot remove the last admin account.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new:true }).select('-password');
    if (!user) return res.status(404).json({ message:'User not found.' });
    res.json(user);
  } catch (err) { res.status(500).json({ message:'Role update failed.' }); }
});

// ── PUT /api/admin/users/:id/active ──────────────────────────────
router.put('/users/:id/active', async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new:true }).select('-password');
    if (!user) return res.status(404).json({ message:'User not found.' });
    res.json(user);
  } catch (err) { res.status(500).json({ message:'Status update failed.' }); }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message:'User not found.' });
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role:'admin' });
      if (adminCount <= 1) return res.status(400).json({ message:'Cannot delete the last admin account.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message:'User deleted successfully.' });
  } catch (err) { res.status(500).json({ message:'Delete failed.' }); }
});

// ── POST /api/admin/users/create-admin ────────────────────────────
router.post('/users/create-admin', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message:'Name, email, and password are required.' });
    if (password.length < 8)
      return res.status(400).json({ message:'Password must be at least 8 characters.' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message:'An account with this email already exists.' });
    const user = await User.create({ name, email, password, role:'admin' });
    const safe = user.toJSON();
    res.status(201).json(safe);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message:'Email already in use.' });
    res.status(500).json({ message:'Failed to create admin account.' });
  }
});

module.exports = router;
