export default async function handler(request, response) {
  const backendUrl = process.env.BACKEND_API_URL;
  if (!backendUrl) {
    response.status(503).json({ message: 'The backend API is not configured for this deployment.' });
    return;
  }

  const backendPath = request.url.replace(/^\/api/, '');
  const headers = new Headers();
  for (const name of ['content-type', 'cookie', 'authorization', 'accept']) {
    const value = request.headers[name];
    if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }

  let body;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (request.body === undefined) {
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        request.on('data', (chunk) => chunks.push(chunk));
        request.on('end', () => resolve(Buffer.concat(chunks)));
        request.on('error', reject);
      });
    } else {
      body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    }
  }

  try {
    const upstream = await fetch(`${backendUrl.replace(/\/$/, '')}/api${backendPath}`, {
      method: request.method,
      headers,
      body,
    });
    const responseBody = Buffer.from(await upstream.arrayBuffer());
    response.status(upstream.status);

    for (const name of ['content-type', 'cache-control']) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }

    const cookies = upstream.headers.getSetCookie?.() || [];
    if (cookies.length) response.setHeader('set-cookie', cookies);
    response.send(responseBody);
  } catch (error) {
    console.error('Backend proxy request failed:', error);
    response.status(502).json({ message: 'The backend API is temporarily unavailable.' });
  }
}
