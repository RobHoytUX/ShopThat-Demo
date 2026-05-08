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

  function isGenericDiscoveryTitle(raw) {
    var t = String(raw || '')
      .trim()
      .toLowerCase();
    if (!t) return true;
    if (t === 'luxury - collection' || t === 'luxury — collection') return true;
    return /^luxury\s*[-–]\s*collection$/i.test(t);
  }

  /** Pull a readable line from API summary (product/restaurant/art context). */
  function cleanSummaryText(summary) {
    var s = String(summary || '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    var nameM = s.match(/^name\s*:\s*(.+)$/i);
    if (nameM && nameM[1]) return nameM[1].trim();
    var m = s.match(/^([^:]+):(.*)$/);
    if (
      m &&
      (m[1].toLowerCase().indexOf('subject') !== -1 || m[1].toLowerCase().indexOf('details') !== -1)
    ) {
      return m[2].trim() || m[1].trim();
    }
    return s;
  }

  /** Short headline (~one line); used when titles are placeholders. */
  function headlineFromDiscovery(a) {
    var title = String(a.title || '').trim();
    var summary = cleanSummaryText(a.summary);
    if (!isGenericDiscoveryTitle(title) && title.length > 2) return title;

    var ex = excerptText(summary, 95);
    if (ex) return ex;

    if (title) return title;
    return 'Related match';
  }

  /** Body excerpt beneath headline (distinct from cropped headline when possible). */
  function excerptText(full, maxLen) {
    var s = String(full || '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    maxLen = maxLen != null ? maxLen : 200;
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen - 1).replace(/\s+\S*$/, '') + '…';
  }

  function deriveExcerptForCard(a, headline) {
    var full = cleanSummaryText(a.summary);
    if (!full) return '';
    var h = String(headline || '').trim();
    var f = full.trim();
    if (!h || f === h) return excerptText(full, 280);

    if (f.indexOf(h) === 0) {
      var rest = f.slice(h.length).replace(/^[,;:\.\s\-–]+/, '').trim();
      return rest.length > 30 ? excerptText(rest, 280) : excerptText(full, 280);
    }

    var prefix = h.slice(0, Math.min(48, h.length)).toLowerCase();
    var pos = f.toLowerCase().indexOf(prefix);
    if (pos === 0) {
      rest = f.slice(h.length).replace(/^[,;:\.\s\-–]+/, '').trim();
      return rest.length > 30 ? excerptText(rest, 280) : excerptText(full, 280);
    }

    return excerptText(f, 280);
  }

  /**
   * Sidebar / dashboard shapes: headline + excerpt read as articles; image is illustrative.
   */
  function normalizeDashboardArticles(data, limit) {
    var articles = (data && data.related_articles) || [];
    var max = limit != null ? limit : 8;
    return articles.slice(0, max).map(function (a) {
      var url = a.url || a.image_url || '#';
      var hl = headlineFromDiscovery(a);
      var ex = deriveExcerptForCard(a, hl);
      if (ex === hl) ex = '';
      if (ex && hl && ex.trim().toLowerCase() === hl.trim().toLowerCase()) ex = '';
      return {
        title: hl,
        excerpt: ex && ex !== hl ? ex : '',
        source: 'Indexed content',
        views:
          typeof a.score === 'number'
            ? 'Match score ' + a.score.toFixed(2)
            : 'Keyword match',
        image: a.image_url || '',
        url: url
      };
    }).filter(function (x) {
      return !!x.image;
    });
  }

  function ensureMapViewImageStyles() {
    if (document.getElementById('shopthat-discovery-map-view-styles')) return;
    var s = document.createElement('style');
    s.id = 'shopthat-discovery-map-view-styles';
    s.textContent =
      'button.shopthat-map-view-image{font:inherit;color:#4A90E2;border:none;background:transparent;padding:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-decoration:none;margin-top:4px;transition:color .2s ease;align-self:flex-start;}' +
      'button.shopthat-map-view-image:hover{color:#357ABD;text-decoration:underline}' +
      '.chatbot-wrapper.map-view-active .chatbot-map-product-link.shopthat-map-view-image{display:inline-flex !important;}';
    document.head.appendChild(s);
  }

  function ensureDiscoveryLightboxStyles() {
    if (document.getElementById('shopthat-discovery-lightbox-styles')) return;
    var s = document.createElement('style');
    s.id = 'shopthat-discovery-lightbox-styles';
    s.textContent =
      '.shopthat-discovery-lightbox-overlay{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));box-sizing:border-box;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}' +
      '.shopthat-discovery-lightbox-panel{position:relative;max-width:min(96vw,1280px);max-height:94vh;display:flex;flex-direction:column;align-items:center;gap:10px;outline:none;}' +
      '.shopthat-discovery-lightbox-panel img{max-width:100%;max-height:min(86vh,calc(94vh - 48px));width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.65);background:#111;}' +
      '.shopthat-discovery-lightbox-caption{font-size:14px;color:#e8e8e8;text-align:center;max-width:42rem;line-height:1.45;margin:0;padding:0 8px;}' +
      '.shopthat-discovery-lightbox-close{position:absolute;top:-6px;right:-6px;width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.45);background:rgba(0,0,0,.55);color:#fff;font-size:24px;line-height:1;display:grid;place-items:center;cursor:pointer;padding:0;transition:background .2s ease,border-color .2s ease}' +
      '.shopthat-discovery-lightbox-close:hover{background:rgba(0,0,0,.75);border-color:rgba(255,255,255,.7)}';
    document.head.appendChild(s);
  }

  function closeKeywordDiscoveryLightbox() {
    var el = document.getElementById('shopthat-discovery-lightbox-overlay');
    if (!el) return;
    if (el._onKey) document.removeEventListener('keydown', el._onKey);
    el.remove();
  }

  function openKeywordDiscoveryLightbox(imageSrc, caption) {
    if (!imageSrc) return;
    ensureDiscoveryLightboxStyles();
    ensureMapViewImageStyles();
    closeKeywordDiscoveryLightbox();

    var overlay = document.createElement('div');
    overlay.id = 'shopthat-discovery-lightbox-overlay';
    overlay.className = 'shopthat-discovery-lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    var panel = document.createElement('div');
    panel.className = 'shopthat-discovery-lightbox-panel';
    panel.tabIndex = -1;

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'shopthat-discovery-lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '×';

    var imgEl = document.createElement('img');
    imgEl.src = imageSrc;
    imgEl.alt = caption ? String(caption) : '';

    panel.appendChild(closeBtn);

    var capEl = document.createElement('p');
    capEl.className = 'shopthat-discovery-lightbox-caption';
    if (caption) capEl.textContent = String(caption);

    panel.appendChild(imgEl);
    if (caption) panel.appendChild(capEl);

    function close(e) {
      if (e) e.stopPropagation();
      closeKeywordDiscoveryLightbox();
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    panel.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    var onKey = function (e) {
      if (e.key === 'Escape') closeKeywordDiscoveryLightbox();
    };
    overlay._onKey = onKey;
    document.addEventListener('keydown', onKey);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    closeBtn.focus();
  }

  /**
   * @param {HTMLElement} container
   * @param {Array} products — items with title, image|src, model, price, discoveryUrl
   * @param {object} options — variant: 'dashboard'|'chatbot', leafletMap, storeLocations, clearMarkers, markerRef, onCardClick
   */
  function renderMapProductStrip(container, products, options) {
    if (!container) return;
    options = options || {};
    ensureMapViewImageStyles();
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

      var imageSrc = product.image || product.src || '';
      var viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = prefix + '-link shopthat-map-view-image';
      viewBtn.textContent = 'View image';

      viewBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openKeywordDiscoveryLightbox(imageSrc, product.title || '');
      });

      info.appendChild(titleEl);
      info.appendChild(modelEl);
      info.appendChild(priceEl);
      info.appendChild(viewBtn);

      card.appendChild(img);
      card.appendChild(info);

      card.addEventListener('click', function (e) {
        if (e.target.tagName === 'A' || (e.target.closest && e.target.closest('a'))) return;
        if (e.target.tagName === 'BUTTON' || (e.target.closest && e.target.closest('button'))) return;
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
    renderMapProductStrip: renderMapProductStrip,
    openKeywordDiscoveryLightbox: openKeywordDiscoveryLightbox,
    closeKeywordDiscoveryLightbox: closeKeywordDiscoveryLightbox
  };
})(typeof window !== 'undefined' ? window : this);
