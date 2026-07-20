// src/pages/Admin/AdminDrivers.jsx
import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Search, RefreshCw, CheckCircle, XCircle, Clock,
  Shield, Trash2, X, MapPin, Phone, User, Navigation,
  Package, Star, AlertCircle, UserPlus, ChevronDown,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/slices/uiSlice';
import { useSocket } from '../../hooks/useSocket';
import api from '../../utils/api';
import './Admin.css';
import './AdminDrivers.css';

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeDriverMapIcon = (online, vehicleType) => {
  const emoji = { motorcycle:'🏍', car:'🚗', van:'🚐', truck:'🚚' }[vehicleType] || '🚗';
  const color = online ? '#10B981' : '#6B7280';
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:38px;height:38px;background:${color};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.35);font-size:16px">${emoji}</div>
    </div>`,
    iconSize:   [38, 38],
    iconAnchor: [19, 19],
    className:  '',
  });
};

const STATUS_META = {
  pending:   { color:'#F59E0B', bg:'rgba(245,158,11,0.1)',   label:'Pending'   },
  approved:  { color:'#3B82F6', bg:'rgba(59,130,246,0.1)',   label:'Approved'  },
  active:    { color:'#10B981', bg:'rgba(16,185,129,0.1)',   label:'Active'    },
  inactive:  { color:'#6B7280', bg:'rgba(107,114,128,0.1)', label:'Inactive'  },
  suspended: { color:'#EF4444', bg:'rgba(239,68,68,0.1)',    label:'Suspended' },
};

const DRIVER_STATUSES = ['pending','approved','active','inactive','suspended'];
const LAGOS_CENTER    = [6.5244, 3.3792];

// ── Assign Order Modal ────────────────────────────────────────────
function AssignModal({ driver, onClose, onAssigned }) {
  const dispatch = useDispatch();
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selOrder,  setSelOrder]  = useState('');

  useEffect(() => {
    api.get('/orders', { params: { status:'processing', limit:20 } })
      .then(({ data }) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const assign = async () => {
    if (!selOrder) return;
    setAssigning(true);
    try {
      await api.post(`/drivers/${driver._id}/assign/${selOrder}`);
      dispatch(showToast({ message:`Order assigned to ${driver.name}`, type:'success' }));
      onAssigned();
      onClose();
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Assignment failed', type:'error' }));
    } finally { setAssigning(false); }
  };

  return (
    <div className="ad-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ad-modal">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--space-5)' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-primary)' }}>
            Assign Order — {driver.name}
          </h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}>
            <X size={18}/>
          </button>
        </div>
        {loading ? (
          <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'var(--space-6) 0' }}>Loading orders…</p>
        ) : orders.length === 0 ? (
          <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'var(--space-6) 0' }}>
            No unassigned processing orders found.
          </p>
        ) : (
          <>
            <div style={{ marginBottom:'var(--space-4)' }}>
              <label className="input-label">Select Order to Assign</label>
              <select className="input-field" value={selOrder} onChange={e => setSelOrder(e.target.value)} style={{ marginTop:'var(--space-2)' }}>
                <option value="">— Choose an order —</option>
                {orders.map(o => (
                  <option key={o._id} value={o._id}>
                    {o.orderNumber} · {o.shipping?.city} · ₦{(o.total||0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display:'flex', gap:'var(--space-3)' }}>
              <button className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button className="btn btn-accent" style={{ flex:1 }} onClick={assign}
                disabled={!selOrder || assigning}>
                {assigning ? 'Assigning…' : 'Assign Order'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Driver Detail Panel ───────────────────────────────────────────
function DriverPanel({ driver, onClose, onUpdate }) {
  const dispatch = useDispatch();
  const [status,   setStatus]   = useState(driver.status);
  const [notes,    setNotes]    = useState(driver.adminNotes || '');
  const [saving,   setSaving]   = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/drivers/${driver._id}`, { status, adminNotes: notes });
      dispatch(showToast({ message:'Driver updated!', type:'success' }));
      onUpdate(data);
    } catch {
      dispatch(showToast({ message:'Update failed', type:'error' }));
    } finally { setSaving(false); }
  };

  const unassign = async () => {
    try {
      await api.delete(`/drivers/${driver._id}/assign`);
      dispatch(showToast({ message:'Driver unassigned', type:'success' }));
      onUpdate({ ...driver, activeOrder: null });
    } catch {
      dispatch(showToast({ message:'Unassign failed', type:'error' }));
    }
  };

  const [reviewing, setReviewing] = useState(false);
  const reviewUpdate = async (approve) => {
    setReviewing(true);
    try {
      const { data } = await api.put(`/drivers/${driver._id}/review-update`, { approve });
      dispatch(showToast({ message: approve ? 'Update approved' : 'Update rejected', type:'success' }));
      onUpdate(data.driver);
    } catch {
      dispatch(showToast({ message:'Review failed', type:'error' }));
    } finally { setReviewing(false); }
  };

  const deleteDriver = async () => {
    if (!window.confirm(`Delete driver ${driver.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/drivers/${driver._id}`);
      dispatch(showToast({ message:'Driver deleted', type:'success' }));
      onClose();
    } catch {
      dispatch(showToast({ message:'Delete failed', type:'error' }));
    }
  };

  const m = STATUS_META[status] || STATUS_META.inactive;

  return (
    <motion.div className="ad-panel-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.aside className="ad-panel"
        initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
        transition={{ type:'spring', damping:28, stiffness:280 }}>

        <div className="ad-panel__header">
          <div>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--color-accent)', fontWeight:700 }}>
              {driver.vehicleType?.toUpperCase()} · {driver.vehiclePlate}
            </p>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.25rem', color:'var(--text-primary)', marginTop:2 }}>
              {driver.name}
            </h2>
          </div>
          <button className="ad-panel__close" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="ad-panel__body">
          {/* Online status */}
          <div className="ad-info-card">
            <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
              <div style={{ width:12, height:12, borderRadius:'50%', background: driver.isOnline?'#10B981':'#6B7280', flexShrink:0 }}/>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9375rem', color:'var(--text-primary)' }}>
                {driver.isOnline ? 'Currently Online' : 'Offline'}
              </span>
            </div>
            {driver.currentLocation?.lastUpdated && (
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>
                Last seen: {new Date(driver.currentLocation.lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Pending profile-update request — only when the driver has
              submitted a change awaiting review */}
          {driver.pendingUpdate && (
            <div className="ad-info-card" style={{ borderColor:'var(--color-accent)', background:'rgba(255,79,31,0.06)' }}>
              <h4 className="ad-info-card__title" style={{ color:'var(--color-accent)' }}>
                Pending Profile Update
              </h4>
              <div className="ad-info-rows">
                {Object.entries(driver.pendingUpdate).map(([field, newVal]) => (
                  <div key={field} className="ad-info-row" style={{ justifyContent:'space-between', alignItems:'flex-start' }}>
                    <span style={{ color:'var(--text-muted)', textTransform:'capitalize' }}>{field.replace(/([A-Z])/g,' $1')}</span>
                    <span style={{ textAlign:'right' }}>
                      <span style={{ color:'var(--text-muted)', textDecoration:'line-through', fontSize:'0.75rem' }}>{driver[field] || '—'}</span>
                      {' → '}
                      <strong style={{ color:'var(--text-primary)' }}>{newVal}</strong>
                    </span>
                  </div>
                ))}
              </div>
              {driver.pendingUpdateSubmittedAt && (
                <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:6 }}>
                  Submitted {new Date(driver.pendingUpdateSubmittedAt).toLocaleDateString()}
                </p>
              )}
              <div style={{ display:'flex', gap:'var(--space-2)', marginTop:'var(--space-3)' }}>
                <button className="ad-btn ad-btn--primary" disabled={reviewing} onClick={() => reviewUpdate(true)} style={{ flex:1 }}>
                  Approve
                </button>
                <button className="ad-btn ad-btn--ghost" disabled={reviewing} onClick={() => reviewUpdate(false)} style={{ flex:1 }}>
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Contact info */}
          <div className="ad-info-card">
            <h4 className="ad-info-card__title">Contact</h4>
            <div className="ad-info-rows">
              <div className="ad-info-row"><User size={13}/><span>{driver.name}</span></div>
              <div className="ad-info-row"><Phone size={13}/><a href={`tel:${driver.phone}`} style={{ color:'var(--color-accent)' }}>{driver.phone}</a></div>
              <div className="ad-info-row"><span style={{ fontSize:12 }}>@</span><span>{driver.email}</span></div>
              <div className="ad-info-row"><MapPin size={13}/><span>{driver.serviceArea}</span></div>
            </div>
          </div>

          {/* Vehicle */}
          <div className="ad-info-card">
            <h4 className="ad-info-card__title">Vehicle</h4>
            <div className="ad-info-rows">
              {[
                ['Type',       driver.vehicleType],
                ['Make/Model', `${driver.vehicleMake||''} ${driver.vehicleModel||''}`.trim() || '—'],
                ['Plate',      driver.vehiclePlate],
                ['Colour',     driver.vehicleColor || '—'],
                ['License',    driver.licenseNumber],
              ].map(([k,v]) => (
                <div key={k} className="ad-info-row" style={{ justifyContent:'space-between' }}>
                  <span style={{ color:'var(--text-muted)' }}>{k}</span>
                  <strong style={{ fontFamily: k==='Plate'||k==='License'?'var(--font-mono)':undefined, textTransform:'capitalize', color:'var(--text-primary)' }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Documents & guarantor — the confidential verification info
              collected at registration. Older/seeded drivers may predate
              this and simply have nothing here yet. */}
          {(driver.documents && Object.values(driver.documents).some(Boolean)) || driver.guarantor?.name ? (
            <div className="ad-info-card">
              <h4 className="ad-info-card__title" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span>Verification Documents</span>
                {(() => {
                  const d = driver.documents || {};
                  const complete = d.licenseImage && d.vehicleRegistrationImage && d.insuranceImage && d.governmentIdImage && d.governmentIdType && driver.guarantor?.name && driver.guarantor?.phone;
                  return (
                    <span style={{ fontSize:'0.7rem', fontWeight:700, display:'flex', alignItems:'center', gap:4, color: complete?'#10B981':'#F59E0B' }}>
                      {complete ? <><CheckCircle size={12}/> Complete</> : <><AlertCircle size={12}/> Incomplete</>}
                    </span>
                  );
                })()}
              </h4>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(84px, 1fr))', gap:'var(--space-2)', marginBottom:'var(--space-3)' }}>
                {[
                  ['License', driver.documents?.licenseImage],
                  ['Vehicle Reg.', driver.documents?.vehicleRegistrationImage],
                  ['Insurance', driver.documents?.insuranceImage],
                  [driver.documents?.governmentIdType ? driver.documents.governmentIdType.replace('_',' ').toUpperCase() : 'Gov ID', driver.documents?.governmentIdImage],
                  ['Photo', driver.photo],
                ].filter(([,url]) => url).map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{ display:'flex', flexDirection:'column', gap:4, textDecoration:'none' }}>
                    <img src={url} alt={label} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', borderRadius:'var(--radius-md)', border:'1px solid var(--border-color)' }}/>
                    <span style={{ fontSize:'0.625rem', color:'var(--text-muted)', textAlign:'center', textTransform:'capitalize' }}>{label}</span>
                  </a>
                ))}
              </div>
              {driver.documents?.governmentIdNumber && (
                <div className="ad-info-row" style={{ justifyContent:'space-between' }}>
                  <span style={{ color:'var(--text-muted)' }}>ID Number</span>
                  <strong style={{ fontFamily:'var(--font-mono)', color:'var(--text-primary)' }}>{driver.documents.governmentIdNumber}</strong>
                </div>
              )}
              {driver.guarantor?.name && (
                <>
                  <p style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--text-muted)', marginTop:'var(--space-3)', marginBottom:6 }}>Guarantor</p>
                  <div className="ad-info-rows">
                    <div className="ad-info-row"><User size={13}/><span>{driver.guarantor.name}{driver.guarantor.relationship?` (${driver.guarantor.relationship})`:''}</span></div>
                    <div className="ad-info-row"><Phone size={13}/><a href={`tel:${driver.guarantor.phone}`} style={{ color:'var(--color-accent)' }}>{driver.guarantor.phone}</a></div>
                    {driver.guarantor.address && <div className="ad-info-row"><MapPin size={13}/><span>{driver.guarantor.address}</span></div>}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="ad-info-card" style={{ borderColor:'#F59E0B', background:'rgba(245,158,11,0.06)' }}>
              <p style={{ fontSize:'0.8125rem', color:'#F59E0B', display:'flex', alignItems:'center', gap:6 }}>
                <AlertCircle size={14}/> No verification documents on file for this driver.
              </p>
            </div>
          )}

          {/* Performance */}
          <div className="ad-info-card">
            <h4 className="ad-info-card__title">Performance</h4>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'var(--space-3)' }}>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.5rem', color:'var(--text-primary)' }}>{driver.totalDeliveries||0}</p>
                <p style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Deliveries</p>
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.5rem', color:'#F59E0B', display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>
                  <Star size={14} fill="#F59E0B" color="#F59E0B"/>{(driver.rating||5).toFixed(1)}
                </p>
                <p style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Rating</p>
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.5rem', color: driver.activeOrder?'#FF4F1F':'var(--text-muted)' }}>
                  {driver.activeOrder ? '1' : '0'}
                </p>
                <p style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Active</p>
              </div>
            </div>
          </div>

          {/* Active order */}
          {driver.activeOrder && (
            <div className="ad-info-card" style={{ borderColor:'var(--color-accent)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--space-3)' }}>
                <h4 className="ad-info-card__title" style={{ margin:0 }}>Active Delivery</h4>
                <button onClick={unassign}
                  style={{ fontSize:'0.75rem', color:'var(--color-error)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:600 }}>
                  Unassign
                </button>
              </div>
              <p style={{ fontFamily:'var(--font-mono)', fontSize:'0.875rem', color:'var(--color-accent)', fontWeight:700 }}>
                {driver.activeOrder?.orderNumber || 'Order assigned'}
              </p>
            </div>
          )}

          {/* Status update */}
          <div className="ad-info-card">
            <h4 className="ad-info-card__title">Update Status</h4>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-2)', marginBottom:'var(--space-3)' }}>
              {DRIVER_STATUSES.map(s => {
                const sm = STATUS_META[s];
                return (
                  <button key={s}
                    onClick={() => setStatus(s)}
                    style={{
                      padding:'5px 14px', borderRadius:'var(--radius-full)',
                      border: `1.5px solid ${status===s ? sm.color : 'var(--border-color)'}`,
                      background: status===s ? sm.bg : 'var(--input-bg)',
                      color: status===s ? sm.color : 'var(--text-muted)',
                      fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.75rem',
                      cursor:'pointer', textTransform:'capitalize', transition:'all 0.15s',
                    }}>
                    {sm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin notes */}
          <div className="ad-info-card">
            <h4 className="ad-info-card__title">Admin Notes</h4>
            <textarea className="input-field" rows={3} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes about this driver…"
              style={{ marginTop:'var(--space-2)' }}/>
          </div>

          {/* Assign order */}
          {!driver.activeOrder && status === 'active' && (
            <button className="btn btn-outline" style={{ width:'100%' }} onClick={() => setShowAssign(true)}>
              <Package size={14}/> Assign Delivery Order
            </button>
          )}

          {/* Save / Delete */}
          <div style={{ display:'flex', gap:'var(--space-3)' }}>
            <button className="btn btn-accent" style={{ flex:1 }} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button className="btn btn-ghost" style={{ color:'var(--color-error)', padding:'0.875rem' }} onClick={deleteDriver}>
              <Trash2 size={15}/>
            </button>
          </div>
        </div>

        {showAssign && (
          <AssignModal
            driver={driver}
            onClose={() => setShowAssign(false)}
            onAssigned={() => setShowAssign(false)}
          />
        )}
      </motion.aside>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AdminDrivers() {
  const dispatch = useDispatch();
  const [drivers,    setDrivers]    = useState([]);
  const [liveDrivers,setLiveDrivers]= useState({}); // { driverId: locationData }
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [statusFilter,setStatusFilter]=useState('all');
  const [page,       setPage]       = useState(1);
  const [selected,   setSelected]   = useState(null);
  const [viewMode,   setViewMode]   = useState('table'); // 'table' | 'map'

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/drivers', {
        params: { status: statusFilter==='all'?'':statusFilter, search, page, limit:15 },
      });
      setDrivers(data.drivers || []);
      setTotal(data.total || 0);
    } catch {
      dispatch(showToast({ message:'Failed to fetch drivers', type:'error' }));
    } finally { setLoading(false); }
  }, [statusFilter, search, page]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  // Load live driver positions for the map view
  const fetchLive = useCallback(async () => {
    try {
      const { data } = await api.get('/drivers/live');
      const map = {};
      data.forEach(d => { if (d.currentLocation?.lat) map[d._id] = d; });
      setLiveDrivers(map);
    } catch {}
  }, []);

  useEffect(() => {
    if (viewMode === 'map') {
      fetchLive();
      const t = setInterval(fetchLive, 5000); // poll every 5s (fallback to polling)
      return () => clearInterval(t);
    }
  }, [viewMode, fetchLive]);

  // Real-time location updates via socket
  useSocket('/tracking', null, {
    'driver:location': (data) => {
      setLiveDrivers(prev => ({
        ...prev,
        [data.driverId]: { ...prev[data.driverId], currentLocation: data.location, ...data },
      }));
    },
    'driver:offline': (data) => {
      setLiveDrivers(prev => {
        const next = { ...prev };
        delete next[data.driverId];
        return next;
      });
    },
  });

  const handleUpdate = (updated) => {
    setDrivers(ds => ds.map(d => d._id === updated._id ? updated : d));
    setSelected(updated);
  };

  const pages = Math.ceil(total / 15);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--space-3)' }}>
          <div>
            <h1 className="admin-page__title">Delivery Drivers</h1>
            <p className="admin-page__subtitle">
              {total} drivers · {Object.keys(liveDrivers).length} currently online
            </p>
          </div>
          <div style={{ display:'flex', gap:'var(--space-2)' }}>
            <button className="btn btn-outline btn-sm" onClick={fetchDrivers}><RefreshCw size={13}/></button>
            <a href="/driver/register" target="_blank" className="btn btn-accent btn-sm">
              <UserPlus size={14}/> Driver Registration
            </a>
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display:'flex', gap:'var(--space-2)', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', border:'1.5px solid var(--border-color)', borderRadius:'var(--radius-full)', overflow:'hidden' }}>
          {[['table','📋 Table'],['map','🗺️ Live Map']].map(([v,l]) => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding:'7px 18px', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.8125rem', transition:'all 0.15s',
                background: viewMode===v ? 'var(--text-primary)' : 'var(--input-bg)',
                color:      viewMode===v ? 'var(--bg-primary)'   : 'var(--text-muted)' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Status filter */}
        {['all','pending','approved','active','inactive','suspended'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{ padding:'5px 14px', borderRadius:'var(--radius-full)',
              border:`1.5px solid ${statusFilter===s ? (STATUS_META[s]?.color||'var(--color-accent)') : 'var(--border-color)'}`,
              background: statusFilter===s ? (STATUS_META[s]?.bg||'rgba(255,79,31,0.08)') : 'var(--input-bg)',
              color: statusFilter===s ? (STATUS_META[s]?.color||'var(--color-accent)') : 'var(--text-muted)',
              fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.75rem',
              cursor:'pointer', textTransform:'capitalize', whiteSpace:'nowrap' }}>
            {s==='all'?'All':STATUS_META[s]?.label||s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:400 }}>
        <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
        <input className="input-field" style={{ paddingLeft:'2.5rem', borderRadius:'var(--radius-full)' }}
          placeholder="Search by name, email, plate…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
      </div>

      {/* ── MAP VIEW ── */}
      {viewMode === 'map' && (
        <div className="admin-chart-card" style={{ padding:0, overflow:'hidden' }}>
          <div className="ad-live-map">
            <MapContainer center={LAGOS_CENTER} zoom={12}
              style={{ width:'100%', height:'100%' }}
              attributionControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>

              {Object.values(liveDrivers).map(d => {
                if (!d.currentLocation?.lat) return null;
                const pos = [d.currentLocation.lat, d.currentLocation.lng];
                return (
                  <Marker key={d._id || d.driverId}
                    position={pos}
                    icon={makeDriverMapIcon(d.isOnline !== false, d.vehicleType)}>
                    <Popup>
                      <div style={{ fontFamily:'system-ui', minWidth:180 }}>
                        <strong style={{ fontSize:14 }}>{d.name}</strong><br/>
                        <span style={{ color:'#6B7280', fontSize:12 }}>{d.vehicleType} · {d.vehiclePlate}</span><br/>
                        {d.activeOrder && <span style={{ color:'#FF4F1F', fontSize:12, fontWeight:600 }}>📦 On delivery</span>}
                        {d.currentLocation?.speed > 0 && (
                          <><br/><span style={{ fontSize:12 }}>Speed: {Math.round(d.currentLocation.speed)} km/h</span></>
                        )}
                        <br/>
                        <span style={{ fontSize:11, color:'#9CA3AF' }}>
                          Updated: {d.currentLocation?.lastUpdated
                            ? new Date(d.currentLocation.lastUpdated).toLocaleTimeString()
                            : 'now'}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Live counter overlay */}
            <div style={{ position:'absolute', top:12, right:12, zIndex:500, background:'rgba(0,0,0,0.75)', color:'white', borderRadius:'var(--radius-lg)', padding:'10px 16px', backdropFilter:'blur(8px)' }}>
              <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.875rem' }}>
                🟢 {Object.keys(liveDrivers).length} Online
              </p>
              <p style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.5)', marginTop:2 }}>
                Updates every 5s
              </p>
            </div>

            {Object.keys(liveDrivers).length === 0 && (
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.4)', zIndex:499 }}>
                <Truck size={40} color="rgba(255,255,255,0.3)" style={{ marginBottom:12 }}/>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'rgba(255,255,255,0.5)', fontSize:'1rem' }}>No drivers currently online</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <div className="admin-chart-card">
          <div className="admin-table-wrap">
            {loading ? (
              <div style={{ padding:'var(--space-10)', textAlign:'center' }}>
                <RefreshCw size={20} color="var(--text-muted)" style={{ animation:'spin 1s linear infinite', margin:'0 auto' }}/>
              </div>
            ) : drivers.length === 0 ? (
              <div style={{ padding:'var(--space-12)', textAlign:'center', color:'var(--text-muted)' }}>
                <Truck size={40} style={{ margin:'0 auto var(--space-3)', opacity:0.3 }}/>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>No drivers found.</p>
                <p style={{ marginTop:4, fontSize:'0.875rem' }}>
                  <a href="/driver/register" target="_blank" style={{ color:'var(--color-accent)', fontWeight:600 }}>Share the driver registration link</a> to get started.
                </p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Driver</th><th>Vehicle</th><th>Area</th><th>Status</th><th>Online</th><th>Deliveries</th><th>Rating</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {drivers.map(d => {
                    const sm = STATUS_META[d.status] || STATUS_META.inactive;
                    const vehicleEmoji = {motorcycle:'🏍️',car:'🚗',van:'🚐',truck:'🚚'}[d.vehicleType]||'🚗';
                    return (
                      <tr key={d._id} style={{ cursor:'pointer' }}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                            <div style={{ width:38, height:38, borderRadius:'50%', background:d.isOnline?'#10B981':'var(--bg-secondary)', border:`2px solid ${d.isOnline?'#10B981':'var(--border-color)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                              {vehicleEmoji}
                            </div>
                            <div>
                              <p style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', color:'var(--text-primary)' }}>{d.name}</p>
                              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{d.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'0.8125rem', color:'var(--text-primary)' }}>{d.vehiclePlate}</p>
                          <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'capitalize' }}>{d.vehicleType}</p>
                        </td>
                        <td style={{ fontSize:'0.875rem', color:'var(--text-secondary)' }}>{d.serviceArea}</td>
                        <td>
                          <span style={{ padding:'3px 10px', borderRadius:'var(--radius-full)', background:sm.bg, color:sm.color, fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.75rem', textTransform:'capitalize' }}>
                            {sm.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:8, height:8, borderRadius:'50%', background:d.isOnline?'#10B981':'#6B7280' }}/>
                            <span style={{ fontSize:'0.8125rem', color:d.isOnline?'#10B981':'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:600 }}>
                              {d.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.875rem', color:'var(--text-primary)' }}>
                          {d.totalDeliveries||0}
                        </td>
                        <td style={{ color:'#F59E0B' }}>★ {(d.rating||5).toFixed(1)}</td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => setSelected(d)}>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {pages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:'var(--space-2)', padding:'var(--space-4)', borderTop:'1px solid var(--border-color)' }}>
              <button className="btn btn-outline btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', alignSelf:'center', color:'var(--text-muted)' }}>{page}/{pages}</span>
              <button className="btn btn-outline btn-sm" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <DriverPanel
            driver={selected}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
          />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
