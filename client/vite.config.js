import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet', 'socket.io-client'],
  },
  build: {
    outDir:   'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:  ['react', 'react-dom', 'react-router-dom'],
          redux:   ['@reduxjs/toolkit', 'react-redux'],
          charts:  ['recharts'],
          motion:  ['framer-motion'],
          konva:   ['react-konva', 'konva'],
          maps:    ['leaflet', 'react-leaflet'],
          socket:  ['socket.io-client'],
        },
      },
    },
  },
});
