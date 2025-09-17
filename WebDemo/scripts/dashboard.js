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

  function populateTopKeywords(filterTerm=''){
    const body = $('#top-keywords-body');
    if (!body) return;
    body.replaceChildren();
    const stored = loadStored();
    const fromStorage = stored.length ? stored.map(k=>[k.name, k.value, `$${(k.value * 0.25).toFixed(2)}`]) : [];
    const left = (fromStorage.length?fromStorage:topKeywordsLeft).filter(([n]) => n.toLowerCase().includes(filterTerm.toLowerCase()));
    const right = topKeywordsRight.filter(([n]) => n.toLowerCase().includes(filterTerm.toLowerCase()));
    const max = Math.max(left.length, right.length);
    for (let i=0;i<max;i++){
      const l = left[i] || ['', '', ''];
      const r = right[i] || ['', '', ''];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td><td>${r[1]}</td>`;
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
    const el = $('#doc-access');
    if (!el) return;
    el.replaceChildren();
    ['Document name here','Document name here','Document name here','Document name here']
      .forEach((name, i)=>{
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<span>${String(i+1).padStart(2,'0')}</span>
          <div>
            <div>${name}</div>
            <div class="bar"><span style="width:${[45,29,18,25][i]}%"></span></div>
          </div>
          <strong>${[45,29,18,25][i]}%</strong>`;
        el.appendChild(row);
      });
  }

  function renderEcommerce(){
    const el = $('#ecommerce-products');
    if (!el) return;
    el.replaceChildren();
    
    const lvProducts = [
      { name: 'Keepall 50', price: '$2,570', cost: '$32.13', uses: 125 },
      { name: 'Neverfull MM', price: '$2,030', cost: '$41.25', uses: 165 },
      { name: 'Speedy 30', price: '$1,760', cost: '$28.75', uses: 115 },
      { name: 'Twist Bag', price: '$4,400', cost: '$67.50', uses: 270 },
      { name: 'Capucines MM', price: '$5,800', cost: '$89.25', uses: 357 }
    ];
    
    lvProducts.forEach(product => {
      const item = document.createElement('div');
      item.className = 'product-item';
      item.innerHTML = `
        <div class="product-image">LV ${product.name}</div>
        <div class="product-name">${product.name}</div>
        <div class="product-price">${product.price}</div>
        <div class="product-cost">RPV Cost: ${product.cost}</div>
      `;
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
    
    if (enabled) {
      body.classList.add('investor-mode');
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


