/**
 * LV Luxury Intelligence API (v2.2) — shared client for WebDemo.
 * POST to the same-origin Vercel API proxy. The serverless route forwards to
 * the EC2 Luxury Intelligence service so production avoids mixed-content/CSP
 * failures and keeps the upstream URL server-side.
 */
(function (global) {
  'use strict';

  var ASK_URL = '/api/luxury-intelligence/ask';
  var DEFAULT_TOP_K = 5;
  var ANALYZING_TEXT = 'Analyzing Luxury Catalogs';
  var apiVenueLocations = {};

  /** Prompt tuned so dashboard can parse a bullet list of keyword phrases */
  var DASHBOARD_KEYWORDS_QUERY =
    'You are a luxury marketing analyst. Respond with ONLY a markdown bullet list of 8 short keyword phrases (2–6 words each) for Louis Vuitton luxury intelligence across: Kusama fashion, LV campaigns, SoHo boutiques, museums, galleries, hotels, and product pricing. One phrase per line starting with "- ". No title or introduction.';

  // ──────────────────────────────────────────────────────────────────────
  // Curated allow-list for restaurants / hotels / galleries, broken down
  // by area so a query about "57th St. restaurants" only surfaces the
  // venues nested under that node — same for SoHo, etc. Mirrors the
  // hierarchy in WebDemo/scripts/keywords-data.js and is used as a
  // fallback when ShopThatKeywordsData isn't loaded on the current page.
  // ──────────────────────────────────────────────────────────────────────
  var FALLBACK_ALLOWED = {
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

  // Trigger regex + parent-node mapping per category. graphParents maps
  // each NY area (or "Kusama") to the parent IDs in the curated tree that
  // own that category's leaves.
  var CATEGORY_CONFIG = {
    restaurants: {
      trigger: /\b(restaurant|restaurants|restaruant|restaruants|restaraunt|restaraunts|restuarant|restuarants|resturant|resturants|dining|dine|diner|dinner|lunch|brunch|supper|cafe|caf[eé]s?|bistro|bistros|eatery|eateries|brasserie|brasseries|food|eat|where\s+to\s+eat)\b/i,
      graphParents: {
        '57th St.': ['57th St. Restaurants'],
        'SoHo':     ['SoHo Restaurants']
      },
      label: 'restaurants'
    },
    hotels: {
      trigger: /\b(hotel|hotels|stay|stays|accommodation|accommodations|lodging|resort|resorts|suite|suites)\b/i,
      graphParents: {
        '57th St.': ['57th St. Hotels'],
        'SoHo':     ['SoHo Hotels']
      },
      label: 'hotels'
    },
    galleries: {
      trigger: /\b(gallery|galleries|museum|museums|exhibition|exhibitions|art\s+space)\b/i,
      graphParents: {
        'Kusama': ['Galleries', 'Museums'],
        '57th St.': ['57th St. Galleries', '57th St. Museums'],
        'SoHo': ['SoHo Galleries', 'SoHo Museums']
      },
      label: 'galleries & museums'
    }
  };

  // Area triggers — how to recognize "57th St." vs "SoHo" in a user query.
  var AREA_TRIGGERS = {
    '57th St.': /\b(57\s*th(?:\s|-)?(?:st\.?|street)?|fifty[-\s]?seventh\s+street|midtown)\b/i,
    'SoHo':     /\b(soho|so-?ho)\b/i
  };

  // ──────────────────────────────────────────────────────────────────────
  // Venue → image catalog. Keys are canonical venue names from the
  // curated keyword graph (and a few well-known aliases). Used to swap
  // the upstream Luxury Intelligence images with locally-curated images
  // that actually correspond to the venues mentioned in the answer.
  // ──────────────────────────────────────────────────────────────────────
  var VENUE_IMAGES = {
    // 57th St. restaurants
    'The Modern':           { url: 'assets/restaurants/the-modern.jpg',         area: '57th St.', category: 'restaurants', lat: 40.7614, lng: -73.9776, address: '9 W 53rd St (at MoMA)' },
    'Le Bernardin':         { url: 'assets/restaurants/le-bernardin.jpg',       area: '57th St.', category: 'restaurants', lat: 40.7619, lng: -73.9816, address: '155 W 51st St' },
    'Cafe Carlyle':         { url: 'assets/restaurants/cafe-carlyle.jpg',       area: '57th St.', category: 'restaurants', lat: 40.7741, lng: -73.9626, address: '35 E 76th St (The Carlyle)' },
    'Marea':                { url: 'assets/restaurants/marea.jpg',              area: '57th St.', category: 'restaurants', lat: 40.7670, lng: -73.9800, address: '240 Central Park South' },
    'The Mark':             { url: 'assets/restaurants/the-mark-restaurant.jpg', area: '57th St.', category: 'restaurants', lat: 40.7754, lng: -73.9625, address: '25 E 77th St' },
    'Le Bilboquet':         { url: 'assets/restaurants/le-bilboquet.jpg',       area: '57th St.', category: 'restaurants', lat: 40.7643, lng: -73.9683, address: '20 E 60th St' },
    'DANIEL':               { area: '57th St.', category: 'restaurants', lat: 40.7668, lng: -73.9676, address: '60 E 65th St' },

    // 57th St. hotels
    'The Plaza':            { url: 'assets/restaurants/the-plaza.jpg',          area: '57th St.', category: 'hotels', lat: 40.7644, lng: -73.9747, address: '768 5th Ave' },
    'The Mark Hotel':       { url: 'assets/restaurants/mark-hotel.jpg',         area: '57th St.', category: 'hotels', lat: 40.7754, lng: -73.9625, address: '25 E 77th St' },
    'The Baccarat Hotel':   { url: 'assets/restaurants/baccarat.jpg',           area: '57th St.', category: 'hotels', lat: 40.7617, lng: -73.9789, address: '28 W 53rd St' },
    'The Baccarat':         { url: 'assets/restaurants/baccarat.jpg',           area: '57th St.', category: 'hotels', lat: 40.7617, lng: -73.9789, address: '28 W 53rd St' },
    'ST Regis':             { url: 'assets/restaurants/st-regis.jpg',           area: '57th St.', category: 'hotels', lat: 40.7611, lng: -73.9738, address: '2 E 55th St' },
    'The St. Regis':        { url: 'assets/restaurants/st-regis.jpg',           area: '57th St.', category: 'hotels', lat: 40.7611, lng: -73.9738, address: '2 E 55th St' },
    'The Carlyle':          { url: 'assets/restaurants/carlyle-hotel.jpg',      area: '57th St.', category: 'hotels', lat: 40.7741, lng: -73.9626, address: '35 E 76th St' },

    // Galleries / Museums
    'MoMA Museum':                 { url: 'assets/museums/moma.jpg',         area: 'Kusama', category: 'galleries', lat: 40.7614, lng: -73.9776, address: '11 W 53rd St' },
    'Metropolitan Museum of Art':  { url: 'assets/museums/met-museum.jpg',   area: 'Kusama', category: 'galleries', lat: 40.7794, lng: -73.9632, address: '1000 5th Ave' },
    'The Guggenheim':              { url: 'assets/museums/guggenheim.jpg',   area: '57th St.', category: 'galleries', lat: 40.7829, lng: -73.9589, address: '1071 5th Ave' },
    'The Frick Collection':        { url: 'assets/museums/frick.jpg',        area: '57th St.', category: 'galleries', lat: 40.7711, lng: -73.9673, address: '1 E 70th St' },
    'Fondation LV':                { url: 'assets/foundation-lv-png.png',    area: 'Kusama', category: 'galleries', lat: 48.8763, lng: 2.2633,   address: '8 Av. du Mahatma Gandhi, Paris' },
    'David Zwirner':               { url: 'assets/kusama-gal2.png',          area: 'Kusama', category: 'galleries', lat: 40.7605, lng: -73.9700, address: '533 W 19th St' },
    'Pace Gallery':                { url: 'assets/kusama-gal1.png',          area: '57th St.', category: 'galleries', lat: 40.7571, lng: -73.9714, address: '540 W 25th St' },
    'David Zwirner Chelsea':       { url: 'assets/kusama-gal2.png',          area: '57th St.', category: 'galleries', lat: 40.7465, lng: -74.0070, address: '525 W 19th St' },
    'Gagosian Chelsea':            { url: 'assets/kusama-gal3.png',          area: '57th St.', category: 'galleries', lat: 40.7481, lng: -74.0055, address: '555 W 24th St' },
    'Hauser & Wirth Chelsea':      { url: 'assets/kusama-gal4.png',          area: '57th St.', category: 'galleries', lat: 40.7469, lng: -74.0064, address: '443 W 18th St' },

    // SoHo restaurants
    'BALTHAZAR':                   { url: 'assets/soho/restaurants/balthazar.png',           area: 'SoHo', category: 'restaurants', lat: 40.7232, lng: -73.9978, address: '80 Spring St' },
    'MINETTA TAVERN':              { url: 'assets/soho/restaurants/minetta-tavern.png',      area: 'SoHo', category: 'restaurants', lat: 40.7303, lng: -74.0007, address: '113 MacDougal St' },
    'LE COUCOU':                   { area: 'SoHo', category: 'restaurants', lat: 40.7196, lng: -73.9942, address: '138 Lafayette St' },
    'LA MERCERIE':                 { url: 'assets/soho/restaurants/la-mercerie.png',         area: 'SoHo', category: 'restaurants', lat: 40.7235, lng: -74.0010, address: '53 Howard St' },
    'LOCANDA VERDE':               { url: 'assets/soho/restaurants/locanda-verde.png',       area: 'SoHo', category: 'restaurants', lat: 40.7196, lng: -74.0090, address: '377 Greenwich St' },
    'FRENCHETTE':                  { area: 'SoHo', category: 'restaurants', lat: 40.7191, lng: -74.0070, address: '241 W Broadway' },
    'IL BUCO ALIMENTARI':          { url: 'assets/soho/restaurants/il-buco-alimentari.jpg',  area: 'SoHo', category: 'restaurants', lat: 40.7271, lng: -73.9925, address: '53 Great Jones St' },
    'BAR PITTI':                   { url: 'assets/soho/restaurants/bar-pitti.png',           area: 'SoHo', category: 'restaurants', lat: 40.7314, lng: -74.0014, address: '268 6th Ave' },
    'INDOCHINE':                   { area: 'SoHo', category: 'restaurants', lat: 40.7300, lng: -73.9909, address: '430 Lafayette St' },
    'ST AMBROEUS':                 { url: 'assets/soho/restaurants/st-ambroeus.png',         area: 'SoHo', category: 'restaurants', lat: 40.7245, lng: -74.0017, address: '265 Lafayette St' },
    'DIRTY FRENCH':                { area: 'SoHo', category: 'restaurants', lat: 40.7184, lng: -73.9920, address: '180 Ludlow St' },
    "JACK'S WIFE FRIEDA":          { area: 'SoHo', category: 'restaurants', lat: 40.7236, lng: -74.0009, address: '50 Carmine St' },
    'JOSEPH LEONARD':              { area: 'SoHo', category: 'restaurants', lat: 40.7314, lng: -74.0029, address: '170 Waverly Pl' },
    'ESTELLA':                     { url: 'assets/soho/restaurants/estela.png',              area: 'SoHo', category: 'restaurants', lat: 40.7216, lng: -73.9946, address: '47 E Houston St' },
    "THE BUTCHER'S DAUGHTER":      { url: 'assets/soho/restaurants/butchers-daughter.png',   area: 'SoHo', category: 'restaurants', lat: 40.7206, lng: -73.9947, address: '19 Kenmare St' },

    // SoHo hotels
    'THE MERCER':                  { url: 'assets/soho/hotels/the-mercer.png',               area: 'SoHo', category: 'hotels', lat: 40.7241, lng: -74.0003, address: '147 Mercer St' },
    'CROSBY STREET HOTEL':         { url: 'assets/soho/hotels/crosby-street-hotel.png',      area: 'SoHo', category: 'hotels', lat: 40.7220, lng: -74.0001, address: '79 Crosby St' },
    'THE BOWERY HOTEL':            { url: 'assets/soho/hotels/the-bowery-hotel.png',         area: 'SoHo', category: 'hotels', lat: 40.7256, lng: -73.9926, address: '335 Bowery' },
    'THE GREENWICH':               { url: 'assets/soho/hotels/the-greenwich.png',            area: 'SoHo', category: 'hotels', lat: 40.7191, lng: -74.0107, address: '377 Greenwich St' },
    'THE STANDARD EAST VILLAGE':   { url: 'assets/soho/hotels/standard-east-village.png',    area: 'SoHo', category: 'hotels', lat: 40.7268, lng: -73.9879, address: '25 Cooper Square' },
    'PUBLIC':                      { url: 'assets/soho/hotels/public.png',                   area: 'SoHo', category: 'hotels', lat: 40.7220, lng: -73.9926, address: '215 Chrystie St' },
    'HOTEL BARRIERE FOUQUET':      { url: 'assets/soho/hotels/hotel-barriere-fouquet.png',  area: 'SoHo', category: 'hotels', lat: 40.7186, lng: -74.0049, address: '456 Greenwich St' },

    // SoHo galleries
    'David Zwirner Gallery':       { url: 'assets/soho/galleries/david-zwirner.png',         area: 'SoHo', category: 'galleries', lat: 40.7465, lng: -74.0070, address: '525 W 19th St' },
    'Jack Shainman Gallery':       { url: 'assets/soho/galleries/jack-shainman.png',         area: 'SoHo', category: 'galleries', lat: 40.7159, lng: -74.0035, address: '46 Lafayette St' },
    'Hauser & Wirth':              { url: 'assets/soho/galleries/hauser-wirth.png',          area: 'SoHo', category: 'galleries', lat: 40.7469, lng: -74.0064, address: '443 W 18th St' },
    'Gladstone Gallery':           { url: 'assets/soho/galleries/gladstone-gallery.png',     area: 'SoHo', category: 'galleries', lat: 40.7489, lng: -74.0041, address: '515 W 24th St' },
    'Gagosian Gallery':            { url: 'assets/soho/galleries/gagosian-gallery.png',      area: 'SoHo', category: 'galleries', lat: 40.7481, lng: -74.0055, address: '555 W 24th St' },
    'Lehmann Maupin':              { url: 'assets/soho/galleries/lehmann-maupin.png',        area: 'SoHo', category: 'galleries', lat: 40.7490, lng: -74.0036, address: '501 W 24th St' },
    'New Museum':                  { area: 'SoHo', category: 'galleries', lat: 40.7224, lng: -73.9928, address: '235 Bowery' },
    'The Drawing Center':          { area: 'SoHo', category: 'galleries', lat: 40.7223, lng: -74.0020, address: '35 Wooster St' },
    'Museum of Ice Cream':         { area: 'SoHo', category: 'galleries', lat: 40.7239, lng: -74.0027, address: '558 Broadway' },
    'Leslie-Lohman Museum of Art': { area: 'SoHo', category: 'galleries', lat: 40.7216, lng: -74.0030, address: '26 Wooster St' }
  };

  var API_LOCATION_ALIASES = {
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

  /** Return { lat, lng, ...meta } for a venue, or null if unknown. */
  function getVenueLocation(name) {
    var canonicalName = name;
    var entry = VENUE_IMAGES[canonicalName];
    if (!entry) {
      var wanted = String(name || '').toLowerCase();
      Object.keys(VENUE_IMAGES).some(function (key) {
        if (key.toLowerCase() !== wanted) return false;
        canonicalName = key;
        entry = VENUE_IMAGES[key];
        return true;
      });
    }
    if (!entry) {
      var runtimeLoc = apiVenueLocations[String(name || '').toLowerCase()];
      if (runtimeLoc && runtimeLoc.lat != null && runtimeLoc.lng != null) return runtimeLoc;
    }
    if (!entry || entry.lat == null || entry.lng == null) return null;
    return {
      name: canonicalName,
      lat: entry.lat,
      lng: entry.lng,
      area: entry.area || '',
      category: entry.category || '',
      address: entry.address || '',
      image: entry.url || '',
      images: entry.images || []
    };
  }

  function uniquePush(arr, val) {
    if (val && arr.indexOf(val) === -1) arr.push(val);
  }

  function escapeRegExp(s) {
    return String(s).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  /**
   * Find which curated venues are referenced in a free-form answer.
   * Scans the area-scoped allow-list and returns matches in the order
   * they first appear in the text.
   */
  function findMentionedVenues(answer, venues) {
    var text = String(answer || '');
    if (!text || !Array.isArray(venues) || !venues.length) return [];
    var positioned = [];
    venues.forEach(function (name) {
      var pattern = new RegExp('\\b' + escapeRegExp(name) + '\\b', 'i');
      var idx = text.search(pattern);
      if (idx !== -1) positioned.push({ name: name, idx: idx });
    });
    positioned.sort(function (a, b) { return a.idx - b.idx; });
    var out = [];
    positioned.forEach(function (p) { uniquePush(out, p.name); });
    return out;
  }

  /**
   * Given a list of venue names (sorted in mention order), build the
   * image payload the renderers expect, using our local catalog.
   */
  function buildVenueImagePayload(venueNames) {
    var images = [];
    var rankData = [];
    var imageVenues = [];
    var rank = 1;
    venueNames.forEach(function (name) {
      var entry = VENUE_IMAGES[name];
      if (!entry || !entry.url) return;
      images.push(entry.url);
      rankData.push({ url: entry.url, priority_rank: rank });
      imageVenues.push({ name: name, url: entry.url, area: entry.area || '', category: entry.category || '' });
      rank += 1;
    });
    return { images: images, rank_data: rankData, imageVenues: imageVenues };
  }

  function firstMetadataValue(metadata, keys) {
    if (!metadata || typeof metadata !== 'object') return '';
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
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
    var cleaned = cleanMetadataName(name);
    var key = cleaned.toLowerCase();
    return API_LOCATION_ALIASES[key] || null;
  }

  function knownVenueNameFor(name) {
    var wanted = cleanMetadataName(name).toLowerCase();
    var found = '';
    Object.keys(VENUE_IMAGES).some(function (key) {
      if (key.toLowerCase() !== wanted) return false;
      found = key;
      return true;
    });
    return found;
  }

  function inferCategoryFromResult(item, metadata) {
    var index = String((item && item.index) || '').toLowerCase();
    var type = String(firstMetadataValue(metadata, ['Type', 'type', 'category']) || '').toLowerCase();
    if (index.indexOf('restaurant') !== -1 || type.indexOf('restaurant') !== -1) return 'restaurants';
    if (index.indexOf('hotel') !== -1 || type.indexOf('hotel') !== -1) return 'hotels';
    if (index.indexOf('galler') !== -1 || index.indexOf('museum') !== -1 || type.indexOf('gallery') !== -1 || type.indexOf('museum') !== -1) return 'galleries';
    if (index.indexOf('product') !== -1 || type.indexOf('product') !== -1) return 'products';
    return '';
  }

  function inferAreaFromResult(item, metadata) {
    var index = String((item && item.index) || '').toLowerCase();
    var haystack = [
      index,
      firstMetadataValue(metadata, ['area', 'Area', 'location', 'Location', 'Keywords', 'Google Maps', 'GOOGLE MAP'])
    ].join(' ').toLowerCase();
    if (/\bsoho|so-ho\b/.test(haystack)) return 'SoHo';
    if (/57|fifty[-\s]?seventh|midtown/.test(haystack)) return '57th St.';
    return '';
  }

  function metadataNameForResult(item, metadata) {
    var name = firstMetadataValue(metadata, [
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

  function registerApiVenueLocation(venue) {
    if (!venue || !venue.name || !venue.url) return;
    var alias = apiLocationAliasFor(venue.name) || apiLocationAliasFor(venue.googleMapName);
    if (!alias) return;
    var key = String(venue.name).toLowerCase();
    var loc = apiVenueLocations[key] || {
      name: alias.name || venue.name,
      lat: alias.lat,
      lng: alias.lng,
      area: alias.area || venue.area || '',
      category: alias.category || venue.category || '',
      address: alias.address || '',
      image: venue.url,
      images: []
    };
    if (loc.images.indexOf(venue.url) === -1) loc.images.push(venue.url);
    if (!loc.image) loc.image = venue.url;
    apiVenueLocations[key] = loc;
    apiVenueLocations[String(loc.name).toLowerCase()] = loc;
    if (venue.googleMapName) apiVenueLocations[String(venue.googleMapName).toLowerCase()] = loc;
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

  /**
   * Omniverse returns an answer plus `results[].metadata`. Normalize the
   * metadata into the image payload shape both chatbots already render.
   */
  function normalizeOmniverseResponse(data, query) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.results)) return data;

    var images = [];
    var rankData = [];
    var imageVenues = [];
    var seen = {};
    var areas = detectAreas(query);
    var scopedArea = areas.length === 1 ? areas[0] : '';
    var queryCats = detectConstrainedCategories(query);
    var allowPool = queryCats.length ? buildConstrainedVenuePool(query) : [];

    data.results.forEach(function (item, idx) {
      var metadata = item && item.metadata;
      if (!metadata || typeof metadata !== 'object') return;
      var imageUrl = metadataImageForResult(metadata);
      if (!imageUrl || seen[imageUrl]) return;
      seen[imageUrl] = true;

      var name = metadataNameForResult(item, metadata);
      var category = inferCategoryFromResult(item, metadata);
      var area = inferAreaFromResult(item, metadata);
      var googleMapName = googleMapNameForResult(metadata);
      var knownVenueName = knownVenueNameFor(name);
      var alias = knownVenueName ? null : (apiLocationAliasFor(name) || apiLocationAliasFor(googleMapName));
      var displayName = knownVenueName || (alias && alias.name ? alias.name : name);
      var normalizedArea = alias && alias.area ? alias.area : area;
      var normalizedCategory = '';
      if (knownVenueName && VENUE_IMAGES[knownVenueName]) {
        normalizedCategory = VENUE_IMAGES[knownVenueName].category || '';
      }
      if (!normalizedCategory) {
        normalizedCategory = alias && alias.category ? alias.category : category;
      }
      if (scopedArea && normalizedArea !== scopedArea) return;
      if (!venueCategoryMatchesQuery(normalizedCategory, queryCats)) return;
      if (allowPool.length && !poolHasVenue(allowPool, displayName, name, googleMapName)) return;
      images.push(imageUrl);
      rankData.push({ url: imageUrl, priority_rank: idx + 1, relevance_score: item.relevance_score });
      var venue = {
        name: displayName,
        apiName: name,
        googleMapName: googleMapName,
        url: imageUrl,
        area: normalizedArea,
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
      registerApiVenueLocation(venue);
    });

    if (images.length) {
      data.images = images;
      data.rank_data = rankData;
      data.imageVenues = imageVenues;
      data.mentionedVenues = imageVenues.map(function (v) { return v.name; });
    }
    return data;
  }

  /**
   * If the query is about restaurants / hotels / galleries, rebuild the
   * image set so each image actually corresponds to a venue mentioned in
   * the answer. In constrained mode we ALWAYS take ownership of `images`
   * — if no local venue image exists for the mentioned venues we drop
   * the upstream images entirely rather than risk a mismatch. For
   * non-constrained queries the original data is returned untouched.
   */
  function alignImagesToVenues(data, query) {
    if (!data) return data;
    var cats = detectConstrainedCategories(query);
    if (!cats.length) return data;
    var pool = buildConstrainedVenuePool(query);

    var mentioned = findMentionedVenues(data.answer, pool);
    var images = [];
    var rankData = [];
    var imageVenues = [];
    var seenNames = {};
    var seenUrls = {};
    var rank = 1;
    mentioned.forEach(function (name) {
      var entry = VENUE_IMAGES[name];
      if (!entry || !entry.url) return;
      var key = String(name).toLowerCase();
      seenNames[key] = true;
      seenUrls[entry.url] = true;
      images.push(entry.url);
      rankData.push({ url: entry.url, priority_rank: rank });
      imageVenues.push({ name: name, url: entry.url, area: entry.area || '', category: entry.category || '' });
      rank += 1;
    });

    pool.some(function (name) {
      if (images.length >= 3) return true;
      var entry = VENUE_IMAGES[name];
      var key = String(name || '').toLowerCase();
      if (!entry || !entry.url || seenNames[key] || seenUrls[entry.url]) return false;
      seenNames[key] = true;
      seenUrls[entry.url] = true;
      images.push(entry.url);
      rankData.push({ url: entry.url, priority_rank: rank, fallback: true });
      imageVenues.push({ name: name, url: entry.url, area: entry.area || '', category: entry.category || '', fallback: true });
      rank += 1;
      return false;
    });

    data.images = images;
    data.rank_data = rankData;
    data.imageVenues = imageVenues;
    data.mentionedVenues = mentioned.slice();
    imageVenues.forEach(function (v) {
      if (v && v.name && data.mentionedVenues.indexOf(v.name) === -1) data.mentionedVenues.push(v.name);
    });
    return data;
  }

  /**
   * Return a {area -> [keyword,...]} map for the requested category,
   * sourced from the live keyword graph when available and falling back
   * to the inlined map otherwise.
   */
  function getCuratedMapFor(category) {
    var cfg = CATEGORY_CONFIG[category];
    if (!cfg) return {};
    var out = {};
    var data = global.ShopThatKeywordsData;
    var hasLive = data && Array.isArray(data.defaultNodes);

    Object.keys(cfg.graphParents).forEach(function (area) {
      var bucket = [];
      if (hasLive) {
        var parents = cfg.graphParents[area];
        data.defaultNodes.forEach(function (n) {
          if (n && parents.indexOf(n.parent) !== -1) uniquePush(bucket, n.id);
        });
      }
      if (!bucket.length) {
        var fallback = (FALLBACK_ALLOWED[category] || {})[area] || [];
        fallback.forEach(function (v) { uniquePush(bucket, v); });
      } else {
        ((FALLBACK_ALLOWED[category] || {})[area] || []).forEach(function (v) { uniquePush(bucket, v); });
      }
      if (bucket.length) out[area] = bucket;
    });
    return out;
  }

  /**
   * Return the union of every area's allow-list for a category.
   * Kept for backwards-compatibility with callers that want a flat list.
   */
  function getCuratedListFor(category) {
    var map = getCuratedMapFor(category);
    var out = [];
    Object.keys(map).forEach(function (area) {
      map[area].forEach(function (v) { uniquePush(out, v); });
    });
    return out;
  }

  function detectConstrainedCategories(query) {
    var q = String(query || '');
    var hits = [];
    Object.keys(CATEGORY_CONFIG).forEach(function (cat) {
      if (CATEGORY_CONFIG[cat].trigger.test(q)) hits.push(cat);
    });
    return hits;
  }

  /**
   * When the user constrains to restaurants / hotels / galleries, drop
   * Omniverse hits that are LV stores, products, or the wrong venue type
   * so we never show boutique imagery alongside dining recommendations.
   */
  function venueCategoryMatchesQuery(normalizedCategory, queryCats) {
    if (!queryCats || !queryCats.length) return true;
    var cat = String(normalizedCategory || '').toLowerCase();
    if (cat === 'stores' || cat === 'store' || cat === 'products' || cat === 'product') return false;
    var ok = false;
    queryCats.forEach(function (qc) {
      if (qc === 'restaurants' && cat === 'restaurants') ok = true;
      if (qc === 'hotels' && cat === 'hotels') ok = true;
      if (qc === 'galleries' && cat === 'galleries') ok = true;
    });
    return ok;
  }

  function detectAreas(query) {
    var q = String(query || '');
    var hits = [];
    Object.keys(AREA_TRIGGERS).forEach(function (area) {
      if (AREA_TRIGGERS[area].test(q)) hits.push(area);
    });
    return hits;
  }

  /** Flat pool of dashboard allow-list venues for this query (same logic as alignImagesToVenues). */
  function buildConstrainedVenuePool(query) {
    var cats = detectConstrainedCategories(query);
    var areas = detectAreas(query);
    var pool = [];
    cats.forEach(function (cat) {
      var map = getCuratedMapFor(cat);
      var areasForCat = areas.filter(function (a) { return map[a] && map[a].length; });
      var keys = areasForCat.length ? areasForCat : Object.keys(map);
      keys.forEach(function (area) {
        (map[area] || []).forEach(function (v) { uniquePush(pool, v); });
      });
    });
    return pool;
  }

  function poolHasVenue(pool, displayName, apiName, googleMapName) {
    if (!pool || !pool.length) return true;
    var lower = {};
    pool.forEach(function (p) { lower[String(p).toLowerCase()] = true; });
    var candidates = [displayName, apiName, googleMapName].filter(Boolean);
    for (var i = 0; i < candidates.length; i++) {
      var key = cleanMetadataName(candidates[i]).toLowerCase();
      if (lower[key]) return true;
      var kn = knownVenueNameFor(candidates[i]);
      if (kn && lower[kn.toLowerCase()]) return true;
    }
    return false;
  }

  /**
   * Replace model prose with a list built only from keyword-tree venues
   * (matches server-side enforcement).
   */
  function clampConstrainedAnswer(data, query) {
    var cats = detectConstrainedCategories(query);
    if (!cats.length || !data || typeof data.answer !== 'string') return;
    var areas = detectAreas(query);
    var pool = buildConstrainedVenuePool(query);
    if (!pool.length) return;

    var picks = findMentionedVenues(data.answer, pool);
    var maxPicks = 8;
    if (picks.length < 1) picks = pool.slice(0, Math.min(maxPicks, pool.length));
    else if (picks.length > maxPicks) picks = picks.slice(0, maxPicks);

    var topic = cats.map(function (c) { return CATEGORY_CONFIG[c].label; }).join(', ');
    var intro = areas.length === 1
      ? 'Here are curated ' + topic + ' near **' + areas[0] + '** from the Louis Vuitton keyword guide:\n\n'
      : 'Here are curated ' + topic + ' from the Louis Vuitton keyword guide:\n\n';

    var lines = picks.map(function (name, i) {
      var meta = VENUE_IMAGES[name];
      var addr = meta && meta.address ? meta.address : null;
      return addr ? (i + 1) + '. **' + name + '** (' + addr + ')' : (i + 1) + '. **' + name + '**';
    });
    data.answer = intro + lines.join('\n');
  }

  /**
   * Append a strict allow-list instruction to a user query when it is
   * about restaurants, galleries, or hotels. When the query also names
   * a specific area (57th St. or SoHo), the allow-list is narrowed to
   * just that area's nested keywords. Queries without a constrained
   * topic pass through unchanged.
   */
  function applyKeywordConstraints(query) {
    var q = String(query || '');
    var cats = detectConstrainedCategories(q);
    if (!cats.length) return q;
    var areas = detectAreas(q);

    var sections = [];
    cats.forEach(function (cat) {
      var map = getCuratedMapFor(cat);
      var areasForCat = areas.filter(function (a) { return map[a] && map[a].length; });
      // If no area was named, include every area we have for this category.
      var keys = areasForCat.length ? areasForCat : Object.keys(map);
      keys.forEach(function (area) {
        var list = map[area];
        if (!list || !list.length) return;
        var quoted = list.map(function (x) { return '"' + x + '"'; }).join(', ');
        sections.push('Approved ' + area + ' ' + CATEGORY_CONFIG[cat].label + ': ' + quoted + '.');
      });
    });
    if (!sections.length) return q;

    var header = [
      '',
      'STRICT CONSTRAINT — Louis Vuitton curated allow-list:',
      'When recommending or mentioning specific restaurants, hotels, galleries, or museums, you may ONLY use venues from the lists below. ' +
        (areas.length
          ? 'The user asked about ' + areas.join(' and ') + ', so recommend ONLY venues from the matching area list.'
          : 'Stay strictly within these curated lists.') +
        ' Do not introduce any venue that is not on these lists. If no listed venue fits the request, say so explicitly rather than suggesting an unlisted one.'
    ];
    return q + '\n' + header.concat(sections).join('\n');
  }

  function stripUnsafeHtml(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    d.querySelectorAll('script, iframe, object, embed, link').forEach(function (el) {
      el.remove();
    });
    d.querySelectorAll('*').forEach(function (el) {
      ['onerror', 'onload', 'onclick'].forEach(function (attr) {
        el.removeAttribute(attr);
      });
    });
    return d.innerHTML;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function markdownToHtml(md) {
    var raw = String(md || '');
    if (typeof global.marked !== 'undefined' && global.marked.parse) {
      try {
        var out = global.marked.parse(escapeHtml(raw), { breaks: true });
        return stripUnsafeHtml(out);
      } catch (e) {
        console.warn('marked parse failed', e);
      }
    }
    var esc = escapeHtml(raw).replace(/\n/g, '<br>');
    return '<p>' + esc + '</p>';
  }

  function ask(query) {
    return fetch(ASK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ query: query, top_k: DEFAULT_TOP_K })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      clampConstrainedAnswer(data, query);
      var normalized = normalizeOmniverseResponse(data, query);
      return alignImagesToVenues(normalized, query);
    });
  }

  /**
   * Pull candidate keyword labels from a prose / markdown answer.
   */
  function extractKeywordPhrases(answer, max) {
    max = max || 10;
    var text = String(answer || '');
    var lines = text.split(/\r?\n/);
    var out = [];
    var seen = {};

    function pushPhrase(phrase) {
      var t = phrase.replace(/\*\*/g, '').replace(/`/g, '').trim();
      t = t.replace(/^[\s"'«»]+|[\s"'«»]+$/g, '');
      if (t.length < 2 || t.length > 90) return;
      var k = t.toLowerCase();
      if (seen[k]) return;
      seen[k] = true;
      out.push(t);
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.replace(/^[\s>*]+/, '').trim();
      var bullet = trimmed
        .replace(/^[-*•]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .trim();
      if (bullet && !/^#{1,6}\s/.test(bullet)) pushPhrase(bullet);
    }

    if (out.length === 0) {
      var parts = text.split(/[.!?]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      for (var j = 0; j < parts.length && out.length < max; j++) {
        var p = parts[j].replace(/^[-*•\d.\s]+/, '').trim();
        if (p.length > 8 && p.length < 80) pushPhrase(p);
      }
    }

    return out.slice(0, max);
  }

  global.LuxuryIntelligence = {
    ASK_URL: ASK_URL,
    DEFAULT_TOP_K: DEFAULT_TOP_K,
    ANALYZING_TEXT: ANALYZING_TEXT,
    DASHBOARD_KEYWORDS_QUERY: DASHBOARD_KEYWORDS_QUERY,
    ask: ask,
    markdownToHtml: markdownToHtml,
    extractKeywordPhrases: extractKeywordPhrases,
    applyKeywordConstraints: applyKeywordConstraints,
    detectConstrainedCategories: detectConstrainedCategories,
    detectAreas: detectAreas,
    getCuratedListFor: getCuratedListFor,
    getCuratedMapFor: getCuratedMapFor,
    findMentionedVenues: findMentionedVenues,
    normalizeOmniverseResponse: normalizeOmniverseResponse,
    alignImagesToVenues: alignImagesToVenues,
    clampConstrainedAnswer: clampConstrainedAnswer,
    buildConstrainedVenuePool: buildConstrainedVenuePool,
    getVenueLocation: getVenueLocation,
    VENUE_IMAGES: VENUE_IMAGES
  };
})(typeof window !== 'undefined' ? window : this);
