// src/store/slices/cartSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

const loadCart = () => {
  try {
    const saved = localStorage.getItem('shirtcraft_cart');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

const saveCart = (items) => {
  try {
    localStorage.setItem('shirtcraft_cart', JSON.stringify(items));
  } catch {}
};

// ── Validate a coupon code against the real backend ─────────────────
// (the authoritative discount is always re-checked again server-side when
// the order is actually placed — this is just for cart/checkout preview)
export const validateCoupon = createAsyncThunk(
  'cart/validateCoupon',
  async (code, { getState, rejectWithValue }) => {
    try {
      const orderValue = selectCartSubtotal(getState());
      const { data } = await api.post('/coupons/validate', { code, orderValue });
      return data; // { code, discount, type }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Invalid or expired coupon code.');
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items:              loadCart(),
    coupon:             null,
    discount:           0,
    couponType:         'percentage', // 'percentage' | 'fixed'
    isValidatingCoupon: false,
    couponError:        null,
    isOpen:             false,
  },
  reducers: {
    addToCart(state, { payload }) {
      // payload: { id, name, price, image, size, color, quantity, customDesign?, stock? }
      // `stock` is optional — catalog products pass their current stock so
      // the cart can stop someone from silently piling up more than is
      // available; custom designs (made to order) simply omit it.
      const key = `${payload.id}-${payload.size}-${payload.color}`;
      const idx = state.items.findIndex(i => `${i.id}-${i.size}-${i.color}` === key);
      const ceiling = typeof payload.stock === 'number' ? payload.stock : undefined;

      // Nothing to add if the product is already known to be out of stock.
      if (ceiling !== undefined && ceiling <= 0) return;

      if (idx >= 0) {
        const requested = state.items[idx].quantity + (payload.quantity || 1);
        const cap = ceiling ?? state.items[idx].stock;
        state.items[idx].quantity = typeof cap === 'number' ? Math.min(requested, cap) : requested;
        if (ceiling !== undefined) state.items[idx].stock = ceiling; // keep the snapshot fresh
      } else {
        const requested = payload.quantity || 1;
        state.items.push({
          ...payload,
          cartKey:  key,
          quantity: typeof ceiling === 'number' ? Math.min(requested, ceiling) : requested,
        });
      }
      saveCart(state.items);
    },
    removeFromCart(state, { payload }) {
      state.items = state.items.filter(i => i.cartKey !== payload);
      saveCart(state.items);
    },
    updateQuantity(state, { payload: { cartKey, quantity } }) {
      const idx = state.items.findIndex(i => i.cartKey === cartKey);
      if (idx >= 0) {
        const cap = state.items[idx].stock;
        const clamped = typeof cap === 'number' ? Math.min(quantity, cap) : quantity;
        if (clamped <= 0) {
          state.items.splice(idx, 1);
        } else {
          state.items[idx].quantity = clamped;
        }
      }
      saveCart(state.items);
    },
    clearCart(state) {
      state.items       = [];
      state.coupon       = null;
      state.discount     = 0;
      state.couponType   = 'percentage';
      state.couponError  = null;
      localStorage.removeItem('shirtcraft_cart');
    },
    applyCoupon(state, { payload }) {
      // payload: { code, discount, type? }
      state.coupon      = payload.code;
      state.discount    = payload.discount;
      state.couponType  = payload.type || 'percentage';
      state.couponError = null;
    },
    removeCoupon(state) {
      state.coupon      = null;
      state.discount     = 0;
      state.couponType   = 'percentage';
      state.couponError  = null;
    },
    toggleCart(state) {
      state.isOpen = !state.isOpen;
    },
    openCart(state)  { state.isOpen = true;  },
    closeCart(state) { state.isOpen = false; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateCoupon.pending, (state) => {
        state.isValidatingCoupon = true;
        state.couponError        = null;
      })
      .addCase(validateCoupon.fulfilled, (state, { payload }) => {
        state.isValidatingCoupon = false;
        state.coupon             = payload.code;
        state.discount           = payload.discount;
        state.couponType         = payload.type || 'percentage';
        state.couponError        = null;
      })
      .addCase(validateCoupon.rejected, (state, { payload }) => {
        state.isValidatingCoupon = false;
        state.couponError        = payload || 'Invalid or expired coupon code.';
      });
  },
});

// ─── Selectors ────────────────────────────────────────────────────
export const selectCartItems     = (s) => s.cart.items;
export const selectCartCount     = (s) => s.cart.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartSubtotal  = (s) => s.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
export const selectCartDiscount  = (s) => s.cart.discount;
export const selectCartCouponType = (s) => s.cart.couponType || 'percentage';

// The actual Naira amount taken off — handles both percentage and fixed
// coupon types, and never discounts below zero.
export const selectCartDiscountAmount = (s) => {
  const sub  = selectCartSubtotal(s);
  const disc = selectCartDiscount(s);
  if (!disc) return 0;
  const amt = selectCartCouponType(s) === 'fixed' ? disc : (sub * disc) / 100;
  return Math.min(amt, sub);
};

export const selectCartTotal = (s) => {
  const sub = selectCartSubtotal(s);
  return Math.max(0, sub - selectCartDiscountAmount(s));
};

export const {
  addToCart, removeFromCart, updateQuantity, clearCart,
  applyCoupon, removeCoupon, toggleCart, openCart, closeCart,
} = cartSlice.actions;

export default cartSlice.reducer;
