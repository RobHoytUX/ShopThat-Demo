(function () {
  'use strict';

  var containerEl = document.getElementById('sankeyContainer');
  var drawerTitle = document.getElementById('sankeyDrawerTitle');
  var drawerBody = document.getElementById('sankeyDrawerBody');
  var initialized = false;

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
      return {
        id: id,
        group: node ? node.group : 4,
        value: node ? node.value : 50,
        children: kids
      };
    }

    var tree = walk('LVMH', 0);

    var unclaimed = nodes.filter(function (n) { return !claimed.has(n.id); });
    if (unclaimed.length > 0 && tree) {
      tree.children.push({
        id: 'Other',
        group: 4,
        value: 40,
        children: unclaimed.map(function (n) { return { id: n.id, group: n.group, value: n.value, children: [] }; })
      });
    }

    return tree;
  }

  function getVisibleData() {
    if (!fullTree) return { nodes: [], links: [] };

    var sankeyNodes = [];
    var sankeyLinks = [];
    var seen = new Set();

    function collect(node) {
      if (seen.has(node.id)) return;
      seen.add(node.id);
      sankeyNodes.push({ id: node.id, group: node.group });

      if (expandedIds.has(node.id) && node.children && node.children.length > 0) {
        node.children.forEach(function (child) {
          if (!seen.has(child.id)) {
            sankeyLinks.push({
              source: node.id,
              target: child.id,
              value: Math.max(child.value / 10, 3)
            });
          }
          collect(child);
        });
      }
    }

    collect(fullTree);
    return { nodes: sankeyNodes, links: sankeyLinks };
  }

  function findTreeNode(node, id) {
    if (node.id === id) return node;
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        var found = findTreeNode(node.children[i], id);
        if (found) return found;
      }
    }
    return null;
  }

  function hasChildren(id) {
    if (!fullTree) return false;
    var node = findTreeNode(fullTree, id);
    return node && node.children && node.children.length > 0;
  }

  function renderSankey() {
    if (!containerEl || !fullTree) return;

    var data = getVisibleData();

    // Clear previous
    if (gContainer) gContainer.remove();

    var rect = containerEl.getBoundingClientRect();
    var width = rect.width || 900;
    var nodeCount = data.nodes.length;
    var height = Math.max(rect.height || 500, nodeCount * 28, 300);
    var margin = { top: 16, right: 180, bottom: 16, left: 16 };
    var innerW = width - margin.left - margin.right;
    var innerH = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    gContainer = svg.append('g');

    var g = gContainer.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    if (data.nodes.length === 0) return;

    // Build index
    var nodeIndex = {};
    data.nodes.forEach(function (n, i) { nodeIndex[n.id] = i; });

    var sankeyInput = {
      nodes: data.nodes.map(function (n) { return { name: n.id, group: n.group }; }),
      links: data.links.map(function (l) {
        return { source: nodeIndex[l.source], target: nodeIndex[l.target], value: l.value };
      }).filter(function (l) { return l.source !== undefined && l.target !== undefined && l.source !== l.target; })
    };

    var sankey = d3.sankey()
      .nodeId(function (d) { return d.index; })
      .nodeWidth(18)
      .nodePadding(16)
      .nodeAlign(d3.sankeyLeft)
      .extent([[0, 0], [innerW, innerH]]);

    var graph;
    try {
      graph = sankey(sankeyInput);
    } catch (e) {
      console.error('Sankey layout error:', e);
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
      .attr('stroke', function (d) { return groupColorMap[d.source.group] || '#6366f1'; })
      .attr('stroke-opacity', 0)
      .attr('fill', 'none');

    allLinks.transition().duration(400)
      .attr('stroke-opacity', 0.25);

    // Nodes
    var allNodeGroups = g.append('g')
      .selectAll('g')
      .data(graph.nodes)
      .enter().append('g')
      .attr('class', 'sankey-node')
      .style('cursor', function (d) { return hasChildren(d.name) ? 'pointer' : 'default'; });

    allNodeGroups.append('rect')
      .attr('x', function (d) { return d.x0; })
      .attr('y', function (d) { return d.y0; })
      .attr('height', function (d) { return Math.max(d.y1 - d.y0, 2); })
      .attr('width', sankey.nodeWidth())
      .attr('fill', function (d) { return groupColorMap[d.group] || '#6366f1'; })
      .attr('rx', 3)
      .attr('opacity', 0)
      .transition().duration(400)
      .attr('opacity', 0.85);

    allNodeGroups.append('text')
      .attr('x', function (d) { return d.x1 + 6; })
      .attr('y', function (d) { return (d.y0 + d.y1) / 2; })
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .attr('class', 'sankey-label')
      .text(function (d) {
        var expanded = expandedIds.has(d.name);
        var canExpand = hasChildren(d.name);
        var indicator = canExpand ? (expanded ? ' ▾' : ' ▸') : '';
        return d.name + indicator;
      })
      .attr('opacity', 0)
      .transition().duration(400)
      .attr('opacity', 1);

    // Hover highlight
    function getConnectedLinkIndices(idx) {
      var set = new Set();
      graph.links.forEach(function (l, i) {
        if (l.source.index === idx || l.target.index === idx) set.add(i);
      });
      return set;
    }

    function getConnectedNodeIndices(idx) {
      var set = new Set();
      set.add(idx);
      graph.links.forEach(function (l) {
        if (l.source.index === idx) set.add(l.target.index);
        if (l.target.index === idx) set.add(l.source.index);
      });
      return set;
    }

    allNodeGroups
      .on('mouseover', function (event, d) {
        var cl = getConnectedLinkIndices(d.index);
        var cn = getConnectedNodeIndices(d.index);
        allLinks.attr('stroke-opacity', function (l, i) { return cl.has(i) ? 0.7 : 0.04; });
        allNodeGroups.select('rect').attr('opacity', function (n) { return cn.has(n.index) ? 1 : 0.15; });
        allNodeGroups.select('text').attr('opacity', function (n) { return cn.has(n.index) ? 1 : 0.2; });
      })
      .on('mouseout', function () {
        allLinks.attr('stroke-opacity', 0.25);
        allNodeGroups.select('rect').attr('opacity', 0.85);
        allNodeGroups.select('text').attr('opacity', 1);
      })
      .on('click', function (event, d) {
        if (hasChildren(d.name)) {
          if (expandedIds.has(d.name)) {
            collapseNode(d.name);
          } else {
            expandedIds.add(d.name);
          }
          renderSankey();
        }
        showNodeDetails(d);
      });

    allLinks
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

    if (zoomBehavior) svg.call(zoomBehavior);
  }

  function collapseNode(id) {
    expandedIds.delete(id);
    if (!fullTree) return;
    var node = findTreeNode(fullTree, id);
    if (node && node.children) {
      node.children.forEach(function (c) { collapseNode(c.id); });
    }
  }

  function initSankey() {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    fullTree = buildTree();
    if (!fullTree) {
      containerEl.innerHTML = '<p style="color:#6b7280;padding:2rem;">No keyword data available.</p>';
      return;
    }

    expandedIds.clear();
    expandedIds.add('LVMH');

    var rect = containerEl.getBoundingClientRect();
    svg = d3.select(containerEl).append('svg')
      .attr('width', rect.width || 900)
      .attr('height', rect.height || 500);

    zoomBehavior = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', function (event) {
        if (gContainer) gContainer.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    renderSankey();
    initialized = true;
  }

  function showNodeDetails(d) {
    if (drawerTitle) drawerTitle.textContent = d.name;
    if (!drawerBody) return;

    var sourceLinks = d.sourceLinks || [];
    var targetLinks = d.targetLinks || [];
    var outgoing = sourceLinks.map(function (l) { return l.target.name; });
    var incoming = targetLinks.map(function (l) { return l.source.name; });
    var articlesHTML = window.kwGetArticlesHTML ? window.kwGetArticlesHTML(d.name) : '';
    var canExpand = hasChildren(d.name);
    var isExpanded = expandedIds.has(d.name);

    var html = '<div class="sidebar-stat"><span class="sidebar-stat-value">' + (groupLabels[d.group] || 'Other') + '</span><span class="sidebar-stat-label">group</span></div>';
    html += '<div class="sidebar-stat"><span class="sidebar-stat-value">' + (outgoing.length + incoming.length) + '</span><span class="sidebar-stat-label">visible connections</span></div>';

    if (canExpand) {
      html += '<p style="font-size:12px;color:#6b7280;margin:8px 0;">' + (isExpanded ? 'Click node to collapse' : 'Click node to reveal connections') + '</p>';
    }

    if (outgoing.length > 0) {
      html += '<div class="sidebar-connections"><h3>Flows To</h3>' + outgoing.map(function (n) { return '<span class="sidebar-connection-tag">' + n + '</span>'; }).join('') + '</div>';
    }
    if (incoming.length > 0) {
      html += '<div class="sidebar-connections"><h3>Flows From</h3>' + incoming.map(function (n) { return '<span class="sidebar-connection-tag">' + n + '</span>'; }).join('') + '</div>';
    }

    html += '<div class="sidebar-articles"><h3>Related Articles</h3>' + articlesHTML + '</div>';
    drawerBody.innerHTML = html;
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
      if (rect.width > 0 && svg) {
        svg.attr('width', rect.width);
      }
    }
  };
})();
