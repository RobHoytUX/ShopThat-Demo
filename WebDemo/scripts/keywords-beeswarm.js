(function () {
  'use strict';

  var containerEl = document.getElementById('beeswarmContainer');
  var drawerTitle = document.getElementById('beeswarmDrawerTitle');
  var drawerBody = document.getElementById('beeswarmDrawerBody');
  var initialized = false;
  var beeswarmDotSel = null;

  var groupColorMap = {
    0: '#1e3a8a',
    1: '#6366f1',
    2: '#8b5cf6',
    3: '#f59e0b',
    4: '#10b981'
  };

  var groupLabels = {
    0: 'Root',
    1: 'Primary',
    2: 'Connected',
    3: 'Secondary',
    4: 'Tertiary'
  };

  function initBeeswarm() {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    var nodes = window.kwGetNodes ? window.kwGetNodes() : [];
    var getConnected = window.kwGetConnected;
    if (nodes.length === 0 || !getConnected) {
      containerEl.innerHTML = '<p style="color:#6b7280;padding:2rem;">No keyword data available.</p>';
      return;
    }

    var data = nodes.filter(function (n) { return n.group !== 0; }).map(function (n) {
      return {
        id: n.id,
        group: n.group,
        value: n.value,
        connections: getConnected(n).size - 1
      };
    });

    var rect = containerEl.getBoundingClientRect();
    var width = rect.width || 900;
    var height = rect.height || 600;
    var margin = { top: 40, right: 30, bottom: 50, left: 60 };
    var innerW = width - margin.left - margin.right;
    var innerH = height - margin.top - margin.bottom;

    var groups = [1, 2, 3, 4];
    var xScale = d3.scaleBand()
      .domain(groups.map(function (g) { return groupLabels[g]; }))
      .range([0, innerW])
      .padding(0.3);

    var maxVal = d3.max(data, function (d) { return d.value; }) || 100;
    var yScale = d3.scaleLinear()
      .domain([0, maxVal + 10])
      .range([innerH, 0]);

    var radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(data, function (d) { return d.connections; }) || 10])
      .range([4, 16]);

    var svg = d3.select(containerEl).append('svg')
      .attr('width', width)
      .attr('height', height);

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Axes
    g.append('g')
      .attr('class', 'scatter-axis')
      .attr('transform', 'translate(0,' + innerH + ')')
      .call(d3.axisBottom(xScale));

    g.append('g')
      .attr('class', 'scatter-axis')
      .call(d3.axisLeft(yScale));

    // Axis labels
    g.append('text')
      .attr('class', 'scatter-axis-label')
      .attr('x', innerW / 2)
      .attr('y', innerH + 42)
      .attr('text-anchor', 'middle')
      .text('Keyword Group');

    g.append('text')
      .attr('class', 'scatter-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .text('Keyword Value');

    // Group background bands
    groups.forEach(function (grp) {
      var label = groupLabels[grp];
      var x0 = xScale(label);
      if (x0 === undefined) return;
      g.append('rect')
        .attr('x', x0)
        .attr('y', 0)
        .attr('width', xScale.bandwidth())
        .attr('height', innerH)
        .attr('fill', groupColorMap[grp])
        .attr('fill-opacity', 0.04)
        .attr('rx', 8);
    });

    // Simulation for beeswarm collision avoidance
    var simData = data.map(function (d) {
      var label = groupLabels[d.group];
      return {
        id: d.id,
        group: d.group,
        value: d.value,
        connections: d.connections,
        x: xScale(label) + xScale.bandwidth() / 2,
        y: yScale(d.value),
        r: radiusScale(d.connections)
      };
    });

    var simulation = d3.forceSimulation(simData)
      .force('x', d3.forceX(function (d) { return xScale(groupLabels[d.group]) + xScale.bandwidth() / 2; }).strength(0.8))
      .force('y', d3.forceY(function (d) { return yScale(d.value); }).strength(1))
      .force('collide', d3.forceCollide(function (d) { return d.r + 1.5; }).iterations(3))
      .stop();

    for (var i = 0; i < 120; i++) simulation.tick();

    // Tooltip
    var tooltip = d3.select(containerEl).append('div')
      .attr('class', 'scatter-tooltip')
      .style('display', 'none');

    // Dots
    var dots = g.selectAll('.beeswarm-dot')
      .data(simData)
      .enter().append('circle')
      .attr('class', 'beeswarm-dot')
      .attr('cx', function (d) { return d.x; })
      .attr('cy', function (d) { return d.y; })
      .attr('r', 0)
      .attr('fill', function (d) { return groupColorMap[d.group] || '#6366f1'; })
      .attr('fill-opacity', 0.75)
      .attr('stroke', function (d) { return groupColorMap[d.group] || '#6366f1'; })
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    dots.transition().duration(600).delay(function (d, i) { return i * 2; })
      .attr('r', function (d) { return d.r; });

    beeswarmDotSel = g.selectAll('.beeswarm-dot');

    dots.on('mouseover', function (event, d) {
        d3.select(this).transition().duration(100)
          .attr('r', d.r + 3).attr('fill-opacity', 1);
        var cr = containerEl.getBoundingClientRect();
        tooltip.style('display', 'block')
          .html('<strong>' + d.id + '</strong><br>Value: ' + d.value + '<br>Connections: ' + d.connections + '<br>Group: ' + (groupLabels[d.group] || 'Other'))
          .style('left', (event.clientX - cr.left + 12) + 'px')
          .style('top', (event.clientY - cr.top - 10) + 'px');
      })
      .on('mouseout', function (event, d) {
        d3.select(this).transition().duration(100)
          .attr('r', d.r).attr('fill-opacity', 0.75);
        tooltip.style('display', 'none');
      })
      .on('click', function (event, d) {
        event.stopPropagation();
        selectDot(d);
        dots.attr('stroke-width', 1.5).attr('fill-opacity', 0.75);
        d3.select(this).attr('stroke-width', 3).attr('fill-opacity', 1);
      });

    // Legend
    var legend = g.append('g')
      .attr('transform', 'translate(' + (innerW - 140) + ',-20)');

    legend.append('text')
      .attr('class', 'scatter-axis-label')
      .attr('dy', '0.35em')
      .text('Size = connections');

    // Zoom
    var zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .on('zoom', function (event) {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

    initialized = true;
  }

  window.kwBeeswarmSearch = function (raw) {
    if (!beeswarmDotSel || beeswarmDotSel.empty()) return;
    var q = (raw || '').trim();
    var ids = q && window.kwNeighborhoodIdsForSearch ? window.kwNeighborhoodIdsForSearch(q) : null;
    if (!q) {
      beeswarmDotSel.interrupt('kwsearch');
      beeswarmDotSel.transition('kwsearch').duration(150)
        .attr('fill-opacity', 0.75)
        .style('opacity', 1)
        .style('pointer-events', 'auto');
      return;
    }
    if (!ids || ids.size === 0) {
      beeswarmDotSel.interrupt('kwsearch');
      beeswarmDotSel.transition('kwsearch').duration(150)
        .attr('fill-opacity', 0.06)
        .style('pointer-events', 'none');
      return;
    }
    beeswarmDotSel.interrupt('kwsearch');
    beeswarmDotSel.transition('kwsearch').duration(150)
      .attr('fill-opacity', function (d) { return ids.has(d.id) ? 0.95 : 0.08; })
      .style('pointer-events', function (d) { return ids.has(d.id) ? 'auto' : 'none'; });
  };

  function selectDot(d) {
    if (drawerTitle) drawerTitle.textContent = d.id;
    if (!drawerBody) return;

    var nodes = window.kwGetNodes ? window.kwGetNodes() : [];
    var getConnected = window.kwGetConnected;
    var articlesHTML = window.kwGetArticlesHTML ? window.kwGetArticlesHTML(d.id) : '';
    var connNodes = [];

    if (getConnected) {
      var node = nodes.find(function (n) { return n.id === d.id; });
      if (node) {
        var connIds = getConnected(node);
        connNodes = nodes.filter(function (n) { return connIds.has(n.id) && n.id !== d.id; });
      }
    }

    drawerBody.innerHTML =
      '<div class="sidebar-stat"><span class="sidebar-stat-value">' + d.value + '</span><span class="sidebar-stat-label">keyword value</span></div>' +
      '<div class="sidebar-stat"><span class="sidebar-stat-value">' + d.connections + '</span><span class="sidebar-stat-label">connections</span></div>' +
      '<div class="sidebar-stat"><span class="sidebar-stat-value">' + (groupLabels[d.group] || 'Other') + '</span><span class="sidebar-stat-label">group</span></div>' +
      '<div class="sidebar-connections"><h3>Connected Keywords</h3>' + connNodes.map(function (c) { return '<span class="sidebar-connection-tag">' + c.id + '</span>'; }).join('') + '</div>' +
      '<div class="sidebar-articles"><h3>Related Articles</h3>' + articlesHTML + '</div>';
  }

  window.kwShowBeeswarmTab = function () {
    if (!initialized) {
      setTimeout(initBeeswarm, 50);
    } else {
      var rect = containerEl.getBoundingClientRect();
      if (rect.width > 0) {
        var svg = containerEl.querySelector('svg');
        if (svg) {
          svg.setAttribute('width', rect.width);
          svg.setAttribute('height', rect.height);
        }
      }
    }
  };

  window.addEventListener('kw-data-updated', function () {
    initialized = false;
    var tab = document.getElementById('kw-beeswarm-tab');
    if (tab && tab.style.display !== 'none') {
      setTimeout(initBeeswarm, 50);
    }
  });
})();
