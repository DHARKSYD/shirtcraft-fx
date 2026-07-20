// server/models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:         { type: String, required: true },
  price:        { type: Number, required: true },
  image:        { type: String },
  size:         { type: String },
  color:        { type: String },
  quantity:     { type: Number, required: true, min: 1 },
  customDesign: { type: String },
}, { _id: false });

const shippingSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  phone:   { type: String, required: true },
  street:  { type: String, required: true },
  city:    { type: String, required: true },
  state:   { type: String, required: true },
  country: { type: String, default: 'Nigeria' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber:   { type: String, unique: true },
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:         [orderItemSchema],
  shipping:      shippingSchema,
  // NOTE: 'card' / 'transfer' / 'paypal' are kept for backwards compatibility with
  // older seeded/demo data. The live checkout flow uses 'paystack' and 'bank_transfer'.
  paymentMethod: { type: String, enum: ['card','transfer','paypal','paystack','bank_transfer'], required: true },
  paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
  paymentId:     { type: String },
  paystackReference: { type: String, default: null },
  subtotal:      { type: Number, required: true },
  discount:      { type: Number, default: 0 },
  shippingCost:  { type: Number, default: 0 },
  total:         { type: Number, required: true },
  coupon:        { type: String },
  status:        { type: String, enum: ['pending','processing','shipped','delivered','cancelled'], default: 'pending' },
  trackingNumber:{ type: String },
  assignedDriver:{ type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  notes:         { type: String },

  // ── Cancellation ───────────────────────────────────────────────
  cancelledAt:        { type: Date, default: null },
  cancelledBy:         { type: String, enum: ['customer', 'admin', 'system', null], default: null },
  cancellationReason:  { type: String, default: null },
  // Set true the moment stock is decremented for this order (at creation)
  // and false once it's been put back (cancellation or successful
  // delivery bookkeeping) — lets the cancel/auto-cancel paths know
  // whether there's anything left to restore without re-deriving it from
  // paymentStatus, which can change for other reasons (refund after
  // delivery, etc).
  stockReserved:       { type: Boolean, default: true },
}, { timestamps: true });

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    const year  = new Date().getFullYear();
    this.orderNumber = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// An order is eligible for self-service / admin cancellation only while
// payment hasn't gone through and it hasn't already been cancelled.
orderSchema.methods.isCancellable = function () {
  return this.paymentStatus === 'pending' && this.status !== 'cancelled' && this.status !== 'delivered';
};

module.exports = mongoose.model('Order', orderSchema);
