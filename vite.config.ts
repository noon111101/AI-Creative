import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/backend': {
        target: 'https://sora.chatgpt.com',
        changeOrigin: true,
        secure: true,
        // Advanced Spoofing to bypass Cloudflare and CORS checks
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Spoof Origin and Referer to look like a legitimate request from Sora website
            proxyReq.setHeader('origin', 'https://sora.chatgpt.com');
            proxyReq.setHeader('referer', 'https://sora.chatgpt.com/');
            
            // Spoof User-Agent to look like a real browser (Chrome on Mac)
            proxyReq.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Remove sensitive headers that might trigger bot detection
            proxyReq.removeHeader('x-forwarded-for');
            proxyReq.removeHeader('via');
          });
          
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy Error:', err);
          });
        },
      },
      '/v1': {
        target: 'https://aisandbox-pa.googleapis.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('origin', 'https://labs.google');
            proxyReq.setHeader('referer', 'https://labs.google/');
            proxyReq.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');
            
            // Headers from curl
            proxyReq.setHeader('x-browser-channel', 'stable');
            proxyReq.setHeader('x-browser-year', '2025');
            proxyReq.setHeader('x-browser-copyright', 'Copyright 2025 Google LLC. All Rights reserved.');
            proxyReq.setHeader('x-browser-validation', 'd//u4R5DiWup/ApEN0L4er68I4A=');
            proxyReq.setHeader('x-client-data', 'CJa2yQEIpLbJAQipncoBCM/nygEIkqHLAQiGoM0BCPSYzwE=');
            
            proxyReq.setHeader('sec-fetch-dest', 'empty');
            proxyReq.setHeader('sec-fetch-mode', 'cors');
            proxyReq.setHeader('sec-fetch-site', 'cross-site');
            proxyReq.setHeader('sec-ch-ua', '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"');
            proxyReq.setHeader('sec-ch-ua-mobile', '?0');
            proxyReq.setHeader('sec-ch-ua-platform', '"macOS"');
          });
        }
      }
    }
  }
});