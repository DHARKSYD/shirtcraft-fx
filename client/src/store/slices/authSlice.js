// src/store/slices/authSlice.js — real API, no demo shortcuts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('token', data.token);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed. Check your credentials.');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('token', data.token);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed. Please try again.');
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Session expired.');
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (profileData, { rejectWithValue }) => {
  try {
    const { data } = await api.put('/users/profile', profileData);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Profile update failed.');
  }
});

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (email, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to send reset email. Please try again.');
  }
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async ({ token, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/auth/reset-password/${token}`, { password });
    localStorage.setItem('token', data.token);
    // The reset endpoint only returns a token, not the user — fetch it so a
    // successful reset can sign the user straight back in.
    try {
      const me = await api.get('/auth/me');
      return { token: data.token, user: me.data };
    } catch {
      // Reset itself still succeeded even if this follow-up hydration didn't —
      // the user can just sign in normally with their new password.
      return { token: data.token, user: null };
    }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Password reset failed. The link may have expired.');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:       null,
    token:      localStorage.getItem('token') || null,
    isLoading:  false,
    isLoggedIn: false,
    error:      null,
  },
  reducers: {
    logout(state) {
      state.user       = null;
      state.token      = null;
      state.isLoggedIn = false;
      localStorage.removeItem('token');
    },
    clearError(state) { state.error = null; },
    // Allow manual hydration (e.g. after fetchMe on app load)
    setUser(state, { payload }) {
      state.user       = payload.user;
      state.token      = payload.token;
      state.isLoggedIn = true;
    },
  },
  extraReducers: (builder) => {
    const onPending   = (s) => { s.isLoading = true;  s.error = null; };
    const onRejected  = (s, { payload }) => { s.isLoading = false; s.error = payload; };
    const onAuthFulfilled = (s, { payload }) => {
      s.isLoading  = false;
      s.user       = payload.user;
      s.token      = payload.token;
      s.isLoggedIn = true;
      s.error      = null;
    };

    builder
      .addCase(loginUser.pending,   onPending)
      .addCase(loginUser.fulfilled, onAuthFulfilled)
      .addCase(loginUser.rejected,  onRejected)
      .addCase(registerUser.pending,   onPending)
      .addCase(registerUser.fulfilled, onAuthFulfilled)
      .addCase(registerUser.rejected,  onRejected)
      .addCase(fetchMe.fulfilled, (s, { payload }) => {
        s.user = payload; s.isLoggedIn = true;
      })
      .addCase(fetchMe.rejected, (s) => {
        s.user = null; s.token = null; s.isLoggedIn = false;
        localStorage.removeItem('token');
      })
      .addCase(updateProfile.fulfilled, (s, { payload }) => { s.user = payload; })
      .addCase(forgotPassword.pending,   onPending)
      .addCase(forgotPassword.fulfilled, (s) => { s.isLoading = false; s.error = null; })
      .addCase(forgotPassword.rejected,  onRejected)
      .addCase(resetPassword.pending,   onPending)
      .addCase(resetPassword.rejected,  onRejected)
      .addCase(resetPassword.fulfilled, (s, { payload }) => {
        s.isLoading = false;
        s.error     = null;
        if (payload.user) {
          s.user       = payload.user;
          s.token      = payload.token;
          s.isLoggedIn = true;
        }
      });
  },
});

export const { logout, clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
