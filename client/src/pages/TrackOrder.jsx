// src/pages/TrackOrder.jsx — customer live tracking (Bolt/Uber style)
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, Package, Truck, MapPin, RefreshCw } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import api from '../utils/api';
import './TrackOrder.css';

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Animated driver marker
const makeDriverIcon = (bearing = 0) => L.divIcon({
  html:`<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;transform:rotate(${bearing}deg)">
    <div style="width:40px;height:40px;background:#FF4F1F;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(255,79,31,0.5)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2L8 20l4-3 4 3L12 2z"/></svg>
    </div>
  </div>`,
  iconSize:[44,44], iconAnchor:[22,22], className:'',
});

const customerIcon = L.divIcon({
  html:`<div style="width:36px;height:36px;background:#1e3a5f;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3)">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
  </div>`,
  iconSize:[36,36], iconAnchor:[18,36], className:'',
});

function MapAnimator({ driverPos, customerPos }) {
  const map = useMap();
  useEffect(() => {
    if (driverPos && customerPos) {
      const bounds = L.latLngBounds([driverPos, customerPos]).pad(0.3);
      map.fitBounds(bounds, { animate: true, duration: 1 });
    } else if (driverPos) {
      map.setView(driverPos, 15, { animate: true });
    }
  }, [driverPos]);
  return null;
}

const STEP_DEFS = [
  { key:'pending',    label:'Order Placed',     icon:<Package size={13}/> },
  { key:'processing', label:'Being Prepared',   icon:<RefreshCw size={13}/> },
  { key:'shipped',    label:'Out for Delivery', icon:<Truck size={13}/> },
  { key:'delivered',  label:'Delivered',        icon:<CheckCircle size={13}/> },
];

const STATUS_ORDER = ['pending','processing','shipped','delivered'];

export default function TrackOrder() {
  const { id }  = useParams();
  const mapRef  = useRef(null);

  const [order,      setOrder]      = useState(null);
  const [driver,     setDriver]     = useState(null);
  const [driverPos,  setDriverPos]  = useState(null);
  const [driverIcon, setDriverIcon] = useState(() => makeDriverIcon(0));
  const [pathHistory,setPathHistory]= useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [eta,        setEta]        = useState(null);

  // Approx Lagos customer location (real app would geocode the shipping address)
  const CUSTOMER_POS = [6.5244, 3.3792];

  // ── Fetch order ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data);

        // If a driver is assigned, fetch their location
        if (data.assignedDriver) {
          const { data: drv } = await api.get(`/drivers/${data.assignedDriver}`).catch(()=>({data:null}));
          if (drv) {
            setDriver(drv);
            if (drv.currentLocation?.lat) {
              const pos = [drv.currentLocation.lat, drv.currentLocation.lng];
              setDriverPos(pos);
              setPathHistory([pos]);
            }
          }
        }
      } catch {
        setError('Order not found or you are not authorised to track it.');
      } finally { setLoading(false); }
    };
    fetchOrder();
  }, [id]);

  // ── Socket: watch live driver location ───────────────────────────
  const { emit } = useSocket('/tracking', null, {
    'driver:location': (data) => {
      // Only update if this driver is assigned to our order
      if (!driver || data.driverId?.toString() !== driver._id?.toString()) return;
      const pos = [data.location.lat, data.location.lng];
      setDriverPos(pos);
      setDriverIcon(makeDriverIcon(data.location.bearing || 0));
      setPathHistory(h => [...h.slice(-60), pos]); // keep last 60 points

      // Rough ETA based on distance (haversine simplified)
      const dist = Math.sqrt(
        Math.pow(pos[0]-CUSTOMER_POS[0],2) + Math.pow(pos[1]-CUSTOMER_POS[1],2)
      ) * 111; // rough km
      setEta(Math.max(1, Math.round(dist / 0.5))); // assuming avg 30km/h
    },
    'delivery:pickedup': (data) => {
      if (data.orderId === id) setOrder(o => o ? {...o, status:'shipped'} : o);
    },
    'delivery:completed': (data) => {
      if (data.orderId === id) setOrder(o => o ? {...o, status:'delivered'} : o);
    },
  });

  // Join order room for targeted updates
  useEffect(() => {
    emit('watch:order', id);
    return () => emit('unwatch:order', id);
  }, [id, emit]);

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:48, height:48, border:'3px solid var(--border-color)', borderTopColor:'var(--color-accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto var(--space-4)' }}/>
        <p style={{ fontFamily:'var(--font-display)', fontWeight:600, color:'var(--text-muted)' }}>Loading tracking info…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)', padding:'var(--space-8)', textAlign:'center' }}>
      <div>
        <div style={{ fontSize:'3rem', marginBottom:'var(--space-4)' }}>📦</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-primary)', marginBottom:'var(--space-3)' }}>{error}</h2>
        <Link to="/dashboard" className="btn btn-accent">Back to Dashboard</Link>
      </div>
    </div>
  );

  const currentStepIdx = STATUS_ORDER.indexOf(order?.status || 'pending');
  const hasDriver = !!driver && !!driverPos;

  return (
    <div className="tracking-page">
      {/* Header */}
      <div className="tracking-header">
        <Link to="/dashboard" className="tracking-back">
          <ArrowLeft size={16}/> My Orders
        </Link>
        <div className="tracking-order-info">
          <p className="tracking-order-num">{order?.orderNumber}</p>
          <p className="tracking-order-status">
            {order?.status === 'delivered' ? '✅ Delivered!' :
             order?.status === 'shipped'   ? '🚗 Out for Delivery' :
             order?.status === 'processing'? '📦 Being Prepared' : '⏳ Order Placed'}
          </p>
        </div>
        {eta && order?.status === 'shipped' && (
          <div style={{ textAlign:'right' }}>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.5rem', color:'var(--color-accent)', lineHeight:1 }}>{eta} min</p>
            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>estimated</p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="tracking-map-wrap">
        <MapContainer
          center={driverPos || CUSTOMER_POS}
          zoom={14}
          style={{ width:'100%', height:'100%' }}
          ref={mapRef}
          attributionControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          <MapAnimator driverPos={driverPos} customerPos={CUSTOMER_POS}/>

          {/* Customer destination */}
          <Marker position={CUSTOMER_POS} icon={customerIcon}>
            <Popup>
              <strong>Delivery Address</strong><br/>
              {order?.shipping?.street}, {order?.shipping?.city}
            </Popup>
          </Marker>

          {/* Driver (live) */}
          {hasDriver && (
            <>
              <Marker position={driverPos} icon={driverIcon}>
                <Popup>
                  <strong>🚗 {driver.name}</strong><br/>
                  {driver.vehicleType} · {driver.vehiclePlate}
                </Popup>
              </Marker>
              {/* Breadcrumb trail */}
              {pathHistory.length > 1 && (
                <Polyline
                  positions={pathHistory}
                  color="#FF4F1F"
                  weight={3}
                  opacity={0.4}
                  dashArray="8 6"
                />
              )}
            </>
          )}
        </MapContainer>

        {/* Driver info card */}
        {hasDriver && order?.status === 'shipped' ? (
          <motion.div className="tracking-driver-card"
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
            <div className="tracking-driver-avatar">{driver.name?.[0]}</div>
            <div>
              <p className="tracking-driver-name">{driver.name}</p>
              <p className="tracking-driver-meta">
                {driver.vehicleType} · {driver.vehiclePlate}
                {driver.rating && ` · ⭐ ${driver.rating.toFixed(1)}`}
              </p>
            </div>
            <div className="tracking-eta">
              {eta && <><p className="tracking-eta__val">{eta}</p><p className="tracking-eta__label">min away</p></>}
            </div>
          </motion.div>
        ) : !hasDriver && order?.status !== 'delivered' ? (
          <div className="tracking-no-driver">
            <div style={{ fontSize:'3.5rem', marginBottom:'var(--space-2)' }}>
              {order?.status === 'pending' ? '⏳' : '📦'}
            </div>
            <h3>
              {order?.status === 'delivered' ? 'Delivered!' :
               order?.status === 'processing'? 'Preparing your order' :
               'Waiting for a driver'}
            </h3>
            <p>
              {order?.status === 'processing'
                ? 'Your order is being packed. A driver will be assigned shortly.'
                : 'Your order is confirmed. We\'ll assign a driver soon.'}
            </p>
            {order?.trackingNumber && (
              <p style={{ fontFamily:'var(--font-mono)', fontSize:'0.875rem', color:'var(--color-accent)', fontWeight:700 }}>
                Tracking: {order.trackingNumber}
              </p>
            )}
          </div>
        ) : order?.status === 'delivered' ? (
          <motion.div className="tracking-driver-card"
            style={{ justifyContent:'center', textAlign:'center' }}
            initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}>
            <div style={{ textAlign:'center', width:'100%' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🎉</div>
              <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.125rem', color:'var(--text-primary)' }}>Order Delivered!</p>
              <p style={{ fontSize:'0.875rem', color:'var(--text-muted)', marginTop:4 }}>Thank you for shopping with ShirtCraft</p>
            </div>
          </motion.div>
        ) : null}
      </div>

      {/* Progress steps */}
      <div className="tracking-progress">
        <p className="tracking-progress__title">Delivery Progress</p>
        <div className="tracking-steps">
          {STEP_DEFS.map((s, i) => {
            const done   = i <  currentStepIdx;
            const active = i === currentStepIdx;
            return (
              <div key={s.key} className="tracking-step">
                <div className={`tracking-step__dot ${done?'tracking-step__dot--done':active?'tracking-step__dot--active':''}`}>
                  {done ? <CheckCircle size={13} color="white"/> : (
                    <span style={{ color: active?'white':'var(--text-muted)', display:'flex' }}>{s.icon}</span>
                  )}
                </div>
                <span className={`tracking-step__label ${done?'tracking-step__label--done':active?'tracking-step__label--active':''}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order summary */}
      <div style={{ padding:'var(--space-5) var(--space-6)', background:'var(--bg-secondary)', borderTop:'1px solid var(--border-color)' }}>
        <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.875rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'var(--space-3)' }}>Order Summary</h4>
        {order?.items?.map((item,i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'var(--space-2) 0', borderBottom:'1px solid var(--border-color)' }}>
            <div>
              <p style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', color:'var(--text-primary)' }}>{item.name}</p>
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Qty: {item.quantity}{item.size ? ` · Size: ${item.size}` : ''}</p>
            </div>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.875rem', color:'var(--text-primary)' }}>
              ₦{((item.price||0)*(item.quantity||1)).toLocaleString()}
            </p>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'var(--space-3)', fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-primary)' }}>
          <span>Total</span><span>₦{(order?.total||0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
