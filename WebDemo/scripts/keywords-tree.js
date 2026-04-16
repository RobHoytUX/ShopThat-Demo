(function () {
  'use strict';

  var containerEl = document.getElementById('treeContainer');
  var searchInput = document.getElementById('treeSearch');
  var expandAllBtn = document.getElementById('treeExpandAll');
  var collapseAllBtn = document.getElementById('treeCollapseAll');
  var clearSelectionBtn = document.getElementById('treeClearSelection');
  var visibleCountEl = document.getElementById('treeVisibleCount');
  var selectedCountEl = document.getElementById('treeSelectedCount');
  var drawerTitleEl = document.getElementById('treeDrawerTitle');
  var drawerBodyEl = document.getElementById('treeDrawerBody');

  var selectedKeywords = new Set();
  var root = null;
  var treeSvg = null;
  var treeG = null;
  var treeLayout = null;
  var zoomBehavior = null;
  var initialized = false;
  var duration = 400;
  var nodeIdCounter = 0;

  var groupColorMap = {
    0: '#1e3a8a',
    1: '#6366f1',
    2: '#8b5cf6',
    3: '#f59e0b',
    4: '#10b981'
  };

  function buildHierarchy() {
    var nodes = window.kwGetNodes ? window.kwGetNodes() : [];
    var links = window.kwGetLinks ? window.kwGetLinks() : [];
    if (nodes.length === 0) return null;

    var adjacency = {};
    links.forEach(function (link) {
      var src = typeof link.source === 'object' ? link.source.id : link.source;
      var tgt = typeof link.target === 'object' ? link.target.id : link.target;
      if (!adjacency[src]) adjacency[src] = [];
      if (!adjacency[tgt]) adjacency[tgt] = [];
      adjacency[src].push(tgt);
      adjacency[tgt].push(src);
    });

    function neighborsOf(id) {
      var seen = {};
      var out = [];
      (adjacency[id] || []).forEach(function (nid) {
        if (!seen[nid]) { seen[nid] = true; out.push(nid); }
      });
      return out;
    }

    function sortByValue(ids) {
      return ids.slice().sort(function (a, b) {
        var na = nodes.find(function (n) { return n.id === a; });
        var nb = nodes.find(function (n) { return n.id === b; });
        return ((nb ? nb.value : 0) - (na ? na.value : 0));
      });
    }

    function nodeData(id) {
      var n = nodes.find(function (nd) { return nd.id === id; });
      return { group: n ? n.group : 4, value: n ? n.value : 50 };
    }

    var areaIds = nodes.filter(function (n) { return n.isArea; }).map(function (n) { return n.id; });
    var rootNeighbors = neighborsOf('LVMH');
    if (areaIds.length === 0) {
      areaIds = rootNeighbors.slice();
    }
    var areaSet = {};
    areaIds.forEach(function (id) { areaSet[id] = true; });

    var areaChildren = [];
    var globalClaimed = { 'LVMH': true };
    areaIds.forEach(function (id) { globalClaimed[id] = true; });

    areaIds.forEach(function (areaId) {
      var kwIds = sortByValue(
        neighborsOf(areaId).filter(function (nid) { return nid !== 'LVMH' && !areaSet[nid]; })
      );

      var kids = [];
      kwIds.forEach(function (kwId) {
        if (globalClaimed[kwId]) return;
        globalClaimed[kwId] = true;
        var d = nodeData(kwId);
        kids.push({ name: kwId, group: d.group, value: d.value });
      });

      var ad = nodeData(areaId);
      areaChildren.push({
        name: areaId,
        group: ad.group,
        value: ad.value,
        children: kids.length > 0 ? kids : undefined
      });
    });

    var rd = nodeData('LVMH');
    return {
      name: 'Louis Vuitton',
      group: rd.group,
      value: rd.value,
      children: areaChildren.length > 0 ? areaChildren : undefined
    };
  }

  function initTree() {
    if (!containerEl) return;

    var data = buildHierarchy();
    if (!data) {
      containerEl.innerHTML = '<p style="color:#6b7280;padding:2rem;">No keyword data available.</p>';
      return;
    }

    containerEl.innerHTML = '';

    var rect = containerEl.getBoundingClientRect();
    var w = rect.width || 800;
    var h = rect.height || 600;

    treeSvg = d3.select(containerEl).append('svg')
      .attr('width', w)
      .attr('height', h);

    treeG = treeSvg.append('g')
      .attr('transform', 'translate(80,0)');

    zoomBehavior = d3.zoom()
      .scaleExtent([0.2, 3])
      .on('zoom', function (event) {
        treeG.attr('transform', event.transform);
      });

    treeSvg.call(zoomBehavior);
    treeSvg.call(zoomBehavior.transform, d3.zoomIdentity.translate(80, h / 2).scale(0.85));

    treeLayout = d3.tree().nodeSize([38, 240]).separation(function (a, b) { return a.parent === b.parent ? 1 : 1.6; });

    root = d3.hierarchy(data);
    root.x0 = 0;
    root.y0 = 0;

    // Collapse all except first two levels
    if (root.children) {
      root.children.forEach(function (child) {
        if (child.children) {
          child.children.forEach(collapse);
        }
      });
    }

    update(root);
    initialized = true;
  }

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
      d._children.forEach(collapse);
    }
  }

  function expandNode(d) {
    if (d._children) {
      d.children = d._children;
      d._children = null;
    }
  }

  function expandAll(d) {
    if (d._children) {
      d.children = d._children;
      d._children = null;
    }
    if (d.children) d.children.forEach(expandAll);
  }

  function collapseAllExceptRoot(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
      d._children.forEach(function (c) { collapseAllExceptRoot(c); });
    }
  }

  function diagonal(s, d) {
    return 'M ' + s.y + ' ' + s.x +
      ' C ' + ((s.y + d.y) / 2) + ' ' + s.x + ',' +
      ((s.y + d.y) / 2) + ' ' + d.x + ',' +
      d.y + ' ' + d.x;
  }

  function update(source) {
    var treeData = treeLayout(root);
    var treeNodes = treeData.descendants();
    var treeLinks = treeData.links();

    // Fixed horizontal spacing
    treeNodes.forEach(function (d) { d.y = d.depth * 200; });

    // ─── NODES ───
    var node = treeG.selectAll('g.node')
      .data(treeNodes, function (d) { return d.id || (d.id = ++nodeIdCounter); });

    var nodeEnter = node.enter().append('g')
      .attr('class', function (d) {
        return 'node' + (selectedKeywords.has(d.data.name) ? ' is-selected' : '');
      })
      .attr('transform', function () {
        return 'translate(' + source.y0 + ',' + source.x0 + ')';
      })
      .on('click', function (event, d) {
        if (d._children) {
          d.children = d._children;
          d._children = null;
          update(d);
        }
        showNodeDetails(d);
      });

    nodeEnter.append('circle')
      .attr('r', 1e-6)
      .style('fill', function (d) {
        return d._children ? (groupColorMap[d.data.group] || '#6366f1') : '#fff';
      })
      .style('stroke', function (d) {
        return groupColorMap[d.data.group] || '#6366f1';
      });

    // +/- indicator
    nodeEnter.append('text')
      .attr('class', 'toggle-icon')
      .attr('dy', '0.1em')
      .text(function (d) {
        return d._children ? '+' : (d.children ? '−' : '');
      });

    // Label
    nodeEnter.append('text')
      .attr('dy', '.35em')
      .attr('x', function (d) { return d.children || d._children ? -14 : 14; })
      .attr('text-anchor', function (d) { return d.children || d._children ? 'end' : 'start'; })
      .text(function (d) { return d.data.name; })
      .style('font-weight', function (d) { return d.depth < 2 ? '600' : '400'; });

    // UPDATE
    var nodeUpdate = nodeEnter.merge(node);

    nodeUpdate.transition().duration(duration)
      .attr('transform', function (d) {
        return 'translate(' + d.y + ',' + d.x + ')';
      });

    nodeUpdate.select('circle')
      .attr('r', function (d) { return d.depth === 0 ? 10 : 6; })
      .style('fill', function (d) {
        return d._children ? (groupColorMap[d.data.group] || '#6366f1') : '#fff';
      })
      .style('stroke', function (d) {
        return groupColorMap[d.data.group] || '#6366f1';
      });

    nodeUpdate.select('.toggle-icon')
      .text(function (d) {
        return d._children ? '+' : (d.children ? '−' : '');
      });

    nodeUpdate.select('text:not(.toggle-icon)')
      .attr('x', function (d) { return d.children || d._children ? -14 : 14; })
      .attr('text-anchor', function (d) { return d.children || d._children ? 'end' : 'start'; });

    // EXIT
    var nodeExit = node.exit().transition().duration(duration)
      .attr('transform', function () {
        return 'translate(' + source.y + ',' + source.x + ')';
      })
      .remove();

    nodeExit.select('circle').attr('r', 1e-6);
    nodeExit.select('text').style('fill-opacity', 1e-6);

    // ─── LINKS ───
    var link = treeG.selectAll('path.link')
      .data(treeLinks, function (d) { return d.target.id; });

    var linkEnter = link.enter().insert('path', 'g')
      .attr('class', 'link')
      .attr('d', function () {
        var o = { x: source.x0, y: source.y0 };
        return diagonal(o, o);
      });

    var linkUpdate = linkEnter.merge(link);

    linkUpdate.transition().duration(duration)
      .attr('d', function (d) { return diagonal(d.source, d.target); });

    link.exit().transition().duration(duration)
      .attr('d', function () {
        var o = { x: source.x, y: source.y };
        return diagonal(o, o);
      })
      .remove();

    // Save old positions for transition
    treeNodes.forEach(function (d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    updateCounts();

    // Auto-fit zoom after transition
    setTimeout(function () { fitToView(treeNodes); }, duration + 50);
  }

  function fitToView(nodes) {
    if (!treeSvg || !zoomBehavior || !nodes || nodes.length === 0) return;

    var rect = containerEl.getBoundingClientRect();
    var svgW = rect.width || 800;
    var svgH = rect.height || 600;

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(function (d) {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    var treeW = (maxY - minY) + 250;
    var treeH = (maxX - minX) + 80;

    if (treeW <= 0 || treeH <= 0) return;

    var scale = Math.min(svgW / treeW, svgH / treeH, 1.2);
    scale = Math.max(scale, 0.25);

    var centerX = (minX + maxX) / 2;
    var centerY = (minY + maxY) / 2;

    var tx = svgW / 2 - centerY * scale;
    var ty = svgH / 2 - centerX * scale;

    treeSvg.transition().duration(500)
      .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  function updateCounts() {
    if (visibleCountEl) {
      var count = treeG ? treeG.selectAll('g.node').size() : 0;
      visibleCountEl.textContent = count;
    }
    if (selectedCountEl) {
      selectedCountEl.textContent = selectedKeywords.size;
    }
  }

  var groupLabels = {
    0: 'Root',
    1: 'Primary',
    2: 'Connected',
    3: 'Secondary',
    4: 'Tertiary'
  };

  function showNodeDetails(d) {
    if (!drawerTitleEl || !drawerBodyEl) return;

    var name = d.data.name;
    var realId = (name === 'Louis Vuitton') ? 'LVMH' : name;
    drawerTitleEl.textContent = name;

    var allChildren = d.children || d._children || [];
    var childNames = allChildren.map(function (c) { return c.data.name; });

    var nodes = window.kwGetNodes ? window.kwGetNodes() : [];
    var getConnected = window.kwGetConnected;
    var articlesHTML = window.kwGetArticlesHTML ? window.kwGetArticlesHTML(realId) : '';

    var nodeObj = nodes.find(function (n) { return n.id === realId; });
    var value = nodeObj ? nodeObj.value : (d.data.value || 0);
    var group = nodeObj ? nodeObj.group : (d.data.group || 0);

    var connCount = 0;
    var connNames = [];
    if (getConnected && nodeObj) {
      var connIds = getConnected(nodeObj);
      connNames = nodes.filter(function (n) { return connIds.has(n.id) && n.id !== realId; }).map(function (n) { return n.id; });
      connCount = connNames.length;
    }

    var html = '';

    html += '<div class="sidebar-content">';
    html += '<div class="sidebar-stats">';
    html += '<div class="sidebar-stat"><span class="sidebar-stat-value">' + value + '</span><span class="sidebar-stat-label">Volume</span></div>';
    html += '<div class="sidebar-stat"><span class="sidebar-stat-value">' + connCount + '</span><span class="sidebar-stat-label">Connections</span></div>';
    html += '<div class="sidebar-stat"><span class="sidebar-stat-value">' + (groupLabels[group] || 'Other') + '</span><span class="sidebar-stat-label">Group</span></div>';
    html += '</div>';

    if (childNames.length > 0) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-label">Nested Keywords (' + childNames.length + ')</div>';
      html += '<div class="sidebar-chips">';
      childNames.forEach(function (cn) {
        html += '<span class="sidebar-chip">' + cn + '</span>';
      });
      html += '</div>';
      html += '</div>';
    }

    if (connNames.length > 0) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-label">All Connections</div>';
      html += '<div class="sidebar-chips">';
      connNames.forEach(function (cn) {
        html += '<span class="sidebar-chip">' + cn + '</span>';
      });
      html += '</div>';
      html += '</div>';
    }

    if (articlesHTML) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-label">Related Articles</div>';
      html += '<div class="sidebar-articles">' + articlesHTML + '</div>';
      html += '</div>';
    }

    html += '</div>';
    drawerBodyEl.innerHTML = html;
  }

  // Search: expand to matches
  function searchTree(query) {
    if (!root) return;
    if (!query) {
      update(root);
      return;
    }
    var lower = query.toLowerCase();

    function expandToMatch(d) {
      var match = d.data.name.toLowerCase().includes(lower);
      var childMatch = false;

      var kids = d.children || d._children;
      if (kids) {
        kids.forEach(function (c) {
          if (expandToMatch(c)) childMatch = true;
        });
      }

      if (childMatch && d._children) {
        d.children = d._children;
        d._children = null;
      }

      return match || childMatch;
    }

    expandToMatch(root);
    update(root);

    // Highlight matching text
    treeG.selectAll('g.node text:not(.toggle-icon)').each(function (d) {
      var el = d3.select(this);
      if (d.data.name.toLowerCase().includes(lower)) {
        el.style('fill', '#f59e0b').style('font-weight', '700');
      } else {
        el.style('fill', null).style('font-weight', d.depth < 2 ? '600' : '400');
      }
    });
  }

  // Event listeners
  if (expandAllBtn) expandAllBtn.addEventListener('click', function () {
    if (root) { expandAll(root); update(root); }
  });
  if (collapseAllBtn) collapseAllBtn.addEventListener('click', function () {
    if (root) {
      if (root.children) {
        root.children.forEach(function (c) { collapseAllExceptRoot(c); });
      }
      update(root);
    }
  });
  if (clearSelectionBtn) clearSelectionBtn.addEventListener('click', function () {
    selectedKeywords.clear();
    if (treeG) treeG.selectAll('g.node').classed('is-selected', false);
    if (drawerTitleEl) drawerTitleEl.textContent = 'Select a Keyword';
    if (drawerBodyEl) drawerBodyEl.innerHTML = '<p class="sidebar__placeholder">Click on a node in the tree to see its details.</p>';
  });
  if (searchInput) searchInput.addEventListener('input', function () {
    searchTree(searchInput.value.trim());
  });

  window.kwShowTreeTab = function () {
    if (!initialized) {
      setTimeout(initTree, 50);
    } else {
      // Resize SVG to fit container
      var rect = containerEl.getBoundingClientRect();
      if (treeSvg && rect.width > 0) {
        treeSvg.attr('width', rect.width).attr('height', rect.height);
      }
    }
  };

  window.addEventListener('kw-data-updated', function () {
    initialized = false;
    var tab = document.getElementById('kw-tree-tab');
    if (tab && tab.style.display !== 'none') {
      setTimeout(initTree, 50);
    }
  });
})();
