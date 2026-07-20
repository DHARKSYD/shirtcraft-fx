// src/store/slices/uiSlice.js
import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    toast:          null,
    isNavOpen:      false,
    isSidebarOpen:  true,
    theme:          'light',
  },
  reducers: {
    showToast(state, { payload }) {
      // payload: { message, type: 'success'|'error'|'info', duration? }
      state.toast = payload;
    },
    hideToast(state) {
      state.toast = null;
    },
    toggleNav(state)       { state.isNavOpen     = !state.isNavOpen; },
    closeNav(state)        { state.isNavOpen     = false; },
    toggleSidebar(state)   { state.isSidebarOpen = !state.isSidebarOpen; },
  },
});

export const { showToast, hideToast, toggleNav, closeNav, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
