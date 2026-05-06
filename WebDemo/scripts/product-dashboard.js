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

  function readStoredArray(key) {
    return window.ShopThatDashboardStorage
      ? window.ShopThatDashboardStorage.readArray(key)
      : [];
  }

  function readStoredObject(key) {
    return window.ShopThatDashboardStorage
      ? window.ShopThatDashboardStorage.readObject(key)
      : {};
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

  /** Render Luxury Intelligence API response (markdown + domain + ranked images) */
  function appendLuxuryIntelligenceToChat(chatMessages, data) {
    if (!chatMessages || !data) return;
    const wrap = createEl('div', { class: 'ai-chat-message ai' });
    const md = createEl('div', { class: 'ai-chat-markdown' });
    if (window.LuxuryIntelligence) {
      md.innerHTML = window.LuxuryIntelligence.markdownToHtml(data.answer || '');
    } else {
      md.textContent = data.answer || '';
    }
    wrap.appendChild(md);
    if (data.domain) {
      wrap.appendChild(createEl('div', { class: 'ai-chat-domain', text: String(data.domain) }));
    }
    chatMessages.appendChild(wrap);

    if (data.images && data.images.length) {
      const imageMessage = createEl('div', { class: 'ai-chat-message ai ai-chat-images-message' });
      const row = createEl('div', { class: 'ai-chat-images' });
      data.images.forEach(function (url) {
        const imageWrap = createEl('div', { class: 'ai-chat-image' });
        imageWrap.appendChild(createEl('img', { src: url, alt: '', loading: 'lazy' }));
        if (window.LuxuryIntelligence && window.LuxuryIntelligence.getImageRank) {
          const rank = window.LuxuryIntelligence.getImageRank(data.rank_data, url);
          const label = window.LuxuryIntelligence.getRankBadgeLabel(rank);
          if (label) {
            imageWrap.appendChild(createEl('span', { class: 'ai-chat-rank-badge', text: label }));
          }
        }
        row.appendChild(imageWrap);
      });
      imageMessage.appendChild(row);
      chatMessages.appendChild(imageMessage);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
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

  let currentView = 'media';
  let leafletMap = null;
  let locationMarkers = []; // Store location markers for cleanup
  
  const dashboardMapData = window.ShopThatDashboardMapData || {};
  const locationData = dashboardMapData.locationData || { restaurants: [], museums: [], galleries: [], others: [], stores: [] };
  const storeLocations = dashboardMapData.storeLocations || [
    { lat: 40.7632, lng: -73.9732, name: 'Louis Vuitton 57th Street', address: '6 E 57th St, New York, NY 10022' },
    { lat: 40.7245, lng: -73.9975, name: 'Louis Vuitton SoHo', address: '116 Greene St, New York, NY 10012' }
  ];
  locationData.stores = Array.isArray(locationData.stores) ? locationData.stores : storeLocations;
  const MIN_MAP_PRODUCTS = 3;
  const defaultMapProducts = [
    { id: 'default-map-capucines-bb', title: 'LV X YK CAPUCINES BB', model: 'M46401', price: '$6,400.00', image: 'assets/Products/0047_LV X YK Capucines BB.jpg' },
    { id: 'default-map-capucines-white', title: 'LV X YK CAPUCINES BB WHITE', model: 'M46402', price: '$6,400.00', image: 'assets/Products/0048_LV X YK Capucines BB-white.jpg' },
    { id: 'default-map-twist-mm', title: 'LV X YK TWIST MM RED WHITE', model: 'M46403', price: '$4,200.00', image: 'assets/Products/0049_Louis-Vuitton-x-Yayoi-Kusama-Twist-MM-Red-White.jpg' }
  ];

  // Default favorites that always appear in each Favorites tab.
  // Persistent across page loads and Clear All; cannot be removed by the user.
  const defaultFavoritesByTab = {
    // Products tab
    tab1: [
      {
        id: 'default-fav-keepall-50',
        title: 'LV X YK KEEPALL 50',
        src: 'assets/Products/0034_LV_X_YK_KEEPALL50.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-metal-studs-jacket',
        title: 'LV X YK METAL STUDS JACKET',
        src: 'assets/Products/0102_LV_X_YK_METAL_STUDS_METAL_JACKET.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-capucines-bb-silver',
        title: 'LV X YK CAPUCINES BB SILVER',
        src: 'assets/Products/0055_Louis-Vuitton-x-Yayoi-Kusama-Capucines-BB-Silver.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-gabardine-midi-skirt',
        title: 'LV X YK TECHNICAL GABARDINE MIDI SKIRT',
        src: 'assets/Products/0095_LV_X_YK_TECHNICAL_GABARDINE_MIDI_SKIRT.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-shirt-dress-rouge',
        title: 'LV X YK INFINITY DOTS SHIRT DRESS',
        src: 'assets/Products/0093_Louis-Vuitton-x-Yayoi-Kusama-Infinity-Dots-Monogram-Shirt-Dress-Rouge-Vif-Red-White.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      }
    ],
    // Campaign Images tab
    tab2: [
      {
        id: 'default-fav-campaign-he-cong',
        title: 'He Cong - LV Speedy Bandouliere - Kusama 2023',
        src: 'assets/Campaigns/He_Cong_LV_Speedy_Bandouliere_Kusama_2023.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-campaign-yayoi-omotesando',
        title: 'Yayoi Kusama at LV Store, Omotesando Tokyo 2023',
        src: 'assets/Campaigns/Yayoi_Kusama_LV_Store_Omotesando_Tokyo_2023.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-campaign-gisele',
        title: 'Gisele Bundchen - LV x Kusama Alma Pumpkin Bag',
        src: 'assets/Campaigns/Gisele_Bundchen_LV_Kusama_Alma_Pumpkin_Yellow.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-campaign-zhou-dangyu',
        title: 'Zhou Dangyu - LV x Kusama Pumpkin 2023',
        src: 'assets/Campaigns/Zhou_Dangyu_LV_Pumpkin_Kusama_2023.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      }
    ],
    // Art tab
    tab3: [
      {
        id: 'default-fav-art-camille-henrot',
        title: 'Camille Henrot - Wet Job, 2020',
        src: 'assets/Art/Camille_Henrot_Wet_Job_2020.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-richard-serra',
        title: 'Richard Serra - Transmitter, 2020',
        src: 'assets/Art/Richard_Serra_Transmitter_2020.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-christina-quarles',
        title: 'Christina Quarles - Is This The Return to Oz?, 2025',
        src: 'assets/Art/Christina_Quarles_Is_This_The_Return_to_Oz_2025.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-tom-wesselmann',
        title: 'Tom Wesselmann - Still Life #44, 1964',
        src: 'assets/Art/Tom_Wesselmann_Still_Life_44_1964.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-lynette-yiadom-boakye',
        title: 'Lynette Yiadom-Boakye - Willow Strip, 2017',
        src: 'assets/Art/Lynette_Yiadom-Boakye_Willow_Strip_2017.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-larry-bell',
        title: 'Larry Bell - Pacific Red, 2016 (Whitney Museum)',
        src: 'assets/Art/Larry_Bell_Pacific_Red_2016_Whitney_Museum.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-roberto-cuoghi',
        title: 'Roberto Cuoghi - SS XCP (c), 2018',
        src: 'assets/Art/Roberto_Cuoghi_SS_XCP_c_2018.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-albert-oehlen-baum-84',
        title: 'Albert Oehlen - Baum 84 / Untitled, 2016',
        src: 'assets/Art/Albert_Oehlen_Baum_84_Untitled_2016.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-anselm-kiefer-san-loreto',
        title: 'Anselm Kiefer - San Loreto, 2009-2010',
        src: 'assets/Art/Anselm_Kiefer_San_Loreto_2009_2010.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-lauren-halsey-main-discount',
        title: 'Lauren Halsey - Main Discount, 2023',
        src: 'assets/Art/Lauren_Halsey_Main_Discount_2023.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-giuseppe-penone-anatomia',
        title: 'Giuseppe Penone - Anatomia (Anatomy), 2011',
        src: 'assets/Art/Giuseppe_Penone_Anatomia_Anatomy_2011.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-richard-serra-transmitter-side-alt',
        title: 'Richard Serra - Transmitter, 2020 (side view)',
        src: 'assets/Art/Richard_Serra_Transmitter_2020_Side_View_Alt.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-mary-weatherford-coney-island',
        title: 'Mary Weatherford - Coney Island II, 2012',
        src: 'assets/Art/Mary_Weatherford_Coney_Island_II_2012.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-ashley-bickerton-orange-shark',
        title: 'Ashley Bickerton - Orange Shark, 2008',
        src: 'assets/Art/Ashley_Bickerton_Orange_Shark_2008.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-takashi-murakami-white-lv-monogram',
        title: 'Takashi Murakami - White LV Multicolored Monogram, 2025',
        src: 'assets/Art/Takashi_Murakami_White_LV_Multicolored_Monogram_2025.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-takashi-murakami-exhibit-view',
        title: 'Takashi Murakami - Exhibit View, LV Monogram Flowers, 2025',
        src: 'assets/Art/Takashi_Murakami_Exhibit_View_LV_Monogram_Flowers_2025.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-titus-kaphar-novel-iconographies',
        title: 'Titus Kaphar - Novel Iconographies III, 2025',
        src: 'assets/Art/Titus_Kaphar_Novel_Iconographies_III_2025.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-anselm-kiefer-exodus',
        title: 'Anselm Kiefer - Exodus, 2022',
        src: 'assets/Art/Anselm_Kiefer_Exodus_2022.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-anselm-kiefer-transition-book-cover',
        title: 'Anselm Kiefer - Transition from Cool to Warm (Book Cover)',
        src: 'assets/Art/Anselm_Kiefer_Transition_from_Cool_to_Warm_Book_Cover.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-ashley-bickerton-seascape',
        title: 'Ashley Bickerton - Seascape / Ocean Chunk, 2017',
        src: 'assets/Art/Ashley_Bickerton_Seascape_Ocean_Chunk_2017.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-giuseppe-penone-sigillo',
        title: 'Giuseppe Penone - Sigillo (Seal), 2012',
        src: 'assets/Art/Giuseppe_Penone_Versailles_Sigillo_2012_Seal_White_Marble.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-john-currin-maenads',
        title: 'John Currin - Maenads, 2015',
        src: 'assets/Art/John_Currin_Maenads_2015.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-albert-oehlen-i-11',
        title: 'Albert Oehlen - I 11, 2009',
        src: 'assets/Art/Albert_Oehlen_I_11_2009.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-urs-fischer-foamcore',
        title: 'Urs Fischer - Foamcore, 2017',
        src: 'assets/Art/Urs_Fischer_Foamcore_2017.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-helen-frankenthaler-reef',
        title: 'Helen Frankenthaler - Reef, 1991',
        src: 'assets/Art/Helen_Frankenthaler_Reef_1991.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-lauren-halsey-loro-plaza',
        title: 'Lauren Halsey - Loro Plaza II, 2025',
        src: 'assets/Art/Lauren_Halsey_Loro_Plaza_II_2025.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-marc-newson-magnolia-chair',
        title: 'Marc Newson - Cloisonne Magnolia Chair, 2017',
        src: 'assets/Art/Marc_Newson_Cloisonne_Magnolia_Chair_2017.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-marc-newson-surfboards',
        title: 'Marc Newson - Installation View, Surfboards, 2019',
        src: 'assets/Art/Marc_Newson_Installation_View_Surfboards_2019.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-sterling-ruby-turbine',
        title: 'Sterling Ruby - TURBINE. SHAKING HAND WITH BOMBS (RIGHT), 2022',
        src: 'assets/Art/Sterling_Ruby_Turbine_Shaking_Hand_With_Bombs_Right_2022.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-takashi-murakami-hiroshige',
        title: 'Takashi Murakami - Hiroshige 100 Famous Views of Edo, 2025',
        src: 'assets/Art/Takashi_Murakami_Hiroshige_100_Famous_Views_of_Edo_2025.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-tom-wesselmann-still-life-alt',
        title: 'Tom Wesselmann - Still Life #44, 1964',
        src: 'assets/Art/Tom_Wesselmann_Still_Life_44_1964_Alt.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-helen-frankenthaler-santa-fe',
        title: 'Helen Frankenthaler - Santa Fe XIII, 1990 (detail)',
        src: 'assets/Art/Helen_Frankenthaler_Santa_Fe_XIII_1990_Detail.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-jade-fadojutimi-generosity',
        title: 'Jade Fadojutimi - The Generosity of Trauma, 2024',
        src: 'assets/Art/Jade_Fadojutimi_The_Generosity_of_Trauma_2024.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-titus-kaphar-heard-you',
        title: 'Titus Kaphar - I heard you in my head, 2023',
        src: 'assets/Art/Titus_Kaphar_I_Heard_You_in_My_Head_2023.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-richard-serra-transmitter-alt',
        title: 'Richard Serra - Transmitter, 2020',
        src: 'assets/Art/Richard_Serra_Transmitter_2020_Alt.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      },
      {
        id: 'default-fav-art-titus-kaphar-douglas-street',
        title: 'Titus Kaphar - Do You Remember Douglas Street, 2023-24',
        src: 'assets/Art/Titus_Kaphar_Do_You_Remember_Douglas_Street_2023_24.png',
        addedAt: '2026-05-06T00:00:00.000Z',
        isDefaultFavorite: true
      }
    ]
  };

  // Backward-compatible alias used by older code paths
  const defaultFavoriteProducts = defaultFavoritesByTab.tab1;

  // Total count of all persistent default favorites across tabs
  const defaultFavoritesTotalCount = Object.values(defaultFavoritesByTab)
    .reduce((sum, arr) => sum + arr.length, 0);

  // Map of tab => Set of default srcs, used to dedupe when rendering
  const defaultFavoriteSrcsByTab = Object.fromEntries(
    Object.entries(defaultFavoritesByTab).map(([tab, items]) => [tab, new Set(items.map(i => i.src))])
  );

  function getProductKey(product) {
    return String(product?.id || product?.model || product?.title || product?.image || product?.src || '').toLowerCase();
  }

  function getMapProductsWithFallback(products) {
    const mapProducts = (Array.isArray(products) ? products : []).filter(Boolean).map(product => ({ ...product }));
    const existingKeys = new Set(mapProducts.map(getProductKey));

    defaultMapProducts.forEach(product => {
      if (mapProducts.length >= MIN_MAP_PRODUCTS) return;
      if (existingKeys.has(getProductKey(product))) return;

      mapProducts.push({ ...product, isDefaultMapProduct: true });
      existingKeys.add(getProductKey(product));
    });

    return mapProducts;
  }

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
    const products = readStoredArray('droppedProducts');
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
    
    // Handle send — LV Luxury Intelligence API
    function sendMessage() {
      const message = chatInput.value.trim();
      if (!message) return;
      if (!window.LuxuryIntelligence) {
        addMessage('Luxury Intelligence is not loaded. Refresh the page.', false);
        return;
      }
      addMessage(message, true);
      chatInput.value = '';
      if (chatSend) {
        chatSend.style.transform = 'scale(0.9)';
        setTimeout(() => { chatSend.style.transform = ''; }, 200);
      }
      const typing = createEl('div', { class: 'ai-chat-message ai ai-chat-typing' });
      typing.textContent = ((window.LuxuryIntelligence && window.LuxuryIntelligence.ANALYZING_TEXT) || 'Analyzing Luxury Catalogs') + '...';
      chatMessages.appendChild(typing);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      window.LuxuryIntelligence.ask(message).then(function (data) {
        typing.remove();
        appendLuxuryIntelligenceToChat(chatMessages, data);
        updateButtonStates();
      }).catch(function (err) {
        console.error(err);
        typing.remove();
        addMessage('Could not reach Luxury Intelligence. Try again.', false);
      });
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
      
      const filename = imageSrc.split('/').pop().replace(/\.(jpg|png|jpeg|gif)$/i, '');
      previewStatus.textContent = 'Asking Luxury Intelligence…';

      (async function analyzeDrop() {
        try {
          if (!window.LuxuryIntelligence) throw new Error('no client');
          const q =
            'User shared a Louis Vuitton campaign or product image. File: ' +
            filename +
            '. Describe visual themes, Kusama motifs, and product context if inferable.';
          const data = await window.LuxuryIntelligence.ask(q);
          previewStatus.textContent = 'Analysis complete';
          appendLuxuryIntelligenceToChat(messagesContainer, data);
          addToFavorites(imageSrc, 'tab1');
          previewStatus.textContent = 'Added to Favorites';
          previewStatus.style.color = '#333';
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (e) {
          console.error(e);
          previewStatus.textContent = 'Analysis unavailable';
          addMessage(
            'Luxury Intelligence could not analyze this image. It was still saved to your favorites.',
            false
          );
          addToFavorites(imageSrc, 'tab1');
        }
      })();
    }
    
    // Add image to favorites
    function addToFavorites(imageSrc, tab = 'tab1') {
      let favorites = readStoredObject('categorizedFavorites');
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
    
    // Handle send — LV Luxury Intelligence API (map context)
    function sendMessage() {
      if (!chatInput || !chatMessages) return;
      const message = chatInput.value.trim();
      if (!message) return;
      if (!window.LuxuryIntelligence) {
        addMessage('Luxury Intelligence is not loaded. Refresh the page.', false);
        return;
      }
      const contextual =
        message +
        ' (Context: user is exploring Louis Vuitton NYC map — SoHo, 57th St, museums, galleries, restaurants, hotels.)';
      addMessage(message, true);
      chatInput.value = '';
      if (chatSend) {
        chatSend.style.transform = 'scale(0.9)';
        setTimeout(() => { chatSend.style.transform = ''; }, 200);
      }
      const typing = createEl('div', { class: 'ai-chat-message ai ai-chat-typing' });
      typing.textContent = ((window.LuxuryIntelligence && window.LuxuryIntelligence.ANALYZING_TEXT) || 'Analyzing Luxury Catalogs') + '...';
      chatMessages.appendChild(typing);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      window.LuxuryIntelligence.ask(contextual).then(function (data) {
        typing.remove();
        appendLuxuryIntelligenceToChat(chatMessages, data);
        updateButtonStates();
      }).catch(function (err) {
        console.error(err);
        typing.remove();
        addMessage('Could not reach Luxury Intelligence. Try again.', false);
      });
    }

    if (chatSend) {
      chatSend.addEventListener('click', sendMessage);
    }

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

  // ===== Smooth Drag & Drop Coordination =====
  // Shared controllers so renderMedia (canvas) and setupMyMediaDrawer can talk
  // to each other for incremental, animated updates (no full re-render on drop).
  const mediaController = {
    addCardFromDrop: null,    // (src, dropX, dropY) => HTMLElement
    removeCardBySrc: null,    // (src) => boolean
    getGridEl: null,          // () => HTMLElement
  };

  const drawerController = {
    prependImageSmoothly: null, // (src) => void
    removeImageSmoothly: null,  // (src) => void
    hasImage: null,             // (src) => boolean
  };

  // Sources of images the user has dragged into My Media. Persisted for the
  // session so they survive focus/unfocus and switching between cards (which
  // overwrite the curated drawer set).
  const userDroppedSrcs = new Set();

  // Build a drawer-image element with a bookmark button + smooth pointer
  // drag. Used both by the curated drawer (with click-to-focus) and the
  // initial / reset drawer (no focus callback). Defined at module level so
  // setupMyMediaDrawer and renderMedia share the exact same markup.
  function buildDrawerImageWithBookmark(src, index, onFocusClick) {
    const wrapper = createEl('div', { class: 'my-media-image-wrapper' });

    const img = createEl('img', {
      class: 'my-media-image',
      src: src,
      alt: `Media ${index + 1}`
    });

    const bookmarkBtn = createEl('button', { class: 'my-media-bookmark-btn' });
    bookmarkBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const favorites = readStoredObject('categorizedFavorites');
    const isBookmarked = Object.values(favorites).some(arr => arr.some(item => item.src === src));
    if (isBookmarked) bookmarkBtn.classList.add('is-bookmarked');

    bookmarkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowBookmarked = bookmarkBtn.classList.toggle('is-bookmarked');
      if (nowBookmarked && window.addToFavorites) window.addToFavorites(src, 'tab1');
      else removeFromFavorites(src, 'tab1');
    });

    // Smooth floating-clone drag (replaces native HTML5 drag preview)
    attachDrawerImageDrag(img, wrapper, src);

    if (typeof onFocusClick === 'function') {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        onFocusClick(src);
      });
    }
    img.style.cursor = 'pointer';

    wrapper.appendChild(img);
    wrapper.appendChild(bookmarkBtn);
    return wrapper;
  }

  // Tracks the currently-active drawer-image drag (only one at a time)
  let activeDrawerDrag = null;

  // Attach unified pointer-drag handlers to a drawer image. Replaces the
  // jerky native HTML5 drag preview with a smooth floating clone that follows
  // the cursor and morphs into a card when dropped on the canvas.
  function attachDrawerImageDrag(img, wrapper, src) {
    img.draggable = false;
    img.addEventListener('dragstart', (e) => e.preventDefault());

    function onPointerDown(clientX, clientY, originalEvent) {
      if (activeDrawerDrag) return; // Only one drag at a time
      if (originalEvent && originalEvent.target && originalEvent.target.closest && originalEvent.target.closest('.my-media-bookmark-btn')) return;

      const rect = img.getBoundingClientRect();
      activeDrawerDrag = {
        img,
        wrapper,
        src,
        startX: clientX,
        startY: clientY,
        originRect: rect,
        clone: null,
        dragStarted: false,
        lastClientX: clientX,
        lastClientY: clientY,
        downAt: Date.now(),
      };

      if (originalEvent && typeof originalEvent.preventDefault === 'function') {
        originalEvent.preventDefault();
      }
    }

    img.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      onPointerDown(e.clientX, e.clientY, e);
    });

    img.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      onPointerDown(t.clientX, t.clientY, e);
    }, { passive: false });
  }

  // Convert a touch event into a pointer-like move/up
  function _readClient(e) {
    if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  // Global pointer-move/up handlers for drawer drag (always installed once)
  function _drawerDragMove(e) {
    if (!activeDrawerDrag) return;
    const { x, y } = _readClient(e);
    const drag = activeDrawerDrag;
    drag.lastClientX = x;
    drag.lastClientY = y;

    const dx = x - drag.startX;
    const dy = y - drag.startY;

    // Start the drag once we exceed a 6px threshold (so taps still register)
    if (!drag.dragStarted && Math.hypot(dx, dy) > 6) {
      drag.dragStarted = true;

      // Cache the click offset relative to the image's top-left so the clone
      // tracks under the cursor at exactly the point where it was grabbed.
      drag.offsetX = drag.startX - drag.originRect.left;
      drag.offsetY = drag.startY - drag.originRect.top;

      const clone = document.createElement('img');
      clone.src = drag.src;
      clone.className = 'media-drag-clone';
      clone.style.width = drag.originRect.width + 'px';
      clone.style.height = drag.originRect.height + 'px';
      // Start at the image's exact origin (visually identical to the source)
      clone.style.transform = `translate(${drag.originRect.left}px, ${drag.originRect.top}px) scale(1)`;
      document.body.appendChild(clone);
      drag.clone = clone;

      drag.img.classList.add('is-dragging-source');

      // Next frame: enable smooth scale-up morph and snap under the cursor.
      // The .is-morphing class enables the transform transition for this pop.
      requestAnimationFrame(() => {
        if (!drag.clone) return;
        drag.clone.classList.add('is-morphing');
        const tx = x - drag.offsetX;
        const ty = y - drag.offsetY;
        drag.clone.style.transform = `translate(${tx}px, ${ty}px) scale(1.16)`;
        // After the morph completes, drop the transition so subsequent moves
        // are perfectly responsive (no lag).
        setTimeout(() => {
          if (drag.clone) drag.clone.classList.remove('is-morphing');
        }, 280);
      });
    }

    if (drag.dragStarted && drag.clone) {
      const tx = x - drag.offsetX;
      const ty = y - drag.offsetY;
      // Direct transform update — no transition while following the cursor.
      drag.clone.style.transform = `translate(${tx}px, ${ty}px) scale(1.16)`;

      // Highlight the canvas grid as a drop target when the cursor is over it
      const grid = mediaController.getGridEl ? mediaController.getGridEl() : document.getElementById('mediaGrid');
      if (grid) {
        const gr = grid.getBoundingClientRect();
        const isOver = x >= gr.left && x <= gr.right && y >= gr.top && y <= gr.bottom;
        grid.classList.toggle('drag-target-active', isOver);
      }
    }

    if (e.cancelable && drag.dragStarted) e.preventDefault();
  }

  function _drawerDragEnd(e) {
    if (!activeDrawerDrag) return;
    const drag = activeDrawerDrag;
    activeDrawerDrag = null;

    const { x, y } = _readClient(e);
    const grid = mediaController.getGridEl ? mediaController.getGridEl() : document.getElementById('mediaGrid');
    if (grid) grid.classList.remove('drag-target-active');

    // Was just a tap → treat as a click on the image (don't preventDefault)
    if (!drag.dragStarted) return;

    let isOverCanvas = false;
    if (grid) {
      const gr = grid.getBoundingClientRect();
      isOverCanvas = x >= gr.left && x <= gr.right && y >= gr.top && y <= gr.bottom;
    }

    if (isOverCanvas && mediaController.addCardFromDrop) {
      // Hand off to renderMedia: the new card will animate in from the drop point
      mediaController.addCardFromDrop(drag.src, x, y, drag.clone);
      // Remove the source thumbnail from the drawer (transfer, not copy)
      if (drawerController.removeImageSmoothly) {
        drawerController.removeImageSmoothly(drag.src);
      }
    } else {
      // Animate the clone back to its origin then dispose
      if (drag.clone) {
        const c = drag.clone;
        c.classList.add('is-morphing');
        c.style.transform = `translate(${drag.originRect.left}px, ${drag.originRect.top}px) scale(1)`;
        c.style.opacity = '0.4';
        setTimeout(() => {
          if (c && c.parentNode) c.parentNode.removeChild(c);
        }, 300);
      }
      // Restore the source thumbnail
      drag.img.classList.remove('is-dragging-source');
    }
  }

  document.addEventListener('mousemove', _drawerDragMove, { passive: false });
  document.addEventListener('mouseup', _drawerDragEnd);
  document.addEventListener('touchmove', _drawerDragMove, { passive: false });
  document.addEventListener('touchend', _drawerDragEnd);
  document.addEventListener('touchcancel', _drawerDragEnd);

  // Setup My Media Drawer
  function setupMyMediaDrawer() {
    const drawerImages = document.getElementById('drawerImages');
    const scrollContainer = document.getElementById('mediaScrollContainer');
    const leftBtn = document.getElementById('scrollLeft');
    const rightBtn = document.getElementById('scrollRight');
    const drawer = document.querySelector('.my-media-drawer');

    // Start with the persistent user-dropped images visible (placeholder if none).
    // Curated images are only loaded when a card is focused.
    if (currentLoadedCardIndex === -1) {
      localStorage.setItem('drawerImages', JSON.stringify(Array.from(userDroppedSrcs)));
    }

    function showPlaceholder() {
      drawerImages.replaceChildren();
      const placeholder = createEl('div', {
        class: 'drawer-placeholder',
        text: 'Click an image card to load curated media'
      });
      placeholder.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: rgba(0,0,0,0.4); font-size: 14px; font-style: italic; padding: 20px; text-align: center;';
      drawerImages.appendChild(placeholder);
    }

    // Render the drawer from current localStorage state. Uses the same
    // wrapper+bookmark structure everywhere so user-dropped and curated
    // images look identical.
    function populateDrawer() {
      const list = readStoredArray('drawerImages');
      if (list.length === 0) { showPlaceholder(); return; }
      drawerImages.replaceChildren();
      list.forEach((src, idx) => {
        drawerImages.appendChild(buildDrawerImageWithBookmark(src, idx));
      });
    }

    populateDrawer();

    // Wire up the drawer controller so renderMedia can incrementally update us
    drawerController.hasImage = function(src) {
      return readStoredArray('drawerImages').includes(src);
    };

    drawerController.prependImageSmoothly = function(src) {
      // Track in the persistent session set so this image survives focus
      // changes (which overwrite the curated drawer set).
      userDroppedSrcs.add(src);

      const list = readStoredArray('drawerImages');
      if (list.includes(src)) return;
      list.unshift(src);
      localStorage.setItem('drawerImages', JSON.stringify(list));

      // Remove any placeholder
      const placeholder = drawerImages.querySelector('.drawer-placeholder');
      if (placeholder) placeholder.remove();

      const wrapper = buildDrawerImageWithBookmark(src, 0);
      wrapper.classList.add('is-entering');
      drawerImages.insertBefore(wrapper, drawerImages.firstChild);
      setTimeout(() => wrapper.classList.remove('is-entering'), 450);
    };

    drawerController.removeImageSmoothly = function(src) {
      // Remove from the persistent session set too — the user explicitly
      // moved this image off the drawer (back to canvas).
      userDroppedSrcs.delete(src);

      const list = readStoredArray('drawerImages');
      const idx = list.indexOf(src);
      if (idx > -1) {
        list.splice(idx, 1);
        localStorage.setItem('drawerImages', JSON.stringify(list));
      }

      // Find the matching DOM nodes (could be the bare img or a wrapper)
      // and animate the outermost match out.
      const imgs = Array.from(drawerImages.querySelectorAll('img.my-media-image'))
        .filter(el => el.getAttribute('src') === src);
      const targets = new Set();
      imgs.forEach(img => {
        const wrap = img.closest('.my-media-image-wrapper');
        targets.add(wrap || img);
      });
      targets.forEach(el => {
        el.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.5)';
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
          // Show placeholder if drawer is now empty (only when there was no curated set)
          if (drawerImages.children.length === 0) {
            const stillHas = readStoredArray('drawerImages').length > 0;
            if (!stillHas) showPlaceholder();
          }
        }, 200);
      });
    };

    // Fade in drawer after a short delay
    setTimeout(() => {
      drawer.classList.add('loaded');
    }, 200);

    // Scroll functionality
    let scrollPosition = 0;
    const scrollAmount = 224;

    leftBtn.onclick = () => {
      scrollPosition = Math.max(0, scrollPosition - scrollAmount);
      drawerImages.style.transform = `translateX(-${scrollPosition}px)`;
    };

    rightBtn.onclick = () => {
      const maxScroll = drawerImages.scrollWidth - scrollContainer.clientWidth;
      scrollPosition = Math.min(maxScroll, scrollPosition + scrollAmount);
      drawerImages.style.transform = `translateX(-${scrollPosition}px)`;
    };
  }

  // Render Media Gallery
  function renderMedia(filter = 'content') {
    const grid = document.getElementById('mediaGrid');
    grid.replaceChildren();

    // Get media from localStorage (gallery images)
    const mediaJson = localStorage.getItem('galleryImages');
    console.log('Raw galleryImages from localStorage:', mediaJson);
    const media = readStoredArray('galleryImages');
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

    // Ensure every media item has a stable position (persisted, so re-renders
    // don't reshuffle and so newly-dropped cards stay where the user put them).
    let positionsChanged = false;
    media.forEach((item, idx) => {
      if (!item.position || typeof item.position.x !== 'number') {
        item.position = generateStackedPositions(idx + 1)[idx];
        positionsChanged = true;
      }
    });
    if (positionsChanged) {
      localStorage.setItem('galleryImages', JSON.stringify(media));
    }

    // Persist a card's current position back to its underlying media item
    function persistCardPosition(card) {
      if (!card._mediaItem) return;
      card._mediaItem.position = {
        x: parseFloat(card.dataset.originalX),
        y: parseFloat(card.dataset.originalY),
        rotation: parseFloat(card.dataset.originalRotation)
      };
      const list = readStoredArray('galleryImages');
      const i = list.findIndex(m => m.src === card._mediaItem.src);
      if (i > -1) {
        list[i] = card._mediaItem;
        localStorage.setItem('galleryImages', JSON.stringify(list));
      }
    }

    // Build a single media-card element with all behaviors. Reusable so we
    // can incrementally insert cards on a drop without re-rendering everything.
    function createMediaCardElement(item, index) {
      const glassContainer = createEl('div', { class: 'dashboard-media-container' });
      glassContainer._mediaItem = item;

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
          if (window.addToFavorites) window.addToFavorites(item.src, 'tab1');
        } else {
          bookmarkSvg.setAttribute('fill', 'none');
          removeFromFavorites(item.src, 'tab1');
        }
      });

      mediaCard.appendChild(img);
      glassContainer.appendChild(bookmarkBtn);
      glassContainer.appendChild(mediaCard);

      const pos = item.position;
      glassContainer.style.left = pos.x + 'px';
      glassContainer.style.top = pos.y + 'px';
      glassContainer.style.transform = `rotate(${pos.rotation}deg) scale(0.95)`;
      glassContainer.style.zIndex = index + 1;
      glassContainer.style.opacity = '0';

      glassContainer.dataset.originalX = pos.x;
      glassContainer.dataset.originalY = pos.y;
      glassContainer.dataset.originalRotation = pos.rotation;
      glassContainer.dataset.originalZIndex = index + 1;

      // Per-card drag state (closure)
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

      glassContainer.addEventListener('click', (e) => {
        if (e.target.closest('.media-action-btn')) return;
        e.stopPropagation();
        if (!dragStarted) {
          if (focusedCard === glassContainer) unfocusAllCards();
          else focusCard(glassContainer);
        }
      });

      function dragStart(e) {
        if (glassContainer.classList.contains('focused') || glassContainer.classList.contains('unfocused')) return;
        if (e.target.closest('.media-action-btn')) return;
        if (e.target === glassContainer || glassContainer.contains(e.target)) {
          activeCard = glassContainer;
          dragStarted = false;
          if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX;
            initialY = e.touches[0].clientY;
          } else {
            initialX = e.clientX;
            initialY = e.clientY;
          }
        }
      }

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
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        currentX = mouseX - initialX;
        currentY = mouseY - initialY;

        if (activeCard && !dragStarted && (Math.abs(currentX) > 5 || Math.abs(currentY) > 5)) {
          dragStarted = true;
          isDragging = true;
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
        }

        if (isDragging && activeCard === glassContainer) {
          e.preventDefault();
          xOffset = currentX;
          yOffset = currentY;
          const rotation = glassContainer.dataset.originalRotation;
          glassContainer.style.left = (fixedStartLeft + currentX) + 'px';
          glassContainer.style.top = (fixedStartTop + currentY) + 'px';
          glassContainer.style.transform = `rotate(${rotation}deg) scale(1)`;

          const drawer = document.querySelector('.my-media-drawer');
          const dropIndicator = document.getElementById('dropIndicator');
          const chatPrompt = document.querySelector('.ai-chat-prompt');
          const currentMouseX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
          const currentMouseY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

          if (chatPrompt) {
            const chatRect = chatPrompt.getBoundingClientRect();
            const isOverChat = currentMouseX >= chatRect.left && currentMouseX <= chatRect.right
                            && currentMouseY >= chatRect.top && currentMouseY <= chatRect.bottom;
            chatPrompt.classList.toggle('drag-over', isOverChat);
          }

          if (drawer) {
            const drawerRect = drawer.getBoundingClientRect();
            const isOverDrawer = currentMouseX >= drawerRect.left && currentMouseX <= drawerRect.right
                              && currentMouseY >= drawerRect.top && currentMouseY <= drawerRect.bottom;
            drawer.classList.toggle('drag-target-active', isOverDrawer);
            if (dropIndicator) dropIndicator.classList.toggle('show', isOverDrawer);
          }
        }
      }

      function dragEnd(e) {
        if (activeCard !== glassContainer) return;
        const wasDragging = isDragging;
        isDragging = false;
        dragStarted = false;
        activeCard = null;
        if (!wasDragging) return;

        glassContainer.style.cursor = 'grab';
        glassContainer.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        glassContainer.style.pointerEvents = 'auto';

        const mouseX = lastMouseX || e.clientX || 0;
        const mouseY = lastMouseY || e.clientY || 0;

        // Drop on AI Chat
        const chatPrompt = document.querySelector('.ai-chat-prompt');
        if (chatPrompt) {
          chatPrompt.classList.remove('drag-over');
          const chatRect = chatPrompt.getBoundingClientRect();
          const isOverChat = mouseX >= chatRect.left && mouseX <= chatRect.right
                          && mouseY >= chatRect.top && mouseY <= chatRect.bottom;
          if (isOverChat) {
            if (window.handleDroppedImageFromCard) window.handleDroppedImageFromCard(item.src);
            glassContainer.style.position = 'absolute';
            glassContainer.style.left = glassContainer.dataset.originalX + 'px';
            glassContainer.style.top = glassContainer.dataset.originalY + 'px';
            glassContainer.style.transform = `rotate(${glassContainer.dataset.originalRotation}deg) scale(0.95)`;
            glassContainer.style.zIndex = glassContainer.dataset.originalZIndex;
            xOffset = 0; yOffset = 0;
            return;
          }
        }

        // Drop on My Media drawer → smooth transfer
        const drawer = document.querySelector('.my-media-drawer');
        if (drawer) {
          const drawerRect = drawer.getBoundingClientRect();
          const isOverDrawer = mouseX >= drawerRect.left && mouseX <= drawerRect.right
                            && mouseY >= drawerRect.top && mouseY <= drawerRect.bottom;
          if (isOverDrawer) {
            transferCardToDrawer(glassContainer, item);
            return;
          }
        }

        // Normal drag-and-release on the canvas — keep card at new spot
        glassContainer.style.position = 'absolute';
        glassContainer.style.zIndex = glassContainer.dataset.originalZIndex;
        const newAbsoluteX = parseFloat(glassContainer.dataset.originalX) + xOffset;
        const newAbsoluteY = parseFloat(glassContainer.dataset.originalY) + yOffset;
        glassContainer.dataset.originalX = newAbsoluteX;
        glassContainer.dataset.originalY = newAbsoluteY;
        glassContainer.style.left = newAbsoluteX + 'px';
        glassContainer.style.top = newAbsoluteY + 'px';
        xOffset = 0; yOffset = 0;
        persistCardPosition(glassContainer);
      }

      glassContainer._dragHandler = drag;
      glassContainer._dragEndHandler = dragEnd;
      glassContainer.addEventListener('mousedown', dragStart);
      glassContainer.addEventListener('touchstart', dragStart);

      return glassContainer;
    }

    // Smoothly transfer a card on the canvas → into the My Media drawer.
    // Animates the card flying to the drawer's first slot, then disposes it
    // and inserts a thumbnail with a pop-in animation. No full re-render.
    function transferCardToDrawer(glassContainer, item) {
      const drawer = document.querySelector('.my-media-drawer');
      const drawerImages = document.getElementById('drawerImages');
      const dropIndicator = document.getElementById('dropIndicator');

      const cardRect = glassContainer.getBoundingClientRect();
      // Target = first slot of the drawer (or just inside the drawer if empty)
      let targetX, targetY;
      const firstSlot = drawerImages && drawerImages.firstElementChild;
      if (firstSlot && !firstSlot.classList.contains('drawer-placeholder')) {
        const slotRect = firstSlot.getBoundingClientRect();
        targetX = slotRect.left;
        targetY = slotRect.top;
      } else {
        const dr = drawerImages.getBoundingClientRect();
        targetX = dr.left + 12;
        targetY = dr.top + 12;
      }

      glassContainer.style.transition = 'transform 0.42s cubic-bezier(0.65, 0, 0.35, 1), left 0.42s cubic-bezier(0.65, 0, 0.35, 1), top 0.42s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.42s ease';
      glassContainer.style.position = 'fixed';
      glassContainer.style.left = targetX + 'px';
      glassContainer.style.top = targetY + 'px';
      // Card is roughly 290px wide; drawer thumb is 90px → scale ~0.31
      const scaleTarget = 90 / Math.max(cardRect.width, 1);
      glassContainer.style.transform = `rotate(0deg) scale(${scaleTarget.toFixed(3)})`;
      glassContainer.style.transformOrigin = 'top left';
      glassContainer.style.opacity = '0.55';
      glassContainer.style.zIndex = '99999';

      if (dropIndicator) dropIndicator.classList.remove('show');
      if (drawer) drawer.classList.remove('drag-target-active');

      setTimeout(() => {
        // Update gallery storage
        const list = readStoredArray('galleryImages');
        const idx = list.findIndex(m => m.src === item.src);
        if (idx > -1) {
          list.splice(idx, 1);
          localStorage.setItem('galleryImages', JSON.stringify(list));
        }

        // Remove from canvas
        const cIdx = cards.indexOf(glassContainer);
        if (cIdx > -1) cards.splice(cIdx, 1);
        if (glassContainer.parentNode) glassContainer.parentNode.removeChild(glassContainer);

        // Add to drawer (smooth pop-in)
        if (drawerController.prependImageSmoothly) {
          drawerController.prependImageSmoothly(item.src);
        }

        updateBadge('mediaCount', list.length);
      }, 420);
    }

    // Smoothly add a brand new card from a drawer-image drop. The floating
    // clone (if provided) is faded out as the real card animates into place.
    function addCardFromDrop(src, dropX, dropY, sourceClone) {
      const gridRect = grid.getBoundingClientRect();
      // Card is ~290px wide, ~370px tall (with padding); center on cursor
      const cardW = 290;
      const cardH = 370;
      const cardX = dropX - gridRect.left - cardW / 2;
      const cardY = dropY - gridRect.top - cardH / 2;
      const rotation = (_seedRand(Date.now() * 0.001) - 0.5) * 6;

      const item = {
        src,
        productData: { title: 'Dropped Image' },
        position: { x: cardX, y: cardY, rotation }
      };
      const list = readStoredArray('galleryImages');
      list.push(item);
      localStorage.setItem('galleryImages', JSON.stringify(list));

      const card = createMediaCardElement(item, list.length - 1);
      // Clear the inline opacity/transform set by createMediaCardElement so
      // the cardDropIn keyframes can animate cleanly from 0.5 → 1 scale.
      card.style.opacity = '';
      card.style.transform = '';
      card.style.setProperty('--drop-rotation', `rotate(${rotation}deg)`);
      grid.appendChild(card);
      cards.push(card);

      card.classList.add('is-dropping-in');
      setTimeout(() => {
        card.classList.remove('is-dropping-in');
        // After the keyframe animation finishes, restore the steady-state
        // transform so future hover/drag transforms work consistently.
        card.style.transform = `rotate(${rotation}deg) scale(1)`;
        card.style.opacity = '1';
      }, 440);

      // Fade out the source clone smoothly while the card animates in
      if (sourceClone) {
        sourceClone.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        sourceClone.style.opacity = '0';
        sourceClone.style.transform = 'scale(0.6)';
        setTimeout(() => {
          if (sourceClone.parentNode) sourceClone.parentNode.removeChild(sourceClone);
        }, 240);
      }

      updateBadge('mediaCount', list.length);
      return card;
    }

    // Wire up the controller so the drawer-image pointer-drag can call into
    // renderMedia's closure to add new cards.
    mediaController.getGridEl = () => grid;
    mediaController.addCardFromDrop = addCardFromDrop;
    mediaController.removeCardBySrc = (src) => {
      const card = cards.find(c => c._mediaItem && c._mediaItem.src === src);
      if (card) { transferCardToDrawer(card, card._mediaItem); return true; }
      return false;
    };

    // Build initial cards
    media.forEach((item, index) => {
      const card = createMediaCardElement(item, index);
      cards.push(card);
      grid.appendChild(card);

      // Staggered fade-in for the initial render only
      setTimeout(() => {
        card.style.animation = `cardArrange 0.3s ease-out forwards`;
        card.style.animationDelay = `${index * 0.04}s`;
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
    
    // Load curated images into the My Media drawer based on card index.
    // User-dropped images always appear first so they persist visually across
    // focus changes (and across the unfocus/refocus cycle).
    function loadCuratedDrawerImages(cardIndex) {
      currentLoadedCardIndex = cardIndex;

      const curated = drawerImageSets[cardIndex] || drawerImageSets[0];
      const userList = Array.from(userDroppedSrcs);
      // Compose: user-dropped images first, then curated (deduped)
      const imageSet = [...userList, ...curated.filter(s => !userDroppedSrcs.has(s))];
      localStorage.setItem('drawerImages', JSON.stringify(imageSet));

      const drawerImagesEl = document.getElementById('drawerImages');
      if (!drawerImagesEl) return;

      // Reuse existing DOM nodes for sources that are already present so the
      // user-dropped images stay put (and don't re-animate) when switching
      // between cards. Only newly-added curated entries get the staggered
      // fade-in.
      const existing = new Map();
      Array.from(drawerImagesEl.children).forEach(child => {
        if (!child.classList || !child.classList.contains('my-media-image-wrapper')) return;
        const innerImg = child.querySelector('img.my-media-image');
        if (innerImg) existing.set(innerImg.getAttribute('src'), child);
      });

      // Build the new ordered list, reusing or creating elements as needed.
      const newChildren = [];
      let newCount = 0;
      imageSet.forEach((src, index) => {
        let wrapper = existing.get(src);
        if (wrapper) {
          // Reuse — leave it visible, no entry animation
          existing.delete(src);
          // Make sure click handler points to the latest focusMediaImage
          // (closures from previous renderMedia calls are fine because the
          // function body is identical; we keep the existing handler).
        } else {
          wrapper = buildDrawerImageWithBookmark(src, index, focusMediaImage);
          // Stagger entry animation for newly-introduced images only
          wrapper.style.opacity = '0';
          wrapper.style.transform = 'translateY(10px)';
          const delay = newCount * 80;
          newCount++;
          setTimeout(() => {
            wrapper.style.transition = 'all 0.3s ease-out';
            wrapper.style.opacity = '1';
            wrapper.style.transform = 'translateY(0)';
          }, delay);
        }
        newChildren.push(wrapper);
      });

      // Remove any leftover elements that aren't in the new set
      existing.forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });

      // Reorder DOM to match imageSet
      newChildren.forEach((el, i) => {
        if (drawerImagesEl.children[i] !== el) {
          drawerImagesEl.insertBefore(el, drawerImagesEl.children[i] || null);
        }
      });
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
    
    // Reset the drawer when no card is focused. Crucially, this preserves
    // user-dropped images — only the curated set goes away. If the user has
    // no drops, we fall back to the placeholder.
    function resetDrawerToEmpty() {
      currentLoadedCardIndex = -1;
      const userList = Array.from(userDroppedSrcs);
      localStorage.setItem('drawerImages', JSON.stringify(userList));

      const drawerImagesEl = document.getElementById('drawerImages');
      if (!drawerImagesEl) return;

      // Diff against existing DOM so user-dropped images that are already
      // visible don't flicker / re-animate.
      const existing = new Map();
      Array.from(drawerImagesEl.children).forEach(child => {
        if (!child.classList || !child.classList.contains('my-media-image-wrapper')) return;
        const innerImg = child.querySelector('img.my-media-image');
        if (innerImg) existing.set(innerImg.getAttribute('src'), child);
      });

      // Empty state → show placeholder
      if (userList.length === 0) {
        drawerImagesEl.replaceChildren();
        const placeholder = createEl('div', {
          class: 'drawer-placeholder',
          text: 'Click an image card to load curated media'
        });
        placeholder.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: rgba(0,0,0,0.4); font-size: 14px; font-style: italic; padding: 20px; text-align: center;';
        drawerImagesEl.appendChild(placeholder);
        return;
      }

      // Build/keep wrappers for the user-dropped images
      const newChildren = [];
      userList.forEach((src, index) => {
        let wrapper = existing.get(src);
        if (wrapper) {
          existing.delete(src);
        } else {
          wrapper = buildDrawerImageWithBookmark(src, index);
        }
        newChildren.push(wrapper);
      });

      // Remove anything else (curated images that were in the drawer)
      existing.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
      // Also clear any placeholder that might be lingering
      const placeholder = drawerImagesEl.querySelector('.drawer-placeholder');
      if (placeholder) placeholder.remove();

      // Reorder the kept/new wrappers to match userList
      newChildren.forEach((el, i) => {
        if (drawerImagesEl.children[i] !== el) {
          drawerImagesEl.insertBefore(el, drawerImagesEl.children[i] || null);
        }
      });
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

  // Deterministic pseudo-random in [0, 1) — keeps card positions stable across re-renders
  function _seedRand(seed) {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  // Generate stacked card positions (deterministic — same input = same output)
  function generateStackedPositions(count) {
    const positions = [];
    const baseX = 80;
    const baseY = 100;
    const horizontalSpacing = 220;
    const verticalStagger = 150;
    const rotationRange = 6;

    for (let i = 0; i < count; i++) {
      const r1 = _seedRand(i * 1.7 + 0.3);
      const r2 = _seedRand(i * 2.3 + 1.1);
      const r3 = _seedRand(i * 3.1 + 2.7);

      const x = baseX + (i * horizontalSpacing) + (r1 - 0.5) * 40;
      const staggerOffset = (i % 2 === 0) ? 0 : verticalStagger;
      const y = baseY + staggerOffset + (r2 - 0.5) * 60;
      const rotation = (r3 - 0.5) * rotationRange;

      positions.push({ x, y, rotation });
    }

    return positions;
  }

  // Compute a stable position for an item at a given index. If the item already
  // has a saved position, reuse it (so dropped cards stay where the user put them).
  function getPositionForItem(item, index) {
    if (item && item.position && typeof item.position.x === 'number') {
      return item.position;
    }
    return generateStackedPositions(index + 1)[index];
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
      
      addNearbyLocations();
      
      requestAnimationFrame(() => {
        if (leafletMap) leafletMap.invalidateSize();
      });
    }

    // Render products with locations
    productsEl.replaceChildren();
    const productsJson = localStorage.getItem('droppedProducts');
    console.log('Map view - Raw products from localStorage:', productsJson);
    const storedProducts = readStoredArray('droppedProducts');
    const products = getMapProductsWithFallback(storedProducts);
    console.log('Map view - Parsed products:', storedProducts);
    
    // Assign products to alternate between the two store locations
    products.forEach((product, index) => {
      const storeIndex = index % 2;
      product.location = {
        lat: storeLocations[storeIndex].lat,
        lng: storeLocations[storeIndex].lng
      };
    });
    
    // Keep saved products updated without writing default map placeholders into the library.
    if (storedProducts.length > 0) {
      storedProducts.forEach((product, index) => {
        const storeIndex = index % 2;
        product.location = {
          lat: storeLocations[storeIndex].lat,
          lng: storeLocations[storeIndex].lng
        };
      });
      localStorage.setItem('droppedProducts', JSON.stringify(storedProducts));
    }
    
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
          src: product.image || product.src,
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
          href: `https://us.louisvuitton.com/eng-us/search/${encodeURIComponent(product.model || product.title || 'Louis Vuitton')}`,
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
    const categorizedFavorites = readStoredObject('categorizedFavorites');
    const currentTabFavorites = categorizedFavorites[currentFavoritesTab] || [];
    
    // Also get legacy wishlist products
    const legacyFavorites = readStoredArray('wishlistProducts');
    
    // Combine for badge count (includes all persistent default favorites)
    const allFavoritesCount = Object.values(categorizedFavorites).reduce((sum, arr) => sum + arr.length, 0)
      + legacyFavorites.length
      + defaultFavoritesTotalCount;
    updateBadge('favoritesCount', allFavoritesCount);

    const isProductsTab = currentFavoritesTab === 'tab1';
    const tabDefaults = defaultFavoritesByTab[currentFavoritesTab] || [];
    const tabDefaultSrcs = defaultFavoriteSrcsByTab[currentFavoritesTab] || new Set();
    const hasContent = currentTabFavorites.length > 0
      || tabDefaults.length > 0
      || (isProductsTab && legacyFavorites.length > 0);

    if (!hasContent) {
      grid.classList.remove('favorites-grid-glass');
      showEmptyState(grid, 'No favorites in this category', 'Drag images to the chat or click bookmark icons to add favorites');
      return;
    }

    // Always render persistent default favorites at the top of the current tab
    tabDefaults.forEach(item => {
      const card = createFavoriteCard(item);
      grid.appendChild(card);
    });

    // Render current tab favorites (new categorized system)
    // Skip any items whose src matches a default to avoid duplicates
    currentTabFavorites.forEach(item => {
      if (tabDefaultSrcs.has(item.src)) return;
      const card = createFavoriteCard(item);
      grid.appendChild(card);
    });
    
    // Also show legacy favorites in tab1 (convert to glass card style)
    if (isProductsTab) {
      legacyFavorites.forEach(product => {
        const src = product.image || product.src;
        if (tabDefaultSrcs.has(src)) return;
        // Convert legacy product to new format (handle both 'image' and 'src' keys)
        const item = {
          src,
          title: product.title,
          id: product.id,
          addedAt: product.addedAt || new Date().toISOString(),
          isLegacy: true  // Mark as legacy for deletion handling
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
    
    // Image (handle both 'image' and 'src' keys)
    const imageSrc = item.src || item.image;
    const img = createEl('img', {
      class: 'favorite-glass-card-image',
      src: imageSrc,
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
    
    info.appendChild(title);
    info.appendChild(date);

    // Default favorites are persistent and cannot be removed
    if (!item.isDefaultFavorite) {
      const removeBtn = createEl('button', { class: 'favorite-glass-card-remove' });
      removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Remove from all collections
        removeFromAllCollections(item);
      });
      card.appendChild(removeBtn);
    }

    card.appendChild(inner);
    card.appendChild(info);

    // Open lightbox when the card is clicked (remove button stops propagation above)
    card.addEventListener('click', () => {
      openFavoritesLightbox(imageSrc, item.title || 'Favorite');
    });

    return card;
  }

  // ─── Favorites Lightbox ───────────────────────────────────────────────
  function openFavoritesLightbox(src, caption) {
    const lightbox = document.getElementById('favoritesLightbox');
    const image = document.getElementById('favoritesLightboxImage');
    const captionEl = document.getElementById('favoritesLightboxCaption');
    if (!lightbox || !image) return;
    image.src = src;
    image.alt = caption || '';
    if (captionEl) captionEl.textContent = caption || '';
    lightbox.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeFavoritesLightbox() {
    const lightbox = document.getElementById('favoritesLightbox');
    const image = document.getElementById('favoritesLightboxImage');
    if (!lightbox) return;
    lightbox.setAttribute('hidden', '');
    if (image) image.src = '';
    document.body.style.overflow = '';
  }

  (function setupFavoritesLightbox() {
    const lightbox = document.getElementById('favoritesLightbox');
    if (!lightbox) return;
    const closeBtn = document.getElementById('favoritesLightboxClose');
    const content = document.getElementById('favoritesLightboxContent');

    // Close when clicking the backdrop
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeFavoritesLightbox();
    });
    // Don't close when clicking inside the image/content
    if (content) {
      content.addEventListener('click', (e) => e.stopPropagation());
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeFavoritesLightbox();
      });
    }
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !lightbox.hasAttribute('hidden')) {
        closeFavoritesLightbox();
      }
    });
  })();
  
  // Remove from favorites
  function removeFromFavorites(src, tab) {
    let favorites = readStoredObject('categorizedFavorites');
    if (favorites[tab]) {
      favorites[tab] = favorites[tab].filter(item => item.src !== src);
      localStorage.setItem('categorizedFavorites', JSON.stringify(favorites));
      renderFavorites();
      updateFavoritesBadge();
    }
  }
  
  // Remove from ALL collections (for complete deletion)
  function removeFromAllCollections(item) {
    const itemSrc = item.src || item.image;
    const itemTitle = item.title;
    const itemId = item.id;
    
    // Remove from categorizedFavorites
    let categorizedFavorites = readStoredObject('categorizedFavorites');
    Object.keys(categorizedFavorites).forEach(tab => {
      categorizedFavorites[tab] = categorizedFavorites[tab].filter(
        i => i.src !== itemSrc && i.title !== itemTitle
      );
    });
    localStorage.setItem('categorizedFavorites', JSON.stringify(categorizedFavorites));
    
    // Remove from wishlistProducts (legacy favorites)
    let wishlistProducts = readStoredArray('wishlistProducts');
    wishlistProducts = wishlistProducts.filter(
      p => (p.image || p.src) !== itemSrc && p.title !== itemTitle && p.id !== itemId
    );
    localStorage.setItem('wishlistProducts', JSON.stringify(wishlistProducts));
    
    // Remove from droppedProducts
    let droppedProducts = readStoredArray('droppedProducts');
    droppedProducts = droppedProducts.filter(
      p => (p.image || p.src) !== itemSrc && p.title !== itemTitle && p.id !== itemId
    );
    localStorage.setItem('droppedProducts', JSON.stringify(droppedProducts));
    
    // Remove from galleryImages
    let galleryImages = readStoredArray('galleryImages');
    galleryImages = galleryImages.filter(
      g => g.src !== itemSrc && g.title !== itemTitle
    );
    localStorage.setItem('galleryImages', JSON.stringify(galleryImages));
    
    // Refresh views and badges
    renderFavorites();
    updateFavoritesBadge();
    updateBadge('libraryCount', droppedProducts.length);
    updateBadge('mediaCount', galleryImages.length);
    
    // If on map view, refresh it
    if (currentView === 'map') {
      renderMap();
    }
    
    console.log('Removed from all collections:', itemTitle);
  }
  
  // Update favorites badge
  function updateFavoritesBadge() {
    const categorizedFavorites = readStoredObject('categorizedFavorites');
    const legacyFavorites = readStoredArray('wishlistProducts');
    const allFavoritesCount = Object.values(categorizedFavorites).reduce((sum, arr) => sum + arr.length, 0)
      + legacyFavorites.length
      + defaultFavoritesTotalCount;
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
      src: product.image || product.src,
      alt: product.title
    });
    
    // Favorite button
    const wishlist = readStoredArray('wishlistProducts');
    const isFavorite = wishlist.some(p => p.id === product.id);
    
    const favoriteBtn = createEl('button', {
      class: isFavorite ? 'dashboard-product-favorite is-active' : 'dashboard-product-favorite',
      'aria-label': 'Toggle favorite'
    });
    
    const bookmarkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    bookmarkSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    bookmarkSvg.setAttribute('viewBox', '0 0 24 24');
    bookmarkSvg.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
    bookmarkSvg.setAttribute('stroke', 'currentColor');
    bookmarkSvg.setAttribute('stroke-width', '2');
    const bookmarkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bookmarkPath.setAttribute('d', 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z');
    bookmarkSvg.appendChild(bookmarkPath);
    favoriteBtn.appendChild(bookmarkSvg);
    
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWishlist(product, favoriteBtn, bookmarkSvg);
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
    let wishlist = readStoredArray('wishlistProducts');
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
        products: readStoredArray('droppedProducts'),
        media: readStoredArray('galleryImages'),
        favorites: readStoredArray('wishlistProducts')
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
      updateAllBadges();
    }
  });
  
  // Also refresh when window receives focus (user switches back to this tab)
  let lastMediaCount = readStoredArray('galleryImages').length;
  let lastProductsCount = readStoredArray('droppedProducts').length;
  
  window.addEventListener('focus', () => {
    const currentMediaCount = readStoredArray('galleryImages').length;
    const currentProductsCount = readStoredArray('droppedProducts').length;
    
    if (currentMediaCount !== lastMediaCount || currentProductsCount !== lastProductsCount) {
      console.log('Data changed, refreshing view...');
      lastMediaCount = currentMediaCount;
      lastProductsCount = currentProductsCount;
      switchView(currentView);
      updateAllBadges();
    }
  });
  
  function updateAllBadges() {
    const products = readStoredArray('droppedProducts');
    const media = readStoredArray('galleryImages');
    const categorizedFavorites = readStoredObject('categorizedFavorites');
    const legacyFavorites = readStoredArray('wishlistProducts');
    updateBadge('libraryCount', products.length);
    updateBadge('mediaCount', media.length);
    updateBadge('favoritesCount',
      Object.values(categorizedFavorites).reduce((sum, arr) => sum + arr.length, 0)
        + legacyFavorites.length
        + defaultFavoritesTotalCount
    );
  }

  // Initialize demo data - only if no existing user data
  // These are the default canvas card images shown on page load
  function initializeDemoData() {
    const demoMedia = [
      { src: 'assets/canvas-1.jpg', productData: { title: 'Kusama Portrait - Polka Dot Room' } },
      { src: 'assets/canvas-2.jpg', productData: { title: 'Blue Face Paint Editorial' } },
      { src: 'assets/canvas-3.jpg', productData: { title: 'Kusama Polka Dot Outfit' } },
      { src: 'assets/canvas-4.jpg', productData: { title: 'LV x Kusama Blue Bag' } },
      { src: 'assets/canvas-5.jpg', productData: { title: 'Blue Paint Swatch' } }
    ];

    const existingMedia = readStoredArray('galleryImages');

    // Remove old image1-7.png defaults
    const legacySrcs = [
      'assets/image1.png', 'assets/image2.png', 'assets/image3.png',
      'assets/image4.png', 'assets/image5.png', 'assets/image6.png', 'assets/image7.png'
    ];
    const cleaned = existingMedia.filter(item => !legacySrcs.includes(item.src));

    const demoSrcs = demoMedia.map(d => d.src);
    const existingSrcs = cleaned.map(e => e.src);
    const missingDemo = demoMedia.filter(d => !existingSrcs.includes(d.src));

    if (missingDemo.length > 0 || cleaned.length !== existingMedia.length) {
      localStorage.setItem('galleryImages', JSON.stringify([...cleaned, ...missingDemo]));
    }

    currentLoadedCardIndex = -1;
  }

  // Initialize demo data
  initializeDemoData();

  // Debug and update badge counts on load
  console.log('=== Product Dashboard Initialization ===');
  console.log('LocalStorage keys:', Object.keys(localStorage));
  console.log('droppedProducts:', localStorage.getItem('droppedProducts'));
  console.log('galleryImages:', localStorage.getItem('galleryImages'));
  console.log('wishlistProducts:', localStorage.getItem('wishlistProducts'));
  
  const products = readStoredArray('droppedProducts');
  const media = readStoredArray('galleryImages');
  const favorites = readStoredArray('wishlistProducts');
  
  console.log('Loaded products count:', products.length);
  console.log('Loaded media count:', media.length);
  console.log('Loaded favorites count:', favorites.length);
  
  updateBadge('libraryCount', products.length);
  updateBadge('mediaCount', media.length);
  // Include persistent default favorites (across all tabs) in the initial count
  updateBadge('favoritesCount', favorites.length + defaultFavoritesTotalCount);

  // Initialize the default view
  switchView(currentView);
})();
