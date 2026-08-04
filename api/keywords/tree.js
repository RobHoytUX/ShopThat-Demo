const DEFAULT_UPSTREAM_URL =
  'https://t25iit8zn5.execute-api.us-east-1.amazonaws.com/v1/keywords/tree';
const UPSTREAM_TIMEOUT_MS = 30000;

/**
 * Same-origin proxy for GET /keywords/tree so the API key never reaches the
 * browser. Forwards brand_id or subject_id query params unchanged.
 *
 * Brand view:  /api/keywords/tree?brand_id=lv-lvmh
 * Store view:  /api/keywords/tree?subject_id=store-nyc-57th
 */
module.exports = async function keywordsTree(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.LUXURY_INTELLIGENCE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Intelligence API key is not configured' });
  }

  const askUrl = process.env.LUXURY_INTELLIGENCE_ASK_URL || '';
  const upstreamUrl = process.env.KEYWORDS_TREE_API_URL
    || (askUrl ? askUrl.replace(/\/chat\/?$/, '/keywords/tree') : DEFAULT_UPSTREAM_URL);

  const incoming = new URL(req.url, 'http://localhost');
  const brandId = incoming.searchParams.get('brand_id');
  const subjectId = incoming.searchParams.get('subject_id');
  if (!brandId && !subjectId) {
    return res.status(400).json({
      error: 'Provide brand_id (e.g. lv-lvmh) or subject_id (e.g. store-nyc-57th)'
    });
  }

  const upstream = new URL(upstreamUrl);
  if (brandId) upstream.searchParams.set('brand_id', brandId);
  if (subjectId) upstream.searchParams.set('subject_id', subjectId);

  let upstreamResponse;
  let responseText;
  try {
    upstreamResponse = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-api-key': apiKey
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
    responseText = await upstreamResponse.text();
  } catch (error) {
    const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return res.status(504).json({
      error: timedOut
        ? 'Keywords tree took too long to load'
        : 'Keywords tree request failed'
    });
  }

  if (!upstreamResponse.ok) {
    return res.status(upstreamResponse.status === 403 ? 502 : upstreamResponse.status)
      .json({ error: 'Keywords tree returned an error' });
  }

  res.status(200);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.send(responseText);
};
