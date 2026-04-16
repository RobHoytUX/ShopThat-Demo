(function () {
  'use strict';

  var containerEl = document.getElementById('scatterContainer');
  var drawerTitle = document.getElementById('scatterDrawerTitle');
  var drawerBody = document.getElementById('scatterDrawerBody');
  var initialized = false;
  var scatterSvg, scatterG, xScale, yScale, xAxis, yAxis, dotGroup;
  var zoomBehavior;

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

  function buildScatterData() {
    var nodes = window.kwGetNodes ? window.kwGetNodes() : [];
    var getConnected = window.kwGetConnected;
    if (nodes.length === 0 || !getConnected) return [];

    return nodes.filter(function (n) { return n.group !== 0; }).map(function (n) {
      var connections = getConnected(n).size - 1;
      return {
        id: n.id,
        group: n.group,
        value: n.value,
        connections: connections
      };
    });
  }

  function initScatter() {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    var data = buildScatterData();
    if (data.length === 0) {
      containerEl.innerHTML = '<p style="color:#6b7280;padding:2rem;">No keyword data available.</p>';
      return;
    }

    var rect = containerEl.getBoundingClientRect();
    var width = rect.width || 800;
    var height = rect.height || 600;
    var margin = { top: 30, right: 30, bottom: 50, left: 60 };
    var innerW = width - margin.left - margin.right;
    var innerH = height - margin.top - margin.bottom;

    var maxConn = d3.max(data, function (d) { return d.connections; }) || 10;
    var maxVal = d3.max(data, function (d) { return d.value; }) || 100;

    xScale = d3.scaleLinear()
      .domain([0, maxConn + 2])
      .range([0, innerW]);

    yScale = d3.scaleLinear()
      .domain([0, maxVal + 10])
      .range([innerH, 0]);

    scatterSvg = d3.select(containerEl).append('svg')
      .attr('width', width)
      .attr('height', height);

    var clipId = 'scatter-clip-' + Date.now();
    scatterSvg.append('defs').append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH);

    scatterG = scatterSvg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Axes
    xAxis = scatterG.append('g')
      .attr('class', 'scatter-axis')
      .attr('transform', 'translate(0,' + innerH + ')')
      .call(d3.axisBottom(xScale).ticks(Math.min(maxConn + 2, 15)));

    yAxis = scatterG.append('g')
      .attr('class', 'scatter-axis')
      .call(d3.axisLeft(yScale));

    // Axis labels
    scatterG.append('text')
      .attr('class', 'scatter-axis-label')
      .attr('x', innerW / 2)
      .attr('y', innerH + 42)
      .attr('text-anchor', 'middle')
      .text('Connections');

    scatterG.append('text')
      .attr('class', 'scatter-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .text('Keyword Value');

    // Dot container with clip
    dotGroup = scatterG.append('g')
      .attr('clip-path', 'url(#' + clipId + ')');

    // Grid lines
    dotGroup.append('g')
      .attr('class', 'scatter-grid')
      .selectAll('line')
      .data(yScale.ticks())
      .enter().append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', function (d) { return yScale(d); })
      .attr('y2', function (d) { return yScale(d); });

    dotGroup.append('g')
      .attr('class', 'scatter-grid')
      .selectAll('line')
      .data(xScale.ticks())
      .enter().append('line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('x1', function (d) { return xScale(d); })
      .attr('x2', function (d) { return xScale(d); });

    // Dots
    var dots = dotGroup.selectAll('.scatter-dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'scatter-dot')
      .attr('cx', function (d) { return xScale(d.connections); })
      .attr('cy', function (d) { return yScale(d.value); })
      .attr('r', 0)
      .attr('fill', function (d) { return groupColorMap[d.group] || '#6366f1'; })
      .attr('fill-opacity', 0.7)
      .attr('stroke', function (d) { return groupColorMap[d.group] || '#6366f1'; })
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    // Animate dots in
    dots.transition().duration(600).delay(function (d, i) { return i * 3; })
      .attr('r', 7);

    // Hover
    dots.on('mouseover', function (event, d) {
        d3.select(this).transition().duration(150).attr('r', 11).attr('fill-opacity', 1);
        showTooltip(event, d);
      })
      .on('mouseout', function () {
        d3.select(this).transition().duration(150).attr('r', 7).attr('fill-opacity', 0.7);
        hideTooltip();
      })
      .on('click', function (event, d) {
        event.stopPropagation();
        selectPoint(d);

        // Highlight selected
        dots.attr('stroke-width', 1.5).attr('r', 7).attr('fill-opacity', 0.7);
        d3.select(this).attr('stroke-width', 3).attr('r', 10).attr('fill-opacity', 1);
      });

    // Legend
    var legend = scatterG.append('g')
      .attr('transform', 'translate(' + (innerW - 130) + ',10)');

    [1, 2, 3, 4].forEach(function (g, i) {
      var row = legend.append('g').attr('transform', 'translate(0,' + (i * 20) + ')');
      row.append('circle').attr('r', 5).attr('cx', 5).attr('cy', 0)
        .attr('fill', groupColorMap[g]).attr('fill-opacity', 0.7);
      row.append('text').attr('x', 16).attr('dy', '0.35em')
        .attr('class', 'scatter-legend-text')
        .text(groupLabels[g]);
    });

    // Zoom
    zoomBehavior = d3.zoom()
      .scaleExtent([0.5, 20])
      .extent([[0, 0], [innerW, innerH]])
      .on('zoom', function (event) {
        var newX = event.transform.rescaleX(xScale);
        var newY = event.transform.rescaleY(yScale);

        xAxis.call(d3.axisBottom(newX).ticks(Math.min(maxConn + 2, 15)));
        yAxis.call(d3.axisLeft(newY));

        dots.attr('cx', function (d) { return newX(d.connections); })
            .attr('cy', function (d) { return newY(d.value); });

        dotGroup.selectAll('.scatter-grid line').remove();
      });

    scatterSvg.call(zoomBehavior);

    // Tooltip element
    var tooltip = d3.select(containerEl).append('div')
      .attr('class', 'scatter-tooltip')
      .style('display', 'none');

    function showTooltip(event, d) {
      var containerRect = containerEl.getBoundingClientRect();
      tooltip.style('display', 'block')
        .html('<strong>' + d.id + '</strong><br>Connections: ' + d.connections + '<br>Value: ' + d.value + '<br>Group: ' + (groupLabels[d.group] || 'Other'))
        .style('left', (event.clientX - containerRect.left + 12) + 'px')
        .style('top', (event.clientY - containerRect.top - 10) + 'px');
    }

    function hideTooltip() {
      tooltip.style('display', 'none');
    }

    initialized = true;
  }

  function selectPoint(d) {
    if (drawerTitle) drawerTitle.textContent = d.id;
    if (drawerBody) {
      var articlesHTML = window.kwGetArticlesHTML ? window.kwGetArticlesHTML(d.id) : '';
      var nodes = window.kwGetNodes ? window.kwGetNodes() : [];
      var getConnected = window.kwGetConnected;
      var connNodes = [];
      if (getConnected) {
        var connIds = getConnected(nodes.find(function (n) { return n.id === d.id; }) || d);
        connNodes = nodes.filter(function (n) { return connIds.has(n.id) && n.id !== d.id; });
      }
      drawerBody.innerHTML =
        '<div class="sidebar-stat"><span class="sidebar-stat-value">' + d.connections + '</span><span class="sidebar-stat-label">connections</span></div>' +
        '<div class="sidebar-stat"><span class="sidebar-stat-value">' + d.value + '</span><span class="sidebar-stat-label">keyword value</span></div>' +
        '<div class="sidebar-stat"><span class="sidebar-stat-value">' + (groupLabels[d.group] || 'Other') + '</span><span class="sidebar-stat-label">group</span></div>' +
        '<div class="sidebar-connections"><h3>Connected Keywords</h3>' + connNodes.map(function (c) { return '<span class="sidebar-connection-tag">' + c.id + '</span>'; }).join('') + '</div>' +
        '<div class="sidebar-articles"><h3>Related Articles</h3>' + articlesHTML + '</div>';
    }
  }

  window.kwShowScatterTab = function () {
    if (!initialized) {
      setTimeout(initScatter, 50);
    } else {
      var rect = containerEl.getBoundingClientRect();
      if (scatterSvg && rect.width > 0) {
        scatterSvg.attr('width', rect.width).attr('height', rect.height);
      }
    }
  };

  window.addEventListener('kw-data-updated', function () {
    initialized = false;
    var tab = document.getElementById('kw-scatter-tab');
    if (tab && tab.style.display !== 'none') {
      setTimeout(initScatter, 50);
    }
  });
})();
