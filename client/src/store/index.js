// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer    from './slices/authSlice';
import cartReducer    from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import productReducer from './slices/productSlice';
import orderReducer   from './slices/orderSlice';
import uiReducer      from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth:     authReducer,
    cart:     cartReducer,
    wishlist: wishlistReducer,
    products: productReducer,
    orders:   orderReducer,
    ui:       uiReducer,
  },
  middleware: (getDefault) =>
    getDefault({ serializableCheck: false }),
});

export default store;
