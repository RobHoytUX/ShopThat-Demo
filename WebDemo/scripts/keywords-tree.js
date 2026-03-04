(function () {
  'use strict';

  var treeContainer = document.getElementById('treeContainer');
  var searchInput = document.getElementById('treeSearch');
  var expandAllBtn = document.getElementById('treeExpandAll');
  var collapseAllBtn = document.getElementById('treeCollapseAll');
  var clearSelectionBtn = document.getElementById('treeClearSelection');
  var visibleCountEl = document.getElementById('treeVisibleCount');
  var selectedCountEl = document.getElementById('treeSelectedCount');
  var selectedListEl = document.getElementById('treeSelectedList');

  var selectedKeywords = new Set();
  var expandedNodes = new Set();
  var treeData = null;
  var initialized = false;

  function buildTreeData() {
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

    function buildNode(id, depth) {
      if (claimed.has(id) || depth > 4) return null;
      claimed.add(id);

      var node = nodes.find(function (n) { return n.id === id; });
      var children = [];
      var childIds = childMap[id] || [];

      childIds.sort(function (a, b) {
        var na = nodes.find(function (n) { return n.id === a; });
        var nb = nodes.find(function (n) { return n.id === b; });
        return ((nb ? nb.value : 0) - (na ? na.value : 0));
      });

      childIds.forEach(function (cid) {
        var child = buildNode(cid, depth + 1);
        if (child) children.push(child);
      });

      return {
        id: id,
        group: node ? node.group : 4,
        value: node ? node.value : 50,
        children: children
      };
    }

    var root = buildNode('LVMH', 0);

    // Add unclaimed nodes under an "Other" branch
    var unclaimed = nodes.filter(function (n) { return !claimed.has(n.id); });
    if (unclaimed.length > 0) {
      var otherChildren = unclaimed.map(function (n) {
        return { id: n.id, group: n.group, value: n.value, children: [] };
      });
      if (root) {
        root.children.push({ id: 'Other Keywords', group: 4, value: 40, children: otherChildren });
      }
    }

    return root;
  }

  var groupColorMap = {
    0: '#1e3a8a',
    1: '#6366f1',
    2: '#8b5cf6',
    3: '#f59e0b',
    4: '#10b981'
  };

  function renderTree() {
    if (!treeContainer) return;
    if (!treeData) {
      treeData = buildTreeData();
      if (!treeData) {
        treeContainer.innerHTML = '<p style="color:#6b7280; padding:2rem;">No keyword data available.</p>';
        return;
      }
      expandedNodes.add('LVMH');
      treeData.children.forEach(function (c) { expandedNodes.add(c.id); });
    }

    treeContainer.innerHTML = '';
    var visibleCount = 0;

    function renderNode(node, depth) {
      var el = document.createElement('div');
      el.className = 'kw-tree-node';
      el.style.paddingLeft = (depth * 20 + 8) + 'px';

      var hasChildren = node.children && node.children.length > 0;
      var isExpanded = expandedNodes.has(node.id);
      var isSelected = selectedKeywords.has(node.id);

      var row = document.createElement('div');
      row.className = 'kw-tree-row' + (isSelected ? ' is-selected' : '');

      // Toggle arrow
      var toggle = document.createElement('span');
      toggle.className = 'kw-tree-toggle';
      if (hasChildren) {
        toggle.innerHTML = isExpanded ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
      } else {
        toggle.innerHTML = '<span style="display:inline-block;width:12px;"></span>';
      }

      var dot = document.createElement('span');
      dot.className = 'kw-tree-dot';
      dot.style.background = groupColorMap[node.group] || groupColorMap[4];

      var label = document.createElement('span');
      label.className = 'kw-tree-label';
      label.textContent = node.id;

      var count = document.createElement('span');
      count.className = 'kw-tree-count';
      if (hasChildren) {
        count.textContent = node.children.length;
      }

      row.appendChild(toggle);
      row.appendChild(dot);
      row.appendChild(label);
      if (hasChildren) row.appendChild(count);

      row.addEventListener('click', function (e) {
        if (e.shiftKey) {
          if (selectedKeywords.has(node.id)) {
            selectedKeywords.delete(node.id);
          } else {
            selectedKeywords.add(node.id);
          }
          renderTree();
          return;
        }
        if (hasChildren) {
          if (expandedNodes.has(node.id)) {
            expandedNodes.delete(node.id);
          } else {
            expandedNodes.add(node.id);
          }
          renderTree();
        }
      });

      el.appendChild(row);
      treeContainer.appendChild(el);
      visibleCount++;

      if (hasChildren && isExpanded) {
        node.children.forEach(function (child) {
          renderNode(child, depth + 1);
        });
      }
    }

    renderNode(treeData, 0);

    if (visibleCountEl) visibleCountEl.textContent = visibleCount;
    if (selectedCountEl) selectedCountEl.textContent = selectedKeywords.size;
    renderSelectedList();
  }

  function renderSelectedList() {
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
        renderTree();
      });
    });
  }

  function expandAll(node) {
    if (!node) return;
    if (node.children && node.children.length > 0) {
      expandedNodes.add(node.id);
      node.children.forEach(function (c) { expandAll(c); });
    }
  }

  function collapseAll() {
    expandedNodes.clear();
    expandedNodes.add('LVMH');
  }

  function filterTree(query) {
    if (!treeData) return;
    if (!query) {
      renderTree();
      return;
    }
    var lower = query.toLowerCase();

    function expandMatches(node) {
      if (!node) return false;
      var match = node.id.toLowerCase().includes(lower);
      var childMatch = false;
      if (node.children) {
        node.children.forEach(function (c) {
          if (expandMatches(c)) childMatch = true;
        });
      }
      if (match || childMatch) {
        expandedNodes.add(node.id);
        return true;
      }
      return false;
    }

    expandMatches(treeData);
    renderTree();

    // Highlight matching labels
    treeContainer.querySelectorAll('.kw-tree-label').forEach(function (lbl) {
      if (lbl.textContent.toLowerCase().includes(lower)) {
        lbl.classList.add('is-match');
      }
    });
  }

  // Event listeners
  if (expandAllBtn) expandAllBtn.addEventListener('click', function () { expandAll(treeData); renderTree(); });
  if (collapseAllBtn) collapseAllBtn.addEventListener('click', function () { collapseAll(); renderTree(); });
  if (clearSelectionBtn) clearSelectionBtn.addEventListener('click', function () { selectedKeywords.clear(); renderTree(); });
  if (searchInput) searchInput.addEventListener('input', function () { filterTree(searchInput.value.trim()); });

  window.kwShowTreeTab = function () {
    if (!initialized) {
      treeData = buildTreeData();
      if (treeData) {
        expandedNodes.add('LVMH');
        treeData.children.forEach(function (c) { expandedNodes.add(c.id); });
      }
      initialized = true;
    }
    renderTree();
  };
})();
