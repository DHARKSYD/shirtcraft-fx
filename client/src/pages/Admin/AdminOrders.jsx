// src/pages/Admin/AdminOrders.jsx — full order management, live API
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, ChevronDown, ChevronUp, X,
  Truck, Package, CheckCircle, Clock, XCircle, Eye,
  MapPin, Phone, User, CreditCard, Tag, Hash,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/slices/uiSlice';
import api from '../../utils/api';
import './Admin.css';
import './AdminOrders.css';

const STATUSES = ['all','pending','processing','shipped','delivered','cancelled'];

const STATUS_META = {
  pending:    { icon:<Clock size={13}/>,        color:'#6B7280', bg:'rgba(107,114,128,0.1)',  label:'Pending'    },
  processing: { icon:<Package size={13}/>,      color:'#F59E0B', bg:'rgba(245,158,11,0.1)',   label:'Processing' },
  shipped:    { icon:<Truck size={13}/>,        color:'#3B82F6', bg:'rgba(59,130,246,0.1)',   label:'Shipped'    },
  delivered:  { icon:<CheckCircle size={13}/>,  color:'#10B981', bg:'rgba(16,185,129,0.1)',   label:'Delivered'  },
  cancelled:  { icon:<XCircle size={13}/>,      color:'#EF4444', bg:'rgba(239,68,68,0.1)',    label:'Cancelled'  },
};

// ── Order Detail Panel ───────────────────────────────────────────
function OrderDetail({ order, onClose, onUpdate }) {
  const dispatch     = useDispatch();
  const [tracking,   setTracking]   = useState(order.trackingNumber || '');
  const [newStatus,  setNewStatus]  = useState(order.status);
  const [saving,     setSaving]     = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const saveStatus = async () => {
    if (newStatus === order.status && tracking === (order.trackingNumber||'')) return;
    setSaving(true);
    try {
      const updates = [];
      if (newStatus !== order.status) {
        const { data } = await api.put(`/orders/${order._id}/status`, { status: newStatus });
        updates.push(data);
      }
      if (tracking !== (order.trackingNumber||'') && tracking.trim()) {
        const { data } = await api.put(`/orders/${order._id}/tracking`, { trackingNumber: tracking.trim() });
        updates.push(data);
      }
      const merged = updates.length ? { ...order, ...updates[updates.length-1] } : order;
      dispatch(showToast({ message: 'Order updated!', type:'success' }));
      onUpdate(merged);
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Update failed', type:'error' }));
    } finally { setSaving(false); }
  };

  const handlePaymentStatusChange = async (paymentStatus) => {
    if (paymentStatus === order.paymentStatus) return;
    setSavingPayment(true);
    try {
      const { data } = await api.put(`/orders/${order._id}/payment-status`, { paymentStatus });
      dispatch(showToast({ message: `Payment marked as ${paymentStatus}.`, type:'success' }));
      onUpdate({ ...order, ...data });
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Update failed', type:'error' }));
    } finally { setSavingPayment(false); }
  };

  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const hoursSinceOrder = (Date.now() - new Date(order.createdAt).getTime()) / 3600000;
  const isOverdue = hoursSinceOrder >= 48; // matches server default; server is the source of truth either way

  const handleAdminCancel = async () => {
    setCancelling(true);
    try {
      const { data } = await api.patch(`/orders/${order._id}/admin-cancel`);
      dispatch(showToast({ message: 'Order cancelled and stock released.', type:'success' }));
      onUpdate({ ...order, ...data.order });
      setConfirmingCancel(false);
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Cancel failed', type:'error' }));
    } finally { setCancelling(false); }
  };

  const meta = STATUS_META[order.status] || STATUS_META.pending;

  return (
    <motion.div className="od-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.aside className="od-panel"
        initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
        transition={{ type:'spring', damping:28, stiffness:280 }}>

        {/* Header */}
        <div className="od-header">
          <div>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--color-accent)', fontWeight:700 }}>{order.orderNumber}</p>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.125rem', color:'var(--text-primary)' }}>
              Order Details
            </h2>
          </div>
          <button className="od-close" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="od-body">
          {/* Status card */}
          <div className="od-card">
            <h4 className="od-card__title">Status & Tracking</h4>
            <div className="od-field">
              <label className="input-label">Order Status</label>
              <div style={{ display:'flex', gap:'var(--space-2)', flexWrap:'wrap', marginTop:6 }}>
                {['pending','processing','shipped','delivered','cancelled'].map(s => {
                  const m = STATUS_META[s];
                  return (
                    <button key={s}
                      className={`od-status-btn ${newStatus===s?'od-status-btn--active':''}`}
                      style={newStatus===s ? { borderColor:m.color, background:m.bg, color:m.color } : {}}
                      onClick={() => setNewStatus(s)}>
                      {m.icon} {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="od-field" style={{ marginTop:'var(--space-3)' }}>
              <label className="input-label">Tracking Number</label>
              <div style={{ display:'flex', gap:'var(--space-2)', marginTop:6 }}>
                <input className="input-field" placeholder="e.g. SC2025001NG"
                  value={tracking} onChange={e=>setTracking(e.target.value)}
                  style={{ flex:1 }}/>
              </div>
            </div>
            <button className="btn btn-accent" style={{ width:'100%', marginTop:'var(--space-4)' }}
              onClick={saveStatus} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          {/* Customer info */}
          <div className="od-card">
            <h4 className="od-card__title">Customer</h4>
            <div className="od-info-rows">
              <div className="od-info-row"><User size={13}/><span>{order.user?.name || 'Guest'}</span></div>
              <div className="od-info-row" style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{order.user?.email || '—'}</div>
            </div>
          </div>

          {/* Shipping address */}
          <div className="od-card">
            <h4 className="od-card__title">Shipping Address</h4>
            <div className="od-info-rows">
              <div className="od-info-row"><User size={13}/><span>{order.shipping?.name}</span></div>
              <div className="od-info-row"><Phone size={13}/><span>{order.shipping?.phone}</span></div>
              <div className="od-info-row"><MapPin size={13}/><span>{order.shipping?.street}, {order.shipping?.city}, {order.shipping?.state}</span></div>
            </div>
          </div>

          {/* Order items */}
          <div className="od-card">
            <h4 className="od-card__title">Items Ordered ({order.items?.length || 0})</h4>
            <div className="od-items">
              {order.items?.map((item,i) => (
                <div key={i} className="od-item">
                  <img src={item.image || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&q=60'}
                    alt={item.name} className="od-item__img"
                    onError={e => e.target.style.display='none'}/>
                  <div className="od-item__info">
                    <p className="od-item__name">{item.name}</p>
                    <p className="od-item__meta">
                      {item.size && `Size: ${item.size}`}
                      {item.color && ` · Colour: ${item.color}`}
                      {item.customDesign && ' · ✦ Custom Design'}
                    </p>
                    <p className="od-item__qty">Qty: {item.quantity} × ₦{(item.price||0).toLocaleString()}</p>
                  </div>
                  <p className="od-item__subtotal">₦{((item.price||0)*(item.quantity||1)).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment summary */}
          <div className="od-card">
            <h4 className="od-card__title">Payment Summary</h4>
            <div className="od-info-rows">
              <div className="od-info-row"><CreditCard size={13}/>
                <span style={{ textTransform:'capitalize' }}>{order.paymentMethod}</span>
                <span className={`admin-status ${order.paymentStatus==='paid'?'admin-status--delivered':order.paymentStatus==='pending'?'admin-status--processing':'admin-status--pending'}`}
                  style={{ marginLeft:'auto', padding:'2px 10px' }}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.paymentStatus === 'pending' && (
                <button className="btn btn-outline btn-sm" style={{ width:'100%', marginTop:'var(--space-2)' }}
                  onClick={() => handlePaymentStatusChange('paid')} disabled={savingPayment}>
                  {savingPayment ? 'Saving…' : 'Mark as Paid'}
                </button>
              )}
              {order.paymentStatus === 'pending' && order.status !== 'cancelled' && (
                <div style={{ marginTop:'var(--space-3)', paddingTop:'var(--space-3)', borderTop:'1px dashed var(--border-color)' }}>
                  <p style={{ fontSize:'0.75rem', color: isOverdue ? '#F59E0B' : 'var(--text-muted)', display:'flex', alignItems:'center', gap:6, marginBottom:'var(--space-2)' }}>
                    <Clock size={12}/> {isOverdue
                      ? `Unpaid for ${Math.floor(hoursSinceOrder)}h — eligible for release`
                      : `Unpaid for ${Math.floor(hoursSinceOrder)}h (releases automatically at 48h)`}
                  </p>
                  {confirmingCancel ? (
                    <div style={{ display:'flex', gap:'var(--space-2)' }}>
                      <button className="btn btn-sm" style={{ flex:1, background:'var(--color-error)', color:'#fff' }}
                        onClick={handleAdminCancel} disabled={cancelling}>
                        {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingCancel(false)}>Back</button>
                    </div>
                  ) : (
                    <button className="btn btn-sm" style={{ width:'100%', background: isOverdue ? 'var(--color-error)' : 'transparent', color: isOverdue ? '#fff' : 'var(--color-error)', border: isOverdue ? 'none' : '1px solid var(--color-error)' }}
                      onClick={() => setConfirmingCancel(true)}>
                      {isOverdue ? 'Cancel Order — Payment Overdue' : 'Cancel Unpaid Order'}
                    </button>
                  )}
                </div>
              )}
              {order.paymentStatus === 'paid' && (
                <button className="btn btn-ghost btn-sm" style={{ width:'100%', marginTop:'var(--space-2)' }}
                  onClick={() => handlePaymentStatusChange('pending')} disabled={savingPayment}>
                  {savingPayment ? 'Saving…' : 'Revert to Pending'}
                </button>
              )}
              {order.coupon && (
                <div className="od-info-row"><Tag size={13}/><span>Coupon: {order.coupon}</span></div>
              )}
            </div>
            <div className="od-summary">
              <div className="od-summary__row"><span>Subtotal</span><span>₦{(order.subtotal||0).toLocaleString()}</span></div>
              {order.discount > 0 && (
                <div className="od-summary__row" style={{ color:'var(--color-success)' }}>
                  <span>Discount</span><span>–₦{order.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="od-summary__row">
                <span>Shipping</span>
                <span>{order.shippingCost===0 ? <span style={{ color:'var(--color-success)' }}>Free</span> : `₦${(order.shippingCost||0).toLocaleString()}`}</span>
              </div>
              <div className="od-summary__row od-summary__row--total">
                <span>Total Paid</span>
                <span>₦{(order.total||0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="od-card">
            <h4 className="od-card__title">Timeline</h4>
            <div className="od-timeline">
              <div className="od-timeline__item od-timeline__item--done">
                <div className="od-timeline__dot"/>
                <div>
                  <p className="od-timeline__label">Order Placed</p>
                  <p className="od-timeline__time">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {['processing','shipped','delivered'].map(s => {
                const done = ['processing','shipped','delivered'].indexOf(order.status) >= ['processing','shipped','delivered'].indexOf(s);
                return (
                  <div key={s} className={`od-timeline__item ${done?'od-timeline__item--done':''}`}>
                    <div className="od-timeline__dot"/>
                    <div>
                      <p className="od-timeline__label">{STATUS_META[s]?.label}</p>
                      {s==='shipped' && order.trackingNumber && (
                        <p className="od-timeline__time" style={{ fontFamily:'var(--font-mono)', color:'var(--color-accent)' }}>
                          {order.trackingNumber}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AdminOrders() {
  const dispatch = useDispatch();
  const [orders,     setOrders]     = useState([]);
  const [total,      setTotal]      = useState(0);
  const [isLoading,  setIsLoading]  = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search,     setSearch]     = useState(''); // debounced value that actually triggers a fetch
  const [statusFilter, setStatusFilter] = useState('all');
  const [page,       setPage]       = useState(1);
  const [detail,     setDetail]     = useState(null);

  // Debounce the search box so every keystroke doesn't fire a request —
  // and reset back to page 1, since a new search may not have a page 2.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/orders', {
        params: {
          status: statusFilter === 'all' ? '' : statusFilter,
          search,
          page,
          limit: 15,
        },
      });
      const list = data.orders || data;
      setOrders(Array.isArray(list) ? list : []);
      setTotal(data.total || list.length || 0);
    } catch (err) {
      dispatch(showToast({ message: 'Failed to fetch orders', type:'error' }));
    } finally { setIsLoading(false); }
  };

  // Searches the FULL order set server-side — this used to only filter
  // whatever page was already loaded client-side, so an order sitting on
  // page 3 was simply invisible to search unless you'd already paged to it.
  useEffect(() => { fetchOrders(); }, [statusFilter, page, search]);

  const displayed = orders;

  const handleUpdate = (updated) => {
    setOrders(os => os.map(o => o._id === updated._id ? updated : o));
    setDetail(updated);
  };

  // Quick inline status change
  const quickStatus = async (orderId, newStatus) => {
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(os => os.map(o => o._id === orderId ? { ...o, status: data.status } : o));
      dispatch(showToast({ message: `Order marked as ${newStatus}`, type:'success' }));
    } catch {
      dispatch(showToast({ message: 'Status update failed', type:'error' }));
    }
  };

  const pages = Math.ceil(total / 15);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--space-3)' }}>
          <div>
            <h1 className="admin-page__title">Orders</h1>
            <p className="admin-page__subtitle">{total} total orders</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchOrders}>
            <RefreshCw size={13}/> Refresh
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="ao-status-tabs">
        {STATUSES.map(s => (
          <button key={s}
            className={`ao-status-tab ${statusFilter===s?'ao-status-tab--active':''}`}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            style={statusFilter===s && s!=='all' ? { borderColor: STATUS_META[s]?.color, color: STATUS_META[s]?.color } : {}}>
            {s==='all' ? 'All Orders' : STATUS_META[s]?.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:400 }}>
        <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
        <input className="input-field" style={{ paddingLeft:'2.5rem', borderRadius:'var(--radius-full)' }}
          placeholder="Search by order # or customer name…"
          value={searchInput} onChange={e => setSearchInput(e.target.value)}/>
      </div>

      {/* Table */}
      <div className="admin-chart-card">
        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding:'var(--space-10)', textAlign:'center' }}>
              <RefreshCw size={20} style={{ animation:'spin 1s linear infinite', color:'var(--text-muted)', margin:'0 auto' }}/>
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding:'var(--space-12)', textAlign:'center', color:'var(--text-muted)' }}>
              <Package size={40} style={{ margin:'0 auto var(--space-3)', opacity:0.3 }}/>
              <p style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>No orders found.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Tracking</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(order => {
                  const meta = STATUS_META[order.status] || STATUS_META.pending;
                  return (
                    <tr key={order._id}>
                      <td className="admin-table__id">{order.orderNumber}</td>
                      <td style={{ fontSize:'0.8125rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}
                      </td>
                      <td>
                        <div>
                          <p style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.8125rem', color:'var(--text-primary)' }}>
                            {order.user?.name || 'Guest'}
                          </p>
                          <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{order.user?.email || '—'}</p>
                        </div>
                      </td>
                      <td style={{ fontSize:'0.8125rem', color:'var(--text-secondary)' }}>
                        {order.items?.reduce((s,i)=>s+i.quantity,0)||0} pcs
                      </td>
                      <td>
                        {order.trackingNumber
                          ? <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--color-accent)', fontWeight:700 }}>{order.trackingNumber}</span>
                          : <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>—</span>}
                      </td>
                      <td>
                        {/* Inline status dropdown */}
                        <div className="ao-status-select-wrap">
                          <span className={`admin-status admin-status--${order.status}`}
                            style={{ display:'flex', alignItems:'center', gap:5, cursor:'default' }}>
                            {meta.icon} {meta.label}
                          </span>
                          <select className="ao-status-select"
                            value={order.status}
                            onChange={e => quickStatus(order._id, e.target.value)}>
                            {['pending','processing','shipped','delivered','cancelled'].map(s=>(
                              <option key={s} value={s}>{STATUS_META[s]?.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="admin-table__total">₦{(order.total||0).toLocaleString()}</td>
                      <td>
                        <button className="btn btn-outline btn-sm" style={{ whiteSpace:'nowrap', gap:5 }}
                          onClick={() => setDetail(order)}>
                          <Eye size={13}/> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:'var(--space-2)', padding:'var(--space-4)', borderTop:'1px solid var(--border-color)' }}>
            <button className="btn btn-outline btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', alignSelf:'center', color:'var(--text-muted)' }}>
              {page} / {pages}
            </span>
            <button className="btn btn-outline btn-sm" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {detail && (
          <OrderDetail
            order={detail}
            onClose={() => setDetail(null)}
            onUpdate={handleUpdate}
          />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
