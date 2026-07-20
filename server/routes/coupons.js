// server/routes/coupons.js
const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const Coupon = require('../models/Coupon');
const router  = express.Router();

// POST /api/coupons/validate  (public: lets shoppers preview a discount
// before checkout, even before signing in — the real discount is always
// re-verified server-side when the order is placed, so this is safe to
// leave open.)
router.post('/validate', async (req, res) => {
  try {
    const { code, orderValue } = req.body;
    const coupon = await Coupon.findOne({ code: code?.toUpperCase() });
    if (!coupon || !coupon.isValid())
      return res.status(400).json({ message: 'Invalid or expired coupon code.' });
    if (orderValue < (coupon.minOrderValue || 0))
      return res.status(400).json({ message: `Minimum order value of ₦${coupon.minOrderValue.toLocaleString()} required.` });
    res.json({ discount: coupon.discount, type: coupon.type, code: coupon.code });
  } catch { res.status(500).json({ message: 'Failed to validate coupon.' }); }
});

// Admin CRUD
router.get('/',       protect, adminOnly, async (_, res) => {
  try { res.json(await Coupon.find().sort({ createdAt: -1 })); }
  catch { res.status(500).json({ message: 'Failed to fetch coupons.' }); }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.create({ ...req.body, code: req.body.code?.toUpperCase() });
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Coupon code already exists.' });
    res.status(500).json({ message: 'Failed to create coupon.' });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    res.json(coupon);
  } catch { res.status(500).json({ message: 'Failed to update coupon.' }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted.' });
  } catch { res.status(500).json({ message: 'Failed to delete coupon.' }); }
});

module.exports = router;
