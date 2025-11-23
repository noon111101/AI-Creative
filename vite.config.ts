import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Proxy removed to avoid Cloudflare server-side blocking.
  // We now rely on Direct Requests + Browser CORS Extension.
});