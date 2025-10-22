// Product Dashboard
(function() {
  'use strict';

  // Helper function to create elements
  function createEl(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v);
      });
    }
    (children || []).forEach(c => el.appendChild(c));
    return el;
  }

  // Helper to format date
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Navigation
  const navItems = document.querySelectorAll('.dashboard-nav-item');
  const views = {
    chat: document.getElementById('chatView'),
    library: document.getElementById('libraryView'),
    media: document.getElementById('mediaView'),
    map: document.getElementById('mapView'),
    favorites: document.getElementById('favoritesView')
  };

  let currentView = 'chat';
  let leafletMap = null;
  let locationMarkers = []; // Store location markers for cleanup
  
  // Location data for explorer
  const locationData = {
    stores: [
      { lat: 40.7614, lng: -73.9776, name: 'Bergdorf Goodman', image: 'assets/kusama1.png' },
      { lat: 40.7580, lng: -73.9855, name: 'Saks Fifth Avenue', image: 'assets/kusama2.png' },
      { lat: 40.7128, lng: -74.0060, name: 'Brookfield Place', image: 'assets/kusama3.png' },
      { lat: 40.7589, lng: -73.9851, name: 'Tiffany & Co.', image: 'assets/kusama4.webp' }
    ],
    museums: [
      { lat: 40.7794, lng: -73.9632, name: 'Metropolitan Museum of Art', image: 'assets/kusama-gal1.png' },
      { lat: 40.7614, lng: -73.9776, name: 'Museum of Modern Art', image: 'assets/kusama-gal2.png' },
      { lat: 40.7738, lng: -73.9540, name: 'Guggenheim Museum', image: 'assets/kusama-gal3.png' },
      { lat: 40.7831, lng: -73.9712, name: 'Whitney Museum', image: 'assets/kusama-gal4.png' }
    ],
    restaurants: [
      { lat: 40.7580, lng: -73.9855, name: 'Le Bernardin', image: 'assets/image1.png' },
      { lat: 40.7614, lng: -73.9776, name: 'Per Se', image: 'assets/image2.png' },
      { lat: 40.7489, lng: -73.9680, name: 'Eleven Madison Park', image: 'assets/image3.png' },
      { lat: 40.7228, lng: -74.0062, name: 'The Modern', image: 'assets/image4.png' }
    ]
  };

  // View switching
  function switchView(viewName) {
    if (!views[viewName]) return;

    currentView = viewName;

    // Update nav items
    navItems.forEach(item => {
      const itemView = item.getAttribute('data-view');
      if (itemView === viewName) {
        item.classList.add('is-active');
      } else {
        item.classList.remove('is-active');
      }
    });

    // Show/hide views
    Object.entries(views).forEach(([name, view]) => {
      if (name === viewName) {
        view.removeAttribute('hidden');
      } else {
        view.setAttribute('hidden', '');
      }
    });

    // Close location explorer when switching away from map view
    if (viewName !== 'map') {
      closeLocationExplorer();
    }
    
    // Initialize view-specific content
    if (viewName === 'chat') renderChatHistory();
    else if (viewName === 'library') renderLibrary();
    else if (viewName === 'media') renderMedia();
    else if (viewName === 'map') renderMap();
    else if (viewName === 'favorites') renderFavorites();
  }

  // Navigation listeners
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewName = item.getAttribute('data-view');
      switchView(viewName);
    });
  });

  // Render Chat History
  function renderChatHistory() {
    const container = document.getElementById('chatContainer');
    container.replaceChildren();

    if (!window.ShopThatData) {
      showEmptyState(container, 'No chat history available', 'Start a conversation on the main page');
      return;
    }

    const sessions = window.ShopThatData.getChatSessions();
    
    if (sessions.length === 0) {
      showEmptyState(container, 'No chat history yet', 'Your conversations will appear here');
      return;
    }

    // Display sessions in reverse chronological order
    sessions.reverse().forEach(session => {
      const sessionEl = createEl('div', { class: 'dashboard-chat-session' });
      
      // Header
      const header = createEl('div', { class: 'dashboard-chat-session-header' });
      const info = createEl('div', { class: 'dashboard-chat-session-info' });
      const title = createEl('h3', { text: `Session ${session.id.slice(0, 8)}` });
      const meta = createEl('div', { 
        class: 'dashboard-chat-session-meta',
        text: `Started ${formatDate(session.startTime)}${session.endTime ? ` • Ended ${formatDate(session.endTime)}` : ' • Active'}`
      });
      
      info.appendChild(title);
      info.appendChild(meta);
      header.appendChild(info);
      sessionEl.appendChild(header);

      // Keywords
      if (session.keywords && session.keywords.length > 0) {
        const keywordsContainer = createEl('div', { class: 'dashboard-chat-keywords' });
        const uniqueKeywords = [...new Set(session.keywords)];
        uniqueKeywords.slice(0, 10).forEach(keyword => {
          const keywordEl = createEl('div', { class: 'dashboard-chat-keyword', text: keyword });
          keywordsContainer.appendChild(keywordEl);
        });
        sessionEl.appendChild(keywordsContainer);
      }

      // Messages
      const messagesContainer = createEl('div', { class: 'dashboard-chat-messages' });
      session.messages.forEach(msg => {
        const msgEl = createEl('div', {
          class: `dashboard-chat-message dashboard-chat-message--${msg.sender}`,
          text: msg.message
        });
        messagesContainer.appendChild(msgEl);
      });
      sessionEl.appendChild(messagesContainer);

      container.appendChild(sessionEl);
    });
  }

  // Render Library (Products)
  function renderLibrary() {
    const grid = document.getElementById('libraryGrid');
    grid.replaceChildren();

    // Get products from localStorage (from chatbot interactions)
    const productsJson = localStorage.getItem('droppedProducts');
    console.log('Raw droppedProducts from localStorage:', productsJson);
    const products = productsJson ? JSON.parse(productsJson) : [];
    console.log('Parsed products:', products);
    
    updateBadge('libraryCount', products.length);

    if (products.length === 0) {
      showEmptyState(grid, 'No products in your library', 'Drop images from the chat to add products');
      return;
    }

    products.forEach(product => {
      console.log('Creating card for product:', product);
      const card = createProductCard(product, true);
      grid.appendChild(card);
    });
  }

  // Render Media Gallery
  function renderMedia() {
    const grid = document.getElementById('mediaGrid');
    grid.replaceChildren();

    // Get media from localStorage (gallery images)
    const mediaJson = localStorage.getItem('galleryImages');
    console.log('Raw galleryImages from localStorage:', mediaJson);
    const media = mediaJson ? JSON.parse(mediaJson) : [];
    console.log('Parsed media:', media);
    
    updateBadge('mediaCount', media.length);

    if (media.length === 0) {
      showEmptyState(grid, 'No media items yet', 'Add images to your media gallery from the main page');
      return;
    }

    media.forEach(item => {
      console.log('Creating media card for:', item);
      const mediaCard = createEl('div', { class: 'dashboard-media-item' });
      const img = createEl('img', {
        class: 'dashboard-media-image',
        src: item.src,
        alt: item.productData?.title || 'Media item'
      });
      
      const overlay = createEl('div', { class: 'dashboard-media-overlay' });
      const title = createEl('h4', {
        class: 'dashboard-media-title',
        text: item.productData?.title || 'Untitled'
      });
      overlay.appendChild(title);
      
      mediaCard.appendChild(img);
      mediaCard.appendChild(overlay);
      
      // Click to view larger
      mediaCard.addEventListener('click', () => {
        window.open(item.src, '_blank');
      });
      
      grid.appendChild(mediaCard);
    });
  }

  // Render Map View
  function renderMap() {
    const mapEl = document.getElementById('dashboardMap');
    const productsEl = document.getElementById('mapProducts');
    
    console.log('Rendering map view...');
    
    // Initialize map if not already done
    if (!leafletMap && typeof L !== 'undefined') {
      // Center map between both stores, zoomed out to show both
      leafletMap = L.map('dashboardMap').setView([40.7438, -73.9853], 12);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(leafletMap);
      
      // Add LV NYC store markers
      const stores = [
        { lat: 40.7632, lng: -73.9732, name: 'Louis Vuitton 57th Street', address: '6 E 57th St, New York, NY 10022' },
        { lat: 40.7245, lng: -73.9975, name: 'Louis Vuitton SoHo', address: '116 Greene St, New York, NY 10012' }
      ];
      
      const lvIcon = L.divIcon({
        className: 'custom-lv-marker',
        html: `
          <div style="
            width: 40px;
            height: 40px;
            background: #000;
            border-radius: 50%;
            display: grid;
            place-items: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid #fff;
          ">
            <img src="assets/louis-vuitton.svg" 
                 style="width: 20px; height: 20px; filter: brightness(0) invert(1);" 
                 alt="LV" />
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
      });
      
      stores.forEach(store => {
        L.marker([store.lat, store.lng], { icon: lvIcon })
          .bindPopup(`<b>${store.name}</b><br>${store.address}`)
          .addTo(leafletMap);
      });
      
      setTimeout(() => {
        if (leafletMap) leafletMap.invalidateSize();
      }, 100);
    }

    // Render products with locations
    productsEl.replaceChildren();
    const productsJson = localStorage.getItem('droppedProducts');
    console.log('Map view - Raw products from localStorage:', productsJson);
    const products = productsJson ? JSON.parse(productsJson) : [];
    console.log('Map view - Parsed products:', products);
    
    // NYC LV store locations for product assignment
    const storeLocations = [
      { lat: 40.7632, lng: -73.9732, name: 'Louis Vuitton 57th Street', address: '6 E 57th St, New York, NY 10022' },
      { lat: 40.7245, lng: -73.9975, name: 'Louis Vuitton SoHo', address: '116 Greene St, New York, NY 10012' }
    ];
    
    // Assign products to alternate between the two store locations
    products.forEach((product, index) => {
      const storeIndex = index % 2;
      product.location = {
        lat: storeLocations[storeIndex].lat,
        lng: storeLocations[storeIndex].lng
      };
    });
    
    // Save updated locations back to localStorage
    localStorage.setItem('droppedProducts', JSON.stringify(products));
    
    const productsWithLocation = products.filter(p => p.location);
    console.log('Products with locations:', productsWithLocation);

    if (productsWithLocation.length === 0) {
      const emptyMsg = createEl('p', {
        style: 'text-align: center; color: #666; padding: 20px;',
        text: 'No products with locations yet'
      });
      productsEl.appendChild(emptyMsg);
    } else {
      productsWithLocation.forEach(product => {
        const card = createEl('div', { class: 'dashboard-map-product' });
        
        // Product image
        const img = createEl('img', { 
          class: 'dashboard-map-product-image',
          src: product.image,
          alt: product.title
        });
        
        // Product info container
        const info = createEl('div', { class: 'dashboard-map-product-info' });
        const title = createEl('h3', { class: 'dashboard-map-product-title', text: product.title });
        const model = createEl('p', { class: 'dashboard-map-product-model', text: product.model });
        const price = createEl('p', { class: 'dashboard-map-product-price', text: product.price });
        
        // View on LV Store link
        const link = createEl('a', { 
          class: 'dashboard-map-product-link',
          href: `https://us.louisvuitton.com/eng-us/search/${encodeURIComponent(product.model)}`,
          target: '_blank',
          rel: 'noopener noreferrer',
          text: 'View on LV Store '
        });
        
        // Add external link icon
        const linkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        linkIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        linkIcon.setAttribute('viewBox', '0 0 24 24');
        linkIcon.setAttribute('fill', 'none');
        linkIcon.setAttribute('stroke', 'currentColor');
        linkIcon.setAttribute('stroke-width', '2');
        linkIcon.setAttribute('width', '16');
        linkIcon.setAttribute('height', '16');
        const linkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        linkPath.setAttribute('d', 'M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25');
        linkPath.setAttribute('stroke-linecap', 'round');
        linkPath.setAttribute('stroke-linejoin', 'round');
        linkIcon.appendChild(linkPath);
        link.appendChild(linkIcon);
        
        info.appendChild(title);
        info.appendChild(model);
        info.appendChild(price);
        info.appendChild(link);
        
        card.appendChild(img);
        card.appendChild(info);
        
        card.addEventListener('click', (e) => {
          // Don't zoom or open explorer if clicking the link
          if (e.target.tagName === 'A' || e.target.closest('a')) return;
          
          // Zoom to product's assigned store location
          if (leafletMap && product.location) {
            leafletMap.setView([product.location.lat, product.location.lng], 15);
          }
          
          // Open location explorer
          openLocationExplorer();
        });
        
        productsEl.appendChild(card);
      });
    }
  }
  
  // Location Explorer Functions
  function openLocationExplorer() {
    const explorer = document.getElementById('locationExplorer');
    explorer.removeAttribute('hidden');
    
    // Load default category (stores)
    loadLocationCategory('stores');
  }
  
  function closeLocationExplorer() {
    const explorer = document.getElementById('locationExplorer');
    explorer.setAttribute('hidden', '');
    
    // Clear location markers
    clearLocationMarkers();
  }
  
  function clearLocationMarkers() {
    locationMarkers.forEach(marker => {
      if (leafletMap) {
        leafletMap.removeLayer(marker);
      }
    });
    locationMarkers = [];
  }
  
  function loadLocationCategory(category) {
    const content = document.getElementById('locationContent');
    content.replaceChildren();
    
    // Clear previous location markers
    clearLocationMarkers();
    
    const locations = locationData[category] || [];
    
    if (!leafletMap) return;
    
    // Add markers and images
    locations.forEach(location => {
      // Add standard marker to map (different from LV product markers)
      const marker = L.marker([location.lat, location.lng])
        .bindPopup(`<b>${location.name}</b>`)
        .addTo(leafletMap);
      locationMarkers.push(marker);
      
      // Add image to content
      const item = createEl('div', { class: 'location-item' });
      const img = createEl('img', { 
        class: 'location-image',
        src: location.image,
        alt: location.name
      });
      const name = createEl('p', { class: 'location-name', text: location.name });
      
      item.appendChild(img);
      item.appendChild(name);
      content.appendChild(item);
      
      // Click to zoom to location
      item.addEventListener('click', () => {
        leafletMap.setView([location.lat, location.lng], 15);
        marker.openPopup();
      });
    });
  }

  // Render Favorites
  function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    grid.replaceChildren();

    const favorites = JSON.parse(localStorage.getItem('wishlistProducts') || '[]');
    
    updateBadge('favoritesCount', favorites.length);

    if (favorites.length === 0) {
      showEmptyState(grid, 'No favorites yet', 'Add products to your wishlist from the library');
      return;
    }

    favorites.forEach(product => {
      const card = createProductCard(product, false);
      grid.appendChild(card);
    });
  }

  // Create product card
  function createProductCard(product, showAddToWishlist) {
    const card = createEl('div', { class: 'dashboard-product-card' });
    
    // Image
    const img = createEl('img', {
      class: 'dashboard-product-image',
      src: product.image,
      alt: product.title
    });
    
    // Favorite button
    const wishlist = JSON.parse(localStorage.getItem('wishlistProducts') || '[]');
    const isFavorite = wishlist.some(p => p.id === product.id);
    
    const favoriteBtn = createEl('button', {
      class: isFavorite ? 'dashboard-product-favorite is-active' : 'dashboard-product-favorite',
      'aria-label': 'Toggle favorite'
    });
    
    const heartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    heartSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    heartSvg.setAttribute('viewBox', '0 0 24 24');
    heartSvg.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
    heartSvg.setAttribute('stroke', 'currentColor');
    heartSvg.setAttribute('stroke-width', '2');
    const heartPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    heartPath.setAttribute('d', 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z');
    heartSvg.appendChild(heartPath);
    favoriteBtn.appendChild(heartSvg);
    
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWishlist(product, favoriteBtn, heartSvg);
    });
    
    // Info
    const info = createEl('div', { class: 'dashboard-product-info' });
    const title = createEl('h3', { class: 'dashboard-product-title', text: product.title });
    const model = createEl('p', { class: 'dashboard-product-model', text: product.model });
    const price = createEl('p', { class: 'dashboard-product-price', text: product.price });
    
    info.appendChild(title);
    info.appendChild(model);
    info.appendChild(price);
    
    // Actions
    const actions = createEl('div', { class: 'dashboard-product-actions' });
    const viewBtn = createEl('button', {
      class: 'dashboard-product-btn dashboard-product-btn--primary',
      text: 'View on LV'
    });
    
    viewBtn.addEventListener('click', () => {
      window.open(`https://us.louisvuitton.com/eng-us/search/${encodeURIComponent(product.model)}`, '_blank');
    });
    
    actions.appendChild(viewBtn);
    info.appendChild(actions);
    
    card.appendChild(img);
    card.appendChild(favoriteBtn);
    card.appendChild(info);
    
    return card;
  }

  // Toggle wishlist
  function toggleWishlist(product, button, svg) {
    let wishlist = JSON.parse(localStorage.getItem('wishlistProducts') || '[]');
    const index = wishlist.findIndex(p => p.id === product.id);
    
    if (index > -1) {
      wishlist.splice(index, 1);
      button.classList.remove('is-active');
      svg.setAttribute('fill', 'none');
    } else {
      wishlist.push(product);
      button.classList.add('is-active');
      svg.setAttribute('fill', 'currentColor');
    }
    
    localStorage.setItem('wishlistProducts', JSON.stringify(wishlist));
    updateBadge('favoritesCount', wishlist.length);
    
    // Refresh favorites view if we're in it
    if (currentView === 'favorites') {
      renderFavorites();
    }
  }

  // Update badge count
  function updateBadge(badgeId, count) {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    
    if (count > 0) {
      badge.textContent = String(count);
      badge.style.display = 'inline-grid';
    } else {
      badge.style.display = 'none';
    }
  }

  // Show empty state
  function showEmptyState(container, title, subtitle) {
    const emptyState = createEl('div', { class: 'dashboard-empty-state' });
    
    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor');
    iconSvg.setAttribute('stroke-width', '1.5');
    const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    iconPath.setAttribute('d', 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z');
    iconPath.setAttribute('stroke-linecap', 'round');
    iconPath.setAttribute('stroke-linejoin', 'round');
    iconSvg.appendChild(iconPath);
    
    const titleEl = createEl('h3', { text: title });
    const subtitleEl = createEl('p', { text: subtitle });
    
    emptyState.appendChild(iconSvg);
    emptyState.appendChild(titleEl);
    emptyState.appendChild(subtitleEl);
    
    container.appendChild(emptyState);
  }

  // Export data
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = {
        exportDate: new Date().toISOString(),
        chatSessions: window.ShopThatData ? window.ShopThatData.getChatSessions() : [],
        products: JSON.parse(localStorage.getItem('droppedProducts') || '[]'),
        media: JSON.parse(localStorage.getItem('galleryImages') || '[]'),
        favorites: JSON.parse(localStorage.getItem('wishlistProducts') || '[]')
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lv-dashboard-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Clear all data
  const clearBtn = document.getElementById('clearAllBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        localStorage.removeItem('droppedProducts');
        localStorage.removeItem('galleryImages');
        localStorage.removeItem('wishlistProducts');
        
        if (window.ShopThatData) {
          // Clear chat sessions
          const sessions = window.ShopThatData.getChatSessions();
          sessions.forEach(session => {
            if (session.id) {
              window.ShopThatData.endChatSession(session.id);
            }
          });
        }
        
        // Refresh current view
        switchView(currentView);
        
        alert('All data has been cleared.');
      }
    });
  }

  // Location Explorer Event Listeners
  const closeExplorerBtn = document.getElementById('closeLocationExplorer');
  if (closeExplorerBtn) {
    closeExplorerBtn.addEventListener('click', closeLocationExplorer);
  }
  
  const locationTabs = document.querySelectorAll('.location-tab');
  locationTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.getAttribute('data-category');
      
      // Update active tab
      locationTabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      
      // Load category
      loadLocationCategory(category);
    });
  });

  // Initialize
  renderChatHistory();

  // Listen for storage changes from other tabs/windows
  window.addEventListener('storage', (e) => {
    if (e.key === 'droppedProducts' || e.key === 'galleryImages' || e.key === 'wishlistProducts') {
      // Refresh current view when data changes
      switchView(currentView);
    }
  });

  // Debug and update badge counts on load
  console.log('=== Product Dashboard Initialization ===');
  console.log('LocalStorage keys:', Object.keys(localStorage));
  console.log('droppedProducts:', localStorage.getItem('droppedProducts'));
  console.log('galleryImages:', localStorage.getItem('galleryImages'));
  console.log('wishlistProducts:', localStorage.getItem('wishlistProducts'));
  
  const products = JSON.parse(localStorage.getItem('droppedProducts') || '[]');
  const media = JSON.parse(localStorage.getItem('galleryImages') || '[]');
  const favorites = JSON.parse(localStorage.getItem('wishlistProducts') || '[]');
  
  console.log('Loaded products count:', products.length);
  console.log('Loaded media count:', media.length);
  console.log('Loaded favorites count:', favorites.length);
  
  updateBadge('libraryCount', products.length);
  updateBadge('mediaCount', media.length);
  updateBadge('favoritesCount', favorites.length);
})();
