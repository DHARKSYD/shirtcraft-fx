// src/pages/Auth/ResetPassword.jsx
// Destination page for the link emailed by ForgotPassword (/reset-password/:token).
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, ShirtIcon, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import { resetPassword, clearError } from '../../store/slices/authSlice';
import './Auth.css';

const PWD_RULES = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'Contains a number',     test: p => /\d/.test(p) },
  { label: 'Contains uppercase',    test: p => /[A-Z]/.test(p) },
];

export default function ResetPassword() {
  const { token } = useParams();
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { isLoading, error, isLoggedIn, user } = useSelector(s => s.auth);

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    return () => dispatch(clearError());
  }, []);

  const pwValid = PWD_RULES.every(r => r.test(password));
  const matchOk = confirm && password === confirm;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pwValid || !matchOk) return;
    dispatch(resetPassword({ token, password }))
      .unwrap()
      .then(() => setDone(true))
      .catch(() => {}); // error is already surfaced via auth.error
  };

  return (
    <div className="auth-page" style={{ gridTemplateColumns: '1fr' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-8)' }}>
        <motion.div className="auth-card" style={{ maxWidth: 420 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}>

          <Link to="/login" className="auth-brand-logo" style={{ color: 'var(--color-black)' }}>
            <div className="auth-brand-logo__icon"><ShirtIcon size={18} /></div>
            ShirtCraft
          </Link>

          {!done ? (
            <>
              <div className="auth-card__header">
                <h1 className="auth-card__title">Set a new password</h1>
                <p className="auth-card__sub">Choose a strong password for your account.</p>
              </div>

              {error && (
                <div className="auth-error">
                  <AlertCircle size={14} /> {error}
                  {/^invalid|expired/i.test(error) && (
                    <>
                      {' '}— <Link to="/forgot-password" className="auth-card__link">Request a new link</Link>
                    </>
                  )}
                </div>
              )}

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-form__field">
                  <label className="input-label">New Password</label>
                  <div className="auth-form__password-wrap">
                    <input type={showPw ? 'text' : 'password'} className="input-field" placeholder="Create a strong password"
                      value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
                    <button type="button" className="auth-form__pw-toggle" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password && (
                    <div className="auth-pw-rules">
                      {PWD_RULES.map(r => (
                        <div key={r.label} className={`auth-pw-rule ${r.test(password) ? 'auth-pw-rule--pass' : ''}`}>
                          <CheckCircle size={11} /> {r.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="auth-form__field">
                  <label className="input-label">Confirm New Password</label>
                  <input type="password" className="input-field" placeholder="Repeat your new password"
                    value={confirm} onChange={e => setConfirm(e.target.value)} required
                    style={{ borderColor: confirm ? (matchOk ? 'var(--color-success)' : 'var(--color-error)') : undefined }} />
                </div>
                <button type="submit" className="btn btn-accent btn-lg" style={{ width: '100%' }}
                  disabled={isLoading || !pwValid || !matchOk}>
                  {isLoading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(16,185,129,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <KeyRound size={28} color="var(--color-success)" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Password reset</h2>
              <p style={{ color: 'var(--color-muted)' }}>
                {isLoggedIn
                  ? "Your password has been updated and you're signed back in."
                  : 'Your password has been updated. Please sign in with your new password.'}
              </p>
              <button
                type="button"
                className="btn btn-accent btn-lg"
                style={{ width: '100%' }}
                onClick={() => navigate(isLoggedIn ? (user?.role === 'admin' ? '/admin' : '/dashboard') : '/login', { replace: true })}
              >
                {isLoggedIn ? 'Continue to Dashboard' : 'Continue to Sign In'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
