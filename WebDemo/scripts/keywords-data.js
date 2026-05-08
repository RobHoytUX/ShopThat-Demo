(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

// Article data - maps keywords to related articles
const keywordArticles = {
  'LVMH': [
    { title: 'Luxury Market Analysis 2024', publisher: 'Financial Times', image: 'assets/foundation-lv-png.png', views: '12,340', url: 'https://www.ft.com/content/198207f2-5f5e-441c-b033-7deee8a28feb' },
    { title: 'LVMH Art & Culture Initiatives', publisher: 'Le Monde', image: 'assets/lv-art.avif', views: '8,920', url: 'https://www.lemonde.fr/en/economy/article/2024/01/25/lvmh-bets-on-art-and-culture_6457890_19.html' },
    { title: 'LV New York City Guide', publisher: 'Louis Vuitton', image: 'assets/lv-nyc-guide.png', views: '15,670', url: 'https://us.louisvuitton.com/eng-us/magazine/articles/city-guide-new-york' }
  ],
  'The Modern': [
    { title: 'MoMA Dining Experience', publisher: 'NY Times', image: 'assets/restaurants/the-modern.jpg', views: '5,230', url: 'https://www.nytimes.com/2023/12/05/dining/the-modern-review.html' },
    { title: 'Modern Art & Fine Dining', publisher: 'Condé Nast', image: 'assets/museums/moma.jpg', views: '3,890', url: 'https://www.cntraveler.com/restaurants/new-york/the-modern' }
  ],
  'Le Bernardin': [
    { title: 'Eric Ripert\'s Seafood Mastery', publisher: 'Eater', image: 'assets/restaurants/le-bernardin.jpg', views: '7,120', url: 'https://www.eater.com/2024/1/10/le-bernardin-eric-ripert' },
    { title: 'Michelin Three Star Excellence', publisher: 'Michelin Guide', image: 'assets/restaurants/le-bernardin.jpg', views: '4,560', url: 'https://guide.michelin.com/us/en/new-york-state/new-york/restaurant/le-bernardin' }
  ],
  'Cafe Carlyle': [
    { title: 'Iconic NYC Cabaret Scene', publisher: 'Vanity Fair', image: 'assets/restaurants/cafe-carlyle.jpg', views: '6,780', url: 'https://www.vanityfair.com/style/cafe-carlyle-cabaret' },
    { title: 'The Carlyle Legacy', publisher: 'Town & Country', image: 'assets/restaurants/carlyle-hotel.jpg', views: '4,230', url: 'https://www.townandcountrymag.com/leisure/travel-guide/the-carlyle-hotel' }
  ],
  'MoMA Museum': [
    { title: 'Modern Art Masterpieces', publisher: 'Art News', image: 'assets/museums/moma.jpg', views: '9,450', url: 'https://www.artnews.com/list/art-news/museums/moma-masterpieces/' },
    { title: 'Kusama at MoMA', publisher: 'David Zwirner', image: 'assets/kusama-book.png', views: '11,200', url: 'https://www.davidzwirner.com/artists/yayoi-kusama' }
  ],
  'The Carlyle': [
    { title: 'Manhattan\'s Most Storied Hotel', publisher: 'Architectural Digest', image: 'assets/restaurants/carlyle-hotel.jpg', views: '5,670', url: 'https://www.architecturaldigest.com/story/the-carlyle-hotel-new-york' }
  ],
  'The Plaza': [
    { title: 'Plaza Hotel Heritage', publisher: 'Condé Nast Traveler', image: 'assets/restaurants/the-plaza.jpg', views: '8,340', url: 'https://www.cntraveler.com/hotels/new-york/the-plaza' }
  ],
  'The St. Regis': [
    { title: 'St. Regis NYC Experience', publisher: 'Forbes Travel', image: 'assets/restaurants/st-regis.jpg', views: '4,890', url: 'https://www.forbes.com/sites/forbestravelguide/the-st-regis-new-york/' }
  ],
  'The Baccarat': [
    { title: 'Crystal & Luxury', publisher: 'Robb Report', image: 'assets/restaurants/baccarat.jpg', views: '3,560', url: 'https://robbreport.com/travel/hotels/baccarat-hotel-new-york/' }
  ],
  'The Mark Hotel': [
    { title: 'Upper East Side Elegance', publisher: 'Travel + Leisure', image: 'assets/restaurants/mark-hotel.jpg', views: '4,120', url: 'https://www.travelandleisure.com/hotels-resorts/the-mark-hotel-new-york' }
  ],
  'default': [
    { title: 'Luxury Lifestyle Guide', publisher: 'Financial Times', image: 'assets/foundation-lv-png.png', views: '2,340', url: 'https://www.ft.com/luxury' }
  ]
};

// Get articles for a keyword (fallback when Discovery API empty / fails)
function getArticlesForKeyword(keyword) {
  return keywordArticles[keyword] || keywordArticles['default'];
}

/** Map graph node id to API keyword string */
function keywordDiscoveryQuery(nodeId) {
  if (!nodeId || nodeId === 'LVMH') return 'louis vuitton';
  return String(nodeId).trim();
}

function buildSidebarArticlesHTML(articles) {
  if (!articles || !articles.length) {
    return '<p class="sidebar-articles-empty" style="color:#9ca3af;font-size:13px;margin:8px 0;">No articles found.</p>';
  }
  return articles
    .map(function (article) {
      var href = article.url || '#';
      var viewsLine =
        article.viewsLabel != null
          ? String(article.viewsLabel)
          : article.views != null
            ? String(article.views) + ' views'
            : '';
      return `
    <a class="sidebar-article" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;cursor:pointer;">
      <div class="sidebar-article-image">
        <img src="${escapeHtml(article.image || '')}" alt="${escapeHtml(article.title || '')}" onerror="this.style.display='none'">
      </div>
      <div class="sidebar-article-info">
        <div class="sidebar-article-title">${escapeHtml(article.title || '')}</div>
        ${article.excerpt ? `<p class="sidebar-article-excerpt">${escapeHtml(article.excerpt)}</p>` : ''}
        <div class="sidebar-article-meta">
          <span class="sidebar-article-publisher">${escapeHtml(article.publisher || '')}</span>
          <span class="sidebar-article-views">${escapeHtml(viewsLine)}</span>
        </div>
      </div>
    </a>
  `;
    })
    .join('');
}

function generateArticlesHTML(keyword) {
  return buildSidebarArticlesHTML(getArticlesForKeyword(keyword));
}

/** Load Keyword Discovery API articles into `.kw-related-articles-mount` inside rootEl */
function hydrateRelatedArticles(keywordId, rootEl) {
  if (!rootEl || !keywordId) return;
  var mount = rootEl.querySelector('.kw-related-articles-mount');
  if (!mount) return;

  mount.innerHTML =
    '<p class="sidebar-articles-loading" style="color:#6b7280;font-size:13px;margin:8px 0;">Loading articles…</p>';

  var q = keywordDiscoveryQuery(keywordId);
  var fallback = function () {
    mount.innerHTML = buildSidebarArticlesHTML(getArticlesForKeyword(keywordId));
  };

  if (!global.ShopThatKeywordDiscovery || !global.ShopThatKeywordDiscovery.fetchKeywordDetails) {
    fallback();
    return;
  }

  global.ShopThatKeywordDiscovery
    .fetchKeywordDetails(q)
    .then(function (data) {
      var list = global.ShopThatKeywordDiscovery.normalizeDashboardArticles(data, 12);
      if (!list.length) {
        fallback();
        return;
      }
      var mapped = list.map(function (a) {
        return {
          title: a.title,
          excerpt: a.excerpt || '',
          publisher: a.source || 'Indexed content',
          image: a.image,
          url: a.url,
          viewsLabel: a.views
        };
      });
      mount.innerHTML = buildSidebarArticlesHTML(mapped);
    })
    .catch(function (err) {
      console.warn('Keyword Discovery (sidebar):', err);
      fallback();
    });
}



// ──────────────────────────────────────────────────────────────────────────
// Demo keyword graph (Louis Vuitton ▸ Kusama / New York ▸ …).
// Source of truth = the curated screenshots, NOT AI generation.
//
// Hierarchy (every non-root node has a `parent` field; the tree view follows
// those parents directly, so depth is unbounded):
//
//   Louis Vuitton (LVMH)
//     ├── Kusama
//     │     ├── Museums  ─ Fondation LV, Kusama Museum
//     │     ├── Style    ─ Polka Dots, Pumpkin, Infinity Mirrors
//     │     └── Galleries ─ Victoria Miro, David Zwirner
//     └── New York
//           └── Stores
//                 ├── 57th St.
//                 │     ├── 57th St. Restaurants ─ …
//                 │     └── 57th St. Hotels      ─ …
//                 └── Soho
//                       ├── SoHo Hotels       ─ …
//                       └── SoHo Restaurants  ─ …
// ──────────────────────────────────────────────────────────────────────────
const defaultNodes = [
  // Root (rendered as “Louis Vuitton” by the tree view).
  { id: 'LVMH', group: 0, value: 100, isRoot: true },

  // Top-level pillars.
  { id: 'Kusama',   group: 1, value: 95, isArea: true, parent: 'LVMH' },
  { id: 'New York', group: 1, value: 95, isArea: true, parent: 'LVMH' },

  // ── Kusama subtree ──────────────────────────────────────────────────
  { id: 'Museums',   group: 2, value: 85, parent: 'Kusama' },
  { id: 'Style',     group: 2, value: 85, parent: 'Kusama' },
  { id: 'Galleries', group: 2, value: 85, parent: 'Kusama' },
  { id: 'Fondation LV',     group: 4, value: 72, parent: 'Museums' },
  { id: 'Kusama Museum',    group: 4, value: 72, parent: 'Museums' },
  { id: 'Polka Dots',       group: 4, value: 78, parent: 'Style' },
  { id: 'Pumpkin',          group: 4, value: 78, parent: 'Style' },
  { id: 'Infinity Mirrors', group: 4, value: 78, parent: 'Style' },
  { id: 'Victoria Miro',    group: 4, value: 70, parent: 'Galleries' },
  { id: 'David Zwirner',    group: 4, value: 75, parent: 'Galleries' },

  // ── New York → Stores → (57th St., Soho) ────────────────────────────
  { id: 'Stores',  group: 2, value: 90, parent: 'New York' },
  { id: '57th St.', group: 3, value: 88, isArea: true, parent: 'Stores' },
  { id: 'Soho',     group: 3, value: 88, isArea: true, parent: 'Stores' },

  // 57th St. categories — only Restaurants and Hotels per the spec.
  { id: '57th St. Restaurants', group: 3, value: 80, parent: '57th St.' },
  { id: '57th St. Hotels',      group: 3, value: 80, parent: '57th St.' },

  // 57th St. restaurants
  { id: 'The Mark',         group: 4, value: 70, parent: '57th St. Restaurants' },
  { id: 'Gabriel Kreuther', group: 4, value: 70, parent: '57th St. Restaurants' },
  { id: 'THE GRILL',        group: 4, value: 70, parent: '57th St. Restaurants' },
  { id: 'KANG HO DONG',     group: 4, value: 65, parent: '57th St. Restaurants' },
  { id: 'Le Pavillon',      group: 4, value: 70, parent: '57th St. Restaurants' },
  { id: 'Marea',            group: 4, value: 68, parent: '57th St. Restaurants' },
  { id: 'The Modern',       group: 4, value: 75, parent: '57th St. Restaurants' },
  { id: 'Le Bernardin',     group: 4, value: 80, parent: '57th St. Restaurants' },
  { id: 'Cafe Carlyle',     group: 4, value: 70, parent: '57th St. Restaurants' },

  // 57th St. hotels
  { id: 'Ace Hotel',            group: 4, value: 65, parent: '57th St. Hotels' },
  { id: 'The Baccarat Hotel',   group: 4, value: 70, parent: '57th St. Hotels' },
  { id: 'The Plaza',            group: 4, value: 80, parent: '57th St. Hotels' },
  { id: 'CIVILIAN Hotel',       group: 4, value: 60, parent: '57th St. Hotels' },
  { id: 'ST Regis',             group: 4, value: 78, parent: '57th St. Hotels' },
  { id: 'Times Square Edition', group: 4, value: 65, parent: '57th St. Hotels' },
  { id: 'DANIEL',               group: 4, value: 70, parent: '57th St. Hotels' },
  { id: 'Le Bilboquet',         group: 4, value: 65, parent: '57th St. Hotels' },
  { id: 'The Mark Hotel',       group: 4, value: 75, parent: '57th St. Hotels' },

  // SoHo categories
  { id: 'SoHo Hotels',      group: 3, value: 80, parent: 'Soho' },
  { id: 'SoHo Restaurants', group: 3, value: 80, parent: 'Soho' },

  // SoHo hotels
  { id: 'CROSBY STREET HOTEL',       group: 4, value: 70, parent: 'SoHo Hotels' },
  { id: 'THE BOWERY HOTEL',          group: 4, value: 70, parent: 'SoHo Hotels' },
  { id: 'THE STANDARD EAST VILLAGE', group: 4, value: 65, parent: 'SoHo Hotels' },
  { id: 'THE MERCER',                group: 4, value: 70, parent: 'SoHo Hotels' },
  { id: 'THE GREENWICH',             group: 4, value: 65, parent: 'SoHo Hotels' },
  { id: 'HOTEL BARRIERE FOUQUET',    group: 4, value: 60, parent: 'SoHo Hotels' },
  { id: 'PUBLIC',                    group: 4, value: 65, parent: 'SoHo Hotels' },

  // SoHo restaurants
  { id: 'BAR PITTI',              group: 4, value: 65, parent: 'SoHo Restaurants' },
  { id: 'MINETTA TAVERN',         group: 4, value: 70, parent: 'SoHo Restaurants' },
  { id: 'SHUKO',                  group: 4, value: 65, parent: 'SoHo Restaurants' },
  { id: 'IL BUCO ALIMENTARI',     group: 4, value: 60, parent: 'SoHo Restaurants' },
  { id: 'BALTHAZAR',              group: 4, value: 70, parent: 'SoHo Restaurants' },
  { id: 'JOSEPH LEONARD',         group: 4, value: 60, parent: 'SoHo Restaurants' },
  { id: 'ESTELLA',                group: 4, value: 60, parent: 'SoHo Restaurants' },
  { id: "JACK'S WIFE FRIEDA",     group: 4, value: 60, parent: 'SoHo Restaurants' },
  { id: 'FRENCHETTE',             group: 4, value: 65, parent: 'SoHo Restaurants' },
  { id: "L'ABEILLE",              group: 4, value: 60, parent: 'SoHo Restaurants' },
  { id: 'LOCANDA VERDE',          group: 4, value: 65, parent: 'SoHo Restaurants' },
  { id: 'DIRTY FRENCH',           group: 4, value: 60, parent: 'SoHo Restaurants' },
  { id: '63 CLINTON',             group: 4, value: 55, parent: 'SoHo Restaurants' },
  { id: 'ST AMBROEUS',            group: 4, value: 65, parent: 'SoHo Restaurants' },
  { id: 'OMEN',                   group: 4, value: 55, parent: 'SoHo Restaurants' },
  { id: "THE BUTCHER'S DAUGHTER", group: 4, value: 55, parent: 'SoHo Restaurants' },
  { id: 'INDOCHINE',              group: 4, value: 60, parent: 'SoHo Restaurants' },
  { id: 'LA MERCERIE',            group: 4, value: 60, parent: 'SoHo Restaurants' },
  { id: 'LE COUCOU',              group: 4, value: 65, parent: 'SoHo Restaurants' }
];
// Auto-generate links from the parent fields above so the bubble graph
// adjacency mirrors the tree exactly. Cross-area extras (e.g. David Zwirner
// also lives in 57th St. Galleries semantically) are appended at the end.
const defaultLinks = (function buildDefaultLinks() {
  var out = [];
  defaultNodes.forEach(function (n) {
    if (n.parent) out.push({ source: n.parent, target: n.id });
  });
  return out;
})();


// Group colors for linear view
const groupColors = {
  0: { gradient: 'linear-gradient(135deg, #1e3a8a, #1e40af, #312e81)', label: 'Root' },
  1: { gradient: 'linear-gradient(135deg, #06b6d4, #8b5cf6, #6366f1)', label: 'Primary' },
  2: { gradient: 'linear-gradient(135deg, #10b981, #34d399, #06b6d4)', label: 'Connected' },
  3: { gradient: 'linear-gradient(135deg, #f97316, #ec4899, #f472b6)', label: 'Secondary' },
  4: { gradient: 'linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)', label: 'Tertiary' }
};

// Category mapping for organizing connected keywords
const keywordCategories = {
  // Restaurants & Dining Venues
  'The Modern': 'Restaurants',
  'The Modern (Dining Room)': 'Restaurants',
  'The Bar Room': 'Restaurants',
  'The Kitchen Table': 'Restaurants',
  'Le Bernardin': 'Restaurants',
  'Cafe Carlyle': 'Restaurants',
  'Jean-Georges at The Mark': 'Restaurants',
  "Dowling's at The Carlyle": 'Restaurants',
  'Restaurant': 'Restaurants',
  'Supper Club': 'Restaurants',
  'Comfortable Dining Room': 'Restaurants',

  // Hotels
  'The Carlyle': 'Hotels',
  'The Mark Hotel': 'Hotels',
  'The Plaza': 'Hotels',
  'The St. Regis': 'Hotels',
  'The Baccarat': 'Hotels',
  'Rosewood Hotel': 'Hotels',
  'Luxury Hotel': 'Hotels',
  'Hotel': 'Hotels',
  'Five-Star': 'Hotels',

  // Galleries & Museums
  'MoMA Museum': 'Galleries',
  'MoMA Sculpture Garden': 'Galleries',
  'Sculpture Garden': 'Galleries',
  'Metropolitan Museum of Art': 'Galleries',
  'Madeline Murals': 'Galleries',

  // Bars & Lounges
  'Bemelmans Bar': 'Bars & Lounges',
  'King Cole Bar': 'Bars & Lounges',
  'Elegant Bar': 'Bars & Lounges',
  'Swanky Bar': 'Bars & Lounges',
  'Hand Crafted Bar': 'Bars & Lounges',
  'Cocktails': 'Bars & Lounges',

  // Cuisine & Dishes
  'Seafood': 'Cuisine & Dishes',
  'Fine Dining': 'Cuisine & Dishes',
  'French Cuisine': 'Cuisine & Dishes',
  'Tasting Menu': 'Cuisine & Dishes',
  'Prix Fixe': 'Cuisine & Dishes',
  'Almost Raw': 'Cuisine & Dishes',
  'Barely Touched': 'Cuisine & Dishes',
  'Lightly Cooked': 'Cuisine & Dishes',
  'Eggs on Eggs on Eggs': 'Cuisine & Dishes',
  'Caviar Hot Dogs': 'Cuisine & Dishes',
  'Tuna with Foie Gras': 'Cuisine & Dishes',
  'Slowly Baked Salmon with Caviar': 'Cuisine & Dishes',
  'Poached Lobster': 'Cuisine & Dishes',
  'Dover Sole': 'Cuisine & Dishes',
  'Scallop with Caviar': 'Cuisine & Dishes',
  'Halibut': 'Cuisine & Dishes',
  'Pistachio Dessert': 'Cuisine & Dishes',
  'Peruvian Dark Chocolate Tart': 'Cuisine & Dishes',
  'Lobster': 'Cuisine & Dishes',
  'Truffles': 'Cuisine & Dishes',
  'Lunch': 'Cuisine & Dishes',
  'Dinner': 'Cuisine & Dishes',
  'Brunch': 'Cuisine & Dishes',
  'Afternoon Tea': 'Cuisine & Dishes',
  'Seasonal & Local': 'Cuisine & Dishes',
  'Fresh from the Market': 'Cuisine & Dishes',
  'Innovative Seasonings': 'Cuisine & Dishes',
  'French-Inspired': 'Cuisine & Dishes',
  'Global Bistro': 'Cuisine & Dishes',
  'The Fish is the Star': 'Cuisine & Dishes',
  'Wine': 'Cuisine & Dishes',
  'Sommelier': 'Cuisine & Dishes',
  'Grand Award Wine List': 'Cuisine & Dishes',

  // Awards & Recognition
  'Two Michelin Stars': 'Awards',
  'Three Michelin Stars': 'Awards',
  'Four-Star NY Times': 'Awards',
  'La Liste Top Restaurants': 'Awards',
  'World Class': 'Awards',

  // People
  'Eric Ripert': 'People',
  'Jean-Georges Vongerichten': 'People',
  'Ludwig Bemelmans': 'People',
  'Celebrities': 'People',

  // Locations
  'New York': 'Locations',
  'Upper East Side': 'Locations',
  'Midtown Manhattan': 'Locations',
  'Central Park': 'Locations',
  '57th St.': 'Areas',
  'Soho': 'Areas',
  'Central Park Views': 'Locations',
  'Madison Avenue': 'Locations',
  '76th Street': 'Locations',
  '57th Street': 'Locations',
  '51st Street': 'Locations',
  'Empire State Building': 'Locations',

  // Entertainment
  'Classic Cabaret': 'Entertainment',
  'Live Entertainment': 'Entertainment',
  'Concerts': 'Entertainment',
  'Evenings': 'Entertainment',
  'People Watching': 'Entertainment',

  // Amenities & Services
  'Spa': 'Amenities',
  'Valmont Spa': 'Amenities',
  'Yves Durif Salon': 'Amenities',
  'Fitness Center': 'Amenities',
  'Gym': 'Amenities',
  'Indoor Pool': 'Amenities',
  'Steam Room': 'Amenities',
  'Concierge': 'Amenities',
  '24-Hour Service': 'Amenities',
  'Valet Parking': 'Amenities',
  'Pet-Friendly': 'Amenities',
  'Salon': 'Amenities',
  'Hospitality Included': 'Amenities',
  '28-Day Reservations': 'Amenities',
  'Reservations Required': 'Amenities',
  'Professional Service': 'Amenities',
  'Expert Service': 'Amenities',
  'Union Square Hospitality Group (USHG)': 'Amenities',

  // Style & Atmosphere
  'Art Deco': 'Style & Atmosphere',
  'Art Deco-Inspired': 'Style & Atmosphere',
  'Elegant': 'Style & Atmosphere',
  'Contemporary': 'Style & Atmosphere',
  'Upscale': 'Style & Atmosphere',
  'Upscale & Sophisticated': 'Style & Atmosphere',
  'Luxurious Decor': 'Style & Atmosphere',
  'Polished': 'Style & Atmosphere',
  'Iconic': 'Style & Atmosphere',
  'Luxury': 'Style & Atmosphere',
  'Landmark Building': 'Style & Atmosphere',
  '19th-Century Architecture': 'Style & Atmosphere',
  'Artful & Refined': 'Style & Atmosphere',
  'Dress Code': 'Style & Atmosphere',
  'Business Casual': 'Style & Atmosphere',
  'Special Occasions': 'Style & Atmosphere'
};

// Preferred category display order
const categoryOrder = [
  'Areas', 'Restaurants', 'Hotels', 'Galleries', 'Bars & Lounges',
  'Cuisine & Dishes', 'Awards', 'People', 'Locations',
  'Entertainment', 'Amenities', 'Style & Atmosphere', 'Other'
];



global.ShopThatKeywordsData = {
  categoryOrder,
  defaultLinks,
  defaultNodes,
  generateArticlesHTML,
  buildSidebarArticlesHTML,
  hydrateRelatedArticles,
  keywordDiscoveryQuery,
  groupColors,
  keywordCategories
};

global.kwHydrateRelatedArticles = hydrateRelatedArticles;

})(typeof window !== 'undefined' ? window : this);
