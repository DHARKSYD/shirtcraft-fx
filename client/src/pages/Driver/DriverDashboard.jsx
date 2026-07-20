// src/pages/Driver/DriverDashboard.jsx — Uber/Bolt-style mobile driver app
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ShirtIcon, LogOut, Package, CheckCircle, Navigation, Star, Phone, UserCog, History, Clock, XCircle } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import api from '../../utils/api';
import './Driver.css';

// Fix Leaflet default marker icon (webpack issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom driver icon (orange arrow)
const driverIcon = L.divIcon({
  html: `<div style="width:36px;height:36px;background:#FF4F1F;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4)">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L8 20l4-3 4 3L12 2z"/></svg>
  </div>`,
  iconSize:   [36, 36],
  iconAnchor: [18, 18],
  className:  'driver-icon',
});

// Auto-pan map to driver location
function MapFollower({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom(), { animate: true });
  }, [position, map]);
  return null;
}

// Default Lagos coords if geolocation fails
const LAGOS_CENTER = [6.5244, 3.3792];

export default function DriverDashboard() {
  const navigate = useNavigate();

  // Load driver from localStorage
  const [driver, setDriver] = useState(() => {
    try { return JSON.parse(localStorage.getItem('driver_data') || 'null'); } catch { return null; }
  });
  const driverToken = localStorage.getItem('driver_token');

  const [isOnline,   setIsOnline]   = useState(false);
  const [position,   setPosition]   = useState(LAGOS_CENTER);
  const [accuracy,   setAccuracy]   = useState(null);
  const [bearing,    setBearing]    = useState(0);
  const [speed,      setSpeed]      = useState(0);
  const [activeOrder,setActiveOrder]= useState(driver?.activeOrder || null);
  const [toast,      setToast]      = useState('');
  const [stats,      setStats]      = useState({ total: driver?.totalDeliveries || 0, rating: driver?.rating || 5.0 });

  // ── Order history ────────────────────────────────────────────────
  const [view,           setView]           = useState('live'); // 'live' | 'history'
  const [history,        setHistory]        = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded,  setHistoryLoaded]  = useState(false);

  const loadHistory = useCallback(async () => {
    if (!driverToken) return;
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/drivers/me/orders', { headers: { Authorization: `Bearer ${driverToken}` } });
      setHistory(data.orders || []);
      setHistoryLoaded(true);
    } catch (e) { console.error('Order history fetch error:', e); }
    finally { setHistoryLoading(false); }
  }, [driverToken]);

  // Load once, the first time the driver switches to the History tab —
  // no point fetching it on every dashboard visit if they never look.
  useEffect(() => { if (view === 'history' && !historyLoaded) loadHistory(); }, [view, historyLoaded, loadHistory]);

  const watchId  = useRef(null);
  const prevPos  = useRef(null);

  // ── Guard: redirect if not logged in ────────────────────────────
  useEffect(() => {
    if (!driver || !driverToken) navigate('/driver/login');
  }, []);

  // ── Refetch from the server on mount ─────────────────────────────
  // The localStorage snapshot is only ever as fresh as the last login, so
  // an assignment made while this driver was offline (or before their very
  // first login after being assigned) would otherwise never show up. This
  // is the other half of the "nothing appears on the driver side" fix —
  // the socket event below covers the case where the driver is already on
  // this screen when the admin assigns; this covers every other case.
  useEffect(() => {
    if (!driver?._id || !driverToken) return;
    api.get(`/drivers/me/${driver._id}`, { headers: { Authorization: `Bearer ${driverToken}` } })
      .then(({ data }) => {
        setDriver(data);
        setActiveOrder(data.activeOrder || null);
        setStats({ total: data.totalDeliveries || 0, rating: data.rating || 5.0 });
        localStorage.setItem('driver_data', JSON.stringify(data));
      })
      .catch((e) => console.error('Driver profile refresh error:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket.io — emit location to server ─────────────────────────
  const { emit } = useSocket('/driver', { token: driverToken }, {
    // Listen for order assignments from admin
    'order:assigned': (data) => {
      setActiveOrder(data.order);
      showToast(`New delivery assigned: ${data.order.orderNumber}`);
    },
    'order:unassigned': () => {
      setActiveOrder(null);
      showToast('This delivery was reassigned by an admin');
    },
    'profile:reviewed': (data) => {
      showToast(data.approved ? 'Your profile update was approved' : 'Your profile update was not approved');
    },
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // ── Geolocation ──────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported on this device');
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc, speed: spd, heading } = pos.coords;
        const newPos = [lat, lng];

        // Calculate bearing from movement if heading not available
        let bear = bearing;
        if (heading !== null && heading !== undefined) {
          bear = heading;
        } else if (prevPos.current) {
          const [pLat, pLng] = prevPos.current;
          bear = Math.atan2(lng - pLng, lat - pLat) * (180 / Math.PI);
          if (bear < 0) bear += 360;
        }

        setPosition(newPos);
        setAccuracy(Math.round(acc));
        setSpeed(spd ? Math.round(spd * 3.6) : 0); // m/s → km/h
        setBearing(bear);
        prevPos.current = newPos;

        // Emit to server
        emit('location:update', {
          lat, lng,
          bearing: bear,
          speed:   spd ? spd * 3.6 : 0,
          address: null,
        });
      },
      (err) => { console.warn('Geolocation error:', err.message); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  }, [emit, bearing]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  // ── Toggle online status ─────────────────────────────────────────
  const toggleOnline = async () => {
    const going = !isOnline;
    setIsOnline(going);
    if (going) {
      startTracking();
      showToast('You are now online and visible to customers');
    } else {
      stopTracking();
      emit('location:offline', {});
      showToast('You are now offline');
    }

    try {
      await api.put('/drivers/me/status', { isOnline: going }, { headers: { Authorization: `Bearer ${driverToken}` } });
    } catch (e) { console.error('Status sync error:', e); }
  };

  // ── Delivery actions ─────────────────────────────────────────────
  const markPickedUp = async () => {
    if (!activeOrder) return;
    emit('delivery:pickedup', { orderId: activeOrder._id || activeOrder });
    showToast('Order picked up — heading to customer!');
  };

  const markDelivered = async () => {
    if (!activeOrder) return;
    emit('delivery:completed', { orderId: activeOrder._id || activeOrder });
    setActiveOrder(null);
    setStats(s => ({ ...s, total: s.total + 1 }));
    showToast('Delivery completed! Great job 🎉');

    // Update local cache
    const updated = { ...driver, totalDeliveries: stats.total + 1, activeOrder: null };
    localStorage.setItem('driver_data', JSON.stringify(updated));
    setDriver(updated);
    setHistoryLoaded(false); // this delivery just moved into history — refetch next time it's viewed
  };

  const logout = () => {
    stopTracking();
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_data');
    navigate('/driver/login');
  };

  // Cleanup on unmount
  useEffect(() => () => stopTracking(), []);

  if (!driver) return null;

  const vehicleEmoji = { motorcycle:'🏍️', car:'🚗', van:'🚐', truck:'🚚' }[driver.vehicleType] || '🚗';

  return (
    <div className="driver-dashboard">

      {/* Top bar */}
      <div className="driver-topbar">
        <div className="driver-topbar__brand">
          <ShirtIcon size={16} color="#FF4F1F"/> ShirtCraft Driver
        </div>
        <div className="driver-topbar__status">
          <div className={`status-dot ${isOnline ? 'status-dot--online' : 'status-dot--offline'}`}/>
          <span style={{ color: isOnline ? '#10B981' : '#6B7280' }}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Live / History tabs */}
      <div className="driver-tabs">
        <button className={`driver-tab ${view==='live'?'driver-tab--active':''}`} onClick={()=>setView('live')}>
          <Navigation size={14}/> Live
        </button>
        <button className={`driver-tab ${view==='history'?'driver-tab--active':''}`} onClick={()=>setView('history')}>
          <History size={14}/> History {stats.total > 0 && <span className="driver-tab__badge">{stats.total}</span>}
        </button>
      </div>

      {view === 'history' ? (
        <div className="driver-body">
          {historyLoading ? (
            <div className="driver-card" style={{ textAlign:'center', padding:'var(--space-8)', color:'#666' }}>Loading your deliveries…</div>
          ) : history.length === 0 ? (
            <div className="driver-card" style={{ textAlign:'center', padding:'var(--space-8)' }}>
              <Package size={36} style={{ opacity:0.3, marginBottom:'var(--space-3)' }}/>
              <p style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'white' }}>No deliveries yet</p>
              <p style={{ fontSize:'0.8125rem', color:'#666', marginTop:4 }}>Completed and past deliveries will show up here.</p>
            </div>
          ) : (
            history.map(order => {
              const isDone = order.status === 'delivered';
              const isCancelled = order.status === 'cancelled';
              return (
                <div key={order._id} className="driver-card driver-history-item">
                  <div className="driver-history-item__top">
                    <span className="driver-history-item__num">{order.orderNumber}</span>
                    <span className={`driver-history-item__status driver-history-item__status--${order.status}`}>
                      {isDone ? <CheckCircle size={12}/> : isCancelled ? <XCircle size={12}/> : <Clock size={12}/>} {order.status}
                    </span>
                  </div>
                  <p className="driver-history-item__addr">📍 {order.shipping?.street}, {order.shipping?.city}</p>
                  <div className="driver-history-item__bottom">
                    <span>{new Date(order.createdAt).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}</span>
                    <strong>₦{(order.total||0).toLocaleString()}</strong>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
      <div className="driver-body">

        {/* Online toggle */}
        <div className="driver-card">
          <div className="driver-online-toggle">
            <div>
              <p className="driver-online-toggle__label">
                {isOnline ? 'You\'re online' : 'Go online'}
              </p>
              <p className="driver-online-toggle__sub">
                {isOnline
                  ? `${accuracy ? `±${accuracy}m accuracy` : 'Tracking location…'} · ${speed} km/h`
                  : 'Tap to start receiving delivery requests'}
              </p>
            </div>
            <button
              className={`driver-toggle-btn ${isOnline ? 'driver-toggle-btn--on' : 'driver-toggle-btn--off'}`}
              onClick={toggleOnline}
              aria-label="Toggle online status">
              <div className="driver-toggle-thumb" style={{ left: isOnline ? 34 : 4 }}/>
            </button>
          </div>
        </div>

        {/* Live map */}
        <div className="driver-card" style={{ padding:0, overflow:'hidden' }}>
          <div className="driver-map-wrap">
            <MapContainer
              center={position}
              zoom={15}
              style={{ width:'100%', height:'100%' }}
              zoomControl={false}
              attributionControl={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap &copy; CARTO"
              />
              <MapFollower position={position}/>
              <Marker position={position} icon={driverIcon}>
                <Popup>
                  <strong>{vehicleEmoji} {driver.name}</strong><br/>
                  Plate: {driver.vehiclePlate}<br/>
                  Speed: {speed} km/h
                </Popup>
              </Marker>
            </MapContainer>
            {/* The delivery address is shown as text in the card below —
                ShirtCraft doesn't geocode shipping addresses yet, so a pin
                here would be a guess rather than the real location. */}
          </div>
        </div>

        {/* Active delivery */}
        <AnimatePresence>
          {activeOrder ? (
            <motion.div className="driver-card"
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }}>
              <p className="driver-card__title">Active Delivery</p>
              <div className="driver-delivery">
                <div>
                  <p className="driver-delivery__order-num">{activeOrder.orderNumber || 'ORD-ASSIGNED'}</p>
                  <p className="driver-delivery__customer">{activeOrder.shipping?.name || 'Customer'}</p>
                  <p className="driver-delivery__address">
                    📍 {activeOrder.shipping?.street}, {activeOrder.shipping?.city}, {activeOrder.shipping?.state}
                  </p>
                  <p className="driver-delivery__items" style={{ marginTop:6 }}>
                    {activeOrder.items?.reduce((s,i)=>s+i.quantity,0)||1} item(s)
                  </p>
                </div>
                <div className="driver-delivery__total">
                  ₦{(activeOrder.total||0).toLocaleString()}
                </div>
                <div className="driver-delivery__actions">
                  <button className="driver-action-btn driver-action-btn--pickup" onClick={markPickedUp}>
                    <Package size={15}/> Picked Up
                  </button>
                  <button className="driver-action-btn driver-action-btn--complete" onClick={markDelivered}>
                    <CheckCircle size={15}/> Delivered
                  </button>
                </div>
                {activeOrder.shipping?.phone && (
                  <a href={`tel:${activeOrder.shipping.phone}`}
                    style={{ display:'flex', alignItems:'center', gap:8, color:'#60A5FA', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', textDecoration:'none' }}>
                    <Phone size={13}/> Call Customer: {activeOrder.shipping.phone}
                  </a>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div className="driver-card" style={{ textAlign:'center', padding:'var(--space-8)' }}
              initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <div style={{ fontSize:'3rem', marginBottom:'var(--space-3)' }}>🛵</div>
              <p style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'white', marginBottom:8 }}>
                {isOnline ? 'Waiting for a delivery…' : 'Go online to start'}
              </p>
              <p style={{ fontSize:'0.875rem', color:'#666' }}>
                {isOnline ? 'New orders will appear here automatically' : 'Toggle the switch above to go online'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="driver-stats">
          <div className="driver-stat">
            <p className="driver-stat__val">{stats.total}</p>
            <p className="driver-stat__label">Deliveries</p>
          </div>
          <div className="driver-stat">
            <p className="driver-stat__val" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
              <Star size={14} color="#F59E0B" fill="#F59E0B"/>{stats.rating.toFixed(1)}
            </p>
            <p className="driver-stat__label">Rating</p>
          </div>
          <div className="driver-stat">
            <p className="driver-stat__val">{driver.serviceArea?.slice(0,3)}</p>
            <p className="driver-stat__label">Zone</p>
          </div>
        </div>

        {/* Driver info + logout */}
        <div className="driver-card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'white' }}>{driver.name}</p>
            <p style={{ fontSize:'0.75rem', color:'#666', marginTop:2 }}>
              {vehicleEmoji} {driver.vehiclePlate} · {driver.vehicleType}
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => navigate('/driver/profile')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'rgba(255,79,31,0.1)', color:'#FF4F1F', border:'1px solid rgba(255,79,31,0.25)', borderRadius:'var(--radius-md)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.8125rem', cursor:'pointer' }}>
              <UserCog size={13}/> Profile
            </button>
            <button onClick={logout}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'rgba(239,68,68,0.12)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'var(--radius-md)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.8125rem', cursor:'pointer' }}>
              <LogOut size={13}/> Logout
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
            style={{ position:'fixed', bottom:'var(--space-6)', left:'50%', transform:'translateX(-50%)', background:'#FF4F1F', color:'white', padding:'12px 20px', borderRadius:'var(--radius-lg)', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:9999, whiteSpace:'nowrap', maxWidth:'90vw', textAlign:'center' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
