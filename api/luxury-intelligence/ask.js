const { readJsonBody } = require('../auth/_auth');

// ────────────────────────────────────────────────────────────────────────
// Curated allow-list mirroring WebDemo/scripts/keywords-data.js, broken
// down by NY area so a question about "57th St. restaurants" only
// surfaces venues nested under that node (same for SoHo). Queries that
// mention restaurants, hotels, or galleries/museums get an explicit
// constraint appended so the upstream Luxury Intelligence model can
// only recommend venues that exist in our curated keyword graph.
// ────────────────────────────────────────────────────────────────────────
const ALLOWED_KEYWORDS = {
  restaurants: {
    '57th St.': [
      'The Mark', 'Gabriel Kreuther', 'THE GRILL', 'KANG HO DONG',
      'Le Pavillon', 'Marea', 'The Modern', 'Le Bernardin', 'Cafe Carlyle',
      'DANIEL', 'Le Bilboquet'
    ],
    'SoHo': [
      'BAR PITTI', 'MINETTA TAVERN', 'SHUKO', 'IL BUCO ALIMENTARI',
      'BALTHAZAR', 'JOSEPH LEONARD', 'ESTELLA', "JACK'S WIFE FRIEDA",
      'FRENCHETTE', "L'ABEILLE", 'LOCANDA VERDE', 'DIRTY FRENCH',
      '63 CLINTON', 'ST AMBROEUS', 'OMEN', "THE BUTCHER'S DAUGHTER",
      'INDOCHINE', 'LA MERCERIE', 'LE COUCOU'
    ]
  },
  hotels: {
    '57th St.': [
      'Ace Hotel', 'The Baccarat Hotel', 'The Plaza', 'CIVILIAN Hotel',
      'ST Regis', 'Times Square Edition', 'The Mark Hotel'
    ],
    'SoHo': [
      'CROSBY STREET HOTEL', 'THE BOWERY HOTEL',
      'THE STANDARD EAST VILLAGE', 'THE MERCER', 'THE GREENWICH',
      'HOTEL BARRIERE FOUQUET', 'PUBLIC'
    ]
  },
  galleries: {
    'Kusama': [
      'Victoria Miro', 'David Zwirner', 'Fondation LV', 'Kusama Museum'
    ],
    '57th St.': [
      'MoMA Museum', 'Metropolitan Museum of Art', 'The Guggenheim',
      'The Frick Collection', 'Pace Gallery', 'David Zwirner Chelsea',
      'Gagosian Chelsea', 'Hauser & Wirth Chelsea'
    ],
    'SoHo': [
      'David Zwirner Gallery', 'Jack Shainman Gallery', 'Hauser & Wirth',
      'Gladstone Gallery', 'Gagosian Gallery', 'Lehmann Maupin',
      'New Museum', 'The Drawing Center', 'Museum of Ice Cream',
      'Leslie-Lohman Museum of Art'
    ]
  }
};

const CATEGORY_TRIGGERS = {
  restaurants: {
    re: /\b(restaurant|restaurants|restaruant|restaruants|restaraunt|restaraunts|restuarant|restuarants|resturant|resturants|dining|dine|diner|dinner|lunch|brunch|supper|cafe|caf[eé]s?|bistro|bistros|eatery|eateries|brasserie|brasseries|food|eat|where\s+to\s+eat)\b/i,
    label: 'restaurants'
  },
  hotels: {
    re: /\b(hotel|hotels|stay|stays|accommodation|accommodations|lodging|resort|resorts|suite|suites)\b/i,
    label: 'hotels'
  },
  galleries: {
    re: /\b(gallery|galleries|museum|museums|exhibition|exhibitions|art\s+space)\b/i,
    label: 'galleries & museums'
  }
};

const AREA_TRIGGERS = {
  '57th St.': /\b(57\s*th(?:\s|-)?(?:st\.?|street)?|fifty[-\s]?seventh\s+street|midtown)\b/i,
  'SoHo':     /\b(soho|so-?ho)\b/i
};

// Venue → image catalog (mirrors WebDemo/scripts/luxury-intelligence.js).
// Paths are resolved by the WebDemo frontend that consumes the response.
const VENUE_IMAGES = {
  'The Modern':           { url: 'assets/restaurants/the-modern.jpg',         area: '57th St.', category: 'restaurants' },
  'Le Bernardin':         { url: 'assets/restaurants/le-bernardin.jpg',       area: '57th St.', category: 'restaurants' },
  'Cafe Carlyle':         { url: 'assets/restaurants/cafe-carlyle.jpg',       area: '57th St.', category: 'restaurants' },
  'Marea':                { url: 'assets/restaurants/marea.jpg',              area: '57th St.', category: 'restaurants' },
  'The Mark':             { url: 'assets/restaurants/the-mark-restaurant.jpg', area: '57th St.', category: 'restaurants' },
  'Le Bilboquet':         { url: 'assets/restaurants/le-bilboquet.jpg',       area: '57th St.', category: 'restaurants' },
  'DANIEL':               { area: '57th St.', category: 'restaurants' },
  'The Plaza':            { url: 'assets/restaurants/the-plaza.jpg',          area: '57th St.', category: 'hotels' },
  'The Mark Hotel':       { url: 'assets/restaurants/mark-hotel.jpg',         area: '57th St.', category: 'hotels' },
  'The Baccarat Hotel':   { url: 'assets/restaurants/baccarat.jpg',           area: '57th St.', category: 'hotels' },
  'The Baccarat':         { url: 'assets/restaurants/baccarat.jpg',           area: '57th St.', category: 'hotels' },
  'ST Regis':             { url: 'assets/restaurants/st-regis.jpg',           area: '57th St.', category: 'hotels' },
  'The St. Regis':        { url: 'assets/restaurants/st-regis.jpg',           area: '57th St.', category: 'hotels' },
  'The Carlyle':          { url: 'assets/restaurants/carlyle-hotel.jpg',      area: '57th St.', category: 'hotels' },
  'MoMA Museum':                 { url: 'assets/museums/moma.jpg',         area: 'Kusama', category: 'galleries' },
  'Metropolitan Museum of Art':  { url: 'assets/museums/met-museum.jpg',   area: 'Kusama', category: 'galleries' },
  'The Guggenheim':              { url: 'assets/museums/guggenheim.jpg',   area: '57th St.', category: 'galleries' },
  'The Frick Collection':        { url: 'assets/museums/frick.jpg',        area: '57th St.', category: 'galleries' },
  'Fondation LV':                { url: 'assets/foundation-lv-png.png',    area: 'Kusama', category: 'galleries' },
  'Pace Gallery':                { url: 'assets/kusama-gal1.png',          area: '57th St.', category: 'galleries' },
  'David Zwirner Chelsea':       { url: 'assets/kusama-gal2.png',          area: '57th St.', category: 'galleries' },
  'Gagosian Chelsea':            { url: 'assets/kusama-gal3.png',          area: '57th St.', category: 'galleries' },
  'Hauser & Wirth Chelsea':      { url: 'assets/kusama-gal4.png',          area: '57th St.', category: 'galleries' },

  'BALTHAZAR':                   { url: 'assets/soho/restaurants/balthazar.png',          area: 'SoHo', category: 'restaurants' },
  'MINETTA TAVERN':              { url: 'assets/soho/restaurants/minetta-tavern.png',     area: 'SoHo', category: 'restaurants' },
  'LA MERCERIE':                 { url: 'assets/soho/restaurants/la-mercerie.png',        area: 'SoHo', category: 'restaurants' },
  'LOCANDA VERDE':               { url: 'assets/soho/restaurants/locanda-verde.png',      area: 'SoHo', category: 'restaurants' },
  'IL BUCO ALIMENTARI':          { url: 'assets/soho/restaurants/il-buco-alimentari.jpg', area: 'SoHo', category: 'restaurants' },
  'BAR PITTI':                   { url: 'assets/soho/restaurants/bar-pitti.png',          area: 'SoHo', category: 'restaurants' },
  'ST AMBROEUS':                 { url: 'assets/soho/restaurants/st-ambroeus.png',        area: 'SoHo', category: 'restaurants' },
  'ESTELLA':                     { url: 'assets/soho/restaurants/estela.png',             area: 'SoHo', category: 'restaurants' },
  "THE BUTCHER'S DAUGHTER":      { url: 'assets/soho/restaurants/butchers-daughter.png',  area: 'SoHo', category: 'restaurants' },

  'THE MERCER':                  { url: 'assets/soho/hotels/the-mercer.png',              area: 'SoHo', category: 'hotels' },
  'CROSBY STREET HOTEL':         { url: 'assets/soho/hotels/crosby-street-hotel.png',     area: 'SoHo', category: 'hotels' },
  'THE BOWERY HOTEL':            { url: 'assets/soho/hotels/the-bowery-hotel.png',        area: 'SoHo', category: 'hotels' },
  'THE GREENWICH':               { url: 'assets/soho/hotels/the-greenwich.png',           area: 'SoHo', category: 'hotels' },
  'THE STANDARD EAST VILLAGE':   { url: 'assets/soho/hotels/standard-east-village.png',   area: 'SoHo', category: 'hotels' },
  'PUBLIC':                      { url: 'assets/soho/hotels/public.png',                  area: 'SoHo', category: 'hotels' },
  'HOTEL BARRIERE FOUQUET':      { url: 'assets/soho/hotels/hotel-barriere-fouquet.png', area: 'SoHo', category: 'hotels' },

  'David Zwirner Gallery':       { url: 'assets/soho/galleries/david-zwirner.png',        area: 'SoHo', category: 'galleries' },
  'Jack Shainman Gallery':       { url: 'assets/soho/galleries/jack-shainman.png',        area: 'SoHo', category: 'galleries' },
  'Hauser & Wirth':              { url: 'assets/soho/galleries/hauser-wirth.png',         area: 'SoHo', category: 'galleries' },
  'Gladstone Gallery':           { url: 'assets/soho/galleries/gladstone-gallery.png',    area: 'SoHo', category: 'galleries' },
  'Gagosian Gallery':            { url: 'assets/soho/galleries/gagosian-gallery.png',     area: 'SoHo', category: 'galleries' },
  'Lehmann Maupin':              { url: 'assets/soho/galleries/lehmann-maupin.png',       area: 'SoHo', category: 'galleries' }
};

function escapeRegExp(s) {
  return String(s).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function findMentionedVenues(answer, venues) {
  const text = String(answer || '');
  if (!text || !Array.isArray(venues) || !venues.length) return [];
  const positioned = [];
  venues.forEach((name) => {
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i');
    const idx = text.search(re);
    if (idx !== -1) positioned.push({ name, idx });
  });
  positioned.sort((a, b) => a.idx - b.idx);
  const out = [];
  positioned.forEach((p) => { if (out.indexOf(p.name) === -1) out.push(p.name); });
  return out;
}

function getAreaScopedPool(cats, areas) {
  const pool = [];
  cats.forEach((cat) => {
    const map = ALLOWED_KEYWORDS[cat] || {};
    const scoped = areas.filter((a) => Array.isArray(map[a]) && map[a].length);
    const keys = scoped.length ? scoped : Object.keys(map);
    keys.forEach((a) => {
      (map[a] || []).forEach((v) => { if (pool.indexOf(v) === -1) pool.push(v); });
    });
  });
  return pool;
}

/**
 * In constrained mode, replace the upstream `images` with venue-correct
 * local images for any mentioned venues. If we have no local image for a
 * mentioned venue, drop it rather than risk a mismatch.
 */
function alignImagesToVenues(data, query) {
  if (!data || typeof data !== 'object') return data;
  const cats = Object.keys(CATEGORY_TRIGGERS).filter((cat) => CATEGORY_TRIGGERS[cat].re.test(String(query || '')));
  if (!cats.length) return data;
  const areas = detectAreas(query);
  const pool = getAreaScopedPool(cats, areas);
  const mentioned = findMentionedVenues(data.answer, pool);

  const images = [];
  const rankData = [];
  const imageVenues = [];
  const seenNames = new Set();
  const seenUrls = new Set();
  let rank = 1;
  mentioned.forEach((name) => {
    const entry = VENUE_IMAGES[name];
    if (!entry || !entry.url) return;
    seenNames.add(String(name).toLowerCase());
    seenUrls.add(entry.url);
    images.push(entry.url);
    rankData.push({ url: entry.url, priority_rank: rank });
    imageVenues.push({ name, url: entry.url, area: entry.area || '', category: entry.category || '' });
    rank += 1;
  });

  pool.some((name) => {
    if (images.length >= 3) return true;
    const entry = VENUE_IMAGES[name];
    const key = String(name || '').toLowerCase();
    if (!entry || !entry.url || seenNames.has(key) || seenUrls.has(entry.url)) return false;
    seenNames.add(key);
    seenUrls.add(entry.url);
    images.push(entry.url);
    rankData.push({ url: entry.url, priority_rank: rank, fallback: true });
    imageVenues.push({ name, url: entry.url, area: entry.area || '', category: entry.category || '', fallback: true });
    rank += 1;
    return false;
  });

  data.images = images;
  data.rank_data = rankData;
  data.imageVenues = imageVenues;
  data.mentionedVenues = mentioned.slice();
  imageVenues.forEach((v) => {
    if (v && v.name && data.mentionedVenues.indexOf(v.name) === -1) data.mentionedVenues.push(v.name);
  });
  return data;
}

function detectAreas(query) {
  const q = String(query || '');
  return Object.keys(AREA_TRIGGERS).filter((area) => AREA_TRIGGERS[area].test(q));
}

function applyKeywordConstraints(query) {
  const q = String(query || '');
  const cats = Object.keys(CATEGORY_TRIGGERS).filter((cat) => CATEGORY_TRIGGERS[cat].re.test(q));
  if (!cats.length) return q;
  const areas = detectAreas(q);

  const sections = [];
  cats.forEach((cat) => {
    const map = ALLOWED_KEYWORDS[cat] || {};
    const scoped = areas.filter((a) => Array.isArray(map[a]) && map[a].length);
    const keys = scoped.length ? scoped : Object.keys(map);
    keys.forEach((area) => {
      const list = map[area];
      if (!list || !list.length) return;
      const quoted = list.map((x) => `"${x}"`).join(', ');
      sections.push(`Approved ${area} ${CATEGORY_TRIGGERS[cat].label}: ${quoted}.`);
    });
  });
  if (!sections.length) return q;

  const header = [
    '',
    'STRICT CONSTRAINT — Louis Vuitton curated allow-list:',
    'When recommending or mentioning specific restaurants, hotels, galleries, or museums, you may ONLY use venues from the lists below. ' +
      (areas.length
        ? `The user asked about ${areas.join(' and ')}, so recommend ONLY venues from the matching area list.`
        : 'Stay strictly within these curated lists.') +
      ' Do not introduce any venue that is not on these lists. If no listed venue fits the request, say so explicitly rather than suggesting an unlisted one.'
  ];
  return `${q}\n${header.concat(sections).join('\n')}`;
}

module.exports = async function askLuxuryIntelligence(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const upstreamUrl = process.env.LUXURY_INTELLIGENCE_ASK_URL;
  if (!upstreamUrl) {
    return res.status(500).json({ error: 'Luxury Intelligence API is not configured' });
  }

  try {
    const body = await readJsonBody(req);
    const originalQuery = String(body.query || '');
    const constrainedQuery = applyKeywordConstraints(originalQuery);
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: constrainedQuery })
    });
    const responseBody = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';

    res.status(upstreamResponse.status);
    res.setHeader('Content-Type', contentType);

    // Only post-process if the upstream succeeded and returned JSON we
    // can safely parse. Anything else gets passed through verbatim.
    if (upstreamResponse.ok && /application\/json/i.test(contentType)) {
      try {
        const parsed = JSON.parse(responseBody);
        const aligned = alignImagesToVenues(parsed, originalQuery);
        return res.send(JSON.stringify(aligned));
      } catch (_e) {
        return res.send(responseBody);
      }
    }
    return res.send(responseBody);
  } catch (error) {
    return res.status(502).json({ error: 'Luxury Intelligence API request failed' });
  }
};

module.exports.applyKeywordConstraints = applyKeywordConstraints;
module.exports.alignImagesToVenues = alignImagesToVenues;
module.exports.findMentionedVenues = findMentionedVenues;
module.exports.VENUE_IMAGES = VENUE_IMAGES;
module.exports.ALLOWED_KEYWORDS = ALLOWED_KEYWORDS;
