// server/controllers/productController.js
const { validationResult } = require('express-validator');
const Product = require('../models/Product');

// ── GET /api/products ─────────────────────────────────────────────
exports.getProducts = async (req, res) => {
  try {
    const {
      search, category, size, color,
      minPrice = 0, maxPrice = 10000000,
      sort = 'newest', page = 1, limit = 12,
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category:    { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (size)     query.sizes    = size;
    if (color)    query.colors   = color;
    query.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };

    // Sort mapping
    const sortMap = {
      newest:     { createdAt: -1 },
      oldest:     { createdAt:  1 },
      'price-asc':  { price: 1 },
      'price-desc': { price: -1 },
      rating:     { rating: -1 },
      popular:    { reviewCount: -1 },
    };
    const sortObj = sortMap[sort] || sortMap.newest;

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .select('-reviews');

    res.json({
      products,
      total,
      pages: Math.ceil(total / Number(limit)),
      page:  Number(page),
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ message: 'Failed to fetch products.' });
  }
};

// ── GET /api/products/featured ────────────────────────────────────
exports.getFeatured = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, tags: 'bestseller' })
      .sort({ rating: -1 })
      .limit(8)
      .select('-reviews');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch featured products.' });
  }
};

// ── GET /api/products/:id ─────────────────────────────────────────
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
      isActive: true,
    }).populate('reviews.user', 'name avatar');

    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product.' });
  }
};

// ── POST /api/products ────────────────────────────────────────────
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate product name or slug.' });
    res.status(500).json({ message: 'Failed to create product.', error: err.message });
  }
};

// ── PUT /api/products/:id ─────────────────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    // findByIdAndUpdate with $set bypasses Mongoose's pre('save') middleware,
    // which is what keeps the flat `stock` total in sync with `variants` —
    // an admin editing per-size/colour stock here would otherwise save
    // correctly to `variants` but leave the old flat total (and therefore
    // every "X left in stock" badge across the shop) stale. Loading the
    // document and calling .save() runs that hook like any other product edit.
    Object.assign(product, req.body);
    await product.save();

    res.json(product);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'value';
      return res.status(409).json({ message: `That ${field} is already in use by another product.` });
    }
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors)[0];
      return res.status(400).json({ message: first?.message || 'Validation failed.' });
    }
    console.error('Update product error:', err);
    res.status(500).json({ message: 'Failed to update product.' });
  }
};

// ── DELETE /api/products/:id ──────────────────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product.' });
  }
};

// ── POST /api/products/:id/reviews ────────────────────────────────
exports.addReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    // Prevent duplicate reviews
    const alreadyReviewed = product.reviews.find(
      r => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) return res.status(409).json({ message: 'You have already reviewed this product.' });

    product.reviews.push({ user: req.user._id, name: req.user.name, rating, comment });
    product.updateRating();
    await product.save();

    res.status(201).json({ message: 'Review added.', rating: product.rating, reviewCount: product.reviewCount });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add review.' });
  }
};
