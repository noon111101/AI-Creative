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
            // Spoof Origin and Referer
            proxyReq.setHeader('origin', 'https://labs.google');
            proxyReq.setHeader('referer', 'https://labs.google/');
            
            // Exact Headers from Windows Curl
            proxyReq.setHeader('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');
            proxyReq.setHeader('x-browser-channel', 'stable');
            proxyReq.setHeader('x-browser-copyright', 'Copyright 2025 Google LLC. All rights reserved.');
            proxyReq.setHeader('x-browser-validation', 'Aj9fzfu+SaGLBY9Oqr3S7RokOtM=');
            proxyReq.setHeader('x-browser-year', '2025');
            proxyReq.setHeader('x-client-data', 'CIS2yQEIpLbJAQipncoBCLnZygEIlaHLAQiFoM0BCPOYzwEI+J3PAQ==');
            
            proxyReq.setHeader('sec-ch-ua', '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"');
            proxyReq.setHeader('sec-ch-ua-mobile', '?0');
            proxyReq.setHeader('sec-ch-ua-platform', '"Windows"');
            proxyReq.setHeader('sec-fetch-dest', 'empty');
            proxyReq.setHeader('sec-fetch-mode', 'cors');
            proxyReq.setHeader('sec-fetch-site', 'cross-site');
            proxyReq.setHeader('priority', 'u=1, i');
          });

          // Handle Response to prevent CORS issues on Localhost
          // proxy.on('proxyRes', (proxyRes, req, res) => {
          //   // Strip upstream CORS headers to avoid conflicts
          //   delete proxyRes.headers['access-control-allow-origin'];
          //   delete proxyRes.headers['access-control-allow-methods'];
          //   delete proxyRes.headers['access-control-allow-headers'];

          //   // Add permissive CORS headers for Localhost
          //   proxyRes.headers['access-control-allow-origin'] = '*';
          //   proxyRes.headers['access-control-allow-methods'] = 'GET, POST, OPTIONS, PUT, DELETE, PATCH';
          //   proxyRes.headers['access-control-allow-headers'] = '*';
          // });
        }
      }
    }
  }
});