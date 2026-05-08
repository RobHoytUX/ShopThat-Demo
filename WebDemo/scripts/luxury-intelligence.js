/**
 * LV Luxury Intelligence API (v2.2) — shared client for WebDemo.
 * POST through the same-origin Vercel proxy in production, or directly to
 * the EC2 service for local static testing.
 */
(function (global) {
  'use strict';

  var DIRECT_ASK_URL = 'http://18.221.156.51/ask';
  var PROXY_ASK_URL = '/api/luxury-intelligence/ask';
  var ASK_URL = global.location && global.location.protocol === 'https:'
    ? PROXY_ASK_URL
    : DIRECT_ASK_URL;
  var askUrlOverride = null;
  var ANALYZING_TEXT = 'Analyzing Luxury Catalogs';

  /** Prompt tuned so dashboard can parse a bullet list of keyword phrases */
  var DASHBOARD_KEYWORDS_QUERY =
    'You are a luxury marketing analyst. Respond with ONLY a markdown bullet list of 8 short keyword phrases (2–6 words each) for Louis Vuitton luxury intelligence across: Kusama fashion, LV campaigns, SoHo boutiques, museums, galleries, hotels, and product pricing. One phrase per line starting with "- ". No title or introduction.';

  function stripUnsafeHtml(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    d.querySelectorAll('script, iframe, object, embed, link').forEach(function (el) {
      el.remove();
    });
    d.querySelectorAll('*').forEach(function (el) {
      ['onerror', 'onload', 'onclick'].forEach(function (attr) {
        el.removeAttribute(attr);
      });
    });
    return d.innerHTML;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function markdownToHtml(md) {
    var raw = String(md || '');
    if (typeof global.marked !== 'undefined' && global.marked.parse) {
      try {
        var out = global.marked.parse(escapeHtml(raw), { breaks: true });
        return stripUnsafeHtml(out);
      } catch (e) {
        console.warn('marked parse failed', e);
      }
    }
    var esc = escapeHtml(raw).replace(/\n/g, '<br>');
    return '<p>' + esc + '</p>';
  }

  function ask(query) {
    var payload = JSON.stringify({ query: String(query) });

    function post(url) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: url === PROXY_ASK_URL ? 'same-origin' : 'omit',
        body: payload
      }).then(function (res) {
        if (!res.ok) {
          var err = new Error('HTTP ' + res.status);
          err.status = res.status;
          throw err;
        }
        return res.json();
      });
    }

    if (askUrlOverride) return post(askUrlOverride);

    return post(ASK_URL).catch(function (err) {
      if (ASK_URL === PROXY_ASK_URL && (err.status === 404 || err.status === 405 || err.status === 500 || err.status === 502)) {
        askUrlOverride = DIRECT_ASK_URL;
        return post(DIRECT_ASK_URL);
      }
      throw err;
    });
  }

  function askLegacy(query) {
    return fetch(ASK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ query: String(query) })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function getImageRank(rankData, imageUrl) {
    if (!Array.isArray(rankData)) return null;
    var match = rankData.find(function (item) {
      return item && String(item.url || '') === String(imageUrl || '');
    });
    if (!match || match.priority_rank == null) return null;
    var rank = Number(match.priority_rank);
    return Number.isFinite(rank) ? rank : null;
  }

  function getRankBadgeLabel(rank) {
    if (rank == null) return '';
    return Number(rank) === 1 ? 'Top Choice' : 'Recommended #' + rank;
  }

  /**
   * Pull candidate keyword labels from a prose / markdown answer.
   */
  function extractKeywordPhrases(answer, max) {
    max = max || 10;
    var text = String(answer || '');
    var lines = text.split(/\r?\n/);
    var out = [];
    var seen = {};

    function pushPhrase(phrase) {
      var t = phrase.replace(/\*\*/g, '').replace(/`/g, '').trim();
      t = t.replace(/^[\s"'«»]+|[\s"'«»]+$/g, '');
      if (t.length < 2 || t.length > 90) return;
      var k = t.toLowerCase();
      if (seen[k]) return;
      seen[k] = true;
      out.push(t);
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.replace(/^[\s>*]+/, '').trim();
      var bullet = trimmed
        .replace(/^[-*•]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .trim();
      if (bullet && !/^#{1,6}\s/.test(bullet)) pushPhrase(bullet);
    }

    if (out.length === 0) {
      var parts = text.split(/[.!?]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      for (var j = 0; j < parts.length && out.length < max; j++) {
        var p = parts[j].replace(/^[-*•\d.\s]+/, '').trim();
        if (p.length > 8 && p.length < 80) pushPhrase(p);
      }
    }

    return out.slice(0, max);
  }

  global.LuxuryIntelligence = {
    ASK_URL: ASK_URL,
    ANALYZING_TEXT: ANALYZING_TEXT,
    DASHBOARD_KEYWORDS_QUERY: DASHBOARD_KEYWORDS_QUERY,
    ask: ask,
    markdownToHtml: markdownToHtml,
    getImageRank: getImageRank,
    getRankBadgeLabel: getRankBadgeLabel,
    extractKeywordPhrases: extractKeywordPhrases
  };
})(typeof window !== 'undefined' ? window : this);
