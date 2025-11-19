import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Cấu hình Proxy cho Local Development
    // Giúp tránh lỗi CORS khi gọi API từ localhost
    proxy: {
      '/backend': {
        target: 'https://sora.com', // Target server (Sora/OpenAI endpoint)
        changeOrigin: true,
        secure: false,
        // cookieDomainRewrite: "localhost" // Đôi khi cần thiết nếu set cookie
      }
    }
  }
});