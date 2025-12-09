// api/proxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = (req, res) => {
  // 1. Tái tạo lại đường dẫn gốc từ query param (do vercel.json gửi sang)
  // Nếu không làm bước này, req.url sẽ bị biến thành "/api/proxy" và gọi sai API Google
  if (req.query && req.query.path) {
    req.url = req.query.path;
  }

  // 2. Khởi tạo Proxy
  const proxy = createProxyMiddleware({
    target: 'https://aisandbox-pa.googleapis.com',
    changeOrigin: true,
    secure: true,
    // Logic tiêm Header giống hệt Vite config của bạn
    onProxyReq: (proxyReq, req, res) => {
      // Spoof Origin and Referer
      proxyReq.setHeader('origin', 'https://labs.google');
      proxyReq.setHeader('referer', 'https://labs.google/');

      // Copy toàn bộ header giả mạo từ Vite config của bạn vào đây
      proxyReq.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');
      proxyReq.setHeader('x-browser-channel', 'stable');
      proxyReq.setHeader('x-browser-copyright', 'Copyright 2025 Google LLC. All Rights reserved.');
      proxyReq.setHeader('x-browser-validation', 'd//u4R5DiWup/ApEN0L4er68I4A=');
      proxyReq.setHeader('x-browser-year', '2025');
      proxyReq.setHeader('x-client-data', 'CJa2yQEIpLbJAQipncoBCM/nygEIlqHLAQiGoM0BCPudzwE=');
      proxyReq.setHeader('sec-ch-ua', '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"');
      proxyReq.setHeader('sec-ch-ua-mobile', '?0');
      proxyReq.setHeader('sec-ch-ua-platform', '"macOS"');
      proxyReq.setHeader('sec-fetch-dest', 'empty');
      proxyReq.setHeader('sec-fetch-mode', 'cors');
      proxyReq.setHeader('sec-fetch-site', 'cross-site');
      proxyReq.setHeader('priority', 'u=1, i');
      
      // Các header Accept
      proxyReq.setHeader('accept', '*/*');
      proxyReq.setHeader('accept-encoding', 'gzip, deflate, br, zstd');
      proxyReq.setHeader('accept-language', 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5');
    },
  });

  // 3. Thực thi proxy
  proxy(req, res, (result) => {
    if (result instanceof Error) {
      throw result;
    }
  });
};