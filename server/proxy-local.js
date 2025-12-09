export default async function handler(req, res) {
  const targetUrl = 'http://localhost:3001' + req.url.replace('/api/proxy-local', '');
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: { ...req.headers },
    body: req.method !== 'GET' ? req.body : undefined,
  });
  const data = await response.arrayBuffer();
  res.status(response.status);
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }
  res.send(Buffer.from(data));
}
