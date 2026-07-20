// src/store/slices/wishlistSlice.js
import { createSlice } from '@reduxjs/toolkit';

const loadWishlist = () => {
  try { return JSON.parse(localStorage.getItem('shirtcraft_wishlist') || '[]'); }
  catch { return []; }
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { items: loadWishlist() },
  reducers: {
    toggleWishlist(state, { payload }) {
      const idx = state.items.findIndex(i => i.id === payload.id);
      if (idx >= 0) {
        state.items.splice(idx, 1);
      } else {
        state.items.push(payload);
      }
      localStorage.setItem('shirtcraft_wishlist', JSON.stringify(state.items));
    },
    clearWishlist(state) {
      state.items = [];
      localStorage.removeItem('shirtcraft_wishlist');
    },
  },
});

export const selectWishlistItems  = (s) => s.wishlist.items;
export const selectIsWishlisted   = (id) => (s) => s.wishlist.items.some(i => i.id === id);
export const { toggleWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
