// server/models/Driver.js
const mongoose = require('mongoose');
const bcrypt    = require('bcryptjs');

const guarantorSchema = new mongoose.Schema({
  name:         { type: String, default: null },
  phone:        { type: String, default: null },
  address:      { type: String, default: null },
  relationship: { type: String, default: null },
}, { _id: false });

// Verification documents. All are Cloudinary URLs uploaded via
// POST /api/uploads/image before registration submits — the same
// mechanism already used for product images, so no new upload
// infrastructure was needed here.
const documentsSchema = new mongoose.Schema({
  licenseImage:             { type: String, default: null }, // front of driver's license
  vehicleRegistrationImage: { type: String, default: null }, // proof of ownership / particulars
  insuranceImage:           { type: String, default: null },
  insuranceExpiry:          { type: Date,   default: null },
  governmentIdType:         { type: String, enum: ['nin', 'passport', 'voters_card', 'drivers_license', null], default: null },
  governmentIdImage:        { type: String, default: null },
  governmentIdNumber:       { type: String, default: null },
}, { _id: false });

const driverSchema = new mongoose.Schema({
  // Linked user account (optional — driver can exist without a user account)
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Personal info
  name:       { type: String, required: [true, 'Full name is required'], trim: true },
  email:      { type: String, required: [true, 'Email is required'], unique: true, lowercase: true },
  phone:      { type: String, required: [true, 'Phone number is required'], unique: true },
  password:   { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
  photo:      { type: String, default: null }, // Cloudinary URL — passport photograph

  // Vehicle info
  vehicleType:  { type: String, enum: ['motorcycle','car','van','truck'], default: 'motorcycle' },
  vehicleMake:  { type: String },
  vehicleModel: { type: String },
  vehiclePlate: { type: String, required: true, unique: true, uppercase: true, trim: true },
  vehicleColor: { type: String },

  // License & verification
  licenseNumber: { type: String, required: true, unique: true, trim: true },
  licenseExpiry: { type: Date },
  idDocument:    { type: String, default: null }, // legacy single-doc URL, kept for old records

  // Confidential KYC documents + guarantor — required before an admin can
  // move status past 'pending' (enforced in routes/drivers.js).
  documents:  { type: documentsSchema, default: () => ({}) },
  guarantor:  { type: guarantorSchema, default: () => ({}) },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'active', 'inactive', 'suspended'],
    default: 'pending',
  },

  // Real-time location (updated via Socket.io)
  currentLocation: {
    lat:         { type: Number, default: null },
    lng:         { type: Number, default: null },
    address:     { type: String, default: null },
    lastUpdated: { type: Date,   default: null },
    speed:       { type: Number, default: 0 },   // km/h
    bearing:     { type: Number, default: 0 },   // degrees (heading direction)
  },

  // Online state
  isOnline:  { type: Boolean, default: false },
  socketId:  { type: String,  default: null },

  // Current delivery
  activeOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

  // Performance stats
  totalDeliveries: { type: Number, default: 0 },
  rating:          { type: Number, default: 5.0, min: 1, max: 5 },
  ratingCount:     { type: Number, default: 0 },

  // Service area (Nigerian state/city)
  serviceArea: { type: String, default: 'Lagos' },

  // Notes from admin
  adminNotes: { type: String, default: '' },

  // Driver-submitted profile edits, held until an admin approves them.
  // Only the fields listed in ALLOWED_SELF_UPDATE_FIELDS (routes/drivers.js)
  // can ever appear here — the live document is never touched until approval.
  pendingUpdate:            { type: mongoose.Schema.Types.Mixed, default: null },
  pendingUpdateSubmittedAt: { type: Date, default: null },

}, { timestamps: true });

// ── Hash password before save ─────────────────────────────────────
driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

driverSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

driverSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// A driver is considered fully KYC-complete once every required document
// is present — the admin UI and self-service dashboard both read this so
// there's exactly one definition of "complete" across the app.
driverSchema.methods.hasCompleteDocuments = function () {
  const d = this.documents || {};
  return !!(
    d.licenseImage &&
    d.vehicleRegistrationImage &&
    d.insuranceImage &&
    d.governmentIdImage &&
    d.governmentIdType &&
    this.guarantor?.name &&
    this.guarantor?.phone
  );
};

// Indexes for geo-queries. (email/phone/vehiclePlate/licenseNumber already
// get their unique index from `unique: true` on the field itself above —
// adding a second explicit .index() for the same path is what was causing
// Mongoose's "Duplicate schema index" boot warnings.)
driverSchema.index({ 'currentLocation.lat': 1, 'currentLocation.lng': 1 });
driverSchema.index({ status: 1, isOnline: 1 });

module.exports = mongoose.model('Driver', driverSchema);
