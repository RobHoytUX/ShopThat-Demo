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
      const emptyState = document.createElement('div');
      emptyState.style.cssText = 'color:#666; text-align:center; padding:40px; grid-column: 1 / -1;';
      emptyState.textContent = 'No keywords yet. Add your first keyword above.';
      list.appendChild(emptyState);
      return; 
    }
    
    data.forEach((k, idx)=>{
      const card = document.createElement('div');
      card.className = 'keyword-card';
      const connectedTo = connections.filter(c => c.source === k.name || c.target === k.name);
      const connectionsList = connectedTo.map(c => c.source === k.name ? c.target : c.source).join(', ') || 'None';
      
      const groupLabels = {
        1: 'Top Level',
        2: 'Connected',
        3: 'Secondary',
        4: 'Isolated'
      };
      
      card.innerHTML = `
        <div class="keyword-card__header">
          <h3 class="keyword-card__title">${k.name}</h3>
          <span class="keyword-card__group keyword-card__group--${k.group || 1}">${groupLabels[k.group || 1]}</span>
        </div>
        <div class="keyword-card__connections">Connected to: ${connectionsList}</div>
        <div class="keyword-card__actions">
          <div class="keyword-card__connect">
            <input type="text" class="input" placeholder="Connect to..." data-keyword="${k.name}" />
            <button class="btn btn--secondary" data-connect="${k.name}">Connect</button>
          </div>
          <button data-idx="${idx}" class="btn btn--secondary">Remove</button>
        </div>
      `;
      list.appendChild(card);
    });

    // Handle remove buttons
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
  }

  // Search functionality
  let searchTerm = '';
  
  function filterData(data) {
    if (!searchTerm) return data;
    return data.filter(k => 
      k.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  function renderWithSearch() {
    const data = load();
    const filteredData = filterData(data);
    renderKeywords(filteredData);
  }
  
  function renderKeywords(data) {
    const list = document.getElementById('mk-list');
    if (!list) return;
    const connections = loadConnections();
    list.replaceChildren();
    if (!data.length){ 
      const emptyState = document.createElement('div');
      emptyState.style.cssText = 'color:#666; text-align:center; padding:40px; grid-column: 1 / -1;';
      emptyState.textContent = searchTerm ? 'No keywords match your search.' : 'No keywords yet. Add your first keyword above.';
      list.appendChild(emptyState);
      return; 
    }
    
    const allData = load(); // Get all data for level updates
    data.forEach((k, displayIdx)=>{
      const actualIdx = allData.findIndex(item => item.name === k.name);
      const card = document.createElement('div');
      card.className = 'keyword-card';
      const connectedTo = connections.filter(c => c.source === k.name || c.target === k.name);
      
      const groupLabels = {
        1: 'Top Level',
        2: 'Connected',
        3: 'Secondary',
        4: 'Isolated'
      };
      
      // Create connection badges
      const connectionBadgesHtml = connectedTo.length > 0 
        ? connectedTo.map(c => {
            const connectedKeyword = c.source === k.name ? c.target : c.source;
            return `<span class="connection-badge">
              ${connectedKeyword}
              <button class="connection-badge__remove" data-remove-connection="${k.name}" data-connected-to="${connectedKeyword}" title="Remove connection">×</button>
            </span>`;
          }).join('')
        : '<span style="color: #9ca3af; font-size: 12px;">No connections</span>';
      
      card.innerHTML = `
        <div class="keyword-card__header">
          <h3 class="keyword-card__title">${k.name}</h3>
          <span class="keyword-card__group keyword-card__group--${k.group || 1}">${groupLabels[k.group || 1]}</span>
        </div>
        <div class="keyword-card__connections">
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Connections:</div>
          <div class="keyword-card__connections-list">${connectionBadgesHtml}</div>
        </div>
        <div class="keyword-card__level-selector">
          <label for="level-${actualIdx}">Level:</label>
          <select id="level-${actualIdx}" class="level-selector" data-keyword-idx="${actualIdx}">
            <option value="1" ${(k.group || 1) === 1 ? 'selected' : ''}>Top Level</option>
            <option value="2" ${k.group === 2 ? 'selected' : ''}>Connected</option>
            <option value="3" ${k.group === 3 ? 'selected' : ''}>Secondary</option>
            <option value="4" ${k.group === 4 ? 'selected' : ''}>Isolated</option>
          </select>
        </div>
        <div class="keyword-card__actions">
          <div class="keyword-card__connect">
            <input type="text" class="input" placeholder="Connect to..." data-keyword="${k.name}" />
            <button class="btn btn--secondary" data-connect="${k.name}">Connect</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });

    // Handle connection badge removal
    list.querySelectorAll('button[data-remove-connection]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const sourceKeyword = btn.getAttribute('data-remove-connection');
        const targetKeyword = btn.getAttribute('data-connected-to');
        
        // Remove the specific connection
        const conns = loadConnections().filter(c => 
          !((c.source === sourceKeyword && c.target === targetKeyword) ||
            (c.source === targetKeyword && c.target === sourceKeyword))
        );
        saveConnections(conns);
        renderWithSearch();
      });
    });

    // Handle level selector changes
    list.querySelectorAll('.level-selector').forEach(select=>{
      select.addEventListener('change', ()=>{
        const keywordIdx = Number(select.getAttribute('data-keyword-idx'));
        const newLevel = Number(select.value);
        
        const arr = load();
        if (arr[keywordIdx]) {
          arr[keywordIdx].group = newLevel;
          save(arr);
          renderWithSearch(); // Re-render to update the group badge
        }
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
        renderWithSearch();
      });
    });
  }

  function init(){
    const add = document.getElementById('mk-add');
    const clear = document.getElementById('mk-clear');
    const name = document.getElementById('mk-name');
    const searchInput = document.getElementById('mk-search');
    const searchClear = document.getElementById('mk-search-clear');

    // Search functionality
    searchInput && searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderWithSearch();
    });
    
    searchClear && searchClear.addEventListener('click', () => {
      searchTerm = '';
      if (searchInput) searchInput.value = '';
      renderWithSearch();
    });

    // Add keyword on button click
    add && add.addEventListener('click', addKeyword);
    
    // Add keyword on Enter key
    name && name.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addKeyword();
    });

    function addKeyword(){
      const n = (name.value||'').trim();
      const level = document.getElementById('mk-level');
      if (!n) return;
      const arr = load();
      if (arr.find(x=>x.name.toLowerCase()===n.toLowerCase())) return;
      const selectedGroup = level ? parseInt(level.value) : 1;
      arr.push({ id: n, name: n, value: 50, group: selectedGroup });
      save(arr); 
      name.value=''; 
      if (level) level.value = '1'; // Reset to default
      renderWithSearch();
    }

    clear && clear.addEventListener('click', ()=>{ 
      if (confirm('Are you sure you want to clear all keywords and connections?')) {
        save([]); saveConnections([]); renderWithSearch(); 
      }
    });
    
    renderWithSearch();
  }

  // Remove the old render function since we replaced it with renderWithSearch/renderKeywords
  function render() {
    renderWithSearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


