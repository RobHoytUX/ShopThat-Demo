(function () {
  'use strict';

  var containerEl = document.getElementById('treeContainer');
  var searchInput = document.getElementById('treeSearch');
  var expandAllBtn = document.getElementById('treeExpandAll');
  var collapseAllBtn = document.getElementById('treeCollapseAll');
  var drawerTitleEl = document.getElementById('treeDrawerTitle');
  var drawerRootEl = document.getElementById('treeDrawerBody');
  var viewportSectionEl = document.getElementById('treeDrawerViewportSection');
  var detailSectionEl = document.getElementById('treeDrawerDetailSection');
  var articlesBodyEl = document.getElementById('treeArticlesBody');

  /** Graph keyword ids dimmed via the side panel (same behaviour as bubbles). */
  var treeDisabledNodes = new Set(
    window.ShopThatData && window.ShopThatData.getDisabledKeywords
      ? window.ShopThatData.getDisabledKeywords()
      : []
  );

  function persistTreeDisabledNodes() {
    if (window.ShopThatData && window.ShopThatData.saveDisabledKeywords) {
      window.ShopThatData.saveDisabledKeywords(Array.from(treeDisabledNodes));
    }
  }

  function syncTreeDisabledNodesFromShared() {
    if (!window.ShopThatData || !window.ShopThatData.getDisabledKeywords) return;
    treeDisabledNodes = new Set(window.ShopThatData.getDisabledKeywords());
    syncTreeDrawerChipClasses();
    updateTreeNodeDisabledVisuals();
    refreshViewportKeywordChips();
    updateResetButtonsDisabledState();
  }
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

  /** RAF-throttled refresh of viewport keyword chips (zoom/pan fires often). */
  var viewportChipsRaf = null;
  var treeChipDelegationBound = false;

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

  function normalizeKeywordLabel(s) {
    return String(s || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  function stripLeadingArticle(s) {
    return String(s || '').replace(/^(the|a|an)\s+/i, '').trim();
  }

  /**
   * True when childLabel is redundant text already covered by parentLabel
   * (e.g. MoMA ⊂ MoMA Museum, Frick Collection ⊂ The Frick Collection).
   * Uses case-insensitive comparison, optional leading articles, and substring
   * checks. Very short tokens (< 4 chars) are kept to avoid pruning acronyms
   * like NY inside unrelated parents.
   */
  function isRedundantNestedKeyword(parentLabel, childLabel) {
    var parentNorm = normalizeKeywordLabel(parentLabel);
    var childNorm = normalizeKeywordLabel(childLabel);
    if (!parentNorm || !childNorm) return false;
    if (childNorm === parentNorm) return true;
    if (childNorm.length < 4) return false;
    if (parentNorm.indexOf(childNorm) !== -1) return true;
    var pStrip = stripLeadingArticle(parentNorm);
    var cStrip = stripLeadingArticle(childNorm);
    if (cStrip.length >= 4 && pStrip.indexOf(cStrip) !== -1) return true;
    if (cStrip.length >= 4 && parentNorm.indexOf(cStrip) !== -1) return true;
    if (childNorm.length >= 4 && pStrip.indexOf(childNorm) !== -1) return true;
    return false;
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
      var parentDisplayForNest = (node.id === rootNode.id)
        ? (rootNode.apiLabel || 'Louis Vuitton')
        : (node.apiLabel || node.id);
      rawKids = rawKids.filter(function (childNode) {
        return !isRedundantNestedKeyword(parentDisplayForNest, childNode.apiLabel || childNode.id);
      });
      rawKids.sort(function (a, b) {
        return ((b.value || 0) - (a.value || 0));
      });
      var displayName = parentDisplayForNest;
      var built = {
        name: displayName,
        graphId: node.id,
        group: node.group != null ? node.group : 4,
        value: node.value != null ? node.value : 50,
        evidence: node.evidence || '',
        sourceUrl: node.sourceUrl || ''
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
          if (!kw) return false;
          if (kw.toLowerCase() === ownName) return false;
          return !isRedundantNestedKeyword(node.id, kw);
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
        scheduleRefreshViewportKeywordChips();
      });

    treeSvg.call(zoomBehavior);
    treeSvg.call(zoomBehavior.transform, d3.zoomIdentity.translate(80, h / 2).scale(0.85));

    // Vertical pitch is a baseline only — resolveLabelCollisions() below pushes
    // whole sibling subtrees apart when 20px Poppins labels would overlap
    // (cross-column: sibling text into a neighbour’s expanded children).
    treeLayout = d3.tree()
      .nodeSize([56, 260])
      .separation(function (a, b) {
        if (a.parent === b.parent) return 1.2;
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
        return 1.55 + dist * 0.4;
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

  // ─── Label collision resolution ──────────────────────────────────────────
  // Tree labels use ~20px Poppins; long leaf text often spans past the next
  // depth column, so a sibling (e.g. MoMA) can paint over a neighbour’s
  // expanded children (e.g. Frick). d3.tree separation alone can’t see label
  // width — resolve after layout by nudging whole sibling branches apart.
  var LABEL_CHAR_W = 10.6;
  var LABEL_HEIGHT = 24;
  var LABEL_GAP = 8;
  var DEPTH_DX = 280;

  function estimateLabelWidth(name, depth) {
    var len = String(name || '').length;
    var cw = depth < 2 ? LABEL_CHAR_W + 0.6 : LABEL_CHAR_W;
    return Math.max(28, 6 + len * cw);
  }

  /** Axis-aligned label+circle box in tree coords (x vertical, y horizontal). */
  function labelBounds(d) {
    var w = estimateLabelWidth(d.data && d.data.name, d.depth);
    var internal = !!(d.children || d._children);
    var r = d.depth === 0 ? 10 : 6;
    var left;
    var right;
    if (internal) {
      left = d.y - 14 - w;
      right = d.y + r + 6;
    } else {
      left = d.y - r - 4;
      right = d.y + 14 + w;
    }
    var half = LABEL_HEIGHT / 2;
    return { left: left, right: right, top: d.x - half, bottom: d.x + half };
  }

  function shiftSubtree(d, dx) {
    d.x += dx;
    if (d.children) {
      d.children.forEach(function (c) { shiftSubtree(c, dx); });
    }
  }

  function collectSubtreeNodes(d, out) {
    out.push(d);
    if (d.children) {
      d.children.forEach(function (c) { collectSubtreeNodes(c, out); });
    }
  }

  /**
   * Minimum downward shift of subtree B so no label in A overlaps any in B.
   * Returns 0 when already clear (or only non-overlapping columns).
   */
  function neededSubtreeShift(nodesA, nodesB) {
    var delta = 0;
    for (var i = 0; i < nodesA.length; i++) {
      var ab = labelBounds(nodesA[i]);
      for (var j = 0; j < nodesB.length; j++) {
        var bb = labelBounds(nodesB[j]);
        if (bb.right <= ab.left || bb.left >= ab.right) continue;
        var need = LABEL_GAP - (bb.top - ab.bottom);
        if (need > delta) delta = need;
      }
    }
    return delta;
  }

  /**
   * After d3.tree + fixed depth spacing: bottom-up, push sibling subtrees
   * apart whenever any label in one horizontally-overlaps a label in the next.
   * Shifting the whole branch (and following siblings) keeps expand/collapse
   * geometry coherent — e.g. Frick’s children move with Frick so MoMA’s long
   * right-side label can’t sit on top of them.
   */
  function resolveLabelCollisions(rootNode) {
    if (!rootNode) return;

    function resolve(node) {
      if (!node.children || !node.children.length) return;
      node.children.forEach(resolve);

      var guard = 0;
      while (guard++ < 24) {
        var moved = false;
        for (var i = 1; i < node.children.length; i++) {
          var leftNodes = [];
          var rightNodes = [];
          collectSubtreeNodes(node.children[i - 1], leftNodes);
          collectSubtreeNodes(node.children[i], rightNodes);
          var delta = neededSubtreeShift(leftNodes, rightNodes);
          if (delta < 0.5) continue;
          for (var k = i; k < node.children.length; k++) {
            shiftSubtree(node.children[k], delta);
          }
          moved = true;
        }
        if (!moved) break;
      }

      // Keep the parent centered on its (possibly shifted) children.
      node.x = (node.children[0].x + node.children[node.children.length - 1].x) / 2;
    }

    resolve(rootNode);
  }

  function graphIdFromTreeDisplayName(displayName) {
    if (displayName === 'Louis Vuitton') return 'LVMH';
    var nodes = window.kwGetNodes ? window.kwGetNodes() : [];
    var match = nodes.find(function (n) {
      return n.id === displayName || n.apiLabel === displayName;
    });
    return match ? match.id : displayName;
  }

  function findGraphNodeForTreeNode(d) {
    var nodes = window.kwGetNodes ? window.kwGetNodes() : [];
    if (!nodes.length) return null;
    if (d && d.data && d.data.graphId) {
      var byId = nodes.find(function (n) { return n.id === d.data.graphId; });
      if (byId) return byId;
    }
    var name = d && d.data ? d.data.name : '';
    if (name === 'Louis Vuitton') {
      return nodes.find(function (n) { return n.isRoot || n.id === 'LVMH' || n.group === 0; }) || null;
    }
    return nodes.find(function (n) {
      return n.id === name || n.apiLabel === name;
    }) || null;
  }

  function publisherFromUrl(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (_) {
      return 'Source';
    }
  }

  function titleFromUrl(url) {
    try {
      var path = new URL(url).pathname.replace(/\/+$/, '');
      var slug = path.split('/').filter(Boolean).pop() || '';
      if (!slug) return publisherFromUrl(url);
      return decodeURIComponent(slug)
        .replace(/[-_]+/g, ' ')
        .replace(/\.(html?|aspx?|php)$/i, '')
        .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    } catch (_) {
      return 'Related article';
    }
  }

  /**
   * Collect unique source articles for a tree node from API `source_url` /
   * `evidence` on the node and its descendants (the corpus behind the keywords).
   */
  function collectApiArticlesForTreeNode(d) {
    var byUrl = Object.create(null);
    var order = [];

    function addFromFields(sourceUrl, evidence, label) {
      var url = String(sourceUrl || '').trim();
      if (!url || byUrl[url]) return;
      byUrl[url] = {
        url: url,
        title: (evidence && String(evidence).trim()) || titleFromUrl(url),
        publisher: publisherFromUrl(url),
        label: label || '',
        evidence: evidence || ''
      };
      order.push(url);
    }

    function walk(node) {
      if (!node) return;
      var data = node.data || {};
      var graphNode = findGraphNodeForTreeNode(node);
      addFromFields(
        data.sourceUrl || (graphNode && graphNode.sourceUrl),
        data.evidence || (graphNode && graphNode.evidence),
        data.name || (graphNode && (graphNode.apiLabel || graphNode.id))
      );
      // Prefer live graph fields when tree data was built without them
      if (graphNode) {
        addFromFields(graphNode.sourceUrl, graphNode.evidence, graphNode.apiLabel || graphNode.id);
      }
      var kids = (node.children || node._children || []);
      kids.forEach(walk);
    }

    walk(d);
    return order.map(function (url) { return byUrl[url]; });
  }

  function renderApiArticlesHTML(articles) {
    if (!articles || !articles.length) {
      return '<p class="sidebar__placeholder" style="padding:24px 8px">No source articles for this keyword yet.</p>';
    }
    return (
      '<div class="sidebar-articles">' +
      articles.map(function (article) {
        var title = escapeHtml(article.title || 'Related article');
        var publisher = escapeHtml(article.publisher || 'Source');
        var url = escapeHtml(article.url || '#');
        var label = article.label ? escapeHtml(article.label) : '';
        var initial = publisher.charAt(0).toUpperCase() || 'A';
        return (
          '<a class="sidebar-article sidebar-article--api" href="' + url + '" target="_blank" rel="noopener noreferrer" data-article-url="' + url + '">' +
          '<div class="sidebar-article-main">' +
          '<div class="sidebar-article-image sidebar-article-image--source" aria-hidden="true">' +
          '<span class="sidebar-article-favicon">' + initial + '</span>' +
          '<img class="sidebar-article-thumb" alt="" hidden loading="lazy" referrerpolicy="no-referrer">' +
          '</div>' +
          '<div class="sidebar-article-info">' +
          '<div class="sidebar-article-title">' + title + '</div>' +
          '<div class="sidebar-article-publisher">' + publisher + '</div>' +
          '</div>' +
          '</div>' +
          (label
            ? '<div class="sidebar-article-footer"><span class="sidebar-article-keyword-badge">' + label + '</span></div>'
            : '') +
          '</a>'
        );
      }).join('') +
      '</div>'
    );
  }

  var articlePreviewCache = Object.create(null);
  var articlePreviewInflight = Object.create(null);

  function fetchArticlePreview(url) {
    if (!url) return Promise.resolve(null);
    if (articlePreviewCache[url]) return Promise.resolve(articlePreviewCache[url]);
    if (articlePreviewInflight[url]) return articlePreviewInflight[url];

    articlePreviewInflight[url] = fetch('/api/link-preview?url=' + encodeURIComponent(url), {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error((data && data.error) || 'preview failed');
          articlePreviewCache[url] = data;
          return data;
        });
      })
      .catch(function () {
        articlePreviewCache[url] = { image: '', title: '' };
        return articlePreviewCache[url];
      })
      .finally(function () {
        delete articlePreviewInflight[url];
      });

    return articlePreviewInflight[url];
  }

  function hydrateArticleCards(rootEl) {
    if (!rootEl) return;
    var cards = rootEl.querySelectorAll('.sidebar-article--api[data-article-url]');
    cards.forEach(function (card) {
      var url = card.getAttribute('data-article-url');
      if (!url) return;
      fetchArticlePreview(url).then(function (preview) {
        if (!preview || !card.isConnected) return;
        var titleEl = card.querySelector('.sidebar-article-title');
        if (titleEl && preview.title) {
          titleEl.textContent = preview.title;
        }
        if (!preview.image) return;
        var imageWrap = card.querySelector('.sidebar-article-image');
        var img = card.querySelector('.sidebar-article-thumb');
        var fallback = card.querySelector('.sidebar-article-favicon');
        if (!img || !imageWrap) return;
        img.onload = function () {
          img.hidden = false;
          imageWrap.classList.add('has-thumb');
          if (fallback) fallback.hidden = true;
        };
        img.onerror = function () {
          img.removeAttribute('src');
          img.hidden = true;
          imageWrap.classList.remove('has-thumb');
          if (fallback) fallback.hidden = false;
        };
        // Proxy through same-origin so hotlink-blocked CDNs still render.
        img.src = '/api/link-preview/image?url=' + encodeURIComponent(preview.image);
      });
    });
  }

  function resetArticlesPanel() {
    if (articlesBodyEl) {
      articlesBodyEl.innerHTML = '<p class="sidebar__placeholder">Select a keyword to see source articles.</p>';
    }
  }

  function updateArticlesPanel(d) {
    if (!articlesBodyEl) return;
    var articles = collectApiArticlesForTreeNode(d);
    articlesBodyEl.innerHTML = renderApiArticlesHTML(articles);
    hydrateArticleCards(articlesBodyEl);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function rectsOverlap(a, b) {
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }

  /** Layout nodes whose bounding boxes intersect the tree canvas (respects zoom/pan). */
  function getViewportVisibleTreeKeywords() {
    if (!containerEl || !treeG) return [];
    var rect = containerEl.getBoundingClientRect();
    var inset = 8;
    var view = {
      left: rect.left + inset,
      right: rect.right - inset,
      top: rect.top + inset,
      bottom: rect.bottom - inset
    };
    if (view.right <= view.left || view.bottom <= view.top) return [];

    var seen = {};
    var out = [];
    treeG.selectAll('g.node').each(function (d) {
      var r = this.getBoundingClientRect();
      if (!rectsOverlap(r, view)) return;
      var gid = graphIdFromTreeDisplayName(d.data.name);
      if (seen[gid]) return;
      seen[gid] = true;
      out.push({ gid: gid, label: d.data.name });
    });
    out.sort(function (a, b) {
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
    return out;
  }

  function scheduleRefreshViewportKeywordChips() {
    if (!viewportSectionEl) return;
    if (viewportChipsRaf) return;
    viewportChipsRaf = window.requestAnimationFrame(function () {
      viewportChipsRaf = null;
      refreshViewportKeywordChips();
    });
  }

  function updateResetButtonsDisabledState() {
    if (!drawerRootEl) return;
    var empty = treeDisabledNodes.size === 0;
    drawerRootEl.querySelectorAll('.js-tree-reset-chips').forEach(function (btn) {
      btn.disabled = empty;
    });
  }

  function refreshViewportKeywordChips() {
    if (!viewportSectionEl) return;
    if (!initialized || !root || !treeG) {
      viewportSectionEl.innerHTML =
        '<p class="sidebar-hint" style="margin:0">Keywords here update from whichever tree labels intersect this panel as you pan and zoom.</p>';
      return;
    }
    var visible = getViewportVisibleTreeKeywords();
    var n = visible.length;
    var struck = treeDisabledNodes.size;
    var resetDisabled = struck === 0;

    var chipsHtml = visible.map(function (item) {
      var off = treeDisabledNodes.has(item.gid);
      return (
        '<span class="sidebar-chip sidebar-chip--toggle' +
        (off ? ' sidebar-chip--disabled' : '') +
        '" data-keyword="' +
        escapeHtml(item.gid) +
        '">' +
        escapeHtml(item.label) +
        '</span>'
      );
    }).join('');

    viewportSectionEl.innerHTML =
      '<div class="sidebar-section">' +
      '<div class="sidebar-section-header">' +
      '<div class="sidebar-section-label">Keywords in view</div>' +
      treeResetChipsSvgBtn(resetDisabled) +
      '</div>' +
      '<div class="tree-viewport-meta">' +
      '<strong>' +
      n +
      '</strong> in view' +
      (struck ? ' · <span class="tree-viewport-meta-sub">' + struck + ' struck through</span>' : '') +
      '</div>' +
      '<div class="sidebar-chips">' +
      (chipsHtml || '<span class="sidebar-no-data">Nothing in view — zoom out or pan.</span>') +
      '</div>' +
      '</div>';

    updateResetButtonsDisabledState();
  }

  function bindTreeDrawerChipDelegation() {
    if (!drawerRootEl || treeChipDelegationBound) return;
    treeChipDelegationBound = true;
    drawerRootEl.addEventListener('click', function (e) {
      var resetBtn = e.target.closest('.js-tree-reset-chips');
      if (resetBtn) {
        if (resetBtn.disabled) return;
        e.preventDefault();
        treeDisabledNodes.clear();
        persistTreeDisabledNodes();
        drawerRootEl.querySelectorAll('.sidebar-chip--toggle').forEach(function (c) {
          c.classList.remove('sidebar-chip--disabled');
        });
        updateTreeNodeDisabledVisuals();
        updateResetButtonsDisabledState();
        refreshViewportKeywordChips();
        return;
      }
      var chip = e.target.closest('.sidebar-chip--toggle');
      if (!chip || !drawerRootEl.contains(chip)) return;
      var keyword = chip.getAttribute('data-keyword');
      if (!keyword) return;
      if (treeDisabledNodes.has(keyword)) {
        treeDisabledNodes.delete(keyword);
      } else {
        treeDisabledNodes.add(keyword);
      }
      persistTreeDisabledNodes();
      syncTreeDrawerChipClasses();
      updateTreeNodeDisabledVisuals();
      updateResetButtonsDisabledState();
    });
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
        .attr('opacity', isDisabled ? 0.4 : 1)
        .style('text-decoration', isDisabled ? 'line-through' : 'none')
        .style('text-decoration-thickness', isDisabled ? '1.5px' : null);
    });
  }

  function syncTreeDrawerChipClasses() {
    if (!drawerRootEl) return;
    drawerRootEl.querySelectorAll('.sidebar-chip--toggle').forEach(function (chip) {
      var kw = chip.getAttribute('data-keyword');
      if (!kw) return;
      chip.classList.toggle('sidebar-chip--disabled', treeDisabledNodes.has(kw));
    });
  }

  function treeResetChipsSvgBtn(disabled) {
    return (
      '<button type="button" class="sidebar-reset-btn js-tree-reset-chips" title="Reset all struck-through keywords"' +
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
        escapeHtml(gid) + '">' + escapeHtml(name) + '</span>'
      );
    }).join('');
  }

  function update(source) {
    var treeData = treeLayout(root);
    var treeNodes = treeData.descendants();
    var treeLinks = treeData.links();

    // Fixed horizontal spacing (wide enough for mid-length labels; very long
    // ones still rely on resolveLabelCollisions for vertical clearance).
    treeNodes.forEach(function (d) { d.y = d.depth * DEPTH_DX; });
    resolveLabelCollisions(root);

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
    scheduleRefreshViewportKeywordChips();

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
      var estW = estimateLabelWidth(name, d.depth);
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
    if (detailSectionEl) {
      detailSectionEl.innerHTML = '<p class="sidebar__placeholder">Click on a node in the tree to see its details.</p>';
    }
    resetArticlesPanel();
  }

  function showNodeDetails(d) {
    if (!drawerTitleEl || !detailSectionEl) return;

    var name = d.data.name;
    drawerTitleEl.textContent = name;

    var graphNode = findGraphNodeForTreeNode(d);
    var evidence = (d.data && d.data.evidence) || (graphNode && graphNode.evidence) || '';
    var sourceUrl = (d.data && d.data.sourceUrl) || (graphNode && graphNode.sourceUrl) || '';

    var html = '<div class="sidebar-content">';
    if (evidence) {
      html +=
        '<div class="sidebar-section">' +
        '<div class="sidebar-section-label">Evidence</div>' +
        '<p class="sidebar-description">' + escapeHtml(evidence) + '</p>' +
        (sourceUrl
          ? '<p class="sidebar-description"><a href="' + escapeHtml(sourceUrl) + '" target="_blank" rel="noopener noreferrer">Open source</a></p>'
          : '') +
        '</div>';
    } else {
      html +=
        '<div class="sidebar-section">' +
        '<p class="sidebar-description">Keyword from the intelligence tree. Related source articles appear in the panel below when available.</p>' +
        '</div>';
    }
    html += '</div>';

    detailSectionEl.innerHTML = html;
    updateArticlesPanel(d);
    updateResetButtonsDisabledState();
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
      scheduleRefreshViewportKeywordChips();
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
    scheduleRefreshViewportKeywordChips();
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
    syncTreeDisabledNodesFromShared();
    if (!initialized) {
      setTimeout(initTree, 50);
    } else {
      // Resize SVG to fit container
      var rect = containerEl.getBoundingClientRect();
      if (treeSvg && rect.width > 0) {
        treeSvg.attr('width', rect.width).attr('height', rect.height);
      }
      scheduleRefreshViewportKeywordChips();
    }
  };

  window.addEventListener('kw-data-updated', function () {
    initialized = false;
    syncTreeDisabledNodesFromShared();
    var tab = document.getElementById('kw-tree-tab');
    if (tab && tab.style.display !== 'none') {
      setTimeout(initTree, 50);
    }
  });

  window.addEventListener('shopthat-disabled-keywords-changed', syncTreeDisabledNodesFromShared);

  bindTreeDrawerChipDelegation();
  refreshViewportKeywordChips();
})();
