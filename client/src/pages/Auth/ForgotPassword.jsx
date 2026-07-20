// src/pages/Auth/ForgotPassword.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { ShirtIcon, Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { forgotPassword, clearError } from '../../store/slices/authSlice';
import './Auth.css';

export default function ForgotPassword() {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector(s => s.auth);

  const [email, setEmail] = useState('');
  const [sent,  setSent]  = useState(false);

  useEffect(() => {
    return () => dispatch(clearError());
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    dispatch(forgotPassword(email))
      .unwrap()
      .then(() => setSent(true))
      .catch(() => {}); // error is already surfaced via auth.error
  };

  return (
    <div className="auth-page" style={{ gridTemplateColumns: '1fr' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-8)' }}>
        <motion.div className="auth-card" style={{ maxWidth: 400 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}>

          <Link to="/login" className="auth-brand-logo" style={{ color: 'var(--color-black)' }}>
            <div className="auth-brand-logo__icon"><ShirtIcon size={18} /></div>
            ShirtCraft
          </Link>

          {!sent ? (
            <>
              <div className="auth-card__header">
                <h1 className="auth-card__title">Reset password</h1>
                <p className="auth-card__sub">Enter your email and we'll send a reset link.</p>
              </div>
              <form className="auth-form" onSubmit={handleSubmit}>
                {error && (
                  <div className="auth-error"><AlertCircle size={14} /> {error}</div>
                )}
                <div className="auth-form__field">
                  <label className="input-label">Email address</label>
                  <input
                    type="email" className="input-field"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-accent btn-lg" style={{ width: '100%' }} disabled={isLoading}>
                  {isLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(16,185,129,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <Mail size={28} color="var(--color-success)" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Check your inbox</h2>
              <p style={{ color: 'var(--color-muted)' }}>If an account exists for <strong>{email}</strong>, we've sent a reset link. Check your spam folder if you don't see it within a few minutes.</p>
            </div>
          )}

          <Link to="/login" className="auth-card__footer flex" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', alignItems: 'center' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
