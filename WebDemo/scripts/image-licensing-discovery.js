/**
 * Image Licensing — Discovery: patient sidebar, Keywords vs Timeline, chart modal.
 */
(function () {
  'use strict';

  /** Per-patient discovery datasets (keywords view + timeline + chart series) */
  var PATIENTS = [
    {
      id: 'p1',
      name: 'Elena V.',
      subtitle: 'Kusama / Fashion',
      discovered: 1247,
      pending: 342,
      approved: 905,
      chartMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      chartValues: [42, 55, 48, 62, 71, 58],
      uploads: [
        { title: 'Kusama Exhibition Photos (24 images)', when: 'Added 2 days ago' },
        { title: 'LV Store Interiors (18 images)', when: 'Added 5 days ago' },
        { title: 'Product Photography (42 images)', when: 'Added 1 week ago' }
      ],
      discoveries: [
        { title: 'Vogue — Kusama Feature', rank: '#1', images: 28, quality: '92%' },
        { title: 'Financial Times — LV', rank: '#2', images: 15, quality: '88%' },
        { title: "Harper's Bazaar", rank: '#3', images: 22, quality: '85%' },
        { title: 'Artforum', rank: '#4', images: 19, quality: '91%' }
      ],
      timeline: [
        { date: 'Mar 12, 2026', title: 'Vogue feature crawl completed', detail: '28 images tagged; quality 92%.' },
        { date: 'Mar 8, 2026', title: 'Keyword cluster: Infinity Dots', detail: 'Merged with campaign taxonomy.' },
        { date: 'Feb 22, 2026', title: 'FT — LV article indexed', detail: '15 images pending legal review.' },
        { date: 'Feb 1, 2026', title: 'Baseline discovery scan', detail: 'Initial corpus for patient Elena V.' }
      ]
    },
    {
      id: 'p2',
      name: 'Marcus T.',
      subtitle: 'SoHo / Retail',
      discovered: 890,
      pending: 210,
      approved: 612,
      chartMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      chartValues: [28, 31, 35, 40, 38, 44],
      uploads: [
        { title: 'SoHo storefront captures (12 images)', when: 'Added 1 day ago' },
        { title: '57th St windows (9 images)', when: 'Added 4 days ago' }
      ],
      discoveries: [
        { title: 'WWD — Flagship openings', rank: '#1', images: 19, quality: '89%' },
        { title: 'Retail Dive — LV NY', rank: '#2', images: 11, quality: '84%' },
        { title: 'Local blog — SoHo walk', rank: '#3', images: 8, quality: '79%' }
      ],
      timeline: [
        { date: 'Mar 10, 2026', title: 'SoHo image batch ingested', detail: '12 assets linked to Marcus T.' },
        { date: 'Mar 2, 2026', title: 'Retail keyword map updated', detail: 'SoHo + 57th St clusters.' },
        { date: 'Jan 15, 2026', title: 'Patient profile created', detail: 'Retail-focused discovery scope.' }
      ]
    },
    {
      id: 'p3',
      name: 'Sofia R.',
      subtitle: 'Museums / Art',
      discovered: 634,
      pending: 156,
      approved: 478,
      chartMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      chartValues: [22, 24, 30, 28, 33, 36],
      uploads: [
        { title: 'MoMA press kit (30 images)', when: 'Added 3 days ago' },
        { title: 'Gagosian opening night (14 images)', when: 'Added 1 week ago' }
      ],
      discoveries: [
        { title: 'Artnet — Kusama preview', rank: '#1', images: 21, quality: '90%' },
        { title: 'The Art Newspaper — LV collab', rank: '#2', images: 14, quality: '87%' }
      ],
      timeline: [
        { date: 'Mar 5, 2026', title: 'Museum partnership crawl', detail: '21 high-res assets flagged.' },
        { date: 'Feb 18, 2026', title: 'Gallery taxonomy sync', detail: 'Aligned with Sofia R. keywords.' }
      ]
    },
    {
      id: 'p4',
      name: 'James K.',
      subtitle: 'Press / General',
      discovered: 412,
      pending: 98,
      approved: 301,
      chartMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      chartValues: [15, 18, 20, 22, 19, 25],
      uploads: [
        { title: 'Press clipping archive import', when: 'Added 6 days ago' }
      ],
      discoveries: [
        { title: 'Reuters — Luxury sector', rank: '#1', images: 9, quality: '82%' },
        { title: 'AP Images — runway', rank: '#2', images: 6, quality: '80%' }
      ],
      timeline: [
        { date: 'Mar 1, 2026', title: 'Wire feed connected', detail: 'Automated pulls for James K.' },
        { date: 'Jan 8, 2026', title: 'Profile onboarding', detail: 'General press discovery scope.' }
      ]
    }
  ];

  var selectedId = PATIENTS[0].id;
  var chartInstance = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getSelected() {
    return PATIENTS.find(function (p) {
      return p.id === selectedId;
    });
  }

  function renderPatientList() {
    var ul = $('#discoveryPatientList');
    if (!ul) return;
    ul.innerHTML = '';
    PATIENTS.forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'discovery-patients__item' + (p.id === selectedId ? ' is-active' : '');
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.dataset.patientId = p.id;
      li.innerHTML =
        '<span class="discovery-patients__avatar" aria-hidden="true">' +
        escapeHtml(p.name.charAt(0)) +
        '</span>' +
        '<span class="discovery-patients__meta">' +
        '<span class="discovery-patients__name">' +
        escapeHtml(p.name) +
        '</span>' +
        '<span class="discovery-patients__sub">' +
        escapeHtml(p.subtitle) +
        '</span>' +
        '</span>';
      li.addEventListener('click', function () {
        selectPatient(p.id);
      });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectPatient(p.id);
        }
      });
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getPendingKeywordAdds() {
    if (!window.ShopThatData || typeof window.ShopThatData.getPendingKeywordAdds !== 'function') return null;
    return window.ShopThatData.getPendingKeywordAdds();
  }

  function showPendingKeywordAddPopover(scope) {
    var pending = getPendingKeywordAdds();
    if (!pending || !pending.keywords || !pending.keywords.length || !pending.created) return;
    var ackKey = 'st_pending_keyword_adds_seen_' + scope;
    try {
      if (localStorage.getItem(ackKey) === pending.created) return;
      localStorage.setItem(ackKey, pending.created);
    } catch (e) { /* ignore private-mode storage failures */ }

    var existing = document.querySelector('.keyword-sync-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'keyword-sync-toast';
    var list = pending.keywords.slice(0, 6).map(escapeHtml).join(', ');
    var extra = pending.keywords.length > 6 ? ' +' + (pending.keywords.length - 6) + ' more' : '';
    toast.innerHTML =
      '<div class="keyword-sync-toast__title">New keywords added</div>' +
      '<div class="keyword-sync-toast__body">' + list + extra + '</div>';
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.remove(); }, 220);
    }, 5200);
  }

  function selectPatient(id) {
    selectedId = id;
    document.querySelectorAll('.discovery-patients__item').forEach(function (el) {
      el.classList.toggle('is-active', el.dataset.patientId === id);
    });
    renderKeywordsMetricsAndLists();
    renderTimeline();
  }

  function renderKeywordsMetricsAndLists() {
    var p = getSelected();
    if (!p) return;

    var d = $('#discoveryMetricDiscovered');
    var pend = $('#discoveryMetricPending');
    var app = $('#discoveryMetricApproved');
    if (d) d.textContent = p.discovered.toLocaleString();
    if (pend) pend.textContent = p.pending.toLocaleString();
    if (app) app.textContent = p.approved.toLocaleString();

    var uploadsEl = $('#discoveryRecentUploads');
    if (uploadsEl) {
      uploadsEl.innerHTML = p.uploads
        .map(function (u) {
          return (
            '<div class="deal-item">' +
            '<span class="deal-companies">' +
            escapeHtml(u.title) +
            '</span>' +
            '<span class="deal-amount">' +
            escapeHtml(u.when) +
            '</span>' +
            '</div>'
          );
        })
        .join('');
    }

    var grid = $('#discoveryKeywordsGrid');
    if (grid) {
      grid.innerHTML = p.discoveries
        .map(function (k) {
          return (
            '<div class="keyword-performance-item">' +
            '<div class="keyword-performance-header">' +
            '<h3 class="keyword-performance-name">' +
            escapeHtml(k.title) +
            '</h3>' +
            '<span class="keyword-performance-rank">' +
            escapeHtml(k.rank) +
            '</span>' +
            '</div>' +
            '<div class="keyword-performance-metrics">' +
            '<div class="keyword-metric">' +
            '<span class="keyword-metric-label">Images Found</span>' +
            '<span class="keyword-metric-value usage">' +
            escapeHtml(String(k.images)) +
            '</span>' +
            '</div>' +
            '<div class="keyword-metric">' +
            '<span class="keyword-metric-label">Quality Score</span>' +
            '<span class="keyword-metric-value trend">' +
            escapeHtml(k.quality) +
            '</span>' +
            '</div>' +
            '</div>' +
            '</div>'
          );
        })
        .join('');
    }

    var scope = $('#discoveryPatientScopeLabel');
    if (scope) {
      scope.textContent = 'Showing discovery for ' + p.name + ' — ' + p.subtitle;
    }
  }

  function renderTimeline() {
    var container = $('#discoveryTimeline');
    if (!container) return;
    var p = getSelected();
    if (!p) return;
    var pending = getPendingKeywordAdds();
    var pendingEvents = pending && Array.isArray(pending.keywords) && pending.keywords.length
      ? [{
          date: 'Just now',
          title: 'Keywords added to tree',
          detail: pending.keywords.join(', ')
        }]
      : [];
    container.innerHTML = pendingEvents.concat(p.timeline)
      .map(function (ev) {
        return (
          '<div class="discovery-timeline__item">' +
          '<div class="discovery-timeline__dot" aria-hidden="true"></div>' +
          '<div class="discovery-timeline__card">' +
          '<div class="discovery-timeline__date">' +
          escapeHtml(ev.date) +
          '</div>' +
          '<div class="discovery-timeline__title">' +
          escapeHtml(ev.title) +
          '</div>' +
          '<div class="discovery-timeline__detail">' +
          escapeHtml(ev.detail) +
          '</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  function openChartModal() {
    var modal = $('#discoveryChartModal');
    var title = $('#discoveryChartTitle');
    var p = getSelected();
    if (!modal || !p) return;
    if (title) {
      title.textContent = 'Discovery volume — ' + p.name;
    }
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');

    var canvas = $('#discoveryChartCanvas');
    if (!canvas || !window.Chart) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: p.chartMonths.slice(),
        datasets: [
          {
            label: 'Images discovered',
            data: p.chartValues.slice(),
            borderColor: 'rgba(8, 145, 178, 1)',
            backgroundColor: 'rgba(8, 145, 178, 0.12)',
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  function closeChartModal() {
    var modal = $('#discoveryChartModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  function initDiscoverySubtabs() {
    var tabs = document.querySelectorAll('[data-discovery-sub]');
    var kwPane = $('#discovery-keywords-pane');
    var tlPane = $('#discovery-timeline-pane');
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sub = btn.getAttribute('data-discovery-sub');
        tabs.forEach(function (b) {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        if (sub === 'keywords') {
          if (kwPane) kwPane.removeAttribute('hidden');
          if (tlPane) tlPane.setAttribute('hidden', '');
        } else {
          if (kwPane) kwPane.setAttribute('hidden', '');
          if (tlPane) tlPane.removeAttribute('hidden');
          renderTimeline();
          showPendingKeywordAddPopover('timeline');
        }
      });
    });
  }

  function initChartControls() {
    var openBtn = $('#openDiscoveryChartBtn');
    var closeBtn = $('#discoveryChartClose');
    var modal = $('#discoveryChartModal');
    if (openBtn) openBtn.addEventListener('click', openChartModal);
    if (closeBtn) closeBtn.addEventListener('click', closeChartModal);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeChartModal();
      });
    }
  }

  function init() {
    if (!$('#discoveryPatientList')) return;
    renderPatientList();
    renderKeywordsMetricsAndLists();
    renderTimeline();
    initDiscoverySubtabs();
    initChartControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
