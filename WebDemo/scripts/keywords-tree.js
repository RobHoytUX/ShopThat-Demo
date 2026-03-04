(function () {
  'use strict';

  var containerEl = document.getElementById('treeContainer');
  var searchInput = document.getElementById('treeSearch');
  var expandAllBtn = document.getElementById('treeExpandAll');
  var collapseAllBtn = document.getElementById('treeCollapseAll');
  var clearSelectionBtn = document.getElementById('treeClearSelection');
  var visibleCountEl = document.getElementById('treeVisibleCount');
  var selectedCountEl = document.getElementById('treeSelectedCount');
  var selectedListEl = document.getElementById('treeSelectedList');

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

    var childMap = {};
    links.forEach(function (link) {
      var src = typeof link.source === 'object' ? link.source.id : link.source;
      var tgt = typeof link.target === 'object' ? link.target.id : link.target;
      if (!childMap[src]) childMap[src] = [];
      childMap[src].push(tgt);
    });

    var claimed = new Set();

    function build(id, depth) {
      if (claimed.has(id) || depth > 5) return null;
      claimed.add(id);
      var node = nodes.find(function (n) { return n.id === id; });
      var kids = (childMap[id] || []).sort(function (a, b) {
        var na = nodes.find(function (n) { return n.id === a; });
        var nb = nodes.find(function (n) { return n.id === b; });
        return ((nb ? nb.value : 0) - (na ? na.value : 0));
      });
      var children = [];
      kids.forEach(function (cid) {
        var child = build(cid, depth + 1);
        if (child) children.push(child);
      });
      return {
        name: id,
        group: node ? node.group : 4,
        value: node ? node.value : 50,
        children: children.length > 0 ? children : undefined
      };
    }

    var hierarchy = build('LVMH', 0);

    var unclaimed = nodes.filter(function (n) { return !claimed.has(n.id); });
    if (unclaimed.length > 0 && hierarchy) {
      var otherKids = unclaimed.map(function (n) {
        return { name: n.id, group: n.group, value: n.value };
      });
      if (!hierarchy.children) hierarchy.children = [];
      hierarchy.children.push({ name: 'Other', group: 4, value: 40, children: otherKids });
    }

    return hierarchy;
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

    treeLayout = d3.tree().nodeSize([34, 220]).separation(function (a, b) { return a.parent === b.parent ? 1 : 2; });

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
        if (event.shiftKey) {
          if (selectedKeywords.has(d.data.name)) {
            selectedKeywords.delete(d.data.name);
          } else {
            selectedKeywords.add(d.data.name);
          }
          updateSelectedUI();
          d3.select(this).classed('is-selected', selectedKeywords.has(d.data.name));
          return;
        }
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else if (d._children) {
          d.children = d._children;
          d._children = null;
        }
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

    nodeUpdate.transition().duration(duration)
      .attr('transform', function (d) {
        return 'translate(' + d.y + ',' + d.x + ')';
      });

    nodeUpdate.select('circle')
      .attr('r', function (d) { return d.depth === 0 ? 8 : 6; })
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

  function updateSelectedUI() {
    updateCounts();
    if (!selectedListEl) return;
    if (selectedKeywords.size === 0) {
      selectedListEl.innerHTML = '<p class="sidebar__placeholder">Shift+Click nodes to select keywords.</p>';
      return;
    }
    var html = '';
    selectedKeywords.forEach(function (kw) {
      html += '<div class="kw-tree-selected-item"><span>' + kw + '</span><button class="kw-tree-selected-remove" data-id="' + kw + '">&times;</button></div>';
    });
    selectedListEl.innerHTML = html;
    selectedListEl.querySelectorAll('.kw-tree-selected-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedKeywords.delete(btn.dataset.id);
        updateSelectedUI();
        treeG.selectAll('g.node').classed('is-selected', function (d) {
          return selectedKeywords.has(d.data.name);
        });
      });
    });
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
    updateSelectedUI();
    if (treeG) treeG.selectAll('g.node').classed('is-selected', false);
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
})();
