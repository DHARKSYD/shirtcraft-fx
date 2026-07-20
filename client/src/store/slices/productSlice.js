// src/store/slices/productSlice.js — full API integration
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchProducts = createAsyncThunk('products/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/products', { params });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch products');
  }
});

export const fetchFeaturedProducts = createAsyncThunk('products/fetchFeatured', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/products/featured');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch featured products');
  }
});

export const fetchProductById = createAsyncThunk('products/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/products/${id}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Product not found');
  }
});

export const createProduct = createAsyncThunk('products/create', async (productData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/products', productData);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create product');
  }
});

export const updateProduct = createAsyncThunk('products/update', async ({ id, updates }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/products/${id}`, updates);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update product');
  }
});

export const deleteProduct = createAsyncThunk('products/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/products/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete product');
  }
});

const productSlice = createSlice({
  name: 'products',
  initialState: {
    list:      [],
    featured:  [],
    current:   null,
    total:     0,
    pages:     0,
    isLoading: false,
    error:     null,
    filters: {
      search:'', category:'', size:'', color:'',
      minPrice:0, maxPrice:100000, sort:'newest', page:1, limit:12,
    },
  },
  reducers: {
    // Changing an actual filter (category, search, colour, sort...) should
    // always snap back to page 1 — you're looking at a different result
    // set, so whatever page you were on may not even exist anymore.
    setFilters(state, { payload }) { state.filters = { ...state.filters, ...payload, page:1 }; },
    // Navigating to a specific page must NOT go through setFilters, or its
    // unconditional `page:1` stomps the very page number being requested.
    // This was the pagination bug: clicking "2" dispatched
    // setFilters({page:2}), which then got overwritten to page:1 in the
    // same reducer, so page 2 (and beyond) could never actually load.
    setPage(state, { payload }) { state.filters = { ...state.filters, page: payload }; },
    resetFilters(state) {
      state.filters = { search:'', category:'', size:'', color:'', minPrice:0, maxPrice:100000, sort:'newest', page:1, limit:12 };
    },
    clearCurrent(state) { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending,   s => { s.isLoading = true;  s.error = null; })
      .addCase(fetchProducts.fulfilled, (s, { payload }) => {
        s.isLoading = false;
        s.list  = payload.products;
        s.total = payload.total;
        s.pages = payload.pages;
      })
      .addCase(fetchProducts.rejected,  (s, { payload }) => { s.isLoading = false; s.error = payload; })
      .addCase(fetchFeaturedProducts.fulfilled, (s, { payload }) => { s.featured = payload; })
      .addCase(fetchProductById.pending,   s => { s.isLoading = true; s.current = null; })
      .addCase(fetchProductById.fulfilled, (s, { payload }) => { s.isLoading = false; s.current = payload; })
      .addCase(fetchProductById.rejected,  (s, { payload }) => { s.isLoading = false; s.error = payload; })
      .addCase(createProduct.fulfilled, (s, { payload }) => { s.list = [payload, ...s.list]; })
      .addCase(updateProduct.fulfilled, (s, { payload }) => {
        s.list = s.list.map(p => p._id === payload._id ? payload : p);
        if (s.current?._id === payload._id) s.current = payload;
      })
      .addCase(deleteProduct.fulfilled, (s, { payload: id }) => {
        s.list = s.list.filter(p => p._id !== id);
      });
  },
});

export const { setFilters, setPage, resetFilters, clearCurrent } = productSlice.actions;
export default productSlice.reducer;
