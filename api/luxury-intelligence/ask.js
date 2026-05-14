const { readJsonBody } = require('../auth/_auth');

const DEFAULT_UPSTREAM_URL = 'http://3.142.99.210:8000/query';
const DEFAULT_TOP_K = 5;

const API_LOCATION_ALIASES = {
  'le cafe louis vuitton': {
    name: 'Le Café Louis Vuitton',
    area: '57th St.',
    category: 'restaurants',
    lat: 40.7632,
    lng: -73.9732,
    address: '6 E 57th St, New York, NY 10022'
  },
  'le café louis vuitton': {
    name: 'Le Café Louis Vuitton',
    area: '57th St.',
    category: 'restaurants',
    lat: 40.7632,
    lng: -73.9732,
    address: '6 E 57th St, New York, NY 10022'
  },
  'lv soho store': {
    name: 'Louis Vuitton SoHo',
    area: 'SoHo',
    category: 'stores',
    lat: 40.7245,
    lng: -73.9975,
    address: '116 Greene St, New York, NY 10012'
  },
  'louis vuitton new york soho': {
    name: 'Louis Vuitton SoHo',
    area: 'SoHo',
    category: 'stores',
    lat: 40.7245,
    lng: -73.9975,
    address: '116 Greene St, New York, NY 10012'
  },
  'louis vuitton soho': {
    name: 'Louis Vuitton SoHo',
    area: 'SoHo',
    category: 'stores',
    lat: 40.7245,
    lng: -73.9975,
    address: '116 Greene St, New York, NY 10012'
  }
};

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

function firstMetadataValue(metadata, keys) {
  if (!metadata || typeof metadata !== 'object') return '';
  for (const key of keys) {
    if (metadata[key] != null && String(metadata[key]).trim()) return String(metadata[key]).trim();
  }
  return '';
}

function cleanMetadataName(name) {
  return String(name || '')
    .replace(/\s*\((?:RESTAURANT|HOTEL|STORE|GALLERY|MUSEUM)\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function apiLocationAliasFor(name) {
  const cleaned = cleanMetadataName(name);
  return API_LOCATION_ALIASES[cleaned.toLowerCase()] || null;
}

function knownVenueNameFor(name) {
  const wanted = cleanMetadataName(name).toLowerCase();
  return Object.keys(VENUE_IMAGES).find((key) => key.toLowerCase() === wanted) || '';
}

function inferCategoryFromResult(item, metadata) {
  const index = String((item && item.index) || '').toLowerCase();
  const type = String(firstMetadataValue(metadata, ['Type', 'type', 'category']) || '').toLowerCase();
  if (index.includes('restaurant') || type.includes('restaurant')) return 'restaurants';
  if (index.includes('hotel') || type.includes('hotel')) return 'hotels';
  if (index.includes('galler') || index.includes('museum') || type.includes('gallery') || type.includes('museum')) return 'galleries';
  if (index.includes('product') || type.includes('product')) return 'products';
  return '';
}

function inferAreaFromResult(item, metadata) {
  const index = String((item && item.index) || '').toLowerCase();
  const haystack = [
    index,
    firstMetadataValue(metadata, ['area', 'Area', 'location', 'Location', 'Keywords', 'Google Maps', 'GOOGLE MAP'])
  ].join(' ').toLowerCase();
  if (/\bsoho|so-ho\b/.test(haystack)) return 'SoHo';
  if (/57|fifty[-\s]?seventh|midtown/.test(haystack)) return '57th St.';
  return '';
}

function metadataNameForResult(item, metadata) {
  const name = firstMetadataValue(metadata, [
    'product_name',
    'product_name_display',
    'productName',
    'name',
    'title',
    'Store',
    'store_name',
    'Restaurants',
    'restaurant_name',
    'HOTEL NAME',
    'hotel_name',
    'Gallery/Mueseum',
    'Gallery/Museum',
    'gallery_name',
    'museum_name',
    'Google Maps',
    'Google Map',
    'GOOGLE MAP',
    'Image Name/ Drive Link'
  ]) || String((item && item.index) || 'Recommendation');
  return cleanMetadataName(name);
}

function googleMapNameForResult(metadata) {
  return cleanMetadataName(firstMetadataValue(metadata, ['Google Maps', 'Google Map', 'GOOGLE MAP']));
}

function metadataImageForResult(metadata) {
  return firstMetadataValue(metadata, [
    'image_url',
    'imageUrl',
    'image',
    'Image URL',
    'image link',
    'Image Link',
    'AWS Links',
    'AWS Link',
    'AWS LINKS',
    'AWS LINK',
    'Drive Link',
    'Image Name/ Drive Link'
  ]);
}

function detectCategories(query) {
  const q = String(query || '');
  return Object.keys(CATEGORY_TRIGGERS).filter((cat) => CATEGORY_TRIGGERS[cat].re.test(q));
}

/**
 * When the user asks for restaurants / hotels / galleries, omit Omniverse
 * rows that are LV stores or products so image cards match the answer.
 */
function venueCategoryMatchesQuery(normalizedCategory, queryCats) {
  if (!queryCats || !queryCats.length) return true;
  const cat = String(normalizedCategory || '').toLowerCase();
  if (cat === 'stores' || cat === 'store' || cat === 'products' || cat === 'product') return false;
  let ok = false;
  queryCats.forEach((qc) => {
    if (qc === 'restaurants' && cat === 'restaurants') ok = true;
    if (qc === 'hotels' && cat === 'hotels') ok = true;
    if (qc === 'galleries' && cat === 'galleries') ok = true;
  });
  return ok;
}

function scopedQuery(query) {
  const q = String(query || '');
  const areas = detectAreas(q);
  if (areas.length !== 1) return q;
  const cats = detectCategories(q);
  const area = areas[0];
  const otherArea = area === 'SoHo' ? '57th St.' : 'SoHo';
  const locationName = area === 'SoHo'
    ? 'Louis Vuitton New York SoHo at 116 Greene St'
    : 'Louis Vuitton 57th Street at 6 E 57th St';
  const topic = cats.length
    ? cats.map((cat) => CATEGORY_TRIGGERS[cat].label).join(', ')
    : 'locations';

  return `${q}

IMPORTANT LOCATION SCOPE:
The user asked for ${topic} near ${locationName}. Recommend ONLY places in the ${area} area near that store. Do not include recommendations, images, hotels, restaurants, galleries, museums, or store content from ${otherArea}.`;
}

function normalizeOmniverseResponse(data, query) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.results)) return data;

  const images = [];
  const rankData = [];
  const imageVenues = [];
  const seen = new Set();
  const areas = detectAreas(query);
  const scopedArea = areas.length === 1 ? areas[0] : '';
  const queryCats = detectCategories(query);

  data.results.forEach((item, idx) => {
    const metadata = item && item.metadata;
    if (!metadata || typeof metadata !== 'object') return;
    const imageUrl = metadataImageForResult(metadata);
    if (!imageUrl || seen.has(imageUrl)) return;
    seen.add(imageUrl);

    const name = metadataNameForResult(item, metadata);
    const googleMapName = googleMapNameForResult(metadata);
    const knownVenueName = knownVenueNameFor(name);
    const alias = knownVenueName ? null : (apiLocationAliasFor(name) || apiLocationAliasFor(googleMapName));
    const displayName = knownVenueName || (alias && alias.name ? alias.name : name);
    const area = alias && alias.area ? alias.area : inferAreaFromResult(item, metadata);
    let normalizedCategory = '';
    if (knownVenueName && VENUE_IMAGES[knownVenueName]) {
      normalizedCategory = VENUE_IMAGES[knownVenueName].category || '';
    }
    if (!normalizedCategory) {
      normalizedCategory = alias && alias.category ? alias.category : inferCategoryFromResult(item, metadata);
    }
    if (scopedArea && area !== scopedArea) return;
    if (!venueCategoryMatchesQuery(normalizedCategory, queryCats)) return;
    images.push(imageUrl);
    rankData.push({ url: imageUrl, priority_rank: idx + 1, relevance_score: item.relevance_score });
    const venue = {
      name: displayName,
      apiName: name,
      googleMapName,
      url: imageUrl,
      area,
      category: normalizedCategory,
      index: item.index || '',
      source: 'omniverse'
    };
    if (alias) {
      venue.lat = alias.lat;
      venue.lng = alias.lng;
      venue.address = alias.address || '';
    }
    imageVenues.push(venue);
  });

  if (images.length) {
    data.images = images;
    data.rank_data = rankData;
    data.imageVenues = imageVenues;
    data.mentionedVenues = imageVenues.map((v) => v.name);
  }
  return data;
}

function detectAreas(query) {
  const q = String(query || '');
  return Object.keys(AREA_TRIGGERS).filter((area) => AREA_TRIGGERS[area].test(q));
}

function applyKeywordConstraints(query) {
  const q = String(query || '');
  const cats = detectCategories(q);
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

  const upstreamUrl = DEFAULT_UPSTREAM_URL;

  try {
    const body = await readJsonBody(req);
    const originalQuery = String(body.query || '');
    const finalQuery = scopedQuery(originalQuery);
    const topK = Number.isFinite(Number(body.top_k)) ? Number(body.top_k) : DEFAULT_TOP_K;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: finalQuery, top_k: topK })
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
        let out = normalizeOmniverseResponse(parsed, originalQuery);
        if (detectCategories(originalQuery).length) {
          out = alignImagesToVenues(out, originalQuery);
        }
        return res.send(JSON.stringify(out));
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
