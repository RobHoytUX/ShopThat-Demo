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
      leafletMap = L.map('dashboardMap').setView([48.8566, 2.3522], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(leafletMap);
      
      // Add LV store markers
      const stores = [
        { lat: 48.8698, lng: 2.3075, name: 'Louis Vuitton Champs-Élysées', address: '101 Avenue des Champs-Élysées' },
        { lat: 48.8606, lng: 2.3376, name: 'Louis Vuitton Place Vendôme', address: '2 Place Vendôme' },
        { lat: 48.8529, lng: 2.3368, name: 'Louis Vuitton Saint-Germain', address: '170 Boulevard Saint-Germain' }
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
    
    // All products get a location if they don't have one
    products.forEach(product => {
      if (!product.location) {
        product.location = { 
          lat: 48.8566 + (Math.random() - 0.5) * 0.02, 
          lng: 2.3522 + (Math.random() - 0.5) * 0.02 
        };
      }
    });
    
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
        const item = createEl('div', { class: 'dashboard-map-product' });
        const title = createEl('h4', { text: product.title });
        const price = createEl('p', { text: product.price });
        item.appendChild(title);
        item.appendChild(price);
        
        item.addEventListener('click', () => {
          if (leafletMap && product.location) {
            leafletMap.setView([product.location.lat, product.location.lng], 15);
          }
        });
        
        productsEl.appendChild(item);
      });
    }
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
