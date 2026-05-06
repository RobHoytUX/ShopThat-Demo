(function () {
  'use strict';

  var containerEl = document.getElementById('treeContainer');
  var searchInput = document.getElementById('treeSearch');
  var expandAllBtn = document.getElementById('treeExpandAll');
  var collapseAllBtn = document.getElementById('treeCollapseAll');
  var drawerTitleEl = document.getElementById('treeDrawerTitle');
  var drawerBodyEl = document.getElementById('treeDrawerBody');

  /** Graph keyword ids dimmed via the side panel (same behaviour as bubbles). */
  var treeDisabledNodes = new Set();
  // Currently-focused node in the tree (the one whose details are shown in
  // the side panel). Clicking it again collapses children and closes the panel.
  var selectedTreeNode = null;
  var root = null;
  var treeSvg = null;
  var treeG = null;
  var treeLayout = null;
  var zoomBehavior = null;
  var initialized = false;
  var duration = 400;
  var nodeIdCounter = 0;
  /** When set, fitToView zooms to these graph ids only (search neighbourhood). */
  var treeSearchFocusIds = null;
  /**
   * Snapshot of every node's expand/collapse state and child layout taken just
   * before the user starts a search. Used to restore the tree to its pre-search
   * state when the search box is cleared, including whichever branches the user
   * had manually expanded/collapsed.
   *
   * Shape: { [nodeKey]: { isExpanded: boolean, childKeys: string[] } }
   */
  var preSearchState = null;

  var groupColorMap = {
    0: '#1e3a8a',
    1: '#6366f1',
    2: '#8b5cf6',
    3: '#f59e0b',
    4: '#10b981'
  };

  // ─── Location keyword overlay ────────────────────────────────────────────
  // Build a lookup of "leaf" location names (restaurants/hotels/museums/
  // galleries on the product-dashboard map) → their tag keyword arrays. These
  // are the same keywords rendered above the map when a marker/card is
  // clicked, so we surface them as nested tree children for parity.
  function buildLocationKeywordLookup() {
    var lookup = {};
    var data = (window.ShopThatDashboardMapData && window.ShopThatDashboardMapData.locationData) || {};
    ['restaurants', 'museums', 'galleries', 'others', 'stores'].forEach(function (cat) {
      var items = data[cat] || [];
      items.forEach(function (item) {
        if (item && item.name && Array.isArray(item.keywords) && item.keywords.length) {
          lookup[item.name] = item.keywords;
        }
      });
    });
    // Aliases for tree node display names that don't match the map data name
    // verbatim (the tree uses shorter labels in some places).
    var aliases = {
      'The Mark': 'The Mark Restaurant by Jean-Georges',
      'ST Regis': 'The St. Regis',
      'The St. Regis': 'The St. Regis',
      'The Carlyle': 'The Carlyle Hotel',
      'The Baccarat': 'The Baccarat Hotel',
      'MoMA Museum': 'The Museum of Modern Art'
    };
    Object.keys(aliases).forEach(function (alias) {
      var target = aliases[alias];
      if (lookup[target] && !lookup[alias]) lookup[alias] = lookup[target];
    });
    return lookup;
  }

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

    var locationKeywordsByName = buildLocationKeywordLookup();

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
      } else if (locationKeywordsByName[node.id]) {
        // Leaf location (e.g. The Modern, Le Bernardin, The Plaza) — surface
        // the same tag keywords that the product-dashboard map shows when
        // this location is clicked. Drop self-references (the location's
        // own name is usually the first keyword in the array).
        var ownName = (node.id || '').toLowerCase();
        var keywords = locationKeywordsByName[node.id].filter(function (kw) {
          return kw && kw.toLowerCase() !== ownName;
        });
        if (keywords.length) {
          built.children = keywords.map(function (kw) {
            return { name: kw, group: 4, value: 30, isLocationTag: true };
          });
        }
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
      .attr('class', 'node')
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

    nodeUpdate.attr('class', function (d) {
      return 'node' + (selectedTreeNode === d ? ' is-focused' : '');
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

    updateTreeNodeDisabledVisuals();

    // Auto-fit zoom after transition (search uses treeSearchFocusIds for a tight frame)
    setTimeout(function () { fitToView(treeNodes, treeSearchFocusIds); }, duration + 50);
  }

  function fitToView(nodes, focusIds) {
    if (!treeSvg || !zoomBehavior || !nodes || nodes.length === 0) return;

    var rect = containerEl.getBoundingClientRect();
    var svgW = rect.width || 800;
    var svgH = rect.height || 600;

    var subset = nodes;
    if (focusIds && focusIds.size > 0) {
      subset = nodes.filter(function (d) {
        return focusIds.has(graphIdFromTreeDisplayName(d.data.name));
      });
    }
    if (!subset.length) {
      subset = nodes;
    }

    var focused = focusIds && focusIds.size > 0;
    var longestLabel = 0;
    subset.forEach(function (d) {
      var L = (d.data.name || '').length;
      if (L > longestLabel) longestLabel = L;
    });

    // Bounds must include label geometry (pixel offsets on each node), not just circle centers —
    // otherwise roots with text-anchor:end clip on the left and leaves clip on the right.
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    subset.forEach(function (d) {
      var name = d.data.name || '';
      var internal = !!(d.children || d._children);
      var estW = 20 + name.length * 7.4;
      var r = d.depth === 0 ? 10 : 6;
      var yL;
      var yR;
      if (internal) {
        yL = d.y - 14 - estW - r;
        yR = d.y + r + 10;
      } else {
        yL = d.y - r - 4;
        yR = d.y + 14 + estW + r;
      }
      var xT = d.x - 22;
      var xB = d.x + 22;
      if (yL < minY) minY = yL;
      if (yR > maxY) maxY = yR;
      if (xT < minX) minX = xT;
      if (xB > maxX) maxX = xB;
    });

    if (!isFinite(minX) || minX === Infinity) return;

    // Horizontal slack for same-depth stacks; keep modest so the default zoom feels like the reference screenshot.
    var labelSlackY = Math.min(400, longestLabel * 9 + (focused ? 200 : 95));

    var padX = focused ? 88 : 52;
    var padY = focused ? 220 : 145;
    if (subset.length > 18) {
      padX += 22;
      padY += 26;
    }
    var spanX = Math.max(maxX - minX, 24);
    var spanY = Math.max(maxY - minY, 24);
    if (focused) spanY = Math.max(spanY, 100);

    var treeW = spanY + padY + labelSlackY;
    var treeH = spanX + padX;

    var marginPx = focused ? 64 : 28;
    var svgWEff = Math.max(280, svgW - marginPx * 2);
    var svgHEff = Math.max(240, svgH - marginPx * 2);

    var maxScale = focused ? 2.2 : 1.38;
    var scale = Math.min(svgWEff / treeW, svgHEff / treeH, maxScale);
    scale = Math.max(scale, focused ? 0.45 : 0.22);

    var centerX = (minX + maxX) / 2;
    var centerY = (minY + maxY) / 2;

    var tx = svgW / 2 - centerY * scale;
    var ty = svgH / 2 - centerX * scale;

    treeSvg.transition().duration(focused ? 650 : 500)
      .ease(d3.easeCubicOut)
      .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
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

  // ─── Search snapshot helpers ───────────────────────────────────────────────
  // A stable identity for a hierarchy node — built from its path back to root
  // so duplicate names under different parents don't collide (e.g. "Restaurant"
  // can appear under multiple locations).
  function nodePathKey(d) {
    var parts = [];
    var n = d;
    while (n) { parts.unshift(n.data.name); n = n.parent; }
    return parts.join('\u0001');
  }

  // Walk the tree and record each node's expanded/collapsed state plus the
  // ordered list of all its children (visible + hidden). This is used so we can
  // perfectly restore the user's pre-search view when the query is cleared.
  function captureTreeState(d, out) {
    var children = d.children || [];
    var hidden = d._children || [];
    var all = children.concat(hidden);
    out[nodePathKey(d)] = {
      isExpanded: !!d.children,
      childKeys: all.map(nodePathKey)
    };
    all.forEach(function (c) { captureTreeState(c, out); });
  }

  // Inverse of captureTreeState — re-merges visible/hidden children, re-orders
  // them per the snapshot, and re-applies the saved expanded/collapsed flag.
  function restoreTreeState(d, snapshot) {
    var snap = snapshot[nodePathKey(d)];
    if (!snap) return;
    var children = d.children || [];
    var hidden = d._children || [];
    var all = children.concat(hidden);
    if (all.length === 0) {
      d.children = null;
      d._children = null;
      return;
    }
    // Re-order so the original sibling order is preserved on restore.
    var byKey = {};
    all.forEach(function (c) { byKey[nodePathKey(c)] = c; });
    var ordered = snap.childKeys.map(function (k) { return byKey[k]; }).filter(Boolean);
    if (snap.isExpanded) {
      d.children = ordered;
      d._children = null;
    } else {
      d._children = ordered;
      d.children = null;
    }
    ordered.forEach(function (c) { restoreTreeState(c, snapshot); });
  }

  // Reset any leftover styling left by a previous search highlight.
  function clearSearchHighlights() {
    if (!treeG) return;
    treeG.selectAll('g.node').style('opacity', null).style('pointer-events', null);
    treeG.selectAll('path.link').style('opacity', null);
    treeG.selectAll('g.node text:not(.toggle-icon)').each(function (d) {
      d3.select(this).style('fill', null).style('font-weight', d.depth < 2 ? '600' : '400');
    });
  }

  // ─── Search ───────────────────────────────────────────────────────────────
  // Behavior:
  //   • Filters the visible tree to ONLY the keywords whose name matches the
  //     query plus their ancestor path back to the root (their "connections"
  //     in tree terms). Everything else is hidden, not just dimmed.
  //   • Auto-fits the zoom to the matching keywords so all hits are easy to see
  //     at a glance.
  //   • Highlights matched node labels.
  //   • When the query is cleared, restores the exact tree state (expanded /
  //     collapsed branches) the user had before searching.
  function searchTree(query) {
    if (!root) return;
    var q = (query || '').trim();

    if (!q) {
      if (preSearchState) {
        restoreTreeState(root, preSearchState);
        preSearchState = null;
      }
      treeSearchFocusIds = null;
      clearSearchHighlights();
      update(root);
      updateTreeNodeDisabledVisuals();
      return;
    }

    // First keystroke of a new search session — snapshot the current tree
    // state. For each subsequent keystroke, restore the snapshot first so the
    // filter is applied to the original tree, not on top of the previous
    // filtered view.
    if (!preSearchState) {
      preSearchState = {};
      captureTreeState(root, preSearchState);
    } else {
      restoreTreeState(root, preSearchState);
    }

    var lower = q.toLowerCase();

    // Walk the tree, partitioning each node's children into the ones that
    // contain matches (kept visible) and the ones that don't (moved to
    // _children so they're hidden from the layout but still reachable for
    // the snapshot/restore on clear).
    function applyFilter(d) {
      var selfMatch = d.data.name.toLowerCase().includes(lower);
      var allChildren = (d.children || []).concat(d._children || []);
      var keep = [];
      var hide = [];
      allChildren.forEach(function (c) {
        if (applyFilter(c)) keep.push(c); else hide.push(c);
      });
      if (keep.length > 0) {
        d.children = keep;
        d._children = hide.length ? hide : null;
      } else {
        // Either this node is itself a match (we keep its descendants
        // collapsed — the user can drill in if desired) or it's irrelevant.
        d.children = null;
        d._children = allChildren.length ? allChildren : null;
      }
      return selfMatch || keep.length > 0;
    }

    applyFilter(root);
    // The visible tree is now strictly { matches ∪ ancestors of matches }, so
    // letting fitToView zoom to ALL visible nodes naturally frames every match
    // alongside its connection path. (Setting focusIds to the matches alone
    // would over-zoom to the leaves and crop their context.)
    treeSearchFocusIds = null;
    update(root);

    // Style: full opacity for everything still visible, orange highlight on
    // the matched labels themselves.
    if (treeG) {
      treeG.selectAll('g.node').style('opacity', null).style('pointer-events', null);
      treeG.selectAll('path.link').style('opacity', null);
      treeG.selectAll('g.node text:not(.toggle-icon)').each(function (d) {
        var el = d3.select(this);
        if (d.data.name.toLowerCase().includes(lower)) {
          el.style('fill', '#f59e0b').style('font-weight', '700');
        } else {
          el.style('fill', null).style('font-weight', d.depth < 2 ? '600' : '400');
        }
      });
    }
    updateTreeNodeDisabledVisuals();
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
