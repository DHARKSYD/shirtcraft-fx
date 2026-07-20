// src/pages/Auth/Register.jsx — with Google OAuth
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShirtIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearError } from '../../store/slices/authSlice';
import GoogleSignInBtn from '../../components/UI/GoogleSignInBtn';
import './Auth.css';

const PWD_RULES = [
  { label:'At least 8 characters', test:p=>p.length>=8 },
  { label:'Contains a number',     test:p=>/\d/.test(p) },
  { label:'Contains uppercase',    test:p=>/[A-Z]/.test(p) },
];

export default function Register() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { isLoading, error, isLoggedIn } = useSelector(s=>s.auth);

  const [form,   setForm]   = useState({ name:'', email:'', password:'', confirm:'' });
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (isLoggedIn) navigate('/dashboard', { replace:true });
    return () => dispatch(clearError());
  }, [isLoggedIn]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return;
    if (!PWD_RULES.every(r=>r.test(form.password))) return;
    dispatch(registerUser({ name:form.name, email:form.email, password:form.password }));
  };

  const pwValid = PWD_RULES.every(r=>r.test(form.password));
  const matchOk = form.confirm && form.password===form.confirm;

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__brand">
          <Link to="/" className="auth-brand-logo">
            <div className="auth-brand-logo__icon"><ShirtIcon size={18}/></div>
            ShirtCraft
          </Link>
          <div className="auth-page__tagline">
            <h2>Start creating today.</h2>
            <p>Join thousands of designers, brands, and businesses making custom shirts.</p>
          </div>
        </div>
      </div>

      <div className="auth-page__right">
        <motion.div className="auth-card"
          initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45 }}>
          <div className="auth-card__header">
            <h1 className="auth-card__title">Create account</h1>
            <p className="auth-card__sub">Free to join. No credit card required.</p>
          </div>

          <GoogleSignInBtn label="Sign up with Google"/>
          <div className="auth-divider">or sign up with email</div>

          {error && <div className="auth-error"><AlertCircle size={14}/> {error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form__field">
              <label className="input-label">Full Name</label>
              <input type="text" className="input-field" placeholder="Your full name"
                value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
            </div>
            <div className="auth-form__field">
              <label className="input-label">Email address</label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/>
            </div>
            <div className="auth-form__field">
              <label className="input-label">Password</label>
              <div className="auth-form__password-wrap">
                <input type={showPw?'text':'password'} className="input-field" placeholder="Create a strong password"
                  value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required/>
                <button type="button" className="auth-form__pw-toggle" onClick={()=>setShowPw(!showPw)}>
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
              {form.password && (
                <div className="auth-pw-rules">
                  {PWD_RULES.map(r=>(
                    <div key={r.label} className={`auth-pw-rule ${r.test(form.password)?'auth-pw-rule--pass':''}`}>
                      <CheckCircle size={11}/> {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="auth-form__field">
              <label className="input-label">Confirm Password</label>
              <input type="password" className="input-field" placeholder="Repeat your password"
                value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} required
                style={{ borderColor:form.confirm?(matchOk?'var(--color-success)':'var(--color-error)'):undefined }}/>
            </div>
            <p className="auth-form__terms">
              By creating an account you agree to our{' '}
              <Link to="/terms" className="auth-card__link">Terms</Link> and{' '}
              <Link to="/privacy" className="auth-card__link">Privacy Policy</Link>.
            </p>
            <button type="submit" className="btn btn-accent btn-lg" style={{width:'100%'}}
              disabled={isLoading||!pwValid||!matchOk}>
              {isLoading?'Creating account…':'Create Free Account'}
            </button>
          </form>

          <p className="auth-card__footer">
            Already have an account? <Link to="/login" className="auth-card__link">Sign in</Link>
            {' · '}
            <Link to="/driver/register" className="auth-card__link">Join as a driver</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
