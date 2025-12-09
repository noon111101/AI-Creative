import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/v1': {
        target: 'https://aisandbox-pa.googleapis.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Spoof Origin and Referer
            proxyReq.setHeader('origin', 'https://labs.google');
            proxyReq.setHeader('referer', 'https://labs.google/');
          });
        }
      }
    }
  }
});