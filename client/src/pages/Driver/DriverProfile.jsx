// src/pages/Driver/DriverProfile.jsx — driver self-service profile,
// with edits held for admin approval rather than applied instantly.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Save } from 'lucide-react';
import api from '../../utils/api';
import './Driver.css';

const FIELDS = [
  { key: 'name',         label: 'Full Name' },
  { key: 'phone',        label: 'Phone Number' },
  { key: 'vehicleMake',  label: 'Vehicle Make' },
  { key: 'vehicleModel', label: 'Vehicle Model' },
  { key: 'vehiclePlate', label: 'Plate Number' },
  { key: 'vehicleColor', label: 'Vehicle Colour' },
  { key: 'serviceArea',  label: 'Service Area' },
];

export default function DriverProfile() {
  const navigate = useNavigate();
  const driverToken = localStorage.getItem('driver_token');
  const [driver, setDriver]   = useState(() => JSON.parse(localStorage.getItem('driver_data') || 'null'));
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  useEffect(() => {
    if (!driverToken) { navigate('/driver/login'); return; }
    api.get(`/drivers/me/${JSON.parse(localStorage.getItem('driver_data')||'{}')._id}`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    }).then(({ data }) => {
      setDriver(data);
      localStorage.setItem('driver_data', JSON.stringify(data));
      setForm(Object.fromEntries(FIELDS.map(f => [f.key, data[f.key] || ''])));
    }).catch(() => showToast('Could not load your profile'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!driver) return null;

  const hasPending = !!driver.pendingUpdate;
  const changedFields = FIELDS.filter(f => form[f.key] !== (driver[f.key] || ''));

  const submit = async (e) => {
    e.preventDefault();
    if (changedFields.length === 0) { showToast('No changes to submit'); return; }
    setSaving(true);
    try {
      const payload = Object.fromEntries(changedFields.map(f => [f.key, form[f.key]]));
      const { data } = await api.put('/drivers/me/request-update', payload, {
        headers: { Authorization: `Bearer ${driverToken}` },
      });
      setDriver(data.driver);
      localStorage.setItem('driver_data', JSON.stringify(data.driver));
      showToast('Submitted — an admin will review your changes shortly');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Could not submit your update');
    } finally { setSaving(false); }
  };

  return (
    <div className="driver-dashboard">
      <div className="driver-topbar">
        <button onClick={() => navigate('/driver/dashboard')}
          className="driver-topbar__brand" style={{ background:'none', border:'none', cursor:'pointer' }}>
          <ArrowLeft size={16} color="#FF4F1F"/> My Profile
        </button>
      </div>

      <div className="driver-body">
        {hasPending && (
          <div className="driver-card" style={{ borderColor:'#FF4F1F', background:'rgba(255,79,31,0.08)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <Clock size={16} color="#FF4F1F"/>
              <strong style={{ color:'#FF4F1F', fontFamily:'var(--font-display)' }}>Awaiting admin approval</strong>
            </div>
            <p style={{ fontSize:'0.8125rem', color:'#999', lineHeight:1.5 }}>
              You have a profile change waiting for review. Your live profile still shows
              the values below until an admin approves it.
            </p>
            <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
              {Object.entries(driver.pendingUpdate).map(([key, val]) => (
                <div key={key} style={{ fontSize:'0.8125rem', color:'#ccc' }}>
                  <span style={{ color:'#666' }}>{FIELDS.find(f => f.key === key)?.label || key}:</span>{' '}
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <form className="driver-card" onSubmit={submit}>
          <p style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'white', marginBottom:4 }}>
            Your Details
          </p>
          <p style={{ fontSize:'0.75rem', color:'#666', marginBottom:16 }}>
            Changes are reviewed by an admin before they take effect on your account.
          </p>

          {FIELDS.map(f => (
            <div key={f.key} style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:'0.75rem', color:'#888', marginBottom:5 }}>
                {f.label}
              </label>
              <input
                value={form[f.key] ?? ''}
                onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{
                  width:'100%', padding:'10px 12px', background:'#111', border:'1px solid #2A2A2A',
                  borderRadius:'var(--radius-md)', color:'white', fontSize:'0.875rem',
                }}
              />
            </div>
          ))}

          <button type="submit" disabled={saving || changedFields.length === 0}
            style={{
              width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:'12px', background: changedFields.length ? '#FF4F1F' : '#2A2A2A',
              color:'white', border:'none', borderRadius:'var(--radius-md)',
              fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.875rem',
              cursor: changedFields.length ? 'pointer' : 'not-allowed', opacity: saving ? 0.7 : 1,
            }}>
            <Save size={15}/> {saving ? 'Submitting…' : `Submit for Approval${changedFields.length ? ` (${changedFields.length})` : ''}`}
          </button>
        </form>
      </div>

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
