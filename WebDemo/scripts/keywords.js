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
  let currentViewMode = 'default'; // 'default' shows primary only, 'expanded' shows selected + connected, 'filtered' shows filtered, 'all' shows all
  let selectedNode = null;
  let allNodes = [];
  let allLinks = [];
  let visibleNodes = [];
  let visibleLinks = [];
  
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
      { title: 'Luxury Market Analysis 2024', publisher: 'Financial Times', image: 'assets/foundation-lv-png.png', views: '12,340' },
      { title: 'LVMH Art & Culture Initiatives', publisher: 'Le Monde', image: 'assets/lv-art.avif', views: '8,920' },
      { title: 'LV New York City Guide', publisher: 'Louis Vuitton', image: 'assets/lv-nyc-guide.png', views: '15,670' }
    ],
    'The Modern': [
      { title: 'MoMA Dining Experience', publisher: 'NY Times', image: 'assets/restaurants/the-modern.jpg', views: '5,230' },
      { title: 'Modern Art & Fine Dining', publisher: 'Condé Nast', image: 'assets/museums/moma.jpg', views: '3,890' }
    ],
    'Le Bernardin': [
      { title: 'Eric Ripert\'s Seafood Mastery', publisher: 'Eater', image: 'assets/restaurants/le-bernardin.jpg', views: '7,120' },
      { title: 'Michelin Three Star Excellence', publisher: 'Michelin Guide', image: 'assets/restaurants/le-bernardin.jpg', views: '4,560' }
    ],
    'Cafe Carlyle': [
      { title: 'Iconic NYC Cabaret Scene', publisher: 'Vanity Fair', image: 'assets/restaurants/cafe-carlyle.jpg', views: '6,780' },
      { title: 'The Carlyle Legacy', publisher: 'Town & Country', image: 'assets/restaurants/carlyle-hotel.jpg', views: '4,230' }
    ],
    'MoMA Museum': [
      { title: 'Modern Art Masterpieces', publisher: 'Art News', image: 'assets/museums/moma.jpg', views: '9,450' },
      { title: 'Kusama at MoMA', publisher: 'David Zwirner', image: 'assets/kusama-book.png', views: '11,200' }
    ],
    'The Carlyle': [
      { title: 'Manhattan\'s Most Storied Hotel', publisher: 'Architectural Digest', image: 'assets/restaurants/carlyle-hotel.jpg', views: '5,670' }
    ],
    'The Plaza': [
      { title: 'Plaza Hotel Heritage', publisher: 'Condé Nast Traveler', image: 'assets/restaurants/the-plaza.jpg', views: '8,340' }
    ],
    'The St. Regis': [
      { title: 'St. Regis NYC Experience', publisher: 'Forbes Travel', image: 'assets/restaurants/st-regis.jpg', views: '4,890' }
    ],
    'The Baccarat': [
      { title: 'Crystal & Luxury', publisher: 'Robb Report', image: 'assets/restaurants/baccarat.jpg', views: '3,560' }
    ],
    'The Mark Hotel': [
      { title: 'Upper East Side Elegance', publisher: 'Travel + Leisure', image: 'assets/restaurants/mark-hotel.jpg', views: '4,120' }
    ],
    'default': [
      { title: 'Luxury Lifestyle Guide', publisher: 'Financial Times', image: 'assets/foundation-lv-png.png', views: '2,340' }
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
      <div class="sidebar-article">
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
      </div>
    `).join('');
  }

  // Restaurant graph data (also used for seeding Neo4j). Will be overridden by localStorage if present.
  const defaultNodes = [
    // ============================================
    // LVMH ROOT NODE - Central hub connecting all primary nodes
    // ============================================
    // Group 0 - Root Node (LVMH) - Dark gradient blue, 4x larger
    { id: 'LVMH', group: 0, value: 100, isRoot: true },
    
    // ============================================
    // AREA GROUPING NODES - Nested under LVMH
    // ============================================
    { id: '57th St.', group: 1, value: 90, isArea: true },
    { id: 'Soho', group: 1, value: 90, isArea: true },
    
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
  const defaultLinks = [
    // ============================================
    // LVMH ROOT CONNECTIONS - Connects to area nodes
    // ============================================
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

  const STORAGE_KEY = 'st_keywords_v1';
  function loadStored(){
    if (window.ShopThatData) return window.ShopThatData.getKeywords();
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; }
  }
  function loadStoredConnections(){
    if (window.ShopThatData) return window.ShopThatData.getConnections();
    try { return JSON.parse(localStorage.getItem('st_connections_v1')||'[]'); } catch { return []; }
  }
  
  // Initialize with default data first, then try to load from storage
  let initialNodes = defaultNodes.slice();
  let initialLinks = defaultLinks.slice();
  
  // Try to load from shared data system
  const storedNodes = loadStored();
  const storedConnections = loadStoredConnections();
  
  if (storedNodes.length > 0) {
    // Convert stored format to D3 format if needed
    initialNodes = storedNodes.map(node => ({
      id: node.id || node.name,
      group: node.group || 1,
      value: node.value || 50,
      isArea: node.isArea || false,
      isRoot: node.isRoot || false
    }));
    console.log('Loaded stored nodes:', initialNodes.map(n => ({ id: n.id, group: n.group })));
  }
  
  if (storedConnections.length > 0) {
    initialLinks = storedConnections.slice();
  }
  
  // Ensure we always have some data to display
  if (initialNodes.length === 0) {
    console.warn('No nodes found, using default data');
    initialNodes = defaultNodes.slice();
    initialLinks = defaultLinks.slice();
  } else {
    // If we have stored data but it's all group 1, let's add some variety for demonstration
    const hasVariety = initialNodes.some(node => node.group !== 1);
    if (!hasVariety && initialNodes.length > 4) {
      console.log('Adding group variety to stored nodes');
      // Make some nodes isolated (group 4) for demonstration
      if (initialNodes.length > 6) {
        initialNodes[initialNodes.length - 1].group = 4;
        initialNodes[initialNodes.length - 2].group = 4;
      }
      // Make some nodes secondary (group 3)
      if (initialNodes.length > 4) {
        initialNodes[Math.floor(initialNodes.length / 2)].group = 3;
        initialNodes[Math.floor(initialNodes.length / 2) + 1].group = 3;
      }
      // Make some nodes connected (group 2)
      if (initialNodes.length > 2) {
        initialNodes[1].group = 2;
        initialNodes[2].group = 2;
      }
    }
  }
  
  // Ensure LVMH + area nodes always exist in initial data
  if (!initialNodes.some(n => n.id === 'LVMH')) {
    initialNodes.unshift({ id: 'LVMH', group: 0, value: 100, isRoot: true });
  }
  // Ensure area nodes exist
  [{ id: '57th St.', group: 1, value: 90, isArea: true }, { id: 'Soho', group: 1, value: 90, isArea: true }].forEach(area => {
    let existing = initialNodes.find(n => n.id === area.id);
    if (!existing) {
      initialNodes.push({ ...area });
    } else {
      existing.isArea = true;
    }
    // Ensure LVMH → area link
    if (!initialLinks.some(l => (l.source === 'LVMH' && l.target === area.id) || (l.source === area.id && l.target === 'LVMH'))) {
      initialLinks.push({ source: 'LVMH', target: area.id });
    }
  });
  console.log('LVMH + area nodes ensured');
  
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
      if (currentViewMode === 'default') return;
      
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
    
    if (lvmhNode && currentViewMode === 'default') {
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

  // View toggle: linear list vs. all-bubbles graph
  const viewToggleBtn = document.getElementById('viewToggle');
  const viewBubblesIcon = viewToggleBtn?.querySelector('.view-bubbles-icon');
  const viewListIcon = viewToggleBtn?.querySelector('.view-list-icon');
  let isBubbleView = false;

  // Track bubble view navigation history
  const bubbleHistory = [];

  function showBubbleView(startNode) {
    isBubbleView = true;
    if (viewBubblesIcon) viewBubblesIcon.style.display = 'none';
    if (viewListIcon) viewListIcon.style.display = '';
    viewToggleBtn.title = 'Show list view';

    // Remember current node for sidebar continuity
    const currentNode = startNode || selectedNode;

    // Hide linear view, show SVG
    hideLinearView();

    // Build bubble history from linear state history so back works
    if (!startNode && stateHistory.length > 0) {
      bubbleHistory.length = 0;
      stateHistory.forEach(entry => {
        bubbleHistory.push({
          selectedNodeId: entry.selectedNodeId === 'LVMH' ? null : entry.selectedNodeId,
          viewMode: entry.selectedNodeId === 'LVMH' ? 'default' : 'expanded'
        });
      });
    } else if (!startNode && !currentNode) {
      bubbleHistory.length = 0;
    }

    const lvmhNode = allNodes.find(n => n.id === 'LVMH');
    const nodeToShow = currentNode || lvmhNode;

    clickedNode = null;
    hoveredNode = null;

    if (nodeToShow && nodeToShow.id === 'LVMH') {
      selectedNode = null;
      currentViewMode = 'default';
    } else if (nodeToShow) {
      selectedNode = nodeToShow;
      currentViewMode = 'expanded';
    }

    allNodes.forEach(n => { delete n.x; delete n.y; delete n.vx; delete n.vy; delete n.fx; delete n.fy; });
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity), 300);

    // Keep sidebar showing the current node's info
    if (nodeToShow && nodeToShow.id !== 'LVMH') {
      openDrawer(nodeToShow);
    } else {
      showLVMHDetails();
    }
  }

  // Expand into a node in bubble view (show its connections as bubbles)
  function expandBubbleNode(nodeData) {
    // Push current state to bubble history
    bubbleHistory.push({
      selectedNodeId: selectedNode ? selectedNode.id : null,
      viewMode: currentViewMode
    });

    selectedNode = nodeData;
    currentViewMode = 'expanded';
    clickedNode = null;
    hoveredNode = null;
    isHoverClustering = false;

    allNodes.forEach(n => { delete n.x; delete n.y; delete n.vx; delete n.vy; delete n.fx; delete n.fy; });
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity), 300);

    openDrawer(nodeData);
  }

  // Go back one level in bubble view
  function bubbleBack() {
    if (bubbleHistory.length === 0) return false;
    const prev = bubbleHistory.pop();
    clickedNode = null;
    hoveredNode = null;
    isHoverClustering = false;

    if (prev.selectedNodeId) {
      selectedNode = allNodes.find(n => n.id === prev.selectedNodeId);
      currentViewMode = prev.viewMode;
    } else {
      selectedNode = null;
      currentViewMode = 'default';
    }

    allNodes.forEach(n => { delete n.x; delete n.y; delete n.vx; delete n.vy; delete n.fx; delete n.fy; });
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity), 300);

    if (selectedNode) {
      openDrawer(selectedNode);
    } else {
      showLVMHDetails();
    }
    return true;
  }

  function showListView() {
    isBubbleView = false;
    if (viewBubblesIcon) viewBubblesIcon.style.display = '';
    if (viewListIcon) viewListIcon.style.display = 'none';
    viewToggleBtn.title = 'Show all bubbles';

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

  viewToggleBtn && viewToggleBtn.addEventListener('click', () => {
    if (isBubbleView) {
      showListView();
    } else {
      showBubbleView();
    }
  });

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

  // Real-time synchronization with shared data system
  if (window.ShopThatData) {
    // Listen for keyword changes from other pages
    window.ShopThatData.on('keywords', (keywords) => {
      let newNodes = keywords.map(node => ({
        id: node.id || node.name,
        group: node.group || 1,
        value: node.value || 50,
        isArea: node.isArea || false,
        isRoot: node.isRoot || false
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

  // Refresh data when page becomes visible (handles tab switching)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshFromSharedData();
    }
  });

  // Initial refresh in case data was updated while page was loading
  setTimeout(refreshFromSharedData, 100);

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

    // Send message functionality
    function sendMessage() {
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

      // Scroll to bottom
      aiMessages.scrollTop = aiMessages.scrollHeight;

      // Simulate AI response
      setTimeout(() => {
        const aiResponse = document.createElement('div');
        aiResponse.className = 'ai-message ai';
        aiResponse.textContent = generateAIResponse(message);
        aiMessages.appendChild(aiResponse);
        aiMessages.scrollTop = aiMessages.scrollHeight;
      }, 800);
    }

    // Generate AI response based on query
    function generateAIResponse(query) {
      const lowerQuery = query.toLowerCase();
      
      // Get current keyword data
      const keywords = window.ShopThatData ? window.ShopThatData.getKeywords() : [];
      const connections = window.ShopThatData ? window.ShopThatData.getConnections() : [];

      if (lowerQuery.includes('how many') && lowerQuery.includes('keyword')) {
        return `There are currently ${keywords.length} keywords in the knowledge graph. The graph also has ${connections.length} connections between them.`;
      }
      
      if (lowerQuery.includes('most connected') || lowerQuery.includes('top keyword')) {
        // Count connections per keyword
        const connectionCounts = {};
        connections.forEach(conn => {
          connectionCounts[conn.source] = (connectionCounts[conn.source] || 0) + 1;
          connectionCounts[conn.target] = (connectionCounts[conn.target] || 0) + 1;
        });
        
        const sorted = Object.entries(connectionCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          const top3 = sorted.slice(0, 3).map(([name, count]) => `${name} (${count} connections)`).join(', ');
          return `The most connected keywords are: ${top3}. These keywords serve as hubs in your knowledge graph.`;
        }
        return 'No connection data available yet. Try adding some keyword connections.';
      }

      if (lowerQuery.includes('kusama') || lowerQuery.includes('yayoi')) {
        return 'Yayoi Kusama is a central keyword in the knowledge graph, connecting to many product and artistic concepts. Her collaboration with Louis Vuitton is a key topic, featuring polka dots, monogram patterns, and various product lines.';
      }

      if (lowerQuery.includes('connection') || lowerQuery.includes('link')) {
        return `The knowledge graph currently has ${connections.length} connections. Connections represent relationships between keywords - for example, "Yayoi Kusama" might be connected to "Polka Dots" and "Monogram" patterns.`;
      }

      if (lowerQuery.includes('help') || lowerQuery.includes('what can')) {
        return 'I can help you understand the keyword knowledge graph! Ask me about:\n• How many keywords exist\n• The most connected keywords\n• Connections between concepts\n• Specific keywords like "Kusama" or "Murakami"';
      }

      // Default response
      return `I understand you're asking about "${query}". The knowledge graph contains ${keywords.length} keywords organized into a hierarchical structure. You can click on any keyword node to see its details and connections.`;
    }

    aiSendBtn.addEventListener('click', sendMessage);
    aiInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Initialize dark mode
  initDarkMode();
  
  // Initialize AI Side Panel
  initAISidePanel();
})();


