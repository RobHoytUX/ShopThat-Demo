(function (global) {
  'use strict';

  function linkEndpointId(endpoint) {
    return typeof endpoint === 'object' && endpoint !== null ? endpoint.id : endpoint;
  }

  function connectedNodeIds(links, nodeId) {
    const connectedIds = new Set();
    connectedIds.add(nodeId);

    links.forEach(link => {
      const sourceId = linkEndpointId(link.source);
      const targetId = linkEndpointId(link.target);

      if (sourceId === nodeId) connectedIds.add(targetId);
      if (targetId === nodeId) connectedIds.add(sourceId);
    });

    return connectedIds;
  }

  function neighborhoodIdsForSearchQuery(nodes, links, raw) {
    const q = String(raw || '').trim().toLowerCase();
    if (!q) return null;

    const targets = nodes.filter(node => String(node.id || '').toLowerCase().includes(q));
    if (targets.length === 0) return new Set();

    const ids = new Set();
    targets.forEach(target => {
      connectedNodeIds(links, target.id).forEach(id => ids.add(id));
    });
    return ids;
  }

  global.ShopThatKeywordGraphUtils = {
    connectedNodeIds,
    neighborhoodIdsForSearchQuery
  };
})(typeof window !== 'undefined' ? window : this);
