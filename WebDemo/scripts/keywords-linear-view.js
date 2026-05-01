(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sortedGroups(nodes, keywordCategories, categoryOrder) {
    const grouped = {};
    nodes.forEach(node => {
      if (node.group === 0) return;
      const category = keywordCategories[node.id] || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(node);
    });

    Object.values(grouped).forEach(items => items.sort((a, b) => b.value - a.value));

    return Object.keys(grouped)
      .sort((a, b) => {
        const ai = categoryOrder.indexOf(a);
        const bi = categoryOrder.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .map(category => ({ category, items: grouped[category] }));
  }

  function categoryHeader(category, count) {
    return '<div class="linear-view__category"><span class="linear-view__category-label">' +
      escapeHtml(category) +
      '</span><span class="linear-view__category-count">' +
      count +
      '</span><div class="linear-view__category-line"></div></div>';
  }

  function itemHtml(node, options, delay) {
    const color = options.groupColors[node.group] || options.groupColors[1] || {};
    const count = options.getConnectedNodeIds(node).size - 1;
    const style = delay == null ? '' : ' style="animation-delay: ' + delay + 's"';
    return '<div class="linear-view__item" data-id="' + escapeHtml(node.id) + '"' + style + '>' +
      '<div class="linear-view__item-indicator" style="background:' + escapeHtml(color.gradient || '') + '"></div>' +
      '<div class="linear-view__item-info"><span class="linear-view__item-name">' +
      escapeHtml(node.id) +
      '</span><span class="linear-view__item-meta">' +
      count +
      ' connections</span></div>' +
      '<svg class="linear-view__item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</div>';
  }

  function connectedListHtml(nodes, options) {
    let itemIndex = 0;
    return sortedGroups(nodes, options.keywordCategories, options.categoryOrder).map(group => {
      const itemsHtml = group.items.map(node => {
        const delay = itemIndex * 0.04;
        itemIndex += 1;
        return itemHtml(node, options, delay);
      }).join('');
      return categoryHeader(group.category, group.items.length) + itemsHtml;
    }).join('');
  }

  function fullLinearViewHtml(nodeData, connectedNodes, options) {
    const mainColor = options.groupColors[nodeData.group] || options.groupColors[1] || {};
    return '<div class="linear-view__main">' +
      '<div class="linear-view__main-bubble" style="background: ' + escapeHtml(mainColor.gradient || '') + '">' +
      '<span class="linear-view__main-name">' + escapeHtml(options.nodeLabel(nodeData)) + '</span>' +
      '</div>' +
      '<div class="linear-view__main-meta">' +
      '<span class="linear-view__main-group">' + escapeHtml(mainColor.label || '') + '</span>' +
      '<span class="linear-view__main-connections">' + connectedNodes.length + ' connections</span>' +
      '</div>' +
      '</div>' +
      '<div class="linear-view__divider"><span>Connected Keywords</span></div>' +
      '<div class="linear-view__list">' + connectedListHtml(connectedNodes, options) + '</div>';
  }

  function listTabSections(nodes, options) {
    return sortedGroups(nodes, options.keywordCategories, options.categoryOrder).map(group => ({
      category: group.category,
      html: categoryHeader(group.category, group.items.length),
      items: group.items.map(node => ({
        id: node.id,
        html: itemHtml(node, options)
      }))
    }));
  }

  global.ShopThatKeywordsLinearView = {
    fullLinearViewHtml,
    listTabSections
  };
})(typeof window !== 'undefined' ? window : this);
