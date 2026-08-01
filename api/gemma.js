export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.SPUR_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'SPUR_API_KEY environment variable missing on server.' });
  }

  try {
    const upstream = await fetch('https://ai.spuric.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).send(errText);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    if (upstream.body.pipe) {
      upstream.body.pipe(res);
    } else {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal proxy error' });
  }
}
