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
    if (!data.length){ list.innerHTML = '<div style="color:#666">No keywords yet.</div>'; return; }
    
    data.forEach((k, idx)=>{
      const row = document.createElement('div');
      row.className = 'row';
      const connectedTo = connections.filter(c => c.source === k.name || c.target === k.name);
      const connectionsList = connectedTo.map(c => c.source === k.name ? c.target : c.source).join(', ') || 'None';
      
      row.innerHTML = `<div></div>
        <div>
          <div><strong>${k.name}</strong></div>
          <div style="font-size:12px; color:#666;">Connected to: ${connectionsList}</div>
          <div style="margin-top:4px;">
            <input type="text" class="input" placeholder="Connect to..." style="width:140px; font-size:12px; padding:4px 8px;" data-keyword="${k.name}" />
            <button class="btn btn--secondary" style="font-size:11px; padding:4px 8px;" data-connect="${k.name}">Connect</button>
          </div>
        </div>
        <button data-idx="${idx}" class="btn btn--secondary" style="font-size:11px;">Remove</button>`;
      list.appendChild(row);
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

  function init(){
    const add = document.getElementById('mk-add');
    const clear = document.getElementById('mk-clear');
    const name = document.getElementById('mk-name');

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
      arr.push({ id: n, name: n, value: 50, group: 1 }); // default values
      save(arr); name.value=''; render();
    }

    clear && clear.addEventListener('click', ()=>{ 
      save([]); saveConnections([]); render(); 
    });
    
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


