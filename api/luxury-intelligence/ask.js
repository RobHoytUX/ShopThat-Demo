const { getSession, readJsonBody } = require('../auth/_auth');

module.exports = async function askLuxuryIntelligence(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSession(req);
  const allowLocalDev = process.env.NODE_ENV !== 'production';
  if (!session && !allowLocalDev) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const upstreamUrl = process.env.LUXURY_INTELLIGENCE_ASK_URL;
  if (!upstreamUrl) {
    return res.status(500).json({ error: 'Luxury Intelligence API is not configured' });
  }

  try {
    const body = await readJsonBody(req);
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: String(body.query || '') })
    });
    const responseBody = await upstreamResponse.text();

    res.status(upstreamResponse.status);
    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json');
    return res.send(responseBody);
  } catch (error) {
    return res.status(502).json({ error: 'Luxury Intelligence API request failed' });
  }
};
