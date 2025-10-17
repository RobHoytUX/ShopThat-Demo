/* Dashboard boot */
(function(){
  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  // Mock data
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const online = [12000, 19000, 25000, 14000, 16000, 22000, 18000];
  const offline = [8000, 6000, 5000, 9000, 12000, 7000, 4000];

  const lineLabels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
  const lastMonth = [3004, 3400, 3100, 3200, 3600, 3900];
  const thisMonth = [4504, 4200, 4300, 4700, 4800, 5200];

  const categories = ['Daily','Weekly','Monthly','Quarterly'];
  const catSpend = [5,18,27,52];

  const STORAGE_KEY = 'st_keywords_v1';
  function loadStored(){
    // Use shared data system if available
    if (window.ShopThatData) {
      return window.ShopThatData.getKeywords();
    }
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; }
  }

  const topKeywordsLeft = [
    ['Roger Federer', 348, '$87.00'],
    ['Rafael Nadal', 230, '$57.50'],
    ['Oscars', 100, '$25.00'],
    ['Olympics', 54, '$13.50'],
    ['Zendaya', 90, '$22.50']
  ];
  const topKeywordsRight = [
    ['Trio Messenger', 80, '$20.00'],
    ['Takashi Murakami', 500, '$125.00'],
    ['Yayoi Kasuma', 908, '$227.00'],
    ['Keepall Bag', 200, '$50.00'],
    ['Météore', 240, '$60.00']
  ];

  // Enhanced keyword data with engagement metrics matching the screenshot
  const keywordEngagementData = [
    { name: 'Yayoi Kusama', cost: 14000, engagement: 30 },
    { name: 'Pharrell', cost: 2000, engagement: 15 },
    { name: 'Infinity Mirrors', cost: 500, engagement: 10 },
    { name: 'Painted Dots', cost: 1000, engagement: 20 },
    { name: 'Louis Vuitton', cost: 850, engagement: 25 },
    { name: 'Pumpkins', cost: 450, engagement: 22 },
    { name: 'Gisele Bundchen', cost: 1000, engagement: 30 },
    { name: 'MoMa', cost: 370, engagement: 12 },
    { name: 'FeiFei Sun', cost: 1150, engagement: 25 },
    { name: 'Central Park', cost: 150, engagement: 23 }
  ];

  function populateTopKeywords(filterTerm=''){
    const body = $('#top-keywords-body');
    if (!body) return;
    body.replaceChildren();
    
    // Always use the demo engagement data for consistent display
    const keywords = keywordEngagementData.slice();
    
    // Filter and sort keywords by cost (highest first)
    const filteredKeywords = keywords
      .filter(k => k.name.toLowerCase().includes(filterTerm.toLowerCase()))
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 10); // Show top 10
    
    // Populate table with keywords matching screenshot format
    filteredKeywords.forEach(keyword => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="keyword-name">${keyword.name}</td>
        <td class="keyword-cost">$${keyword.cost.toLocaleString()}</td>
        <td class="keyword-engagement">${keyword.engagement}%</td>
      `;
      body.appendChild(tr);
    });
    
    // If no keywords found, show placeholder
    if (filteredKeywords.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3" style="text-align: center; color: #9ca3af;">No keywords found</td>';
      body.appendChild(tr);
    }
    
    const link = $('#view-keywords');
    if (link){ link.addEventListener('click', ()=>{}); }
  }

  function renderOverview(){
    let data = [
      ['User Interactions','25%'],
      ['Conversions','2%'],
      ['Paid Keywords','60%'],
      ['Average Chatbot Conversion','43 sec']
    ];

    // Use real analytics data if available
    if (window.ShopThatData) {
      const analytics = window.ShopThatData.getChatAnalytics();
      const sessions = window.ShopThatData.getChatSessions();
      const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
      
      data = [
        ['Total Chat Sessions', analytics.totalSessions || 0],
        ['Keywords Used', analytics.totalUses || 0],
        ['Active Sessions', analytics.activeSessions || 0],
        ['Avg Session Time', analytics.avgSessionLength ? `${analytics.avgSessionLength}s` : '0s'],
        ['Total RPV Cost', analytics.totalCost ? `$${analytics.totalCost.toFixed(2)}` : '$0.00']
      ];
    }

    const ul = $('#bot-overview');
    if (!ul) return;
    ul.replaceChildren();
    data.forEach(([k,v])=>{
      const li = document.createElement('li');
      li.innerHTML = `<span>${k}</span><strong>${v}</strong>`;
      ul.appendChild(li);
    });
  }

  function renderDocs(){
    // Initialize tab functionality
    initDocumentAccessTabs();
    
    // Populate articles
    populateArticles();
  }

  function initDocumentAccessTabs() {
    const tabBtns = $all('.tab-btn');
    const tabContents = $all('.tab-content');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Remove active class from all tabs and content
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab
        btn.classList.add('active');
        
        // Show corresponding content
        const targetContent = targetTab === 'trending' ? $('#trending-articles') : $('#new-content-articles');
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  function populateArticles() {
    const trendingArticles = [
      {
        title: "The Polka Dot Fantasy World of Yayoi Kusama",
        url: "https://asianews.network/the-polka-dot-fantasy-world-of-yayoi-kusama/"
      },
      {
        title: "Creating Infinity: The Worlds of Louis Vuitton and Yayoi Kusama",
        url: "https://www.davidzwirner.com/news/2023/creating-infinity-the-worlds-of-louis-vuitton-and-yayoi-kusama"
      },
      {
        title: "Yayoi Kusama - Artist Profile",
        url: "https://www.davidzwirner.com/artists/yayoi-kusama"
      },
      {
        title: "Louis Vuitton's Collaboration Strategy",
        url: "https://www.ft.com/content/198207f2-5f5e-441c-b033-7deee8a28feb"
      },
      {
        title: "See the New Louis Vuitton x Yayoi Kusama Collaboration Here",
        url: "https://www.lofficielph.com/fashion/see-the-new-louis-vuitton-x-yayoi-kusama-collaboration-here"
      },
      {
        title: "Louis Vuitton Second Yayoi Kusama Collection",
        url: "https://www.harpersbazaar.com/fashion/trends/a42411209/louis-vuitton-second-yayoi-kusama-collection/"
      }
    ];

    const newContentArticles = [
      {
        title: "Café Louis Vuitton Opens in Seoul Blending Korean Flavors with French Savoir-Faire",
        url: "https://www.lvmh.com/en/news-lvmh/cafe-louis-vuitton-opens-in-seoul-blending-korean-flavors-with-french-savoir-faire"
      },
      {
        title: "Louis Vuitton Dévoile Tous Ses Trésors Art Déco Lors d'une Expo Gratuite",
        url: "https://www.timeout.fr/paris/actualites/louis-vuitton-devoile-tous-ses-tresors-art-deco-lors-dune-expo-gratuite-091525"
      },
      {
        title: "Selena Gomez Wears Louis Vuitton on Emmys 2025 Red Carpet",
        url: "https://pagesix.com/2025/09/14/style/selena-gomez-wears-louis-vuitton-on-emmys-2025-red-carpet/"
      },
      {
        title: "Louis Vuitton Présente les Tenues Officielles de l'Équipe Féminine du Real Madrid",
        url: "https://fr.fashionnetwork.com/news/Louis-vuitton-presente-les-tenues-officielles-de-l-equipe-feminine-du-real-madrid,1763336.html"
      },
      {
        title: "Louis Vuitton Accélère dans la Beauté avec un Pop-up Immersif à Soho",
        url: "https://www.meetandmatch.fr/louis-vuitton-accelere-dans-la-beaute-avec-un-pop-up-immersif-a-soho/"
      }
    ];

    // Populate trending articles
    const trendingContainer = $('#trending-articles .articles-list');
    if (trendingContainer) {
      trendingContainer.replaceChildren();
      trendingArticles.forEach(article => {
        const articleEl = document.createElement('a');
        articleEl.className = 'article-item';
        articleEl.href = article.url;
        articleEl.target = '_blank';
        articleEl.rel = 'noopener noreferrer';
        articleEl.innerHTML = `
          <div class="article-title">${article.title}</div>
          <div class="article-url">${article.url}</div>
        `;
        trendingContainer.appendChild(articleEl);
      });
    }

    // Populate new content articles
    const newContentContainer = $('#new-content-articles .articles-list');
    if (newContentContainer) {
      newContentContainer.replaceChildren();
      newContentArticles.forEach(article => {
        const articleEl = document.createElement('a');
        articleEl.className = 'article-item';
        articleEl.href = article.url;
        articleEl.target = '_blank';
        articleEl.rel = 'noopener noreferrer';
        articleEl.innerHTML = `
          <div class="article-title">${article.title}</div>
          <div class="article-url">${article.url}</div>
        `;
        newContentContainer.appendChild(articleEl);
      });
    }
  }

  function renderEcommerce(){
    const el = $('#ecommerce-products');
    if (!el) return;
    el.replaceChildren();
    
    const lvProducts = [
      { 
        id: 1,
        name: 'Keepall 50', 
        price: '$2,570', 
        cost: '$32.13', 
        uses: 125,
        description: 'Iconic Louis Vuitton travel bag crafted from Monogram canvas with natural leather trim. Features spacious interior and classic design.',
        category: 'Travel Bags',
        material: 'Monogram Canvas',
        dimensions: '50 x 29 x 23 cm',
        avgSessionTime: '2m 15s',
        conversionRate: '8.2%',
        totalRevenue: '$21,525',
        keywordMentions: 89
      },
      { 
        id: 2,
        name: 'Neverfull MM', 
        price: '$2,030', 
        cost: '$41.25', 
        uses: 165,
        description: 'Versatile tote bag in Monogram canvas with leather handles and trim. Perfect for everyday use with spacious interior.',
        category: 'Handbags',
        material: 'Monogram Canvas',
        dimensions: '32 x 29 x 17 cm',
        avgSessionTime: '3m 42s',
        conversionRate: '12.1%',
        totalRevenue: '$33,495',
        keywordMentions: 124
      },
      { 
        id: 3,
        name: 'Speedy 30', 
        price: '$1,760', 
        cost: '$28.75', 
        uses: 115,
        description: 'Classic Louis Vuitton handbag in Monogram canvas. Compact yet spacious with iconic curved silhouette.',
        category: 'Handbags',
        material: 'Monogram Canvas',
        dimensions: '30 x 21 x 17 cm',
        avgSessionTime: '1m 58s',
        conversionRate: '6.5%',
        totalRevenue: '$20,240',
        keywordMentions: 67
      },
      { 
        id: 4,
        name: 'Twist Bag', 
        price: '$4,400', 
        cost: '$67.50', 
        uses: 270,
        description: 'Modern interpretation of the LV turn-lock closure in Epi leather. Contemporary design meets traditional craftsmanship.',
        category: 'Handbags',
        material: 'Epi Leather',
        dimensions: '23 x 18 x 9 cm',
        avgSessionTime: '4m 12s',
        conversionRate: '15.3%',
        totalRevenue: '$67,320',
        keywordMentions: 198
      },
      { 
        id: 5,
        name: 'Capucines MM', 
        price: '$5,800', 
        cost: '$89.25', 
        uses: 357,
        description: 'Elegant bag named after the street where Louis Vuitton opened his first store. Features luxurious leather and distinctive LV closure.',
        category: 'Handbags',
        material: 'Leather',
        dimensions: '27 x 18 x 9 cm',
        avgSessionTime: '5m 28s',
        conversionRate: '18.7%',
        totalRevenue: '$103,530',
        keywordMentions: 267
      }
    ];
    
    lvProducts.forEach(product => {
      const item = document.createElement('div');
      item.className = 'product-item';
      item.setAttribute('data-product-id', product.id);
      item.innerHTML = `
        <div class="product-image">
          <img src="assets/kusama3.png" alt="LV ${product.name}" />
        </div>
        <div class="product-name">${product.name}</div>
        <div class="product-price">${product.price}</div>
        <div class="product-cost">RPV Cost: ${product.cost}</div>
      `;
      
      // Add click handler to open product panel
      item.addEventListener('click', () => openProductPanel(product));
      
      el.appendChild(item);
    });
  }

  function renderCharts(){
    const barCtx = document.getElementById('barChart');
    const lineCtx = document.getElementById('lineChart');
    const catCtx = document.getElementById('categoriesChart');
    if (!barCtx || !lineCtx || !catCtx || !window.Chart) return;

    new Chart(barCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: days,
        datasets: [
          { label: 'Online Sales', data: online, backgroundColor: 'rgba(99,102,241,.8)' },
          { label: 'Offline Sales', data: offline, backgroundColor: 'rgba(99,102,241,.3)' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: true, aspectRatio: 2, scales: { y: { beginAtZero: true } }, animation: false }
    });

    new Chart(lineCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: lineLabels,
        datasets: [
          { label: 'Last Month', data: lastMonth, borderColor: 'rgba(59,130,246,.7)', fill: false, tension: .35 },
          { label: 'This Month', data: thisMonth, borderColor: 'rgba(16,185,129,.8)', fill: false, tension: .35 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: true, aspectRatio: 2, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: false } }, animation: false }
    });

    new Chart(catCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [{
          label: 'Spend %',
          data: catSpend,
          backgroundColor: ['#8b5cf6','#06b6d4','#60a5fa','#a7f3d0']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } }, animation: false }
    });
  }

  // Modal functionality
  function createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">${content}</div>
      </div>
    `;
    document.body.appendChild(modal);
    
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    return modal;
  }

  // Product Panel functionality
  function createProductPanel(product) {
    const overlay = document.createElement('div');
    overlay.className = 'product-panel-overlay';
    
    const panel = document.createElement('div');
    panel.className = 'product-panel';
    
    panel.innerHTML = `
      <div class="product-panel-header">
        <h2 class="product-panel-title">Product Details</h2>
        <button class="product-panel-close" aria-label="Close panel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="product-panel-content">
        <div class="product-detail-image">
          <img src="assets/kusama3.png" alt="${product.name}" />
        </div>
        
        <div class="product-detail-info">
          <h1 class="product-detail-name">${product.name}</h1>
          <div class="product-detail-price">${product.price}</div>
          <p class="product-detail-description">${product.description}</p>
        </div>

        <div class="product-stats">
          <div class="stat-card cost">
            <span class="stat-value">${product.cost}</span>
            <span class="stat-label">RPV Cost</span>
          </div>
          <div class="stat-card uses">
            <span class="stat-value">${product.uses}</span>
            <span class="stat-label">Total Uses</span>
          </div>
        </div>

        <div class="analytics-section">
          <h3 class="analytics-title">Performance Analytics</h3>
          <div class="analytics-grid">
            <div class="analytics-item">
              <span class="analytics-value">${product.avgSessionTime}</span>
              <span class="analytics-label">Avg Session</span>
            </div>
            <div class="analytics-item">
              <span class="analytics-value">${product.conversionRate}</span>
              <span class="analytics-label">Conversion</span>
            </div>
            <div class="analytics-item">
              <span class="analytics-value">${product.totalRevenue}</span>
              <span class="analytics-label">Total Revenue</span>
            </div>
            <div class="analytics-item">
              <span class="analytics-value">${product.keywordMentions}</span>
              <span class="analytics-label">Mentions</span>
            </div>
          </div>
        </div>

        <div class="product-details-section">
          <h3 class="section-title">Product Information</h3>
          <div class="detail-row">
            <span class="detail-label">Category</span>
            <span class="detail-value">${product.category}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Material</span>
            <span class="detail-value">${product.material}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Dimensions</span>
            <span class="detail-value">${product.dimensions}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">SKU</span>
            <span class="detail-value">LV-${product.id.toString().padStart(4, '0')}</span>
          </div>
        </div>
      </div>
    `;
    
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    // Close panel functionality
    const closePanel = () => {
      overlay.classList.remove('active');
      panel.classList.remove('active');
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      }, 300);
    };
    
    // Event listeners
    panel.querySelector('.product-panel-close').addEventListener('click', closePanel);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePanel();
    });
    
    // Escape key handler
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closePanel();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      panel.classList.add('active');
    });
    
    return { overlay, panel, closePanel };
  }

  function openProductPanel(product) {
    createProductPanel(product);
  }

  function showRPVInfo() {
    const content = `
      <div class="info-section">
        <h4>Revenue Per View (RPV) Model</h4>
        <p>Our RPV model is based on industry-standard AI publisher agreements:</p>
        <ul>
          <li><strong>$0.25 per article use</strong> - Competitive rate based on market analysis</li>
          <li><strong>$3,000 ceiling per article</strong> - Maximum annual payment per article</li>
          <li><strong>12,000 uses to reach ceiling</strong> - (3000 ÷ 0.25 = 12,000)</li>
        </ul>
        
        <h4>Industry Comparison & Benchmarks</h4>
        <div class="comparison-table">
          <div class="comparison-row header">
            <span>Model</span>
            <span>Rate</span>
            <span>Annual Value</span>
          </div>
          <div class="comparison-row">
            <span>Traditional Publishing</span>
            <span>$0.0002/view</span>
            <span>$5-50 per mille</span>
          </div>
          <div class="comparison-row highlight">
            <span>AI Publisher Agreements</span>
            <span>$0.25/use</span>
            <span>$3,000/article/year</span>
          </div>
        </div>
        
        <h4>Recent Major Deals</h4>
        <p>Major AI companies have established similar payment structures:</p>
        <ul>
          <li><strong>Apple + OpenAI → CondeNast:</strong> $50M multi-year deal</li>
          <li><strong>Meta AI partnerships:</strong> $1-5M per publisher</li>
          <li><strong>Google AI content deals:</strong> Similar lump sum structures</li>
          <li><strong>Traditional vs AI RPV:</strong> $0.0002 vs $0.25 (1,250x increase)</li>
        </ul>
        
        <p><em>These benchmarks justify our $0.25/use model with $3,000 annual ceiling per article.</em></p>
      </div>
    `;
    createModal('RPV & Industry Information', content);
  }


  // Payment ceiling logic
  function updatePaymentCeilings() {
    const progressBars = $all('.progress-fill');
    const progressTexts = $all('.progress-text');
    
    // Simulate different ceiling progress for demo
    const ceilingData = [
      { current: 250, ceiling: 3000, percentage: 8.33 },
      { current: 1200, ceiling: 3000, percentage: 40 },
      { current: 2750, ceiling: 3000, percentage: 91.67 }
    ];
    
    progressBars.forEach((bar, i) => {
      if (ceilingData[i]) {
        bar.style.width = `${ceilingData[i].percentage}%`;
        if (progressTexts[i]) {
          progressTexts[i].textContent = `$${ceilingData[i].current} of $${ceilingData[i].ceiling} ceiling reached`;
        }
      }
    });
  }

  // Investor demo mode functionality
  function toggleInvestorMode(enabled) {
    const body = document.body;
    const rpvSection = $('.rpv-section');
    const defaultBenchmarks = $('.default-benchmarks');
    const investorBenchmarks = $('.investor-benchmarks');
    
    if (enabled) {
      body.classList.add('investor-mode');
      
      // Toggle benchmark views
      if (defaultBenchmarks) defaultBenchmarks.style.display = 'none';
      if (investorBenchmarks) investorBenchmarks.style.display = 'grid';
      
      // Show RPV and Industry cards
      if (rpvSection) {
        rpvSection.style.display = 'grid';
        rpvSection.style.opacity = '0';
        rpvSection.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          rpvSection.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          rpvSection.style.opacity = '1';
          rpvSection.style.transform = 'translateY(0)';
        }, 50);
      }
      // Add visual highlights to cost-related elements
      $all('.rpv-card, .ecommerce-section').forEach(el => {
        el.style.transition = 'all 0.3s ease';
      });
    } else {
      body.classList.remove('investor-mode');
      
      // Toggle benchmark views back
      if (defaultBenchmarks) defaultBenchmarks.style.display = 'grid';
      if (investorBenchmarks) investorBenchmarks.style.display = 'none';
      
      // Hide RPV and Industry cards with animation
      if (rpvSection) {
        rpvSection.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        rpvSection.style.opacity = '0';
        rpvSection.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          rpvSection.style.display = 'none';
        }, 300);
      }
      $all('.rpv-card, .ecommerce-section').forEach(el => {
        el.style.transition = '';
      });
    }
  }

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

  function init(){
    populateTopKeywords();
    renderOverview();
    renderDocs();
    renderEcommerce();
    renderCharts();
    updatePaymentCeilings();
    initDarkMode();

    // Setup investor demo mode toggle first
    const investorToggle = document.getElementById('investorMode');
    if (investorToggle) {
      // Start with toggle off and cards hidden
      investorToggle.checked = false;
      toggleInvestorMode(false);
      
      // Add event listener
      investorToggle.addEventListener('change', (e) => {
        toggleInvestorMode(e.target.checked);
      });
    }

    // Listen for data changes from other pages
    if (window.ShopThatData) {
      window.ShopThatData.on('keywords', () => {
        populateTopKeywords();
        renderOverview();
      });
      
      window.ShopThatData.on('chatAnalytics', () => {
        renderOverview();
        updatePaymentCeilings();
      });
    }

    // RPV info button
    const rpvInfo = document.getElementById('rpv-info');
    rpvInfo && rpvInfo.addEventListener('click', showRPVInfo);

    // Filters
    const kwSearch = document.getElementById('kwSearch');
    kwSearch && kwSearch.addEventListener('input', (e)=>{
      populateTopKeywords(e.target.value||'');
    });
    const range = document.getElementById('range');
    const reset = document.getElementById('resetDashboard');
    reset && reset.addEventListener('click', ()=>{
      if (kwSearch) kwSearch.value='';
      if (range) range.value = 'month';
      if (investorToggle) {
        investorToggle.checked = false;
        toggleInvestorMode(false);
      }
      populateTopKeywords('');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


