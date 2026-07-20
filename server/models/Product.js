// server/models/Product.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
}, { timestamps: true });

// One row per (size, color) combination actually sold. `color` is null for
// products that don't vary by colour (accessories, one-colour items), and
// `size` is null for products that don't vary by size — but not both null,
// since that's just a single flat stock count and belongs on the legacy
// `stock` field below for backwards compatibility with older seeded data.
const variantSchema = new mongoose.Schema({
  size:  { type: String, default: null },
  color: { type: String, default: null },
  stock: { type: Number, required: true, min: 0, default: 0 },
  sku:   { type: String, default: null },
}, { _id: false });

// Multi-shirt packs (e.g. a "3-in-1" bundle). Kept separate from `variants`
// because a pack's inventory unit is "packs available", not "shirts
// available" — a customer buying qty 1 of a pack still only decrements 1
// unit of pack stock, regardless of packSize.
const packInfoSchema = new mongoose.Schema({
  isPack:   { type: Boolean, default: false },
  // Only meaningful when isPack is true — default:1 represents "just the
  // one shirt" for every ordinary product. A blanket `min: 2` here would
  // contradict that default and fail validation for every non-pack
  // product, so the minimum is enforced only when isPack is actually set.
  packSize: {
    type: Number, default: 1,
    validate: {
      validator: function (v) { return !this.isPack || v >= 2; },
      message: 'A pack must contain at least 2 shirts.',
    },
  },
  // 'single-color'  → customer picks ONE colour from `colors`; all packSize
  //                    shirts in the pack are that colour. Stock is tracked
  //                    per-colour in `variants`, same as a normal product.
  // 'mixed'         → the pack always ships with one of each colour listed
  //                    in `mixedColors`; the customer does not choose a
  //                    colour. Stock for this fixed combination is tracked
  //                    under a variant with color: 'Mixed'.
  packMode:    { type: String, enum: ['single-color', 'mixed'], default: 'single-color' },
  mixedColors: [{ type: String }],
}, { _id: false });

const productSchema = new mongoose.Schema({
  name:         { type: String, required: [true, 'Product name is required'], trim: true },
  slug:         { type: String, unique: true, lowercase: true },
  description:  { type: String, required: true },
  price:        { type: Number, required: true, min: 0 },
  comparePrice: { type: Number },
  category:     { type: String, required: true },
  images:       [{ type: String }],
  colors:       [{ type: String }],
  // Maps a colour name from `colors` above to its own image URLs, e.g.
  // { "Navy": ["https://...front.jpg", "https://...back.jpg"] }. A colour
  // with no entry here just falls back to the default `images` gallery.
  colorImages:  { type: Map, of: [String], default: {} },
  sizes:        [{ type: String }],
  features:     [{ type: String }],
  tags:         [{ type: String }],

  // ── Inventory ──────────────────────────────────────────────────
  // `stock` is now a DERIVED total (kept in sync by the pre-save hook and
  // by every controller-side stock mutation below) so that every existing
  // query, sort, and "X left in stock" UI that reads the flat number
  // keeps working unmodified. `variants` is the real source of truth once
  // a product has any sizes/colours at all.
  stock:        { type: Number, default: 0, min: 0 },
  variants:     [variantSchema],
  packInfo:     { type: packInfoSchema, default: () => ({}) },

  rating:       { type: Number, default: 0 },
  reviewCount:  { type: Number, default: 0 },
  reviews:      [reviewSchema],
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

// ── Keep the flat `stock` total in sync with `variants` ────────────
// Runs on every save (create + update via .save()); controllers that use
// findOneAndUpdate/findByIdAndUpdate for atomic stock decrements recompute
// `stock` explicitly themselves (see productController.recomputeStock and
// orderController's reservation logic), since those bypass this hook.
productSchema.methods.recomputeStockTotal = function () {
  if (this.variants && this.variants.length > 0) {
    this.stock = this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
};

productSchema.pre('save', function (next) {
  this.recomputeStockTotal();
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// ── Variant helpers ──────────────────────────────────────────────
// Normalises a (size, color) request into the matching variant, treating
// '' / undefined the same as null so callers don't need to worry about it.
productSchema.methods.findVariant = function (size, color) {
  const s = size || null, c = color || null;
  return this.variants?.find(v => (v.size || null) === s && (v.color || null) === c) || null;
};

// Available stock for a specific selection. Falls back to the flat `stock`
// field for products that predate the variant system (no variants array
// at all) so old seeded/demo products don't suddenly show "out of stock".
productSchema.methods.stockFor = function (size, color) {
  if (!this.variants || this.variants.length === 0) return this.stock;
  const v = this.findVariant(size, color);
  return v ? v.stock : 0;
};

// ── Update rating on review save ──────────────────────────────────
productSchema.methods.updateRating = function () {
  if (this.reviews.length === 0) { this.rating = 0; this.reviewCount = 0; return; }
  const avg = this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.reviews.length;
  this.rating      = Math.round(avg * 10) / 10;
  this.reviewCount = this.reviews.length;
};

module.exports = mongoose.model('Product', productSchema);
