(function () {
  'use strict';

  var containerEl = document.getElementById('sankeyContainer');
  var drawerTitle = document.getElementById('sankeyDrawerTitle');
  var drawerBody = document.getElementById('sankeyDrawerBody');
  var initialized = false;
  var sankeyLinkSel = null;
  var sankeyNodeSel = null;

  var groupColorMap = {
    0: '#1e3a8a',
    1: '#6366f1',
    2: '#8b5cf6',
    3: '#f59e0b',
    4: '#10b981'
  };

  var groupLabels = {
    0: 'Root',
    1: 'Primary',
    2: 'Connected',
    3: 'Secondary',
    4: 'Tertiary'
  };

  function buildSankeyData() {
    var nodes = window.kwGetNodes ? window.kwGetNodes() : [];
    var links = window.kwGetLinks ? window.kwGetLinks() : [];
    if (nodes.length === 0) return null;

    // Build adjacency from links
    var childMap = {};
    links.forEach(function (link) {
      var src = typeof link.source === 'object' ? link.source.id : link.source;
      var tgt = typeof link.target === 'object' ? link.target.id : link.target;
      if (!childMap[src]) childMap[src] = [];
      childMap[src].push(tgt);
    });

    // Build tree to get parent-child relationships (no cycles)
    var claimed = new Set();
    var sankeyLinks = [];

    function walk(id, depth) {
      if (claimed.has(id) || depth > 4) return;
      claimed.add(id);
      var kids = childMap[id] || [];
      kids.forEach(function (cid) {
        if (!claimed.has(cid)) {
          var childNode = nodes.find(function (n) { return n.id === cid; });
          sankeyLinks.push({
            source: id,
            target: cid,
            value: childNode ? Math.max(childNode.value / 10, 3) : 5
          });
          walk(cid, depth + 1);
        }
      });
    }

    walk('LVMH', 0);

    // Collect used node ids
    var usedIds = new Set();
    sankeyLinks.forEach(function (l) {
      usedIds.add(l.source);
      usedIds.add(l.target);
    });

    var sankeyNodes = [];
    usedIds.forEach(function (id) {
      var n = nodes.find(function (nd) { return nd.id === id; });
      sankeyNodes.push({ id: id, group: n ? n.group : 4 });
    });

    return { nodes: sankeyNodes, links: sankeyLinks };
  }

  function initSankey() {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    var data = buildSankeyData();
    if (!data || data.nodes.length === 0) {
      containerEl.innerHTML = '<p style="color:#6b7280;padding:2rem;">No keyword data available.</p>';
      return;
    }

    var rect = containerEl.getBoundingClientRect();
    var width = rect.width || 900;
    var height = Math.max(rect.height || 700, data.nodes.length * 6);
    var margin = { top: 16, right: 160, bottom: 16, left: 16 };

    var svg = d3.select(containerEl).append('svg')
      .attr('width', width)
      .attr('height', height);

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var innerW = width - margin.left - margin.right;
    var innerH = height - margin.top - margin.bottom;

    // Node index map
    var nodeIndex = {};
    data.nodes.forEach(function (n, i) { nodeIndex[n.id] = i; });

    var sankeyData = {
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
    try {
      graph = sankey(sankeyData);
    } catch (e) {
      containerEl.innerHTML = '<p style="color:#6b7280;padding:2rem;">Could not generate Sankey layout.</p>';
      console.error('Sankey error:', e);
      return;
    }

    // Links
    var allLinks = g.append('g')
      .selectAll('path')
      .data(graph.links)
      .enter().append('path')
      .attr('class', 'sankey-link')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke-width', function (d) { return Math.max(1, d.width); })
      .attr('stroke', function (d) {
        return groupColorMap[d.source.group] || '#6366f1';
      })
      .attr('stroke-opacity', 0.25)
      .attr('fill', 'none')
      .on('mouseover', function (event, d) {
        allLinks.attr('stroke-opacity', 0.06);
        d3.select(this).attr('stroke-opacity', 0.8);
        allNodeGroups.select('rect').attr('opacity', 0.15);
        allNodeGroups.select('text').attr('opacity', 0.2);
        allNodeGroups.filter(function (n) { return n.index === d.source.index || n.index === d.target.index; })
          .select('rect').attr('opacity', 1);
        allNodeGroups.filter(function (n) { return n.index === d.source.index || n.index === d.target.index; })
          .select('text').attr('opacity', 1);
      })
      .on('mouseout', function () {
        allLinks.attr('stroke-opacity', 0.25);
        allNodeGroups.select('rect').attr('opacity', 0.85);
        allNodeGroups.select('text').attr('opacity', 1);
      })
      .on('click', function (event, d) {
        showFlowDetails(d);
      });

    function getConnectedLinkIndices(nodeIndex) {
      var set = new Set();
      graph.links.forEach(function (l, i) {
        if (l.source.index === nodeIndex || l.target.index === nodeIndex) set.add(i);
      });
      return set;
    }

    function getConnectedNodeIndices(nodeIndex) {
      var set = new Set();
      set.add(nodeIndex);
      graph.links.forEach(function (l) {
        if (l.source.index === nodeIndex) set.add(l.target.index);
        if (l.target.index === nodeIndex) set.add(l.source.index);
      });
      return set;
    }

    // Nodes
    var allNodeGroups = g.append('g')
      .selectAll('g')
      .data(graph.nodes)
      .enter().append('g')
      .attr('class', 'sankey-node')
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        var connLinks = getConnectedLinkIndices(d.index);
        var connNodes = getConnectedNodeIndices(d.index);

        allLinks.attr('stroke-opacity', function (l, i) {
          return connLinks.has(i) ? 0.7 : 0.04;
        });
        allNodeGroups.select('rect').attr('opacity', function (n) {
          return connNodes.has(n.index) ? 1 : 0.15;
        });
        allNodeGroups.select('text').attr('opacity', function (n) {
          return connNodes.has(n.index) ? 1 : 0.2;
        });
      })
      .on('mouseout', function () {
        allLinks.attr('stroke-opacity', 0.25);
        allNodeGroups.select('rect').attr('opacity', 0.85);
        allNodeGroups.select('text').attr('opacity', 1);
      })
      .on('click', function (event, d) {
        showNodeDetails(d, data.nodes);
      });

    allNodeGroups.append('rect')
      .attr('x', function (d) { return d.x0; })
      .attr('y', function (d) { return d.y0; })
      .attr('height', function (d) { return Math.max(d.y1 - d.y0, 2); })
      .attr('width', sankey.nodeWidth())
      .attr('fill', function (d) { return groupColorMap[d.group] || '#6366f1'; })
      .attr('rx', 3)
      .attr('opacity', 0.85);

    allNodeGroups.append('text')
      .attr('x', function (d) { return d.x1 + 6; })
      .attr('y', function (d) { return (d.y0 + d.y1) / 2; })
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .attr('class', 'sankey-label')
      .text(function (d) { return d.name; });

    // Zoom/pan
    var zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', function (event) {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    sankeyLinkSel = allLinks;
    sankeyNodeSel = allNodeGroups;

    initialized = true;
  }

  window.kwSankeySearch = function (raw) {
    if (!sankeyLinkSel || !sankeyNodeSel || sankeyLinkSel.empty()) return;
    var q = (raw || '').trim();
    var ids = q && window.kwNeighborhoodIdsForSearch ? window.kwNeighborhoodIdsForSearch(q) : null;
    if (!q) {
      sankeyLinkSel.interrupt('kwsearch');
      sankeyNodeSel.interrupt('kwsearch');
      sankeyLinkSel.transition('kwsearch').duration(150).attr('stroke-opacity', 0.25);
      sankeyNodeSel.select('rect').transition('kwsearch').duration(150).attr('opacity', 0.85);
      sankeyNodeSel.select('text').transition('kwsearch').duration(150).attr('opacity', 1);
      sankeyNodeSel.style('pointer-events', null);
      return;
    }
    if (!ids || ids.size === 0) {
      sankeyLinkSel.transition('kwsearch').duration(150).attr('stroke-opacity', 0.04);
      sankeyNodeSel.select('rect').transition('kwsearch').duration(150).attr('opacity', 0.08);
      sankeyNodeSel.select('text').transition('kwsearch').duration(150).attr('opacity', 0.12);
      sankeyNodeSel.style('pointer-events', 'none');
      return;
    }
    sankeyLinkSel.transition('kwsearch').duration(150)
      .attr('stroke-opacity', function (d) {
        return ids.has(d.source.name) && ids.has(d.target.name) ? 0.55 : 0.04;
      });
    sankeyNodeSel.select('rect').transition('kwsearch').duration(150)
      .attr('opacity', function (d) { return ids.has(d.name) ? 0.9 : 0.1; });
    sankeyNodeSel.select('text').transition('kwsearch').duration(150)
      .attr('opacity', function (d) { return ids.has(d.name) ? 1 : 0.15; });
    sankeyNodeSel.style('pointer-events', function (d) {
      return ids.has(d.name) ? 'auto' : 'none';
    });
  };

  function showNodeDetails(d, allDataNodes) {
    if (drawerTitle) drawerTitle.textContent = d.name;
    if (!drawerBody) return;

    var sourceLinks = d.sourceLinks || [];
    var targetLinks = d.targetLinks || [];
    var outgoing = sourceLinks.map(function (l) { return l.target.name; });
    var incoming = targetLinks.map(function (l) { return l.source.name; });

    var html = '<div class="sidebar-stat"><span class="sidebar-stat-value">' + (groupLabels[d.group] || 'Other') + '</span><span class="sidebar-stat-label">group</span></div>';
    html += '<div class="sidebar-stat"><span class="sidebar-stat-value">' + (outgoing.length + incoming.length) + '</span><span class="sidebar-stat-label">connections</span></div>';

    if (outgoing.length > 0) {
      html += '<div class="sidebar-connections"><h3>Flows To</h3>' + outgoing.map(function (n) { return '<span class="sidebar-connection-tag">' + n + '</span>'; }).join('') + '</div>';
    }
    if (incoming.length > 0) {
      html += '<div class="sidebar-connections"><h3>Flows From</h3>' + incoming.map(function (n) { return '<span class="sidebar-connection-tag">' + n + '</span>'; }).join('') + '</div>';
    }

    html += '<div class="sidebar-articles"><h3>Related Articles</h3><div class="kw-related-articles-mount"></div></div>';
    drawerBody.innerHTML = html;
    if (window.kwHydrateRelatedArticles) {
      window.kwHydrateRelatedArticles(d.name, drawerBody);
    }
  }

  function showFlowDetails(d) {
    if (drawerTitle) drawerTitle.textContent = d.source.name + ' → ' + d.target.name;
    if (!drawerBody) return;

    drawerBody.innerHTML =
      '<div class="sidebar-stat"><span class="sidebar-stat-value">' + d.source.name + '</span><span class="sidebar-stat-label">source</span></div>' +
      '<div class="sidebar-stat"><span class="sidebar-stat-value">' + d.target.name + '</span><span class="sidebar-stat-label">target</span></div>' +
      '<div class="sidebar-stat"><span class="sidebar-stat-value">' + Math.round(d.value) + '</span><span class="sidebar-stat-label">flow weight</span></div>';
  }

  window.kwShowSankeyTab = function () {
    if (!initialized) {
      setTimeout(initSankey, 50);
    } else {
      var rect = containerEl.getBoundingClientRect();
      if (rect.width > 0) {
        var svg = containerEl.querySelector('svg');
        if (svg) {
          svg.setAttribute('width', rect.width);
        }
      }
    }
  };

  window.addEventListener('kw-data-updated', function () {
    initialized = false;
    var tab = document.getElementById('kw-sankey-tab');
    if (tab && tab.style.display !== 'none') {
      setTimeout(initSankey, 50);
    }
  });
})();
