export default async function handler(req, res) {
  const targetUrl = 'https://sora.chatgpt.com' + req.url.replace('/api/proxy-backend', '');
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      ...req.headers,
      origin: 'https://sora.chatgpt.com',
      referer: 'https://sora.chatgpt.com/',
    },
    body: req.method !== 'GET' ? req.body : undefined,
  });
  const data = await response.arrayBuffer();
  res.status(response.status);
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }
  res.send(Buffer.from(data));
}
