import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ASU-Facilities-Hours-of-Operation-Webpage/',
  // Support both VITE_* and legacy CRA REACT_APP_* environment variables
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('mapbox-gl') || id.includes('react-map-gl') || id.includes('@vis.gl')) {
            return 'mapbox-vendor';
          }
          if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
