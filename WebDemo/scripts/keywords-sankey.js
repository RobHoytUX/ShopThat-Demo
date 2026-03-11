(function () {
  'use strict';

  var containerEl = document.getElementById('sankeyContainer');
  var drawerTitle = document.getElementById('sankeyDrawerTitle');
  var drawerBody = document.getElementById('sankeyDrawerBody');
  var initialized = false;

  var groupColorMap = {
    0: '#1e3a8a', 1: '#6366f1', 2: '#8b5cf6', 3: '#f59e0b', 4: '#10b981'
  };
  var groupLabels = {
    0: 'Root', 1: 'Primary', 2: 'Connected', 3: 'Secondary', 4: 'Tertiary'
  };

  var fullTree = null;
  var expandedIds = new Set();
  var svg, gContainer, zoomBehavior;

  function buildTree() {
    var nodes = window.kwGetNodes ? window.kwGetNodes() : [];
    var links = window.kwGetLinks ? window.kwGetLinks() : [];
    if (nodes.length === 0) return null;

    var childMap = {};
    links.forEach(function (link) {
      var src = typeof link.source === 'object' ? link.source.id : link.source;
      var tgt = typeof link.target === 'object' ? link.target.id : link.target;
      if (!childMap[src]) childMap[src] = [];
      childMap[src].push(tgt);
    });

    var claimed = new Set();
    function walk(id, depth) {
      if (claimed.has(id) || depth > 5) return null;
      claimed.add(id);
      var node = nodes.find(function (n) { return n.id === id; });
      var kids = (childMap[id] || []).map(function (cid) { return walk(cid, depth + 1); }).filter(Boolean);
      return { id: id, group: node ? node.group : 4, value: node ? node.value : 50, children: kids };
    }

    return walk('LVMH', 0);
  }

  function findNode(node, id) {
    if (!node) return null;
    if (node.id === id) return node;
    for (var i = 0; node.children && i < node.children.length; i++) {
      var f = findNode(node.children[i], id);
      if (f) return f;
    }
    return null;
  }

  function hasChildren(id) {
    var n = findNode(fullTree, id);
    return n && n.children && n.children.length > 0;
  }

  function getVisibleData() {
    if (!fullTree) return { nodes: [], links: [] };
    var sNodes = [];
    var sLinks = [];
    var seen = new Set();

    function collect(node) {
      if (!node || seen.has(node.id)) return;
      seen.add(node.id);
      sNodes.push({ id: node.id, group: node.group });

      if (expandedIds.has(node.id) && node.children) {
        node.children.forEach(function (child) {
          if (!seen.has(child.id)) {
            sLinks.push({ source: node.id, target: child.id, value: 1 });
          }
          collect(child);
        });
      }
    }

    collect(fullTree);
    return { nodes: sNodes, links: sLinks };
  }

  function render() {
    if (!containerEl || !fullTree) return;
    if (gContainer) gContainer.remove();

    var data = getVisibleData();
    var rect = containerEl.getBoundingClientRect();
    var width = rect.width || 900;
    var height = Math.max(rect.height || 500, data.nodes.length * 28, 300);
    var margin = { top: 16, right: 180, bottom: 16, left: 16 };
    var innerW = width - margin.left - margin.right;
    var innerH = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);
    gContainer = svg.append('g');
    var g = gContainer.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    if (data.nodes.length === 0) return;

    var nodeIndex = {};
    data.nodes.forEach(function (n, i) { nodeIndex[n.id] = i; });

    var input = {
      nodes: data.nodes.map(function (n) { return { name: n.id, group: n.group }; }),
      links: data.links.map(function (l) {
        return { source: nodeIndex[l.source], target: nodeIndex[l.target], value: l.value };
      }).filter(function (l) { return l.source !== undefined && l.target !== undefined && l.source !== l.target; })
    };

    var sankey = d3.sankey()
      .nodeId(function (d) { return d.index; })
      .nodeWidth(18)
      .nodePadding(14)
      .nodeAlign(d3.sankeyLeft)
      .extent([[0, 0], [innerW, innerH]]);

    var graph;
    try { graph = sankey(input); } catch (e) { console.error('Sankey error:', e); return; }

    // Links
    var allLinks = g.append('g').selectAll('path')
      .data(graph.links).enter().append('path')
      .attr('class', 'sankey-link')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke-width', function (d) { return Math.max(1, d.width); })
      .attr('stroke', function (d) { return groupColorMap[d.source.group] || '#6366f1'; })
      .attr('stroke-opacity', 0).attr('fill', 'none');

    allLinks.transition().duration(400).attr('stroke-opacity', 0.25);

    // Nodes
    var allNodeGs = g.append('g').selectAll('g')
      .data(graph.nodes).enter().append('g')
      .attr('class', 'sankey-node')
      .style('cursor', function (d) { return hasChildren(d.name) && !expandedIds.has(d.name) ? 'pointer' : 'default'; });

    allNodeGs.append('rect')
      .attr('x', function (d) { return d.x0; })
      .attr('y', function (d) { return d.y0; })
      .attr('height', function (d) { return Math.max(d.y1 - d.y0, 2); })
      .attr('width', sankey.nodeWidth())
      .attr('fill', function (d) { return groupColorMap[d.group] || '#6366f1'; })
      .attr('rx', 3).attr('opacity', 0)
      .transition().duration(400).attr('opacity', 0.85);

    allNodeGs.append('text')
      .attr('x', function (d) { return d.x1 + 6; })
      .attr('y', function (d) { return (d.y0 + d.y1) / 2; })
      .attr('dy', '0.35em').attr('text-anchor', 'start')
      .attr('class', 'sankey-label')
      .text(function (d) {
        var expandable = hasChildren(d.name) && !expandedIds.has(d.name);
        return d.name + (expandable ? ' ▸' : '');
      })
      .attr('opacity', 0).transition().duration(400).attr('opacity', 1);

    // Hover
    function connLinkIdx(idx) {
      var s = new Set();
      graph.links.forEach(function (l, i) { if (l.source.index === idx || l.target.index === idx) s.add(i); });
      return s;
    }
    function connNodeIdx(idx) {
      var s = new Set(); s.add(idx);
      graph.links.forEach(function (l) {
        if (l.source.index === idx) s.add(l.target.index);
        if (l.target.index === idx) s.add(l.source.index);
      });
      return s;
    }

    allNodeGs.on('mouseover', function (ev, d) {
      var cl = connLinkIdx(d.index), cn = connNodeIdx(d.index);
      allLinks.attr('stroke-opacity', function (l, i) { return cl.has(i) ? 0.7 : 0.04; });
      allNodeGs.select('rect').attr('opacity', function (n) { return cn.has(n.index) ? 1 : 0.15; });
      allNodeGs.select('text').attr('opacity', function (n) { return cn.has(n.index) ? 1 : 0.2; });
    }).on('mouseout', function () {
      allLinks.attr('stroke-opacity', 0.25);
      allNodeGs.select('rect').attr('opacity', 0.85);
      allNodeGs.select('text').attr('opacity', 1);
    }).on('click', function (ev, d) {
      if (hasChildren(d.name) && !expandedIds.has(d.name)) {
        expandedIds.add(d.name);
        render();
      }
      showNodeDetails(d);
    });

    allLinks.on('mouseover', function (ev, d) {
      allLinks.attr('stroke-opacity', 0.06);
      d3.select(this).attr('stroke-opacity', 0.8);
      allNodeGs.select('rect').attr('opacity', 0.15);
      allNodeGs.select('text').attr('opacity', 0.2);
      [d.source.index, d.target.index].forEach(function (idx) {
        allNodeGs.filter(function (n) { return n.index === idx; }).select('rect').attr('opacity', 1);
        allNodeGs.filter(function (n) { return n.index === idx; }).select('text').attr('opacity', 1);
      });
    }).on('mouseout', function () {
      allLinks.attr('stroke-opacity', 0.25);
      allNodeGs.select('rect').attr('opacity', 0.85);
      allNodeGs.select('text').attr('opacity', 1);
    }).on('click', function (ev, d) { showFlowDetails(d); });

    if (zoomBehavior) svg.call(zoomBehavior);
  }

  function showNodeDetails(d) {
    if (drawerTitle) drawerTitle.textContent = d.name;
    if (!drawerBody) return;
    var out = (d.sourceLinks || []).map(function (l) { return l.target.name; });
    var inc = (d.targetLinks || []).map(function (l) { return l.source.name; });
    var articles = window.kwGetArticlesHTML ? window.kwGetArticlesHTML(d.name) : '';
    var expandable = hasChildren(d.name) && !expandedIds.has(d.name);
    var html = '<div class="sidebar-stat"><span class="sidebar-stat-value">' + (groupLabels[d.group] || 'Other') + '</span><span class="sidebar-stat-label">group</span></div>';
    html += '<div class="sidebar-stat"><span class="sidebar-stat-value">' + (out.length + inc.length) + '</span><span class="sidebar-stat-label">visible connections</span></div>';
    if (expandable) html += '<p style="font-size:12px;color:#6b7280;margin:8px 0;">Click node to reveal connections</p>';
    if (out.length) html += '<div class="sidebar-connections"><h3>Flows To</h3>' + out.map(function (n) { return '<span class="sidebar-connection-tag">' + n + '</span>'; }).join('') + '</div>';
    if (inc.length) html += '<div class="sidebar-connections"><h3>Flows From</h3>' + inc.map(function (n) { return '<span class="sidebar-connection-tag">' + n + '</span>'; }).join('') + '</div>';
    html += '<div class="sidebar-articles"><h3>Related Articles</h3>' + articles + '</div>';
    drawerBody.innerHTML = html;
  }

  function showFlowDetails(d) {
    if (drawerTitle) drawerTitle.textContent = d.source.name + ' → ' + d.target.name;
    if (!drawerBody) return;
    drawerBody.innerHTML =
      '<div class="sidebar-stat"><span class="sidebar-stat-value">' + d.source.name + '</span><span class="sidebar-stat-label">source</span></div>' +
      '<div class="sidebar-stat"><span class="sidebar-stat-value">' + d.target.name + '</span><span class="sidebar-stat-label">target</span></div>';
  }

  window.kwShowSankeyTab = function () {
    if (!initialized) {
      setTimeout(function () {
        fullTree = buildTree();
        if (!fullTree) { containerEl.innerHTML = '<p style="color:#6b7280;padding:2rem;">No data.</p>'; return; }
        expandedIds.clear();
        expandedIds.add('LVMH');
        containerEl.innerHTML = '';
        var rect = containerEl.getBoundingClientRect();
        svg = d3.select(containerEl).append('svg').attr('width', rect.width || 900).attr('height', rect.height || 500);
        zoomBehavior = d3.zoom().scaleExtent([0.3, 4]).on('zoom', function (ev) { if (gContainer) gContainer.attr('transform', ev.transform); });
        svg.call(zoomBehavior);
        render();
        initialized = true;
      }, 50);
    } else {
      var rect = containerEl.getBoundingClientRect();
      if (rect.width > 0 && svg) svg.attr('width', rect.width);
    }
  };
})();
