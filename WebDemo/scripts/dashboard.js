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
    ['The Plaza', 1250, '$312.50'],
    ['Cafe Carlyle', 1180, '$295.00'],
    ['Le Bernardin', 1120, '$280.00'],
    ['Jean-Georges Vongerichten', 1080, '$270.00'],
    ['The St. Regis', 1020, '$255.00']
  ];
  const topKeywordsRight = [
    ['The Baccarat', 980, '$245.00'],
    ['The Mark Hotel', 920, '$230.00'],
    ['The Modern', 950, '$237.50'],
    ['The Carlyle', 1050, '$262.50'],
    ['Three Michelin Stars', 1000, '$250.00']
  ];

  function populateTopKeywords(filterTerm=''){
    const body = $('#top-keywords-body');
    if (!body) return;
    body.replaceChildren();
    
    // Restaurant & Hotel keywords data (All NYC venues)
    const topKeywordsData = [
      // The Plaza keywords
      { name: 'The Plaza', revenue: 35000, engagement: 48 },
      { name: 'Afternoon Tea', revenue: 18000, engagement: 35 },
      // The Carlyle keywords
      { name: 'Cafe Carlyle', revenue: 30000, engagement: 45 },
      { name: 'The Carlyle', revenue: 28000, engagement: 43 },
      { name: 'Bemelmans Bar', revenue: 22000, engagement: 38 },
      { name: 'Classic Cabaret', revenue: 16000, engagement: 35 },
      // Jean-Georges keywords
      { name: 'Jean-Georges Vongerichten', revenue: 27000, engagement: 42 },
      { name: 'Jean-Georges at The Mark', revenue: 24000, engagement: 40 },
      // The St. Regis keywords
      { name: 'The St. Regis', revenue: 26000, engagement: 41 },
      { name: 'King Cole Bar', revenue: 15000, engagement: 32 },
      // The Baccarat keywords
      { name: 'The Baccarat', revenue: 25000, engagement: 40 },
      { name: 'Indoor Pool', revenue: 12000, engagement: 28 },
      // The Mark Hotel keywords
      { name: 'The Mark Hotel', revenue: 23000, engagement: 39 },
      { name: 'Metropolitan Museum of Art', revenue: 18000, engagement: 34 },
      // Le Bernardin keywords
      { name: 'Le Bernardin', revenue: 28000, engagement: 42 },
      { name: 'Three Michelin Stars', revenue: 25000, engagement: 40 },
      { name: 'Eric Ripert', revenue: 20000, engagement: 36 },
      // The Modern keywords
      { name: 'The Modern', revenue: 25000, engagement: 38 },
      { name: 'Two Michelin Stars', revenue: 20000, engagement: 35 },
      { name: 'MoMA Museum', revenue: 15000, engagement: 28 }
    ];
    
    // Filter keywords based on search term
    const filteredKeywords = topKeywordsData
      .filter(k => k.name.toLowerCase().includes(filterTerm.toLowerCase()))
      .sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending
      .slice(0, 10); // Show top 10
    
    // Populate table with keywords
    filteredKeywords.forEach(keyword => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${keyword.name}</td>
        <td>$${keyword.revenue.toLocaleString()}</td>
        <td>${keyword.engagement}%</td>
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
        name: 'LV X YK CAPUCINES BB', 
        price: '$6,400', 
        cost: '$95.50', 
        uses: 382,
        image: 'assets/Products/0047_LV X YK Capucines BB.jpg',
        description: 'Louis Vuitton x Yayoi Kusama collaboration. Black leather Capucines BB bag featuring Kusama\'s iconic multicolored polka dots. Limited edition collectible piece.',
        category: 'Handbags - Kusama Collection',
        material: 'Polka Dot Leather',
        dimensions: '21 x 14 x 8 cm',
        avgSessionTime: '6m 15s',
        conversionRate: '22.5%',
        totalRevenue: '$144,800',
        keywordMentions: 342
      },
      { 
        id: 2,
        name: 'LV X YK CAPUCINES BB WHITE', 
        price: '$6,400', 
        cost: '$92.75', 
        uses: 371,
        image: 'assets/Products/0048_LV X YK Capucines BB-white.jpg',
        description: 'Louis Vuitton x Yayoi Kusama collaboration. Ivory leather Capucines BB bag adorned with vibrant multicolored polka dots. Rare limited edition design.',
        category: 'Handbags - Kusama Collection',
        material: 'Polka Dot Leather',
        dimensions: '21 x 14 x 8 cm',
        avgSessionTime: '5m 52s',
        conversionRate: '21.8%',
        totalRevenue: '$139,264',
        keywordMentions: 318
      },
      { 
        id: 3,
        name: 'LV X YK TWIST MM RED WHITE', 
        price: '$4,200', 
        cost: '$68.25', 
        uses: 273,
        image: 'assets/Products/0049_Louis-Vuitton-x-Yayoi-Kusama-Twist-MM-Red-White.jpg',
        description: 'Louis Vuitton x Yayoi Kusama collaboration. Bold red leather Twist MM bag with white polka dots and crystal-embellished LV logo. Statement piece from this iconic collaboration.',
        category: 'Handbags - Kusama Collection',
        material: 'Polka Dot Leather & Crystal',
        dimensions: '23 x 17 x 9 cm',
        avgSessionTime: '4m 38s',
        conversionRate: '18.2%',
        totalRevenue: '$76,440',
        keywordMentions: 245
      },
      { 
        id: 4,
        name: 'LV X YK CAPUCINES BB SILVER', 
        price: '$6,400', 
        cost: '$94.00', 
        uses: 376,
        image: 'assets/Products/0055_Louis-Vuitton-x-Yayoi-Kusama-Capucines-BB-Silver.jpg',
        description: 'Louis Vuitton x Yayoi Kusama collaboration. Metallic silver leather Capucines BB bag with studded polka dot details. Futuristic interpretation of Kusama\'s signature motif.',
        category: 'Handbags - Kusama Collection',
        material: 'Metallic Studded Leather',
        dimensions: '21 x 14 x 8 cm',
        avgSessionTime: '6m 02s',
        conversionRate: '23.1%',
        totalRevenue: '$150,528',
        keywordMentions: 335
      },
      { 
        id: 5,
        name: 'LV X YK POLKA DOT BODYSUIT', 
        price: '$3,200', 
        cost: '$52.50', 
        uses: 210,
        image: 'assets/Products/0083_Louis-Vuitton-x-Yayoi-Kusama-Painted-Dots-One-Piece-Swimsuit-Black.jpg',
        description: 'Louis Vuitton x Yayoi Kusama collaboration. Black bodysuit with vibrant multicolored polka dots. Wearable art piece celebrating Kusama\'s iconic infinity dots.',
        category: 'Ready-to-Wear - Kusama Collection',
        material: 'Polka Dot Print Fabric',
        dimensions: 'Various Sizes Available',
        avgSessionTime: '3m 45s',
        conversionRate: '14.5%',
        totalRevenue: '$46,400',
        keywordMentions: 186
      }
    ];
    
    lvProducts.forEach(product => {
      const item = document.createElement('div');
      item.className = 'product-item';
      item.setAttribute('data-product-id', product.id);
      item.innerHTML = `
        <div class="product-image">
          <img src="${product.image}" alt="LV ${product.name}" />
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
          <img src="${product.image}" alt="${product.name}" />
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


