// server/utils/orderMaintenance.js
//
// Background housekeeping for orders that were created (and had stock
// reserved for them) but never got paid — e.g. a bank-transfer order the
// customer never actually sent money for, or a Paystack session they
// abandoned. Left alone forever, these orders would hold stock hostage
// indefinitely, which is exactly the "someone else wants that product"
// problem raised after the last review.
//
// Two things call into this file:
//   - server/index.js, once on boot and then every hour via node-cron
//   - orderController.cancelOrder (admin path), which enforces the same
//     timeout for a manual admin cancellation rather than duplicating the
//     threshold logic
const Order   = require('../models/Order');
const Product = require('../models/Product');
const Coupon  = require('../models/Coupon');
const { sendEmail } = require('./email');

// Hours an order can sit with paymentStatus 'pending' before it's fair
// game to cancel. Overridable per-deployment via env; defaults to the 48h
// window from the "cancel unpaid orders" requirement.
const timeoutHours = () => Number(process.env.ORDER_PAYMENT_TIMEOUT_HOURS) || 48;

/**
 * Releases everything an unpaid order was holding: puts each line item's
 * quantity back onto the product/variant it came from, and rolls back a
 * coupon's usage count if one was applied. Shared by the customer
 * self-cancel path, the admin cancel path, and the automatic sweep below
 * so the three can never drift out of sync with each other.
 */
async function releaseOrderHolds(order) {
  if (!order.stockReserved) return; // already released — never double-credit stock

  await Promise.all(order.items.map(async (item) => {
    if (!item.product) return; // custom-design line items don't touch inventory
    const product = await Product.findById(item.product);
    if (!product) return;

    if (product.variants && product.variants.length > 0) {
      const variant = product.findVariant(item.size, item.color);
      if (variant) {
        variant.stock += item.quantity;
        product.recomputeStockTotal();
        await product.save();
        return;
      }
    }
    // No matching variant (legacy product, or variant was deleted since
    // the order was placed) — fall back to the flat counter so stock is
    // still recovered rather than silently lost.
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }));

  if (order.coupon) {
    await Coupon.updateOne(
      { code: order.coupon, usageCount: { $gt: 0 } },
      { $inc: { usageCount: -1 } }
    );
  }

  order.stockReserved = false;
}

/**
 * Finds every pending-payment order older than the timeout and cancels it,
 * releasing stock/coupon holds and notifying the customer. Safe to call
 * repeatedly — orders already cancelled or paid are excluded by the query,
 * so a resumed cron after downtime just processes whatever piled up.
 */
async function autoCancelUnpaidOrders() {
  const cutoff = new Date(Date.now() - timeoutHours() * 60 * 60 * 1000);

  const overdue = await Order.find({
    paymentStatus: 'pending',
    status:        { $ne: 'cancelled' },
    createdAt:     { $lte: cutoff },
  }).populate('user', 'name email');

  if (overdue.length === 0) return { cancelled: 0 };

  for (const order of overdue) {
    await releaseOrderHolds(order);
    order.status             = 'cancelled';
    order.paymentStatus      = 'failed';
    order.cancelledAt        = new Date();
    order.cancelledBy        = 'system';
    order.cancellationReason = `Payment not received within ${timeoutHours()} hours.`;
    await order.save();

    if (order.user?.email) {
      sendEmail({
        to:      order.user.email,
        subject: `Order ${order.orderNumber} was cancelled — payment not received`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#FF4F1F">Order Cancelled</h2>
            <p>Hi ${order.user.name || 'there'},</p>
            <p>Your order <strong>${order.orderNumber}</strong> was automatically cancelled because we didn't receive payment within ${timeoutHours()} hours of it being placed. The items have been released back into stock.</p>
            <p>If you'd still like these items, you're welcome to place a new order — and if you did pay and are seeing this in error, please reply to this email or contact support right away so we can sort it out.</p>
          </div>
        `,
      }).catch(err => console.error('Auto-cancel email failed:', err.message));
    }
  }

  console.log(`🕐 Auto-cancel sweep: cancelled ${overdue.length} unpaid order(s) older than ${timeoutHours()}h.`);
  return { cancelled: overdue.length };
}

module.exports = { autoCancelUnpaidOrders, releaseOrderHolds, timeoutHours };
