// src/components/UI/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Wraps routes that require authentication.
 * Redirects unauthenticated users to /login.
 * adminOnly prop restricts to users with role='admin'.
 *
 * Usage:
 *   <ProtectedRoute><Dashboard /></ProtectedRoute>
 *   <ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isLoggedIn, user } = useSelector(s => s.auth);
  const location = useLocation();

  if (!isLoggedIn) {
    // Redirect to login preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
