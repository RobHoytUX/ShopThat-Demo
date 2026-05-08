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

  // Graph layout must use viewBox width/height — SVG `clientHeight` includes CSS
  // padding (e.g. legend offset), which skews the center downward/right in user space.
  function graphInnerSize() {
    const vb = svg.attr('viewBox');
    if (!vb) return null;
    const parts = vb.trim().split(/[\s,]+/);
    if (parts.length < 4) return null;
    const vw = parseFloat(parts[2]);
    const vh = parseFloat(parts[3]);
    if (vw > 0 && vh > 0) return { w: vw, h: vh };
    return null;
  }
  const width = () => {
    const g = graphInnerSize();
    if (g) return g.w;
    const w = svg.node().clientWidth;
    if (w > 0) return w;
    return 800;
  };
  const height = () => {
    const g = graphInnerSize();
    if (g) return g.h;
    const h = svg.node().clientHeight;
    if (h > 0) return h;
    return 600;
  };

  /** Canvas that has real layout width/height (bubbles tab may be `display:none` on load). */
  function getBubbleSizingCanvas() {
    const bubble = document.querySelector('#kw-bubbles-tab .keywords__canvas');
    if (bubble && bubble.clientWidth > 0 && bubble.clientHeight > 0) return bubble;
    const tree = document.querySelector('#kw-tree-tab .keywords__canvas');
    if (tree && tree.clientWidth > 0 && tree.clientHeight > 0) return tree;
    const list = document.querySelector('#kw-list-tab .keywords__canvas');
    if (list && list.clientWidth > 0 && list.clientHeight > 0) return list;
    return bubble || tree || container.querySelector('.keywords__canvas');
  }

  // State management for hierarchical display
  let currentViewMode = 'default'; // 'default' / 'tree' (bubbles drill-down) / 'expanded' / 'filtered' / 'all' / 'linear'
  let selectedNode = null;
  let allNodes = [];
  let allLinks = [];
  let visibleNodes = [];
  let visibleLinks = [];

  // Tree-style bubble navigation: which node IDs currently have their direct
  // children expanded into the visible bubble set. The Bubbles tab starts
  // empty (only LVMH visible) and grows as the user clicks nodes.
  // Declared with `var` to avoid TDZ when getVisibleNodes runs early.
  var bubblesExpandedIds = new Set();

  function collapseBubbleSubtree(id) {
    if (bubbleState.collapseSubtree) {
      bubbleState.collapseSubtree(allNodes, bubblesExpandedIds, id);
    }
  }

  function getBubbleVisibleNodeIds() {
    return bubbleState.visibleNodeIds
      ? bubbleState.visibleNodeIds(allNodes, bubblesExpandedIds)
      : new Set();
  }
  
  // State history for back navigation
  const stateHistory = [];
  const MAX_HISTORY = 50;
  
  function pushState() {
    const state = {
      viewMode: currentViewMode,
      selectedNodeId: selectedNode ? selectedNode.id : null,
      hiddenGroups: new Set(hiddenGroups),
      timestamp: Date.now()
    };
    stateHistory.push(state);
    if (stateHistory.length > MAX_HISTORY) {
      stateHistory.shift();
    }
    console.log('State pushed:', state.viewMode, state.selectedNodeId, 'History length:', stateHistory.length);
  }
  
  function popState() {
    if (stateHistory.length === 0) {
      return null;
    }
    return stateHistory.pop();
  }
  
  // Flag to prevent clearing hiddenGroups during state restoration
  let isRestoringState = false;
  
  function restoreState(state) {
    if (!state) return false;
    
    isRestoringState = true;
    
    currentViewMode = state.viewMode;
    selectedNode = state.selectedNodeId ? allNodes.find(n => n.id === state.selectedNodeId) : null;
    hiddenGroups.clear();
    if (state.hiddenGroups) {
      state.hiddenGroups.forEach(g => hiddenGroups.add(g));
    }
    
    clickedNode = null;
    hoveredNode = null;
    isHoverClustering = false;
    
    // Call setGraphData - the wrapper will check isRestoringState flag
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => {
      updateFilterCheckboxes();
      isRestoringState = false;
    }, 250);
    
    if (selectedNode) {
      openDrawer(selectedNode);
    } else {
      closeDrawer();
    }
    
    console.log('State restored:', currentViewMode, selectedNode?.id);
    return true;
  }
  
  // Track hidden groups (will be defined later but declared here for state management)
  let hiddenGroups = new Set();
  let disabledNodes = new Set(); // Track individually disabled nodes
  let filterState = {
    topLevel: true,
    connected: true,
    secondary: true,
    isolated: true
  };
  
  const keywordsData = window.ShopThatKeywordsData || {};
  const defaultNodes = keywordsData.defaultNodes || [];
  const defaultLinks = keywordsData.defaultLinks || [];
  const groupColors = keywordsData.groupColors || {};
  const keywordCategories = keywordsData.keywordCategories || {};
  const categoryOrder = keywordsData.categoryOrder || ['Other'];
  const generateArticlesHTML = keywordsData.generateArticlesHTML || function () { return ''; };
  const graphUtils = window.ShopThatKeywordGraphUtils || {};
  const bubbleState = window.ShopThatKeywordsBubbleState || {};

  function linearViewOptions() {
    return {
      categoryOrder,
      getConnectedNodeIds,
      groupColors,
      keywordCategories,
      nodeLabel: bubbleNodeLabel
    };
  }

  const STORAGE_KEY = 'st_keywords_v1';

  // The keywords page is the source of truth for the demo keyword graph, so
  // every load re-seeds localStorage with the curated `defaultNodes` /
  // `defaultLinks` above. This prevents stale AI-cached data (e.g. the old
  // “Le Bernardin / MoMA / Three Michelin Stars” cluster) from surviving
  // across sessions and collapsing the tree back to a flat structure.
  try {
    localStorage.removeItem('st_ai_keywords_graph_v2');
  } catch (e) { /* ignore quota / privacy errors */ }

  function loadStored(){
    if (window.ShopThatData) return window.ShopThatData.getKeywords();
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; }
  }
  function loadStoredConnections(){
    if (window.ShopThatData) return window.ShopThatData.getConnections();
    try { return JSON.parse(localStorage.getItem('st_connections_v1')||'[]'); } catch { return []; }
  }

  const AI_GRAPH_CACHE_KEY = 'st_ai_keywords_graph_v2';
  const AI_GRAPH_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 6;
  const AI_GRAPH_QUERY =
    'You are a luxury intelligence analyst. Using available backend article context and ecommerce product catalogs, generate keywords for a knowledge graph. Respond ONLY in markdown with these exact headings: "### LVMH", "### Soho", "### 57th St." Under each heading provide exactly 8 short keyword phrases (2-5 words), one per bullet, with no explanations.';

  function normalizeKeywordLabel(label) {
    return String(label || '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseAiKeywordSections(answer) {
    const sections = { LVMH: [], Soho: [], '57th St.': [] };
    const seen = { LVMH: new Set(), Soho: new Set(), '57th St.': new Set() };
    let current = 'LVMH';
    const lines = String(answer || '').split(/\r?\n/);

    lines.forEach((line) => {
      const raw = line.trim();
      if (!raw) return;

      if (/^#{1,6}\s*lvmh\b/i.test(raw) || /^lvmh\b[:\-]/i.test(raw)) {
        current = 'LVMH';
        return;
      }
      if (/^#{1,6}\s*soho\b/i.test(raw) || /^soho\b[:\-]/i.test(raw)) {
        current = 'Soho';
        return;
      }
      if (/^#{1,6}\s*57(th)?\s*(st|street)\b/i.test(raw) || /^57(th)?\s*(st|street)\b[:\-]/i.test(raw)) {
        current = '57th St.';
        return;
      }

      const bullet = normalizeKeywordLabel(raw.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, ''));
      if (!bullet || /^#{1,6}\s/.test(bullet)) return;

      const key = bullet.toLowerCase();
      if (!seen[current].has(key)) {
        seen[current].add(key);
        sections[current].push(bullet);
      }
    });

    if (sections.LVMH.length === 0 && window.LuxuryIntelligence && window.LuxuryIntelligence.extractKeywordPhrases) {
      const fallback = window.LuxuryIntelligence.extractKeywordPhrases(answer, 12);
      fallback.forEach((k, idx) => {
        if (idx < 4) sections.LVMH.push(k);
        else if (idx < 8) sections.Soho.push(k);
        else sections['57th St.'].push(k);
      });
    }

    sections.LVMH = sections.LVMH.slice(0, 8);
    sections.Soho = sections.Soho.slice(0, 8);
    sections['57th St.'] = sections['57th St.'].slice(0, 8);
    return sections;
  }

  function groupForIndex(idx) {
    if (idx < 3) return 1;
    if (idx < 5) return 2;
    if (idx < 7) return 3;
    return 4;
  }

  function valueForIndex(idx) {
    return Math.max(42, 88 - (idx * 6));
  }

  function buildAiGraphFromSections(sections) {
    const nodeMap = new Map();
    const linkMap = new Set();

    function addNode(node) {
      if (!node || !node.id) return;
      const existing = nodeMap.get(node.id);
      if (!existing) {
        nodeMap.set(node.id, { ...node });
        return;
      }
      existing.value = Math.max(existing.value || 0, node.value || 0);
      existing.group = Math.min(existing.group || 4, node.group || 4);
      existing.isArea = existing.isArea || !!node.isArea;
      existing.isRoot = existing.isRoot || !!node.isRoot;
    }

    function addLink(source, target) {
      if (!source || !target || source === target) return;
      const a = String(source);
      const b = String(target);
      const key = a < b ? a + '|' + b : b + '|' + a;
      if (linkMap.has(key)) return;
      linkMap.add(key);
    }

    addNode({ id: 'LVMH', group: 0, value: 100, isRoot: true });
    addNode({ id: 'Soho', group: 1, value: 90, isArea: true });
    addNode({ id: '57th St.', group: 1, value: 90, isArea: true });
    addLink('LVMH', 'Soho');
    addLink('LVMH', '57th St.');

    const lvmhKeywords = sections.LVMH || [];
    const lvmhSoho = [];
    const lvmh57 = [];
    lvmhKeywords.forEach((label, idx) => {
      if (idx % 2 === 0) lvmhSoho.push(label);
      else lvmh57.push(label);
    });

    const areaDefs = [
      { area: 'Soho', keywords: lvmhSoho.concat(sections.Soho || []) },
      { area: '57th St.', keywords: lvmh57.concat(sections['57th St.'] || []) }
    ];

    areaDefs.forEach((entry) => {
      entry.keywords.forEach((label, idx) => {
        addNode({ id: label, group: groupForIndex(idx), value: valueForIndex(idx) });
        addLink(entry.area, label);
        if (idx > 0) addLink(entry.keywords[idx - 1], label);
      });
    });

    const nodes = Array.from(nodeMap.values());
    const links = Array.from(linkMap).map((key) => {
      const parts = key.split('|');
      return { source: parts[0], target: parts[1] };
    });
    return { nodes, links };
  }

  function cacheAiGraph(graph) {
    try {
      localStorage.setItem(AI_GRAPH_CACHE_KEY, JSON.stringify({
        at: Date.now(),
        nodes: graph.nodes,
        links: graph.links
      }));
    } catch (e) {
      console.warn('Failed to cache AI keyword graph', e);
    }
  }

  function loadCachedAiGraph() {
    try {
      const raw = localStorage.getItem(AI_GRAPH_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.at || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.links)) return null;
      if ((Date.now() - parsed.at) > AI_GRAPH_CACHE_MAX_AGE_MS) return null;
      return { nodes: parsed.nodes, links: parsed.links };
    } catch {
      return null;
    }
  }

  function applyAiGraphToSharedData(graph) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links) || graph.nodes.length === 0) return false;
    if (!window.ShopThatData) return false;

    const now = new Date().toISOString();
    const keywords = graph.nodes.map((node) => ({
      id: node.id,
      name: node.id,
      value: node.value || 50,
      group: node.group || 1,
      isArea: !!node.isArea,
      isRoot: !!node.isRoot,
      uses: 0,
      cost: 0,
      totalCost: 0,
      lastUsed: null,
      created: now
    }));

    window.ShopThatData.saveKeywords(keywords);
    window.ShopThatData.saveConnections(graph.links.slice());
    return true;
  }

  async function bootstrapAiKeywordGraph() {
    if (!window.ShopThatData || !window.LuxuryIntelligence || typeof window.LuxuryIntelligence.ask !== 'function') return;
    if (window.__kwAiGraphLoading) return;
    window.__kwAiGraphLoading = true;

    try {
      const cachedGraph = loadCachedAiGraph();
      if (cachedGraph) {
        applyAiGraphToSharedData(cachedGraph);
        window.dispatchEvent(new CustomEvent('kw-data-updated'));
        return;
      }

      const intel = await window.LuxuryIntelligence.ask(AI_GRAPH_QUERY);
      const sections = parseAiKeywordSections(intel && intel.answer);
      const totalKeywords = sections.LVMH.length + sections.Soho.length + sections['57th St.'].length;
      if (totalKeywords < 9) {
        console.warn('AI keyword response too small; using existing keyword graph');
        return;
      }

      const graph = buildAiGraphFromSections(sections);
      if (applyAiGraphToSharedData(graph)) {
        cacheAiGraph(graph);
        window.dispatchEvent(new CustomEvent('kw-data-updated'));
      }
    } catch (e) {
      console.warn('AI keyword graph bootstrap failed', e);
    } finally {
      window.__kwAiGraphLoading = false;
    }
  }
  
  // Always rebuild the keyword graph from the curated defaults above. Stored
  // data from previous sessions (localStorage / ShopThatData) is intentionally
  // ignored so the Louis Vuitton ▸ New York ▸ Stores ▸ 57th St./Soho hierarchy
  // cannot regress to legacy flat structures or AI-cached clusters.
  void loadStored;
  void loadStoredConnections;
  const initialNodes = defaultNodes.map(n => ({ ...n }));
  const initialLinks = defaultLinks.map(l => ({ ...l }));

  // Re-seed ShopThatData so other pages (keywords-manage, dashboard, etc.)
  // observe the same curated graph instead of stale cached nodes.
  try {
    if (window.ShopThatData) {
      const nowIso = new Date().toISOString();
      const seededKeywords = initialNodes.map(n => ({
        id: n.id,
        name: n.id,
        value: n.value || 50,
        group: n.group || 1,
        isArea: !!n.isArea,
        isRoot: !!n.isRoot,
        parent: n.parent || null,
        uses: 0,
        cost: 0,
        totalCost: 0,
        lastUsed: null,
        created: nowIso
      }));
      window.ShopThatData.saveKeywords(seededKeywords);
      window.ShopThatData.saveConnections(initialLinks.map(l => ({
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target
      })));
    }
  } catch (e) {
    console.warn('Keyword graph re-seed failed:', e);
  }

  console.log('Keyword graph seeded:', {
    nodes: initialNodes.length,
    links: initialLinks.length,
    areas: initialNodes.filter(n => n.isArea).map(n => n.id)
  });
  
  // Set up initial graph data using the new system
  allNodes = initialNodes;
  allLinks = initialLinks;
  
  // Initialize showing only primary nodes
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

  // Create gradient definitions for primary and secondary nodes
  const defs = svg.append('defs');
  
  // LVMH Root gradient (Group 0) - Dark blue gradient, stands out more
  const lvmhGradient = defs.append('linearGradient')
    .attr('id', 'lvmhGradient')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '100%').attr('y2', '100%');
  lvmhGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1e3a8a'); // dark blue
  lvmhGradient.append('stop').attr('offset', '50%').attr('stop-color', '#1e40af'); // blue-800
  lvmhGradient.append('stop').attr('offset', '100%').attr('stop-color', '#312e81'); // indigo-900
  
  // Primary gradient (Group 1) - Blue/Purple/Cyan like in screenshots
  const primaryGradient = defs.append('linearGradient')
    .attr('id', 'primaryGradient')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '100%').attr('y2', '100%');
  primaryGradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4'); // cyan
  primaryGradient.append('stop').attr('offset', '50%').attr('stop-color', '#8b5cf6'); // purple
  primaryGradient.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1'); // indigo
  
  // Secondary gradient (Group 2) - Green gradient
  const secondaryGradient = defs.append('linearGradient')
    .attr('id', 'secondaryGradient')
    .attr('x1', '0%').attr('y1', '100%')
    .attr('x2', '100%').attr('y2', '0%');
  secondaryGradient.append('stop').attr('offset', '0%').attr('stop-color', '#10b981'); // emerald
  secondaryGradient.append('stop').attr('offset', '50%').attr('stop-color', '#34d399'); // light emerald
  secondaryGradient.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4'); // cyan
  
  // Tertiary gradient (Group 3) - Pink/Orange/Coral for Talent-like nodes
  const tertiaryGradient = defs.append('linearGradient')
    .attr('id', 'tertiaryGradient')
    .attr('x1', '0%').attr('y1', '100%')
    .attr('x2', '100%').attr('y2', '0%');
  tertiaryGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f97316'); // orange
  tertiaryGradient.append('stop').attr('offset', '50%').attr('stop-color', '#ec4899'); // pink
  tertiaryGradient.append('stop').attr('offset', '100%').attr('stop-color', '#f472b6'); // light pink
  
  // Quaternary gradient (Group 4) - Green/Teal variant
  const quaternaryGradient = defs.append('linearGradient')
    .attr('id', 'quaternaryGradient')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '100%').attr('y2', '100%');
  quaternaryGradient.append('stop').attr('offset', '0%').attr('stop-color', '#10b981'); // emerald
  quaternaryGradient.append('stop').attr('offset', '50%').attr('stop-color', '#06b6d4'); // cyan
  quaternaryGradient.append('stop').attr('offset', '100%').attr('stop-color', '#8b5cf6'); // purple

  const color = d3.scaleOrdinal()
    .domain([0, 1, 2, 3, 4])
    .range(['url(#lvmhGradient)', 'url(#primaryGradient)', 'url(#secondaryGradient)', 'url(#tertiaryGradient)', 'url(#quaternaryGradient)']);
  const baseRadius = d3.scaleSqrt().domain([10, 100]).range([30, 70]);
  
  // LVMH root node (group 0) is 3x larger, primary nodes slightly larger than others
  function radius(value, group, isArea) {
    if (group === 0) return 140; // LVMH is fixed at 140px radius
    if (isArea) return 70; // Area nodes are half of LVMH
    const base = baseRadius(value);
    return group === 1 ? base * 1.1 : base;
  }

  // State for hover/click highlighting
  let hoveredNode = null;
  let clickedNode = null;

  function bubbleNodeLabel(d) {
    return bubbleState.nodeLabel ? bubbleState.nodeLabel(d) : (d ? d.id : '');
  }

  function computeFontSizeForRadius(r){
    // Scale font size based on radius, with larger max for LVMH node
    if (r >= 140) {
      // Large LVMH node - bigger font
      return 32;
    }
    // Base calculation - will be adjusted by wrapText if needed
    return Math.max(8, Math.min(16, Math.round(r * 0.32)));
  }

  function wrapText(textSel, label, nodeRadius){
    textSel.text(null);
    const words = String(label||'').split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    
    // Calculate available width (use ~80% of diameter for text)
    const maxWidth = nodeRadius * 1.6;
    const lineHeight = 1.15;
    
    // Get the current font size
    let fontSize = parseFloat(textSel.style('font-size')) || 12;
    const minFontSize = 7;
    
    // Try to fit text, reducing font size if necessary
    let lines = [];
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      lines = [];
      let currentLine = [];
      
      // Create a temporary tspan to measure
      const tempTspan = textSel.append('tspan').style('font-size', `${fontSize}px`);
      
      for (const word of words) {
        currentLine.push(word);
        tempTspan.text(currentLine.join(' '));
        
        if (tempTspan.node().getComputedTextLength() > maxWidth && currentLine.length > 1) {
          currentLine.pop();
          lines.push(currentLine.join(' '));
          currentLine = [word];
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }
      
      tempTspan.remove();
      
      // Check if text height fits in the circle (use ~70% of diameter for height)
      const maxHeight = nodeRadius * 1.4;
      const textHeight = lines.length * fontSize * lineHeight;
      
      // Also check if any single line is too wide
      let anyLineTooWide = false;
      const checkTspan = textSel.append('tspan').style('font-size', `${fontSize}px`);
      for (const line of lines) {
        checkTspan.text(line);
        if (checkTspan.node().getComputedTextLength() > maxWidth) {
          anyLineTooWide = true;
          break;
        }
      }
      checkTspan.remove();
      
      if (textHeight <= maxHeight && !anyLineTooWide) {
        break; // Text fits!
      }
      
      // Reduce font size and try again
      fontSize = Math.max(minFontSize, fontSize - 1);
      if (fontSize <= minFontSize) break;
      attempts++;
    }
    
    // Apply the final font size
    textSel.style('font-size', `${fontSize}px`);
    
    // Calculate vertical offset to center the text block
    const totalLines = lines.length;
    const startOffset = -((totalLines - 1) * lineHeight) / 2;
    
    // Create the actual tspans
    lines.forEach((lineText, i) => {
      textSel.append('tspan')
        .attr('x', 0)
        .attr('dy', i === 0 ? `${startOffset}em` : `${lineHeight}em`)
        .attr('dominant-baseline', 'middle')
        .text(lineText);
    });
  }

  // Function to determine which nodes to show based on current mode
  function getVisibleNodes() {
    // Tree-style bubble navigation: only LVMH is visible by default; clicking
    // a bubble adds its `parent` children to the visible set.
    if (currentViewMode === 'tree') {
      var visibleIds = getBubbleVisibleNodeIds();
      return allNodes.filter(function (node) { return visibleIds.has(node.id); });
    }
    if (currentViewMode === 'default') {
      // Show LVMH and its direct connections (area nodes) on page load
      const lvmhConnectedIds = new Set(['LVMH']);
      allLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sourceId === 'LVMH') lvmhConnectedIds.add(targetId);
        if (targetId === 'LVMH') lvmhConnectedIds.add(sourceId);
      });
      return allNodes.filter(node => lvmhConnectedIds.has(node.id));
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
      // 'all' mode - show all nodes
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

  // Function to determine if a node should be disabled (greyed out but visible)
  function isNodeDisabled(node) {
    // In default mode, all visible nodes (only Group 1) are enabled
    if (currentViewMode === 'default') {
      return false;
    }
    // In expanded mode, only the selected node is fully highlighted, connected nodes are enabled
    if (currentViewMode === 'expanded' && selectedNode) {
      return false; // All visible nodes in expanded mode are enabled
    }
    return false;
  }

  // Get connected node IDs for a given node
  function getConnectedNodeIds(nodeData) {
    return graphUtils.connectedNodeIds
      ? graphUtils.connectedNodeIds(allLinks, nodeData.id)
      : new Set([nodeData.id]);
  }

  /** Non-empty query: Set of keyword ids (matches + all graph neighbors). Empty query: null. No matches: empty Set. */
  function neighborhoodIdsForSearchQuery(raw) {
    return graphUtils.neighborhoodIdsForSearchQuery
      ? graphUtils.neighborhoodIdsForSearchQuery(allNodes, allLinks, raw)
      : null;
  }

  // Store original positions for hover clustering
  let originalPositions = {};
  let isHoverClustering = false;
  
  // Highlight connections on hover - show connecting lines
  function highlightConnections(nodeData) {
    if (isTransitioning) return;
    
    const connectedIds = getConnectedNodeIds(nodeData);
      isHoverClustering = true;
    
    // Highlight connected nodes and fade others
    node.each(function(d) {
      const nodeElement = d3.select(this);
      const isConnected = connectedIds.has(d.id);
      const isHovered = d.id === nodeData.id;
      
      nodeElement.interrupt('style');
      
      // Scale up hovered node slightly
      if (isHovered) {
        nodeElement
          .transition('style')
          .duration(200)
          .ease(d3.easeCubicOut)
          .attr('transform', `translate(${Math.round(d.x)},${Math.round(d.y)}) scale(1.1)`);
      }
      
      // Update styling - fade unconnected nodes
      nodeElement.select('circle')
        .transition('style')
        .duration(200)
        .attr('opacity', isConnected ? 1 : 0.2)
        .style('filter', isConnected ? 'none' : 'grayscale(0.7) brightness(1.2)');
      
      nodeElement.select('text')
        .transition('style')
        .duration(200)
        .attr('opacity', isConnected ? 1 : 0.2);
    });
    
    // Highlight connected links, fade others
    link.interrupt('links')
      .transition('links')
      .duration(200)
      .attr('opacity', 0)
      .attr('stroke-width', l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        const isConnectedLink = sourceId === nodeData.id || targetId === nodeData.id;
        return isConnectedLink ? 2.5 : 1;
      });
  }

  // Reset highlighting to default state
  function resetHighlighting() {
    if (isTransitioning) return;
      
      isHoverClustering = false;
    
    // Reset node styling and scale
    node.each(function(d) {
      const nodeElement = d3.select(this);
      const isDisabled = isNodeDisabled(d);
      
      nodeElement.interrupt('style');
      
      // Reset scale and position
      nodeElement
        .transition('style')
        .duration(200)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${Math.round(d.x)},${Math.round(d.y)}) scale(1)`);
      
      nodeElement.select('circle')
        .transition('style')
        .duration(200)
        .attr('opacity', isDisabled ? 0.15 : 0.9)
        .style('filter', isDisabled ? 'grayscale(1) brightness(1.5)' : 'none');
      
      nodeElement.select('text')
        .transition('style')
        .duration(200)
        .attr('opacity', isDisabled ? 0.8 : 1);
    });
    
    // Show all links at normal opacity
    link.interrupt('links')
      .transition('links')
      .duration(200)
      .attr('opacity', 0)
      .attr('stroke-width', 1.5);

    if (filterInput && String(filterInput.value || '').trim()) {
      queueMicrotask(() => applyFilter(filterInput.value));
    }
  }

  // Function to update mode indicator
  function updateModeIndicator() {
    const modeIndicator = document.getElementById('modeIndicator');
    if (modeIndicator) {
      let modeText = 'Mode: LVMH + Areas';
      if (currentViewMode === 'linear' && selectedNode) {
        modeText = `Mode: "${selectedNode.id}" + Connected`;
      } else if (currentViewMode === 'expanded' && selectedNode) {
        modeText = `Mode: "${selectedNode.id}" + Connected`;
      } else if (currentViewMode === 'filtered') {
        modeText = 'Mode: Filtered View';
      } else if (currentViewMode === 'all') {
        modeText = 'Mode: All Keywords';
      }
      modeIndicator.querySelector('span').textContent = modeText;
    }
  }

  // Show linear view when a keyword bubble is clicked
  function showLinearView(nodeData) {
    selectedNode = nodeData;
    currentViewMode = 'linear';

    // Hide SVG and legend filter
    svg.node().style.display = 'none';
    const legend = document.querySelector('.graph-legend-filter');
    if (legend) legend.style.display = 'none';

    // Get connected nodes (exclude root LVMH node)
    const connectedIds = getConnectedNodeIds(nodeData);
    const connectedNodes = allNodes.filter(n => connectedIds.has(n.id) && n.id !== nodeData.id && n.group !== 0);

    // Create or reuse container
    let linearView = document.getElementById('linearView');
    if (!linearView) {
      linearView = document.createElement('div');
      linearView.id = 'linearView';
      linearView.className = 'keywords__linear-view';
      document.querySelector('.keywords__canvas').appendChild(linearView);
    }

    linearView.innerHTML = window.ShopThatKeywordsLinearView
      ? window.ShopThatKeywordsLinearView.fullLinearViewHtml(nodeData, connectedNodes, linearViewOptions())
      : '';

    linearView.style.display = 'flex';
    linearView.scrollTop = 0;

    // Click handlers for connected items
    linearView.querySelectorAll('.linear-view__item').forEach(item => {
      item.addEventListener('click', () => {
        const target = allNodes.find(n => n.id === item.dataset.id);
        if (target) {
          pushState();
          showLinearView(target);
          openDrawer(target);
        }
      });
    });

    openDrawer(nodeData);
    updateModeIndicator();
  }

  // Hide linear view and restore bubble graph
  function hideLinearView() {
    const linearView = document.getElementById('linearView');
    if (linearView) linearView.style.display = 'none';
    svg.node().style.display = '';
    const legend = document.querySelector('.graph-legend-filter');
    if (legend) legend.style.display = '';
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
    .force('link', d3.forceLink(graphLinks).id(d => d.id).distance(20).strength(0.2))
    .force('charge', d3.forceManyBody().strength(-10).distanceMax(100))
    .force('center', centerForce)
    .force('collision', d3.forceCollide().radius(d => radius(d.value, d.group, d.isArea) + 2).strength(0.8).iterations(2))
    .alphaDecay(0.05)
    .velocityDecay(0.85)
    .alphaMin(0.005)
    .force('orbit', () => {
      // Tight horizontal flanking of the root in default + tree (Bubbles) modes
      if (currentViewMode !== 'default' && currentViewMode !== 'tree') return;

      const lvmhNode = graphNodes.find(n => n.group === 0);
      if (!lvmhNode) return;

      const w = width();
      const h = height();
      const centerX = w / 2;
      const centerY = h / 2;
      const lvmhRadius = radius(lvmhNode.value, lvmhNode.group, lvmhNode.isArea);
      const areaRadius = 70;
      const belowOffset = lvmhRadius + areaRadius + 20;
      const sideSpacing = areaRadius + 30;
      const childPad = 14;
      const childDx = lvmhRadius + areaRadius + childPad;

      const otherNodes = graphNodes.filter(n => n.group !== 0);
      const directLv = otherNodes.filter(n => n.parent === lvmhNode.id);
      const hasDeep = otherNodes.some(n => n.parent !== lvmhNode.id);

      otherNodes.forEach((node, i) => {
        let targetX;
        let targetY;
        if (!hasDeep && directLv.length === 2) {
          const pair = directLv.slice().sort((a, b) => a.id.localeCompare(b.id));
          const idx = pair.findIndex(p => p.id === node.id);
          if (idx === 0) { targetX = centerX - childDx; targetY = centerY; }
          else if (idx === 1) { targetX = centerX + childDx; targetY = centerY; }
          else return;
        } else if (!hasDeep && directLv.length === 1) {
          if (node.id !== directLv[0].id) return;
          targetX = centerX + childDx;
          targetY = centerY;
        } else {
          const lvmhY = centerY - belowOffset / 2;
          const xOffset = otherNodes.length === 1 ? 0 : (i === 0 ? -sideSpacing : sideSpacing);
          targetX = centerX + xOffset;
          targetY = lvmhY + belowOffset;
        }
        const dx = targetX - node.x;
        const dy = targetY - node.y;
        node.vx += dx * 0.12;
        node.vy += dy * 0.12;
      });
    })
    .force('cluster', () => {
      // Cluster force for non-default modes
      if (currentViewMode === 'default' || currentViewMode === 'tree') return;
      
      const w = width();
      const h = height();
      const centerX = w / 2;
      const centerY = h / 2;
      const maxDistance = Math.min(w, h) * 0.25;
      
      graphNodes.forEach(node => {
        if (node.fx !== null) return; // Skip fixed nodes
        
        const dx = node.x - centerX;
        const dy = node.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Centering force
        const centeringForce = 0.04;
        node.vx -= dx * centeringForce;
        node.vy -= dy * centeringForce;
        
        // Bound force
        if (distance > maxDistance) {
          const boundForce = (distance - maxDistance) * 0.1;
          node.vx -= (dx / distance) * boundForce;
          node.vy -= (dy / distance) * boundForce;
        }
      });
    });
  
  // Stop simulation completely when it's settled
  sim.on('end', () => {
    console.log('Simulation settled and stopped');
  });

  function rescaleForDrawer(){
    // No longer needed - sidebar is always visible
    // Keep function for compatibility with any remaining calls
  }

  function ticked(){
    // Don't update during transitions
    if (isTransitioning) return;
    
    // Round positions to whole pixels to avoid sub-pixel rendering jitter
    link.attr('x1', d => Math.round(d.source.x))
        .attr('y1', d => Math.round(d.source.y))
        .attr('x2', d => Math.round(d.target.x))
        .attr('y2', d => Math.round(d.target.y));
    
    // Only update position if not hovering (preserve hover scale)
    if (!isHoverClustering) {
      node.attr('transform', d => `translate(${Math.round(d.x)},${Math.round(d.y)})`);
    }
  }

  // Initialize empty selections - these will be populated by setGraphData
  let link = gLinks.selectAll('line');
  let node = gNodes.selectAll('g.node');

  sim.on('tick', ticked);

  // Track transition state
  let isTransitioning = false;
  let isLoadingNodes = false; // Disable hover during node loading
  
  // Wait for mouse movement before re-enabling hover
  function waitForMouseMoveToEnableHover() {
    const handler = () => {
      isLoadingNodes = false;
      svg.node().removeEventListener('mousemove', handler);
      document.removeEventListener('mousemove', handler);
    };
    // Listen on both SVG and document to catch any mouse movement
    svg.node().addEventListener('mousemove', handler, { once: true });
    document.addEventListener('mousemove', handler, { once: true });
  }
  
  function setGraphData(newNodes, newLinks, animate = true){
    console.log('setGraphData called with:', {
      newNodesCount: (newNodes || []).length,
      newLinksCount: (newLinks || []).length,
      currentMode: currentViewMode,
      animate: animate
    });
    
    // Store all data
    allNodes = newNodes || [];
    allLinks = (newLinks || []).filter(l => l.source && l.target && l.source !== l.target);
    
    // Get visible nodes and links based on current mode
    visibleNodes = getVisibleNodes();
    visibleLinks = getVisibleLinks(visibleNodes);
    
    const w = width();
    const h = height();
    const centerX = w / 2;
    const centerY = h / 2;
    
    // Calculate positions for new nodes in a tight cluster
    const newNodeIds = new Set(visibleNodes.map(n => n.id));
    const oldNodeIds = new Set(graphNodes.map(n => n.id));
    
    // Determine which nodes are entering, staying, or exiting
    const enteringNodes = visibleNodes.filter(n => !oldNodeIds.has(n.id));
    const exitingNodes = graphNodes.filter(n => !newNodeIds.has(n.id));
    const stayingNodes = visibleNodes.filter(n => oldNodeIds.has(n.id));
    
    // If animating, handle transitions
    if (animate && (enteringNodes.length > 0 || exitingNodes.length > 0)) {
      isTransitioning = true;
      isLoadingNodes = true; // Disable hover during loading
      
      // Disable pointer events on nodes during transition
      gNodes.style('pointer-events', 'none');
      
      // First, fade out exiting nodes quickly
      const exitSelection = gNodes.selectAll('g.node')
        .filter(d => !newNodeIds.has(d.id));
      
      exitSelection
        .transition('exit')
        .duration(150)
        .style('opacity', 0)
        .attr('transform', d => `translate(${centerX},${centerY}) scale(0.3)`)
        .remove();
      
      // Fade out exiting links
      gLinks.selectAll('line')
        .filter(l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return !newNodeIds.has(sourceId) || !newNodeIds.has(targetId);
        })
        .transition('exit')
        .duration(150)
        .attr('opacity', 0)
        .remove();
      
      // Wait for exit animations, then update
      setTimeout(() => {
        performGraphUpdate(visibleNodes, visibleLinks, centerX, centerY, true);
        isTransitioning = false;
        
        // Re-enable hover only after user moves mouse (after a short delay for animations)
        setTimeout(() => {
          gNodes.style('pointer-events', 'auto');
          // Wait for mouse movement to re-enable hover
          waitForMouseMoveToEnableHover();
        }, 400); // Wait for entry animations to finish
      }, 160);
    } else {
      performGraphUpdate(visibleNodes, visibleLinks, centerX, centerY, false);
    }
    
    updateModeIndicator();
  }

  function applySolarSystemLayout(centerX, centerY) {
    if (!graphNodes || graphNodes.length === 0) return;
    const lvmhNode = graphNodes.find(n => n.group === 0);
    const otherNodes = graphNodes.filter(n => n.group !== 0);
    if (!lvmhNode || (currentViewMode !== 'default' && currentViewMode !== 'tree')) return;

    const lvmhRadius = radius(lvmhNode.value, lvmhNode.group, lvmhNode.isArea);
    const areaRadius = 70;
    const belowOffset = lvmhRadius + areaRadius + 20;
    const sideSpacing = areaRadius + 30;
    const childPad = 14;
    const childDx = lvmhRadius + areaRadius + childPad;

    if (otherNodes.length === 0) {
      lvmhNode.x = centerX;
      lvmhNode.y = centerY;
      lvmhNode.vx = 0;
      lvmhNode.vy = 0;
      lvmhNode.fx = centerX;
      lvmhNode.fy = centerY;
    } else {
      const directLv = otherNodes.filter(n => n.parent === lvmhNode.id);
      const hasDeep = otherNodes.some(n => n.parent !== lvmhNode.id);

      lvmhNode.x = centerX;
      lvmhNode.y = centerY;
      lvmhNode.vx = 0;
      lvmhNode.vy = 0;
      lvmhNode.fx = centerX;
      lvmhNode.fy = centerY;

      if (!hasDeep && directLv.length === 2) {
        const pair = directLv.slice().sort((a, b) => a.id.localeCompare(b.id));
        pair[0].x = centerX - childDx;
        pair[0].y = centerY;
        pair[1].x = centerX + childDx;
        pair[1].y = centerY;
        pair.forEach(n => {
          n.vx = 0;
          n.vy = 0;
          n.fx = n.x;
          n.fy = n.y;
        });
      } else if (!hasDeep && directLv.length === 1) {
        const n = directLv[0];
        n.x = centerX + childDx;
        n.y = centerY;
        n.vx = 0;
        n.vy = 0;
        n.fx = n.x;
        n.fy = n.y;
      } else {
        const lvmhY = centerY - belowOffset / 2;
        lvmhNode.y = lvmhY;
        lvmhNode.fy = lvmhY;
        otherNodes.forEach((n, i) => {
          const xOffset = otherNodes.length === 1 ? 0 : (i === 0 ? -sideSpacing : sideSpacing);
          n.x = centerX + xOffset;
          n.y = lvmhY + belowOffset;
          n.vx = 0;
          n.vy = 0;
          n.fx = null;
          n.fy = null;
        });
      }
    }
  }
  
  function performGraphUpdate(newVisibleNodes, newVisibleLinks, centerX, centerY, animateEntry) {
    graphNodes = newVisibleNodes;
    graphLinks = newVisibleLinks;
    
    console.log('performGraphUpdate called:', {
      nodeCount: graphNodes.length,
      centerX, centerY,
      animateEntry,
      viewMode: currentViewMode
    });
    
    if (graphNodes.find(n => n.group === 0) && (currentViewMode === 'default' || currentViewMode === 'tree')) {
      applySolarSystemLayout(centerX, centerY);
      console.log('Layout: LVMH + ' + graphNodes.filter(n => n.group !== 0).length + ' non-root nodes');
    } else {
      // Standard tight cluster layout for other view modes
      graphNodes.forEach((n, i) => {
        // Unfix LVMH position if we're not in default mode
        if (n.group === 0) {
          n.fx = null;
          n.fy = null;
        }
        const angle = (i / graphNodes.length) * 2 * Math.PI;
        const clusterRadius = graphNodes.length === 1 ? 0 : 20;
        n.x = centerX + Math.cos(angle) * clusterRadius;
        n.y = centerY + Math.sin(angle) * clusterRadius;
        n.vx = 0;
        n.vy = 0;
      });
    }

    // Update links
    link = gLinks.selectAll('line').data(graphLinks, l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return `${sourceId}-${targetId}`;
    });
    link.exit().remove();
    link = link.join(
      enter => enter.append('line')
        .attr('opacity', 0)
        .attr('stroke-width', 1.5)
        .call(el => el.transition('enter').duration(300).delay(100).attr('opacity', 0)),
      update => update.transition('update').duration(200).attr('opacity', 0).attr('stroke-width', 1.5),
      exit => exit.remove()
    );

    // Update nodes
    node = gNodes.selectAll('g.node').data(graphNodes, d => d.id);
    node.exit().remove();
    
    node = node.join(
      enter => {
        const g = enter.append('g')
          .attr('class', 'node')
          .style('cursor', d => d.group === 0 ? 'default' : 'pointer') // LVMH not clickable
          .style('opacity', 0)
          .attr('transform', `translate(${centerX},${centerY}) scale(0.5)`);
        
        g.append('circle')
        .attr('r', d => radius(d.value, d.group, d.isArea))
          .attr('fill', d => color(d.group))
          .attr('opacity', 0.9);
      
      const text = g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#fff')
          .style('font-weight', '600')
          .style('pointer-events', 'none');
        
        text.each(function(d) {
          const r = radius(d.value, d.group, d.isArea);
          d3.select(this).style('font-size', `${computeFontSizeForRadius(r)}px`);
          wrapText(d3.select(this), bubbleNodeLabel(d), r);
        });
        
        // Animate entry
        if (animateEntry) {
          g.transition('enter')
            .duration(300)
            .delay((d, i) => i * 20)
            .ease(d3.easeCubicOut)
            .style('opacity', 1)
            .attr('transform', d => `translate(${Math.round(d.x || centerX)},${Math.round(d.y || centerY)}) scale(1)`);
        } else {
          // Ensure valid positions - fallback to center if NaN
          g.each(function(d) {
            if (isNaN(d.x) || isNaN(d.y)) {
              d.x = centerX;
              d.y = centerY;
              console.log('Fixed NaN position for', d.id, 'to', centerX, centerY);
            }
          });
          g.style('opacity', 1).attr('transform', d => `translate(${Math.round(d.x)},${Math.round(d.y)})`);
          console.log('Node positions after entry:', graphNodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
        }
        
        return g;
      },
      update => {
        // Animate existing nodes to new positions
        if (animateEntry) {
          update.transition('move')
            .duration(300)
            .ease(d3.easeCubicOut)
            .attr('transform', d => `translate(${Math.round(d.x)},${Math.round(d.y)})`);
        } else {
          update.attr('transform', d => `translate(${Math.round(d.x)},${Math.round(d.y)})`);
        }
        return update;
      },
      exit => exit.remove()
    );

    node.select('text').each(function(d) {
      const r = radius(d.value, d.group, d.isArea);
      d3.select(this).style('font-size', `${computeFontSizeForRadius(r)}px`);
      wrapText(d3.select(this), bubbleNodeLabel(d), r);
    });
    
    // Re-attach event handlers
    node.on('mouseenter', (event, d) => {
      if (isTransitioning || isLoadingNodes) return;
      hoveredNode = d;
      highlightConnections(d);
    });
    
    node.on('mouseleave', (event, d) => {
      if (isTransitioning || isLoadingNodes) return;
      hoveredNode = null;
      resetHighlighting();
    });
    
    node.on('click', (event, d) => {
      if (isTransitioning || isLoadingNodes) return;
      event.stopPropagation();
      handleNodeClick(d);
    });
    
    // Click on background to go back
    svg.on('click', (event) => {
      if (isTransitioning) return;
      if (event.target === svg.node()) {
        if (isBubbleView) {
          // In bubble view, background click goes back one level
          bubbleBack();
          return;
        }
        if (currentViewMode === 'expanded') {
          selectedNode = null;
          currentViewMode = 'default';
          clickedNode = null;
          hoveredNode = null;
          setGraphData(allNodes, allLinks, true);
          closeDrawer();
        } else {
          selectedNode = null;
        clickedNode = null;
        hoveredNode = null;
        resetHighlighting();
          closeDrawer();
        }
      }
    });
    
    // Update simulation
    sim.nodes(graphNodes);
    sim.force('link').links(graphLinks);
    
    // Position nodes in tight cluster centered on screen
    graphNodes.forEach((n, i) => {
      if (n.x == null || n.y == null || isNaN(n.x) || isNaN(n.y)) {
        const angle = (i / graphNodes.length) * 2 * Math.PI;
        const clusterRadius = 15;
        n.x = centerX + Math.cos(angle) * clusterRadius;
        n.y = centerY + Math.sin(angle) * clusterRadius;
      }
    });
    
    // Restart simulation with enough energy to properly settle nodes
    sim.alpha(0.3).alphaTarget(0).restart();

    if (filterInput && String(filterInput.value || '').trim()) {
      requestAnimationFrame(() => applyFilter(filterInput.value));
    }
  }

  // Node click handler - expand to show connected nodes
  function handleNodeClick(d) {
    if (isNodeDisabled(d) || isTransitioning) {
      return;
    }
    
    // In bubble view mode, handle clicks differently
    if (isBubbleView) {
      // LVMH click in bubble view - expand to show area nodes
      if (d.group === 0) {
        expandBubbleNode(d);
        return;
      }
      // Any other node - expand to show its connections
      expandBubbleNode(d);
      return;
    }

    // LVMH (group 0) is not clickable in linear mode
    if (d.group === 0) {
      return;
    }
    
    clickedNode = d;
    hoveredNode = null;
    isHoverClustering = false;
    
    if (currentViewMode === 'default' || currentViewMode === 'linear') {
      // Save current state before showing linear view
      pushState();
      showLinearView(d);
    } else if (currentViewMode === 'expanded' && selectedNode && selectedNode.id === d.id) {
      selectedNode = null;
      currentViewMode = 'default';
      clickedNode = null;
      setGraphData(allNodes, allLinks, true);
      showLVMHDetails();
    } else if (currentViewMode === 'expanded') {
      pushState();
      selectedNode = d;
      setGraphData(allNodes, allLinks, true);
      openDrawer(d);
    } else {
      selectedNode = d;
      highlightConnections(d);
      openDrawer(d);
    }
  }
  
  // Show LVMH details in sidebar (used on page load)
  function showLVMHDetails() {
    const lvmhNode = allNodes.find(n => n.group === 0);
    if (lvmhNode) {
      const connections = allLinks.filter(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return sourceId === 'LVMH' || targetId === 'LVMH';
      });
      const relatedKeywords = connections.map(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return sourceId === 'LVMH' ? targetId : sourceId;
      });
      
      drawerTitle.textContent = 'Louis Vuitton';
      drawerBody.innerHTML = `
        <div class="sidebar-content">
          <div class="sidebar-stats">
            <div class="sidebar-stat">
              <span class="sidebar-stat-value">${relatedKeywords.length}</span>
              <span class="sidebar-stat-label">Areas</span>
            </div>
            <div class="sidebar-stat">
              <span class="sidebar-stat-value">${allNodes.length}</span>
              <span class="sidebar-stat-label">Total Keywords</span>
            </div>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-label">Description</div>
            <p class="sidebar-description">Louis Vuitton is the central hub of the knowledge graph. Click on an area to explore the restaurants, hotels, galleries, and more within it.</p>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-header">
              <div class="sidebar-section-label">Areas</div>
              <button class="sidebar-reset-btn" id="resetChipsBtn" title="Reset all"${disabledNodes.size === 0 ? ' disabled' : ''}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                Reset
              </button>
            </div>
            <p class="sidebar-hint">Click a keyword to toggle visibility</p>
            <div class="sidebar-chips">
              ${relatedKeywords.map(kw => `<span class="sidebar-chip sidebar-chip--toggle${disabledNodes.has(kw) ? ' sidebar-chip--disabled' : ''}" data-keyword="${escapeHtml(kw)}">${escapeHtml(kw)}</span>`).join('')}
            </div>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-label">Related Articles</div>
            <div class="sidebar-articles kw-related-articles-mount"></div>
          </div>
        </div>
      `;
      
      // Add click handlers to chips
      attachChipClickHandlers();
      if (window.kwHydrateRelatedArticles) {
        window.kwHydrateRelatedArticles('LVMH', drawerBody);
      }
    }
  }
  
  // Attach click handlers to sidebar chips for toggling node visibility
  function attachChipClickHandlers() {
    const chips = drawerBody.querySelectorAll('.sidebar-chip--toggle');
    const resetBtn = drawerBody.querySelector('#resetChipsBtn');
    
    // Update reset button state
    function updateResetBtnState() {
      if (resetBtn) {
        resetBtn.disabled = disabledNodes.size === 0;
      }
    }
    
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        const keyword = chip.dataset.keyword;
        toggleNodeDisabled(keyword);
        chip.classList.toggle('sidebar-chip--disabled');
        updateResetBtnState();
      });
    });
    
    // Reset button handler
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        // Clear all disabled nodes
        disabledNodes.clear();
        
        // Update all chips to enabled state
        chips.forEach(chip => {
          chip.classList.remove('sidebar-chip--disabled');
        });
        
        // Update node visuals
        updateNodeDisabledStates();
        
        // Disable the reset button
        resetBtn.disabled = true;
      });
    }
  }
  
  // Toggle a node's disabled state
  function toggleNodeDisabled(nodeId) {
    if (disabledNodes.has(nodeId)) {
      disabledNodes.delete(nodeId);
    } else {
      disabledNodes.add(nodeId);
    }
    
    // Update node appearance
    updateNodeDisabledStates();
  }
  
  // Update the visual state of disabled nodes
  function updateNodeDisabledStates() {
    node.each(function(d) {
      const nodeEl = d3.select(this);
      const isDisabled = disabledNodes.has(d.id);
      
      nodeEl.select('circle')
        .transition()
        .duration(200)
        .attr('opacity', isDisabled ? 0.25 : 0.9)
        .style('filter', isDisabled ? 'grayscale(0.8) brightness(1.3)' : 'none');
      
      nodeEl.select('text')
        .transition()
        .duration(200)
        .attr('opacity', isDisabled ? 0.4 : 1);
    });
  }

  function resize(){
    const canvasEl = getBubbleSizingCanvas();
    const w = (canvasEl && canvasEl.clientWidth > 0) ? canvasEl.clientWidth : Math.min(1200, Math.max(400, window.innerWidth - 80));
    const h = (canvasEl && canvasEl.clientHeight > 0)
      ? canvasEl.clientHeight
      : Math.max(window.innerHeight * 0.7, 400);
    console.log('Resize called with dimensions:', { w, h });
    svg.attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h);
    centerForce.x(w/2).y(h/2);

    const cx = w / 2;
    const cy = h / 2;
    applySolarSystemLayout(cx, cy);

    // Center nodes initially if they don't have positions
    if (graphNodes.some(node => node.x == null || node.y == null || isNaN(node.x) || isNaN(node.y))) {
      graphNodes.forEach((node, i) => {
        if (node.x == null || node.y == null || isNaN(node.x) || isNaN(node.y)) {
          const angle = (i / graphNodes.length) * 2 * Math.PI;
          const clusterRadius = 15;
          node.x = cx + Math.cos(angle) * clusterRadius;
          node.y = cy + Math.sin(angle) * clusterRadius;
        }
      });
    }

    if (node && graphNodes.length) {
      node.attr('transform', d => `translate(${Math.round(d.x)},${Math.round(d.y)})`);
    }

    sim.alpha(0.3).alphaTarget(0).restart();
    rescaleForDrawer();
  }
  
  function afterLayoutReady(callback) {
    requestAnimationFrame(() => {
      const canvasEl = getBubbleSizingCanvas();
      if (canvasEl && canvasEl.clientWidth > 0 && canvasEl.clientHeight > 0) {
        callback(canvasEl);
        return;
      }

      requestAnimationFrame(() => callback(getBubbleSizingCanvas()));
    });
  }

  // Ensure resize is called after DOM is ready and layout has been calculated
  function initializeGraph() {
    console.log('initializeGraph called');
    console.log('SVG element exists:', !!svg.node());
    console.log('Container element exists:', !!container);
    console.log('D3 version:', d3.version);
    
    afterLayoutReady((canvasEl) => {
      console.log('Layout-ready initialization starting...');
      console.log('Canvas element dimensions:', {
        width: canvasEl?.clientWidth,
        height: canvasEl?.clientHeight,
        exists: !!canvasEl
      });
      
      // IMPORTANT: Set SVG dimensions FIRST before creating nodes
      const w = (canvasEl && canvasEl.clientWidth > 0) ? canvasEl.clientWidth : Math.min(1200, Math.max(400, window.innerWidth - 80));
      const h = (canvasEl && canvasEl.clientHeight > 0) ? canvasEl.clientHeight : Math.max(window.innerHeight * 0.7, 400);
      svg.attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h);
      centerForce.x(w/2).y(h/2);
      
      console.log('About to initialize with data:', {
        allNodes: allNodes.length,
        allLinks: allLinks.length,
        sampleNodes: allNodes.slice(0, 2),
        canvasWidth: w,
        canvasHeight: h
      });
      
      // Initialize the graph data properly (no animation on initial load)
      setGraphData(allNodes, allLinks, false);
      
      // Call resize to finalize positioning
      resize();
      
      requestAnimationFrame(() => {
        showBubbleView();
      });
      
      console.log('After initialization:');
      console.log('Graph nodes in simulation:', sim.nodes().length);
      console.log('Graph links in simulation:', sim.force('link').links().length);
      console.log('DOM nodes count:', gNodes.selectAll('g.node').size());
    });
  }
  
  window.addEventListener('resize', resize);
  
  // Call initialization when DOM is ready; layout readiness is handled above.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGraph);
  } else {
    initializeGraph();
  }

  function openDrawer(d){
    // Always use the LVMH-specific details for the root node
    if (d.id === 'LVMH' || d.group === 0) {
      showLVMHDetails();
      return;
    }
    drawerTitle.textContent = d.id;
    
    // Use allLinks to get ALL connections, not just visible ones
    const connections = allLinks.filter(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return sourceId === d.id || targetId === d.id;
    });
    
    const relatedKeywords = connections.map(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return sourceId === d.id ? targetId : sourceId;
    });
    
    // Remove duplicates and sort
    const uniqueKeywords = [...new Set(relatedKeywords)].sort();
    
    drawerBody.innerHTML = `
      <div class="sidebar-content">
        <div class="sidebar-stats">
          <div class="sidebar-stat">
            <span class="sidebar-stat-value">${d.value}</span>
            <span class="sidebar-stat-label">Volume</span>
          </div>
          <div class="sidebar-stat">
            <span class="sidebar-stat-value">${uniqueKeywords.length}</span>
            <span class="sidebar-stat-label">Connections</span>
          </div>
          </div>
        <div class="sidebar-section">
          <div class="sidebar-section-label">Description</div>
          <p class="sidebar-description">Placeholder description about ${escapeHtml(d.id)} with sample insights.</p>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <div class="sidebar-section-label">Related Keywords</div>
            <button class="sidebar-reset-btn" id="resetChipsBtn" title="Reset all"${disabledNodes.size === 0 ? ' disabled' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reset
            </button>
          </div>
          <p class="sidebar-hint">Click a keyword to toggle visibility</p>
          <div class="sidebar-chips">
            ${uniqueKeywords.length > 0 
              ? uniqueKeywords.map(kw => `<span class="sidebar-chip sidebar-chip--toggle${disabledNodes.has(kw) ? ' sidebar-chip--disabled' : ''}" data-keyword="${escapeHtml(kw)}">${escapeHtml(kw)}</span>`).join('')
              : '<span class="sidebar-no-data">No related keywords</span>'
            }
          </div>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-section-label">Related Articles</div>
          <div class="sidebar-articles kw-related-articles-mount"></div>
        </div>
      </div>
    `;
    
    // Add click handlers to chips
    attachChipClickHandlers();
    if (window.kwHydrateRelatedArticles) {
      window.kwHydrateRelatedArticles(d.id, drawerBody);
    }
  }
  
  function closeDrawer(){
    // Reset sidebar to placeholder state
    drawerTitle.textContent = 'Select a Keyword';
    drawerBody.innerHTML = '<p class="sidebar__placeholder">Click on a node in the graph to see its details and connections.</p>';
  }
  
  // Neo4j drawer handlers (keep as modal)
  neo4jClose && neo4jClose.addEventListener('click', ()=>{ neo4jDrawer.setAttribute('aria-hidden','true'); });
  openNeo4jBtn && openNeo4jBtn.addEventListener('click', ()=>{ neo4jDrawer.setAttribute('aria-hidden','false'); });

  // Search: show only matched keyword(s) and anything linked to them in the graph
  function applyFilter(term) {
    const ids = neighborhoodIdsForSearchQuery(term);
    if (ids === null) {
      node.interrupt('search');
      link.interrupt('search');
      node.transition('search').duration(150)
        .style('opacity', 1)
        .style('pointer-events', 'auto');
      link.transition('search').duration(150)
        .attr('opacity', 0);
      updateNodeDisabledStates();
      return;
    }
    const active = ids.size > 0;
    node.interrupt('search');
    link.interrupt('search');
    node.transition('search').duration(150)
      .style('opacity', d => active && ids.has(d.id) ? 1 : 0)
      .style('pointer-events', d => active && ids.has(d.id) ? 'auto' : 'none');
    link.transition('search').duration(150)
      .attr('opacity', l => {
        if (!active) return 0;
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return ids.has(s) && ids.has(t) ? 0.55 : 0;
      });
    updateNodeDisabledStates();
  }
  filterInput && filterInput.addEventListener('input', (e)=> applyFilter(e.target.value));
  resetBtn && resetBtn.addEventListener('click', ()=>{ 
    filterInput && (filterInput.value='');
    applyFilter('');
    const globalSearchEl = document.getElementById('kwGlobalSearch');
    if (globalSearchEl) globalSearchEl.value = '';

    // Hide linear view if active
    hideLinearView();
    
    // Reset to default view (LVMH + primary nodes)
    currentViewMode = 'default';
    selectedNode = null;
    clickedNode = null;
    hoveredNode = null;
    isHoverClustering = false;
    originalPositions = {};
    disabledNodes.clear(); // Clear disabled nodes
    
    // Reset node positions to force re-centering
    allNodes.forEach(node => {
      delete node.x;
      delete node.y;
      delete node.vx;
      delete node.vy;
    });
    
    setGraphData(allNodes, allLinks, true);
    
    // Clear state history on reset
    stateHistory.length = 0;
    
    // Return to bubble view (LVMH centered)
    setTimeout(() => {
      showBubbleView();
    }, 200);
  });
  
  // Back button - navigate through state history
  const backBtn = document.getElementById('keywordsBackBtn');
  backBtn && backBtn.addEventListener('click', () => {
    // Bubble view back navigation
    if (isBubbleView) {
      if (!bubbleBack()) {
        // No more bubble history - switch back to list view
        showListView();
      }
      return;
    }

    // Linear view back navigation
    if (currentViewMode === 'linear') {
      const previousState = popState();
      if (previousState) {
        if (previousState.viewMode === 'linear') {
          const prevNode = allNodes.find(n => n.id === previousState.selectedNodeId);
          if (prevNode) {
            showLinearView(prevNode);
            return;
          }
        }
        hideLinearView();
        restoreState(previousState);
      } else {
        // No history - go back to LVMH linear view (home)
        const lvmhNode = allNodes.find(n => n.id === 'LVMH');
        if (lvmhNode) {
          showLinearView(lvmhNode);
        }
      }
      return;
    }
    const previousState = popState();
    if (previousState) {
      restoreState(previousState);
    } else {
      history.back();
    }
  });
  
  // Show All button functionality
  const showAllBtn = document.getElementById('showAll');
  showAllBtn && showAllBtn.addEventListener('click', () => {
    currentViewMode = 'all';
    selectedNode = null;
    clickedNode = null;
    hoveredNode = null;
    setGraphData(allNodes, allLinks, true);
  });

  // Update checkbox states based on what node types exist in current view
  function updateFilterCheckboxes() {
    // Get current visible nodes based on view mode (before applying hidden filter)
    let availableNodes;
    if (currentViewMode === 'default') {
      availableNodes = allNodes.filter(n => n.group === 0 || n.group === 1); // LVMH + primary on default
    } else if (currentViewMode === 'expanded' && selectedNode) {
      const connectedIds = getConnectedNodeIds(selectedNode);
      availableNodes = allNodes.filter(n => connectedIds.has(n.id));
    } else {
      availableNodes = allNodes;
    }
    
    // Check which groups exist in available nodes
    const availableGroups = new Set(availableNodes.map(n => n.group));
    
    // Update each checkbox (note: group 0 is LVMH root, not in filter checkboxes)
    const checkboxMap = {
      'filterTopLevel': 1,
      'filterConnected': 2,
      'filterSecondary': 3,
      'filterIsolated': 4
    };
    
    Object.entries(checkboxMap).forEach(([id, group]) => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        const isAvailable = availableGroups.has(group);
        checkbox.disabled = !isAvailable;
        checkbox.parentElement.style.opacity = isAvailable ? '1' : '0.4';
        checkbox.parentElement.style.pointerEvents = isAvailable ? 'auto' : 'none';
        
        // If available, check based on whether it's hidden
        if (isAvailable) {
          checkbox.checked = !hiddenGroups.has(group);
        } else {
          checkbox.checked = false;
        }
      }
    });
  }
  
  // Toggle visibility of a node group and regroup remaining nodes
  function toggleGroupVisibility(group, isVisible) {
    if (isVisible) {
      hiddenGroups.delete(group);
    } else {
      hiddenGroups.add(group);
    }
    
    const w = width();
    const h = height();
    const centerX = w / 2;
    const centerY = h / 2;
    
    // Get visible nodes (not in hidden groups)
    const visibleNodeIds = new Set(
      graphNodes.filter(n => !hiddenGroups.has(n.group)).map(n => n.id)
    );
    
    // Animate hiding nodes
    node.each(function(d) {
      const nodeEl = d3.select(this);
      const shouldShow = !hiddenGroups.has(d.group);
      
      if (!shouldShow) {
        // Fade out and shrink toward center
        nodeEl.transition()
          .duration(250)
          .ease(d3.easeCubicIn)
          .style('opacity', 0)
          .attr('transform', `translate(${centerX},${centerY}) scale(0.3)`)
          .style('pointer-events', 'none');
      }
    });
    
    // After hiding animation, reposition visible nodes
    setTimeout(() => {
      // Reset positions of visible nodes to cluster
      const visibleNodes = graphNodes.filter(n => !hiddenGroups.has(n.group));
      visibleNodes.forEach((n, i) => {
        const angle = (i / visibleNodes.length) * 2 * Math.PI;
        const clusterRadius = 20;
        n.x = centerX + Math.cos(angle) * clusterRadius;
        n.y = centerY + Math.sin(angle) * clusterRadius;
        n.vx = 0;
        n.vy = 0;
      });
      
      // Animate visible nodes to new positions
      node.each(function(d) {
        const nodeEl = d3.select(this);
        const shouldShow = !hiddenGroups.has(d.group);
        
        if (shouldShow) {
          nodeEl.transition()
            .duration(300)
            .ease(d3.easeCubicOut)
            .style('opacity', 1)
            .attr('transform', `translate(${Math.round(d.x)},${Math.round(d.y)}) scale(1)`)
            .style('pointer-events', 'auto');
        }
      });
      
      // Update simulation with only visible nodes
      sim.nodes(visibleNodes);
      sim.alpha(0.3).alphaTarget(0).restart();
    }, isVisible ? 0 : 260);
    
    // If showing nodes, animate them in from center
    if (isVisible) {
      // First position newly visible nodes at center
      node.each(function(d) {
        if (d.group === group) {
          d.x = centerX;
          d.y = centerY;
          d3.select(this)
            .attr('transform', `translate(${centerX},${centerY}) scale(0.3)`)
            .style('opacity', 0);
        }
      });
      
      // Then animate them in after regrouping starts
      setTimeout(() => {
        const visibleNodes = graphNodes.filter(n => !hiddenGroups.has(n.group));
        visibleNodes.forEach((n, i) => {
          const angle = (i / visibleNodes.length) * 2 * Math.PI;
          const clusterRadius = 20;
          n.x = centerX + Math.cos(angle) * clusterRadius;
          n.y = centerY + Math.sin(angle) * clusterRadius;
        });
        
        node.each(function(d) {
          const nodeEl = d3.select(this);
          if (!hiddenGroups.has(d.group)) {
            nodeEl.transition()
              .duration(350)
              .ease(d3.easeBackOut.overshoot(0.5))
              .style('opacity', 1)
              .attr('transform', `translate(${Math.round(d.x)},${Math.round(d.y)}) scale(1)`)
              .style('pointer-events', 'auto');
          }
        });
        
        sim.nodes(visibleNodes);
        sim.alpha(0.3).alphaTarget(0).restart();
      }, 50);
    }
  }
  
  // Add change listeners to filter checkboxes
  const checkboxGroupMap = {
    'filterTopLevel': 1,
    'filterConnected': 2,
    'filterSecondary': 3,
    'filterIsolated': 4
  };
  
  Object.entries(checkboxGroupMap).forEach(([id, group]) => {
    const checkbox = document.getElementById(id);
    checkbox && checkbox.addEventListener('change', (e) => {
      toggleGroupVisibility(group, e.target.checked);
    });
  });
  
  // Update checkboxes whenever graph data changes
  const originalSetGraphData = setGraphData;
  setGraphData = function(newNodes, newLinks, animate) {
    // Clear hidden groups when view changes (unless restoring state)
    if (!isRestoringState) {
      hiddenGroups.clear();
    }
    originalSetGraphData(newNodes, newLinks, animate);
    // Update checkboxes after a short delay to let the graph render
    setTimeout(updateFilterCheckboxes, 200);
  };

  // Zoom controls
  zoomIn && zoomIn.addEventListener('click', ()=> svg.transition().duration(200).call(zoom.scaleBy, 1.2));
  zoomOut && zoomOut.addEventListener('click', ()=> svg.transition().duration(200).call(zoom.scaleBy, 0.8));
  fitBtn && fitBtn.addEventListener('click', ()=> svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity));

  // View state (tabs now handle switching, but keep state for internal logic)
  let isBubbleView = false;

  // Track bubble view navigation history
  const bubbleHistory = [];

  function showBubbleView(/* startNode */) {
    isBubbleView = true;
    hideLinearView();

    // Reset to tree-style navigation: only LVMH (Louis Vuitton) is visible.
    bubblesExpandedIds.clear();
    bubbleHistory.length = 0;

    selectedNode = null;
    clickedNode = null;
    hoveredNode = null;
    isHoverClustering = false;
    currentViewMode = 'tree';

    resize();

    allNodes.forEach(n => { delete n.x; delete n.y; delete n.vx; delete n.vy; delete n.fx; delete n.fy; });
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity), 300);

    showLVMHDetails();
  }

  // Tree-style toggle: clicking a bubble expands its direct children; clicking
  // an already-expanded bubble collapses its subtree and closes the side
  // panel (mirroring the Tree view behavior).
  function expandBubbleNode(nodeData) {
    if (!nodeData) return;
    var id = nodeData.id;

    if (bubblesExpandedIds.has(id)) {
      // Collapse this node and any deeper expansions beneath it.
      collapseBubbleSubtree(id);
      if (selectedNode && selectedNode.id === id) {
        selectedNode = null;
        showLVMHDetails();
      }
    } else {
      bubblesExpandedIds.add(id);
      selectedNode = nodeData;
      openDrawer(nodeData);
    }

    clickedNode = null;
    hoveredNode = null;
    isHoverClustering = false;
    currentViewMode = 'tree';

    resize();

    allNodes.forEach(n => { delete n.x; delete n.y; delete n.vx; delete n.vy; delete n.fx; delete n.fy; });
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity), 300);
  }

  // Background click in bubble view: collapse the deepest expansion (acts
  // like a one-step "back"). Returns false when there's nothing to collapse
  // so the outer click handler can fall through to its default behavior.
  function bubbleBack() {
    if (bubblesExpandedIds.size === 0) return false;
    var deepest = bubbleState.deepestExpandedId
      ? bubbleState.deepestExpandedId(allNodes, bubblesExpandedIds)
      : null;
    if (!deepest) return false;

    collapseBubbleSubtree(deepest);
    if (selectedNode && selectedNode.id === deepest) {
      selectedNode = null;
      showLVMHDetails();
    }

    resize();

    allNodes.forEach(n => { delete n.x; delete n.y; delete n.vx; delete n.vy; delete n.fx; delete n.fy; });
    setGraphData(allNodes, allLinks, true);
    setTimeout(() => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity), 300);
    return true;
  }

  function showListView() {
    isBubbleView = false;

    // Remember current node for sidebar continuity
    const currentNode = selectedNode;

    clickedNode = null;
    hoveredNode = null;
    stateHistory.length = 0;

    // Build the linear view history from the bubble history so back works
    // Each level in bubble history becomes a linear state entry
    const lvmhNode = allNodes.find(n => n.id === 'LVMH');
    bubbleHistory.forEach(entry => {
      stateHistory.push({
        viewMode: 'linear',
        selectedNodeId: entry.selectedNodeId || 'LVMH',
        hiddenGroups: new Set(),
        timestamp: Date.now()
      });
    });

    // Show linear view for the current node, or LVMH if none
    const nodeToShow = currentNode || lvmhNode;
    if (nodeToShow) {
      showLinearView(nodeToShow);
    }
  }

  // Expose tab switching for external tab navigation
  window.kwShowBubblesTab = function() {
    hideLinearView();
    showBubbleView();
  };
  window.kwShowListTab = function() {
    const lvmhNode = allNodes.find(n => n.id === 'LVMH');
    if (lvmhNode) showListView();

    // Build list in the dedicated list tab
    const container = document.getElementById('listViewContainer');
    if (!container) return;
    container.innerHTML = '';

    const sections = window.ShopThatKeywordsLinearView
      ? window.ShopThatKeywordsLinearView.listTabSections(allNodes, linearViewOptions())
      : [];

    sections.forEach(sectionData => {
      const section = document.createElement('div');
      section.innerHTML = sectionData.html;
      sectionData.items.forEach(itemData => {
        const el = document.createElement('div');
        el.innerHTML = itemData.html;
        const item = el.firstElementChild;
        if (!item) return;
        item.addEventListener('click', function() {
          var target = allNodes.find(function(nd) { return nd.id === itemData.id; });
          if (target) {
            var title = document.getElementById('listDrawerTitle');
            var body = document.getElementById('listDrawerBody');
            if (title) title.textContent = target.id;
            if (body) {
              var conns = getConnectedNodeIds(target);
              var connNodes = allNodes.filter(function(nd) { return conns.has(nd.id) && nd.id !== target.id; });
              body.innerHTML = '<div class="sidebar-stat"><span class="sidebar-stat-value">' + connNodes.length + '</span><span class="sidebar-stat-label">connections</span></div><div class="sidebar-connections"><h3>Connected Keywords</h3>' + connNodes.map(function(c) { return '<span class="sidebar-connection-tag">' + escapeHtml(c.id) + '</span>'; }).join('') + '</div><div class="sidebar-articles"><h3>Related Articles</h3><div class="kw-related-articles-mount"></div></div>';
              if (window.kwHydrateRelatedArticles) {
                window.kwHydrateRelatedArticles(target.id, body);
              }
            }
          }
        });
        section.appendChild(item);
      });
      container.appendChild(section);
    });
  };

  window.kwGetNodes = function() { return allNodes; };
  window.kwGetLinks = function() { return allLinks; };
  window.kwGetConnected = getConnectedNodeIds;
  window.kwNeighborhoodIdsForSearch = neighborhoodIdsForSearchQuery;
  window.kwGetArticlesHTML = generateArticlesHTML;

  // Fullscreen toggle
  const fullscreenToggle = document.getElementById('fullscreenToggle');
  const fullscreenExit = document.getElementById('fullscreenExit');
  const keywordsCanvas = document.querySelector('.keywords__canvas');
  const expandIcon = fullscreenToggle?.querySelector('.fullscreen-expand-icon');
  const collapseIcon = fullscreenToggle?.querySelector('.fullscreen-collapse-icon');

  function toggleFullscreen() {
    const isFullscreen = keywordsCanvas.classList.toggle('is-fullscreen');
    
    if (expandIcon && collapseIcon) {
      expandIcon.style.display = isFullscreen ? 'none' : 'block';
      collapseIcon.style.display = isFullscreen ? 'block' : 'none';
    }
    
    // Re-fit the graph after a short delay to account for the size change
    setTimeout(() => {
      svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);
    }, 100);
  }

  fullscreenToggle && fullscreenToggle.addEventListener('click', toggleFullscreen);
  fullscreenExit && fullscreenExit.addEventListener('click', toggleFullscreen);

  // Handle Escape key to exit fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && keywordsCanvas?.classList.contains('is-fullscreen')) {
      toggleFullscreen();
    }
  });

  // Neo4j integration is backend-owned; the browser only calls same-origin APIs.
  const neo4jConnectBtn = document.getElementById('neo4jConnect');
  const neo4jLoadBtn = document.getElementById('neo4jLoad');
  const neo4jSeedBtn = document.getElementById('neo4jSeed');
  const neo4jStatusEl = document.getElementById('neo4jStatus');
  const keywordGraphApi = window.ShopThatKeywordGraphApi;

  function setStatus(msg, ok){
    if(neo4jStatusEl){ neo4jStatusEl.textContent = msg; neo4jStatusEl.style.color = ok ? '#065f46' : '#6b7280'; }
  }

  neo4jConnectBtn && neo4jConnectBtn.addEventListener('click', async () => {
    try {
      if (!keywordGraphApi) throw new Error('Graph API client unavailable');
      await keywordGraphApi.check();
      setStatus('Backend graph API ready', true);
      neo4jLoadBtn && (neo4jLoadBtn.disabled = false);
    } catch(err){
      console.error(err);
      setStatus(err.message || 'Graph API unavailable');
    }
  });

  neo4jSeedBtn && neo4jSeedBtn.addEventListener('click', async () => {
    try {
      if (!keywordGraphApi) throw new Error('Graph API client unavailable');
      await keywordGraphApi.seed(graphNodes, graphLinks.length ? graphLinks : defaultLinks);
      setStatus('Seeded sample graph', true);
      neo4jLoadBtn && (neo4jLoadBtn.disabled = false);
    } catch(err){ console.error(err); setStatus(err.message || 'Seed failed'); }
  });

  neo4jLoadBtn && neo4jLoadBtn.addEventListener('click', async () => {
    try {
      if (!keywordGraphApi) throw new Error('Graph API client unavailable');
      const graph = await keywordGraphApi.load();
      if(graph.nodes.length === 0){ setStatus('No data found. Try Seed.', false); return; }
      setGraphData(graph.nodes, graph.links);
      setStatus(`Loaded ${graph.nodes.length} nodes / ${graph.links.length} links`, true);
    } catch(err){ console.error(err); setStatus(err.message || 'Load failed'); }
  });

  // Real-time synchronization with shared data system — DISABLED for the
  // keyword graph view. This page is the source of truth for the curated
  // Louis Vuitton ▸ Kusama / New York hierarchy, so reacting to other pages’
  // ShopThatData mutations would (a) strip the `parent` fields the bubble &
  // tree views need, and (b) re-inject the legacy AREA_DEFS keyword links.
  if (window.ShopThatData && false) {
    // Listen for keyword changes from other pages
    window.ShopThatData.on('keywords', (keywords) => {
      let newNodes = keywords.map(node => ({
        id: node.id || node.name,
        group: node.group || 1,
        value: node.value || 50,
        isArea: node.isArea || false,
        isRoot: node.isRoot || false,
        parent: node.parent || undefined
      }));
      let newLinks = allLinks.slice();
      const result = ensureLVMH(newNodes, newLinks);
      setGraphData(result.nodes, result.links, false);
    });
    
    // Listen for connection changes from other pages
    window.ShopThatData.on('connections', (connections) => {
      let newNodes = allNodes.slice();
      let newLinks = connections.slice();
      const result = ensureLVMH(newNodes, newLinks);
      setGraphData(result.nodes, result.links, false);
    });
  }

  // Area structure definition
  const AREA_DEFS = [
    { node: { id: '57th St.', group: 1, value: 90, isArea: true },
      keywords: ['The Modern','Two Michelin Stars','MoMA Museum','Le Bernardin','Three Michelin Stars','Eric Ripert','Seafood','The Plaza','The St. Regis','The Baccarat','Luxury Hotel'] },
    { node: { id: 'Soho', group: 1, value: 90, isArea: true },
      keywords: ['Cafe Carlyle','The Carlyle','Bemelmans Bar','Art Deco','Jean-Georges Vongerichten','Jean-Georges at The Mark','The Mark Hotel'] }
  ];

  function linkExists(links, src, tgt) {
    return links.some(l =>
      (l.source === src && l.target === tgt) || (l.source === tgt && l.target === src) ||
      (l.source?.id === src && l.target?.id === tgt) || (l.source?.id === tgt && l.target?.id === src)
    );
  }

  // Ensure LVMH + area nodes + area connections always exist
  function ensureLVMH(nodes, links) {
    if (!nodes.some(n => n.id === 'LVMH')) {
      nodes.unshift({ id: 'LVMH', group: 0, value: 100, isRoot: true });
    }

    AREA_DEFS.forEach(area => {
      // Ensure area node
      let existing = nodes.find(n => n.id === area.node.id);
      if (!existing) {
        nodes.push({ ...area.node });
      } else {
        existing.isArea = true;
      }

      // Ensure LVMH → area link
      if (!linkExists(links, 'LVMH', area.node.id)) {
        links.push({ source: 'LVMH', target: area.node.id });
      }

      // Ensure area → keyword links
      area.keywords.forEach(kw => {
        if (nodes.some(n => n.id === kw) && !linkExists(links, area.node.id, kw)) {
          links.push({ source: area.node.id, target: kw });
        }
      });
    });

    return { nodes, links };
  }

  // Function to refresh data from shared storage
  function refreshFromSharedData() {
    if (window.ShopThatData) {
      const keywords = window.ShopThatData.getKeywords();
      const connections = window.ShopThatData.getConnections();
      
      // Convert keywords to D3 format
      let newNodes = keywords.map(node => ({
        id: node.id || node.name,
        group: node.group || 1,
        value: node.value || 50,
        isArea: node.isArea || false,
        isRoot: node.isRoot || false
      }));
      
      let newLinks = connections.slice();
      
      // Ensure LVMH is always present
      const result = ensureLVMH(newNodes, newLinks);
      
      setGraphData(result.nodes, result.links, false);
    }
  }

  // Visibility / startup auto-refresh — DISABLED. Both paths called
  // refreshFromSharedData() which dropped the `parent` fields and ran
  // ensureLVMH() (legacy AREA_DEFS), collapsing the curated hierarchy back
  // to the flat 57th St./Soho list. We rebuild from defaults on every load
  // instead, so these handlers are no-ops on this page.
  void refreshFromSharedData;

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

  // Bootstrap graph keywords from Luxury Intelligence API — DISABLED.
  // The keyword graph is now driven by the curated `defaultNodes`/`defaultLinks`
  // above (Louis Vuitton ▸ Kusama / 57th St. / SoHo). Re-enable only if the
  // demo should pull live AI keywords again.
  // setTimeout(bootstrapAiKeywordGraph, 180);
  void bootstrapAiKeywordGraph; // keep symbol referenced so linters stay quiet

})();


