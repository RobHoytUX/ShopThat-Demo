/* Keywords Bubble Graph */
console.log('Keywords.js loading...');
console.log('D3 available:', typeof d3 !== 'undefined');
console.log('Document ready state:', document.readyState);

(function(){
  console.log('IIFE started');
  function $(sel, root=document){ return root.querySelector(sel); }

  const svg = d3.select('#bubbleGraph');
  const container = document.querySelector('.keywords');
  const detailsDrawer = document.getElementById('detailsDrawer');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerBody = document.getElementById('drawerBody');
  const neo4jDrawer = document.getElementById('neo4jDrawer');
  const neo4jClose = document.getElementById('neo4jClose');
  const openNeo4jBtn = document.getElementById('openNeo4j');
  const filterInput = document.getElementById('kwFilter');
  const resetBtn = document.getElementById('resetKw');
  const zoomIn = document.getElementById('zoomIn');
  const zoomOut = document.getElementById('zoomOut');
  const fitBtn = document.getElementById('fit');

  console.log('DOM elements check:', {
    svg: svg.node(),
    container: container,
    svgExists: !!document.getElementById('bubbleGraph'),
    containerExists: !!container
  });

  // Get dimensions - use clientWidth/Height if available, otherwise parse viewBox
  const width = () => {
    const w = svg.node().clientWidth;
    if (w > 0) return w;
    // Fallback to viewBox width
    const viewBox = svg.attr('viewBox');
    if (viewBox) {
      const parts = viewBox.split(' ');
      return parseFloat(parts[2]) || 800;
    }
    return 800;
  };
  const height = () => {
    const h = svg.node().clientHeight;
    if (h > 0) return h;
    // Fallback to viewBox height
    const viewBox = svg.attr('viewBox');
    if (viewBox) {
      const parts = viewBox.split(' ');
      return parseFloat(parts[3]) || 600;
    }
    return 600;
  };

  // State management for hierarchical display
  let currentViewMode = 'default'; // 'default' / 'tree' (bubbles drill-down) / 'expanded' / 'filtered' / 'all' / 'linear'
  let selectedNode = null;
  let allNodes = [];
  let allLinks = [];
  let visibleNodes = [];
  let visibleLinks = [];

  // Tree-style bubble navigation: which node IDs currently have their direct
  // children expanded into the visible bubble set. The Bubbles tab starts
  // empty (only LVMH visible) and grows as the user clicks nodes.
  // Declared with `var` to avoid TDZ when getVisibleNodes runs early.
  var bubblesExpandedIds = new Set();

  function getBubbleChildrenOf(parentId) {
    return allNodes.filter(function (n) { return n.parent === parentId; });
  }

  function collapseBubbleSubtree(id) {
    // Drop `id` and every descendant id from the expanded set so collapsing
    // a parent also folds back any deeper expansions underneath it.
    var stack = [id];
    while (stack.length) {
      var cur = stack.pop();
      bubblesExpandedIds.delete(cur);
      getBubbleChildrenOf(cur).forEach(function (child) { stack.push(child.id); });
    }
  }

  function getBubbleVisibleNodeIds() {
    var visible = new Set();
    var rootNode = allNodes.find(function (n) { return n.isRoot; }) ||
                   allNodes.find(function (n) { return n.id === 'LVMH'; });
    if (!rootNode) return visible;
    visible.add(rootNode.id);

    var queue = [rootNode.id];
    while (queue.length) {
      var cur = queue.shift();
      if (!bubblesExpandedIds.has(cur)) continue;
      getBubbleChildrenOf(cur).forEach(function (child) {
        if (!visible.has(child.id)) {
          visible.add(child.id);
          queue.push(child.id);
        }
      });
    }
    return visible;
  }
  
  // State history for back navigation
  const stateHistory = [];
  const MAX_HISTORY = 50;
  
  function pushState() {
    const state = {
      viewMode: currentViewMode,
      selectedNodeId: selectedNode ? selectedNode.id : null,
      hiddenGroups: new Set(hiddenGroups),
      timestamp: Date.now()
    };
    stateHistory.push(state);
    if (stateHistory.length > MAX_HISTORY) {
      stateHistory.shift();
    }
    console.log('State pushed:', state.viewMode, state.selectedNodeId, 'History length:', stateHistory.length);
  }
  
  function popState() {
    if (stateHistory.length === 0) {
      return null;
    }
    return stateHistory.pop();
  }
  
  // Flag to prevent clearing hiddenGroups during state restoration
  let isRestoringState = false;
  
  function restoreState(state) {
    if (!state) return false;
    
    isRestoringState = true;
    
    currentViewMode = state.viewMode;
    selectedNode = state.selectedNodeId ? allNodes.find(n => n.id === state.selectedNodeId) : null;
    hiddenGroups.clear();
    if (state.hiddenGroups) {
      state.hiddenGroups.forEach(g => hiddenGroups.add(g));
    }
    
    clickedNode = null;
    hoveredNode = null;
    isHoverClustering = false;
    
    // Call setGraphData - the wrapper will check isRestoringState flag
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => {
      updateFilterCheckboxes();
      isRestoringState = false;
    }, 250);
    
    if (selectedNode) {
      openDrawer(selectedNode);
    } else {
      closeDrawer();
    }
    
    console.log('State restored:', currentViewMode, selectedNode?.id);
    return true;
  }
  
  // Track hidden groups (will be defined later but declared here for state management)
  let hiddenGroups = new Set();
  let disabledNodes = new Set(); // Track individually disabled nodes
  let filterState = {
    topLevel: true,
    connected: true,
    secondary: true,
    isolated: true
  };
  
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
  
  // Get articles for a keyword
  function getArticlesForKeyword(keyword) {
    return keywordArticles[keyword] || keywordArticles['default'];
  }
  
  // Generate articles HTML for sidebar
  function generateArticlesHTML(keyword) {
    const articles = getArticlesForKeyword(keyword);
    return articles.map(article => `
      <a class="sidebar-article" href="${article.url || '#'}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;cursor:pointer;">
        <div class="sidebar-article-image">
          <img src="${article.image}" alt="${article.title}" onerror="this.style.display='none'">
        </div>
        <div class="sidebar-article-info">
          <div class="sidebar-article-title">${article.title}</div>
          <div class="sidebar-article-meta">
            <span class="sidebar-article-publisher">${article.publisher}</span>
            <span class="sidebar-article-views">${article.views} views</span>
          </div>
        </div>
      </a>
    `).join('');
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
  // Legacy nodes kept only so existing references compile; they’re unused.
  const _legacyDefaultNodes_unused = [
    { id: '__legacy', group: 1, value: 1 },
    
    // ============================================
    // THE MODERN RESTAURANT
    // ============================================
    // Group 1 - Top Level (Most Connected) - Core concepts (Blue #6366F1)
    { id: 'The Modern', group: 1, value: 95 },
    { id: 'Two Michelin Stars', group: 1, value: 90 },
    { id: 'MoMA Museum', group: 1, value: 85 },
    
    // Group 2 - Connected to Top Level - Dining experiences & venues (Purple #5B21B6)
    { id: 'The Modern (Dining Room)', group: 2, value: 82 },
    { id: 'The Bar Room', group: 2, value: 75 },
    { id: 'The Kitchen Table', group: 2, value: 68 },
    { id: 'Sculpture Garden', group: 2, value: 80 },
    { id: 'MoMA Sculpture Garden', group: 2, value: 78 },
    { id: 'Eggs on Eggs on Eggs', group: 2, value: 85 },
    { id: 'Grand Award Wine List', group: 2, value: 80 },
    { id: 'Upscale & Sophisticated', group: 2, value: 72 },
    
    // Group 3 - Secondary Connected - Menu items & descriptors (Orange #F59E0B)
    { id: 'Truffles', group: 3, value: 70 },
    { id: 'Cocktails', group: 3, value: 60 },
    { id: 'Lunch', group: 3, value: 55 },
    { id: 'Dinner', group: 3, value: 60 },
    { id: 'Seasonal & Local', group: 3, value: 65 },
    { id: 'Caviar Hot Dogs', group: 3, value: 70 },
    
    // Group 4 - Isolated/Contextual - Business & booking details (Green #10B981)
    { id: 'Union Square Hospitality Group (USHG)', group: 4, value: 60 },
    { id: 'Artful & Refined', group: 4, value: 55 },
    { id: '28-Day Reservations', group: 4, value: 50 },
    { id: 'Hospitality Included', group: 4, value: 52 },

    // ============================================
    // LE BERNARDIN RESTAURANT
    // ============================================
    // Group 1 - Top Level (Most Connected) - Core concepts (Blue #6366F1)
    { id: 'Le Bernardin', group: 1, value: 95 },
    { id: 'Three Michelin Stars', group: 1, value: 92 },
    { id: 'Eric Ripert', group: 1, value: 88 },
    { id: 'Seafood', group: 1, value: 85 },
    
    // Group 2 - Connected to Top Level - Dining experiences & style (Purple #5B21B6)
    { id: 'Fine Dining', group: 2, value: 82 },
    { id: 'French Cuisine', group: 2, value: 80 },
    { id: 'Tasting Menu', group: 2, value: 78 },
    { id: 'Prix Fixe', group: 2, value: 75 },
    { id: 'Elegant', group: 2, value: 70 },
    { id: 'Contemporary', group: 2, value: 68 },
    { id: 'Upscale', group: 2, value: 72 },
    { id: 'Professional Service', group: 2, value: 75 },
    { id: 'Luxurious Decor', group: 2, value: 70 },
    { id: 'Wine', group: 2, value: 72 },
    { id: 'Sommelier', group: 2, value: 68 },
    { id: 'Expert Service', group: 2, value: 70 },
    
    // Group 3 - Secondary Connected - Menu sections & descriptors (Orange #F59E0B)
    { id: 'Almost Raw', group: 3, value: 65 },
    { id: 'Barely Touched', group: 3, value: 65 },
    { id: 'Lightly Cooked', group: 3, value: 65 },
    { id: 'Business Casual', group: 3, value: 55 },
    { id: 'Reservations Required', group: 3, value: 60 },
    { id: 'Special Occasions', group: 3, value: 58 },
    { id: 'The Fish is the Star', group: 3, value: 62 },
    
    // Group 4 - Signature Dishes (Green #10B981)
    { id: 'Tuna with Foie Gras', group: 4, value: 72 },
    { id: 'Slowly Baked Salmon with Caviar', group: 4, value: 70 },
    { id: 'Pistachio Dessert', group: 4, value: 60 },
    { id: 'Poached Lobster', group: 4, value: 68 },
    { id: 'Dover Sole', group: 4, value: 65 },
    { id: 'Scallop with Caviar', group: 4, value: 66 },
    { id: 'Halibut', group: 4, value: 62 },
    { id: 'Peruvian Dark Chocolate Tart', group: 4, value: 58 },
    { id: 'Four-Star NY Times', group: 4, value: 55 },
    { id: 'La Liste Top Restaurants', group: 4, value: 52 },

    // ============================================
    // THE CARLYLE HOTEL
    // ============================================
    // Group 1 - Top Level (Most Connected) - Core concepts (Blue #6366F1)
    { id: 'Cafe Carlyle', group: 1, value: 95 },
    { id: 'The Carlyle', group: 1, value: 92 },
    { id: 'Bemelmans Bar', group: 1, value: 88 },
    { id: 'Art Deco', group: 1, value: 85 },
    { id: 'Luxury Hotel', group: 1, value: 82 },
    
    // Group 2 - Connected to Top Level - Venues & experiences (Purple #5B21B6)
    { id: 'Classic Cabaret', group: 2, value: 80 },
    { id: 'Dowling\'s at The Carlyle', group: 2, value: 78 },
    { id: 'Ludwig Bemelmans', group: 2, value: 75 },
    { id: 'Madeline Murals', group: 2, value: 72 },
    { id: 'Live Entertainment', group: 2, value: 75 },
    { id: 'Supper Club', group: 2, value: 70 },
    { id: 'Rosewood Hotel', group: 2, value: 72 },
    { id: 'Upper East Side', group: 2, value: 78 },
    { id: 'Five-Star', group: 2, value: 80 },
    { id: 'Iconic', group: 2, value: 68 },
    { id: 'Celebrities', group: 2, value: 72 },
    
    // Group 3 - Secondary Connected - Details & atmosphere (Orange #F59E0B)
    { id: 'Dress Code', group: 3, value: 60 },
    { id: 'Evenings', group: 3, value: 55 },
    { id: 'Concerts', group: 3, value: 65 },
    { id: '76th Street', group: 3, value: 52 },
    { id: 'Madison Avenue', group: 3, value: 68 },
    { id: 'Central Park', group: 3, value: 75 },
    
    // Group 4 - Isolated/Contextual - Amenities & services (Green #10B981)
    { id: 'Valmont Spa', group: 4, value: 58 },
    { id: 'Yves Durif Salon', group: 4, value: 52 },
    { id: 'Fitness Center', group: 4, value: 50 },
    { id: 'Pet-Friendly', group: 4, value: 48 },
    { id: 'Concierge', group: 4, value: 55 },
    { id: '24-Hour Service', group: 4, value: 58 },
    { id: 'Central Park Views', group: 4, value: 65 },
    { id: 'Valet Parking', group: 4, value: 50 },

    // ============================================
    // JEAN-GEORGES AT THE MARK (Restaurant)
    // ============================================
    // Group 1 - Top Level
    { id: 'Jean-Georges Vongerichten', group: 1, value: 92 },
    { id: 'Jean-Georges at The Mark', group: 1, value: 90 },
    
    // Group 2 - Connected to Top Level
    { id: 'Fresh from the Market', group: 2, value: 75 },
    { id: 'World Class', group: 2, value: 72 },
    { id: 'Innovative Seasonings', group: 2, value: 70 },
    { id: 'Hand Crafted Bar', group: 2, value: 68 },
    { id: 'Comfortable Dining Room', group: 2, value: 65 },
    { id: 'French-Inspired', group: 2, value: 72 },
    { id: 'Global Bistro', group: 2, value: 70 },
    
    // Group 3 - Secondary
    { id: 'People Watching', group: 3, value: 55 },
    { id: 'Brunch', group: 3, value: 60 },

    // ============================================
    // THE MARK HOTEL
    // ============================================
    // Group 1 - Top Level
    { id: 'The Mark Hotel', group: 1, value: 90 },
    
    // Group 2 - Connected to Top Level
    { id: 'Polished', group: 2, value: 68 },
    { id: 'Art Deco-Inspired', group: 2, value: 70 },
    { id: 'Swanky Bar', group: 2, value: 72 },
    { id: 'Metropolitan Museum of Art', group: 2, value: 78 },
    
    // Group 3 - Secondary
    { id: 'Salon', group: 3, value: 52 },

    // ============================================
    // THE PLAZA HOTEL
    // ============================================
    // Group 1 - Top Level
    { id: 'The Plaza', group: 1, value: 95 },
    
    // Group 2 - Connected to Top Level
    { id: 'Landmark Building', group: 2, value: 75 },
    { id: '19th-Century Architecture', group: 2, value: 70 },
    { id: 'Afternoon Tea', group: 2, value: 72 },
    { id: 'Spa', group: 2, value: 68 },
    
    // Group 3 - Secondary
    { id: 'Gym', group: 3, value: 50 },

    // ============================================
    // THE ST. REGIS HOTEL
    // ============================================
    // Group 1 - Top Level
    { id: 'The St. Regis', group: 1, value: 92 },
    
    // Group 2 - Connected to Top Level
    { id: 'King Cole Bar', group: 2, value: 78 },
    { id: 'Steam Room', group: 2, value: 60 },

    // ============================================
    // THE BACCARAT HOTEL
    // ============================================
    // Group 1 - Top Level
    { id: 'The Baccarat', group: 1, value: 90 },
    
    // Group 2 - Connected to Top Level
    { id: 'Elegant Bar', group: 2, value: 72 },
    { id: 'Indoor Pool', group: 2, value: 65 },
    { id: 'Empire State Building', group: 2, value: 70 },

    // ============================================
    // SHARED KEYWORDS (All venues)
    // ============================================
    { id: 'Restaurant', group: 2, value: 70 },
    { id: 'New York', group: 3, value: 75 },
    { id: '57th Street', group: 3, value: 55 },
    { id: '51st Street', group: 3, value: 50 },
    { id: 'Midtown Manhattan', group: 3, value: 58 },
    { id: 'Lobster', group: 3, value: 65 },
    { id: 'Lunch', group: 3, value: 55 },
    { id: 'Dinner', group: 3, value: 60 },
    { id: 'Hotel', group: 2, value: 70 },
    { id: 'Luxury', group: 2, value: 75 }
  ];
  // Legacy link list — retained only so the diff stays readable. It is not used
  // anywhere; the active `defaultLinks` is declared below this block.
  const _legacyDefaultLinks_unused = [
    { source: 'LVMH', target: '57th St.' },
    { source: 'LVMH', target: 'Soho' },
    
    // ============================================
    // 57TH ST. AREA CONNECTIONS
    // ============================================
    { source: '57th St.', target: 'The Modern' },
    { source: '57th St.', target: 'Two Michelin Stars' },
    { source: '57th St.', target: 'MoMA Museum' },
    { source: '57th St.', target: 'Le Bernardin' },
    { source: '57th St.', target: 'Three Michelin Stars' },
    { source: '57th St.', target: 'Eric Ripert' },
    { source: '57th St.', target: 'Seafood' },
    { source: '57th St.', target: 'The Plaza' },
    { source: '57th St.', target: 'The St. Regis' },
    { source: '57th St.', target: 'The Baccarat' },
    { source: '57th St.', target: 'Luxury Hotel' },
    
    // ============================================
    // SOHO AREA CONNECTIONS
    // ============================================
    { source: 'Soho', target: 'Cafe Carlyle' },
    { source: 'Soho', target: 'The Carlyle' },
    { source: 'Soho', target: 'Bemelmans Bar' },
    { source: 'Soho', target: 'Art Deco' },
    { source: 'Soho', target: 'Jean-Georges Vongerichten' },
    { source: 'Soho', target: 'Jean-Georges at The Mark' },
    { source: 'Soho', target: 'The Mark Hotel' },
    
    // ============================================
    // THE MODERN CONNECTIONS
    // ============================================
    { source: 'The Modern', target: 'Restaurant' },
    { source: 'The Modern', target: 'MoMA Museum' },
    { source: 'The Modern', target: 'Sculpture Garden' },
    { source: 'The Modern', target: 'The Modern (Dining Room)' },
    { source: 'The Modern', target: 'The Bar Room' },
    { source: 'The Modern', target: 'The Kitchen Table' },
    { source: 'The Modern', target: 'Two Michelin Stars' },
    { source: 'The Modern', target: 'Union Square Hospitality Group (USHG)' },
    { source: 'The Modern', target: 'Hospitality Included' },
    { source: 'The Modern', target: 'Grand Award Wine List' },
    { source: 'The Modern', target: 'Upscale & Sophisticated' },
    { source: 'The Modern', target: 'New York' },
    { source: 'MoMA Museum', target: 'MoMA Sculpture Garden' },
    { source: 'MoMA Museum', target: 'Artful & Refined' },
    { source: 'The Modern (Dining Room)', target: 'Two Michelin Stars' },
    { source: 'The Modern (Dining Room)', target: 'Eggs on Eggs on Eggs' },
    { source: 'The Modern (Dining Room)', target: 'Seasonal & Local' },
    { source: 'The Bar Room', target: 'Cocktails' },
    { source: 'The Bar Room', target: 'Caviar Hot Dogs' },
    { source: 'The Kitchen Table', target: 'Seasonal & Local' },
    { source: 'Upscale & Sophisticated', target: 'The Modern (Dining Room)' },
    { source: 'Restaurant', target: 'Lunch' },
    { source: 'Restaurant', target: 'Dinner' },
    { source: 'Dinner', target: 'Lobster' },
    { source: 'Dinner', target: 'Truffles' },
    
    // ============================================
    // LE BERNARDIN CONNECTIONS
    // ============================================
    { source: 'Le Bernardin', target: 'Three Michelin Stars' },
    { source: 'Le Bernardin', target: 'Eric Ripert' },
    { source: 'Le Bernardin', target: 'Seafood' },
    { source: 'Le Bernardin', target: 'Fine Dining' },
    { source: 'Le Bernardin', target: 'French Cuisine' },
    { source: 'Le Bernardin', target: 'Restaurant' },
    { source: 'Le Bernardin', target: 'New York' },
    { source: 'Le Bernardin', target: 'Midtown Manhattan' },
    { source: 'Le Bernardin', target: '51st Street' },
    { source: 'Le Bernardin', target: 'Tasting Menu' },
    { source: 'Le Bernardin', target: 'Prix Fixe' },
    { source: 'Le Bernardin', target: 'Elegant' },
    { source: 'Le Bernardin', target: 'Contemporary' },
    { source: 'Le Bernardin', target: 'Professional Service' },
    { source: 'Le Bernardin', target: 'Expert Service' },
    { source: 'Le Bernardin', target: 'Wine' },
    { source: 'Le Bernardin', target: 'Sommelier' },
    { source: 'Le Bernardin', target: 'Luxurious Decor' },
    { source: 'Eric Ripert', target: 'Three Michelin Stars' },
    { source: 'Eric Ripert', target: 'French Cuisine' },
    { source: 'Seafood', target: 'Almost Raw' },
    { source: 'Seafood', target: 'Barely Touched' },
    { source: 'Seafood', target: 'Lightly Cooked' },
    { source: 'Seafood', target: 'The Fish is the Star' },
    { source: 'Seafood', target: 'Tuna with Foie Gras' },
    { source: 'Seafood', target: 'Slowly Baked Salmon with Caviar' },
    { source: 'Seafood', target: 'Poached Lobster' },
    { source: 'Seafood', target: 'Dover Sole' },
    { source: 'Seafood', target: 'Scallop with Caviar' },
    { source: 'Seafood', target: 'Halibut' },
    { source: 'Three Michelin Stars', target: 'Four-Star NY Times' },
    { source: 'Three Michelin Stars', target: 'La Liste Top Restaurants' },
    { source: 'Fine Dining', target: 'Upscale' },
    { source: 'Fine Dining', target: 'Special Occasions' },
    { source: 'Fine Dining', target: 'Reservations Required' },
    { source: 'Fine Dining', target: 'Business Casual' },
    { source: 'Tasting Menu', target: 'Almost Raw' },
    { source: 'Tasting Menu', target: 'Barely Touched' },
    { source: 'Tasting Menu', target: 'Lightly Cooked' },
    { source: 'Pistachio Dessert', target: 'Le Bernardin' },
    { source: 'Peruvian Dark Chocolate Tart', target: 'Le Bernardin' },
    { source: 'Wine', target: 'Sommelier' },
    { source: 'Lobster', target: 'Poached Lobster' },
    
    // ============================================
    // THE CARLYLE CONNECTIONS
    // ============================================
    { source: 'Cafe Carlyle', target: 'The Carlyle' },
    { source: 'Cafe Carlyle', target: 'Classic Cabaret' },
    { source: 'Cafe Carlyle', target: 'Live Entertainment' },
    { source: 'Cafe Carlyle', target: 'Supper Club' },
    { source: 'Cafe Carlyle', target: 'Concerts' },
    { source: 'Cafe Carlyle', target: 'Celebrities' },
    { source: 'Cafe Carlyle', target: 'Evenings' },
    { source: 'Cafe Carlyle', target: 'Cocktails' },
    { source: 'Cafe Carlyle', target: 'Dress Code' },
    { source: 'The Carlyle', target: 'Bemelmans Bar' },
    { source: 'The Carlyle', target: 'Art Deco' },
    { source: 'The Carlyle', target: 'Luxury Hotel' },
    { source: 'The Carlyle', target: 'Rosewood Hotel' },
    { source: 'The Carlyle', target: 'Five-Star' },
    { source: 'The Carlyle', target: 'Upper East Side' },
    { source: 'The Carlyle', target: '76th Street' },
    { source: 'The Carlyle', target: 'Madison Avenue' },
    { source: 'The Carlyle', target: 'New York' },
    { source: 'The Carlyle', target: 'Iconic' },
    { source: 'The Carlyle', target: 'Dowling\'s at The Carlyle' },
    { source: 'The Carlyle', target: 'Valmont Spa' },
    { source: 'The Carlyle', target: 'Yves Durif Salon' },
    { source: 'The Carlyle', target: 'Fitness Center' },
    { source: 'The Carlyle', target: 'Concierge' },
    { source: 'The Carlyle', target: '24-Hour Service' },
    { source: 'The Carlyle', target: 'Valet Parking' },
    { source: 'The Carlyle', target: 'Pet-Friendly' },
    { source: 'Bemelmans Bar', target: 'Art Deco' },
    { source: 'Bemelmans Bar', target: 'Ludwig Bemelmans' },
    { source: 'Bemelmans Bar', target: 'Madeline Murals' },
    { source: 'Bemelmans Bar', target: 'Cocktails' },
    { source: 'Bemelmans Bar', target: 'Live Entertainment' },
    { source: 'Ludwig Bemelmans', target: 'Madeline Murals' },
    { source: 'Luxury Hotel', target: 'Five-Star' },
    { source: 'Luxury Hotel', target: 'Central Park Views' },
    { source: 'Upper East Side', target: 'Central Park' },
    { source: 'Upper East Side', target: 'Madison Avenue' },
    { source: 'Upper East Side', target: '76th Street' },
    { source: 'Dowling\'s at The Carlyle', target: 'Fine Dining' },
    { source: 'Dowling\'s at The Carlyle', target: 'Restaurant' },

    // ============================================
    // JEAN-GEORGES AT THE MARK CONNECTIONS
    // ============================================
    { source: 'Jean-Georges Vongerichten', target: 'Jean-Georges at The Mark' },
    { source: 'Jean-Georges Vongerichten', target: 'World Class' },
    { source: 'Jean-Georges Vongerichten', target: 'Innovative Seasonings' },
    { source: 'Jean-Georges at The Mark', target: 'The Mark Hotel' },
    { source: 'Jean-Georges at The Mark', target: 'Restaurant' },
    { source: 'Jean-Georges at The Mark', target: 'Fresh from the Market' },
    { source: 'Jean-Georges at The Mark', target: 'Hand Crafted Bar' },
    { source: 'Jean-Georges at The Mark', target: 'Comfortable Dining Room' },
    { source: 'Jean-Georges at The Mark', target: 'French-Inspired' },
    { source: 'Jean-Georges at The Mark', target: 'Global Bistro' },
    { source: 'Jean-Georges at The Mark', target: 'People Watching' },
    { source: 'Jean-Georges at The Mark', target: 'Brunch' },
    { source: 'Jean-Georges at The Mark', target: 'Lunch' },
    { source: 'Jean-Georges at The Mark', target: 'Dinner' },
    { source: 'Jean-Georges at The Mark', target: 'Iconic' },
    { source: 'Jean-Georges at The Mark', target: 'Upper East Side' },
    { source: 'Jean-Georges at The Mark', target: 'New York' },

    // ============================================
    // THE MARK HOTEL CONNECTIONS
    // ============================================
    { source: 'The Mark Hotel', target: 'Hotel' },
    { source: 'The Mark Hotel', target: 'Luxury' },
    { source: 'The Mark Hotel', target: 'Upper East Side' },
    { source: 'The Mark Hotel', target: 'Central Park' },
    { source: 'The Mark Hotel', target: 'Metropolitan Museum of Art' },
    { source: 'The Mark Hotel', target: 'Polished' },
    { source: 'The Mark Hotel', target: 'Art Deco-Inspired' },
    { source: 'The Mark Hotel', target: 'Swanky Bar' },
    { source: 'The Mark Hotel', target: 'Fitness Center' },
    { source: 'The Mark Hotel', target: 'Salon' },
    { source: 'The Mark Hotel', target: 'New York' },
    { source: 'The Mark Hotel', target: '57th Street' },

    // ============================================
    // THE PLAZA HOTEL CONNECTIONS
    // ============================================
    { source: 'The Plaza', target: 'Hotel' },
    { source: 'The Plaza', target: 'Luxury' },
    { source: 'The Plaza', target: 'Landmark Building' },
    { source: 'The Plaza', target: '19th-Century Architecture' },
    { source: 'The Plaza', target: 'Central Park' },
    { source: 'The Plaza', target: 'Afternoon Tea' },
    { source: 'The Plaza', target: 'Spa' },
    { source: 'The Plaza', target: 'Gym' },
    { source: 'The Plaza', target: 'Iconic' },
    { source: 'The Plaza', target: 'New York' },
    { source: 'The Plaza', target: '57th Street' },

    // ============================================
    // THE ST. REGIS HOTEL CONNECTIONS
    // ============================================
    { source: 'The St. Regis', target: 'Hotel' },
    { source: 'The St. Regis', target: 'Luxury' },
    { source: 'The St. Regis', target: 'Midtown Manhattan' },
    { source: 'The St. Regis', target: 'MoMA Museum' },
    { source: 'The St. Regis', target: 'Central Park' },
    { source: 'The St. Regis', target: 'Gym' },
    { source: 'The St. Regis', target: 'Steam Room' },
    { source: 'The St. Regis', target: 'King Cole Bar' },
    { source: 'The St. Regis', target: 'Iconic' },
    { source: 'The St. Regis', target: 'New York' },
    { source: 'The St. Regis', target: '57th Street' },

    // ============================================
    // THE BACCARAT HOTEL CONNECTIONS
    // ============================================
    { source: 'The Baccarat', target: 'Hotel' },
    { source: 'The Baccarat', target: 'Luxury' },
    { source: 'The Baccarat', target: 'MoMA Museum' },
    { source: 'The Baccarat', target: 'Central Park' },
    { source: 'The Baccarat', target: 'Empire State Building' },
    { source: 'The Baccarat', target: 'French Cuisine' },
    { source: 'The Baccarat', target: 'Elegant Bar' },
    { source: 'The Baccarat', target: 'Afternoon Tea' },
    { source: 'The Baccarat', target: 'Spa' },
    { source: 'The Baccarat', target: 'Gym' },
    { source: 'The Baccarat', target: 'Indoor Pool' },
    { source: 'The Baccarat', target: 'New York' },
    { source: 'The Baccarat', target: '57th Street' },

    // ============================================
    // ADDITIONAL CARLYLE CONNECTIONS
    // ============================================
    { source: 'The Carlyle', target: 'Hotel' },
    { source: 'The Carlyle', target: 'Classic Cabaret' },
    { source: 'The Carlyle', target: '57th Street' },

    // ============================================
    // SHARED LOCATION CONNECTIONS
    // ============================================
    { source: 'New York', target: 'Midtown Manhattan' },
    { source: 'New York', target: '51st Street' },
    { source: 'New York', target: 'Upper East Side' },
    { source: 'New York', target: '57th Street' },
    { source: 'Midtown Manhattan', target: '51st Street' },
    { source: 'Midtown Manhattan', target: '57th Street' },
    { source: 'Hotel', target: 'Luxury' },
    { source: 'Hotel', target: 'Concierge' },
    { source: 'Luxury', target: 'Five-Star' }
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

  const STORAGE_KEY = 'st_keywords_v1';

  // The keywords page is the source of truth for the demo keyword graph, so
  // every load re-seeds localStorage with the curated `defaultNodes` /
  // `defaultLinks` above. This prevents stale AI-cached data (e.g. the old
  // “Le Bernardin / MoMA / Three Michelin Stars” cluster) from surviving
  // across sessions and collapsing the tree back to a flat structure.
  try {
    localStorage.removeItem('st_ai_keywords_graph_v2');
  } catch (e) { /* ignore quota / privacy errors */ }

  function loadStored(){
    if (window.ShopThatData) return window.ShopThatData.getKeywords();
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; }
  }
  function loadStoredConnections(){
    if (window.ShopThatData) return window.ShopThatData.getConnections();
    try { return JSON.parse(localStorage.getItem('st_connections_v1')||'[]'); } catch { return []; }
  }

  const AI_GRAPH_CACHE_KEY = 'st_ai_keywords_graph_v2';
  const AI_GRAPH_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 6;
  const AI_GRAPH_QUERY =
    'You are a luxury intelligence analyst. Using available backend article context and ecommerce product catalogs, generate keywords for a knowledge graph. Respond ONLY in markdown with these exact headings: "### LVMH", "### Soho", "### 57th St." Under each heading provide exactly 8 short keyword phrases (2-5 words), one per bullet, with no explanations.';

  function normalizeKeywordLabel(label) {
    return String(label || '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseAiKeywordSections(answer) {
    const sections = { LVMH: [], Soho: [], '57th St.': [] };
    const seen = { LVMH: new Set(), Soho: new Set(), '57th St.': new Set() };
    let current = 'LVMH';
    const lines = String(answer || '').split(/\r?\n/);

    lines.forEach((line) => {
      const raw = line.trim();
      if (!raw) return;

      if (/^#{1,6}\s*lvmh\b/i.test(raw) || /^lvmh\b[:\-]/i.test(raw)) {
        current = 'LVMH';
        return;
      }
      if (/^#{1,6}\s*soho\b/i.test(raw) || /^soho\b[:\-]/i.test(raw)) {
        current = 'Soho';
        return;
      }
      if (/^#{1,6}\s*57(th)?\s*(st|street)\b/i.test(raw) || /^57(th)?\s*(st|street)\b[:\-]/i.test(raw)) {
        current = '57th St.';
        return;
      }

      const bullet = normalizeKeywordLabel(raw.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, ''));
      if (!bullet || /^#{1,6}\s/.test(bullet)) return;

      const key = bullet.toLowerCase();
      if (!seen[current].has(key)) {
        seen[current].add(key);
        sections[current].push(bullet);
      }
    });

    if (sections.LVMH.length === 0 && window.LuxuryIntelligence && window.LuxuryIntelligence.extractKeywordPhrases) {
      const fallback = window.LuxuryIntelligence.extractKeywordPhrases(answer, 12);
      fallback.forEach((k, idx) => {
        if (idx < 4) sections.LVMH.push(k);
        else if (idx < 8) sections.Soho.push(k);
        else sections['57th St.'].push(k);
      });
    }

    sections.LVMH = sections.LVMH.slice(0, 8);
    sections.Soho = sections.Soho.slice(0, 8);
    sections['57th St.'] = sections['57th St.'].slice(0, 8);
    return sections;
  }

  function groupForIndex(idx) {
    if (idx < 3) return 1;
    if (idx < 5) return 2;
    if (idx < 7) return 3;
    return 4;
  }

  function valueForIndex(idx) {
    return Math.max(42, 88 - (idx * 6));
  }

  function buildAiGraphFromSections(sections) {
    const nodeMap = new Map();
    const linkMap = new Set();

    function addNode(node) {
      if (!node || !node.id) return;
      const existing = nodeMap.get(node.id);
      if (!existing) {
        nodeMap.set(node.id, { ...node });
        return;
      }
      existing.value = Math.max(existing.value || 0, node.value || 0);
      existing.group = Math.min(existing.group || 4, node.group || 4);
      existing.isArea = existing.isArea || !!node.isArea;
      existing.isRoot = existing.isRoot || !!node.isRoot;
    }

    function addLink(source, target) {
      if (!source || !target || source === target) return;
      const a = String(source);
      const b = String(target);
      const key = a < b ? a + '|' + b : b + '|' + a;
      if (linkMap.has(key)) return;
      linkMap.add(key);
    }

    addNode({ id: 'LVMH', group: 0, value: 100, isRoot: true });
    addNode({ id: 'Soho', group: 1, value: 90, isArea: true });
    addNode({ id: '57th St.', group: 1, value: 90, isArea: true });
    addLink('LVMH', 'Soho');
    addLink('LVMH', '57th St.');

    const lvmhKeywords = sections.LVMH || [];
    const lvmhSoho = [];
    const lvmh57 = [];
    lvmhKeywords.forEach((label, idx) => {
      if (idx % 2 === 0) lvmhSoho.push(label);
      else lvmh57.push(label);
    });

    const areaDefs = [
      { area: 'Soho', keywords: lvmhSoho.concat(sections.Soho || []) },
      { area: '57th St.', keywords: lvmh57.concat(sections['57th St.'] || []) }
    ];

    areaDefs.forEach((entry) => {
      entry.keywords.forEach((label, idx) => {
        addNode({ id: label, group: groupForIndex(idx), value: valueForIndex(idx) });
        addLink(entry.area, label);
        if (idx > 0) addLink(entry.keywords[idx - 1], label);
      });
    });

    const nodes = Array.from(nodeMap.values());
    const links = Array.from(linkMap).map((key) => {
      const parts = key.split('|');
      return { source: parts[0], target: parts[1] };
    });
    return { nodes, links };
  }

  function cacheAiGraph(graph) {
    try {
      localStorage.setItem(AI_GRAPH_CACHE_KEY, JSON.stringify({
        at: Date.now(),
        nodes: graph.nodes,
        links: graph.links
      }));
    } catch (e) {
      console.warn('Failed to cache AI keyword graph', e);
    }
  }

  function loadCachedAiGraph() {
    try {
      const raw = localStorage.getItem(AI_GRAPH_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.at || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.links)) return null;
      if ((Date.now() - parsed.at) > AI_GRAPH_CACHE_MAX_AGE_MS) return null;
      return { nodes: parsed.nodes, links: parsed.links };
    } catch {
      return null;
    }
  }

  function applyAiGraphToSharedData(graph) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links) || graph.nodes.length === 0) return false;
    if (!window.ShopThatData) return false;

    const now = new Date().toISOString();
    const keywords = graph.nodes.map((node) => ({
      id: node.id,
      name: node.id,
      value: node.value || 50,
      group: node.group || 1,
      isArea: !!node.isArea,
      isRoot: !!node.isRoot,
      uses: 0,
      cost: 0,
      totalCost: 0,
      lastUsed: null,
      created: now
    }));

    window.ShopThatData.saveKeywords(keywords);
    window.ShopThatData.saveConnections(graph.links.slice());
    return true;
  }

  async function bootstrapAiKeywordGraph() {
    if (!window.ShopThatData || !window.LuxuryIntelligence || typeof window.LuxuryIntelligence.ask !== 'function') return;
    if (window.__kwAiGraphLoading) return;
    window.__kwAiGraphLoading = true;

    try {
      const cachedGraph = loadCachedAiGraph();
      if (cachedGraph) {
        applyAiGraphToSharedData(cachedGraph);
        window.dispatchEvent(new CustomEvent('kw-data-updated'));
        return;
      }

      const intel = await window.LuxuryIntelligence.ask(AI_GRAPH_QUERY);
      const sections = parseAiKeywordSections(intel && intel.answer);
      const totalKeywords = sections.LVMH.length + sections.Soho.length + sections['57th St.'].length;
      if (totalKeywords < 9) {
        console.warn('AI keyword response too small; using existing keyword graph');
        return;
      }

      const graph = buildAiGraphFromSections(sections);
      if (applyAiGraphToSharedData(graph)) {
        cacheAiGraph(graph);
        window.dispatchEvent(new CustomEvent('kw-data-updated'));
      }
    } catch (e) {
      console.warn('AI keyword graph bootstrap failed', e);
    } finally {
      window.__kwAiGraphLoading = false;
    }
  }
  
  // Always rebuild the keyword graph from the curated defaults above. Stored
  // data from previous sessions (localStorage / ShopThatData) is intentionally
  // ignored so the Louis Vuitton ▸ New York ▸ Stores ▸ 57th St./Soho hierarchy
  // cannot regress to legacy flat structures or AI-cached clusters.
  void loadStored;
  void loadStoredConnections;
  const initialNodes = defaultNodes.map(n => ({ ...n }));
  const initialLinks = defaultLinks.map(l => ({ ...l }));

  // Re-seed ShopThatData so other pages (keywords-manage, dashboard, etc.)
  // observe the same curated graph instead of stale cached nodes.
  try {
    if (window.ShopThatData) {
      const nowIso = new Date().toISOString();
      const seededKeywords = initialNodes.map(n => ({
        id: n.id,
        name: n.id,
        value: n.value || 50,
        group: n.group || 1,
        isArea: !!n.isArea,
        isRoot: !!n.isRoot,
        parent: n.parent || null,
        uses: 0,
        cost: 0,
        totalCost: 0,
        lastUsed: null,
        created: nowIso
      }));
      window.ShopThatData.saveKeywords(seededKeywords);
      window.ShopThatData.saveConnections(initialLinks.map(l => ({
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target
      })));
    }
  } catch (e) {
    console.warn('Keyword graph re-seed failed:', e);
  }

  console.log('Keyword graph seeded:', {
    nodes: initialNodes.length,
    links: initialLinks.length,
    areas: initialNodes.filter(n => n.isArea).map(n => n.id)
  });
  
  // Set up initial graph data using the new system
  allNodes = initialNodes;
  allLinks = initialLinks;
  
  // Initialize showing only primary nodes
  currentViewMode = 'default';
  visibleNodes = getVisibleNodes();
  visibleLinks = getVisibleLinks(visibleNodes);
  let graphNodes = visibleNodes;
  let graphLinks = visibleLinks;
  
  console.log('Initial data setup:', {
    allNodesCount: allNodes.length,
    allLinksCount: allLinks.length,
    visibleNodesCount: visibleNodes.length,
    visibleLinksCount: visibleLinks.length,
    currentViewMode: currentViewMode,
    allNodesSample: allNodes.slice(0, 3),
    visibleNodesSample: visibleNodes.slice(0, 3)
  });

  // Create gradient definitions for primary and secondary nodes
  const defs = svg.append('defs');
  
  // LVMH Root gradient (Group 0) - Dark blue gradient, stands out more
  const lvmhGradient = defs.append('linearGradient')
    .attr('id', 'lvmhGradient')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '100%').attr('y2', '100%');
  lvmhGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1e3a8a'); // dark blue
  lvmhGradient.append('stop').attr('offset', '50%').attr('stop-color', '#1e40af'); // blue-800
  lvmhGradient.append('stop').attr('offset', '100%').attr('stop-color', '#312e81'); // indigo-900
  
  // Primary gradient (Group 1) - Blue/Purple/Cyan like in screenshots
  const primaryGradient = defs.append('linearGradient')
    .attr('id', 'primaryGradient')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '100%').attr('y2', '100%');
  primaryGradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4'); // cyan
  primaryGradient.append('stop').attr('offset', '50%').attr('stop-color', '#8b5cf6'); // purple
  primaryGradient.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1'); // indigo
  
  // Secondary gradient (Group 2) - Green gradient
  const secondaryGradient = defs.append('linearGradient')
    .attr('id', 'secondaryGradient')
    .attr('x1', '0%').attr('y1', '100%')
    .attr('x2', '100%').attr('y2', '0%');
  secondaryGradient.append('stop').attr('offset', '0%').attr('stop-color', '#10b981'); // emerald
  secondaryGradient.append('stop').attr('offset', '50%').attr('stop-color', '#34d399'); // light emerald
  secondaryGradient.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4'); // cyan
  
  // Tertiary gradient (Group 3) - Pink/Orange/Coral for Talent-like nodes
  const tertiaryGradient = defs.append('linearGradient')
    .attr('id', 'tertiaryGradient')
    .attr('x1', '0%').attr('y1', '100%')
    .attr('x2', '100%').attr('y2', '0%');
  tertiaryGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f97316'); // orange
  tertiaryGradient.append('stop').attr('offset', '50%').attr('stop-color', '#ec4899'); // pink
  tertiaryGradient.append('stop').attr('offset', '100%').attr('stop-color', '#f472b6'); // light pink
  
  // Quaternary gradient (Group 4) - Green/Teal variant
  const quaternaryGradient = defs.append('linearGradient')
    .attr('id', 'quaternaryGradient')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '100%').attr('y2', '100%');
  quaternaryGradient.append('stop').attr('offset', '0%').attr('stop-color', '#10b981'); // emerald
  quaternaryGradient.append('stop').attr('offset', '50%').attr('stop-color', '#06b6d4'); // cyan
  quaternaryGradient.append('stop').attr('offset', '100%').attr('stop-color', '#8b5cf6'); // purple

  const color = d3.scaleOrdinal()
    .domain([0, 1, 2, 3, 4])
    .range(['url(#lvmhGradient)', 'url(#primaryGradient)', 'url(#secondaryGradient)', 'url(#tertiaryGradient)', 'url(#quaternaryGradient)']);
  const baseRadius = d3.scaleSqrt().domain([10, 100]).range([30, 70]);
  
  // LVMH root node (group 0) is 3x larger, primary nodes slightly larger than others
  function radius(value, group, isArea) {
    if (group === 0) return 140; // LVMH is fixed at 140px radius
    if (isArea) return 70; // Area nodes are half of LVMH
    const base = baseRadius(value);
    return group === 1 ? base * 1.1 : base;
  }

  // State for hover/click highlighting
  let hoveredNode = null;
  let clickedNode = null;

  function computeFontSizeForRadius(r){
    // Scale font size based on radius, with larger max for LVMH node
    if (r >= 140) {
      // Large LVMH node - bigger font
      return 32;
    }
    // Base calculation - will be adjusted by wrapText if needed
    return Math.max(8, Math.min(16, Math.round(r * 0.32)));
  }

  function wrapText(textSel, label, nodeRadius){
    textSel.text(null);
    const words = String(label||'').split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    
    // Calculate available width (use ~80% of diameter for text)
    const maxWidth = nodeRadius * 1.6;
    const lineHeight = 1.15;
    
    // Get the current font size
    let fontSize = parseFloat(textSel.style('font-size')) || 12;
    const minFontSize = 7;
    
    // Try to fit text, reducing font size if necessary
    let lines = [];
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      lines = [];
      let currentLine = [];
      
      // Create a temporary tspan to measure
      const tempTspan = textSel.append('tspan').style('font-size', `${fontSize}px`);
      
      for (const word of words) {
        currentLine.push(word);
        tempTspan.text(currentLine.join(' '));
        
        if (tempTspan.node().getComputedTextLength() > maxWidth && currentLine.length > 1) {
          currentLine.pop();
          lines.push(currentLine.join(' '));
          currentLine = [word];
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }
      
      tempTspan.remove();
      
      // Check if text height fits in the circle (use ~70% of diameter for height)
      const maxHeight = nodeRadius * 1.4;
      const textHeight = lines.length * fontSize * lineHeight;
      
      // Also check if any single line is too wide
      let anyLineTooWide = false;
      const checkTspan = textSel.append('tspan').style('font-size', `${fontSize}px`);
      for (const line of lines) {
        checkTspan.text(line);
        if (checkTspan.node().getComputedTextLength() > maxWidth) {
          anyLineTooWide = true;
          break;
        }
      }
      checkTspan.remove();
      
      if (textHeight <= maxHeight && !anyLineTooWide) {
        break; // Text fits!
      }
      
      // Reduce font size and try again
      fontSize = Math.max(minFontSize, fontSize - 1);
      if (fontSize <= minFontSize) break;
      attempts++;
    }
    
    // Apply the final font size
    textSel.style('font-size', `${fontSize}px`);
    
    // Calculate vertical offset to center the text block
    const totalLines = lines.length;
    const startOffset = -((totalLines - 1) * lineHeight) / 2;
    
    // Create the actual tspans
    lines.forEach((lineText, i) => {
      textSel.append('tspan')
        .attr('x', 0)
        .attr('dy', i === 0 ? `${startOffset}em` : `${lineHeight}em`)
        .attr('dominant-baseline', 'middle')
        .text(lineText);
    });
  }

  // Function to determine which nodes to show based on current mode
  function getVisibleNodes() {
    // Tree-style bubble navigation: only LVMH is visible by default; clicking
    // a bubble adds its `parent` children to the visible set.
    if (currentViewMode === 'tree') {
      var visibleIds = getBubbleVisibleNodeIds();
      return allNodes.filter(function (node) { return visibleIds.has(node.id); });
    }
    if (currentViewMode === 'default') {
      // Show LVMH and its direct connections (area nodes) on page load
      const lvmhConnectedIds = new Set(['LVMH']);
      allLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sourceId === 'LVMH') lvmhConnectedIds.add(targetId);
        if (targetId === 'LVMH') lvmhConnectedIds.add(sourceId);
      });
      return allNodes.filter(node => lvmhConnectedIds.has(node.id));
    } else if (currentViewMode === 'expanded' && selectedNode) {
      // Show selected node and all connected nodes
      const connectedNodeIds = new Set();
      connectedNodeIds.add(selectedNode.id);
      
      allLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === selectedNode.id) {
          connectedNodeIds.add(targetId);
        }
        if (targetId === selectedNode.id) {
          connectedNodeIds.add(sourceId);
        }
      });
      
      return allNodes.filter(node => connectedNodeIds.has(node.id));
    } else if (currentViewMode === 'filtered') {
      // Show nodes based on filter state
      return allNodes.filter(node => {
        switch (node.group) {
          case 1: return filterState.topLevel;
          case 2: return filterState.connected;
          case 3: return filterState.secondary;
          case 4: return filterState.isolated;
          default: return true;
        }
      });
    } else {
      // 'all' mode - show all nodes
      return allNodes;
    }
  }

  // Function to get visible links based on visible nodes
  function getVisibleLinks(visibleNodes) {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return allLinks.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
  }

  // Function to determine if a node should be disabled (greyed out but visible)
  function isNodeDisabled(node) {
    // In default mode, all visible nodes (only Group 1) are enabled
    if (currentViewMode === 'default') {
      return false;
    }
    // In expanded mode, only the selected node is fully highlighted, connected nodes are enabled
    if (currentViewMode === 'expanded' && selectedNode) {
      return false; // All visible nodes in expanded mode are enabled
    }
    return false;
  }

  // Get connected node IDs for a given node
  function getConnectedNodeIds(nodeData) {
    const connectedIds = new Set();
    connectedIds.add(nodeData.id);
    
    allLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === nodeData.id) {
        connectedIds.add(targetId);
      }
      if (targetId === nodeData.id) {
        connectedIds.add(sourceId);
      }
    });
    
    return connectedIds;
  }

  // Store original positions for hover clustering
  let originalPositions = {};
  let isHoverClustering = false;
  
  // Highlight connections on hover - show connecting lines
  function highlightConnections(nodeData) {
    if (isTransitioning) return;
    
    const connectedIds = getConnectedNodeIds(nodeData);
      isHoverClustering = true;
    
    // Highlight connected nodes and fade others
    node.each(function(d) {
      const nodeElement = d3.select(this);
      const isConnected = connectedIds.has(d.id);
      const isHovered = d.id === nodeData.id;
      
      nodeElement.interrupt('style');
      
      // Scale up hovered node slightly
      if (isHovered) {
        nodeElement
          .transition('style')
          .duration(200)
          .ease(d3.easeCubicOut)
          .attr('transform', `translate(${Math.round(d.x)},${Math.round(d.y)}) scale(1.1)`);
      }
      
      // Update styling - fade unconnected nodes
      nodeElement.select('circle')
        .transition('style')
        .duration(200)
        .attr('opacity', isConnected ? 1 : 0.2)
        .style('filter', isConnected ? 'none' : 'grayscale(0.7) brightness(1.2)');
      
      nodeElement.select('text')
        .transition('style')
        .duration(200)
        .attr('opacity', isConnected ? 1 : 0.2);
    });
    
    // Highlight connected links, fade others
    link.interrupt('links')
      .transition('links')
      .duration(200)
      .attr('opacity', 0)
      .attr('stroke-width', l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        const isConnectedLink = sourceId === nodeData.id || targetId === nodeData.id;
        return isConnectedLink ? 2.5 : 1;
      });
  }

  // Reset highlighting to default state
  function resetHighlighting() {
    if (isTransitioning) return;
      
      isHoverClustering = false;
    
    // Reset node styling and scale
    node.each(function(d) {
      const nodeElement = d3.select(this);
      const isDisabled = isNodeDisabled(d);
      
      nodeElement.interrupt('style');
      
      // Reset scale and position
      nodeElement
        .transition('style')
        .duration(200)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${Math.round(d.x)},${Math.round(d.y)}) scale(1)`);
      
      nodeElement.select('circle')
        .transition('style')
        .duration(200)
        .attr('opacity', isDisabled ? 0.15 : 0.9)
        .style('filter', isDisabled ? 'grayscale(1) brightness(1.5)' : 'none');
      
      nodeElement.select('text')
        .transition('style')
        .duration(200)
        .attr('opacity', isDisabled ? 0.8 : 1);
    });
    
    // Show all links at normal opacity
    link.interrupt('links')
      .transition('links')
      .duration(200)
      .attr('opacity', 0)
      .attr('stroke-width', 1.5);
  }

  // Function to update mode indicator
  function updateModeIndicator() {
    const modeIndicator = document.getElementById('modeIndicator');
    if (modeIndicator) {
      let modeText = 'Mode: LVMH + Areas';
      if (currentViewMode === 'linear' && selectedNode) {
        modeText = `Mode: "${selectedNode.id}" + Connected`;
      } else if (currentViewMode === 'expanded' && selectedNode) {
        modeText = `Mode: "${selectedNode.id}" + Connected`;
      } else if (currentViewMode === 'filtered') {
        modeText = 'Mode: Filtered View';
      } else if (currentViewMode === 'all') {
        modeText = 'Mode: All Keywords';
      }
      modeIndicator.querySelector('span').textContent = modeText;
    }
  }

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

  // Show linear view when a keyword bubble is clicked
  function showLinearView(nodeData) {
    selectedNode = nodeData;
    currentViewMode = 'linear';

    // Hide SVG and legend filter
    svg.node().style.display = 'none';
    const legend = document.querySelector('.graph-legend-filter');
    if (legend) legend.style.display = 'none';

    // Get connected nodes (exclude root LVMH node)
    const connectedIds = getConnectedNodeIds(nodeData);
    const connectedNodes = allNodes.filter(n => connectedIds.has(n.id) && n.id !== nodeData.id && n.group !== 0);

    // Group connected nodes by category
    const grouped = {};
    connectedNodes.forEach(n => {
      const cat = keywordCategories[n.id] || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(n);
    });

    // Sort within each category by value descending
    Object.values(grouped).forEach(items => {
      items.sort((a, b) => b.value - a.value);
    });

    // Sort categories by preferred order
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    const mainColor = groupColors[nodeData.group] || groupColors[1];

    // Build category-grouped list HTML
    let itemIndex = 0;
    const listHTML = sortedCategories.map(cat => {
      const items = grouped[cat];
      const headerHTML = `<div class="linear-view__category"><span class="linear-view__category-label">${cat}</span><span class="linear-view__category-count">${items.length}</span><div class="linear-view__category-line"></div></div>`;
      const itemsHTML = items.map(n => {
        const nColor = groupColors[n.group] || groupColors[1];
        const count = getConnectedNodeIds(n).size - 1;
        const delay = itemIndex * 0.04;
        itemIndex++;
        return `
          <div class="linear-view__item" data-id="${n.id}" style="animation-delay: ${delay}s">
            <div class="linear-view__item-indicator" style="background: ${nColor.gradient}"></div>
            <div class="linear-view__item-info">
              <span class="linear-view__item-name">${n.id}</span>
              <span class="linear-view__item-meta">${count} connections</span>
            </div>
            <svg class="linear-view__item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        `;
      }).join('');
      return headerHTML + itemsHTML;
    }).join('');

    // Create or reuse container
    let linearView = document.getElementById('linearView');
    if (!linearView) {
      linearView = document.createElement('div');
      linearView.id = 'linearView';
      linearView.className = 'keywords__linear-view';
      document.querySelector('.keywords__canvas').appendChild(linearView);
    }

    linearView.innerHTML = `
      <div class="linear-view__main">
        <div class="linear-view__main-bubble" style="background: ${mainColor.gradient}">
          <span class="linear-view__main-name">${nodeData.id}</span>
        </div>
        <div class="linear-view__main-meta">
          <span class="linear-view__main-group">${mainColor.label}</span>
          <span class="linear-view__main-connections">${connectedNodes.length} connections</span>
        </div>
      </div>
      <div class="linear-view__divider">
        <span>Connected Keywords</span>
      </div>
      <div class="linear-view__list">
        ${listHTML}
      </div>
    `;

    linearView.style.display = 'flex';
    linearView.scrollTop = 0;

    // Click handlers for connected items
    linearView.querySelectorAll('.linear-view__item').forEach(item => {
      item.addEventListener('click', () => {
        const target = allNodes.find(n => n.id === item.dataset.id);
        if (target) {
          pushState();
          showLinearView(target);
          openDrawer(target);
        }
      });
    });

    openDrawer(nodeData);
    updateModeIndicator();
  }

  // Hide linear view and restore bubble graph
  function hideLinearView() {
    const linearView = document.getElementById('linearView');
    if (linearView) linearView.style.display = 'none';
    svg.node().style.display = '';
    const legend = document.querySelector('.graph-legend-filter');
    if (legend) legend.style.display = '';
  }

  const gLinks = svg.append('g').attr('stroke', '#d9d9ef').attr('stroke-width', 2.5);
  const gNodes = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.5, 2]).on('zoom', (ev)=>{
    gNodes.attr('transform', ev.transform);
    gLinks.attr('transform', ev.transform);
  });
  svg.call(zoom);

  const centerForce = d3.forceCenter(0, 0);
  const sim = d3.forceSimulation(graphNodes)
    .force('link', d3.forceLink(graphLinks).id(d => d.id).distance(20).strength(0.2))
    .force('charge', d3.forceManyBody().strength(-10).distanceMax(100))
    .force('center', centerForce)
    .force('collision', d3.forceCollide().radius(d => radius(d.value, d.group, d.isArea) + 2).strength(0.8).iterations(2))
    .alphaDecay(0.05)
    .velocityDecay(0.85)
    .alphaMin(0.005)
    .force('orbit', () => {
      // Solar system force: keep primary nodes in tight orbit around LVMH
      if (currentViewMode !== 'default') return;
      
      const lvmhNode = graphNodes.find(n => n.group === 0);
      if (!lvmhNode) return;
      
      const w = width();
      const h = height();
      const centerX = w / 2;
      const centerY = h / 2;
      const lvmhRadius = radius(lvmhNode.value, lvmhNode.group, lvmhNode.isArea);
      const areaRadius = 70; // Area node radius
      const belowOffset = lvmhRadius + areaRadius + 20; // Gap between LVMH and area nodes
      const sideSpacing = areaRadius + 30; // Horizontal spacing between area nodes
      
      const otherNodes = graphNodes.filter(n => n.group !== 0);
      
      otherNodes.forEach((node, i) => {
        // Position area nodes below LVMH, side by side
        const xOffset = otherNodes.length === 1 ? 0 : (i === 0 ? -sideSpacing : sideSpacing);
        const targetX = centerX + xOffset;
        const targetY = centerY + belowOffset;
        
        // Stronger force toward target position for tighter grouping
        const dx = targetX - node.x;
        const dy = targetY - node.y;
        node.vx += dx * 0.08;
        node.vy += dy * 0.08;
      });
    })
    .force('cluster', () => {
      // Cluster force for non-default modes
      if (currentViewMode === 'default' || currentViewMode === 'tree') return;
      
      const w = width();
      const h = height();
      const centerX = w / 2;
      const centerY = h / 2;
      const maxDistance = Math.min(w, h) * 0.25;
      
      graphNodes.forEach(node => {
        if (node.fx !== null) return; // Skip fixed nodes
        
        const dx = node.x - centerX;
        const dy = node.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Centering force
        const centeringForce = 0.04;
        node.vx -= dx * centeringForce;
        node.vy -= dy * centeringForce;
        
        // Bound force
        if (distance > maxDistance) {
          const boundForce = (distance - maxDistance) * 0.1;
          node.vx -= (dx / distance) * boundForce;
          node.vy -= (dy / distance) * boundForce;
        }
      });
    });
  
  // Stop simulation completely when it's settled
  sim.on('end', () => {
    console.log('Simulation settled and stopped');
  });

  function rescaleForDrawer(){
    // No longer needed - sidebar is always visible
    // Keep function for compatibility with any remaining calls
  }

  function ticked(){
    // Don't update during transitions
    if (isTransitioning) return;
    
    // Round positions to whole pixels to avoid sub-pixel rendering jitter
    link.attr('x1', d => Math.round(d.source.x))
        .attr('y1', d => Math.round(d.source.y))
        .attr('x2', d => Math.round(d.target.x))
        .attr('y2', d => Math.round(d.target.y));
    
    // Only update position if not hovering (preserve hover scale)
    if (!isHoverClustering) {
      node.attr('transform', d => `translate(${Math.round(d.x)},${Math.round(d.y)})`);
    }
  }

  // Initialize empty selections - these will be populated by setGraphData
  let link = gLinks.selectAll('line');
  let node = gNodes.selectAll('g.node');

  sim.on('tick', ticked);

  // Track transition state
  let isTransitioning = false;
  let isLoadingNodes = false; // Disable hover during node loading
  
  // Wait for mouse movement before re-enabling hover
  function waitForMouseMoveToEnableHover() {
    const handler = () => {
      isLoadingNodes = false;
      svg.node().removeEventListener('mousemove', handler);
      document.removeEventListener('mousemove', handler);
    };
    // Listen on both SVG and document to catch any mouse movement
    svg.node().addEventListener('mousemove', handler, { once: true });
    document.addEventListener('mousemove', handler, { once: true });
  }
  
  function setGraphData(newNodes, newLinks, animate = true){
    console.log('setGraphData called with:', {
      newNodesCount: (newNodes || []).length,
      newLinksCount: (newLinks || []).length,
      currentMode: currentViewMode,
      animate: animate
    });
    
    // Store all data
    allNodes = newNodes || [];
    allLinks = (newLinks || []).filter(l => l.source && l.target && l.source !== l.target);
    
    // Get visible nodes and links based on current mode
    visibleNodes = getVisibleNodes();
    visibleLinks = getVisibleLinks(visibleNodes);
    
    const w = width();
    const h = height();
    const centerX = w / 2;
    const centerY = h / 2;
    
    // Calculate positions for new nodes in a tight cluster
    const newNodeIds = new Set(visibleNodes.map(n => n.id));
    const oldNodeIds = new Set(graphNodes.map(n => n.id));
    
    // Determine which nodes are entering, staying, or exiting
    const enteringNodes = visibleNodes.filter(n => !oldNodeIds.has(n.id));
    const exitingNodes = graphNodes.filter(n => !newNodeIds.has(n.id));
    const stayingNodes = visibleNodes.filter(n => oldNodeIds.has(n.id));
    
    // If animating, handle transitions
    if (animate && (enteringNodes.length > 0 || exitingNodes.length > 0)) {
      isTransitioning = true;
      isLoadingNodes = true; // Disable hover during loading
      
      // Disable pointer events on nodes during transition
      gNodes.style('pointer-events', 'none');
      
      // First, fade out exiting nodes quickly
      const exitSelection = gNodes.selectAll('g.node')
        .filter(d => !newNodeIds.has(d.id));
      
      exitSelection
        .transition('exit')
        .duration(150)
        .style('opacity', 0)
        .attr('transform', d => `translate(${centerX},${centerY}) scale(0.3)`)
        .remove();
      
      // Fade out exiting links
      gLinks.selectAll('line')
        .filter(l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return !newNodeIds.has(sourceId) || !newNodeIds.has(targetId);
        })
        .transition('exit')
        .duration(150)
        .attr('opacity', 0)
        .remove();
      
      // Wait for exit animations, then update
      setTimeout(() => {
        performGraphUpdate(visibleNodes, visibleLinks, centerX, centerY, true);
        isTransitioning = false;
        
        // Re-enable hover only after user moves mouse (after a short delay for animations)
        setTimeout(() => {
          gNodes.style('pointer-events', 'auto');
          // Wait for mouse movement to re-enable hover
          waitForMouseMoveToEnableHover();
        }, 400); // Wait for entry animations to finish
      }, 160);
    } else {
      performGraphUpdate(visibleNodes, visibleLinks, centerX, centerY, false);
    }
    
    updateModeIndicator();
  }
  
  function performGraphUpdate(newVisibleNodes, newVisibleLinks, centerX, centerY, animateEntry) {
    graphNodes = newVisibleNodes;
    graphLinks = newVisibleLinks;
    
    console.log('performGraphUpdate called:', {
      nodeCount: graphNodes.length,
      centerX, centerY,
      animateEntry,
      viewMode: currentViewMode
    });
    
    // Check if we have LVMH in this set (solar system layout)
    const lvmhNode = graphNodes.find(n => n.group === 0);
    const otherNodes = graphNodes.filter(n => n.group !== 0);
    
    if (lvmhNode && (currentViewMode === 'default' || currentViewMode === 'tree')) {
      // Solar system layout: LVMH at center, primary nodes in tight orbit
      const lvmhRadius = radius(lvmhNode.value, lvmhNode.group, lvmhNode.isArea);
      const areaRadius = 70;
      const belowOffset = lvmhRadius + areaRadius + 20;
      const sideSpacing = areaRadius + 30;
      
      // Position LVMH above center to make room for area nodes below
      const lvmhY = centerY - belowOffset / 2;
      lvmhNode.x = centerX;
      lvmhNode.y = lvmhY;
      lvmhNode.vx = 0;
      lvmhNode.vy = 0;
      lvmhNode.fx = centerX;
      lvmhNode.fy = lvmhY;
      
      // Position area nodes below LVMH, side by side
      otherNodes.forEach((n, i) => {
        const xOffset = otherNodes.length === 1 ? 0 : (i === 0 ? -sideSpacing : sideSpacing);
        n.x = centerX + xOffset;
        n.y = lvmhY + belowOffset;
        n.vx = 0;
        n.vy = 0;
      });
      
      console.log('Layout: LVMH + ' + otherNodes.length + ' area nodes below');
    } else {
      // Standard tight cluster layout for other view modes
      graphNodes.forEach((n, i) => {
        // Unfix LVMH position if we're not in default mode
        if (n.group === 0) {
          n.fx = null;
          n.fy = null;
        }
        const angle = (i / graphNodes.length) * 2 * Math.PI;
        const clusterRadius = graphNodes.length === 1 ? 0 : 20;
        n.x = centerX + Math.cos(angle) * clusterRadius;
        n.y = centerY + Math.sin(angle) * clusterRadius;
        n.vx = 0;
        n.vy = 0;
      });
    }

    // Update links
    link = gLinks.selectAll('line').data(graphLinks, l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return `${sourceId}-${targetId}`;
    });
    link.exit().remove();
    link = link.join(
      enter => enter.append('line')
        .attr('opacity', 0)
        .attr('stroke-width', 1.5)
        .call(el => el.transition('enter').duration(300).delay(100).attr('opacity', 0)),
      update => update.transition('update').duration(200).attr('opacity', 0).attr('stroke-width', 1.5),
      exit => exit.remove()
    );

    // Update nodes
    node = gNodes.selectAll('g.node').data(graphNodes, d => d.id);
    node.exit().remove();
    
    node = node.join(
      enter => {
        const g = enter.append('g')
          .attr('class', 'node')
          .style('cursor', d => d.group === 0 ? 'default' : 'pointer') // LVMH not clickable
          .style('opacity', 0)
          .attr('transform', `translate(${centerX},${centerY}) scale(0.5)`);
        
        g.append('circle')
        .attr('r', d => radius(d.value, d.group, d.isArea))
          .attr('fill', d => color(d.group))
          .attr('opacity', 0.9);
      
      const text = g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#fff')
          .style('font-weight', '600')
          .style('pointer-events', 'none');
        
        text.each(function(d) {
          const r = radius(d.value, d.group, d.isArea);
          d3.select(this).style('font-size', `${computeFontSizeForRadius(r)}px`);
          wrapText(d3.select(this), d.id, r);
        });
        
        // Animate entry
        if (animateEntry) {
          g.transition('enter')
            .duration(300)
            .delay((d, i) => i * 20)
            .ease(d3.easeCubicOut)
            .style('opacity', 1)
            .attr('transform', d => `translate(${Math.round(d.x || centerX)},${Math.round(d.y || centerY)}) scale(1)`);
        } else {
          // Ensure valid positions - fallback to center if NaN
          g.each(function(d) {
            if (isNaN(d.x) || isNaN(d.y)) {
              d.x = centerX;
              d.y = centerY;
              console.log('Fixed NaN position for', d.id, 'to', centerX, centerY);
            }
          });
          g.style('opacity', 1).attr('transform', d => `translate(${Math.round(d.x)},${Math.round(d.y)})`);
          console.log('Node positions after entry:', graphNodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
        }
        
        return g;
      },
      update => {
        // Animate existing nodes to new positions
        if (animateEntry) {
          update.transition('move')
            .duration(300)
            .ease(d3.easeCubicOut)
            .attr('transform', d => `translate(${Math.round(d.x)},${Math.round(d.y)})`);
        } else {
          update.attr('transform', d => `translate(${Math.round(d.x)},${Math.round(d.y)})`);
        }
        return update;
      },
      exit => exit.remove()
    );
    
    // Re-attach event handlers
    node.on('mouseenter', (event, d) => {
      if (isTransitioning || isLoadingNodes) return;
      hoveredNode = d;
      highlightConnections(d);
    });
    
    node.on('mouseleave', (event, d) => {
      if (isTransitioning || isLoadingNodes) return;
      hoveredNode = null;
      resetHighlighting();
    });
    
    node.on('click', (event, d) => {
      if (isTransitioning || isLoadingNodes) return;
      event.stopPropagation();
      handleNodeClick(d);
    });
    
    // Click on background to go back
    svg.on('click', (event) => {
      if (isTransitioning) return;
      if (event.target === svg.node()) {
        if (isBubbleView) {
          // In bubble view, background click goes back one level
          bubbleBack();
          return;
        }
        if (currentViewMode === 'expanded') {
          selectedNode = null;
          currentViewMode = 'default';
          clickedNode = null;
          hoveredNode = null;
          setGraphData(allNodes, allLinks, true);
          closeDrawer();
        } else {
          selectedNode = null;
        clickedNode = null;
        hoveredNode = null;
        resetHighlighting();
          closeDrawer();
        }
      }
    });
    
    // Update simulation
    sim.nodes(graphNodes);
    sim.force('link').links(graphLinks);
    
    // Position nodes in tight cluster centered on screen
    graphNodes.forEach((n, i) => {
      if (!n.x || !n.y || isNaN(n.x) || isNaN(n.y)) {
        const angle = (i / graphNodes.length) * 2 * Math.PI;
        const clusterRadius = 15;
        n.x = centerX + Math.cos(angle) * clusterRadius;
        n.y = centerY + Math.sin(angle) * clusterRadius;
      }
    });
    
    // Restart simulation with enough energy to properly settle nodes
    sim.alpha(0.3).alphaTarget(0).restart();
  }

  // Node click handler - expand to show connected nodes
  function handleNodeClick(d) {
    if (isNodeDisabled(d) || isTransitioning) {
      return;
    }
    
    // In bubble view mode, handle clicks differently
    if (isBubbleView) {
      // LVMH click in bubble view - expand to show area nodes
      if (d.group === 0) {
        expandBubbleNode(d);
        return;
      }
      // Any other node - expand to show its connections
      expandBubbleNode(d);
      return;
    }

    // LVMH (group 0) is not clickable in linear mode
    if (d.group === 0) {
      return;
    }
    
    clickedNode = d;
    hoveredNode = null;
    isHoverClustering = false;
    
    if (currentViewMode === 'default' || currentViewMode === 'linear') {
      // Save current state before showing linear view
      pushState();
      showLinearView(d);
    } else if (currentViewMode === 'expanded' && selectedNode && selectedNode.id === d.id) {
      selectedNode = null;
      currentViewMode = 'default';
      clickedNode = null;
      setGraphData(allNodes, allLinks, true);
      showLVMHDetails();
    } else if (currentViewMode === 'expanded') {
      pushState();
      selectedNode = d;
      setGraphData(allNodes, allLinks, true);
      openDrawer(d);
    } else {
      selectedNode = d;
      highlightConnections(d);
      openDrawer(d);
    }
  }
  
  // Show LVMH details in sidebar (used on page load)
  function showLVMHDetails() {
    const lvmhNode = allNodes.find(n => n.group === 0);
    if (lvmhNode) {
      const connections = allLinks.filter(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return sourceId === 'LVMH' || targetId === 'LVMH';
      });
      const relatedKeywords = connections.map(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return sourceId === 'LVMH' ? targetId : sourceId;
      });
      
      drawerTitle.textContent = 'LVMH';
      drawerBody.innerHTML = `
        <div class="sidebar-content">
          <div class="sidebar-stats">
            <div class="sidebar-stat">
              <span class="sidebar-stat-value">${relatedKeywords.length}</span>
              <span class="sidebar-stat-label">Areas</span>
            </div>
            <div class="sidebar-stat">
              <span class="sidebar-stat-value">${allNodes.length}</span>
              <span class="sidebar-stat-label">Total Keywords</span>
            </div>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-label">Description</div>
            <p class="sidebar-description">LVMH is the central hub of the knowledge graph. Click on an area to explore the restaurants, hotels, galleries, and more within it.</p>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-header">
              <div class="sidebar-section-label">Areas</div>
              <button class="sidebar-reset-btn" id="resetChipsBtn" title="Reset all"${disabledNodes.size === 0 ? ' disabled' : ''}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                Reset
              </button>
            </div>
            <p class="sidebar-hint">Click a keyword to toggle visibility</p>
            <div class="sidebar-chips">
              ${relatedKeywords.map(kw => `<span class="sidebar-chip sidebar-chip--toggle${disabledNodes.has(kw) ? ' sidebar-chip--disabled' : ''}" data-keyword="${kw}">${kw}</span>`).join('')}
            </div>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-label">Related Articles</div>
            <div class="sidebar-articles">
              ${generateArticlesHTML('LVMH')}
            </div>
          </div>
        </div>
      `;
      
      // Add click handlers to chips
      attachChipClickHandlers();
    }
  }
  
  // Attach click handlers to sidebar chips for toggling node visibility
  function attachChipClickHandlers() {
    const chips = drawerBody.querySelectorAll('.sidebar-chip--toggle');
    const resetBtn = drawerBody.querySelector('#resetChipsBtn');
    
    // Update reset button state
    function updateResetBtnState() {
      if (resetBtn) {
        resetBtn.disabled = disabledNodes.size === 0;
      }
    }
    
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        const keyword = chip.dataset.keyword;
        toggleNodeDisabled(keyword);
        chip.classList.toggle('sidebar-chip--disabled');
        updateResetBtnState();
      });
    });
    
    // Reset button handler
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        // Clear all disabled nodes
        disabledNodes.clear();
        
        // Update all chips to enabled state
        chips.forEach(chip => {
          chip.classList.remove('sidebar-chip--disabled');
        });
        
        // Update node visuals
        updateNodeDisabledStates();
        
        // Disable the reset button
        resetBtn.disabled = true;
      });
    }
  }
  
  // Toggle a node's disabled state
  function toggleNodeDisabled(nodeId) {
    if (disabledNodes.has(nodeId)) {
      disabledNodes.delete(nodeId);
    } else {
      disabledNodes.add(nodeId);
    }
    
    // Update node appearance
    updateNodeDisabledStates();
  }
  
  // Update the visual state of disabled nodes
  function updateNodeDisabledStates() {
    node.each(function(d) {
      const nodeEl = d3.select(this);
      const isDisabled = disabledNodes.has(d.id);
      
      nodeEl.select('circle')
        .transition()
        .duration(200)
        .attr('opacity', isDisabled ? 0.25 : 0.9)
        .style('filter', isDisabled ? 'grayscale(0.8) brightness(1.3)' : 'none');
      
      nodeEl.select('text')
        .transition()
        .duration(200)
        .attr('opacity', isDisabled ? 0.4 : 1);
    });
  }

  function resize(){
    const canvasEl = container.querySelector('.keywords__canvas');
    const w = canvasEl?.clientWidth || 800;
    const h = Math.max(window.innerHeight * 0.7, 400);
    console.log('Resize called with dimensions:', { w, h });
    svg.attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h);
    centerForce.x(w/2).y(h/2);
    
    // Center nodes initially if they don't have positions
    if (graphNodes.some(node => !node.x || !node.y)) {
      graphNodes.forEach((node, i) => {
        if (!node.x || !node.y) {
          // Arrange in a tight cluster in the center
          const angle = (i / graphNodes.length) * 2 * Math.PI;
          const clusterRadius = 15;
          node.x = w/2 + Math.cos(angle) * clusterRadius;
          node.y = h/2 + Math.sin(angle) * clusterRadius;
        }
      });
    }
    
    sim.alpha(0.3).alphaTarget(0).restart();
    rescaleForDrawer();
  }
  
  // Ensure resize is called after DOM is ready and elements have dimensions
  function initializeGraph() {
    console.log('initializeGraph called');
    console.log('SVG element exists:', !!svg.node());
    console.log('Container element exists:', !!container);
    console.log('D3 version:', d3.version);
    
    setTimeout(() => {
      console.log('Delayed initialization starting...');
      const canvasEl = container.querySelector('.keywords__canvas');
      console.log('Canvas element dimensions:', {
        width: canvasEl?.clientWidth,
        height: canvasEl?.clientHeight,
        exists: !!canvasEl
      });
      
      // IMPORTANT: Set SVG dimensions FIRST before creating nodes
      const w = canvasEl?.clientWidth || 800;
      const h = Math.max(window.innerHeight * 0.7, 400);
      svg.attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h);
      centerForce.x(w/2).y(h/2);
      
      console.log('About to initialize with data:', {
        allNodes: allNodes.length,
        allLinks: allLinks.length,
        sampleNodes: allNodes.slice(0, 2),
        canvasWidth: w,
        canvasHeight: h
      });
      
      // Initialize the graph data properly (no animation on initial load)
      setGraphData(allNodes, allLinks, false);
      
      // Call resize to finalize positioning
      resize();
      
      // Show bubble view on page load (LVMH centered)
      setTimeout(() => {
        showBubbleView();
      }, 150);
      
      console.log('After initialization:');
      console.log('Graph nodes in simulation:', sim.nodes().length);
      console.log('Graph links in simulation:', sim.force('link').links().length);
      console.log('DOM nodes count:', gNodes.selectAll('g.node').size());
    }, 100);
  }
  
  window.addEventListener('resize', resize);
  
  // Call initialization after a short delay to ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGraph);
  } else {
    initializeGraph();
  }

  function openDrawer(d){
    // Always use the LVMH-specific details for the root node
    if (d.id === 'LVMH' || d.group === 0) {
      showLVMHDetails();
      return;
    }
    drawerTitle.textContent = d.id;
    
    // Use allLinks to get ALL connections, not just visible ones
    const connections = allLinks.filter(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return sourceId === d.id || targetId === d.id;
    });
    
    const relatedKeywords = connections.map(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return sourceId === d.id ? targetId : sourceId;
    });
    
    // Remove duplicates and sort
    const uniqueKeywords = [...new Set(relatedKeywords)].sort();
    
    drawerBody.innerHTML = `
      <div class="sidebar-content">
        <div class="sidebar-stats">
          <div class="sidebar-stat">
            <span class="sidebar-stat-value">${d.value}</span>
            <span class="sidebar-stat-label">Volume</span>
          </div>
          <div class="sidebar-stat">
            <span class="sidebar-stat-value">${uniqueKeywords.length}</span>
            <span class="sidebar-stat-label">Connections</span>
          </div>
          </div>
        <div class="sidebar-section">
          <div class="sidebar-section-label">Description</div>
          <p class="sidebar-description">Placeholder description about ${d.id} with sample insights.</p>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <div class="sidebar-section-label">Related Keywords</div>
            <button class="sidebar-reset-btn" id="resetChipsBtn" title="Reset all"${disabledNodes.size === 0 ? ' disabled' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reset
            </button>
          </div>
          <p class="sidebar-hint">Click a keyword to toggle visibility</p>
          <div class="sidebar-chips">
            ${uniqueKeywords.length > 0 
              ? uniqueKeywords.map(kw => `<span class="sidebar-chip sidebar-chip--toggle${disabledNodes.has(kw) ? ' sidebar-chip--disabled' : ''}" data-keyword="${kw}">${kw}</span>`).join('')
              : '<span class="sidebar-no-data">No related keywords</span>'
            }
          </div>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-section-label">Related Articles</div>
          <div class="sidebar-articles">
            ${generateArticlesHTML(d.id)}
          </div>
        </div>
      </div>
    `;
    
    // Add click handlers to chips
    attachChipClickHandlers();
  }
  
  function closeDrawer(){
    // Reset sidebar to placeholder state
    drawerTitle.textContent = 'Select a Keyword';
    drawerBody.innerHTML = '<p class="sidebar__placeholder">Click on a node in the graph to see its details and connections.</p>';
  }
  
  // Neo4j drawer handlers (keep as modal)
  neo4jClose && neo4jClose.addEventListener('click', ()=>{ neo4jDrawer.setAttribute('aria-hidden','true'); });
  openNeo4jBtn && openNeo4jBtn.addEventListener('click', ()=>{ neo4jDrawer.setAttribute('aria-hidden','false'); });

  // Filtering
  function applyFilter(term){
    const t = String(term||'').toLowerCase();
    node.style('opacity', d => d.id.toLowerCase().includes(t) ? 1 : 0.3);
    link.style('opacity', l => {
      const s = (l.source.id?l.source.id:l.source).toLowerCase();
      const tg = (l.target.id?l.target.id:l.target).toLowerCase();
      return (s.includes(t) || tg.includes(t)) ? 0.15 : 0.05;
    });
  }
  filterInput && filterInput.addEventListener('input', (e)=> applyFilter(e.target.value));
  resetBtn && resetBtn.addEventListener('click', ()=>{ 
    filterInput && (filterInput.value=''); 
    
    // Hide linear view if active
    hideLinearView();
    
    // Reset to default view (LVMH + primary nodes)
    currentViewMode = 'default';
    selectedNode = null;
    clickedNode = null;
    hoveredNode = null;
    isHoverClustering = false;
    originalPositions = {};
    disabledNodes.clear(); // Clear disabled nodes
    
    // Reset node positions to force re-centering
    allNodes.forEach(node => {
      delete node.x;
      delete node.y;
      delete node.vx;
      delete node.vy;
    });
    
    setGraphData(allNodes, allLinks, true);
    
    // Clear state history on reset
    stateHistory.length = 0;
    
    // Return to bubble view (LVMH centered)
    setTimeout(() => {
      showBubbleView();
    }, 200);
  });
  
  // Back button - navigate through state history
  const backBtn = document.getElementById('keywordsBackBtn');
  backBtn && backBtn.addEventListener('click', () => {
    // Bubble view back navigation
    if (isBubbleView) {
      if (!bubbleBack()) {
        // No more bubble history - switch back to list view
        showListView();
      }
      return;
    }

    // Linear view back navigation
    if (currentViewMode === 'linear') {
      const previousState = popState();
      if (previousState) {
        if (previousState.viewMode === 'linear') {
          const prevNode = allNodes.find(n => n.id === previousState.selectedNodeId);
          if (prevNode) {
            showLinearView(prevNode);
            return;
          }
        }
        hideLinearView();
        restoreState(previousState);
      } else {
        // No history - go back to LVMH linear view (home)
        const lvmhNode = allNodes.find(n => n.id === 'LVMH');
        if (lvmhNode) {
          showLinearView(lvmhNode);
        }
      }
      return;
    }
    const previousState = popState();
    if (previousState) {
      restoreState(previousState);
    } else {
      history.back();
    }
  });
  
  // Show All button functionality
  const showAllBtn = document.getElementById('showAll');
  showAllBtn && showAllBtn.addEventListener('click', () => {
    currentViewMode = 'all';
    selectedNode = null;
    clickedNode = null;
    hoveredNode = null;
    setGraphData(allNodes, allLinks, true);
  });

  // Update checkbox states based on what node types exist in current view
  function updateFilterCheckboxes() {
    // Get current visible nodes based on view mode (before applying hidden filter)
    let availableNodes;
    if (currentViewMode === 'default') {
      availableNodes = allNodes.filter(n => n.group === 0 || n.group === 1); // LVMH + primary on default
    } else if (currentViewMode === 'expanded' && selectedNode) {
      const connectedIds = getConnectedNodeIds(selectedNode);
      availableNodes = allNodes.filter(n => connectedIds.has(n.id));
    } else {
      availableNodes = allNodes;
    }
    
    // Check which groups exist in available nodes
    const availableGroups = new Set(availableNodes.map(n => n.group));
    
    // Update each checkbox (note: group 0 is LVMH root, not in filter checkboxes)
    const checkboxMap = {
      'filterTopLevel': 1,
      'filterConnected': 2,
      'filterSecondary': 3,
      'filterIsolated': 4
    };
    
    Object.entries(checkboxMap).forEach(([id, group]) => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        const isAvailable = availableGroups.has(group);
        checkbox.disabled = !isAvailable;
        checkbox.parentElement.style.opacity = isAvailable ? '1' : '0.4';
        checkbox.parentElement.style.pointerEvents = isAvailable ? 'auto' : 'none';
        
        // If available, check based on whether it's hidden
        if (isAvailable) {
          checkbox.checked = !hiddenGroups.has(group);
        } else {
          checkbox.checked = false;
        }
      }
    });
  }
  
  // Toggle visibility of a node group and regroup remaining nodes
  function toggleGroupVisibility(group, isVisible) {
    if (isVisible) {
      hiddenGroups.delete(group);
    } else {
      hiddenGroups.add(group);
    }
    
    const w = width();
    const h = height();
    const centerX = w / 2;
    const centerY = h / 2;
    
    // Get visible nodes (not in hidden groups)
    const visibleNodeIds = new Set(
      graphNodes.filter(n => !hiddenGroups.has(n.group)).map(n => n.id)
    );
    
    // Animate hiding nodes
    node.each(function(d) {
      const nodeEl = d3.select(this);
      const shouldShow = !hiddenGroups.has(d.group);
      
      if (!shouldShow) {
        // Fade out and shrink toward center
        nodeEl.transition()
          .duration(250)
          .ease(d3.easeCubicIn)
          .style('opacity', 0)
          .attr('transform', `translate(${centerX},${centerY}) scale(0.3)`)
          .style('pointer-events', 'none');
      }
    });
    
    // After hiding animation, reposition visible nodes
    setTimeout(() => {
      // Reset positions of visible nodes to cluster
      const visibleNodes = graphNodes.filter(n => !hiddenGroups.has(n.group));
      visibleNodes.forEach((n, i) => {
        const angle = (i / visibleNodes.length) * 2 * Math.PI;
        const clusterRadius = 20;
        n.x = centerX + Math.cos(angle) * clusterRadius;
        n.y = centerY + Math.sin(angle) * clusterRadius;
        n.vx = 0;
        n.vy = 0;
      });
      
      // Animate visible nodes to new positions
      node.each(function(d) {
        const nodeEl = d3.select(this);
        const shouldShow = !hiddenGroups.has(d.group);
        
        if (shouldShow) {
          nodeEl.transition()
            .duration(300)
            .ease(d3.easeCubicOut)
            .style('opacity', 1)
            .attr('transform', `translate(${Math.round(d.x)},${Math.round(d.y)}) scale(1)`)
            .style('pointer-events', 'auto');
        }
      });
      
      // Update simulation with only visible nodes
      sim.nodes(visibleNodes);
      sim.alpha(0.3).alphaTarget(0).restart();
    }, isVisible ? 0 : 260);
    
    // If showing nodes, animate them in from center
    if (isVisible) {
      // First position newly visible nodes at center
      node.each(function(d) {
        if (d.group === group) {
          d.x = centerX;
          d.y = centerY;
          d3.select(this)
            .attr('transform', `translate(${centerX},${centerY}) scale(0.3)`)
            .style('opacity', 0);
        }
      });
      
      // Then animate them in after regrouping starts
      setTimeout(() => {
        const visibleNodes = graphNodes.filter(n => !hiddenGroups.has(n.group));
        visibleNodes.forEach((n, i) => {
          const angle = (i / visibleNodes.length) * 2 * Math.PI;
          const clusterRadius = 20;
          n.x = centerX + Math.cos(angle) * clusterRadius;
          n.y = centerY + Math.sin(angle) * clusterRadius;
        });
        
        node.each(function(d) {
          const nodeEl = d3.select(this);
          if (!hiddenGroups.has(d.group)) {
            nodeEl.transition()
              .duration(350)
              .ease(d3.easeBackOut.overshoot(0.5))
              .style('opacity', 1)
              .attr('transform', `translate(${Math.round(d.x)},${Math.round(d.y)}) scale(1)`)
              .style('pointer-events', 'auto');
          }
        });
        
        sim.nodes(visibleNodes);
        sim.alpha(0.3).alphaTarget(0).restart();
      }, 50);
    }
  }
  
  // Add change listeners to filter checkboxes
  const checkboxGroupMap = {
    'filterTopLevel': 1,
    'filterConnected': 2,
    'filterSecondary': 3,
    'filterIsolated': 4
  };
  
  Object.entries(checkboxGroupMap).forEach(([id, group]) => {
    const checkbox = document.getElementById(id);
    checkbox && checkbox.addEventListener('change', (e) => {
      toggleGroupVisibility(group, e.target.checked);
    });
  });
  
  // Update checkboxes whenever graph data changes
  const originalSetGraphData = setGraphData;
  setGraphData = function(newNodes, newLinks, animate) {
    // Clear hidden groups when view changes (unless restoring state)
    if (!isRestoringState) {
      hiddenGroups.clear();
    }
    originalSetGraphData(newNodes, newLinks, animate);
    // Update checkboxes after a short delay to let the graph render
    setTimeout(updateFilterCheckboxes, 200);
  };

  // Zoom controls
  zoomIn && zoomIn.addEventListener('click', ()=> svg.transition().duration(200).call(zoom.scaleBy, 1.2));
  zoomOut && zoomOut.addEventListener('click', ()=> svg.transition().duration(200).call(zoom.scaleBy, 0.8));
  fitBtn && fitBtn.addEventListener('click', ()=> svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity));

  // View state (tabs now handle switching, but keep state for internal logic)
  let isBubbleView = false;

  // Track bubble view navigation history
  const bubbleHistory = [];

  function showBubbleView(/* startNode */) {
    isBubbleView = true;
    hideLinearView();

    // Reset to tree-style navigation: only LVMH (Louis Vuitton) is visible.
    bubblesExpandedIds.clear();
    bubbleHistory.length = 0;

    selectedNode = null;
    clickedNode = null;
    hoveredNode = null;
    isHoverClustering = false;
    currentViewMode = 'tree';

    allNodes.forEach(n => { delete n.x; delete n.y; delete n.vx; delete n.vy; delete n.fx; delete n.fy; });
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity), 300);

    showLVMHDetails();
  }

  // Tree-style toggle: clicking a bubble expands its direct children; clicking
  // an already-expanded bubble collapses its subtree and closes the side
  // panel (mirroring the Tree view behavior).
  function expandBubbleNode(nodeData) {
    if (!nodeData) return;
    var id = nodeData.id;

    if (bubblesExpandedIds.has(id)) {
      // Collapse this node and any deeper expansions beneath it.
      collapseBubbleSubtree(id);
      if (selectedNode && selectedNode.id === id) {
        selectedNode = null;
        showLVMHDetails();
      }
    } else {
      bubblesExpandedIds.add(id);
      selectedNode = nodeData;
      openDrawer(nodeData);
    }

    clickedNode = null;
    hoveredNode = null;
    isHoverClustering = false;
    currentViewMode = 'tree';

    allNodes.forEach(n => { delete n.x; delete n.y; delete n.vx; delete n.vy; delete n.fx; delete n.fy; });
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity), 300);
  }

  // Background click in bubble view: collapse the deepest expansion (acts
  // like a one-step "back"). Returns false when there's nothing to collapse
  // so the outer click handler can fall through to its default behavior.
  function bubbleBack() {
    if (bubblesExpandedIds.size === 0) return false;
    // Find the deepest expanded id (longest path from root via parent chain).
    var nodesById = {};
    allNodes.forEach(function (n) { nodesById[n.id] = n; });
    function depthOf(id) {
      var d = 0; var cur = nodesById[id];
      while (cur && cur.parent) { d++; cur = nodesById[cur.parent]; }
      return d;
    }
    var deepest = null; var deepestDepth = -1;
    bubblesExpandedIds.forEach(function (id) {
      var dep = depthOf(id);
      if (dep > deepestDepth) { deepestDepth = dep; deepest = id; }
    });
    if (!deepest) return false;

    collapseBubbleSubtree(deepest);
    if (selectedNode && selectedNode.id === deepest) {
      selectedNode = null;
      showLVMHDetails();
    }

    allNodes.forEach(n => { delete n.x; delete n.y; delete n.vx; delete n.vy; delete n.fx; delete n.fy; });
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity), 300);
    return true;
  }

  function showListView() {
    isBubbleView = false;

    // Remember current node for sidebar continuity
    const currentNode = selectedNode;

    clickedNode = null;
    hoveredNode = null;
    stateHistory.length = 0;

    // Build the linear view history from the bubble history so back works
    // Each level in bubble history becomes a linear state entry
    const lvmhNode = allNodes.find(n => n.id === 'LVMH');
    bubbleHistory.forEach(entry => {
      stateHistory.push({
        viewMode: 'linear',
        selectedNodeId: entry.selectedNodeId || 'LVMH',
        hiddenGroups: new Set(),
        timestamp: Date.now()
      });
    });

    // Show linear view for the current node, or LVMH if none
    const nodeToShow = currentNode || lvmhNode;
    if (nodeToShow) {
      showLinearView(nodeToShow);
    }
  }

  // Expose tab switching for external tab navigation
  window.kwShowBubblesTab = function() {
    hideLinearView();
    showBubbleView();
  };
  window.kwShowListTab = function() {
    const lvmhNode = allNodes.find(n => n.id === 'LVMH');
    if (lvmhNode) showListView();

    // Build list in the dedicated list tab
    const container = document.getElementById('listViewContainer');
    if (!container) return;
    container.innerHTML = '';

    const grouped = {};
    allNodes.forEach(n => {
      if (n.group === 0) return;
      const cat = keywordCategories[n.id] || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(n);
    });
    Object.values(grouped).forEach(items => items.sort((a, b) => b.value - a.value));

    const sortedCats = Object.keys(grouped).sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    sortedCats.forEach(cat => {
      const items = grouped[cat];
      const section = document.createElement('div');
      section.innerHTML = '<div class="linear-view__category"><span class="linear-view__category-label">' + cat + '</span><span class="linear-view__category-count">' + items.length + '</span><div class="linear-view__category-line"></div></div>';
      items.forEach(n => {
        const color = groupColors[n.group] || groupColors[1];
        const count = getConnectedNodeIds(n).size - 1;
        const el = document.createElement('div');
        el.className = 'linear-view__item';
        el.dataset.id = n.id;
        el.innerHTML = '<div class="linear-view__item-indicator" style="background:' + color.gradient + '"></div><div class="linear-view__item-info"><span class="linear-view__item-name">' + n.id + '</span><span class="linear-view__item-meta">' + count + ' connections</span></div><svg class="linear-view__item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        el.addEventListener('click', function() {
          var target = allNodes.find(function(nd) { return nd.id === n.id; });
          if (target) {
            var title = document.getElementById('listDrawerTitle');
            var body = document.getElementById('listDrawerBody');
            if (title) title.textContent = target.id;
            if (body) {
              var conns = getConnectedNodeIds(target);
              var connNodes = allNodes.filter(function(nd) { return conns.has(nd.id) && nd.id !== target.id; });
              body.innerHTML = '<div class="sidebar-stat"><span class="sidebar-stat-value">' + connNodes.length + '</span><span class="sidebar-stat-label">connections</span></div><div class="sidebar-connections"><h3>Connected Keywords</h3>' + connNodes.map(function(c) { return '<span class="sidebar-connection-tag">' + c.id + '</span>'; }).join('') + '</div><div class="sidebar-articles"><h3>Related Articles</h3>' + generateArticlesHTML(target.id) + '</div>';
            }
          }
        });
        section.appendChild(el);
      });
      container.appendChild(section);
    });
  };

  window.kwGetNodes = function() { return allNodes; };
  window.kwGetLinks = function() { return allLinks; };
  window.kwGetConnected = getConnectedNodeIds;
  window.kwGetArticlesHTML = generateArticlesHTML;

  // Fullscreen toggle
  const fullscreenToggle = document.getElementById('fullscreenToggle');
  const fullscreenExit = document.getElementById('fullscreenExit');
  const keywordsCanvas = document.querySelector('.keywords__canvas');
  const expandIcon = fullscreenToggle?.querySelector('.fullscreen-expand-icon');
  const collapseIcon = fullscreenToggle?.querySelector('.fullscreen-collapse-icon');

  function toggleFullscreen() {
    const isFullscreen = keywordsCanvas.classList.toggle('is-fullscreen');
    
    if (expandIcon && collapseIcon) {
      expandIcon.style.display = isFullscreen ? 'none' : 'block';
      collapseIcon.style.display = isFullscreen ? 'block' : 'none';
    }
    
    // Re-fit the graph after a short delay to account for the size change
    setTimeout(() => {
      svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);
    }, 100);
  }

  fullscreenToggle && fullscreenToggle.addEventListener('click', toggleFullscreen);
  fullscreenExit && fullscreenExit.addEventListener('click', toggleFullscreen);

  // Handle Escape key to exit fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && keywordsCanvas?.classList.contains('is-fullscreen')) {
      toggleFullscreen();
    }
  });

  // Neo4j integration
  const neo4jUriEl = document.getElementById('neo4jUri');
  const neo4jUserEl = document.getElementById('neo4jUser');
  const neo4jPassEl = document.getElementById('neo4jPass');
  const neo4jConnectBtn = document.getElementById('neo4jConnect');
  const neo4jLoadBtn = document.getElementById('neo4jLoad');
  const neo4jSeedBtn = document.getElementById('neo4jSeed');
  const neo4jStatusEl = document.getElementById('neo4jStatus');

  let driver = null;
  function setStatus(msg, ok){
    if(neo4jStatusEl){ neo4jStatusEl.textContent = msg; neo4jStatusEl.style.color = ok ? '#065f46' : '#6b7280'; }
  }
  async function ensureDriver(){
    if(driver){ return driver; }
    const uri = (neo4jUriEl && neo4jUriEl.value) || 'bolt://localhost:7687';
    const user = (neo4jUserEl && neo4jUserEl.value) || 'neo4j';
    const pass = (neo4jPassEl && neo4jPassEl.value) || 'neo4j';
    driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
    await driver.verifyConnectivity();
    return driver;
  }

  neo4jConnectBtn && neo4jConnectBtn.addEventListener('click', async () => {
    try {
      if(driver){ await driver.close(); driver = null; }
      await ensureDriver();
      setStatus('Connected', true);
      neo4jLoadBtn && (neo4jLoadBtn.disabled = false);
    } catch(err){
      console.error(err);
      setStatus('Connection failed');
    }
  });

  neo4jSeedBtn && neo4jSeedBtn.addEventListener('click', async () => {
    try {
      const drv = await ensureDriver();
      const session = drv.session({ defaultAccessMode: neo4j.session.WRITE });
      try {
        await session.executeWrite(async tx => {
          await tx.run('CREATE CONSTRAINT keyword_name IF NOT EXISTS FOR (k:Keyword) REQUIRE k.name IS UNIQUE');
          await tx.run('UNWIND $data AS row MERGE (k:Keyword {name: row.name}) SET k.volume = row.value, k.group = row.group', { data: graphNodes });
          await tx.run('UNWIND $rels AS r MATCH (a:Keyword {name:r.source}),(b:Keyword {name:r.target}) MERGE (a)-[:RELATED_TO]->(b)', { rels: graphLinks.length?graphLinks:defaultLinks });
        });
        setStatus('Seeded sample graph', true);
        neo4jLoadBtn && (neo4jLoadBtn.disabled = false);
      } finally { await session.close(); }
    } catch(err){ console.error(err); setStatus('Seed failed'); }
  });

  neo4jLoadBtn && neo4jLoadBtn.addEventListener('click', async () => {
    try {
      const drv = await ensureDriver();
      const session = drv.session({ defaultAccessMode: neo4j.session.READ });
      try {
        const resNodes = await session.run('MATCH (k:Keyword) RETURN k.name AS id, coalesce(k.volume, 20) AS value, coalesce(k.group, 1) AS group');
        const resLinks = await session.run('MATCH (a:Keyword)-[:RELATED_TO]->(b:Keyword) RETURN a.name AS source, b.name AS target');
        const n = resNodes.records.map(r => ({ id: r.get('id'), value: r.get('value'), group: r.get('group') }));
        const l = resLinks.records.map(r => ({ source: r.get('source'), target: r.get('target') }));
        if(n.length === 0){ setStatus('No data found. Try Seed.', false); return; }
        setGraphData(n, l);
        setStatus(`Loaded ${n.length} nodes / ${l.length} links`, true);
      } finally { await session.close(); }
    } catch(err){ console.error(err); setStatus('Load failed'); }
  });

  // Real-time synchronization with shared data system — DISABLED for the
  // keyword graph view. This page is the source of truth for the curated
  // Louis Vuitton ▸ Kusama / New York hierarchy, so reacting to other pages’
  // ShopThatData mutations would (a) strip the `parent` fields the bubble &
  // tree views need, and (b) re-inject the legacy AREA_DEFS keyword links.
  if (window.ShopThatData && false) {
    // Listen for keyword changes from other pages
    window.ShopThatData.on('keywords', (keywords) => {
      let newNodes = keywords.map(node => ({
        id: node.id || node.name,
        group: node.group || 1,
        value: node.value || 50,
        isArea: node.isArea || false,
        isRoot: node.isRoot || false,
        parent: node.parent || undefined
      }));
      let newLinks = allLinks.slice();
      const result = ensureLVMH(newNodes, newLinks);
      setGraphData(result.nodes, result.links, false);
    });
    
    // Listen for connection changes from other pages
    window.ShopThatData.on('connections', (connections) => {
      let newNodes = allNodes.slice();
      let newLinks = connections.slice();
      const result = ensureLVMH(newNodes, newLinks);
      setGraphData(result.nodes, result.links, false);
    });
  }

  // Area structure definition
  const AREA_DEFS = [
    { node: { id: '57th St.', group: 1, value: 90, isArea: true },
      keywords: ['The Modern','Two Michelin Stars','MoMA Museum','Le Bernardin','Three Michelin Stars','Eric Ripert','Seafood','The Plaza','The St. Regis','The Baccarat','Luxury Hotel'] },
    { node: { id: 'Soho', group: 1, value: 90, isArea: true },
      keywords: ['Cafe Carlyle','The Carlyle','Bemelmans Bar','Art Deco','Jean-Georges Vongerichten','Jean-Georges at The Mark','The Mark Hotel'] }
  ];

  function linkExists(links, src, tgt) {
    return links.some(l =>
      (l.source === src && l.target === tgt) || (l.source === tgt && l.target === src) ||
      (l.source?.id === src && l.target?.id === tgt) || (l.source?.id === tgt && l.target?.id === src)
    );
  }

  // Ensure LVMH + area nodes + area connections always exist
  function ensureLVMH(nodes, links) {
    if (!nodes.some(n => n.id === 'LVMH')) {
      nodes.unshift({ id: 'LVMH', group: 0, value: 100, isRoot: true });
    }

    AREA_DEFS.forEach(area => {
      // Ensure area node
      let existing = nodes.find(n => n.id === area.node.id);
      if (!existing) {
        nodes.push({ ...area.node });
      } else {
        existing.isArea = true;
      }

      // Ensure LVMH → area link
      if (!linkExists(links, 'LVMH', area.node.id)) {
        links.push({ source: 'LVMH', target: area.node.id });
      }

      // Ensure area → keyword links
      area.keywords.forEach(kw => {
        if (nodes.some(n => n.id === kw) && !linkExists(links, area.node.id, kw)) {
          links.push({ source: area.node.id, target: kw });
        }
      });
    });

    return { nodes, links };
  }

  // Function to refresh data from shared storage
  function refreshFromSharedData() {
    if (window.ShopThatData) {
      const keywords = window.ShopThatData.getKeywords();
      const connections = window.ShopThatData.getConnections();
      
      // Convert keywords to D3 format
      let newNodes = keywords.map(node => ({
        id: node.id || node.name,
        group: node.group || 1,
        value: node.value || 50,
        isArea: node.isArea || false,
        isRoot: node.isRoot || false
      }));
      
      let newLinks = connections.slice();
      
      // Ensure LVMH is always present
      const result = ensureLVMH(newNodes, newLinks);
      
      setGraphData(result.nodes, result.links, false);
    }
  }

  // Visibility / startup auto-refresh — DISABLED. Both paths called
  // refreshFromSharedData() which dropped the `parent` fields and ran
  // ensureLVMH() (legacy AREA_DEFS), collapsing the curated hierarchy back
  // to the flat 57th St./Soho list. We rebuild from defaults on every load
  // instead, so these handlers are no-ops on this page.
  void refreshFromSharedData;

  // Dark mode functionality
  function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    
    // Check for saved dark mode preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
      body.classList.add('dark-mode');
    }
    
    // Toggle dark mode
    if (darkModeToggle) {
      darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isNowDark = body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isNowDark);
      });
    }
  }

  // AI Side Panel functionality
  function initAISidePanel() {
    const askAiBtn = document.getElementById('askAiBtn');
    const aiSidePanel = document.getElementById('aiSidePanel');
    const aiPanelClose = document.getElementById('aiPanelClose');
    const aiPanelOverlay = document.getElementById('aiPanelOverlay');
    const aiInput = document.getElementById('aiInput');
    const aiSendBtn = document.getElementById('aiSendBtn');
    const aiMessages = document.getElementById('aiMessages');

    if (!askAiBtn || !aiSidePanel) {
      console.log('AI panel elements not found');
      return;
    }

    // Open panel
    askAiBtn.addEventListener('click', () => {
      aiSidePanel.classList.add('active');
      aiPanelOverlay.classList.add('active');
      aiSidePanel.setAttribute('aria-hidden', 'false');
      setTimeout(() => aiInput.focus(), 300);
    });

    // Close panel
    function closePanel() {
      aiSidePanel.classList.remove('active');
      aiPanelOverlay.classList.remove('active');
      aiSidePanel.setAttribute('aria-hidden', 'true');
    }

    aiPanelClose.addEventListener('click', closePanel);
    aiPanelOverlay.addEventListener('click', closePanel);

    // Handle Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && aiSidePanel.classList.contains('active')) {
        closePanel();
      }
    });

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function renderAiAnswer(container, payload) {
      const answer = payload && payload.answer ? payload.answer : 'No response available.';
      if (window.LuxuryIntelligence && window.LuxuryIntelligence.markdownToHtml) {
        container.innerHTML = window.LuxuryIntelligence.markdownToHtml(answer);
      } else {
        container.innerHTML = '<p>' + escapeHtml(answer) + '</p>';
      }

      if (payload && payload.domain) {
        const domainEl = document.createElement('div');
        domainEl.className = 'ai-message-domain';
        domainEl.style.marginTop = '8px';
        domainEl.style.opacity = '0.75';
        domainEl.style.fontSize = '12px';
        domainEl.textContent = 'Domain: ' + payload.domain;
        container.appendChild(domainEl);
      }

      if (payload && Array.isArray(payload.images) && payload.images.length) {
        const imageWrap = document.createElement('div');
        imageWrap.className = 'ai-message-images';
        imageWrap.style.display = 'grid';
        imageWrap.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
        imageWrap.style.gap = '8px';
        imageWrap.style.marginTop = '10px';
        payload.images.slice(0, 3).forEach((url) => {
          const img = document.createElement('img');
          img.src = url;
          img.alt = 'Luxury intelligence result';
          img.loading = 'lazy';
          img.style.width = '100%';
          img.style.height = '84px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '8px';
          imageWrap.appendChild(img);
        });
        container.appendChild(imageWrap);
      }
    }

    // Send message functionality
    async function sendMessage() {
      const message = aiInput.value.trim();
      if (!message) return;

      // Remove welcome message if present
      const welcomeMsg = aiMessages.querySelector('.ai-welcome-message');
      if (welcomeMsg) welcomeMsg.remove();

      // Add user message
      const userMsg = document.createElement('div');
      userMsg.className = 'ai-message user';
      userMsg.textContent = message;
      aiMessages.appendChild(userMsg);

      // Clear input
      aiInput.value = '';

      const thinkingMsg = document.createElement('div');
      thinkingMsg.className = 'ai-message ai';
      thinkingMsg.textContent = 'Thinking...';
      aiMessages.appendChild(thinkingMsg);
      aiMessages.scrollTop = aiMessages.scrollHeight;

      aiSendBtn.disabled = true;

      try {
        let payload = null;
        if (window.LuxuryIntelligence && typeof window.LuxuryIntelligence.ask === 'function') {
          payload = await window.LuxuryIntelligence.ask(message);
        } else {
          payload = { answer: 'Luxury Intelligence client is not available on this page yet.', images: [] };
        }

        thinkingMsg.remove();

        const aiResponse = document.createElement('div');
        aiResponse.className = 'ai-message ai';
        renderAiAnswer(aiResponse, payload);
        aiMessages.appendChild(aiResponse);
      } catch (error) {
        thinkingMsg.remove();
        const failMsg = document.createElement('div');
        failMsg.className = 'ai-message ai';
        failMsg.textContent = 'Sorry, the AI request failed. Please try again.';
        aiMessages.appendChild(failMsg);
        console.error('Keywords AI panel error:', error);
      } finally {
        aiSendBtn.disabled = false;
        aiMessages.scrollTop = aiMessages.scrollHeight;
      }
    }

    aiSendBtn.addEventListener('click', sendMessage);
    aiInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Initialize dark mode
  initDarkMode();

  // Bootstrap graph keywords from Luxury Intelligence API — DISABLED.
  // The keyword graph is now driven by the curated `defaultNodes`/`defaultLinks`
  // above (Louis Vuitton ▸ Kusama / 57th St. / SoHo). Re-enable only if the
  // demo should pull live AI keywords again.
  // setTimeout(bootstrapAiKeywordGraph, 180);
  void bootstrapAiKeywordGraph; // keep symbol referenced so linters stay quiet

  // Initialize AI Side Panel
  initAISidePanel();
})();


