// src/utils/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request Interceptor: Attach JWT ─────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Respect an Authorization header a call site already set (e.g. the
    // driver app, which authenticates with a separate driver_token rather
    // than the customer/admin token below) instead of overwriting it.
    if (!config.headers.Authorization) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 ────────────────────────────
// Auth endpoints report their own 401s inline (e.g. "wrong password",
// "reset link expired") — those should never trigger a hard redirect,
// or the error message would flash and disappear before it's readable.
// Everywhere else, a 401 means the session died, so send the user to log in.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => error.config?.url?.includes(path));
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
