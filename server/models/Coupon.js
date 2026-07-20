// server/models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:         { type: String, required: true, unique: true, uppercase: true, trim: true },
  discount:     { type: Number, required: true, min: 1, max: 100 },
  type:         { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  usageLimit:   { type: Number, default: null },  // null = unlimited
  usageCount:   { type: Number, default: 0 },
  expiresAt:    { type: Date,   default: null },  // null = never
  isActive:     { type: Boolean, default: true },
  minOrderValue:{ type: Number, default: 0 },
}, { timestamps: true });

/**
 * isValid() — checks all conditions that would make this coupon unusable
 */
couponSchema.methods.isValid = function () {
  if (!this.isActive)                              return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit) return false;
  return true;
};

module.exports = mongoose.model('Coupon', couponSchema);
