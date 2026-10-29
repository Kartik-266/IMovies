import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// In dev/preview, /api is proxied to the Express server so cookies stay same-origin.
const target = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';
const proxy = { '/api': { target, changeOrigin: false }, '/socket.io': { target, ws: true, changeOrigin: false } };

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_ALLOW_SIMULATED_OUTCOME_SELECTION': JSON.stringify(process.env.VITE_ALLOW_SIMULATED_OUTCOME_SELECTION || 'true'),
  },
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', globals: true, css: false },
});
