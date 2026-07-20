// src/pages/Auth/Login.jsx — with Google OAuth
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShirtIcon, AlertCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../../store/slices/authSlice';
import GoogleSignInBtn from '../../components/UI/GoogleSignInBtn';
import './Auth.css';

export default function Login() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isLoading, error, isLoggedIn } = useSelector(s => s.auth);

  const [form,   setForm]   = useState({ email:'', password:'' });
  const [showPw, setShowPw] = useState(false);
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isLoggedIn) navigate(from, { replace:true });
    return () => dispatch(clearError());
  }, [isLoggedIn]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    dispatch(loginUser(form));
  };

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__brand">
          <Link to="/" className="auth-brand-logo">
            <div className="auth-brand-logo__icon"><ShirtIcon size={18}/></div>
            ShirtCraft
          </Link>
          <div className="auth-page__tagline">
            <h2>Design without limits.</h2>
            <p>Professional custom t-shirts, made exactly how you imagine them.</p>
          </div>
          <div className="auth-page__features">
            {['Professional design studio','Premium blanks 180–300 GSM','Real-time delivery tracking','100% satisfaction guarantee'].map(f => (
              <div key={f} className="auth-page__feature">
                <span className="auth-page__feature-dot"/>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-page__right">
        <motion.div className="auth-card"
          initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45 }}>

          <div className="auth-card__header">
            <h1 className="auth-card__title">Sign in</h1>
            <p className="auth-card__sub">Welcome back. Enter your credentials to continue.</p>
          </div>

          {/* Google Sign-In */}
          <GoogleSignInBtn label="Continue with Google"/>
          <div className="auth-divider">or</div>

          {error && (
            <div className="auth-error"><AlertCircle size={14}/> {error}</div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form__field">
              <label className="input-label">Email address</label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                required autoComplete="email"/>
            </div>
            <div className="auth-form__field">
              <div className="auth-form__field-header">
                <label className="input-label">Password</label>
                <Link to="/forgot-password" className="auth-form__forgot">Forgot password?</Link>
              </div>
              <div className="auth-form__password-wrap">
                <input type={showPw?'text':'password'} className="input-field" placeholder="••••••••"
                  value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  required autoComplete="current-password"/>
                <button type="button" className="auth-form__pw-toggle" onClick={()=>setShowPw(!showPw)}>
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-accent btn-lg" style={{width:'100%'}} disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="auth-card__footer">
            No account? <Link to="/register" className="auth-card__link">Create one free</Link>
            {' · '}
            <Link to="/driver/register" className="auth-card__link">Join as a driver</Link>
            {' · '}
            <Link to="/driver/login" className="auth-card__link">Log in as a driver</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
