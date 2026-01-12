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
  const detailsClose = document.getElementById('detailsClose');
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

  const width = () => svg.node().clientWidth;
  const height = () => svg.node().clientHeight;

  // State management for hierarchical display
  let currentViewMode = 'default'; // 'default' shows top-level + isolated, 'expanded' shows all, 'filtered' shows filtered
  let selectedNode = null;
  let allNodes = [];
  let allLinks = [];
  let visibleNodes = [];
  let visibleLinks = [];
  let filterState = {
    topLevel: true,
    connected: true,
    secondary: true,
    isolated: true
  };

  // Restaurant graph data (also used for seeding Neo4j). Will be overridden by localStorage if present.
  const defaultNodes = [
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
      value: node.value || 50
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
  
  // Set up initial graph data using the new system
  allNodes = initialNodes;
  allLinks = initialLinks;
  
  // Initialize with default view
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

  const color = d3.scaleOrdinal()
    .domain([1, 2, 3, 4])
    .range(['#6366F1', '#5B21B6', '#F59E0B', '#10B981']);
  const radius = d3.scaleSqrt().domain([10, 90]).range([16, 90]);

  function computeFontSizeForRadius(r){
    return Math.max(10, Math.min(18, Math.round(r * 0.28)));
  }

  function wrapText(textSel, label, maxWidth){
    textSel.text(null);
    const words = String(label||'').split(/\s+/).filter(Boolean);
    let line = [];
    let lineNumber = 0;
    const lineHeight = 1.1;
    let tspan = textSel.append('tspan').attr('x',0).attr('y',0).attr('dy','0em');
    for(const word of words){
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > maxWidth){
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = textSel.append('tspan').attr('x',0).attr('y',0).attr('dy', `${++lineNumber * lineHeight}em`).text(word);
      }
    }
    textSel.attr('dy', `${-(lineNumber * lineHeight)/2}em`);
  }

  // Function to determine which nodes to show based on current mode
  function getVisibleNodes() {
    if (currentViewMode === 'default') {
      // Only show primary keywords (Group 1) on page load
      return allNodes.filter(node => node.group === 1);
    } else if (currentViewMode === 'expanded' && selectedNode) {
      // Show selected node and all connected nodes (expand to show secondary keywords)
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
      // Show all nodes
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

  // Function to update mode indicator
  function updateModeIndicator() {
    const modeIndicator = document.getElementById('modeIndicator');
    if (modeIndicator) {
      let modeText = 'Mode: Primary Keywords';
      if (currentViewMode === 'expanded' && selectedNode) {
        modeText = `Mode: "${selectedNode.id}" + Connected Keywords`;
      } else if (currentViewMode === 'filtered') {
        modeText = 'Mode: Filtered View';
      } else if (currentViewMode === 'all') {
        modeText = 'Mode: All Keywords';
      }
      modeIndicator.querySelector('span').textContent = modeText;
    }
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
    .force('link', d3.forceLink(graphLinks).id(d => d.id).distance(80).strength(0.15))
    .force('charge', d3.forceManyBody().strength(-150))
    .force('center', centerForce)
    .force('collision', d3.forceCollide().radius(d => radius(d.value)+6))
    .force('bounds', () => {
      // Keep nodes clustered toward center with gentle bounds
      const w = width();
      const h = height();
      const centerX = w / 2;
      const centerY = h / 2;
      const maxDistance = Math.min(w, h) * 0.4; // Allow spreading but keep clustered
      
      graphNodes.forEach(node => {
        const dx = node.x - centerX;
        const dy = node.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > maxDistance) {
          const scale = maxDistance / distance;
          node.x = centerX + dx * scale;
          node.y = centerY + dy * scale;
        }
      });
    });

  function rescaleForDrawer(){
    const openDetails = detailsDrawer.getAttribute('aria-hidden') === 'false';
    const openNeo = neo4jDrawer.getAttribute('aria-hidden') === 'false';
    const scale = (openDetails || openNeo) ? 0.88 : 1;
    const tx = 0;
    gNodes.attr('transform', `translate(${tx},0) scale(${scale})`);
    gLinks.attr('transform', `translate(${tx},0) scale(${scale})`);
    sim.alpha(0.3).restart();
  }

  function ticked(){
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  // Initialize empty selections - these will be populated by setGraphData
  let link = gLinks.selectAll('line');
  let node = gNodes.selectAll('g.node');

  sim.on('tick', ticked);

  function setGraphData(newNodes, newLinks){
    console.log('setGraphData called with:', {
      newNodesCount: (newNodes || []).length,
      newLinksCount: (newLinks || []).length,
      currentMode: currentViewMode
    });
    
    // Store all data
    allNodes = newNodes || [];
    allLinks = (newLinks || []).filter(l => l.source && l.target && l.source !== l.target);
    
    // Get visible nodes and links based on current mode
    visibleNodes = getVisibleNodes();
    visibleLinks = getVisibleLinks(visibleNodes);
    
    console.log('After filtering:', {
      allNodesCount: allNodes.length,
      visibleNodesCount: visibleNodes.length,
      visibleNodes: visibleNodes.map(n => n.id)
    });
    
    // Update the graph with visible data
    graphNodes = visibleNodes;
    graphLinks = visibleLinks;

    link = gLinks.selectAll('line').data(graphLinks);
    link.exit().remove();
    link = link.join('line');
    
    // Apply disabled state styling to links
    link.each(function(l) {
      const linkElement = d3.select(this);
      const sourceNode = graphNodes.find(n => n.id === (typeof l.source === 'object' ? l.source.id : l.source));
      const targetNode = graphNodes.find(n => n.id === (typeof l.target === 'object' ? l.target.id : l.target));
      
      const isLinkDisabled = (sourceNode && isNodeDisabled(sourceNode)) || (targetNode && isNodeDisabled(targetNode));
      
      linkElement
        .attr('opacity', isLinkDisabled ? 0.05 : 0.7)
        .attr('stroke-width', isLinkDisabled ? 1.5 : 2.5);
    });

    node = gNodes.selectAll('g.node').data(graphNodes, d => d.id);
    node.exit().remove();
    node = node.join(enter => {
      console.log('Creating node:', enter.data());
      const g = enter.append('g').attr('class','node').style('cursor','pointer');
      const circle = g.append('circle')
        .attr('r', d => radius(d.value))
        .attr('fill', d => {
          console.log(`Node ${d.id} has group ${d.group}, color: ${color(d.group)}`);
          return color(d.group);
        });
      
      const text = g.append('text')
        .attr('text-anchor','middle')
        .attr('fill','#fff')
        .style('font-weight','700');
      text.each(function(d){
        const r = radius(d.value);
        d3.select(this).style('font-size', `${computeFontSizeForRadius(r)}px`);
        wrapText(d3.select(this), d.id, r * 1.6);
      });
      return g;
    });
    
    // Apply disabled state styling
    node.each(function(d) {
      const nodeElement = d3.select(this);
      const isDisabled = isNodeDisabled(d);
      
      nodeElement.select('circle')
        .attr('opacity', isDisabled ? 0.15 : 0.9)
        .style('filter', isDisabled ? 'grayscale(1) brightness(1.5)' : 'none');
      
      nodeElement.select('text')
        .attr('opacity', isDisabled ? 0.8 : 1)
        .attr('fill', isDisabled ? '#ffffff' : '#ffffff');
        
      nodeElement.style('cursor', isDisabled ? 'default' : 'pointer');
    });
    
    node.on('click', (_, d) => handleNodeClick(d));
    
    console.log('Nodes created in DOM:', node.size());
    console.log('SVG container has nodes:', gNodes.selectAll('g.node').size());

    sim.nodes(graphNodes);
    sim.force('link').links(graphLinks);
    
    // Ensure nodes start in reasonable positions - clustered in center
    const w = width();
    const h = height();
    graphNodes.forEach((node, i) => {
      if (!node.x || !node.y || isNaN(node.x) || isNaN(node.y)) {
        // Arrange in a tight cluster in the center
        const angle = (i / graphNodes.length) * 2 * Math.PI;
        const radius = Math.min(40, graphNodes.length * 3); // Much smaller radius for tight clustering
        node.x = w/2 + Math.cos(angle) * radius;
        node.y = h/2 + Math.sin(angle) * radius;
      }
    });
    
    sim.alpha(0.9).restart();
    
    updateModeIndicator();
  }

  // Updated node click handler
  function handleNodeClick(d) {
    // Don't handle clicks on disabled nodes
    if (isNodeDisabled(d)) {
      return;
    }
    
    if (currentViewMode === 'default' && d.group === 1) {
      // If clicking on a primary keyword in default mode, expand to show connected secondary keywords
      selectedNode = d;
      currentViewMode = 'expanded';
      setGraphData(allNodes, allLinks);
      openDrawer(d); // Also open the side panel
    } else if (currentViewMode === 'expanded' && selectedNode && selectedNode.id === d.id) {
      // If clicking on the same expanded primary node, collapse back to default view
      selectedNode = null;
      currentViewMode = 'default';
      setGraphData(allNodes, allLinks);
      closeDrawer();
    } else if (currentViewMode === 'expanded' && d.group === 1) {
      // If clicking on a different primary keyword while expanded, switch to that keyword
      selectedNode = d;
      setGraphData(allNodes, allLinks);
      openDrawer(d); // Update the side panel to show the new node
    } else if (currentViewMode === 'expanded') {
      // Clicking on a secondary keyword just opens its drawer
      openDrawer(d);
    } else {
      // Otherwise just open the drawer
      openDrawer(d);
    }
  }

  function resize(){
    const canvasEl = container.querySelector('.keywords__canvas');
    const w = canvasEl?.clientWidth || 800; // Fallback width
    const h = Math.max(window.innerHeight * 0.7, 400); // Minimum height
    console.log('Resize called with dimensions:', { w, h });
    svg.attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h);
    centerForce.x(w/2).y(h/2);
    
    // Center nodes initially if they don't have positions
    if (graphNodes.some(node => !node.x || !node.y)) {
      graphNodes.forEach((node, i) => {
        if (!node.x || !node.y) {
          // Arrange in a tight cluster in the center
          const angle = (i / graphNodes.length) * 2 * Math.PI;
          const radius = Math.min(40, graphNodes.length * 3); // Much smaller radius for tight clustering
          node.x = w/2 + Math.cos(angle) * radius;
          node.y = h/2 + Math.sin(angle) * radius;
        }
      });
    }
    
    sim.alpha(0.7).restart();
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
      
      console.log('About to initialize with data:', {
        allNodes: allNodes.length,
        allLinks: allLinks.length,
        sampleNodes: allNodes.slice(0, 2)
      });
      
      // Initialize the graph data properly
      setGraphData(allNodes, allLinks);
      resize();
      
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
    drawerTitle.textContent = d.id;
    drawerBody.innerHTML = ''+
      `<div><strong>Volume:</strong> ${d.value}</div>`+
      `<div><strong>Connections:</strong> ${graphLinks.filter(l=> (l.source.id?l.source.id:l.source)===d.id || (l.target.id?l.target.id:l.target)===d.id).length}</div>`+
      `<div><strong>Description:</strong> Placeholder description about ${d.id} with sample insights.</div>`+
      `<hr /><div><strong>Related Keywords</strong></div>`+
      `${graphLinks.filter(l=> (l.source.id?l.source.id:l.source)===d.id || (l.target.id?l.target.id:l.target)===d.id).map(l=>`<span class="chip" style="margin:4px 6px 0 0">${(l.source.id?l.source.id:l.source)===d.id ? (l.target.id?l.target.id:l.target) : (l.source.id?l.source.id:l.source)}</span>`).join('')}`;
    detailsDrawer.setAttribute('aria-hidden','false');
    container.classList.add('drawer-open');
    rescaleForDrawer();
  }
  function closeDrawer(){
    detailsDrawer.setAttribute('aria-hidden','true');
    container.classList.remove('drawer-open');
    rescaleForDrawer();
  }
  detailsClose && detailsClose.addEventListener('click', closeDrawer);
  neo4jClose && neo4jClose.addEventListener('click', ()=>{ neo4jDrawer.setAttribute('aria-hidden','true'); container.classList.remove('drawer-open'); rescaleForDrawer(); });
  openNeo4jBtn && openNeo4jBtn.addEventListener('click', ()=>{ neo4jDrawer.setAttribute('aria-hidden','false'); container.classList.add('drawer-open'); rescaleForDrawer(); });

  // Filtering
  function applyFilter(term){
    const t = String(term||'').toLowerCase();
    node.style('opacity', d => d.id.toLowerCase().includes(t) ? 1 : 0.3);
    link.style('opacity', l => {
      const s = (l.source.id?l.source.id:l.source).toLowerCase();
      const tg = (l.target.id?l.target.id:l.target).toLowerCase();
      return (s.includes(t) || tg.includes(t)) ? 1 : 0.15;
    });
  }
  filterInput && filterInput.addEventListener('input', (e)=> applyFilter(e.target.value));
  resetBtn && resetBtn.addEventListener('click', ()=>{ 
    filterInput && (filterInput.value=''); 
    applyFilter(''); 
    closeDrawer(); 
    // Reset to default view
    currentViewMode = 'default';
    selectedNode = null;
    
    // Reset node positions to center cluster
    const w = width();
    const h = height();
    graphNodes.forEach((node, i) => {
      const angle = (i / graphNodes.length) * 2 * Math.PI;
      const radius = Math.min(40, graphNodes.length * 3);
      node.x = w/2 + Math.cos(angle) * radius;
      node.y = h/2 + Math.sin(angle) * radius;
      // Clear velocity
      node.vx = 0;
      node.vy = 0;
    });
    
    setGraphData(allNodes, allLinks);
    svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity); 
  });
  
  // Show All button functionality
  const showAllBtn = document.getElementById('showAll');
  showAllBtn && showAllBtn.addEventListener('click', () => {
    currentViewMode = 'all';
    selectedNode = null;
    setGraphData(allNodes, allLinks);
  });

  // Filter by Level button functionality
  const filterByLevelBtn = document.getElementById('filterByLevel');
  const filterModal = document.getElementById('filterModal');
  const filterModalClose = document.getElementById('filterModalClose');
  const applyFilterBtn = document.getElementById('applyFilter');
  const filterSelectAll = document.getElementById('filterSelectAll');
  const filterSelectNone = document.getElementById('filterSelectNone');
  
  filterByLevelBtn && filterByLevelBtn.addEventListener('click', () => {
    filterModal.style.display = 'flex';
  });
  
  filterModalClose && filterModalClose.addEventListener('click', () => {
    filterModal.style.display = 'none';
  });
  
  filterModal && filterModal.addEventListener('click', (e) => {
    if (e.target === filterModal) {
      filterModal.style.display = 'none';
    }
  });
  
  filterSelectAll && filterSelectAll.addEventListener('click', () => {
    document.getElementById('filterTopLevel').checked = true;
    document.getElementById('filterConnected').checked = true;
    document.getElementById('filterSecondary').checked = true;
    document.getElementById('filterIsolated').checked = true;
  });
  
  filterSelectNone && filterSelectNone.addEventListener('click', () => {
    document.getElementById('filterTopLevel').checked = false;
    document.getElementById('filterConnected').checked = false;
    document.getElementById('filterSecondary').checked = false;
    document.getElementById('filterIsolated').checked = false;
  });
  
  applyFilterBtn && applyFilterBtn.addEventListener('click', () => {
    filterState.topLevel = document.getElementById('filterTopLevel').checked;
    filterState.connected = document.getElementById('filterConnected').checked;
    filterState.secondary = document.getElementById('filterSecondary').checked;
    filterState.isolated = document.getElementById('filterIsolated').checked;
    
    currentViewMode = 'filtered';
    selectedNode = null;
    setGraphData(allNodes, allLinks);
    filterModal.style.display = 'none';
  });

  // Zoom controls
  zoomIn && zoomIn.addEventListener('click', ()=> svg.transition().duration(200).call(zoom.scaleBy, 1.2));
  zoomOut && zoomOut.addEventListener('click', ()=> svg.transition().duration(200).call(zoom.scaleBy, 0.8));
  fitBtn && fitBtn.addEventListener('click', ()=> svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity));

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
      graphNodes = keywords.map(node => ({
        id: node.id || node.name,
        group: node.group || 1,
        value: node.value || 50
      }));
      setGraphData(graphNodes, graphLinks);
    });
    
    // Listen for connection changes from other pages
    window.ShopThatData.on('connections', (connections) => {
      graphLinks = connections.slice();
      setGraphData(graphNodes, graphLinks);
    });
  }

  // Function to refresh data from shared storage
  function refreshFromSharedData() {
    if (window.ShopThatData) {
      const keywords = window.ShopThatData.getKeywords();
      const connections = window.ShopThatData.getConnections();
      
      // Convert keywords to D3 format
      graphNodes = keywords.map(node => ({
        id: node.id || node.name,
        group: node.group || 1,
        value: node.value || 50
      }));
      
      graphLinks = connections.slice();
      setGraphData(graphNodes, graphLinks);
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


