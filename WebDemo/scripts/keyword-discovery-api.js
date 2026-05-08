/**
 * Keyword Discovery API — GET /keyword-details
 * Base: http://18.221.156.51 (S3-backed article thumbnails for direct UI use)
 */
(function (global) {
  'use strict';

  var BASE_URL = 'http://18.221.156.51';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fetchKeywordDetails(keyword) {
    var q = String(keyword || '').trim();
    if (!q) return Promise.reject(new Error('Keyword required'));
    var url = BASE_URL + '/keyword-details?keyword=' + encodeURIComponent(q);
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Keyword API ' + res.status);
      return res.json();
    });
  }

  function relatedArticlesToMapProducts(data, limit) {
    var articles = (data && data.related_articles) || [];
    var max = limit != null ? limit : 6;
    return articles.slice(0, max).map(function (a, i) {
      var img = a.image_url || '';
      var link = a.url || img || '#';
      var summary = a.summary ? String(a.summary) : '';
      return {
        id: 'discovery-' + i + '-' + String(link).replace(/\W/g, '').slice(-16),
        title: a.title || 'Discovery',
        image: img,
        src: img,
        model: summary.length > 90 ? summary.slice(0, 90) + '…' : summary,
        price: typeof a.score === 'number' ? ('Score ' + a.score.toFixed(2)) : '',
        discoveryUrl: link,
        isDiscoveryProduct: true
      };
    }).filter(function (p) {
      return !!p.image;
    });
  }

  function normalizeDashboardArticles(data, limit) {
    var articles = (data && data.related_articles) || [];
    var max = limit != null ? limit : 8;
    return articles.slice(0, max).map(function (a) {
      var url = a.url || a.image_url || '#';
      return {
        title: a.title || 'Article',
        source: 'Discovery',
        views:
          typeof a.score === 'number'
            ? a.score.toFixed(2) + ' relevance'
            : 'Keyword match',
        image: a.image_url || '',
        url: url
      };
    }).filter(function (x) {
      return !!x.image;
    });
  }

  function appendExternalLinkIcon(link) {
    var linkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    linkIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    linkIcon.setAttribute('viewBox', '0 0 24 24');
    linkIcon.setAttribute('fill', 'none');
    linkIcon.setAttribute('stroke', 'currentColor');
    linkIcon.setAttribute('stroke-width', '2');
    linkIcon.setAttribute('width', '16');
    linkIcon.setAttribute('height', '16');
    var linkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    linkPath.setAttribute(
      'd',
      'M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25'
    );
    linkPath.setAttribute('stroke-linecap', 'round');
    linkPath.setAttribute('stroke-linejoin', 'round');
    linkIcon.appendChild(linkPath);
    link.appendChild(linkIcon);
  }

  /**
   * @param {HTMLElement} container
   * @param {Array} products — items with title, image|src, model, price, discoveryUrl
   * @param {object} options — variant: 'dashboard'|'chatbot', leafletMap, storeLocations, clearMarkers, markerRef, onCardClick
   */
  function renderMapProductStrip(container, products, options) {
    if (!container) return;
    options = options || {};
    var variant = options.variant === 'chatbot' ? 'chatbot' : 'dashboard';
    var prefix = variant === 'chatbot' ? 'chatbot-map-product' : 'dashboard-map-product';
    var leafletMap = options.leafletMap;
    var storeLocations = options.storeLocations || [
      { lat: 40.7632, lng: -73.9732 },
      { lat: 40.7245, lng: -73.9975 }
    ];
    var clearMarkers = options.clearMarkers;
    var markerRef = options.markerRef;
    var onCardClick = options.onCardClick;

    if (typeof clearMarkers === 'function') clearMarkers();

    container.replaceChildren();

    products.forEach(function (product, index) {
      product.location = {
        lat: storeLocations[index % storeLocations.length].lat,
        lng: storeLocations[index % storeLocations.length].lng
      };

      var card = document.createElement('div');
      card.className = variant === 'chatbot' ? 'chatbot-map-product-card' : 'dashboard-map-product';

      var img = document.createElement('img');
      img.className = prefix + '-image';
      img.src = product.image || product.src || '';
      img.alt = product.title || '';

      var info = document.createElement('div');
      info.className = prefix + '-info';
      var titleEl = document.createElement('h3');
      titleEl.className = prefix + '-title';
      titleEl.textContent = product.title || '';
      var modelEl = document.createElement('p');
      modelEl.className = prefix + '-model';
      modelEl.textContent = product.model || '';
      var priceEl = document.createElement('p');
      priceEl.className = prefix + '-price';
      priceEl.textContent = product.price || '';

      var linkHref =
        product.discoveryUrl ||
        'https://us.louisvuitton.com/eng-us/search/' +
          encodeURIComponent(product.model || product.title || 'Louis Vuitton');
      var link = document.createElement('a');
      link.className = prefix + '-link';
      link.href = linkHref;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = variant === 'chatbot' ? 'View on LV Store ' : 'Open resource ';
      appendExternalLinkIcon(link);

      info.appendChild(titleEl);
      info.appendChild(modelEl);
      info.appendChild(priceEl);
      info.appendChild(link);

      card.appendChild(img);
      card.appendChild(info);

      card.addEventListener('click', function (e) {
        if (e.target.tagName === 'A' || (e.target.closest && e.target.closest('a'))) return;
        if (typeof onCardClick === 'function') onCardClick(product, e);
      });

      container.appendChild(card);

      if (leafletMap && product.location && typeof L !== 'undefined') {
        var marker = L.marker([product.location.lat, product.location.lng])
          .bindPopup('<b>' + escapeHtml(product.title) + '</b><br>' + escapeHtml(product.price || ''))
          .addTo(leafletMap);
        if (markerRef && Array.isArray(markerRef)) markerRef.push(marker);
      }
    });
  }

  global.ShopThatKeywordDiscovery = {
    BASE_URL: BASE_URL,
    fetchKeywordDetails: fetchKeywordDetails,
    relatedArticlesToMapProducts: relatedArticlesToMapProducts,
    normalizeDashboardArticles: normalizeDashboardArticles,
    renderMapProductStrip: renderMapProductStrip
  };
})(typeof window !== 'undefined' ? window : this);
