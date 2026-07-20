// src/store/slices/orderSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const createOrder = createAsyncThunk('orders/create', async (orderData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/orders', orderData);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to place order');
  }
});

export const fetchMyOrders = createAsyncThunk('orders/myOrders', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/orders/my');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch orders');
  }
});

export const fetchOrderById = createAsyncThunk('orders/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/orders/${id}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Order not found');
  }
});

export const cancelOrder = createAsyncThunk('orders/cancel', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/orders/${id}/cancel`);
    return data.order;
  } catch (err) {
    return rejectWithValue({
      message: err.response?.data?.message || 'Failed to cancel order',
      requiresSupport: err.response?.data?.requiresSupport || false,
    });
  }
});

export const verifyPayment = createAsyncThunk('orders/verifyPayment', async ({ orderId, reference }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/orders/verify-payment', { orderId, reference });
    return data.order;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Payment verification failed');
  }
});

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    list:      [],
    current:   null,
    isLoading: false,
    error:     null,
  },
  reducers: {
    clearCurrentOrder(state) { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending,   (s) => { s.isLoading = true;  s.error = null; })
      .addCase(createOrder.fulfilled, (s, { payload }) => { s.isLoading = false; s.current = payload; })
      .addCase(createOrder.rejected,  (s, { payload }) => { s.isLoading = false; s.error = payload; })
      .addCase(fetchMyOrders.pending,   (s) => { s.isLoading = true; })
      .addCase(fetchMyOrders.fulfilled, (s, { payload }) => { s.isLoading = false; s.list = payload; })
      .addCase(fetchMyOrders.rejected,  (s, { payload }) => { s.isLoading = false; s.error = payload; })
      .addCase(fetchOrderById.pending,   (s) => { s.isLoading = true;  s.error = null; })
      .addCase(fetchOrderById.fulfilled, (s, { payload }) => { s.isLoading = false; s.current = payload; })
      .addCase(fetchOrderById.rejected,  (s, { payload }) => { s.isLoading = false; s.error = payload; })
      .addCase(cancelOrder.fulfilled, (s, { payload }) => {
        s.list = s.list.map(o => o._id === payload._id ? payload : o);
        if (s.current?._id === payload._id) s.current = payload;
      })
      .addCase(verifyPayment.fulfilled, (s, { payload }) => {
        s.list = s.list.map(o => o._id === payload._id ? payload : o);
        if (s.current?._id === payload._id) s.current = payload;
      });
  },
});

export const { clearCurrentOrder } = orderSlice.actions;
export default orderSlice.reducer;
