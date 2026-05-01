(function (global) {
  'use strict';

  function childrenOf(nodes, parentId) {
    return nodes.filter(function (node) {
      return node.parent === parentId;
    });
  }

  function collapseSubtree(nodes, expandedIds, id) {
    var stack = [id];
    while (stack.length) {
      var current = stack.pop();
      expandedIds.delete(current);
      childrenOf(nodes, current).forEach(function (child) {
        stack.push(child.id);
      });
    }
  }

  function visibleNodeIds(nodes, expandedIds) {
    var visible = new Set();
    var rootNode = nodes.find(function (node) { return node.isRoot; }) ||
                   nodes.find(function (node) { return node.id === 'LVMH'; });
    if (!rootNode) return visible;

    visible.add(rootNode.id);

    var queue = [rootNode.id];
    while (queue.length) {
      var current = queue.shift();
      if (!expandedIds.has(current)) continue;

      childrenOf(nodes, current).forEach(function (child) {
        if (!visible.has(child.id)) {
          visible.add(child.id);
          queue.push(child.id);
        }
      });
    }

    return visible;
  }

  function deepestExpandedId(nodes, expandedIds) {
    var nodesById = {};
    nodes.forEach(function (node) {
      nodesById[node.id] = node;
    });

    function depthOf(id) {
      var depth = 0;
      var current = nodesById[id];
      while (current && current.parent) {
        depth += 1;
        current = nodesById[current.parent];
      }
      return depth;
    }

    var deepest = null;
    var deepestDepth = -1;
    expandedIds.forEach(function (id) {
      var depth = depthOf(id);
      if (depth > deepestDepth) {
        deepestDepth = depth;
        deepest = id;
      }
    });

    return deepest;
  }

  function nodeLabel(node) {
    if (!node) return '';
    if (node.id === 'LVMH' || (node.group === 0 && node.isRoot)) return 'Louis Vuitton';
    return node.id;
  }

  global.ShopThatKeywordsBubbleState = {
    childrenOf,
    collapseSubtree,
    deepestExpandedId,
    nodeLabel,
    visibleNodeIds
  };
})(typeof window !== 'undefined' ? window : this);
