(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderAiAnswer(container, payload) {
    const answer = payload && payload.answer ? payload.answer : 'No response available.';
    if (window.LuxuryIntelligence && window.LuxuryIntelligence.markdownToHtml) {
      container.innerHTML = window.LuxuryIntelligence.markdownToHtml(answer);
    } else {
      container.innerHTML = '<p>' + escapeHtml(answer) + '</p>';
    }

    if (payload && payload.domain) {
      const domainEl = document.createElement('div');
      domainEl.className = 'ai-message-domain';
      domainEl.style.marginTop = '8px';
      domainEl.style.opacity = '0.75';
      domainEl.style.fontSize = '12px';
      domainEl.textContent = 'Domain: ' + payload.domain;
      container.appendChild(domainEl);
    }

    if (payload && Array.isArray(payload.images) && payload.images.length) {
      const venuesByUrl = {};
      if (Array.isArray(payload.imageVenues)) {
        payload.imageVenues.forEach((v) => { if (v && v.url) venuesByUrl[v.url] = v; });
      }
      const imageWrap = document.createElement('div');
      imageWrap.className = 'ai-message-images';
      imageWrap.style.display = 'grid';
      imageWrap.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
      imageWrap.style.gap = '8px';
      imageWrap.style.marginTop = '10px';
      payload.images.slice(0, 3).forEach((url) => {
        const tile = document.createElement('div');
        tile.style.display = 'flex';
        tile.style.flexDirection = 'column';
        tile.style.gap = '4px';
        const venue = venuesByUrl[url];
        const img = document.createElement('img');
        img.src = url;
        img.alt = venue && venue.name ? venue.name : 'Intelligence result';
        img.loading = 'lazy';
        img.style.width = '100%';
        img.style.height = '84px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '8px';
        tile.appendChild(img);
        if (venue && venue.name) {
          const cap = document.createElement('div');
          cap.textContent = venue.name;
          cap.style.cssText = 'font-size:11px;font-weight:600;color:inherit;text-align:center;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          tile.appendChild(cap);
          if (venue.area) {
            const sub = document.createElement('div');
            sub.textContent = venue.area;
            sub.style.cssText = 'font-size:10px;opacity:0.7;text-align:center;';
            tile.appendChild(sub);
          }
        }
        imageWrap.appendChild(tile);
      });
      container.appendChild(imageWrap);
    }
  }

  function initKeywordsAiPanel() {
    const askAiBtn = document.getElementById('askAiBtn');
    const aiSidePanel = document.getElementById('aiSidePanel');
    const aiPanelClose = document.getElementById('aiPanelClose');
    const aiPanelOverlay = document.getElementById('aiPanelOverlay');
    const aiInput = document.getElementById('aiInput');
    const aiSendBtn = document.getElementById('aiSendBtn');
    const aiMessages = document.getElementById('aiMessages');

    if (!askAiBtn || !aiSidePanel || !aiPanelClose || !aiPanelOverlay || !aiInput || !aiSendBtn || !aiMessages) {
      return;
    }

    function closePanel() {
      aiSidePanel.classList.remove('active');
      aiPanelOverlay.classList.remove('active');
      aiSidePanel.setAttribute('aria-hidden', 'true');
    }

    askAiBtn.addEventListener('click', () => {
      aiSidePanel.classList.add('active');
      aiPanelOverlay.classList.add('active');
      aiSidePanel.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => aiInput.focus());
    });

    aiPanelClose.addEventListener('click', closePanel);
    aiPanelOverlay.addEventListener('click', closePanel);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && aiSidePanel.classList.contains('active')) {
        closePanel();
      }
    });

    async function sendMessage() {
      const message = aiInput.value.trim();
      if (!message) return;

      const welcomeMsg = aiMessages.querySelector('.ai-welcome-message');
      if (welcomeMsg) welcomeMsg.remove();

      const userMsg = document.createElement('div');
      userMsg.className = 'ai-message user';
      userMsg.textContent = message;
      aiMessages.appendChild(userMsg);

      aiInput.value = '';

      const thinkingMsg = document.createElement('div');
      thinkingMsg.className = 'ai-message ai';
      thinkingMsg.textContent = 'Thinking...';
      aiMessages.appendChild(thinkingMsg);
      aiMessages.scrollTop = aiMessages.scrollHeight;

      aiSendBtn.disabled = true;

      try {
        let payload = null;
        if (window.LuxuryIntelligence && typeof window.LuxuryIntelligence.ask === 'function') {
          payload = await window.LuxuryIntelligence.ask(message);
        } else {
          payload = { answer: 'Intelligence client is not available on this page yet.', images: [] };
        }

        thinkingMsg.remove();

        const aiResponse = document.createElement('div');
        aiResponse.className = 'ai-message ai';
        renderAiAnswer(aiResponse, payload);
        aiMessages.appendChild(aiResponse);
      } catch (error) {
        thinkingMsg.remove();
        const failMsg = document.createElement('div');
        failMsg.className = 'ai-message ai';
        failMsg.textContent = 'Sorry, the AI request failed. Please try again.';
        aiMessages.appendChild(failMsg);
        console.error('Keywords AI panel error:', error);
      } finally {
        aiSendBtn.disabled = false;
        aiMessages.scrollTop = aiMessages.scrollHeight;
      }
    }

    aiSendBtn.addEventListener('click', sendMessage);
    aiInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKeywordsAiPanel, { once: true });
  } else {
    initKeywordsAiPanel();
  }
}());
