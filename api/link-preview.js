const PREVIEW_TIMEOUT_MS = 8000;
const MAX_HTML_CHARS = 400000;
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

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

function metaContent(html, property) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["'][^>]*>`,
      'i'
    )
  ];
  for (let i = 0; i < patterns.length; i += 1) {
    const match = patterns[i].exec(html);
    if (match && match[1]) return match[1].trim();
  }
  return '';
}

function documentTitle(html) {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return match && match[1] ? match[1].trim().replace(/\s+/g, ' ') : '';
}

function absolutize(baseUrl, maybeRelative) {
  if (!maybeRelative) return '';
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch (_) {
    return '';
  }
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
}

/**
 * Same-origin Open Graph / Twitter Card extractor for Related Articles thumbnails.
 * GET /api/link-preview?url=https://example.com/article
 */
module.exports = async function linkPreview(req, res) {
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

  const cacheKey = parsed.toString();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(cached.payload);
  }

  let response;
  let html = '';
  try {
    response = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'ShopThatDemoLinkPreview/1.0 (+https://agallery.ai)'
      },
      signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS)
    });
    html = await response.text();
    if (html.length > MAX_HTML_CHARS) html = html.slice(0, MAX_HTML_CHARS);
  } catch (error) {
    const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return res.status(504).json({
      error: timedOut ? 'Link preview timed out' : 'Link preview failed'
    });
  }

  if (!response.ok) {
    return res.status(502).json({ error: 'Upstream article returned an error' });
  }

  const imageRaw =
    metaContent(html, 'og:image') ||
    metaContent(html, 'og:image:url') ||
    metaContent(html, 'twitter:image') ||
    metaContent(html, 'twitter:image:src');
  const titleRaw =
    metaContent(html, 'og:title') ||
    metaContent(html, 'twitter:title') ||
    documentTitle(html);
  const descriptionRaw =
    metaContent(html, 'og:description') ||
    metaContent(html, 'twitter:description') ||
    metaContent(html, 'description');

  const payload = {
    url: cacheKey,
    image: absolutize(cacheKey, decodeEntities(imageRaw)),
    title: decodeEntities(titleRaw),
    description: decodeEntities(descriptionRaw)
  };

  cache.set(cacheKey, { at: Date.now(), payload });
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json(payload);
};
