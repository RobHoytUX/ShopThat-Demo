/* Keywords Bubble Graph */
(function(){
  function $(sel, root=document){ return root.querySelector(sel); }

  const svg = d3.select('#bubbleGraph');
  const container = document.querySelector('.keywords');
  const drawer = document.querySelector('.drawer');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerBody = document.getElementById('drawerBody');
  const drawerClose = document.getElementById('drawerClose');
  const filterInput = document.getElementById('kwFilter');
  const resetBtn = document.getElementById('resetKw');
  const zoomIn = document.getElementById('zoomIn');
  const zoomOut = document.getElementById('zoomOut');
  const fitBtn = document.getElementById('fit');

  const width = () => svg.node().clientWidth;
  const height = () => svg.node().clientHeight;

  // Mock graph data
  const nodes = [
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
  const links = [
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

  const color = d3.scaleOrdinal([ '#6366F1', '#7C3AED', '#4F46E5', '#312E81' ]);
  const radius = d3.scaleSqrt().domain([10, 90]).range([16, 90]);

  const gLinks = svg.append('g').attr('stroke', '#d9d9ef').attr('stroke-width', 1.2);
  const gNodes = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.5, 2]).on('zoom', (ev)=>{
    gNodes.attr('transform', ev.transform);
    gLinks.attr('transform', ev.transform);
  });
  svg.call(zoom);

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(160).strength(0.08))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(0,0))
    .force('collision', d3.forceCollide().radius(d => radius(d.value)+4));

  function rescaleForDrawer(){
    const open = drawer.getAttribute('aria-hidden') === 'false';
    const w = width();
    const h = height();
    const leftPad = open ? 40 : 0;
    const scale = open ? 0.88 : 1; // shrink slightly when drawer open
    gNodes.attr('transform', `translate(${leftPad},0) scale(${scale})`);
    gLinks.attr('transform', `translate(${leftPad},0) scale(${scale})`);
    sim.alpha(0.6).restart();
  }

  function ticked(){
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  const link = gLinks.selectAll('line').data(links).join('line');

  const node = gNodes.selectAll('g.node').data(nodes).join(enter => {
    const g = enter.append('g').attr('class','node').style('cursor','pointer');
    g.append('circle')
      .attr('r', d => radius(d.value))
      .attr('fill', d => d3.color(color(d.group)).formatHex())
      .attr('opacity', .9);
    g.append('text')
      .attr('text-anchor','middle')
      .attr('dy','.35em')
      .attr('fill','#fff')
      .style('font-size','14px')
      .style('font-weight','700')
      .text(d => d.id.length > 14 ? d.id.slice(0,12)+'…' : d.id);
    return g;
  });

  node.on('click', (_, d) => openDrawer(d));

  sim.on('tick', ticked);

  function resize(){
    const w = container.querySelector('.keywords__canvas').clientWidth;
    const h = window.innerHeight * 0.7;
    svg.attr('viewBox', [-w/2, -h/2, w, h].join(' '));
    rescaleForDrawer();
  }
  window.addEventListener('resize', resize);
  resize();

  function openDrawer(d){
    drawerTitle.textContent = d.id;
    drawerBody.innerHTML = ''+
      `<div><strong>Volume:</strong> ${d.value}</div>`+
      `<div><strong>Connections:</strong> ${links.filter(l=>l.source.id===d.id||l.target.id===d.id).length}</div>`+
      `<div><strong>Description:</strong> Placeholder description about ${d.id} with sample insights.</div>`+
      `<hr /><div><strong>Related Keywords</strong></div>`+
      `${links.filter(l=>l.source.id===d.id||l.target.id===d.id).map(l=>`<span class="chip" style="margin:4px 6px 0 0">${l.source.id===d.id?l.target.id:l.source.id}</span>`).join('')}`;
    drawer.setAttribute('aria-hidden','false');
    container.classList.add('drawer-open');
    rescaleForDrawer();
  }
  function closeDrawer(){
    drawer.setAttribute('aria-hidden','true');
    container.classList.remove('drawer-open');
    rescaleForDrawer();
  }
  drawerClose.addEventListener('click', closeDrawer);

  // Filtering
  function applyFilter(term){
    const t = String(term||'').toLowerCase();
    node.style('opacity', d => d.id.toLowerCase().includes(t) ? 1 : 0.3);
    link.style('opacity', l => (l.source.id.toLowerCase().includes(t) || l.target.id.toLowerCase().includes(t)) ? 1 : 0.15);
  }
  filterInput && filterInput.addEventListener('input', (e)=> applyFilter(e.target.value));
  resetBtn && resetBtn.addEventListener('click', ()=>{ filterInput && (filterInput.value=''); applyFilter(''); closeDrawer(); svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity); });

  // Zoom controls
  zoomIn && zoomIn.addEventListener('click', ()=> svg.transition().duration(200).call(zoom.scaleBy, 1.2));
  zoomOut && zoomOut.addEventListener('click', ()=> svg.transition().duration(200).call(zoom.scaleBy, 0.8));
  fitBtn && fitBtn.addEventListener('click', ()=> svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity));
})();


