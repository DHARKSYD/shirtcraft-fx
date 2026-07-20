// server/routes/orders.js
const express = require('express');
const ctrl    = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Customer
router.post('/',               protect,              ctrl.createOrder);
router.get('/my',              protect,              ctrl.getMyOrders);
router.get('/:id',             protect,              ctrl.getOrderById);
router.post('/payment-intent', protect,              ctrl.createPaymentIntent);
router.post('/verify-payment', protect,              ctrl.verifyPayment);
router.patch('/:id/cancel',    protect,              ctrl.cancelOrder);

// Admin — list ALL orders (must come before /:id)
router.get('/',    protect, adminOnly, ctrl.getAllOrders);
router.put('/:id/status',         protect, adminOnly, ctrl.updateOrderStatus);
router.put('/:id/tracking',       protect, adminOnly, ctrl.addTracking);
router.put('/:id/payment-status', protect, adminOnly, ctrl.updatePaymentStatus);
router.patch('/:id/admin-cancel', protect, adminOnly, ctrl.adminCancelOrder);

module.exports = router;
