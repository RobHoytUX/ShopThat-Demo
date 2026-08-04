const IMAGE_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function isPrivateHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local')) return true;
  if (host === '0.0.0.0' || host === '::1') return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
  }
  return false;
}

/**
 * Same-origin image proxy so Related Articles thumbnails work when publishers
 * block hotlinking. GET /api/link-preview/image?url=https://...
 */
module.exports = async function linkPreviewImage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const incoming = new URL(req.url, 'http://localhost');
  const target = String(incoming.searchParams.get('url') || '').trim();
  if (!target) {
    return res.status(400).json({ error: 'url query parameter is required' });
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid url' });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http(s) urls are allowed' });
  }
  if (isPrivateHostname(parsed.hostname)) {
    return res.status(400).json({ error: 'That host is not allowed' });
  }

  let upstream;
  try {
    upstream = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'ShopThatDemoLinkPreview/1.0 (+https://agallery.ai)'
      },
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS)
    });
  } catch (error) {
    const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return res.status(504).json({
      error: timedOut ? 'Image fetch timed out' : 'Image fetch failed'
    });
  }

  if (!upstream.ok) {
    return res.status(502).json({ error: 'Upstream image returned an error' });
  }

  const contentType = String(upstream.headers.get('content-type') || 'application/octet-stream');
  if (!/^image\//i.test(contentType) && !/octet-stream/i.test(contentType)) {
    return res.status(415).json({ error: 'Upstream response is not an image' });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (!buffer.length) {
    return res.status(502).json({ error: 'Empty image' });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: 'Image too large' });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', contentType.split(';')[0].trim() || 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Content-Length', String(buffer.length));
  return res.end(buffer);
};
