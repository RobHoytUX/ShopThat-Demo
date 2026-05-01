(function (global) {
  'use strict';

  const KEYWORDS_GRAPH_API = '/api/keywords/graph';

  function normalizeGraphResponse(data) {
    const graph = data && data.data ? data.data : data;
    return {
      nodes: Array.isArray(graph && graph.nodes) ? graph.nodes : [],
      links: Array.isArray(graph && graph.links) ? graph.links : []
    };
  }

  async function request(options) {
    const response = await fetch(KEYWORDS_GRAPH_API, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Graph API failed with ${response.status}`);
    }
    return data;
  }

  async function check() {
    return request({ method: 'GET' });
  }

  async function seed(nodes, links) {
    return request({
      method: 'POST',
      body: JSON.stringify({ nodes, links })
    });
  }

  async function load() {
    return normalizeGraphResponse(await request({ method: 'GET' }));
  }

  global.ShopThatKeywordGraphApi = {
    check,
    load,
    seed
  };
})(typeof window !== 'undefined' ? window : this);
