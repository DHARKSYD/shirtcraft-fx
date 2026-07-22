// src/pages/Auth/OAuthCallback.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/slices/authSlice';
import { showToast } from '../../store/slices/uiSlice';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const handleOAuthCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const name = params.get('name') ? decodeURIComponent(params.get('name')) : '';
        const email = params.get('email') ? decodeURIComponent(params.get('email')) : '';
        const role = params.get('role') || 'customer';
        const error = params.get('error');

        // Check for errors first
        if (error) {
          console.error('OAuth Error:', error);
          dispatch(showToast({ 
            message: `Google sign-in failed: ${error}. Please try again.`, 
            type: 'error' 
          }));
          if (isMounted) navigate('/login');
          return;
        }

        // Validate token exists
        if (!token || token === 'undefined' || token === 'null') {
          console.error('No token received');
          dispatch(showToast({ 
            message: 'Authentication failed. No token received. Please try again.', 
            type: 'error' 
          }));
          if (isMounted) navigate('/login');
          return;
        }

        // Validate required user data
        if (!email) {
          console.error('No email received');
          dispatch(showToast({ 
            message: 'Authentication failed. No email received. Please try again.', 
            type: 'error' 
          }));
          if (isMounted) navigate('/login');
          return;
        }

        // Store token and hydrate Redux store
        localStorage.setItem('token', token);
        
        dispatch(setUser({
          token,
          user: { 
            name: name || email.split('@')[0], // Fallback if name is empty
            email, 
            role 
          },
        }));

        // Show welcome message
        const firstName = name ? name.split(' ')[0] : email.split('@')[0];
        dispatch(showToast({ 
          message: `Welcome${firstName ? ` back, ${firstName}` : ''}!`, 
          type: 'success' 
        }));

        // Navigate based on role
        if (isMounted) {
          setProcessing(false);
          navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true });
        }

      } catch (error) {
        console.error('OAuth callback error:', error);
        dispatch(showToast({ 
          message: 'An unexpected error occurred during authentication.', 
          type: 'error' 
        }));
        if (isMounted) navigate('/login');
      }
    };

    handleOAuthCallback();

    // Cleanup to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [dispatch, navigate]); // Add dependencies

  // Don't render spinner if processing is complete
  if (!processing) {
    return null;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--bg-primary)' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: 48, 
          height: 48, 
          border: '3px solid var(--border-color)', 
          borderTopColor: 'var(--color-accent)', 
          borderRadius: '50%', 
          animation: 'spin 0.8s linear infinite', 
          margin: '0 auto var(--space-4)' 
        }} />
        <p style={{ 
          fontFamily: 'var(--font-display)', 
          fontWeight: 600, 
          color: 'var(--text-muted)' 
        }}>
          Signing you in with Google...
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}