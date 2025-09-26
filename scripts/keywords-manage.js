(function(){
  const STORAGE_KEY = 'st_keywords_v1';
  const CONNECTIONS_KEY = 'st_connections_v1';
  
  function load(){ 
    if (window.ShopThatData) return window.ShopThatData.getKeywords();
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; } 
  }
  function save(arr){ 
    if (window.ShopThatData) {
      window.ShopThatData.saveKeywords(arr);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); 
    }
  }
  function loadConnections(){ 
    if (window.ShopThatData) return window.ShopThatData.getConnections();
    try { return JSON.parse(localStorage.getItem(CONNECTIONS_KEY)||'[]'); } catch { return []; } 
  }
  function saveConnections(arr){ 
    if (window.ShopThatData) {
      window.ShopThatData.saveConnections(arr);
    } else {
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(arr)); 
    }
  }

  function render(){
    const list = document.getElementById('mk-list');
    if (!list) return;
    const data = load();
    const connections = loadConnections();
    list.replaceChildren();
    
    if (!data.length){ 
      list.innerHTML = '<div style="color:#666; text-align: center; padding: 40px; grid-column: 1 / -1;">No keywords yet. Add some keywords to get started.</div>'; 
      return; 
    }
    
    data.forEach((k, idx)=>{
      const card = document.createElement('div');
      card.className = 'keyword-card';
      
      const connectedTo = connections.filter(c => c.source === k.name || c.target === k.name);
      const connectionsList = connectedTo.map(c => ({
        name: c.source === k.name ? c.target : c.source,
        connection: c
      }));
      
      const connectionsHTML = connectionsList.length > 0 
        ? connectionsList.map(conn => `
          <span class="connection-tag">
            ${conn.name}
            <span class="connection-tag__remove" data-remove-connection='${JSON.stringify(conn.connection)}' title="Remove connection">×</span>
          </span>
        `).join('')
        : '<span style="color: #9ca3af; font-size: 11px;">No connections</span>';
      
      // Get level info
      const levelNames = {1: 'Top Level', 2: 'Connected', 3: 'Secondary', 4: 'Isolated'};
      const levelColors = {1: '#6366F1', 2: '#5B21B6', 3: '#F59E0B', 4: '#10B981'};
      const currentLevel = k.group || 1;
      
      card.innerHTML = `
        <div class="keyword-card__header">
          <h3 class="keyword-card__name">${k.name}</h3>
          <button class="btn btn--secondary keyword-card__remove" data-idx="${idx}" title="Remove keyword">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"></polyline>
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2,2h4a2,2,0,0,1,2,2v2"></path>
            </svg>
          </button>
        </div>
        <div class="keyword-card__level">
          <div class="keyword-card__level-title">Hierarchy Level</div>
          <div class="keyword-card__level-control">
            <select class="select select--compact" data-level-change="${k.name}">
              <option value="1" ${currentLevel === 1 ? 'selected' : ''}>Top Level</option>
              <option value="2" ${currentLevel === 2 ? 'selected' : ''}>Connected</option>
              <option value="3" ${currentLevel === 3 ? 'selected' : ''}>Secondary</option>
              <option value="4" ${currentLevel === 4 ? 'selected' : ''}>Isolated</option>
            </select>
            <span class="level-indicator" style="background-color: ${levelColors[currentLevel]};" title="${levelNames[currentLevel]}"></span>
          </div>
        </div>
        <div class="keyword-card__connections">
          <div class="keyword-card__connections-title">Connections</div>
          <div class="keyword-card__connections-list">
            ${connectionsHTML}
          </div>
        </div>
        <div class="keyword-card__add-connection">
          <input type="text" class="input" placeholder="Connect to..." data-keyword="${k.name}" />
          <button class="btn btn--secondary" data-connect="${k.name}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      `;
      list.appendChild(card);
    });

    // Handle remove keyword buttons
    list.querySelectorAll('button[data-idx]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i = Number(btn.getAttribute('data-idx'));
        const arr = load();
        const keyword = arr[i].name;
        // Remove connections involving this keyword
        const conns = loadConnections().filter(c => c.source !== keyword && c.target !== keyword);
        saveConnections(conns);
        arr.splice(i,1); save(arr); render();
      });
    });

    // Handle remove connection buttons
    list.querySelectorAll('[data-remove-connection]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const connectionData = JSON.parse(btn.getAttribute('data-remove-connection'));
        const conns = loadConnections().filter(c => 
          !(c.source === connectionData.source && c.target === connectionData.target) &&
          !(c.source === connectionData.target && c.target === connectionData.source)
        );
        saveConnections(conns);
        render();
      });
    });

    // Handle connect buttons
    list.querySelectorAll('button[data-connect]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const sourceKeyword = btn.getAttribute('data-connect');
        const input = list.querySelector(`input[data-keyword="${sourceKeyword}"]`);
        const targetKeyword = (input.value||'').trim();
        if (!targetKeyword) return;
        
        const keywords = load();
        if (!keywords.find(k => k.name.toLowerCase() === targetKeyword.toLowerCase())) {
          alert('Target keyword must exist in the list first.');
          return;
        }
        
        const conns = loadConnections();
        const exists = conns.find(c => 
          (c.source === sourceKeyword && c.target === targetKeyword) ||
          (c.source === targetKeyword && c.target === sourceKeyword)
        );
        if (!exists) {
          conns.push({ source: sourceKeyword, target: targetKeyword });
          saveConnections(conns);
        }
        input.value = '';
        render();
      });
    });

    // Handle level change dropdowns
    list.querySelectorAll('select[data-level-change]').forEach(select => {
      select.addEventListener('change', () => {
        const keywordName = select.getAttribute('data-level-change');
        const newLevel = parseInt(select.value);
        
        const keywords = load();
        const keyword = keywords.find(k => k.name === keywordName);
        if (keyword) {
          keyword.group = newLevel;
          save(keywords);
          render(); // Re-render to update the level indicator
        }
      });
    });
  }

  // Search functionality
  function applySearch(term) {
    const cards = document.querySelectorAll('.keyword-card');
    const searchTerm = term.toLowerCase();
    
    cards.forEach(card => {
      const keywordName = card.querySelector('.keyword-card__name').textContent.toLowerCase();
      const connections = Array.from(card.querySelectorAll('.connection-tag')).map(tag => 
        tag.textContent.replace('×', '').trim().toLowerCase()
      ).join(' ');
      
      const matches = keywordName.includes(searchTerm) || connections.includes(searchTerm);
      card.style.display = matches ? 'block' : 'none';
    });
  }

  function init(){
    const add = document.getElementById('mk-add');
    const clear = document.getElementById('mk-clear');
    const name = document.getElementById('mk-name');
    const level = document.getElementById('mk-level');
    const search = document.getElementById('mk-search');

    // Search functionality
    search && search.addEventListener('input', (e) => {
      applySearch(e.target.value);
    });

    // Add keyword on button click
    add && add.addEventListener('click', addKeyword);
    
    // Add keyword on Enter key
    name && name.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addKeyword();
    });

    function addKeyword(){
      const n = (name.value||'').trim();
      if (!n) return;
      const arr = load();
      if (arr.find(x=>x.name.toLowerCase()===n.toLowerCase())) return;
      
      const selectedLevel = level ? parseInt(level.value) : 1;
      arr.push({ id: n, name: n, value: 50, group: selectedLevel });
      save(arr); 
      name.value=''; 
      if (level) level.value = '1'; // Reset to default
      render();
    }

    clear && clear.addEventListener('click', ()=>{ 
      if (confirm('Are you sure you want to clear all keywords and connections?')) {
        save([]); saveConnections([]); render(); 
      }
    });
    
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


