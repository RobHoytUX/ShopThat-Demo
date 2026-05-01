const { getSession, readJsonBody } = require('../auth/_auth');

module.exports = async function keywordsGraph(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const graphApiUrl = process.env.KEYWORDS_GRAPH_API_URL;
  if (!graphApiUrl) {
    return res.status(501).json({ error: 'Keywords graph API is not configured' });
  }

  try {
    const upstreamOptions = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (req.method === 'POST') {
      upstreamOptions.body = JSON.stringify(await readJsonBody(req));
    }

    const upstreamResponse = await fetch(graphApiUrl, upstreamOptions);
    const responseBody = await upstreamResponse.text();

    res.status(upstreamResponse.status);
    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json');
    return res.send(responseBody);
  } catch (error) {
    return res.status(502).json({ error: 'Keywords graph API request failed' });
  }
};
