// src/pages/Dashboard/Orders.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, Clock, XCircle, ChevronDown, Loader2, Ban, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyOrders, cancelOrder } from '../../store/slices/orderSlice';
import { addToCart } from '../../store/slices/cartSlice';
import { showToast } from '../../store/slices/uiSlice';
import api from '../../utils/api';

const STATUS_META = {
  pending:    { icon: <Clock       size={14} />, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  processing: { icon: <Clock       size={14} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  shipped:    { icon: <Truck       size={14} />, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
  delivered:  { icon: <CheckCircle size={14} />, color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  cancelled:  { icon: <XCircle     size={14} />, color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
};

export default function Orders() {
  const dispatch = useDispatch();
  const navigate  = useNavigate();
  const { list: orders, isLoading, error } = useSelector(s => s.orders);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => { dispatch(fetchMyOrders()); }, [dispatch]);

  const handleCancel = async (order) => {
    setCancellingId(order._id);
    const result = await dispatch(cancelOrder(order._id));
    setCancellingId(null);
    setConfirmCancelId(null);
    if (cancelOrder.fulfilled.match(result)) {
      dispatch(showToast({ message: 'Order cancelled — any reserved stock has been released.', type: 'success' }));
    } else {
      dispatch(showToast({ message: result.payload?.message || 'Failed to cancel order.', type: 'error' }));
    }
  };

  const handleReorder = (order) => {
    let added = 0, skipped = 0;
    order.items.forEach(item => {
      if (item.customDesign) {
        dispatch(addToCart({
          id: `custom-design-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: item.name, price: item.price, image: item.image,
          size: item.size, color: item.color, quantity: item.quantity, customDesign: true,
        }));
        added++;
      } else if (item.product) {
        dispatch(addToCart({
          id: item.product, name: item.name, price: item.price, image: item.image,
          size: item.size, color: item.color, quantity: item.quantity,
        }));
        added++;
      } else {
        skipped++;
      }
    });
    if (added === 0) {
      dispatch(showToast({ message: 'Those items are no longer available.', type: 'error' }));
      return;
    }
    dispatch(showToast({
      message: skipped ? `Added ${added} item(s) to your cart — ${skipped} are no longer available.` : 'Items added to your cart!',
      type: skipped ? 'info' : 'success',
    }));
    navigate('/cart');
  };

  const handlePayNow = async (order) => {
    try {
      const { data } = await api.post('/orders/payment-intent', {
        amount: Math.round(order.total * 100), orderId: order._id, orderNumber: order.orderNumber,
      });
      if (data.authorizationUrl) window.open(data.authorizationUrl, '_blank', 'noopener,noreferrer');
    } catch {
      dispatch(showToast({ message: 'Unable to start payment right now. Please try again shortly.', type: 'error' }));
    }
  };

  return (
    <div className="dash-section">
      <h2 className="dash-section__title">My Orders</h2>

      {isLoading ? (
        <div className="dash-empty">
          <Loader2 size={32} color="var(--color-border)" className="spin" style={{ animation: 'spin 0.8s linear infinite' }} />
          <p>Loading your orders…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : error ? (
        <div className="dash-empty">
          <Package size={48} color="var(--color-border)" />
          <p>{error}</p>
          <button className="btn btn-accent" onClick={() => dispatch(fetchMyOrders())}>Try Again</button>
        </div>
      ) : orders.length === 0 ? (
        <div className="dash-empty">
          <Package size={48} color="var(--color-border)" />
          <p>You haven't placed any orders yet.</p>
          <Link to="/catalog" className="btn btn-accent">Start Shopping</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order, i) => {
            const meta = STATUS_META[order.status] || STATUS_META.pending;
            const isExpanded = expandedId === order._id;
            const canTrack = !['delivered', 'cancelled'].includes(order.status);
            return (
              <motion.div
                key={order._id}
                className="order-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                {/* Header */}
                <div className="order-card__header">
                  <div>
                    <p className="order-card__id">{order.orderNumber}</p>
                    <p className="order-card__date">{new Date(order.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="order-card__status" style={{ color: meta.color, background: meta.bg }}>
                    {meta.icon}
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </div>
                </div>

                {/* Items */}
                <div className="order-card__items">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="order-card__item">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="order-card__item-img" />
                      )}
                      <div className="order-card__item-info">
                        <p className="order-card__item-name">{item.name}</p>
                        <p className="order-card__item-meta">
                          Qty: {item.quantity}{item.size ? ` · Size: ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''}
                        </p>
                      </div>
                      <p className="order-card__item-price">₦{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="order-card__footer">
                  <div>
                    {order.trackingNumber && (
                      <p className="order-card__tracking">
                        Tracking: <span>{order.trackingNumber}</span>
                      </p>
                    )}
                  </div>
                  <div className="order-card__total">
                    <span>Total:</span>
                    <span className="order-card__total-val">₦{order.total.toLocaleString()}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: 'var(--space-4)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-muted)' }}>Subtotal</span><span>₦{order.subtotal.toLocaleString()}</span></div>
                    {order.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}><span>Discount{order.coupon ? ` (${order.coupon})` : ''}</span><span>–₦{order.discount.toLocaleString()}</span></div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-muted)' }}>Shipping</span><span>{order.shippingCost === 0 ? 'Free' : `₦${order.shippingCost.toLocaleString()}`}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)' }}><span>Total</span><span>₦{order.total.toLocaleString()}</span></div>
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-1)', color: 'var(--color-muted)' }}>
                      <p><strong style={{ color: 'var(--text-primary)' }}>Ship to:</strong> {order.shipping?.name} · {order.shipping?.phone}</p>
                      <p>{order.shipping?.street}, {order.shipping?.city}, {order.shipping?.state}</p>
                      <p style={{ marginTop: 4 }}><strong style={{ color: 'var(--text-primary)' }}>Payment:</strong> {order.paymentMethod === 'paystack' ? 'Paystack' : order.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : order.paymentMethod} · {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}</p>
                    </div>
                  </div>
                )}

                <div className="order-card__actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setExpandedId(isExpanded ? null : order._id)}>
                    {isExpanded ? 'Hide Details' : 'View Details'} <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                  {canTrack && (
                    <Link to={`/track/${order._id}`} className="btn btn-ghost btn-sm">
                      <Truck size={14} /> Track Order
                    </Link>
                  )}
                  {order.paymentMethod === 'paystack' && order.paymentStatus === 'pending' && (
                    <button className="btn btn-accent btn-sm" onClick={() => handlePayNow(order)}>Complete Payment</button>
                  )}
                  {order.status === 'delivered' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleReorder(order)}>Re-order</button>
                  )}

                  {/* Unpaid orders can be self-cancelled — nothing to refund, so no
                      admin step needed. Paid orders route to support instead, since
                      cancelling those means unwinding real money. */}
                  {order.paymentStatus === 'pending' && order.status !== 'cancelled' && (
                    confirmCancelId === order._id ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>Cancel this order?</span>
                        <button className="btn btn-sm" style={{ background: 'var(--color-error)', color: '#fff' }}
                          disabled={cancellingId === order._id} onClick={() => handleCancel(order)}>
                          {cancellingId === order._id ? 'Cancelling…' : 'Yes, cancel'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmCancelId(null)}>Keep order</button>
                      </span>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}
                        onClick={() => setConfirmCancelId(order._id)}>
                        <Ban size={14} /> Cancel Order
                      </button>
                    )
                  )}
                  {order.paymentStatus === 'paid' && !['delivered', 'cancelled'].includes(order.status) && (
                    <a href={`mailto:hello@shirtcraft.ng?subject=${encodeURIComponent(`Cancellation request — ${order.orderNumber}`)}`}
                      className="btn btn-ghost btn-sm" style={{ color: 'var(--color-muted)' }}>
                      <Mail size={14} /> Contact Support to Cancel
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
