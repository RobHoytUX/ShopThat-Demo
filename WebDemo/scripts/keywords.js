/* Keywords Bubble Graph */
(function(){
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

  const width = () => svg.node().clientWidth;
  const height = () => svg.node().clientHeight;

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
    { id: 'Tote', group: 3, value: 16 }
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
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; }
  }
  let graphNodes = (loadStored().length ? loadStored() : defaultNodes).slice();
  let graphLinks = defaultLinks.slice();

  const color = d3.scaleOrdinal([ '#6366F1', '#7C3AED', '#4F46E5', '#312E81' ]);
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

  const gLinks = svg.append('g').attr('stroke', '#d9d9ef').attr('stroke-width', 1.2);
  const gNodes = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.5, 2]).on('zoom', (ev)=>{
    gNodes.attr('transform', ev.transform);
    gLinks.attr('transform', ev.transform);
  });
  svg.call(zoom);

  const centerForce = d3.forceCenter(0, 0);
  const sim = d3.forceSimulation(graphNodes)
    .force('link', d3.forceLink(graphLinks).id(d => d.id).distance(160).strength(0.08))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', centerForce)
    .force('collision', d3.forceCollide().radius(d => radius(d.value)+4));

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

  let link = gLinks.selectAll('line').data(graphLinks).join('line');

  let node = gNodes.selectAll('g.node').data(graphNodes).join(enter => {
    const g = enter.append('g').attr('class','node').style('cursor','pointer');
    g.append('circle')
      .attr('r', d => radius(d.value))
      .attr('fill', d => d3.color(color(d.group)).formatHex())
      .attr('opacity', .9);
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

  node.on('click', (_, d) => openDrawer(d));

  sim.on('tick', ticked);

  function setGraphData(newNodes, newLinks){
    graphNodes = newNodes || [];
    graphLinks = (newLinks || []).filter(l => l.source && l.target && l.source !== l.target);

    link = gLinks.selectAll('line').data(graphLinks);
    link.exit().remove();
    link = link.join('line');

    node = gNodes.selectAll('g.node').data(graphNodes, d => d.id);
    node.exit().remove();
    node = node.join(enter => {
      const g = enter.append('g').attr('class','node').style('cursor','pointer');
      g.append('circle')
        .attr('r', d => radius(d.value))
        .attr('fill', d => d3.color(color(d.group)).formatHex())
        .attr('opacity', .9);
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
    node.on('click', (_, d) => openDrawer(d));

    sim.nodes(graphNodes);
    sim.force('link').links(graphLinks);
    sim.alpha(0.9).restart();
  }

  function resize(){
    const canvasEl = container.querySelector('.keywords__canvas');
    const w = canvasEl.clientWidth;
    const h = window.innerHeight * 0.7;
    svg.attr('viewBox', [0, 0, w, h].join(' '));
    centerForce.x(w/2).y(h/2);
    sim.alpha(0.5).restart();
    rescaleForDrawer();
  }
  window.addEventListener('resize', resize);
  resize();

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
  resetBtn && resetBtn.addEventListener('click', ()=>{ filterInput && (filterInput.value=''); applyFilter(''); closeDrawer(); svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity); });

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
})();


