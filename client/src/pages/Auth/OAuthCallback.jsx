// src/pages/Auth/OAuthCallback.jsx
// This page handles the redirect from Google OAuth
// URL looks like: /auth/callback?token=xxx&name=yyy&email=zzz&role=www

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch }  from 'react-redux';
import { setUser }      from '../../store/slices/authSlice';
import { showToast }    from '../../store/slices/uiSlice';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const name   = decodeURIComponent(params.get('name')  || '');
    const email  = decodeURIComponent(params.get('email') || '');
    const role   = params.get('role') || 'customer';
    const error  = params.get('error');

    if (error || !token) {
      dispatch(showToast({ message: 'Google sign-in failed. Please try again.', type:'error' }));
      navigate('/login');
      return;
    }

    // Store token and hydrate Redux store
    localStorage.setItem('token', token);
    dispatch(setUser({
      token,
      user: { name, email, role },
    }));

    dispatch(showToast({ message: `Welcome back, ${name.split(' ')[0]}!`, type:'success' }));
    navigate(role === 'admin' ? '/admin' : '/dashboard');
  }, []);

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:48, height:48, border:'3px solid var(--border-color)', borderTopColor:'var(--color-accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto var(--space-4)' }}/>
        <p style={{ fontFamily:'var(--font-display)', fontWeight:600, color:'var(--text-muted)' }}>
          Signing you in with Google…
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
