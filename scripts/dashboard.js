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

  const topKeywordsLeft = [
    ['Roger Federer', 348],
    ['Rafael Nadal', 230],
    ['Oscars', 100],
    ['Olympics', 54],
    ['Zendaya', 90]
  ];
  const topKeywordsRight = [
    ['Trio Messenger', 80],
    ['Takashi Murakami', 500],
    ['Yayoi Kasuma', 908],
    ['Keepall Bag', 200],
    ['Météore', 240]
  ];

  function populateTopKeywords(filterTerm=''){
    const body = $('#top-keywords-body');
    if (!body) return;
    body.replaceChildren();
    const left = topKeywordsLeft.filter(([n]) => n.toLowerCase().includes(filterTerm.toLowerCase()));
    const right = topKeywordsRight.filter(([n]) => n.toLowerCase().includes(filterTerm.toLowerCase()));
    const max = Math.max(left.length, right.length);
    for (let i=0;i<max;i++){
      const l = left[i] || ['', ''];
      const r = right[i] || ['', ''];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${l[0]}</td><td>${l[1]}</td><td>${r[0]}</td><td>${r[1]}</td>`;
      body.appendChild(tr);
    }
    const link = $('#view-keywords');
    if (link){ link.addEventListener('click', ()=>{}); }
  }

  function renderOverview(){
    const data = [
      ['User Interactions','25%'],
      ['Conversions','2%'],
      ['Paid Keywords','60%'],
      ['Average Chatbot Conversion','43 sec']
    ];
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

  function init(){
    populateTopKeywords();
    renderOverview();
    renderDocs();
    renderCharts();

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
      populateTopKeywords('');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


