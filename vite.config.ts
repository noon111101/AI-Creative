
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Proxy removed to prevent Cloudflare IP blocking. 
  // User must use CORS extension in browser.
});
