// src/pages/Driver/DriverLogin.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Mail, Lock, AlertCircle, ShirtIcon } from 'lucide-react';
import api from '../../utils/api';
import './Driver.css';

export default function DriverLogin() {
  const navigate = useNavigate();
  const [form,       setForm]       = useState({ email:'', password:'' });
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/drivers/login', form);
      // Store driver token separately from user token
      localStorage.setItem('driver_token', data.token);
      localStorage.setItem('driver_data',  JSON.stringify(data.driver));
      navigate('/driver/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="driver-login-page">
      <motion.div className="driver-login-card"
        initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>

        <div style={{ textAlign:'center', marginBottom:'var(--space-6)' }}>
          <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.25rem', color:'var(--text-primary)', textDecoration:'none', marginBottom:'var(--space-5)' }}>
            <ShirtIcon size={20} color="var(--color-accent)"/> ShirtCraft
          </Link>
          <div style={{ width:64, height:64, background:'rgba(255,79,31,0.1)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto var(--space-4)' }}>
            <Truck size={28} color="var(--color-accent)"/>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.75rem', fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>Driver Login</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>Log in using your registered email and password.</p>
        </div>

        {error && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'var(--radius-md)', color:'var(--color-error)', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.875rem', marginBottom:'var(--space-5)' }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
          <div>
            <label className="input-label"><Mail size={12}/> Email Address</label>
            <input className="input-field" type="email" placeholder="your@email.com"
              value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/>
          </div>
          <div>
            <label className="input-label"><Lock size={12}/> Password</label>
            <input className="input-field" type="password" placeholder="••••••••"
              value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required/>
          </div>
          <button type="submit" className="btn btn-accent btn-lg" style={{ width:'100%' }} disabled={loading}>
            {loading ? 'Logging in…' : 'Login to Driver App'}
          </button>
        </form>

        <p style={{ textAlign:'center', fontFamily:'var(--font-display)', fontSize:'0.875rem', color:'var(--text-muted)', marginTop:'var(--space-5)' }}>
          Not a driver yet?{' '}
          <Link to="/driver/register" style={{ color:'var(--color-accent)', fontWeight:700 }}>Apply to join</Link>
        </p>
      </motion.div>
    </div>
  );
}
