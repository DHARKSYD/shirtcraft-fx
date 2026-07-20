// server/controllers/orderController.js
const Order   = require('../models/Order');
const Product = require('../models/Product');
const Coupon  = require('../models/Coupon');
const { sendEmail } = require('../utils/email');
const { getAllowedOrigins } = require('../utils/corsOrigins');
const { releaseOrderHolds, timeoutHours } = require('../utils/orderMaintenance');

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

// Shared by verifyPayment (Paystack) and updatePaymentStatus (admin manually
// confirming a bank transfer) — both are "the money actually arrived"
// moments and should tell the customer the same way.
function sendPaymentConfirmedEmail(order) {
  if (!order.user?.email) return;
  sendEmail({
    to:      order.user.email,
    subject: `Payment Confirmed — ${order.orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#FF4F1F">Payment Received ✅</h2>
        <p>Hi ${order.user.name || 'there'},</p>
        <p>We've confirmed payment of <strong>₦${order.total.toLocaleString()}</strong> for order <strong>${order.orderNumber}</strong>. It's now being prepared.</p>
        <p>We'll email you again once it ships.</p>
      </div>
    `,
  }).catch(console.error);
}

// ── POST /api/orders/payment-intent ──────────────────────────────
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, orderId, orderNumber } = req.body; // amount in kobo (NGN smallest unit)
    if (!paystackSecretKey) return res.status(503).json({ message: 'Payment service unavailable in demo mode.' });

    const reference = orderNumber ? `${orderNumber}-${Date.now()}` : `paystack-${Date.now()}-${req.user._id}`;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user.email,
        amount: Math.round(amount),
        currency: 'NGN',
        reference,
        // Sends the paying tab back to a page that automatically calls
        // /orders/verify-payment on load — see OrderSuccess.jsx. Paystack
        // only appends its own `reference`/`trxref` params, so the order id
        // is carried in the path rather than relying on query params alone.
        callback_url: orderId ? `${getAllowedOrigins()[0]}/order-success/${orderId}?reference=${reference}` : undefined,
        metadata: { userId: req.user._id.toString(), orderId: orderId || null },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.status) {
      return res.status(502).json({ message: data.message || 'Failed to initialize Paystack payment.' });
    }

    // Remember the reference on the order so verify-payment can find it
    // even if the browser loses track of local state (different tab/device
    // completing the payment than the one that started checkout).
    if (orderId) await Order.findByIdAndUpdate(orderId, { paystackReference: reference });

    res.json({ authorizationUrl: data.data?.authorization_url, reference: data.data?.reference || reference });
  } catch (err) {
    console.error('Paystack error:', err);
    res.status(500).json({ message: 'Failed to create Paystack payment.' });
  }
};

// ── POST /api/orders/verify-payment ───────────────────────────────
// Confirms a Paystack transaction actually succeeded before trusting it.
// This used to not exist at all: nothing in the app ever called Paystack's
// verify endpoint, so a "paid" Paystack order only ever became `paid` if an
// admin noticed and flipped it by hand via updatePaymentStatus. Every
// legitimately-paid order was sitting at paymentStatus:'pending' — which,
// combined with the new 48h auto-cancel sweep, would have gotten REAL
// payments auto-cancelled for "non-payment". This endpoint is what makes
// that sweep safe to run.
exports.verifyPayment = async (req, res) => {
  try {
    const { reference, orderId } = req.body;
    if (!reference) return res.status(400).json({ message: 'Payment reference is required.' });
    if (!paystackSecretKey) return res.status(503).json({ message: 'Payment service unavailable in demo mode.' });

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecretKey}` },
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
      return res.status(502).json({ message: data.message || 'Could not verify payment with Paystack.' });
    }

    const tx = data.data;
    const order = orderId
      ? await Order.findById(orderId).populate('user', 'name email')
      : await Order.findOne({ paystackReference: reference }).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found for this payment reference.' });
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorised.' });
    }

    if (tx.status !== 'success') {
      return res.status(400).json({ message: `Payment was not successful (status: ${tx.status}).`, order });
    }

    // Amounts are in kobo on both sides. Comparing against the order's own
    // stored total — never a client-supplied figure — is what stops a
    // reference for a smaller, separately-paid transaction from being
    // replayed to mark THIS order as paid.
    const expectedKobo = Math.round(order.total * 100);
    if (tx.amount < expectedKobo) {
      return res.status(400).json({ message: 'The paid amount does not match this order\u2019s total. Please contact support.' });
    }

    if (order.paymentStatus !== 'paid') {
      order.paymentStatus     = 'paid';
      order.paymentId         = reference;
      order.paystackReference = reference;
      order.status            = order.status === 'pending' ? 'processing' : order.status;
      await order.save();
      sendPaymentConfirmedEmail(order);
    }

    res.json({ message: 'Payment verified!', order });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ message: 'Payment verification failed.' });
  }
};

// ── POST /api/orders ──────────────────────────────────────────────
// Creates an order after re-validating stock and pricing server-side.
// Nothing from the client (prices, coupon discount, stock availability) is
// trusted — it is always recomputed from the database.
exports.createOrder = async (req, res) => {
  // Tracks stock we've already decremented for THIS order, so we can put it
  // back if a later step in the same request fails.
  const stockReservations = [];

  const releaseReservations = async () => {
    await Promise.all(stockReservations.map(r => {
      if (r.hasVariants) {
        return Product.updateOne(
          { _id: r.productId, variants: { $elemMatch: { size: r.size, color: r.color } } },
          { $inc: { 'variants.$.stock': r.qty, stock: r.qty } }
        );
      }
      return Product.updateOne({ _id: r.productId }, { $inc: { stock: r.qty } });
    }));
  };

  try {
    const { items, shipping, paymentMethod, couponCode } = req.body;

    if (!items?.length) {
      return res.status(400).json({ message: 'Order must contain at least one item.' });
    }
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({ message: 'Every item must have a valid quantity.' });
      }
    }
    if (!shipping?.name || !shipping?.phone || !shipping?.street || !shipping?.city || !shipping?.state) {
      return res.status(400).json({ message: 'Complete shipping details are required.' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required.' });
    }

    // ── Aggregate requested quantity per (product, size, color) VARIANT ──
    // Stock is now tracked per size/colour combination, so two cart lines
    // for the same shirt in different sizes must be checked and reserved
    // independently rather than lumped into one product-level number.
    const requestedByVariant = new Map(); // key → { productId, size, color, qty }
    for (const item of items) {
      if (item.customDesign) continue;
      if (!item.product) {
        return res.status(400).json({ message: 'Each catalog item must reference a product.' });
      }
      const key = `${item.product}::${item.size || ''}::${item.color || ''}`;
      const existing = requestedByVariant.get(key);
      requestedByVariant.set(key, {
        productId: item.product,
        size:  item.size  || null,
        color: item.color || null,
        qty: (existing?.qty || 0) + item.quantity,
      });
    }

    const productIds = [...new Set([...requestedByVariant.values()].map(v => v.productId))];
    const products    = productIds.length ? await Product.find({ _id: { $in: productIds } }) : [];
    const productById = new Map(products.map(p => [p._id.toString(), p]));

    const stockErrors = [];
    for (const { productId, size, color, qty } of requestedByVariant.values()) {
      const product = productById.get(productId);
      if (!product) {
        stockErrors.push('One of the items in your cart is no longer available.');
        continue;
      }
      const available = product.stockFor(size, color);
      const label = [size, color].filter(Boolean).join(' / ');
      if (available < qty) {
        stockErrors.push(
          available === 0
            ? `${product.name}${label ? ` (${label})` : ''} is out of stock.`
            : `Only ${available} left of ${product.name}${label ? ` (${label})` : ''} (you requested ${qty}).`
        );
      }
    }
    if (stockErrors.length) {
      return res.status(400).json({ message: stockErrors.join(' ') });
    }

    // ── Build trusted order line items & subtotal from server-side data ──
    // Custom designs are a flat rate everywhere in the UI (Design Studio),
    // so — just like catalog items below — the price is never taken from
    // the client; it's fixed here so a crafted request can't undercut it.
    const CUSTOM_DESIGN_PRICE = 12999;
    let subtotal = 0;
    const orderItems = items.map(item => {
      if (item.customDesign) {
        subtotal += CUSTOM_DESIGN_PRICE * item.quantity;
        return {
          customDesign: 'true',
          name:     item.name || 'Custom Designed T-Shirt',
          price:    CUSTOM_DESIGN_PRICE,
          image:    item.image,
          size:     item.size,
          color:    item.color,
          quantity: item.quantity,
        };
      }
      const product = productById.get(item.product);
      subtotal += product.price * item.quantity;
      const colorImg = item.color && product.colorImages?.get?.(item.color);
      return {
        product:  product._id,
        name:     product.name,
        price:    product.price,
        image:    (colorImg && colorImg[0]) || product.images[0],
        size:     item.size,
        color:    item.color,
        quantity: item.quantity,
      };
    });

    // ── Apply coupon — re-validated server-side, client value never trusted ──
    let discountAmt = 0;
    let couponUsed  = null;
    let couponDoc   = null;
    if (couponCode) {
      couponDoc = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (couponDoc?.isValid() && subtotal >= (couponDoc.minOrderValue || 0)) {
        discountAmt = couponDoc.type === 'percentage'
          ? (subtotal * couponDoc.discount) / 100
          : Math.min(couponDoc.discount, subtotal);
        couponUsed = couponDoc.code;
      }
    }

    const shippingCost = subtotal - discountAmt > 10000 ? 0 : 1500;
    const total         = Math.max(0, subtotal - discountAmt) + shippingCost;

    // ── Reserve stock: one atomic, conditional decrement per variant ────
    // findOneAndUpdate's $gte filter makes each reservation race-safe even
    // without a multi-document transaction (not available on a standalone/
    // non-replica-set MongoDB, the common local dev setup for this
    // project). If two checkouts race for the last unit, only one of the
    // conditional updates can match.
    for (const { productId, size, color, qty } of requestedByVariant.values()) {
      const product      = productById.get(productId);
      const hasVariants  = product?.variants?.length > 0;

      const filter = hasVariants
        ? { _id: productId, variants: { $elemMatch: { size, color, stock: { $gte: qty } } } }
        : { _id: productId, stock: { $gte: qty } };
      const update = hasVariants
        ? { $inc: { 'variants.$.stock': -qty, stock: -qty } }
        : { $inc: { stock: -qty } };

      const updated = await Product.findOneAndUpdate(filter, update, { new: true });
      if (!updated) {
        // Lost the race (or the exact size/colour no longer exists) —
        // release anything already reserved for this order before bailing.
        await releaseReservations();
        const label = [size, color].filter(Boolean).join(' / ');
        return res.status(409).json({
          message: `${product?.name || 'An item'}${label ? ` (${label})` : ''} just sold out while you were checking out. Please update your cart and try again.`,
        });
      }
      stockReservations.push({ productId, size, color, qty, hasVariants });
    }

    // ── Create the order ─────────────────────────────────────────────
    // Every order starts pending, regardless of paymentMethod — a
    // client-supplied "trust me, I paid" flag no longer exists. Paystack
    // orders only flip to `paid` once verify-payment confirms it with
    // Paystack directly; bank-transfer orders flip once an admin confirms
    // receipt via updatePaymentStatus. Both paths funnel through here as
    // 'pending', which is also what makes them visible to the cancel /
    // auto-cancel flow below if payment never arrives.
    let order;
    try {
      order = await Order.create({
        user:          req.user._id,
        items:         orderItems,
        shipping,
        paymentMethod,
        paymentStatus: 'pending',
        subtotal,
        discount:      discountAmt,
        shippingCost,
        total,
        coupon:        couponUsed,
        status:        'pending',
        stockReserved: true,
      });
    } catch (createErr) {
      await releaseReservations();
      throw createErr;
    }

    // Coupon usage is only committed once the order is confirmed created —
    // a failed order should never consume a limited-use coupon slot. (If
    // this order later gets cancelled unpaid, releaseOrderHolds() gives
    // the slot back — see utils/orderMaintenance.js.)
    if (couponDoc && couponUsed) {
      couponDoc.usageCount += 1;
      await couponDoc.save();
    }

    // ── Send confirmation email (best-effort, never blocks the response) ──
    sendEmail({
      to:      req.user.email,
      subject: `Order Confirmed — ${order.orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#FF4F1F">Order Confirmed! 🎉</h2>
          <p>Hi ${req.user.name},</p>
          <p>Your order <strong>${order.orderNumber}</strong> has been received${paymentMethod === 'bank_transfer' ? ' and is awaiting payment confirmation' : ''}.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            ${orderItems.map(i => `
              <tr>
                <td style="padding:8px;border-bottom:1px solid #eee">${i.name} ×${i.quantity}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₦${(i.price * i.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr><td style="padding:8px;font-weight:bold">Total</td><td style="padding:8px;text-align:right;font-weight:bold;color:#FF4F1F">₦${total.toLocaleString()}</td></tr>
          </table>
          <p>We'll notify you when your order ships.</p>
          <p>Thank you for shopping with ShirtCraft!</p>
        </div>
      `,
    }).catch(console.error);

    const populatedOrder = await order.populate('user', 'name email');
    res.status(201).json(populatedOrder);

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Failed to create order.' });
  }
};

// ── GET /api/orders/my ────────────────────────────────────────────
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Fetch my orders error:', err);
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
};

// ── GET /api/orders/:id ───────────────────────────────────────────
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    // Customers can only view their own orders
    if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised.' });
    }
    res.json(order);
  } catch (err) {
    console.error('Fetch order error:', err);
    res.status(500).json({ message: 'Failed to fetch order.' });
  }
};

// ── GET /api/orders (admin) ───────────────────────────────────────
exports.getAllOrders = async (req, res) => {
  try {
    const { status, search = '', page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};

    // Server-side search so an order can be found regardless of which page
    // it's on — the previous client-side-only filter only ever searched
    // whatever page was already loaded, which silently failed for anything
    // past page 1. Matches on order number or, via a lookup on the user's
    // name/email, the customer.
    if (search) {
      const User = require('../models/User');
      const matchingUserIds = await User.find({
        $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }],
      }).distinct('_id');
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { user: { $in: matchingUserIds } },
      ];
    }

    const total  = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Fetch all orders error:', err);
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
};

// ── PUT /api/orders/:id/status ────────────────────────────────────
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Notify customer on key status changes
    if (['shipped', 'delivered'].includes(status)) {
      const messages = {
        shipped:   `Great news! Your order ${order.orderNumber} has shipped. Tracking: ${order.trackingNumber || 'N/A'}`,
        delivered: `Your order ${order.orderNumber} has been delivered. Enjoy!`,
      };
      sendEmail({
        to:      order.user.email,
        subject: `ShirtCraft Order Update — ${order.orderNumber}`,
        html:    `<p>${messages[status]}</p>`,
      }).catch(console.error);
    }

    res.json(order);
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ message: 'Failed to update order status.' });
  }
};

// ── PUT /api/orders/:id/tracking ─────────────────────────────────
exports.addTracking = async (req, res) => {
  try {
    const { trackingNumber } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { trackingNumber, status: 'shipped' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (err) {
    console.error('Add tracking error:', err);
    res.status(500).json({ message: 'Failed to add tracking.' });
  }
};

// ── PUT /api/orders/:id/payment-status ────────────────────────────
// Lets an admin mark an order as paid once a manual bank transfer has been
// verified (or reverse it in case of a mistake / refund).
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    if (!['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status.' });
    }
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // A refund means the sale is being unwound — give the stock back, the
    // same way a cancellation would, so the items are sellable again.
    if (paymentStatus === 'refunded' && order.paymentStatus !== 'refunded') {
      await releaseOrderHolds(order);
    }
    const justPaid = paymentStatus === 'paid' && order.paymentStatus !== 'paid';

    order.paymentStatus = paymentStatus;
    await order.save();
    if (justPaid) sendPaymentConfirmedEmail(order);
    res.json(order);
  } catch (err) {
    console.error('Update payment status error:', err);
    res.status(500).json({ message: 'Failed to update payment status.' });
  }
};

// ── PATCH /api/orders/:id/cancel — customer self-service ──────────
// Only ever available while payment hasn't gone through yet. Once an order
// is paid, cancelling it means unwinding real money, so it's routed to
// support/admin (updatePaymentStatus → 'refunded') instead of a one-click
// self-cancel here.
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised.' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        message: 'This order has already been paid for. Please contact support to request a cancellation and refund.',
        requiresSupport: true,
      });
    }
    if (!order.isCancellable()) {
      return res.status(400).json({ message: 'This order can no longer be cancelled.' });
    }

    await releaseOrderHolds(order);
    order.status             = 'cancelled';
    order.cancelledAt        = new Date();
    order.cancelledBy        = 'customer';
    order.cancellationReason = 'Cancelled by customer before payment.';
    await order.save();

    sendEmail({
      to:      order.user.email,
      subject: `Order Cancelled — ${order.orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#FF4F1F">Order Cancelled</h2>
          <p>Hi ${order.user.name || 'there'},</p>
          <p>As requested, order <strong>${order.orderNumber}</strong> has been cancelled. No payment was taken, so there's nothing to refund.</p>
          <p>Changed your mind? You're welcome to place a new order any time.</p>
        </div>
      `,
    }).catch(console.error);

    res.json({ message: 'Order cancelled.', order });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ message: 'Failed to cancel order.' });
  }
};

// ── PATCH /api/orders/:id/admin-cancel ─────────────────────────────
// Admin-initiated cancellation for a still-unpaid order — most useful once
// ORDER_PAYMENT_TIMEOUT_HOURS has elapsed and another customer is waiting
// on the same stock, but not hard-restricted to that window: an admin who
// already knows a bank transfer isn't coming shouldn't have to wait out
// the clock. `overdue` is returned so the frontend can label which case it is.
exports.adminCancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Only orders with pending payment can be cancelled this way.' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled.' });
    }

    const hoursSinceCreated = (Date.now() - order.createdAt.getTime()) / 3600000;
    const overdue = hoursSinceCreated >= timeoutHours();

    await releaseOrderHolds(order);
    order.status             = 'cancelled';
    order.paymentStatus      = 'failed';
    order.cancelledAt        = new Date();
    order.cancelledBy        = 'admin';
    order.cancellationReason = req.body?.reason || (overdue
      ? `Payment not received within ${timeoutHours()} hours — cancelled by admin to release stock.`
      : 'Cancelled by admin.');
    await order.save();

    if (order.user?.email) {
      sendEmail({
        to:      order.user.email,
        subject: `Order ${order.orderNumber} was cancelled`,
        html:    `<p>Hi ${order.user.name},</p><p>Your order <strong>${order.orderNumber}</strong> has been cancelled${overdue ? ' because payment was not received in time' : ''}. The items have been released back into stock. Please contact us if you have any questions.</p>`,
      }).catch(console.error);
    }

    res.json({ message: 'Order cancelled.', order, overdue });
  } catch (err) {
    console.error('Admin cancel order error:', err);
    res.status(500).json({ message: 'Failed to cancel order.' });
  }
};
