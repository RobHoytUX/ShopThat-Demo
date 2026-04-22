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
  /** Graph keyword ids dimmed via the side panel (same behaviour as bubbles). */
  var treeDisabledNodes = new Set();
  // Currently-focused node in the tree (the one whose details are shown in
  // the side panel). Tracked separately from `selectedKeywords` so we can
  // implement a true click-to-toggle: clicking a node again collapses its
  // children AND closes its details panel.
  var selectedTreeNode = null;
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

    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });

    var rootNode =
      nodes.find(function (n) { return n.isRoot; }) ||
      byId['LVMH'] ||
      nodes[0];
    if (!rootNode) return null;

    var hasParents = nodes.some(function (n) {
      return n.parent && n.id !== rootNode.id;
    });

    // childrenMap: parentId -> [child node, …] following the tree shape.
    var childrenMap = {};
    var claimed = {};
    claimed[rootNode.id] = true;

    function addChild(parentId, childNode) {
      if (!parentId || !childNode || claimed[childNode.id]) return;
      if (!byId[parentId]) return;
      claimed[childNode.id] = true;
      (childrenMap[parentId] = childrenMap[parentId] || []).push(childNode);
    }

    if (hasParents) {
      // Primary path: explicit `parent` fields drive the tree.
      nodes.forEach(function (n) {
        if (n.id === rootNode.id) return;
        var parentId = n.parent;
        // Areas without an explicit parent default to the root, matching the
        // previous flat behaviour.
        if (!parentId && n.isArea) parentId = rootNode.id;
        addChild(parentId, n);
      });
    } else {
      // Legacy fallback: BFS from the root along link adjacency, like before.
      var adjacency = {};
      links.forEach(function (link) {
        var src = typeof link.source === 'object' ? link.source.id : link.source;
        var tgt = typeof link.target === 'object' ? link.target.id : link.target;
        (adjacency[src] = adjacency[src] || []).push(tgt);
        (adjacency[tgt] = adjacency[tgt] || []).push(src);
      });
      var queue = [rootNode.id];
      while (queue.length) {
        var curId = queue.shift();
        (adjacency[curId] || []).forEach(function (nid) {
          var child = byId[nid];
          if (!child || claimed[child.id]) return;
          addChild(curId, child);
          queue.push(nid);
        });
      }
    }

    function build(node) {
      var rawKids = (childrenMap[node.id] || []).slice();
      rawKids.sort(function (a, b) {
        return ((b.value || 0) - (a.value || 0));
      });
      var displayName = (node.id === rootNode.id) ? 'Louis Vuitton' : node.id;
      var built = {
        name: displayName,
        group: node.group != null ? node.group : 4,
        value: node.value != null ? node.value : 50
      };
      if (rawKids.length) {
        built.children = rawKids.map(build);
      }
      return built;
    }

    return build(rootNode);
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

    // Looser vertical spacing + stronger separation between subtrees so that
    // when Kusama and New York (or any two branches of the root) are expanded
    // simultaneously, their leaves don’t crowd into each other.
    treeLayout = d3.tree()
      .nodeSize([46, 240])
      .separation(function (a, b) {
        if (a.parent === b.parent) return 1;
        // Different direct parents — walk up until we find the common
        // ancestor, then scale the gap by how far the two nodes are from it.
        // Nodes that sit in entirely different top-level branches (e.g. a
        // Kusama leaf next to a 57th St. leaf) get the biggest gap.
        var ap = a;
        var bp = b;
        while (ap.depth > bp.depth) ap = ap.parent;
        while (bp.depth > ap.depth) bp = bp.parent;
        while (ap && bp && ap !== bp) { ap = ap.parent; bp = bp.parent; }
        var commonDepth = ap ? ap.depth : 0;
        var dist = (a.depth - commonDepth) + (b.depth - commonDepth);
        return 1.4 + dist * 0.35;
      });

    root = d3.hierarchy(data);
    root.x0 = 0;
    root.y0 = 0;

    // Collapse areas so user clicks to reveal keywords
    if (root.children) {
      root.children.forEach(function (child) {
        collapse(child);
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

  function graphIdFromTreeDisplayName(displayName) {
    return displayName === 'Louis Vuitton' ? 'LVMH' : displayName;
  }

  function updateTreeNodeDisabledVisuals() {
    if (!treeG) return;
    treeG.selectAll('g.node').each(function (d) {
      var gid = graphIdFromTreeDisplayName(d.data.name);
      var isDisabled = treeDisabledNodes.has(gid);
      var nodeEl = d3.select(this);
      nodeEl.select('circle')
        .interrupt('treeDisabled')
        .transition('treeDisabled')
        .duration(200)
        .attr('opacity', isDisabled ? 0.25 : 1)
        .style('filter', isDisabled ? 'grayscale(0.8) brightness(1.3)' : 'none');
      nodeEl.select('text:not(.toggle-icon)')
        .interrupt('treeDisabledT')
        .transition('treeDisabledT')
        .duration(200)
        .attr('opacity', isDisabled ? 0.4 : 1);
    });
  }

  function syncTreeDrawerChipClasses() {
    if (!drawerBodyEl) return;
    drawerBodyEl.querySelectorAll('.sidebar-chip--toggle').forEach(function (chip) {
      var kw = chip.getAttribute('data-keyword');
      if (!kw) return;
      chip.classList.toggle('sidebar-chip--disabled', treeDisabledNodes.has(kw));
    });
  }

  function attachTreeChipClickHandlers() {
    if (!drawerBodyEl) return;
    var chips = drawerBodyEl.querySelectorAll('.sidebar-chip--toggle');
    var resetBtn = drawerBodyEl.querySelector('#treeResetChipsBtn');

    function updateResetBtnState() {
      if (resetBtn) resetBtn.disabled = treeDisabledNodes.size === 0;
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var keyword = chip.getAttribute('data-keyword');
        if (!keyword) return;
        if (treeDisabledNodes.has(keyword)) {
          treeDisabledNodes.delete(keyword);
        } else {
          treeDisabledNodes.add(keyword);
        }
        syncTreeDrawerChipClasses();
        updateTreeNodeDisabledVisuals();
        updateResetBtnState();
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        treeDisabledNodes.clear();
        chips.forEach(function (c) { c.classList.remove('sidebar-chip--disabled'); });
        updateTreeNodeDisabledVisuals();
        resetBtn.disabled = true;
      });
    }
  }

  function treeResetChipsSvgBtn(disabled) {
    return (
      '<button type="button" class="sidebar-reset-btn" id="treeResetChipsBtn" title="Reset all"' +
      (disabled ? ' disabled' : '') + '>' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>' +
      '<path d="M3 3v5h5"/>' +
      '</svg>Reset</button>'
    );
  }

  function treeKeywordChipsHtml(names) {
    return names.map(function (name) {
      var gid = graphIdFromTreeDisplayName(name);
      var off = treeDisabledNodes.has(gid);
      return (
        '<span class="sidebar-chip sidebar-chip--toggle' + (off ? ' sidebar-chip--disabled' : '') + '" data-keyword="' +
        gid + '">' + name + '</span>'
      );
    }).join('');
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
        // Toggle: clicking the currently-selected node again collapses it
        // and closes its details panel.
        if (selectedTreeNode === d) {
          if (d.children) {
            d._children = d.children;
            d.children = null;
          }
          selectedTreeNode = null;
          resetTreeDetails();
          update(d);
          return;
        }
        // Otherwise: expand if collapsed, mark as selected, show details.
        if (d._children) {
          d.children = d._children;
          d._children = null;
        }
        selectedTreeNode = d;
        showNodeDetails(d);
        update(d);
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

    // Keep the “selected” visual marker in sync after toggles.
    nodeUpdate.attr('class', function (d) {
      var cls = 'node';
      if (selectedKeywords.has(d.data.name)) cls += ' is-selected';
      if (selectedTreeNode === d) cls += ' is-focused';
      return cls;
    });

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
    updateTreeNodeDisabledVisuals();

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

  function resetTreeDetails() {
    if (drawerTitleEl) drawerTitleEl.textContent = 'Select a Keyword';
    if (drawerBodyEl) {
      drawerBodyEl.innerHTML = '<p class="sidebar__placeholder">Click on a node in the tree to see its details.</p>';
    }
  }

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
    html += '</div>';

    if (childNames.length > 0 || connNames.length > 0) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-header">';
      html += '<div class="sidebar-section-label">Related Keywords</div>';
      html += treeResetChipsSvgBtn(treeDisabledNodes.size === 0);
      html += '</div>';
      html += '<p class="sidebar-hint">Click a keyword to toggle visibility</p>';
      if (childNames.length > 0) {
        html += '<div class="sidebar-section-label">Nested Keywords (' + childNames.length + ')</div>';
        html += '<div class="sidebar-chips">' + treeKeywordChipsHtml(childNames) + '</div>';
      }
      if (connNames.length > 0) {
        html += '<div class="sidebar-section-label">All Connections</div>';
        html += '<div class="sidebar-chips">' + treeKeywordChipsHtml(connNames) + '</div>';
      }
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
    attachTreeChipClickHandlers();
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
    selectedTreeNode = null;
    if (treeG) treeG.selectAll('g.node').classed('is-selected', false).classed('is-focused', false);
    resetTreeDetails();
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
    treeDisabledNodes.clear();
    var tab = document.getElementById('kw-tree-tab');
    if (tab && tab.style.display !== 'none') {
      setTimeout(initTree, 50);
    }
  });
})();
