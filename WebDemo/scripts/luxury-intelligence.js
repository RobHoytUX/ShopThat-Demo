/**
 * LV Luxury Intelligence API (v2.1) — shared client for WebDemo.
 * POST http://18.221.156.51/ask  { "query": "..." }
 */
(function (global) {
  'use strict';

  var ASK_URL = 'http://18.221.156.51/ask';

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
        var out = global.marked.parse(raw, { breaks: true });
        return stripUnsafeHtml(out);
      } catch (e) {
        console.warn('marked parse failed', e);
      }
    }
    var esc = escapeHtml(raw).replace(/\n/g, '<br>');
    return '<p>' + esc + '</p>';
  }

  function ask(query) {
    return fetch(ASK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: String(query) })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
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
    DASHBOARD_KEYWORDS_QUERY: DASHBOARD_KEYWORDS_QUERY,
    ask: ask,
    markdownToHtml: markdownToHtml,
    extractKeywordPhrases: extractKeywordPhrases
  };
})(typeof window !== 'undefined' ? window : this);
