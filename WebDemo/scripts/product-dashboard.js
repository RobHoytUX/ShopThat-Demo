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
  
  // Location data for explorer - Real locations near LV stores
  const locationData = {
    restaurants: [
      // Fine Dining & Luxury Restaurants
      { lat: 40.7614, lng: -73.9776, name: 'The Modern', address: '9 W 53rd St (at MoMA)', image: 'assets/restaurants/the-modern.jpg', keywords: ['The Modern', 'Restaurant', 'MoMA Museum', 'Sculpture Garden', 'lobster', 'truffles', 'cocktails', 'lunch', 'dinner', 'New York', '57th Street'] },
      { lat: 40.7619, lng: -73.9816, name: 'Le Bernardin', address: '155 W 51st St', image: 'assets/restaurants/le-bernardin.jpg', keywords: ['Le Bernardin', 'Elite French', 'Restaurant', 'Chef Eric Ripert', 'Michelin Star', 'seafood', 'wine', 'sommelier', 'expert service', 'luxurious decor', 'New York', '57th Street'] },
      { lat: 40.7741, lng: -73.9626, name: 'Cafe Carlyle', address: '35 E 76th St (The Carlyle)', image: 'assets/restaurants/cafe-carlyle.jpg', keywords: ['Cafe Carlyle', 'classic cabaret', 'concerts', 'iconic', 'cocktails', 'dress code', 'celebrities', 'evenings', '57th Street', 'New York'] },
      { lat: 40.7670, lng: -73.9800, name: 'Marea', address: '240 Central Park South', image: 'assets/restaurants/marea.jpg', keywords: ['Marea', 'High-end Italian seafood', 'housemade pastas', 'Central Park South', 'New York', '57th Street'] },
      { lat: 40.7754, lng: -73.9625, name: 'The Mark Restaurant by Jean-Georges', address: '25 E 77th St', image: 'assets/restaurants/the-mark-restaurant.jpg', keywords: ['Jean-Georges Vongerichten', 'Restaurant', 'Fresh from the market', 'The Mark Hotel', 'world class', 'innovative seasonings', 'hand crafted bar', 'comfortable dining room', '57th Street', 'New York'] },
      { lat: 40.7643, lng: -73.9683, name: 'Le Bilboquet', address: '20 E 60th St', image: 'assets/restaurants/le-bilboquet.jpg', keywords: ['Le Bilboquet', 'Upper East Side', 'French-inspired', 'global bistro', 'people watching', 'iconic', 'lunch', 'brunch', 'dinner', '57th Street', 'New York'] },
      // Luxury Hotels with Dining
      { lat: 40.7741, lng: -73.9626, name: 'The Carlyle Hotel', address: '35 E 76th St', image: 'assets/restaurants/carlyle-hotel.jpg', keywords: ['The Carlyle', 'most famous hotel', 'Upper East Side', 'old-world Manhattan sophistication', 'JFK\'s New York White House', 'Hotel', 'iconic', 'cabaret', '57th Street', 'New York'] },
      { lat: 40.7754, lng: -73.9625, name: 'The Mark Hotel', address: '25 E 77th St', image: 'assets/restaurants/mark-hotel.jpg', keywords: ['The Mark Hotel', 'Luxury', 'Hotel', 'Central Park', 'Metropolitan Museum of Art', 'Polished', 'art deco-inspired', 'fitness center', 'salon', 'swanky bar', 'restaurant', '57th Street', 'New York'] },
      { lat: 40.7644, lng: -73.9747, name: 'The Plaza', address: '768 5th Ave', image: 'assets/restaurants/the-plaza.jpg', keywords: ['The Plaza', 'Luxury', 'Hotel', 'Landmark 19th-century building', 'Central Park', 'Afternoon tea', 'spa', 'gym', '57th Street', 'New York'] },
      { lat: 40.7611, lng: -73.9738, name: 'The St. Regis', address: '2 E 55th St', image: 'assets/restaurants/st-regis.jpg', keywords: ['The St Regis', 'luxury', 'hotel', 'Midtown Manhattan', 'MoMA', 'Central Park', 'gym', 'steam room', 'iconic bar', '57th Street', 'New York'] },
      { lat: 40.7617, lng: -73.9789, name: 'The Baccarat Hotel', address: '28 W 53rd St', image: 'assets/restaurants/baccarat.jpg', keywords: ['The Baccarat', 'luxury', 'hotel', 'Museum of Modern Art', 'Central Park', 'Empire State Building', 'French cuisine', 'elegant bar', 'Afternoon tea', 'spa', 'gym', 'indoor pool'] }
    ],
    museums: [
      { lat: 40.7794, lng: -73.9632, name: 'The Metropolitan Museum', address: '1000 5th Ave', image: 'assets/museums/met-museum.jpg', keywords: ['The Met', 'Metropolitan Museum of Art', 'Museum', 'art', 'ancient art', 'European paintings', 'American art', 'Egyptian art', 'Central Park', 'Fifth Avenue', '57th Street', 'New York'] },
      { lat: 40.7614, lng: -73.9776, name: 'The Museum of Modern Art', address: '11 W 53rd St', image: 'assets/museums/moma.jpg', keywords: ['MoMA', 'Museum of Modern Art', 'Museum', 'modern art', 'contemporary art', 'Van Gogh', 'Picasso', 'Warhol', 'sculpture garden', 'Midtown', '57th Street', 'New York'] },
      { lat: 40.7829, lng: -73.9589, name: 'The Guggenheim', address: '1071 5th Ave', image: 'assets/museums/guggenheim.jpg', keywords: ['The Guggenheim', 'Solomon R. Guggenheim Museum', 'Museum', 'Frank Lloyd Wright', 'spiral architecture', 'modern art', 'contemporary art', 'Kandinsky', 'Upper East Side', '57th Street', 'New York'] },
      { lat: 40.7711, lng: -73.9673, name: 'The Frick Collection', address: '1 E 70th St', image: 'assets/museums/frick.jpg', keywords: ['The Frick', 'Frick Collection', 'Museum', 'European art', 'Old Masters', 'Vermeer', 'Rembrandt', 'mansion', 'gilded age', 'Upper East Side', '57th Street', 'New York'] }
    ],
    galleries: [
      // Near Louis Vuitton 57th Street
      { lat: 40.7571, lng: -73.9714, name: 'Pace Gallery', address: '540 W 25th St', image: 'assets/kusama-gal1.png' },
      { lat: 40.7605, lng: -73.9700, name: 'David Zwirner', address: '533 W 19th St', image: 'assets/kusama-gal2.png' },
      { lat: 40.7481, lng: -73.9940, name: 'Gagosian Gallery', address: '555 W 24th St', image: 'assets/kusama-gal3.png' },
      { lat: 40.7509, lng: -73.9975, name: 'Hauser & Wirth', address: '548 W 22nd St', image: 'assets/kusama-gal4.png' },
      // Near Louis Vuitton SoHo
      { lat: 40.7214, lng: -74.0018, name: 'Drawing Center', address: '35 Wooster St', image: 'assets/kusama-gal2.png' },
      { lat: 40.7235, lng: -73.9992, name: 'Team Gallery', address: '83 Grand St', image: 'assets/kusama-gal1.png' },
      { lat: 40.7228, lng: -74.0005, name: 'Peter Freeman Gallery', address: '140 Grand St', image: 'assets/kusama-gal3.png' }
    ],
    others: [
      // Luxury Shopping
      { lat: 40.7638, lng: -73.9744, name: 'Bergdorf Goodman', address: '754 5th Ave', image: 'assets/kusama1.png' },
      { lat: 40.7577, lng: -73.9788, name: 'Saks Fifth Avenue', address: '611 5th Ave', image: 'assets/kusama2.png' },
      { lat: 40.7625, lng: -73.9735, name: 'Tiffany & Co.', address: 'Fifth Avenue & 57th St', image: 'assets/kusama4.webp' },
      { lat: 40.7590, lng: -73.9775, name: 'Cartier', address: '653 5th Ave', image: 'assets/kusama3.png' },
      // Hotels & Landmarks
      { lat: 40.7644, lng: -73.9747, name: 'The Plaza Hotel', address: '768 5th Ave', image: 'assets/kusama1.png' },
      { lat: 40.7587, lng: -73.9787, name: 'Rockefeller Center', address: '45 Rockefeller Plaza', image: 'assets/kusama2.png' },
      // Near SoHo
      { lat: 40.7244, lng: -73.9976, name: 'Aesop', address: '113 Greene St', image: 'assets/kusama3.png' },
      { lat: 40.7241, lng: -74.0003, name: 'The Mercer Hotel', address: '147 Mercer St', image: 'assets/kusama4.webp' }
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
    else if (viewName === 'media') {
      renderMedia();
      setupFilterBadges();
      setupMyMediaDrawer();
      setupAIChat();
    }
    else if (viewName === 'map') {
      renderMap();
      setupMapAIChat();
    }
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

  // Setup filter badges
  function setupFilterBadges() {
    const badges = document.querySelectorAll('.media-filter-badge');
    badges.forEach(badge => {
      badge.addEventListener('click', () => {
        // Update active state
        badges.forEach(b => b.classList.remove('active'));
        badge.classList.add('active');
        
        // Get filter type and re-render with filter
        const filter = badge.getAttribute('data-filter');
        console.log('Filter selected:', filter);
        // You can add filter logic here to show different image sets
        renderMedia(filter);
      });
    });
  }

  // Setup AI Chat Prompt
  function setupAIChat() {
    const chatPrompt = document.querySelector('.ai-chat-prompt');
    if (!chatPrompt) {
      console.error('AI chat prompt not found');
      return;
    }
    
    const chatInput = document.getElementById('aiChatInput');
    const chatSend = document.getElementById('aiChatSend');
    const chatMessages = document.getElementById('aiChatMessages');
    const chatActions = document.querySelector('.ai-chat-actions');
    const newChatBtn = document.getElementById('newChatBtn');
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    
    // Sample AI responses
    const sampleResponses = [
      "The Kusama x Louis Vuitton collaboration features her iconic polka dot patterns across luxury handbags and accessories.",
      "This campaign showcases Yayoi Kusama's vibrant, psychedelic art merged with Louis Vuitton's timeless elegance.",
      "The collection includes limited edition pieces featuring Kusama's signature infinity dots and bold color palettes.",
      "These images represent one of the most successful artist collaborations in luxury fashion history.",
      "The campaign blends contemporary art with haute couture, creating collectible pieces that transcend traditional fashion."
    ];
    
    // Chat minimize/maximize functionality
    const minimizeBtn = document.getElementById('aiChatMinimize');
    const chatToggle = document.getElementById('aiChatToggle');
    
    // Check localStorage for saved state (default to minimized)
    const savedState = localStorage.getItem('exploreChatOpen');
    const isOpen = savedState === 'true';
    
    // Apply initial state
    if (isOpen) {
      chatPrompt.classList.remove('minimized');
      chatToggle.classList.remove('visible');
    } else {
      chatPrompt.classList.add('minimized');
      chatToggle.classList.add('visible');
    }
    
    // Fade in chat prompt
    setTimeout(() => {
      if (chatPrompt) {
        chatPrompt.classList.add('loaded');
      }
    }, 400);
    
    if (minimizeBtn && chatToggle) {
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chatPrompt.classList.add('minimized');
        chatToggle.classList.add('visible');
        localStorage.setItem('exploreChatOpen', 'false');
      });
      
      chatToggle.addEventListener('click', () => {
        chatPrompt.classList.remove('minimized');
        chatToggle.classList.remove('visible');
        localStorage.setItem('exploreChatOpen', 'true');
      });
    }
    
    // Update button states
    function updateButtonStates() {
      const hasMessages = chatMessages.children.length > 0;
      if (newChatBtn) {
        newChatBtn.disabled = !hasMessages;
      }
    }
    
    // Add message to chat
    function addMessage(text, isUser = true) {
      const messageEl = createEl('div', {
        class: `ai-chat-message ${isUser ? 'user' : 'ai'}`,
        text: text
      });
      chatMessages.appendChild(messageEl);
      
      // Update button states
      updateButtonStates();
      
      // Scroll to bottom
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // New Chat button
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        if (!newChatBtn.disabled) {
          chatMessages.replaceChildren();
          updateButtonStates();
          console.log('New chat started');
        }
      });
    }
    
    // Initialize button states
    updateButtonStates();
    
    // View History button
    if (viewHistoryBtn) {
      viewHistoryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('History button clicked');
        toggleHistoryView();
      });
    } else {
      console.error('viewHistoryBtn not found');
    }
    
    // Close history button
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    if (closeHistoryBtn) {
      closeHistoryBtn.addEventListener('click', () => {
        toggleHistoryView();
      });
    }
    
    // Toggle history view
    function toggleHistoryView() {
      if (!chatPrompt) {
        console.error('chatPrompt is null in toggleHistoryView');
        return;
      }
      
      const isExpanded = chatPrompt.classList.contains('expanded');
      console.log('Toggling history view. Current state:', isExpanded);
      
      if (isExpanded) {
        chatPrompt.classList.remove('expanded');
      } else {
        chatPrompt.classList.add('expanded');
        populateHistory();
      }
    }
    
    // Populate chat history with sample data
    function populateHistory() {
      const historyList = document.getElementById('chatHistoryList');
      if (!historyList) return;
      
      historyList.replaceChildren();
      
      const sampleHistory = [
        { title: 'Campaign Overview', preview: 'Tell me about this campaign...', date: 'Today' },
        { title: 'Product Details', preview: 'What products are featured?', date: 'Yesterday' },
        { title: 'Artist Collaboration', preview: 'Who is Yayoi Kusama?', date: '2 days ago' },
        { title: 'Collection Launch', preview: 'When was this released?', date: '1 week ago' }
      ];
      
      sampleHistory.forEach(chat => {
        const item = createEl('div', { class: 'ai-chat-history-item' });
        const title = createEl('p', { 
          class: 'ai-chat-history-item-title', 
          text: chat.title 
        });
        const preview = createEl('p', { 
          class: 'ai-chat-history-item-preview', 
          text: chat.preview 
        });
        
        item.appendChild(title);
        item.appendChild(preview);
        
        item.addEventListener('click', () => {
          console.log('Loading chat:', chat.title);
          // TODO: Load selected chat
          toggleHistoryView();
        });
        
        historyList.appendChild(item);
      });
    }
    
    // Handle send
    function sendMessage() {
      const message = chatInput.value.trim();
      if (message) {
        // Add user message
        addMessage(message, true);
        
        // Clear input
        chatInput.value = '';
        
        // Visual feedback
        chatSend.style.transform = 'scale(0.9)';
        setTimeout(() => {
          chatSend.style.transform = '';
        }, 200);
        
        // Show typing indicator and AI response after delay
        setTimeout(() => {
          const randomResponse = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
          addMessage(randomResponse, false);
        }, 800);
      }
    }
    
    // Send on button click
    if (chatSend) {
      chatSend.addEventListener('click', sendMessage);
    }
    
    // Send on Enter key
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    }
    
    // === DRAG AND DROP IMAGE TO CHAT ===
    let droppedImageSrc = null;
    
    // Create drop indicator element
    const dropIndicator = createEl('div', { class: 'ai-chat-drop-indicator' });
    dropIndicator.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Drop image to analyze</span>
    `;
    chatPrompt.appendChild(dropIndicator);
    
    // Drag over handler
    chatPrompt.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      chatPrompt.classList.add('drag-over');
    });
    
    // Drag leave handler
    chatPrompt.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!chatPrompt.contains(e.relatedTarget)) {
        chatPrompt.classList.remove('drag-over');
      }
    });
    
    // Drop handler
    chatPrompt.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      chatPrompt.classList.remove('drag-over');
      
      // Get the dropped image source
      const imageSrc = e.dataTransfer.getData('image/src');
      if (imageSrc) {
        handleDroppedImage(imageSrc);
      }
    });
    
    // Handle dropped image - analyze and add to favorites
    function handleDroppedImage(imageSrc) {
      droppedImageSrc = imageSrc;
      
      // Get the chat messages container
      const messagesContainer = document.getElementById('aiChatMessages');
      if (!messagesContainer) return;
      
      // Create image message (user message with image)
      const imageMessage = createEl('div', { class: 'ai-chat-message user-message image-message' });
      const previewEl = createEl('div', { class: 'ai-chat-image-preview' });
      const previewImg = createEl('img', { src: imageSrc, alt: 'Dropped image' });
      const previewInfo = createEl('div', { class: 'ai-chat-image-preview-info' });
      const previewTitle = createEl('p', { class: 'ai-chat-image-preview-title', text: 'Image uploaded' });
      const previewStatus = createEl('p', { class: 'ai-chat-image-preview-status', text: 'Analyzing...' });
      
      previewInfo.appendChild(previewTitle);
      previewInfo.appendChild(previewStatus);
      previewEl.appendChild(previewImg);
      previewEl.appendChild(previewInfo);
      imageMessage.appendChild(previewEl);
      
      // Add to chat messages
      messagesContainer.appendChild(imageMessage);
      
      // Scroll to bottom to show new message
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Simulate AI analysis
      setTimeout(() => {
        previewStatus.textContent = 'Analysis complete';
        
        // Get image filename for description
        const filename = imageSrc.split('/').pop().replace(/\.(jpg|png|jpeg|gif)$/i, '');
        
        // Add AI response about the image
        const analysisResponses = [
          `This image from the Kusama x Louis Vuitton campaign showcases the iconic polka dot pattern. The piece features Yayoi Kusama's distinctive infinity dots merged with Louis Vuitton's luxury craftsmanship.`,
          `I've identified this as part of the exclusive Kusama collaboration. The image displays the artist's signature repetitive patterns that symbolize infinity and the cosmic universe.`,
          `This campaign visual represents the fusion of contemporary art and haute couture. The vibrant colors and dot motifs are trademark elements of Kusama's artistic vision.`,
          `The image captures the essence of the Kusama x LV partnership - a celebration of bold patterns and luxury fashion. Products associated include the Neverfull, Speedy, and various accessories.`
        ];
        
        const randomAnalysis = analysisResponses[Math.floor(Math.random() * analysisResponses.length)];
        addMessage(randomAnalysis, false);
        
        // Auto-add to favorites
        addToFavorites(imageSrc, 'tab1');
        
        // Update status
        previewStatus.textContent = 'Added to Favorites';
        previewStatus.style.color = '#333';
        
        // Scroll to bottom to show latest message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
      }, 1500);
    }
    
    // Add image to favorites
    function addToFavorites(imageSrc, tab = 'tab1') {
      let favorites = JSON.parse(localStorage.getItem('categorizedFavorites') || '{}');
      if (!favorites[tab]) {
        favorites[tab] = [];
      }
      
      // Check if already exists
      const exists = favorites[tab].some(item => item.src === imageSrc);
      if (!exists) {
        favorites[tab].push({
          src: imageSrc,
          addedAt: new Date().toISOString(),
          title: imageSrc.split('/').pop().replace(/\.(jpg|png|jpeg|gif)$/i, '')
        });
        localStorage.setItem('categorizedFavorites', JSON.stringify(favorites));
        
        // Update badge
        updateFavoritesBadge();
        
        // Refresh favorites if we're viewing it
        if (currentView === 'favorites') {
          renderFavorites();
        }
      }
    }
    
    // Make addToFavorites available globally
    window.addToFavorites = addToFavorites;
    
    // Make handleDroppedImage available globally for canvas card drops
    window.handleDroppedImageFromCard = handleDroppedImage;
  }

  // Setup Map View AI Chat (minimized by default)
  function setupMapAIChat() {
    const chatPrompt = document.getElementById('mapAiChatPrompt');
    const chatToggle = document.getElementById('mapAiChatToggle');
    const minimizeBtn = document.getElementById('mapAiChatMinimize');
    const chatInput = document.getElementById('mapAiChatInput');
    const chatSend = document.getElementById('mapAiChatSend');
    const chatMessages = document.getElementById('mapAiChatMessages');
    const newChatBtn = document.getElementById('mapNewChatBtn');
    const viewHistoryBtn = document.getElementById('mapViewHistoryBtn');
    const closeHistoryBtn = document.getElementById('mapCloseHistoryBtn');
    
    if (!chatPrompt || !chatToggle) {
      console.error('Map AI chat elements not found');
      return;
    }
    
    // Check localStorage for saved state (default to minimized)
    const savedState = localStorage.getItem('mapChatOpen');
    const isOpen = savedState === 'true';
    
    // Apply initial state
    if (isOpen) {
      chatPrompt.classList.remove('minimized');
      chatToggle.classList.remove('visible');
      chatPrompt.classList.add('loaded');
    } else {
      chatPrompt.classList.add('minimized');
      chatToggle.classList.add('visible');
    }
    
    // Sample AI responses for map view
    const sampleResponses = [
      "The nearby restaurants offer excellent dining options for luxury shoppers visiting the Louis Vuitton flagship store.",
      "This museum is known for its contemporary art exhibitions that often complement fashion and design.",
      "The gallery features rotating exhibitions that frequently showcase fashion photography and luxury brand collaborations.",
      "This location is a popular spot among fashion enthusiasts and offers great photo opportunities.",
      "Many visitors to this area combine shopping at nearby luxury boutiques with cultural experiences."
    ];
    
    // Minimize/maximize functionality
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chatPrompt.classList.add('minimized');
        chatToggle.classList.add('visible');
        localStorage.setItem('mapChatOpen', 'false');
      });
    }
    
    if (chatToggle) {
      chatToggle.addEventListener('click', () => {
        chatPrompt.classList.remove('minimized');
        chatToggle.classList.remove('visible');
        chatPrompt.classList.add('loaded');
        localStorage.setItem('mapChatOpen', 'true');
      });
    }
    
    // Update button states
    function updateButtonStates() {
      const hasMessages = chatMessages && chatMessages.children.length > 0;
      if (newChatBtn) {
        newChatBtn.disabled = !hasMessages;
      }
    }
    
    // Add message to chat
    function addMessage(text, isUser = true) {
      if (!chatMessages) return;
      const messageEl = createEl('div', {
        class: `ai-chat-message ${isUser ? 'user' : 'ai'}`,
        text: text
      });
      chatMessages.appendChild(messageEl);
      updateButtonStates();
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // New Chat button
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        if (!newChatBtn.disabled && chatMessages) {
          chatMessages.replaceChildren();
          updateButtonStates();
        }
      });
    }
    
    // Initialize button states
    updateButtonStates();
    
    // Toggle history view
    function toggleHistoryView() {
      if (!chatPrompt) return;
      const isExpanded = chatPrompt.classList.contains('expanded');
      if (isExpanded) {
        chatPrompt.classList.remove('expanded');
      } else {
        chatPrompt.classList.add('expanded');
        populateHistory();
      }
    }
    
    // View History button
    if (viewHistoryBtn) {
      viewHistoryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleHistoryView();
      });
    }
    
    // Close history button
    if (closeHistoryBtn) {
      closeHistoryBtn.addEventListener('click', () => {
        toggleHistoryView();
      });
    }
    
    // Populate chat history
    function populateHistory() {
      const historyList = document.getElementById('mapChatHistoryList');
      if (!historyList) return;
      
      historyList.replaceChildren();
      
      const sampleHistory = [
        { title: 'Nearby Restaurants', preview: 'What restaurants are nearby?', date: 'Today' },
        { title: 'Museum Info', preview: 'Tell me about the museums...', date: 'Yesterday' },
        { title: 'Gallery Locations', preview: 'Where are the art galleries?', date: '2 days ago' }
      ];
      
      sampleHistory.forEach(chat => {
        const item = createEl('div', { class: 'ai-chat-history-item' });
        const title = createEl('p', { 
          class: 'ai-chat-history-item-title', 
          text: chat.title 
        });
        const preview = createEl('p', { 
          class: 'ai-chat-history-item-preview', 
          text: chat.preview 
        });
        
        item.appendChild(title);
        item.appendChild(preview);
        
        item.addEventListener('click', () => {
          toggleHistoryView();
        });
        
        historyList.appendChild(item);
      });
    }
    
    // Handle send
    function sendMessage() {
      if (!chatInput) return;
      const message = chatInput.value.trim();
      if (message) {
        addMessage(message, true);
        chatInput.value = '';
        
        if (chatSend) {
          chatSend.style.transform = 'scale(0.9)';
          setTimeout(() => {
            chatSend.style.transform = '';
          }, 200);
        }
        
        setTimeout(() => {
          const randomResponse = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
          addMessage(randomResponse, false);
        }, 800);
      }
    }
    
    // Send on button click
    if (chatSend) {
      chatSend.addEventListener('click', sendMessage);
    }
    
    // Send on Enter key
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    }
  }

  // Drawer image sets - different images load based on which card is clicked
  const drawerImageSets = {
    // Card 1 (canvas-1.jpg) - Girl with flowers set
    0: [
      'assets/media-1.jpg',  // Girl with flowers (B&W)
      'assets/media-2.jpg',  // Red/pink dots abstract artwork (framed)
      'assets/media-3.jpg',  // Horse with dots artwork
      'assets/media-4.jpg',  // Pumpkin artwork (orange/red)
      'assets/media-5.jpg'   // Woman with polka dot toast
    ],
    // Card 2 (canvas-2.jpg) - Blue face paint set
    1: [
      'assets/media-set2-1.jpg',  // Purple polka dot woman lying down
      'assets/media-set2-2.jpg',  // Model with blue LV bag
      'assets/media-set2-3.jpg',  // Kusama painting dots on back
      'assets/media-set2-4.jpg'   // Infinity mirror room
    ],
    // Card 3 (canvas-3.jpg) - Kusama polka dot outfit set
    2: [
      'assets/media-set3-1.jpg',  // Kusama with red wig at large canvas
      'assets/media-set3-2.jpg',  // Pink polka dots on street with LV logo
      'assets/media-set3-3.jpg',  // Model with silver balls - Creating Infinity
      'assets/media-set3-4.jpg'   // Pink infinity room with balloons
    ],
    // Card 4 (canvas-4.jpg) - Blue bag set
    3: [
      'assets/media-set4-1.jpg',  // Two models in blue LV outfits walking
      'assets/media-set4-2.jpg',  // Pumpkin tattoo arm + man with pumpkin bag
      'assets/media-set4-3.jpg',  // Blue pumpkin artwork
      'assets/media-set4-4.jpg'   // B&W abstract wave/dot pattern
    ],
    // Card 5 (canvas-5.jpg) - Blue paint swatch set
    4: [
      'assets/media-set5-1.jpg',  // Blonde model with colorful dots and LV bag
      'assets/media-set5-2.jpg',  // Model in polka dot outfit with LV bag
      'assets/media-set5-3.jpg',  // Kusama with red wig painting colorful table
      'assets/media-set5-4.jpg',  // Red paint swatch on blue background
      'assets/media-set5-5.jpg'   // B&W Kusama on pasta installation
    ]
  };

  // Track which card's images are currently loaded
  let currentLoadedCardIndex = -1;

  // Product images for specific cards (e.g., canvas-2 shows products)
  const cardProductImages = {
    // Card 2 (canvas-2.jpg) - Blue face paint has LV products
    1: [
      'assets/product-set1-1.jpg',  // Blue polka dot LV bag
      'assets/product-set1-2.jpg',  // B&W polka dot LV sneakers
      'assets/product-set1-3.jpg',  // Silver ball LV earrings
      'assets/product-set1-4.jpg',  // Silver ball LV necklace
      'assets/product-set1-5.jpg',  // Black polka dot pencil case
      'assets/product-set1-6.jpg',  // Polka dot LV sunglasses
      'assets/product-set1-7.jpg',  // B&W polka dot LV t-shirt
      'assets/product-set1-8.jpg'   // Silver studded LV jacket
    ]
  };

  // Setup My Media Drawer
  function setupMyMediaDrawer() {
    const drawerImages = document.getElementById('drawerImages');
    const scrollContainer = document.getElementById('mediaScrollContainer');
    const leftBtn = document.getElementById('scrollLeft');
    const rightBtn = document.getElementById('scrollRight');
    const drawer = document.querySelector('.my-media-drawer');
    
    // Get drawer images from localStorage or initialize with empty
    let drawerImagesList = JSON.parse(localStorage.getItem('drawerImages') || '[]');
    
    // Start with empty drawer - will be populated when a card is clicked
    if (currentLoadedCardIndex === -1) {
      drawerImagesList = [];
      localStorage.setItem('drawerImages', JSON.stringify(drawerImagesList));
    }
    
    // Populate drawer with draggable images
    function populateDrawer() {
      drawerImages.replaceChildren();
      
      // Show placeholder if drawer is empty
      if (drawerImagesList.length === 0) {
        const placeholder = createEl('div', { 
          class: 'drawer-placeholder',
          text: 'Click an image card to load curated media'
        });
        placeholder.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: rgba(0,0,0,0.4); font-size: 14px; font-style: italic; padding: 20px; text-align: center;';
        drawerImages.appendChild(placeholder);
        return;
      }
      
      drawerImagesList.forEach((src, index) => {
        const img = createEl('img', {
          class: 'my-media-image',
          src: src,
          alt: `Media ${index + 1}`,
          draggable: 'true'
        });
        
        // Drag start
        img.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('image/src', src);
          e.dataTransfer.setData('source', 'drawer');
          img.style.opacity = '0.5';
        });
        
        img.addEventListener('dragend', () => {
          img.style.opacity = '1';
        });
        
        drawerImages.appendChild(img);
      });
    }
    
    populateDrawer();
    
    // Fade in drawer after a short delay
    setTimeout(() => {
      drawer.classList.add('loaded');
    }, 200);
    
    // Scroll functionality
    let scrollPosition = 0;
    const scrollAmount = 224; // Image width + gap
    
    leftBtn.addEventListener('click', () => {
      scrollPosition = Math.max(0, scrollPosition - scrollAmount);
      drawerImages.style.transform = `translateX(-${scrollPosition}px)`;
    });
    
    rightBtn.addEventListener('click', () => {
      const maxScroll = drawerImages.scrollWidth - scrollContainer.clientWidth;
      scrollPosition = Math.min(maxScroll, scrollPosition + scrollAmount);
      drawerImages.style.transform = `translateX(-${scrollPosition}px)`;
    });
    
    // Drop zone on canvas - add images from drawer
    const mediaGrid = document.getElementById('mediaGrid');
    
    mediaGrid.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    mediaGrid.addEventListener('drop', (e) => {
      e.preventDefault();
      const imageSrc = e.dataTransfer.getData('image/src');
      const source = e.dataTransfer.getData('source');
      
      if (imageSrc && source === 'drawer') {
        // Add new image to gallery
        const currentMedia = JSON.parse(localStorage.getItem('galleryImages') || '[]');
        currentMedia.push({
          src: imageSrc,
          productData: { title: 'Dropped Image' }
        });
        localStorage.setItem('galleryImages', JSON.stringify(currentMedia));
        
        // Re-render media view
        renderMedia();
      }
    });
    
    // Drop zone on drawer - remove cards from canvas
    drawer.addEventListener('dragover', (e) => {
      e.preventDefault();
      drawer.style.background = 'rgba(255, 255, 255, 0.5)';
      drawer.style.borderColor = 'rgba(0, 0, 0, 0.3)';
    });
    
    drawer.addEventListener('dragleave', () => {
      drawer.style.background = 'rgba(255, 255, 255, 0.3)';
      drawer.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });
    
    drawer.addEventListener('drop', (e) => {
      e.preventDefault();
      drawer.style.background = 'rgba(255, 255, 255, 0.3)';
      drawer.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      
      const imageSrc = e.dataTransfer.getData('card/src');
      
      if (imageSrc) {
        // Remove from gallery
        let currentMedia = JSON.parse(localStorage.getItem('galleryImages') || '[]');
        const indexToRemove = currentMedia.findIndex(item => item.src === imageSrc);
        
        if (indexToRemove > -1) {
          currentMedia.splice(indexToRemove, 1);
          localStorage.setItem('galleryImages', JSON.stringify(currentMedia));
          
          // Add to drawer if not already there
          if (!drawerImagesList.includes(imageSrc)) {
            drawerImagesList.push(imageSrc);
            localStorage.setItem('drawerImages', JSON.stringify(drawerImagesList));
            populateDrawer();
          }
          
          // Re-render media view
          renderMedia();
        }
      }
    });
  }

  // Render Media Gallery
  function renderMedia(filter = 'content') {
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

    // Create backdrop for focus mode
    let backdrop = document.querySelector('.media-backdrop');
    if (!backdrop) {
      backdrop = createEl('div', { class: 'media-backdrop' });
      document.body.appendChild(backdrop);
    }

    let focusedCard = null;
    let originalCanvasCard = null; // Track the original canvas card before media selection
    const cards = [];

    // Generate stacked card positions
    const positions = generateStackedPositions(media.length);

    media.forEach((item, index) => {
      console.log('Creating media card for:', item);
      
      // Create glass container
      const glassContainer = createEl('div', { class: 'dashboard-media-container' });
      
      // Create inner card
      const mediaCard = createEl('div', { class: 'dashboard-media-item' });
      const img = createEl('img', {
        class: 'dashboard-media-image',
        src: item.src,
        alt: item.productData?.title || 'Media item'
      });
      
      // Bookmark button
      const bookmarkBtn = createEl('button', { class: 'media-action-btn bookmark-btn' });
      const bookmarkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      bookmarkSvg.setAttribute('viewBox', '0 0 24 24');
      bookmarkSvg.setAttribute('fill', 'none');
      bookmarkSvg.setAttribute('stroke', 'currentColor');
      bookmarkSvg.setAttribute('stroke-width', '2');
      const bookmarkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      bookmarkPath.setAttribute('d', 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z');
      bookmarkPath.setAttribute('stroke-linecap', 'round');
      bookmarkPath.setAttribute('stroke-linejoin', 'round');
      bookmarkSvg.appendChild(bookmarkPath);
      bookmarkBtn.appendChild(bookmarkSvg);
      
      bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isBookmarked = bookmarkBtn.classList.toggle('active');
        if (isBookmarked) {
          bookmarkSvg.setAttribute('fill', 'currentColor');
          // Add to favorites
          if (window.addToFavorites) {
            window.addToFavorites(item.src, 'tab1');
          }
        } else {
          bookmarkSvg.setAttribute('fill', 'none');
          // Remove from favorites
          removeFromFavorites(item.src, 'tab1');
        }
      });
      
      mediaCard.appendChild(img);
      
      // Append bookmark button to glass container (outside the inner card)
      glassContainer.appendChild(bookmarkBtn);
      glassContainer.appendChild(mediaCard);

      // Set initial stacked position on glass container
      const pos = positions[index];
      glassContainer.style.left = pos.x + 'px';
      glassContainer.style.top = pos.y + 'px';
      glassContainer.style.transform = `rotate(${pos.rotation}deg) scale(0.95)`;
      glassContainer.style.zIndex = index + 1;
      glassContainer.style.opacity = '0';

      // Store original position
      glassContainer.dataset.originalX = pos.x;
      glassContainer.dataset.originalY = pos.y;
      glassContainer.dataset.originalRotation = pos.rotation;
      glassContainer.dataset.originalZIndex = index + 1;
      
      // Click to focus/unfocus - use regular click event
      glassContainer.addEventListener('click', (e) => {
        // Don't trigger if clicking action buttons
        if (e.target.closest('.media-action-btn')) return;
        
        e.stopPropagation();
        
        console.log('Card clicked for focus, isDragging:', isDragging, 'dragStarted:', dragStarted);
        
        // Only focus if we didn't just drag
        if (!dragStarted) {
          if (focusedCard === glassContainer) {
            console.log('Unfocusing card');
            unfocusAllCards();
          } else {
            console.log('Focusing card');
            focusCard(glassContainer);
          }
        }
      });
      
      cards.push(glassContainer);
      grid.appendChild(glassContainer);

      // Make card draggable with mouse
      let isDragging = false;
      let currentX = 0;
      let currentY = 0;
      let initialX = 0;
      let initialY = 0;
      let xOffset = 0;
      let yOffset = 0;
      let fixedStartLeft = 0;
      let fixedStartTop = 0;
      let dragStarted = false;
      let activeCard = null;
      let lastMouseX = 0;
      let lastMouseY = 0;
      
      function dragStart(e) {
        // Don't start drag if focused/unfocused
        if (glassContainer.classList.contains('focused') || glassContainer.classList.contains('unfocused')) return;
        
        // Don't drag bookmark button
        if (e.target.closest('.media-action-btn')) return;
        
        if (e.target === glassContainer || glassContainer.contains(e.target)) {
          activeCard = glassContainer;
          dragStarted = false;
          
          // Store initial mouse position but don't start dragging yet
          if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX;
            initialY = e.touches[0].clientY;
          } else {
            initialX = e.clientX;
            initialY = e.clientY;
          }
        }
      }
      
      // Store handlers on the element for global access
      glassContainer._dragHandler = drag;
      glassContainer._dragEndHandler = dragEnd;
      
      glassContainer.addEventListener('mousedown', dragStart);
      glassContainer.addEventListener('touchstart', dragStart);

      function drag(e) {
        if (activeCard !== glassContainer) return;
        
        let mouseX, mouseY;
        
        if (e.type === 'touchmove') {
          mouseX = e.touches[0].clientX;
          mouseY = e.touches[0].clientY;
        } else {
          mouseX = e.clientX;
          mouseY = e.clientY;
        }
        
        // Store last known mouse position for use in dragEnd
        lastMouseX = mouseX;
        lastMouseY = mouseY;

        currentX = mouseX - initialX;
        currentY = mouseY - initialY;
        
        // Only start dragging if moved more than 5px
        if (activeCard && !dragStarted && (Math.abs(currentX) > 5 || Math.abs(currentY) > 5)) {
          dragStarted = true;
          isDragging = true;
          
          // Get current position before switching to fixed
          const rect = glassContainer.getBoundingClientRect();
          fixedStartLeft = rect.left;
          fixedStartTop = rect.top;
          
          glassContainer.style.cursor = 'grabbing';
          glassContainer.style.zIndex = '99999';
          glassContainer.style.position = 'fixed';
          glassContainer.style.left = fixedStartLeft + 'px';
          glassContainer.style.top = fixedStartTop + 'px';
          glassContainer.style.transition = 'none';
          glassContainer.style.pointerEvents = 'none';
          
          xOffset = 0;
          yOffset = 0;
          
          console.log('Drag started at:', fixedStartLeft, fixedStartTop);
        }
        
        if (isDragging && activeCard === glassContainer) {
          e.preventDefault();
          
          xOffset = currentX;
          yOffset = currentY;

          const rotation = glassContainer.dataset.originalRotation;
          
          // Update position based on mouse movement from start
          glassContainer.style.left = (fixedStartLeft + currentX) + 'px';
          glassContainer.style.top = (fixedStartTop + currentY) + 'px';
          glassContainer.style.transform = `rotate(${rotation}deg) scale(1)`;
          
          // Check if over drawer and show add indicator
          const drawer = document.querySelector('.my-media-drawer');
          const dropIndicator = document.getElementById('dropIndicator');
          const chatPrompt = document.querySelector('.ai-chat-prompt');
          
          const currentMouseX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
          const currentMouseY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
          
          // Check if over AI Chat
          if (chatPrompt) {
            const chatRect = chatPrompt.getBoundingClientRect();
            const isOverChat = (
              currentMouseX >= chatRect.left &&
              currentMouseX <= chatRect.right &&
              currentMouseY >= chatRect.top &&
              currentMouseY <= chatRect.bottom
            );
            
            if (isOverChat) {
              chatPrompt.classList.add('drag-over');
            } else {
              chatPrompt.classList.remove('drag-over');
            }
          }
          
          if (drawer && dropIndicator) {
            const drawerRect = drawer.getBoundingClientRect();
            
            const isOverDrawer = (
              currentMouseX >= drawerRect.left &&
              currentMouseX <= drawerRect.right &&
              currentMouseY >= drawerRect.top &&
              currentMouseY <= drawerRect.bottom
            );
            
            if (isOverDrawer) {
              drawer.style.background = 'rgba(255, 255, 255, 0.6)';
              drawer.style.borderColor = 'rgba(100, 180, 100, 0.6)';
              drawer.style.transform = 'scale(1.02)';
              dropIndicator.classList.add('show');
            } else {
              drawer.style.background = 'rgba(255, 255, 255, 0.3)';
              drawer.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              drawer.style.transform = 'scale(1)';
              dropIndicator.classList.remove('show');
            }
          }
        }
      }

      function dragEnd(e) {
        if (activeCard !== glassContainer) return;
        
        // Reset drag state regardless
        const wasDragging = isDragging;
        isDragging = false;
        dragStarted = false;
        activeCard = null;
        
        if (wasDragging) {
          glassContainer.style.cursor = 'grab';
          glassContainer.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          glassContainer.style.pointerEvents = 'auto';
          
          console.log('Drag ended');
          
          // Use last known mouse position (more reliable than mouseup event coordinates)
          const mouseX = lastMouseX || e.clientX || 0;
          const mouseY = lastMouseY || e.clientY || 0;
          
          console.log('Drop position:', mouseX, mouseY);
          
          // Check if dropped over AI Chat component
          const chatPrompt = document.querySelector('.ai-chat-prompt');
          if (chatPrompt) {
            // Always remove drag-over class on drag end
            chatPrompt.classList.remove('drag-over');
            
            const chatRect = chatPrompt.getBoundingClientRect();
            console.log('Chat bounds:', chatRect.left, chatRect.top, chatRect.right, chatRect.bottom);
            console.log('Mouse position:', mouseX, mouseY);
            
            const isOverChat = (
              mouseX >= chatRect.left &&
              mouseX <= chatRect.right &&
              mouseY >= chatRect.top &&
              mouseY <= chatRect.bottom
            );
            
            console.log('Is over chat:', isOverChat);
            
            if (isOverChat) {
              console.log('✓ Card dropped on AI Chat! Analyzing...');
              
              // Analyze the image and add to favorites
              if (window.handleDroppedImageFromCard) {
                window.handleDroppedImageFromCard(item.src);
              }
              
              // Return card to original position with animation
              glassContainer.style.position = 'absolute';
              glassContainer.style.left = glassContainer.dataset.originalX + 'px';
              glassContainer.style.top = glassContainer.dataset.originalY + 'px';
              glassContainer.style.transform = `rotate(${glassContainer.dataset.originalRotation}deg) scale(0.95)`;
              glassContainer.style.zIndex = glassContainer.dataset.originalZIndex;
              
              xOffset = 0;
              yOffset = 0;
              
              return;
            }
          }
          
          // Check if dropped over My Media drawer using mouse position
          const drawer = document.querySelector('.my-media-drawer');
          if (drawer) {
            const drawerRect = drawer.getBoundingClientRect();
            
            // Check if mouse is over drawer
            const isOverDrawer = (
              mouseX >= drawerRect.left &&
              mouseX <= drawerRect.right &&
              mouseY >= drawerRect.top &&
              mouseY <= drawerRect.bottom
            );
            
            if (isOverDrawer) {
              console.log('✓ Card dropped on drawer! Removing from canvas...');
              
              // Animate card to drawer and remove
              glassContainer.style.position = 'absolute';
              glassContainer.style.opacity = '0';
              glassContainer.style.transform = 'scale(0.3)';
              
              setTimeout(() => {
                // Remove from gallery
                let currentMedia = JSON.parse(localStorage.getItem('galleryImages') || '[]');
                const indexToRemove = currentMedia.findIndex(mediaItem => mediaItem.src === item.src);
                
                console.log('Removing card at index:', indexToRemove);
                
                if (indexToRemove > -1) {
                  currentMedia.splice(indexToRemove, 1);
                  localStorage.setItem('galleryImages', JSON.stringify(currentMedia));
                  
                  // Add to drawer at the BEGINNING
                  let drawerImagesList = JSON.parse(localStorage.getItem('drawerImages') || '[]');
                  if (!drawerImagesList.includes(item.src)) {
                    drawerImagesList.unshift(item.src); // Add to beginning
                    localStorage.setItem('drawerImages', JSON.stringify(drawerImagesList));
                    console.log('✓ Added to drawer gallery');
                  }
                  
                  // Re-render
                  renderMedia();
                }
              }, 300);
              
              // Hide drop indicator
              const dropIndicator = document.getElementById('dropIndicator');
              if (dropIndicator) {
                dropIndicator.classList.remove('show');
              }
              
              // Reset drawer style
              drawer.style.background = 'rgba(255, 255, 255, 0.3)';
              drawer.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              drawer.style.transform = 'scale(1)';
              
              return;
            }
          }
          
          // Normal drag end - convert back to absolute positioning
          glassContainer.style.position = 'absolute';
          glassContainer.style.zIndex = glassContainer.dataset.originalZIndex;
          
          // Calculate new absolute position
          const newAbsoluteX = parseFloat(glassContainer.dataset.originalX) + xOffset;
          const newAbsoluteY = parseFloat(glassContainer.dataset.originalY) + yOffset;
          
          glassContainer.dataset.originalX = newAbsoluteX;
          glassContainer.dataset.originalY = newAbsoluteY;
          glassContainer.style.left = newAbsoluteX + 'px';
          glassContainer.style.top = newAbsoluteY + 'px';
          
          xOffset = 0;
          yOffset = 0;
          
          console.log('Drag ended at:', newAbsoluteX, newAbsoluteY);
        }
      }

      // Fast and smooth fade-in animation
      setTimeout(() => {
        glassContainer.style.animation = `cardArrange 0.3s ease-out forwards`;
        glassContainer.style.animationDelay = `${index * 0.05}s`;
      }, 50);
    });

    // Focus a card
    function focusCard(card) {
      focusedCard = card;
      backdrop.classList.add('active');
      
      // Find the index of the focused card
      const focusedIndex = cards.indexOf(card);
      
      // Load curated images for this card if available and not already loaded
      if (drawerImageSets[focusedIndex] && currentLoadedCardIndex !== focusedIndex) {
        loadCuratedDrawerImages(focusedIndex);
      }
      
      // Show/hide My Products component based on card
      if (cardProductImages[focusedIndex]) {
        showProductsDrawer(focusedIndex);
      } else {
        hideProductsDrawer();
      }
      
      // Ensure transition is enabled for smooth animation
      cards.forEach(c => {
        if (c.style.transition === 'none') {
          c.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }
        c.style.transformOrigin = 'center center';
      });
      
      // Calculate center of viewport, offset up to keep My Media drawer accessible
      const viewportCenterX = window.innerWidth / 2;
      const drawerHeight = 180; // Height of My Media drawer
      const viewportCenterY = (window.innerHeight - drawerHeight) / 2;
      
      // Get card dimensions (before any transform)
      const cardRect = card.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;
      const cardCenterY = cardRect.top + cardRect.height / 2;
      
      cards.forEach(c => {
        if (c === card) {
          c.classList.add('focused');
          c.classList.remove('unfocused');
          
          // Calculate offset to center (above the drawer)
          const offsetX = viewportCenterX - cardCenterX;
          const offsetY = viewportCenterY - cardCenterY;
          
          // Move to center above drawer - scale is handled by CSS class
          c.style.left = (parseFloat(c.dataset.originalX) + offsetX) + 'px';
          c.style.top = (parseFloat(c.dataset.originalY) + offsetY) + 'px';
          c.style.zIndex = 1000;
          
          console.log('Card focused - class added');
          setTimeout(() => {
            const rect = c.getBoundingClientRect();
            console.log('Card size after focus:', rect.width, 'x', rect.height);
          }, 350);
        } else {
          c.classList.add('unfocused');
          c.classList.remove('focused');
          
          // Determine if card is on left or right side of viewport
          const cRect = c.getBoundingClientRect();
          const cCenterX = cRect.left + cRect.width / 2;
          
          // Push cards away from center
          let pushDistance = 150;
          if (cCenterX < viewportCenterX) {
            // Card is on left side, push more left
            c.style.left = (parseFloat(c.dataset.originalX) - pushDistance) + 'px';
          } else {
            // Card is on right side, push more right
            c.style.left = (parseFloat(c.dataset.originalX) + pushDistance) + 'px';
          }
          
          // Scale is handled by CSS class
        }
      });
    }
    
    // Load curated images into the My Media drawer based on card index
    function loadCuratedDrawerImages(cardIndex) {
      currentLoadedCardIndex = cardIndex;
      
      // Get the image set for this card (default to first set if not found)
      const imageSet = drawerImageSets[cardIndex] || drawerImageSets[0];
      
      // Set the curated images in localStorage
      localStorage.setItem('drawerImages', JSON.stringify(imageSet));
      
      // Re-populate the drawer
      const drawerImagesEl = document.getElementById('drawerImages');
      if (drawerImagesEl) {
        drawerImagesEl.replaceChildren();
        
        imageSet.forEach((src, index) => {
          // Create wrapper for image + bookmark
          const wrapper = createEl('div', { class: 'my-media-image-wrapper' });
          
          const img = createEl('img', {
            class: 'my-media-image',
            src: src,
            alt: `Media ${index + 1}`,
            draggable: 'true'
          });
          
          // Create bookmark button
          const bookmarkBtn = createEl('button', { class: 'my-media-bookmark-btn' });
          bookmarkBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          
          // Check if already bookmarked
          const favorites = JSON.parse(localStorage.getItem('categorizedFavorites') || '{}');
          const isBookmarked = Object.values(favorites).some(arr => arr.some(item => item.src === src));
          if (isBookmarked) {
            bookmarkBtn.classList.add('is-bookmarked');
          }
          
          bookmarkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const nowBookmarked = bookmarkBtn.classList.toggle('is-bookmarked');
            if (nowBookmarked && window.addToFavorites) {
              window.addToFavorites(src, 'tab1');
            } else {
              removeFromFavorites(src, 'tab1');
            }
          });
          
          // Drag start
          img.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('image/src', src);
            e.dataTransfer.setData('source', 'drawer');
            img.style.opacity = '0.5';
          });
          
          img.addEventListener('dragend', () => {
            img.style.opacity = '1';
          });
          
          // Click to focus this image as a card
          img.addEventListener('click', (e) => {
            console.log('My Media image clicked:', src);
            e.stopPropagation();
            focusMediaImage(src, `Media ${index + 1}`);
          });
          
          // Add cursor pointer for clickable
          img.style.cursor = 'pointer';
          
          wrapper.appendChild(img);
          wrapper.appendChild(bookmarkBtn);
          
          // Add with fade-in animation
          wrapper.style.opacity = '0';
          wrapper.style.transform = 'translateY(10px)';
          drawerImagesEl.appendChild(wrapper);
          
          // Staggered fade-in
          setTimeout(() => {
            wrapper.style.transition = 'all 0.3s ease-out';
            wrapper.style.opacity = '1';
            wrapper.style.transform = 'translateY(0)';
          }, index * 80);
        });
        
        console.log('Curated drawer images loaded');
      }
    }
    
    // Focus a media image from the drawer as a new card
    function focusMediaImage(imageSrc, title) {
      console.log('focusMediaImage called:', imageSrc, 'focusedCard:', !!focusedCard);
      if (!focusedCard) {
        console.log('No focused card, returning');
        return;
      }
      
      // Save reference to original canvas card if this is the first media selection
      if (!originalCanvasCard && cards.includes(focusedCard)) {
        originalCanvasCard = focusedCard;
      }
      
      // Show the clear selection button
      const clearBtn = document.getElementById('clearSelectionBtn');
      if (clearBtn) {
        clearBtn.classList.add('visible');
      }
      
      // Move the currently focused card to "previously-focused" state
      focusedCard.classList.remove('focused');
      focusedCard.classList.add('previously-focused');
      
      // Position the previously focused card slightly behind and to the side
      const prevRect = focusedCard.getBoundingClientRect();
      focusedCard.style.left = (parseFloat(focusedCard.style.left) - 80) + 'px';
      focusedCard.style.top = (parseFloat(focusedCard.style.top) + 30) + 'px';
      focusedCard.style.zIndex = 999;
      
      // Create a new temporary card for the media image
      const newCard = createEl('div', { class: 'dashboard-media-container media-temp-card' });
      newCard.style.position = 'absolute';
      newCard.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      newCard.style.width = '290px';
      newCard.style.height = '370px';
      newCard.style.borderRadius = '24px';
      newCard.style.background = 'rgba(255, 255, 255, 0.35)';
      newCard.style.backdropFilter = 'blur(8px)';
      newCard.style.border = '1px solid rgba(255, 255, 255, 0.3)';
      newCard.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.15)';
      newCard.style.overflow = 'hidden';
      newCard.style.padding = '16px';
      
      // Create card content
      const cardContent = createEl('div', { class: 'media-card-content' });
      cardContent.style.width = '100%';
      cardContent.style.height = '100%';
      cardContent.style.borderRadius = '16px';
      cardContent.style.overflow = 'hidden';
      
      const img = createEl('img', {
        class: 'media-card-image',
        src: imageSrc,
        alt: title
      });
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      
      cardContent.appendChild(img);
      newCard.appendChild(cardContent);
      
      // Add to the media grid
      mediaGrid.appendChild(newCard);
      
      // Position at the same spot as the focused card initially
      const drawerHeight = 280;
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = (window.innerHeight - drawerHeight) / 2;
      
      // Start from drawer position (bottom left)
      newCard.style.left = '100px';
      newCard.style.top = (window.innerHeight - 100) + 'px';
      newCard.style.opacity = '0';
      newCard.style.transform = 'scale(0.5)';
      
      // Animate to center (scaled up like the focused cards)
      setTimeout(() => {
        newCard.classList.add('focused');
        newCard.style.left = (viewportCenterX - 217) + 'px'; // Half of 290*1.5 = 217
        newCard.style.top = (viewportCenterY - 277) + 'px';  // Half of 370*1.5 = 277
        newCard.style.opacity = '1';
        newCard.style.transform = 'scale(1.5)';
        newCard.style.zIndex = 1000;
      }, 50);
      
      // Update the focused card reference
      focusedCard = newCard;
      
      // Add click handler to unfocus
      newCard.addEventListener('click', (e) => {
        if (!e.target.closest('.media-action-btn')) {
          unfocusAllCards();
        }
      });
    }
    
    // Clear selection - return focus to original canvas card
    function clearMediaSelection() {
      console.log('Clear selection clicked, originalCanvasCard:', !!originalCanvasCard);
      
      if (!originalCanvasCard) return;
      
      // Remove all temporary media cards
      const tempCards = mediaGrid.querySelectorAll('.media-temp-card');
      tempCards.forEach(card => card.remove());
      
      // Save reference before resetting
      const cardToFocus = originalCanvasCard;
      
      // Disable transition temporarily so the reset happens instantly
      cardToFocus.style.transition = 'none';
      
      // Reset the card to its original position first (so focusCard calculates correct offset)
      cardToFocus.classList.remove('previously-focused', 'focused', 'unfocused');
      cardToFocus.style.left = cardToFocus.dataset.originalX + 'px';
      cardToFocus.style.top = cardToFocus.dataset.originalY + 'px';
      cardToFocus.style.transform = `rotate(${cardToFocus.dataset.originalRotation}deg) scale(1)`;
      cardToFocus.style.zIndex = cardToFocus.dataset.originalZIndex;
      
      originalCanvasCard = null;
      focusedCard = null;
      
      // Hide the clear selection button
      const clearBtn = document.getElementById('clearSelectionBtn');
      if (clearBtn) {
        clearBtn.classList.remove('visible');
      }
      
      // Force a reflow so the position reset takes effect
      cardToFocus.offsetHeight;
      
      // Re-enable transition for the focus animation
      cardToFocus.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      
      // Re-focus the original card using the standard focus mechanism
      focusCard(cardToFocus);
    }
    
    // Setup clear selection button
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearMediaSelection();
      });
    }

    // Unfocus all cards - return to original state
    function unfocusAllCards() {
      focusedCard = null;
      originalCanvasCard = null; // Reset original card reference
      backdrop.classList.remove('active');
      
      // Hide clear selection button
      const clearBtn = document.getElementById('clearSelectionBtn');
      if (clearBtn) {
        clearBtn.classList.remove('visible');
      }
      
      cards.forEach(c => {
        c.classList.remove('focused', 'unfocused', 'previously-focused');
        
        // Restore original position (scale back to 1.0 = 100% = original size)
        c.style.left = c.dataset.originalX + 'px';
        c.style.top = c.dataset.originalY + 'px';
        c.style.transform = `rotate(${c.dataset.originalRotation}deg) scale(1)`;
        c.style.zIndex = c.dataset.originalZIndex;
      });
      
      // Remove any temporary media cards
      const tempCards = mediaGrid.querySelectorAll('.media-temp-card');
      tempCards.forEach(card => card.remove());
      
      // Reset My Media drawer to initial empty state
      resetDrawerToEmpty();
      
      // Hide My Products drawer
      hideProductsDrawer();
    }
    
    // Reset the My Media drawer to its initial empty state
    function resetDrawerToEmpty() {
      currentLoadedCardIndex = -1;
      localStorage.setItem('drawerImages', JSON.stringify([]));
      
      const drawerImagesEl = document.getElementById('drawerImages');
      if (drawerImagesEl) {
        drawerImagesEl.replaceChildren();
        
        const placeholder = createEl('div', { 
          class: 'drawer-placeholder',
          text: 'Click an image card to load curated media'
        });
        placeholder.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: rgba(0,0,0,0.4); font-size: 14px; font-style: italic; padding: 20px; text-align: center;';
        drawerImagesEl.appendChild(placeholder);
      }
    }
    
    // Show the My Products drawer with product images
    function showProductsDrawer(cardIndex) {
      const productsDrawer = document.getElementById('myProductsDrawer');
      const productImagesEl = document.getElementById('productImages');
      
      if (!productsDrawer || !productImagesEl) return;
      
      const productImages = cardProductImages[cardIndex];
      if (!productImages) return;
      
      // Show the drawer
      productsDrawer.classList.add('visible');
      
      // Populate with product images
      productImagesEl.replaceChildren();
      
      productImages.forEach((src, index) => {
        const img = createEl('img', {
          class: 'my-media-image',
          src: src,
          alt: `Product ${index + 1}`,
          draggable: 'true'
        });
        
        // Drag start for products
        img.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('image/src', src);
          e.dataTransfer.setData('source', 'products');
          img.style.opacity = '0.5';
        });
        
        img.addEventListener('dragend', () => {
          img.style.opacity = '1';
        });
        
        // Add with fade-in animation
        img.style.opacity = '0';
        img.style.transform = 'translateY(10px)';
        productImagesEl.appendChild(img);
        
        // Staggered fade-in
        setTimeout(() => {
          img.style.transition = 'all 0.3s ease-out';
          img.style.opacity = '1';
          img.style.transform = 'translateY(0)';
        }, index * 50);
      });
      
      // Add loaded class for animation
      setTimeout(() => {
        productsDrawer.classList.add('loaded');
      }, 50);
      
      // Setup scroll buttons
      setupProductsScrollButtons();
    }
    
    // Hide the My Products drawer
    function hideProductsDrawer() {
      const productsDrawer = document.getElementById('myProductsDrawer');
      if (productsDrawer) {
        productsDrawer.classList.remove('loaded');
        setTimeout(() => {
          productsDrawer.classList.remove('visible');
        }, 300);
      }
    }
    
    // Setup scroll buttons for products drawer
    function setupProductsScrollButtons() {
      const productImages = document.getElementById('productImages');
      const scrollContainer = document.getElementById('productsScrollContainer');
      const leftBtn = document.getElementById('productsScrollLeft');
      const rightBtn = document.getElementById('productsScrollRight');
      
      if (!productImages || !scrollContainer || !leftBtn || !rightBtn) return;
      
      let scrollPosition = 0;
      const scrollAmount = 224; // Image width + gap
      
      leftBtn.onclick = () => {
        scrollPosition = Math.max(0, scrollPosition - scrollAmount);
        productImages.style.transform = `translateX(-${scrollPosition}px)`;
      };
      
      rightBtn.onclick = () => {
        const maxScroll = productImages.scrollWidth - scrollContainer.clientWidth;
        scrollPosition = Math.min(maxScroll, scrollPosition + scrollAmount);
        productImages.style.transform = `translateX(-${scrollPosition}px)`;
      };
    }

    // Click backdrop to unfocus
    backdrop.addEventListener('click', unfocusAllCards);
    
    // Global drag handlers (only work when activeCard is set)
    document.addEventListener('mousemove', (e) => {
      cards.forEach(card => {
        const drag = card._dragHandler;
        if (drag) drag(e);
      });
    });
    
    document.addEventListener('mouseup', (e) => {
      cards.forEach(card => {
        const dragEnd = card._dragEndHandler;
        if (dragEnd) dragEnd(e);
      });
    });
  }

  // Generate stacked card positions
  function generateStackedPositions(count) {
    const positions = [];
    const baseX = 80;
    const baseY = 100;
    const horizontalSpacing = 220;
    const verticalStagger = 150;
    const rotationRange = 6;

    for (let i = 0; i < count; i++) {
      // Arrange horizontally with vertical staggering and overlap
      const x = baseX + (i * horizontalSpacing) + (Math.random() - 0.5) * 40;
      
      // Stagger vertically with alternating pattern
      const staggerOffset = (i % 2 === 0) ? 0 : verticalStagger;
      const y = baseY + staggerOffset + (Math.random() - 0.5) * 60;
      
      const rotation = (Math.random() - 0.5) * rotationRange;

      positions.push({ x, y, rotation });
    }

    return positions;
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
      
      // Define base layers for map and satellite views
      const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      });
      
      const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 19
      });
      
      // Add default layer (street map)
      streetMap.addTo(leafletMap);
      
      // Create layer control
      const baseMaps = {
        "Map View": streetMap,
        "Satellite View": satelliteMap
      };
      
      L.control.layers(baseMaps, null, { position: 'topright' }).addTo(leafletMap);
      
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
      
      // Add all nearby locations to map by default with color-coded markers
      const addNearbyLocations = () => {
        // Create custom icons for different categories
        const storeIcon = L.divIcon({
          className: 'custom-store-marker',
          html: '<div style="width: 12px; height: 12px; background: #3b82f6; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        
        const museumIcon = L.divIcon({
          className: 'custom-museum-marker',
          html: '<div style="width: 12px; height: 12px; background: #8b5cf6; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        
        const restaurantIcon = L.divIcon({
          className: 'custom-restaurant-marker',
          html: '<div style="width: 12px; height: 12px; background: #10b981; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        
        // Add stores
        locationData.stores.forEach(location => {
          const popupContent = location.address 
            ? `<b>${location.name}</b><br><small>${location.address}</small>`
            : `<b>${location.name}</b>`;
          L.marker([location.lat, location.lng], { icon: storeIcon })
            .bindPopup(popupContent)
            .addTo(leafletMap);
        });
        
        // Add museums
        locationData.museums.forEach(location => {
          const popupContent = location.address 
            ? `<b>${location.name}</b><br><small>${location.address}</small>`
            : `<b>${location.name}</b>`;
          L.marker([location.lat, location.lng], { icon: museumIcon })
            .bindPopup(popupContent)
            .addTo(leafletMap);
        });
        
        // Add restaurants
        locationData.restaurants.forEach(location => {
          const popupContent = location.address 
            ? `<b>${location.name}</b><br><small>${location.address}</small>`
            : `<b>${location.name}</b>`;
          L.marker([location.lat, location.lng], { icon: restaurantIcon })
            .bindPopup(popupContent)
            .addTo(leafletMap);
        });
      };
      
      // Add nearby locations after a short delay
      setTimeout(addNearbyLocations, 200);
      
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
    
    // Load default category (restaurants - first tab)
    loadLocationCategory('restaurants');
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
    
    // Get the keywords container above the map
    const mapKeywordsContainer = document.getElementById('mapKeywordsContainer');
    
    const locations = locationData[category] || [];
    
    if (!leafletMap) return;
    
    // Add markers and images
    locations.forEach((location, index) => {
      // Add standard marker to map (different from LV product markers)
      const popupContent = location.address 
        ? `<b>${location.name}</b><br><small>${location.address}</small>`
        : `<b>${location.name}</b>`;
      const marker = L.marker([location.lat, location.lng])
        .bindPopup(popupContent)
        .addTo(leafletMap);
      locationMarkers.push(marker);
      
      // Add image to content
      const item = createEl('div', { class: 'location-item' });
      item.setAttribute('data-index', index);
      const img = createEl('img', { 
        class: 'location-image',
        src: location.image,
        alt: location.name
      });
      const name = createEl('p', { class: 'location-name', text: location.name });
      
      item.appendChild(img);
      item.appendChild(name);
      content.appendChild(item);
      
      // Click to zoom to location and show keywords
      item.addEventListener('click', () => {
        // Center map on selected location with smooth animation
        leafletMap.flyTo([location.lat, location.lng], 16, {
          animate: true,
          duration: 0.8
        });
        marker.openPopup();
        
        // Highlight selected item
        document.querySelectorAll('.location-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        
        // Display keywords above the map if available
        if (location.keywords && location.keywords.length > 0 && mapKeywordsContainer) {
          displayLocationKeywords(location.keywords, location.name, mapKeywordsContainer);
        }
      });
    });
  }
  
  // Display keywords as badges above the map
  function displayLocationKeywords(keywords, locationName, container) {
    container.replaceChildren();
    container.classList.add('visible');
    
    // Create header
    const header = createEl('div', { class: 'keywords-header' });
    const title = createEl('span', { class: 'keywords-title', text: `Keywords for ${locationName}` });
    const closeBtn = createEl('button', { class: 'keywords-close-btn', text: '×' });
    closeBtn.addEventListener('click', () => {
      container.classList.remove('visible');
      container.replaceChildren();
      document.querySelectorAll('.location-item').forEach(el => el.classList.remove('selected'));
    });
    header.appendChild(title);
    header.appendChild(closeBtn);
    container.appendChild(header);
    
    // Create badges wrapper
    const badgesWrapper = createEl('div', { class: 'keywords-badges' });
    
    keywords.forEach(keyword => {
      const badge = createEl('span', { class: 'keyword-badge', text: keyword });
      badgesWrapper.appendChild(badge);
    });
    
    container.appendChild(badgesWrapper);
  }

  // Render Favorites
  // Track current favorites tab
  let currentFavoritesTab = 'tab1';
  
  function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    grid.replaceChildren();

    // Add glass grid styling
    grid.classList.add('favorites-grid-glass');
    
    // Setup tab listeners
    setupFavoritesTabs();
    
    // Get categorized favorites
    const categorizedFavorites = JSON.parse(localStorage.getItem('categorizedFavorites') || '{}');
    const currentTabFavorites = categorizedFavorites[currentFavoritesTab] || [];
    
    // Also get legacy wishlist products
    const legacyFavorites = JSON.parse(localStorage.getItem('wishlistProducts') || '[]');
    
    // Combine for badge count
    const allFavoritesCount = Object.values(categorizedFavorites).reduce((sum, arr) => sum + arr.length, 0) + legacyFavorites.length;
    updateBadge('favoritesCount', allFavoritesCount);

    if (currentTabFavorites.length === 0 && (currentFavoritesTab !== 'tab1' || legacyFavorites.length === 0)) {
      grid.classList.remove('favorites-grid-glass');
      showEmptyState(grid, 'No favorites in this category', 'Drag images to the chat or click bookmark icons to add favorites');
      return;
    }

    // Render current tab favorites (new categorized system)
    currentTabFavorites.forEach(item => {
      const card = createFavoriteCard(item);
      grid.appendChild(card);
    });
    
    // Also show legacy favorites in tab1 (convert to glass card style)
    if (currentFavoritesTab === 'tab1') {
      legacyFavorites.forEach(product => {
        // Convert legacy product to new format
        const item = {
          src: product.image,
          title: product.title,
          addedAt: new Date().toISOString()
        };
        const card = createFavoriteCard(item);
      grid.appendChild(card);
      });
    }
  }
  
  // Create a favorite card from image data
  function createFavoriteCard(item) {
    // Glass card container (like explore cards)
    const card = createEl('div', { class: 'favorite-glass-card' });
    card.style.position = 'relative';
    
    // Inner white card
    const inner = createEl('div', { class: 'favorite-glass-card-inner' });
    
    // Image
    const img = createEl('img', {
      class: 'favorite-glass-card-image',
      src: item.src,
      alt: item.title || 'Favorite'
    });
    
    inner.appendChild(img);
    
    // Info section (outside the inner card, in the glass area)
    const info = createEl('div', { class: 'favorite-glass-card-info' });
    const title = createEl('h3', { 
      class: 'favorite-glass-card-title', 
      text: item.title || 'Campaign Image' 
    });
    const date = createEl('p', { 
      class: 'favorite-glass-card-date', 
      text: item.addedAt ? new Date(item.addedAt).toLocaleDateString() : '' 
    });
    
    // Remove button
    const removeBtn = createEl('button', { class: 'favorite-glass-card-remove' });
    removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromFavorites(item.src, currentFavoritesTab);
    });
    
    info.appendChild(title);
    info.appendChild(date);
    
    card.appendChild(removeBtn);
    card.appendChild(inner);
    card.appendChild(info);
    
    return card;
  }
  
  // Remove from favorites
  function removeFromFavorites(src, tab) {
    let favorites = JSON.parse(localStorage.getItem('categorizedFavorites') || '{}');
    if (favorites[tab]) {
      favorites[tab] = favorites[tab].filter(item => item.src !== src);
      localStorage.setItem('categorizedFavorites', JSON.stringify(favorites));
      renderFavorites();
      updateFavoritesBadge();
    }
  }
  
  // Update favorites badge
  function updateFavoritesBadge() {
    const categorizedFavorites = JSON.parse(localStorage.getItem('categorizedFavorites') || '{}');
    const legacyFavorites = JSON.parse(localStorage.getItem('wishlistProducts') || '[]');
    const allFavoritesCount = Object.values(categorizedFavorites).reduce((sum, arr) => sum + arr.length, 0) + legacyFavorites.length;
    updateBadge('favoritesCount', allFavoritesCount);
  }
  
  // Setup favorites tab listeners
  function setupFavoritesTabs() {
    const tabs = document.querySelectorAll('.favorites-tab');
    tabs.forEach(tab => {
      // Remove existing listeners by cloning
      const newTab = tab.cloneNode(true);
      tab.parentNode.replaceChild(newTab, tab);
      
      // Update active state
      if (newTab.dataset.tab === currentFavoritesTab) {
        newTab.classList.add('is-active');
      } else {
        newTab.classList.remove('is-active');
      }
      
      // Add click listener
      newTab.addEventListener('click', () => {
        currentFavoritesTab = newTab.dataset.tab;
        // Update tab styles
        document.querySelectorAll('.favorites-tab').forEach(t => t.classList.remove('is-active'));
        newTab.classList.add('is-active');
        // Re-render grid
        renderFavorites();
      });
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

  // Initialize demo data - always set to 5 cards (Initial Layout images)
  // These are the default canvas card images shown on page load
  function initializeDemoData() {
    const demoMedia = [
      {
        src: 'assets/canvas-1.jpg',  // Kusama sitting with polka dot fabric (B&W)
        productData: { title: 'Kusama Portrait - Polka Dot Room' }
      },
      {
        src: 'assets/canvas-2.jpg',  // Woman with blue circles on face
        productData: { title: 'Blue Face Paint Editorial' }
      },
      {
        src: 'assets/canvas-3.jpg',  // Kusama in polka dot outfit and hat (B&W)
        productData: { title: 'Kusama Polka Dot Outfit' }
      },
      {
        src: 'assets/canvas-4.jpg',  // Arm with blue dots holding blue LV bag
        productData: { title: 'LV x Kusama Blue Bag' }
      },
      {
        src: 'assets/canvas-5.jpg',  // Blue paint swatch
        productData: { title: 'Blue Paint Swatch' }
      }
    ];
    
    localStorage.setItem('galleryImages', JSON.stringify(demoMedia));
    
    // Reset drawer loaded state so it can be populated on card click
    currentLoadedCardIndex = -1;
    
    console.log('Demo media data initialized with 5 canvas cards');
  }

  // Initialize demo data
  initializeDemoData();

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
