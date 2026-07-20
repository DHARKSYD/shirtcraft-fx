// server/models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label:    { type: String, default: 'Home' },
  street:   { type: String, required: true },
  city:     { type: String, required: true },
  state:    { type: String, required: true },
  zipCode:  { type: String },
  country:  { type: String, default: 'Nigeria' },
  isDefault:{ type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name:      { type: String, required: [true, 'Name is required'], trim: true },
  email:     { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  password:  { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
  role:      { type: String, enum: ['customer', 'admin'], default: 'customer' },
  phone:     { type: String, trim: true, unique: true, sparse: true },
  avatar:    { type: String },
  addresses: [addressSchema],
  wishlist:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isActive:  { type: Boolean, default: true },
  resetPasswordToken:   String,
  resetPasswordExpires: Date,
}, { timestamps: true });

// ── Hash password before save ─────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance method: compare password ─────────────────────────────
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Remove password from JSON output ─────────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
