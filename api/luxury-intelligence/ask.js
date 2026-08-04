const { readJsonBody } = require('../auth/_auth');

const DEFAULT_UPSTREAM_URL = 'https://t25iit8zn5.execute-api.us-east-1.amazonaws.com/v1/chat';
const DEFAULT_STORE_LOCATION = 'Louis Vuitton, 6 East 57th Street, New York';
// Answers routinely take ~15s, so the ceiling has to sit well above that.
const UPSTREAM_TIMEOUT_MS = 60000;

/**
 * Proxy for the Luxury Intelligence chat API. It exists so the API key stays
 * server-side: the browser only ever talks to this same-origin route, which
 * is also what the deployed `connect-src 'self'` CSP allows.
 *
 * Upstream speaks `{ message, store_location }` and answers with
 * `{ answer, image_url, sources }`. The response is reshaped into the
 * `{ answer, images, sources }` form the WebDemo chat clients consume; venue
 * matching and image selection happen client-side, where the venue catalog
 * with map coordinates already lives.
 */
module.exports = async function askLuxuryIntelligence(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const upstreamUrl = process.env.LUXURY_INTELLIGENCE_ASK_URL || DEFAULT_UPSTREAM_URL;
  const apiKey = process.env.LUXURY_INTELLIGENCE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Luxury Intelligence API key is not configured' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return res.status(400).json({ error: 'Request body must be JSON' });
  }

  const message = String((body && (body.message || body.query)) || '').trim();
  if (!message) {
    return res.status(400).json({ error: 'A message is required' });
  }
  const storeLocation = String((body && body.store_location) || DEFAULT_STORE_LOCATION);

  let upstreamResponse;
  let responseText;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ message, store_location: storeLocation }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
    responseText = await upstreamResponse.text();
  } catch (error) {
    const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return res.status(504).json({
      error: timedOut
        ? 'Luxury Intelligence took too long to answer'
        : 'Luxury Intelligence request failed'
    });
  }

  if (!upstreamResponse.ok) {
    // Deliberately not forwarding the upstream body: it can echo request
    // details, and the status is all the client needs to show its error state.
    return res.status(upstreamResponse.status === 403 ? 502 : upstreamResponse.status)
      .json({ error: 'Luxury Intelligence returned an error' });
  }

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    return res.status(502).json({ error: 'Luxury Intelligence returned an unreadable response' });
  }

  const imageUrl = String((parsed && parsed.image_url) || '').trim();
  return res.status(200).json({
    answer: String((parsed && parsed.answer) || ''),
    images: imageUrl ? [imageUrl] : [],
    sources: Array.isArray(parsed && parsed.sources)
      ? parsed.sources.map((s) => String(s)).filter(Boolean)
      : []
  });
};
