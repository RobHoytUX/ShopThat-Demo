(function(){
  const STORAGE_KEY = 'st_keywords_v1';
  const CONNECTIONS_KEY = 'st_connections_v1';
  
  // Track selected keywords for bulk operations
  let selectedKeywords = new Set();
  
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
  
  // Confirmation modal
  function showConfirmModal(title, message, onConfirm) {
    // Remove existing modal if any
    const existing = document.getElementById('confirmModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'confirm-modal-overlay';
    modal.innerHTML = `
      <div class="confirm-modal">
        <div class="confirm-modal__header">
          <h3>${title}</h3>
        </div>
        <div class="confirm-modal__body">
          <p>${message}</p>
        </div>
        <div class="confirm-modal__footer">
          <button class="btn btn--secondary" id="confirmCancel">Cancel</button>
          <button class="btn btn--danger" id="confirmDelete">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('confirmCancel').addEventListener('click', () => {
      modal.remove();
    });
    
    document.getElementById('confirmDelete').addEventListener('click', () => {
      onConfirm();
      modal.remove();
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    // Close on Escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  // Update bulk action bar visibility
  function updateBulkActionBar() {
    let bar = document.getElementById('bulkActionBar');
    if (selectedKeywords.size > 0) {
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'bulkActionBar';
        bar.className = 'bulk-action-bar';
        bar.innerHTML = `
          <span class="bulk-action-bar__count"><span id="selectedCount">0</span> selected</span>
          <button class="btn btn--secondary" id="bulkSelectAll">Select All</button>
          <button class="btn btn--secondary" id="bulkDeselectAll">Deselect All</button>
          <button class="btn btn--danger" id="bulkDelete">Delete Selected</button>
        `;
        document.querySelector('.keywords').insertBefore(bar, document.querySelector('.keywords-gallery'));
        
        document.getElementById('bulkSelectAll').addEventListener('click', () => {
          const arr = load();
          arr.forEach(k => selectedKeywords.add(k.name));
          renderWithSearch(true);
        });

        document.getElementById('bulkDeselectAll').addEventListener('click', () => {
          selectedKeywords.clear();
          renderWithSearch(true);
        });
        
        document.getElementById('bulkDelete').addEventListener('click', () => {
          const count = selectedKeywords.size;
          showConfirmModal(
            'Delete Selected Keywords',
            `Are you sure you want to delete ${count} keyword${count > 1 ? 's' : ''}? This will also remove all their connections.`,
            () => {
              const arr = load();
              const conns = loadConnections();
              
              // Remove selected keywords
              const newArr = arr.filter(k => !selectedKeywords.has(k.name));
              
              // Remove connections involving selected keywords
              const newConns = conns.filter(c => 
                !selectedKeywords.has(c.source) && !selectedKeywords.has(c.target)
              );
              
              save(newArr);
              saveConnections(newConns);
              selectedKeywords.clear();
              renderWithSearch(true);
            }
          );
        });
      }
      document.getElementById('selectedCount').textContent = selectedKeywords.size;
      bar.style.display = 'flex';
    } else if (bar) {
      bar.style.display = 'none';
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
  
  function renderWithSearch(preserveScroll = false) {
    // The scrollable container is #main.keywords with overflow-y: auto
    const mainEl = document.getElementById('main');
    const savedScrollTop = preserveScroll && mainEl ? mainEl.scrollTop : 0;
    
    const data = load();
    const filteredData = filterData(data);
    renderKeywords(filteredData);
    
    if (preserveScroll && mainEl && savedScrollTop > 0) {
      // Use double RAF to ensure layout is complete before restoring scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mainEl.scrollTop = savedScrollTop;
        });
      });
    }
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
      
      const isSelected = selectedKeywords.has(k.name);
      const isDisabled = k.disabled === true;
      card.innerHTML = `
        <div class="keyword-card__select">
          <label class="keyword-checkbox">
            <input type="checkbox" data-select-keyword="${k.name}" ${isSelected ? 'checked' : ''} />
            <span class="keyword-checkbox__mark"></span>
          </label>
        </div>
        <div class="keyword-card__content">
          <div class="keyword-card__header">
            <h3 class="keyword-card__title">${k.name}</h3>
            <div class="keyword-card__header-actions">
              <span class="keyword-card__group keyword-card__group--${k.group || 1}">${groupLabels[k.group || 1]}</span>
              <label class="keyword-toggle" title="${isDisabled ? 'Enable' : 'Disable'} keyword">
                <input type="checkbox" data-toggle-keyword="${k.name}" ${!isDisabled ? 'checked' : ''} />
                <span class="keyword-toggle__slider"></span>
              </label>
              <button class="keyword-card__delete-btn" data-delete-keyword="${k.name}" title="Delete keyword">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"></path>
                </svg>
              </button>
            </div>
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
        </div>
      `;
      if (isSelected) card.classList.add('keyword-card--selected');
      if (isDisabled) card.classList.add('keyword-card--disabled');
      list.appendChild(card);
    });

    // Handle checkbox selection
    list.querySelectorAll('input[data-select-keyword]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const keyword = checkbox.getAttribute('data-select-keyword');
        const card = checkbox.closest('.keyword-card');
        if (checkbox.checked) {
          selectedKeywords.add(keyword);
          card.classList.add('keyword-card--selected');
        } else {
          selectedKeywords.delete(keyword);
          card.classList.remove('keyword-card--selected');
        }
        updateBulkActionBar();
      });
    });
    
    // Handle disable/enable toggle
    list.querySelectorAll('input[data-toggle-keyword]').forEach(toggle => {
      toggle.addEventListener('change', () => {
        const keyword = toggle.getAttribute('data-toggle-keyword');
        const arr = load();
        const kwIdx = arr.findIndex(k => k.name === keyword);
        if (kwIdx !== -1) {
          arr[kwIdx].disabled = !toggle.checked;
          save(arr);
          renderWithSearch(true);
        }
      });
    });
    
    // Handle individual delete buttons
    list.querySelectorAll('button[data-delete-keyword]').forEach(btn => {
      btn.addEventListener('click', () => {
        const keyword = btn.getAttribute('data-delete-keyword');
        showConfirmModal(
          'Delete Keyword',
          `Are you sure you want to delete "${keyword}"? This will also remove all its connections.`,
          () => {
            const arr = load();
            const conns = loadConnections();
            
            // Remove the keyword
            const newArr = arr.filter(k => k.name !== keyword);
            
            // Remove connections involving this keyword
            const newConns = conns.filter(c => 
              c.source !== keyword && c.target !== keyword
            );
            
            save(newArr);
            saveConnections(newConns);
            selectedKeywords.delete(keyword);
            renderWithSearch(true);
          }
        );
      });
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
        renderWithSearch(true);
      });
    });
    
    // Update bulk action bar
    updateBulkActionBar();

    // Handle level selector changes
    list.querySelectorAll('.level-selector').forEach(select=>{
      select.addEventListener('change', ()=>{
        const keywordIdx = Number(select.getAttribute('data-keyword-idx'));
        const newLevel = Number(select.value);
        
        const arr = load();
        if (arr[keywordIdx]) {
          arr[keywordIdx].group = newLevel;
          save(arr);
          renderWithSearch(true); // Re-render to update the group badge
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
        renderWithSearch(true);
      });
    });
  }

  // ============================
  // Add Keyword Side Panel
  // ============================
  let panelSelectedConnections = [];

  function openAddPanel() {
    const panel = document.getElementById('mkAddPanel');
    const overlay = document.getElementById('mkPanelOverlay');
    if (!panel) return;

    // Reset form
    document.getElementById('mkPanelName').value = '';
    document.getElementById('mkPanelLevel').value = '1';
    document.getElementById('mkPanelConnSearch').value = '';
    panelSelectedConnections = [];
    renderPanelChips();
    renderPanelResults('');

    panel.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');
    setTimeout(() => document.getElementById('mkPanelName').focus(), 300);
  }

  function closeAddPanel() {
    const panel = document.getElementById('mkAddPanel');
    const overlay = document.getElementById('mkPanelOverlay');
    if (panel) panel.setAttribute('aria-hidden', 'true');
    if (overlay) overlay.classList.remove('active');
  }

  function renderPanelChips() {
    const container = document.getElementById('mkPanelSelectedConns');
    if (!container) return;
    container.innerHTML = panelSelectedConnections.map(name => 
      `<span class="mk-conn-chip">${name}<button class="mk-conn-chip__remove" data-name="${name}">&times;</button></span>`
    ).join('');

    container.querySelectorAll('.mk-conn-chip__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        panelSelectedConnections = panelSelectedConnections.filter(n => n !== btn.dataset.name);
        renderPanelChips();
        renderPanelResults(document.getElementById('mkPanelConnSearch').value);
      });
    });
  }

  function renderPanelResults(query) {
    const container = document.getElementById('mkPanelConnResults');
    if (!container) return;
    const keywords = load();
    const q = (query || '').toLowerCase().trim();

    if (!q) {
      container.classList.remove('has-results');
      container.innerHTML = '';
      return;
    }

    const filtered = keywords
      .filter(kw => kw.name.toLowerCase().includes(q) && !panelSelectedConnections.includes(kw.name))
      .slice(0, 15);

    if (filtered.length === 0) {
      container.classList.remove('has-results');
      container.innerHTML = '';
      return;
    }

    container.classList.add('has-results');
    container.innerHTML = filtered.map(kw =>
      `<div class="mk-conn-result" data-name="${kw.name}">${kw.name}</div>`
    ).join('');

    container.querySelectorAll('.mk-conn-result').forEach(el => {
      el.addEventListener('click', () => {
        panelSelectedConnections.push(el.dataset.name);
        renderPanelChips();
        renderPanelResults(document.getElementById('mkPanelConnSearch').value);
      });
    });
  }

  function saveFromPanel() {
    const nameInput = document.getElementById('mkPanelName');
    const levelSelect = document.getElementById('mkPanelLevel');
    const name = (nameInput.value || '').trim();
    if (!name) { nameInput.focus(); return; }

    const arr = load();
    if (arr.find(x => x.name.toLowerCase() === name.toLowerCase())) {
      nameInput.style.borderColor = '#ef4444';
      setTimeout(() => nameInput.style.borderColor = '', 2000);
      return;
    }

    const group = parseInt(levelSelect.value) || 1;
    arr.push({ id: name, name: name, value: 50, group: group });
    save(arr);

    // Save connections
    if (panelSelectedConnections.length > 0) {
      const conns = loadConnections();
      panelSelectedConnections.forEach(target => {
        if (!conns.find(c => (c.source === name && c.target === target) || (c.source === target && c.target === name))) {
          conns.push({ source: name, target: target });
        }
      });
      saveConnections(conns);
    }

    closeAddPanel();
    renderWithSearch();
  }

  function initAddPanel() {
    document.getElementById('mkPanelClose')?.addEventListener('click', closeAddPanel);
    document.getElementById('mkPanelCancel')?.addEventListener('click', closeAddPanel);
    document.getElementById('mkPanelOverlay')?.addEventListener('click', closeAddPanel);
    document.getElementById('mkPanelSave')?.addEventListener('click', saveFromPanel);

    document.getElementById('mkPanelConnSearch')?.addEventListener('input', (e) => {
      renderPanelResults(e.target.value);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const panel = document.getElementById('mkAddPanel');
        if (panel && panel.getAttribute('aria-hidden') === 'false') {
          closeAddPanel();
        }
      }
    });

    // Save on Enter in name field
    document.getElementById('mkPanelName')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveFromPanel();
    });
  }

  // ============================
  // Init
  // ============================
  function init(){
    const add = document.getElementById('mk-add');
    const clear = document.getElementById('mk-clear');
    const searchInput = document.getElementById('mk-search');

    // Search functionality
    searchInput && searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderWithSearch();
    });

    // Add keyword opens side panel
    add && add.addEventListener('click', openAddPanel);

    // Clear all with warning modal
    clear && clear.addEventListener('click', () => {
      const keywords = load();
      const count = keywords.length;
      showConfirmModal(
        'Clear All Keywords',
        `This will permanently delete all <strong>${count} keywords</strong> and their connections. This action cannot be undone.`,
        () => { save([]); saveConnections([]); renderWithSearch(); }
      );
    });
    
    // Initialize add panel
    initAddPanel();
    
    renderWithSearch();
  }

  // Remove the old render function since we replaced it with renderWithSearch/renderKeywords
  function render() {
    renderWithSearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


