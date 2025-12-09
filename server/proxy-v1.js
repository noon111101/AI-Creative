export default async function handler(req, res) {
  const targetUrl = 'https://aisandbox-pa.googleapis.com' + req.url.replace('/api/proxy-v1', '');
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      ...req.headers,
      origin: 'https://labs.google',
      referer: 'https://labs.google/',
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
