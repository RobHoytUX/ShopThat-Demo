/* Keywords Bubble Graph */
console.log('Keywords.js loading...');
console.log('D3 available:', typeof d3 !== 'undefined');
console.log('Document ready state:', document.readyState);

(function(){
  console.log('IIFE started');
  function $(sel, root=document){ return root.querySelector(sel); }

  const svg = d3.select('#bubbleGraph');
  const container = document.querySelector('.keywords');
  const detailsDrawer = document.getElementById('detailsDrawer');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerBody = document.getElementById('drawerBody');
  const detailsClose = document.getElementById('detailsClose');
  const neo4jDrawer = document.getElementById('neo4jDrawer');
  const neo4jClose = document.getElementById('neo4jClose');
  const openNeo4jBtn = document.getElementById('openNeo4j');
  const filterInput = document.getElementById('kwFilter');
  const resetBtn = document.getElementById('resetKw');
  const zoomIn = document.getElementById('zoomIn');
  const zoomOut = document.getElementById('zoomOut');
  const fitBtn = document.getElementById('fit');

  console.log('DOM elements check:', {
    svg: svg.node(),
    container: container,
    svgExists: !!document.getElementById('bubbleGraph'),
    containerExists: !!container
  });

  const width = () => svg.node().clientWidth;
  const height = () => svg.node().clientHeight;

  // State management for hierarchical display
  let currentViewMode = 'default'; // 'default' shows top-level + isolated, 'expanded' shows all, 'filtered' shows filtered
  let selectedNode = null;
  let allNodes = [];
  let allLinks = [];
  let visibleNodes = [];
  let visibleLinks = [];
  let filterState = {
    topLevel: true,
    connected: true,
    secondary: true,
    isolated: true
  };

  // Mock graph data (also used for seeding Neo4j). Will be overridden by localStorage if present.
  const defaultNodes = [
    { id: 'Yayoi Kusama', group: 1, value: 90 },
    { id: 'Trio Messenger', group: 1, value: 35 },
    { id: 'Keepall Bag', group: 1, value: 28 },
    { id: 'Takashi Murakami', group: 1, value: 50 },
    { id: 'Oscars', group: 2, value: 18 },
    { id: 'Zendaya', group: 2, value: 22 },
    { id: 'Olympics', group: 2, value: 27 },
    { id: 'Roger Federer', group: 2, value: 30 },
    { id: 'Rafael Nadal', group: 2, value: 24 },
    { id: 'Monogram', group: 3, value: 26 },
    { id: 'Polka Dots', group: 3, value: 20 },
    { id: 'Tote', group: 3, value: 16 },
    { id: 'Isolated Node 1', group: 4, value: 15 },
    { id: 'Isolated Node 2', group: 4, value: 12 }
  ];
  const defaultLinks = [
    { source: 'Yayoi Kusama', target: 'Polka Dots' },
    { source: 'Yayoi Kusama', target: 'Monogram' },
    { source: 'Yayoi Kusama', target: 'Tote' },
    { source: 'Takashi Murakami', target: 'Monogram' },
    { source: 'Keepall Bag', target: 'Monogram' },
    { source: 'Trio Messenger', target: 'Tote' },
    { source: 'Roger Federer', target: 'Olympics' },
    { source: 'Rafael Nadal', target: 'Olympics' },
    { source: 'Zendaya', target: 'Oscars' }
  ];

  const STORAGE_KEY = 'st_keywords_v1';
  function loadStored(){
    if (window.ShopThatData) return window.ShopThatData.getKeywords();
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; }
  }
  function loadStoredConnections(){
    if (window.ShopThatData) return window.ShopThatData.getConnections();
    try { return JSON.parse(localStorage.getItem('st_connections_v1')||'[]'); } catch { return []; }
  }
  
  // Initialize with default data first, then try to load from storage
  let initialNodes = defaultNodes.slice();
  let initialLinks = defaultLinks.slice();
  
  // Try to load from shared data system
  const storedNodes = loadStored();
  const storedConnections = loadStoredConnections();
  
  if (storedNodes.length > 0) {
    // Convert stored format to D3 format if needed
    initialNodes = storedNodes.map(node => ({
      id: node.id || node.name,
      group: node.group || 1,
      value: node.value || 50
    }));
    console.log('Loaded stored nodes:', initialNodes.map(n => ({ id: n.id, group: n.group })));
  }
  
  if (storedConnections.length > 0) {
    initialLinks = storedConnections.slice();
  }
  
  // Ensure we always have some data to display
  if (initialNodes.length === 0) {
    console.warn('No nodes found, using default data');
    initialNodes = defaultNodes.slice();
    initialLinks = defaultLinks.slice();
  } else {
    // If we have stored data but it's all group 1, let's add some variety for demonstration
    const hasVariety = initialNodes.some(node => node.group !== 1);
    if (!hasVariety && initialNodes.length > 4) {
      console.log('Adding group variety to stored nodes');
      // Make some nodes isolated (group 4) for demonstration
      if (initialNodes.length > 6) {
        initialNodes[initialNodes.length - 1].group = 4;
        initialNodes[initialNodes.length - 2].group = 4;
      }
      // Make some nodes secondary (group 3)
      if (initialNodes.length > 4) {
        initialNodes[Math.floor(initialNodes.length / 2)].group = 3;
        initialNodes[Math.floor(initialNodes.length / 2) + 1].group = 3;
      }
      // Make some nodes connected (group 2)
      if (initialNodes.length > 2) {
        initialNodes[1].group = 2;
        initialNodes[2].group = 2;
      }
    }
  }
  
  // Set up initial graph data using the new system
  allNodes = initialNodes;
  allLinks = initialLinks;
  
  // Initialize with default view
  currentViewMode = 'default';
  visibleNodes = getVisibleNodes();
  visibleLinks = getVisibleLinks(visibleNodes);
  let graphNodes = visibleNodes;
  let graphLinks = visibleLinks;
  
  console.log('Initial data setup:', {
    allNodesCount: allNodes.length,
    allLinksCount: allLinks.length,
    visibleNodesCount: visibleNodes.length,
    visibleLinksCount: visibleLinks.length,
    currentViewMode: currentViewMode,
    allNodesSample: allNodes.slice(0, 3),
    visibleNodesSample: visibleNodes.slice(0, 3)
  });

  const color = d3.scaleOrdinal()
    .domain([1, 2, 3, 4])
    .range(['#6366F1', '#5B21B6', '#F59E0B', '#10B981']);
  const radius = d3.scaleSqrt().domain([10, 90]).range([16, 90]);

  function computeFontSizeForRadius(r){
    return Math.max(10, Math.min(18, Math.round(r * 0.28)));
  }

  function wrapText(textSel, label, maxWidth){
    textSel.text(null);
    const words = String(label||'').split(/\s+/).filter(Boolean);
    let line = [];
    let lineNumber = 0;
    const lineHeight = 1.1;
    let tspan = textSel.append('tspan').attr('x',0).attr('y',0).attr('dy','0em');
    for(const word of words){
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > maxWidth){
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = textSel.append('tspan').attr('x',0).attr('y',0).attr('dy', `${++lineNumber * lineHeight}em`).text(word);
      }
    }
    textSel.attr('dy', `${-(lineNumber * lineHeight)/2}em`);
  }

  // Function to determine which nodes to show based on current mode
  function getVisibleNodes() {
    if (currentViewMode === 'default') {
      // Show all nodes but mark non-top-level/non-isolated as disabled
      return allNodes;
    } else if (currentViewMode === 'expanded' && selectedNode) {
      // Show selected node and all connected nodes
      const connectedNodeIds = new Set();
      connectedNodeIds.add(selectedNode.id);
      
      allLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === selectedNode.id) {
          connectedNodeIds.add(targetId);
        }
        if (targetId === selectedNode.id) {
          connectedNodeIds.add(sourceId);
        }
      });
      
      return allNodes.filter(node => connectedNodeIds.has(node.id));
    } else if (currentViewMode === 'filtered') {
      // Show nodes based on filter state
      return allNodes.filter(node => {
        switch (node.group) {
          case 1: return filterState.topLevel;
          case 2: return filterState.connected;
          case 3: return filterState.secondary;
          case 4: return filterState.isolated;
          default: return true;
        }
      });
    } else {
      // Show all nodes
      return allNodes;
    }
  }

  // Function to get visible links based on visible nodes
  function getVisibleLinks(visibleNodes) {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return allLinks.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
  }

  // Function to determine if a node should be disabled
  function isNodeDisabled(node) {
    if (currentViewMode === 'default') {
      // In default mode, disable nodes that are not top-level (group 1) or isolated (group 4)
      return node.group !== 1 && node.group !== 4;
    } else if (currentViewMode === 'expanded' && selectedNode) {
      // In expanded mode, disable nodes that are not connected to the selected node
      const connectedNodeIds = new Set();
      connectedNodeIds.add(selectedNode.id);
      
      allLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === selectedNode.id) {
          connectedNodeIds.add(targetId);
        }
        if (targetId === selectedNode.id) {
          connectedNodeIds.add(sourceId);
        }
      });
      
      return !connectedNodeIds.has(node.id);
    }
    return false;
  }

  // Function to update mode indicator
  function updateModeIndicator() {
    const modeIndicator = document.getElementById('modeIndicator');
    if (modeIndicator) {
      let modeText = 'Mode: Default View';
      if (currentViewMode === 'expanded' && selectedNode) {
        modeText = `Mode: Expanded from "${selectedNode.id}"`;
      } else if (currentViewMode === 'filtered') {
        modeText = 'Mode: Filtered View';
      } else if (currentViewMode === 'all') {
        modeText = 'Mode: Show All';
      }
      modeIndicator.querySelector('span').textContent = modeText;
    }
  }

  const gLinks = svg.append('g').attr('stroke', '#d9d9ef').attr('stroke-width', 2.5);
  const gNodes = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.5, 2]).on('zoom', (ev)=>{
    gNodes.attr('transform', ev.transform);
    gLinks.attr('transform', ev.transform);
  });
  svg.call(zoom);

  const centerForce = d3.forceCenter(0, 0);
  const sim = d3.forceSimulation(graphNodes)
    .force('link', d3.forceLink(graphLinks).id(d => d.id).distance(80).strength(0.15))
    .force('charge', d3.forceManyBody().strength(-150))
    .force('center', centerForce)
    .force('collision', d3.forceCollide().radius(d => radius(d.value)+6))
    .force('bounds', () => {
      // Keep nodes clustered toward center with gentle bounds
      const w = width();
      const h = height();
      const centerX = w / 2;
      const centerY = h / 2;
      const maxDistance = Math.min(w, h) * 0.4; // Allow spreading but keep clustered
      
      graphNodes.forEach(node => {
        const dx = node.x - centerX;
        const dy = node.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > maxDistance) {
          const scale = maxDistance / distance;
          node.x = centerX + dx * scale;
          node.y = centerY + dy * scale;
        }
      });
    });

  function rescaleForDrawer(){
    const openDetails = detailsDrawer.getAttribute('aria-hidden') === 'false';
    const openNeo = neo4jDrawer.getAttribute('aria-hidden') === 'false';
    const scale = (openDetails || openNeo) ? 0.88 : 1;
    const tx = 0;
    gNodes.attr('transform', `translate(${tx},0) scale(${scale})`);
    gLinks.attr('transform', `translate(${tx},0) scale(${scale})`);
    sim.alpha(0.3).restart();
  }

  function ticked(){
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  // Initialize empty selections - these will be populated by setGraphData
  let link = gLinks.selectAll('line');
  let node = gNodes.selectAll('g.node');

  sim.on('tick', ticked);

  function setGraphData(newNodes, newLinks){
    console.log('setGraphData called with:', {
      newNodesCount: (newNodes || []).length,
      newLinksCount: (newLinks || []).length,
      currentMode: currentViewMode
    });
    
    // Store all data
    allNodes = newNodes || [];
    allLinks = (newLinks || []).filter(l => l.source && l.target && l.source !== l.target);
    
    // Get visible nodes and links based on current mode
    visibleNodes = getVisibleNodes();
    visibleLinks = getVisibleLinks(visibleNodes);
    
    console.log('After filtering:', {
      allNodesCount: allNodes.length,
      visibleNodesCount: visibleNodes.length,
      visibleNodes: visibleNodes.map(n => n.id)
    });
    
    // Update the graph with visible data
    graphNodes = visibleNodes;
    graphLinks = visibleLinks;

    link = gLinks.selectAll('line').data(graphLinks);
    link.exit().remove();
    link = link.join('line');
    
    // Apply disabled state styling to links
    link.each(function(l) {
      const linkElement = d3.select(this);
      const sourceNode = graphNodes.find(n => n.id === (typeof l.source === 'object' ? l.source.id : l.source));
      const targetNode = graphNodes.find(n => n.id === (typeof l.target === 'object' ? l.target.id : l.target));
      
      const isLinkDisabled = (sourceNode && isNodeDisabled(sourceNode)) || (targetNode && isNodeDisabled(targetNode));
      
      linkElement
        .attr('opacity', isLinkDisabled ? 0.05 : 0.7)
        .attr('stroke-width', isLinkDisabled ? 1.5 : 2.5);
    });

    node = gNodes.selectAll('g.node').data(graphNodes, d => d.id);
    node.exit().remove();
    node = node.join(enter => {
      console.log('Creating node:', enter.data());
      const g = enter.append('g').attr('class','node').style('cursor','pointer');
      const circle = g.append('circle')
        .attr('r', d => radius(d.value))
        .attr('fill', d => {
          console.log(`Node ${d.id} has group ${d.group}, color: ${color(d.group)}`);
          return color(d.group);
        });
      
      const text = g.append('text')
        .attr('text-anchor','middle')
        .attr('fill','#fff')
        .style('font-weight','700');
      text.each(function(d){
        const r = radius(d.value);
        d3.select(this).style('font-size', `${computeFontSizeForRadius(r)}px`);
        wrapText(d3.select(this), d.id, r * 1.6);
      });
      return g;
    });
    
    // Apply disabled state styling
    node.each(function(d) {
      const nodeElement = d3.select(this);
      const isDisabled = isNodeDisabled(d);
      
      nodeElement.select('circle')
        .attr('opacity', isDisabled ? 0.15 : 0.9)
        .style('filter', isDisabled ? 'grayscale(1) brightness(1.5)' : 'none');
      
      nodeElement.select('text')
        .attr('opacity', isDisabled ? 0.8 : 1)
        .attr('fill', isDisabled ? '#ffffff' : '#ffffff');
        
      nodeElement.style('cursor', isDisabled ? 'default' : 'pointer');
    });
    
    node.on('click', (_, d) => handleNodeClick(d));
    
    console.log('Nodes created in DOM:', node.size());
    console.log('SVG container has nodes:', gNodes.selectAll('g.node').size());

    sim.nodes(graphNodes);
    sim.force('link').links(graphLinks);
    
    // Ensure nodes start in reasonable positions - clustered in center
    const w = width();
    const h = height();
    graphNodes.forEach((node, i) => {
      if (!node.x || !node.y || isNaN(node.x) || isNaN(node.y)) {
        // Arrange in a tight cluster in the center
        const angle = (i / graphNodes.length) * 2 * Math.PI;
        const radius = Math.min(40, graphNodes.length * 3); // Much smaller radius for tight clustering
        node.x = w/2 + Math.cos(angle) * radius;
        node.y = h/2 + Math.sin(angle) * radius;
      }
    });
    
    sim.alpha(0.9).restart();
    
    updateModeIndicator();
  }

  // Updated node click handler
  function handleNodeClick(d) {
    // Don't handle clicks on disabled nodes
    if (isNodeDisabled(d)) {
      return;
    }
    
    if (currentViewMode === 'default' && d.group === 1) {
      // If clicking on a top-level node in default mode, expand to show connected nodes AND open side panel
      selectedNode = d;
      currentViewMode = 'expanded';
      setGraphData(allNodes, allLinks);
      openDrawer(d); // Also open the side panel
    } else if (currentViewMode === 'expanded' && selectedNode && selectedNode.id === d.id) {
      // If clicking on the same expanded node, reset to default view and close drawer
      selectedNode = null;
      currentViewMode = 'default';
      setGraphData(allNodes, allLinks);
      closeDrawer();
    } else if (currentViewMode === 'expanded' && d.group === 1) {
      // If clicking on a different top-level node while expanded, switch to that node and update drawer
      selectedNode = d;
      setGraphData(allNodes, allLinks);
      openDrawer(d); // Update the side panel to show the new node
    } else {
      // Otherwise just open the drawer
      openDrawer(d);
    }
  }

  function resize(){
    const canvasEl = container.querySelector('.keywords__canvas');
    const w = canvasEl?.clientWidth || 800; // Fallback width
    const h = Math.max(window.innerHeight * 0.7, 400); // Minimum height
    console.log('Resize called with dimensions:', { w, h });
    svg.attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h);
    centerForce.x(w/2).y(h/2);
    
    // Center nodes initially if they don't have positions
    if (graphNodes.some(node => !node.x || !node.y)) {
      graphNodes.forEach((node, i) => {
        if (!node.x || !node.y) {
          // Arrange in a tight cluster in the center
          const angle = (i / graphNodes.length) * 2 * Math.PI;
          const radius = Math.min(40, graphNodes.length * 3); // Much smaller radius for tight clustering
          node.x = w/2 + Math.cos(angle) * radius;
          node.y = h/2 + Math.sin(angle) * radius;
        }
      });
    }
    
    sim.alpha(0.7).restart();
    rescaleForDrawer();
  }
  
  // Ensure resize is called after DOM is ready and elements have dimensions
  function initializeGraph() {
    console.log('initializeGraph called');
    console.log('SVG element exists:', !!svg.node());
    console.log('Container element exists:', !!container);
    console.log('D3 version:', d3.version);
    
    setTimeout(() => {
      console.log('Delayed initialization starting...');
      const canvasEl = container.querySelector('.keywords__canvas');
      console.log('Canvas element dimensions:', {
        width: canvasEl?.clientWidth,
        height: canvasEl?.clientHeight,
        exists: !!canvasEl
      });
      
      console.log('About to initialize with data:', {
        allNodes: allNodes.length,
        allLinks: allLinks.length,
        sampleNodes: allNodes.slice(0, 2)
      });
      
      // Initialize the graph data properly
      setGraphData(allNodes, allLinks);
      resize();
      
      console.log('After initialization:');
      console.log('Graph nodes in simulation:', sim.nodes().length);
      console.log('Graph links in simulation:', sim.force('link').links().length);
      console.log('DOM nodes count:', gNodes.selectAll('g.node').size());
    }, 100);
  }
  
  window.addEventListener('resize', resize);
  
  // Call initialization after a short delay to ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGraph);
  } else {
    initializeGraph();
  }

  function openDrawer(d){
    drawerTitle.textContent = d.id;
    drawerBody.innerHTML = ''+
      `<div><strong>Volume:</strong> ${d.value}</div>`+
      `<div><strong>Connections:</strong> ${graphLinks.filter(l=> (l.source.id?l.source.id:l.source)===d.id || (l.target.id?l.target.id:l.target)===d.id).length}</div>`+
      `<div><strong>Description:</strong> Placeholder description about ${d.id} with sample insights.</div>`+
      `<hr /><div><strong>Related Keywords</strong></div>`+
      `${graphLinks.filter(l=> (l.source.id?l.source.id:l.source)===d.id || (l.target.id?l.target.id:l.target)===d.id).map(l=>`<span class="chip" style="margin:4px 6px 0 0">${(l.source.id?l.source.id:l.source)===d.id ? (l.target.id?l.target.id:l.target) : (l.source.id?l.source.id:l.source)}</span>`).join('')}`;
    detailsDrawer.setAttribute('aria-hidden','false');
    container.classList.add('drawer-open');
    rescaleForDrawer();
  }
  function closeDrawer(){
    detailsDrawer.setAttribute('aria-hidden','true');
    container.classList.remove('drawer-open');
    rescaleForDrawer();
  }
  detailsClose && detailsClose.addEventListener('click', closeDrawer);
  neo4jClose && neo4jClose.addEventListener('click', ()=>{ neo4jDrawer.setAttribute('aria-hidden','true'); container.classList.remove('drawer-open'); rescaleForDrawer(); });
  openNeo4jBtn && openNeo4jBtn.addEventListener('click', ()=>{ neo4jDrawer.setAttribute('aria-hidden','false'); container.classList.add('drawer-open'); rescaleForDrawer(); });

  // Filtering
  function applyFilter(term){
    const t = String(term||'').toLowerCase();
    node.style('opacity', d => d.id.toLowerCase().includes(t) ? 1 : 0.3);
    link.style('opacity', l => {
      const s = (l.source.id?l.source.id:l.source).toLowerCase();
      const tg = (l.target.id?l.target.id:l.target).toLowerCase();
      return (s.includes(t) || tg.includes(t)) ? 1 : 0.15;
    });
  }
  filterInput && filterInput.addEventListener('input', (e)=> applyFilter(e.target.value));
  resetBtn && resetBtn.addEventListener('click', ()=>{ 
    filterInput && (filterInput.value=''); 
    applyFilter(''); 
    closeDrawer(); 
    // Reset to default view
    currentViewMode = 'default';
    selectedNode = null;
    
    // Reset node positions to center cluster
    const w = width();
    const h = height();
    graphNodes.forEach((node, i) => {
      const angle = (i / graphNodes.length) * 2 * Math.PI;
      const radius = Math.min(40, graphNodes.length * 3);
      node.x = w/2 + Math.cos(angle) * radius;
      node.y = h/2 + Math.sin(angle) * radius;
      // Clear velocity
      node.vx = 0;
      node.vy = 0;
    });
    
    setGraphData(allNodes, allLinks);
    svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity); 
  });
  
  // Show All button functionality
  const showAllBtn = document.getElementById('showAll');
  showAllBtn && showAllBtn.addEventListener('click', () => {
    currentViewMode = 'all';
    selectedNode = null;
    setGraphData(allNodes, allLinks);
  });

  // Filter by Level button functionality
  const filterByLevelBtn = document.getElementById('filterByLevel');
  const filterModal = document.getElementById('filterModal');
  const filterModalClose = document.getElementById('filterModalClose');
  const applyFilterBtn = document.getElementById('applyFilter');
  const filterSelectAll = document.getElementById('filterSelectAll');
  const filterSelectNone = document.getElementById('filterSelectNone');
  
  filterByLevelBtn && filterByLevelBtn.addEventListener('click', () => {
    filterModal.style.display = 'flex';
  });
  
  filterModalClose && filterModalClose.addEventListener('click', () => {
    filterModal.style.display = 'none';
  });
  
  filterModal && filterModal.addEventListener('click', (e) => {
    if (e.target === filterModal) {
      filterModal.style.display = 'none';
    }
  });
  
  filterSelectAll && filterSelectAll.addEventListener('click', () => {
    document.getElementById('filterTopLevel').checked = true;
    document.getElementById('filterConnected').checked = true;
    document.getElementById('filterSecondary').checked = true;
    document.getElementById('filterIsolated').checked = true;
  });
  
  filterSelectNone && filterSelectNone.addEventListener('click', () => {
    document.getElementById('filterTopLevel').checked = false;
    document.getElementById('filterConnected').checked = false;
    document.getElementById('filterSecondary').checked = false;
    document.getElementById('filterIsolated').checked = false;
  });
  
  applyFilterBtn && applyFilterBtn.addEventListener('click', () => {
    filterState.topLevel = document.getElementById('filterTopLevel').checked;
    filterState.connected = document.getElementById('filterConnected').checked;
    filterState.secondary = document.getElementById('filterSecondary').checked;
    filterState.isolated = document.getElementById('filterIsolated').checked;
    
    currentViewMode = 'filtered';
    selectedNode = null;
    setGraphData(allNodes, allLinks);
    filterModal.style.display = 'none';
  });

  // Zoom controls
  zoomIn && zoomIn.addEventListener('click', ()=> svg.transition().duration(200).call(zoom.scaleBy, 1.2));
  zoomOut && zoomOut.addEventListener('click', ()=> svg.transition().duration(200).call(zoom.scaleBy, 0.8));
  fitBtn && fitBtn.addEventListener('click', ()=> svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity));

  // Neo4j integration
  const neo4jUriEl = document.getElementById('neo4jUri');
  const neo4jUserEl = document.getElementById('neo4jUser');
  const neo4jPassEl = document.getElementById('neo4jPass');
  const neo4jConnectBtn = document.getElementById('neo4jConnect');
  const neo4jLoadBtn = document.getElementById('neo4jLoad');
  const neo4jSeedBtn = document.getElementById('neo4jSeed');
  const neo4jStatusEl = document.getElementById('neo4jStatus');

  let driver = null;
  function setStatus(msg, ok){
    if(neo4jStatusEl){ neo4jStatusEl.textContent = msg; neo4jStatusEl.style.color = ok ? '#065f46' : '#6b7280'; }
  }
  async function ensureDriver(){
    if(driver){ return driver; }
    const uri = (neo4jUriEl && neo4jUriEl.value) || 'bolt://localhost:7687';
    const user = (neo4jUserEl && neo4jUserEl.value) || 'neo4j';
    const pass = (neo4jPassEl && neo4jPassEl.value) || 'neo4j';
    driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
    await driver.verifyConnectivity();
    return driver;
  }

  neo4jConnectBtn && neo4jConnectBtn.addEventListener('click', async () => {
    try {
      if(driver){ await driver.close(); driver = null; }
      await ensureDriver();
      setStatus('Connected', true);
      neo4jLoadBtn && (neo4jLoadBtn.disabled = false);
    } catch(err){
      console.error(err);
      setStatus('Connection failed');
    }
  });

  neo4jSeedBtn && neo4jSeedBtn.addEventListener('click', async () => {
    try {
      const drv = await ensureDriver();
      const session = drv.session({ defaultAccessMode: neo4j.session.WRITE });
      try {
        await session.executeWrite(async tx => {
          await tx.run('CREATE CONSTRAINT keyword_name IF NOT EXISTS FOR (k:Keyword) REQUIRE k.name IS UNIQUE');
          await tx.run('UNWIND $data AS row MERGE (k:Keyword {name: row.name}) SET k.volume = row.value, k.group = row.group', { data: graphNodes });
          await tx.run('UNWIND $rels AS r MATCH (a:Keyword {name:r.source}),(b:Keyword {name:r.target}) MERGE (a)-[:RELATED_TO]->(b)', { rels: graphLinks.length?graphLinks:defaultLinks });
        });
        setStatus('Seeded sample graph', true);
        neo4jLoadBtn && (neo4jLoadBtn.disabled = false);
      } finally { await session.close(); }
    } catch(err){ console.error(err); setStatus('Seed failed'); }
  });

  neo4jLoadBtn && neo4jLoadBtn.addEventListener('click', async () => {
    try {
      const drv = await ensureDriver();
      const session = drv.session({ defaultAccessMode: neo4j.session.READ });
      try {
        const resNodes = await session.run('MATCH (k:Keyword) RETURN k.name AS id, coalesce(k.volume, 20) AS value, coalesce(k.group, 1) AS group');
        const resLinks = await session.run('MATCH (a:Keyword)-[:RELATED_TO]->(b:Keyword) RETURN a.name AS source, b.name AS target');
        const n = resNodes.records.map(r => ({ id: r.get('id'), value: r.get('value'), group: r.get('group') }));
        const l = resLinks.records.map(r => ({ source: r.get('source'), target: r.get('target') }));
        if(n.length === 0){ setStatus('No data found. Try Seed.', false); return; }
        setGraphData(n, l);
        setStatus(`Loaded ${n.length} nodes / ${l.length} links`, true);
      } finally { await session.close(); }
    } catch(err){ console.error(err); setStatus('Load failed'); }
  });

  // Real-time synchronization with shared data system
  if (window.ShopThatData) {
    // Listen for keyword changes from other pages
    window.ShopThatData.on('keywords', (keywords) => {
      graphNodes = keywords.map(node => ({
        id: node.id || node.name,
        group: node.group || 1,
        value: node.value || 50
      }));
      setGraphData(graphNodes, graphLinks);
    });
    
    // Listen for connection changes from other pages
    window.ShopThatData.on('connections', (connections) => {
      graphLinks = connections.slice();
      setGraphData(graphNodes, graphLinks);
    });
  }

  // Function to refresh data from shared storage
  function refreshFromSharedData() {
    if (window.ShopThatData) {
      const keywords = window.ShopThatData.getKeywords();
      const connections = window.ShopThatData.getConnections();
      
      // Convert keywords to D3 format
      graphNodes = keywords.map(node => ({
        id: node.id || node.name,
        group: node.group || 1,
        value: node.value || 50
      }));
      
      graphLinks = connections.slice();
      setGraphData(graphNodes, graphLinks);
    }
  }

  // Refresh data when page becomes visible (handles tab switching)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshFromSharedData();
    }
  });

  // Initial refresh in case data was updated while page was loading
  setTimeout(refreshFromSharedData, 100);

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

  // Initialize dark mode
  initDarkMode();
})();


