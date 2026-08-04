(function (global) {
  'use strict';

  var TREE_URL = '/api/keywords/tree';
  var DEFAULT_BRAND_ID = 'lv-lvmh';
  var DEFAULT_SUBJECT_ID = 'store-nyc-57th';

  // Human labels for taxonomy_path segments, matching the API docs screenshots.
  var SEGMENT_LABELS = {
    root: 'Louis Vuitton',
    heritage: 'Heritage',
    artist: 'Artist Collaborations',
    kusama: 'Yayoi Kusama',
    murakami: 'Takashi Murakami',
    motif: 'Motifs',
    'polka-dots': 'Polka dots',
    'infinity-mirrors': 'Infinity Rooms',
    pumpkin: 'Pumpkin',
    venue: 'Venues',
    'kusama-museum': 'Kusama Museum',
    nybg: 'NY Botanical Garden',
    campaign: 'Campaigns',
    face: 'Faces',
    photographer: 'Photographers',
    experience: 'Experiences and Culture',
    partnership: 'Cultural Partnerships',
    frick: 'The Frick Collection',
    dining: 'Dining',
    exhibition: 'Exhibitions',
    'crafting-dreams': 'Crafting Dreams',
    'visionary-journeys': 'Visionary Journeys',
    location: 'Locations',
    'new-york': 'New York',
    paris: 'Paris',
    london: 'London',
    tokyo: 'Tokyo',
    'saint-tropez': 'Saint-Tropez',
    store: 'Stores',
    fondation: 'Fondation LV',
    'lv-dream': 'LV Dream',
    popup: 'Pop-ups',
    products: 'Products',
    fragrance: 'Fragrance',
    'leather-goods': 'Leather Goods',
    'ready-to-wear': 'Ready to Wear',
    'objets-nomades': 'Objets Nomades',
    bio: 'Biography',
    culture: 'Culture',
    gallery: 'Galleries',
    museum: 'Museums',
    hotels: 'Hotels',
    'fine-dining': 'Fine dining',
    seafood: 'Seafood',
    cafe: 'Café',
    'hotel-bar': 'Hotel bar',
    design: 'Design',
    landmark: 'Landmark'
  };

  function humanizeSegment(segment) {
    var key = String(segment || '').toLowerCase();
    if (SEGMENT_LABELS[key]) return SEGMENT_LABELS[key];
    return key
      .split('-')
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  function pathSegments(taxonomyPath) {
    return String(taxonomyPath || '')
      .split('.')
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .filter(function (s) { return s.toLowerCase() !== 'root'; });
  }

  /**
   * Turn the flat API tree (taxonomy_path + optional children) into the
   * {nodes, links} shape the keywords page already renders.
   */
  function apiTreeToGraph(payload) {
    var nodes = [];
    var links = [];
    var byId = Object.create(null);
    var linkKeys = Object.create(null);

    function addNode(node) {
      if (!node || !node.id) return null;
      if (byId[node.id]) return byId[node.id];
      byId[node.id] = node;
      nodes.push(node);
      return node;
    }

    function addLink(source, target) {
      if (!source || !target || source === target) return;
      var key = source < target ? source + '|' + target : target + '|' + source;
      if (linkKeys[key]) return;
      linkKeys[key] = true;
      links.push({ source: source, target: target });
    }

    var isBrand = !!(payload && payload.brand_id);
    var rootId = isBrand ? 'LVMH' : String((payload && payload.subject_id) || 'store-root');
    var rootLabel = isBrand
      ? String((payload && payload.brand_label) || 'Louis Vuitton')
      : String((payload && payload.subject_label) || 'Store');

    addNode({
      id: rootId,
      group: 0,
      value: 100,
      isRoot: true,
      apiLabel: rootLabel,
      evidence: '',
      sourceUrl: '',
      taxonomyPath: 'root',
      fromApi: true
    });

    // Ensure a stable category node for every taxonomy_path prefix.
    function ensurePathNodes(segments) {
      var parentId = rootId;
      segments.forEach(function (segment, index) {
        var pathSoFar = segments.slice(0, index + 1).join('.');
        var label = humanizeSegment(segment);
        var nodeId = 'tax:' + pathSoFar;
        if (!byId[nodeId]) {
          addNode({
            id: nodeId,
            group: Math.min(3, index + 1),
            value: Math.max(55, 92 - index * 8),
            isArea: true,
            parent: parentId,
            apiLabel: label,
            taxonomyPath: pathSoFar,
            fromApi: true
          });
        } else if (!byId[nodeId].parent) {
          byId[nodeId].parent = parentId;
        }
        addLink(parentId, nodeId);
        parentId = nodeId;
      });
      return parentId;
    }

    function addLeaf(item, parentId, group) {
      if (!item) return null;
      var label = String(item.label || '').trim();
      if (!label) return null;
      var nodeId = String(item.id || ('leaf:' + parentId + ':' + label));
      if (byId[nodeId]) {
        if (item.evidence && !byId[nodeId].evidence) byId[nodeId].evidence = item.evidence;
        if (item.source_url && !byId[nodeId].sourceUrl) byId[nodeId].sourceUrl = item.source_url;
        return nodeId;
      }
      addNode({
        id: nodeId,
        group: group || 4,
        value: 64,
        parent: parentId,
        apiLabel: label,
        evidence: item.evidence || '',
        sourceUrl: item.source_url || '',
        taxonomyPath: item.taxonomy_path || '',
        detailAvailable: !!item.detail_available,
        fromApi: true,
        fromAi: true
      });
      addLink(parentId, nodeId);
      return nodeId;
    }

    (payload && payload.nodes ? payload.nodes : []).forEach(function (item) {
      var segments = pathSegments(item.taxonomy_path);
      var pathParentId = segments.length ? ensurePathNodes(segments) : rootId;
      var leafParent = addLeaf(item, pathParentId, 4) || pathParentId;

      if (Array.isArray(item.children)) {
        item.children.forEach(function (child) {
          addLeaf(child, leafParent, 4);
        });
      }
    });

    return {
      nodes: nodes,
      links: links,
      meta: {
        view: isBrand ? 'brand' : 'store',
        brandId: payload && payload.brand_id || '',
        subjectId: payload && payload.subject_id || '',
        label: rootLabel
      }
    };
  }

  async function fetchTree(options) {
    var opts = options || {};
    var params = new URLSearchParams();
    if (opts.subjectId) params.set('subject_id', opts.subjectId);
    else params.set('brand_id', opts.brandId || DEFAULT_BRAND_ID);

    var response = await fetch(TREE_URL + '?' + params.toString(), {
      method: 'GET',
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(data.error || ('Keywords tree failed with ' + response.status));
    }
    return data;
  }

  async function loadGraph(options) {
    var payload = await fetchTree(options);
    return apiTreeToGraph(payload);
  }

  global.ShopThatKeywordsTreeApi = {
    TREE_URL: TREE_URL,
    DEFAULT_BRAND_ID: DEFAULT_BRAND_ID,
    DEFAULT_SUBJECT_ID: DEFAULT_SUBJECT_ID,
    fetchTree: fetchTree,
    apiTreeToGraph: apiTreeToGraph,
    loadGraph: loadGraph,
    humanizeSegment: humanizeSegment
  };
})(typeof window !== 'undefined' ? window : this);
