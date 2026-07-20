// server/routes/products.js
const express  = require('express');
const { body } = require('express-validator');
const ctrl     = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public
router.get('/',           ctrl.getProducts);
router.get('/featured',   ctrl.getFeatured);
router.get('/:id',        ctrl.getProductById);
router.post('/:id/reviews', protect, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').trim().isLength({ min: 5 }),
], ctrl.addReview);

// Admin only
router.post('/',    protect, adminOnly, ctrl.createProduct);
router.put('/:id',  protect, adminOnly, ctrl.updateProduct);
router.delete('/:id', protect, adminOnly, ctrl.deleteProduct);

module.exports = router;
