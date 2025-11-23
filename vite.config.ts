import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Cấu hình Proxy cho Local Development
    proxy: {
      '/backend': {
        target: 'https://sora.chatgpt.com', 
        changeOrigin: true,
        secure: false, // Bỏ qua lỗi SSL nếu có
        // Cấu hình nâng cao để "đánh lừa" server đích
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('❌ Proxy Error:', err);
          });

          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Log để biết request đang được gửi đi
            console.log('🔀 Proxying request:', req.method, req.url, '=>', 'https://sora.chatgpt.com' + req.url);

            // QUAN TRỌNG: Ghi đè Origin và Referer để vượt qua bảo mật của server đích
            proxyReq.setHeader('Origin', 'https://sora.chatgpt.com');
            proxyReq.setHeader('Referer', 'https://sora.chatgpt.com/');
            
            // Xóa header cookie nếu cần thiết (tránh xung đột cookie localhost), 
            // nhưng ở đây ta giữ lại vì có thể cần cookie phiên làm việc nếu không dùng Bearer Token
            // proxyReq.removeHeader('cookie');
          });

          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('✅ Received response from target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
});