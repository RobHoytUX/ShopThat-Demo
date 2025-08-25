/* Basic interactivity to emulate LV page behavior */
(function () {
  const header = document.querySelector('.lv-header');
  const burger = document.querySelector('.lv-burger');
  const searchLink = document.querySelector('.lv-search-link');
  const nav = document.getElementById('nav');
  let lastY = window.scrollY;
  // Hide/reveal header on scroll like native LV behavior (approximation)
  window.addEventListener('scroll', () => {
    if (document.documentElement.classList.contains('nav-open')) return;
    const y = window.scrollY;
    const goingDown = y > lastY;
    const shouldHide = goingDown && y > 120;
    header.style.transform = shouldHide ? 'translateY(-100%)' : 'translateY(0)';
    lastY = y;
  }, { passive: true });

  // Carousel logic
  const track = document.getElementById('carousel-track') || document.querySelector('.carousel__track');
  const dotsContainer = document.querySelector('.carousel__dots');
  const prevBtn = document.querySelector('.carousel__prev');
  const nextBtn = document.querySelector('.carousel__next');
  const liveRegion = document.getElementById('carousel-status');
  if (track && dotsContainer && prevBtn && nextBtn) {
    const slides = Array.from(track.children);
    slides.forEach((_, idx) => {
      const b = document.createElement('button');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'slide-' + (idx + 1));
      if (idx === 0) b.setAttribute('aria-selected', 'true');
      dotsContainer.appendChild(b);
    });

    const dots = Array.from(dotsContainer.children);
    const getSlideWidth = () => {
      const first = slides[0];
      if (!first) return 1;
      const rect = first.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(track).columnGap || '16');
      return rect.width + gap;
    };

    const scrollToIndex = (index) => {
      const clamped = Math.max(0, Math.min(index, slides.length - 1));
      const slide = slides[clamped];
      slide.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      dots.forEach((d, i) => d.setAttribute('aria-selected', String(i === clamped)));
      current = clamped;
      if (liveRegion) liveRegion.textContent = `Slide ${clamped + 1} of ${slides.length}`;
    };

    let current = 0;
    prevBtn.addEventListener('click', () => scrollToIndex(current - 1));
    nextBtn.addEventListener('click', () => scrollToIndex(current + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => scrollToIndex(i)));

    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollToIndex(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); scrollToIndex(current - 1); }
      if (e.key === 'Home') { e.preventDefault(); scrollToIndex(0); }
      if (e.key === 'End') { e.preventDefault(); scrollToIndex(slides.length - 1); }
    });

    // Update current index on manual scroll
    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const slideWidth = getSlideWidth();
        const idx = Math.round(track.scrollLeft / slideWidth);
        dots.forEach((d, i) => d.setAttribute('aria-selected', String(i === idx)));
        current = idx;
        if (liveRegion) liveRegion.textContent = `Slide ${idx + 1} of ${slides.length}`;
        ticking = false;
      });
    }, { passive: true });

    // Keep index in sync on resize
    window.addEventListener('resize', () => {
      const slideWidth = getSlideWidth();
      const newIndex = Math.round(track.scrollLeft / slideWidth);
      dots.forEach((d, i) => d.setAttribute('aria-selected', String(i === newIndex)));
      current = newIndex;
    });

    // Pointer-based dragging/swiping
    let isPointerDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    const onPointerDown = (e) => {
      isPointerDown = true;
      startX = e.clientX;
      startScrollLeft = track.scrollLeft;
      track.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!isPointerDown) return;
      const dx = e.clientX - startX;
      track.scrollLeft = startScrollLeft - dx;
    };
    const onPointerUp = () => {
      if (!isPointerDown) return;
      isPointerDown = false;
      const slideWidth = getSlideWidth();
      const idx = Math.round(track.scrollLeft / slideWidth);
      scrollToIndex(idx);
    };
    track.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
  }

  // Smooth anchor scrolling
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Search link placeholder behavior
  if (searchLink) {
    searchLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Future: open search overlay. For now, smooth scroll to top.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Hero video ready state hides fallback if video playable
  const video = document.querySelector('.hero__video');
  if (video) {
    const onReady = () => {
      const hero = document.querySelector('.hero');
      if (hero) hero.classList.add('hero--video-ready');
    };
    video.addEventListener('canplay', onReady, { once: true });
  }

  // Parallax effect for hero background and text
  (function setupParallax(){
    const hero = document.querySelector('.hero');
    const bg = document.querySelector('.hero__fallback');
    const content = document.querySelector('.hero__content');
    if (!hero || !bg || !content) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const viewportH = window.innerHeight || document.documentElement.clientHeight;
        const progress = Math.min(1, Math.max(0, (viewportH - rect.top) / (viewportH + rect.height)));
        const eased = Math.pow(progress, 1.25);
        const bgOffset = Math.round((eased * -700)); // extreme background drift
        const textOffset = Math.round(eased * 280);  // stronger text motion
        bg.style.backgroundPosition = `center calc(50% ${bgOffset}px)`;
        content.style.transform = `translateY(${textOffset}px)`;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  })();

  // Mobile nav toggle
  if (burger) {
    const toggleNav = () => {
      const isOpen = burger.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      burger.setAttribute('aria-expanded', String(willOpen));
      document.documentElement.classList.toggle('nav-open', willOpen);
      if (nav) nav.classList.toggle('is-open', willOpen);
      const main = document.getElementById('main');
      const footer = document.querySelector('.lv-footer');
      if (main) {
        try { main.inert = willOpen; } catch (_) {}
        main.setAttribute('aria-hidden', String(willOpen));
      }
      if (footer) {
        try { footer.inert = willOpen; } catch (_) {}
        footer.setAttribute('aria-hidden', String(willOpen));
      }
    };
    burger.addEventListener('click', toggleNav);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        toggleNav();
        burger.focus();
      }
    });
    if (nav) {
      nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
        if (burger.getAttribute('aria-expanded') === 'true') toggleNav();
      }));
    }
    window.addEventListener('resize', () => {
      if (window.innerWidth > 720 && burger.getAttribute('aria-expanded') === 'true') {
        toggleNav();
      }
    });
  }

  // IntersectionObserver-based reveal animations (progressive enhancement)
  const candidates = document.querySelectorAll('.section-intro, .story-card, .fullbleed__figure, .carousel__slide, .copy__inner');
  candidates.forEach(el => el.classList.add('reveal'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    candidates.forEach(el => io.observe(el));
  } else {
    candidates.forEach(el => el.classList.add('reveal--visible'));
  }
})();


// Chatbox widget
(function(){
  const API_BASE = 'http://localhost:8000';
  const DEFAULT_SLUG = 'kusama_campaign';

  const styles = `
  .chatbot-wrapper{position:fixed;bottom:104px;right:20px;z-index:999}
  .chatbot-toggle{background:#000;color:#fff;border-radius:50%;cursor:pointer;position:absolute;bottom:-80px;right:8px;border:0;outline:none;box-shadow:none;display:grid;place-items:center;width:56px;height:56px;padding:0}
  .chatbot-toggle:focus{outline:none}
  .chatbot-toggle img{width:24px;height:24px;filter:brightness(0) invert(1)}
  .chatbot-box{height:500px;width:360px;color:#111;border-radius:12px;padding:12px;display:flex;flex-direction:column;position:relative;
    background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.22));
    border: 1px solid rgba(255,255,255,0.35);
    box-shadow: 0 8px 32px 0 rgba(31,38,135,0.3);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    opacity:1; transform: translateY(0);
    transition: opacity 200ms ease, transform 200ms ease;
  }
  .chatbot-box.is-scroll-hidden{opacity:0; transform: translateY(8px); pointer-events:none}
  .chatbot-box[hidden]{display:none !important}
  .chatbot-refresh{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:16px;border:1px solid rgba(0,0,0,0.2);background:rgba(255,255,255,0.95);display:grid;place-items:center;color:#111;cursor:pointer;transition:opacity 200ms ease}
  .chatbot-refresh[hidden]{display:none}
  .chatbot-refresh.is-fading{opacity:0;pointer-events:none}
  .chatbot-header{text-align:center}
  .chatbot-title{font-size:21px;font-weight:600;margin:0 0 8px}
  .chatbot-sub{font-size:13px;color:#232323;margin:0 0 8px}
  .chatbot-logo{display:block;margin:0 auto 8px;height:40px;width:auto}
  .chatbot-options{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:8px}
  .chatbot-options button{padding:6px 10px;border:1px solid rgba(0,0,0,0.35);border-radius:12px;background:rgba(255,255,255,0.92);cursor:pointer;font-size:12px}
  .chatbot-presets{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:24px 0 8px}
  .chatbot-presets button{padding:8px 12px;border:1px solid rgba(0,0,0,0.35);border-radius:16px;background:rgba(255,255,255,0.92);backdrop-filter:saturate(160%);font-size:12px;cursor:pointer}
  .chatbot-messages{flex:1;overflow:auto;margin-bottom:8px;display:flex;flex-direction:column;gap:8px;padding:4px}
  .chatbot-msg{max-width:80%;padding:10px 12px;border-radius:16px;line-height:1.35;font-size:14px;word-wrap:break-word;white-space:pre-wrap;position:relative;transition:opacity 200ms ease}
  .chatbot-msg-user{align-self:flex-end;background:rgba(0,0,0,0.78);color:#fff;border-radius:30px 30px 6px 30px}
  .chatbot-msg-bot{align-self:flex-start;background:#f2f2f2;color:#111;border-radius:30px 30px 30px 6px}
  .chatbot-msg.is-fading{opacity:0}
  .chatbot-input{display:flex;gap:8px}
  .chatbot-input input{flex:1;padding:12px 8px 12px 20px;border-radius:50px;border:1px solid #ccc}
  .chatbot-input input::placeholder{color:#444;opacity:1}
  .chatbot-input input::-webkit-input-placeholder{color:#444;opacity:1}
  .chatbot-input input:focus{outline:none;box-shadow:none;border-color:#ccc}
  .chatbot-input button{width:40px;height:40px;border-radius:50%;border:0;background:#000;color:#fff;cursor:pointer;display:grid;place-items:center;padding:0}
  @media (max-width:600px){.chatbot-box{width:90vw}}
  `;

  function injectStyles(){
    if (document.getElementById('chatbot-styles')) return;
    const s = document.createElement('style');
    s.id = 'chatbot-styles';
    s.textContent = styles;
    document.head.appendChild(s);
  }

  function createEl(tag, attrs, children){
    const el = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k,v])=>{
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else el.setAttribute(k, v);
    });
    (children||[]).forEach(c => el.appendChild(c));
    return el;
  }

  async function fetchJSON(url){
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }

  function titleCase(s){
    return String(s||'').split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
  }

  function markdownToText(md){
    // Minimal rendering for bullets/headers; keep simple for demo
    return String(md||'')
      .replace(/^###?\s+/gm,'')
      .replace(/^\*\s+/gm,'• ')
      .replace(/^\-\s+/gm,'• ')
      .replace(/\*\*(.*?)\*\*/g,'$1')
      .replace(/`([^`]+)`/g,'$1');
  }

  async function initChatbot(){
    injectStyles();

    const wrapper = createEl('div', { class: 'chatbot-wrapper', role: 'complementary', 'aria-label': 'Chatbot' });
    const toggle  = createEl('button', { class: 'chatbot-toggle', 'aria-expanded': 'false', 'aria-controls': 'chatbot-box', title: 'Open chat' });
    const box     = createEl('div', { class: 'chatbot-box', id: 'chatbot-box', hidden: '' });
    const header  = createEl('div', { class: 'chatbot-header' });
    const refreshBtn = createEl('button', { class: 'chatbot-refresh', title: 'Clear chat', hidden: '' });
    const refreshIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    refreshIcon.setAttribute('xmlns','http://www.w3.org/2000/svg');
    refreshIcon.setAttribute('viewBox','0 0 24 24');
    refreshIcon.setAttribute('fill','none');
    refreshIcon.setAttribute('stroke','currentColor');
    refreshIcon.setAttribute('width','18');
    refreshIcon.setAttribute('height','18');
    const refreshPath = document.createElementNS('http://www.w3.org/2000/svg','path');
    refreshPath.setAttribute('d','M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99');
    refreshPath.setAttribute('stroke-linecap','round');
    refreshPath.setAttribute('stroke-linejoin','round');
    refreshPath.setAttribute('stroke-width','1.5');
    refreshIcon.appendChild(refreshPath);
    refreshBtn.appendChild(refreshIcon);
    const logo    = createEl('img', { class: 'chatbot-logo', src: 'assets/lv.png', alt: 'LV' });
    const title   = createEl('div', { class: 'chatbot-title', text: '' });
    const sub     = createEl('p', { class: 'chatbot-sub', text: 'Would you like to learn more about these?' });
    const presets = createEl('div', { class: 'chatbot-presets' });
    const options = createEl('div', { class: 'chatbot-options' });
    const messages= createEl('div', { class: 'chatbot-messages' });
    const inputW  = createEl('div', { class: 'chatbot-input' });
    const input   = createEl('input', { type: 'text', placeholder: 'Select a keyword to begin', 'aria-label': 'Message', disabled: '' });
    const sendBtn = createEl('button', { type: 'button', 'aria-label': 'Send message', disabled: '' });
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('xmlns','http://www.w3.org/2000/svg');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('fill','none');
    icon.setAttribute('stroke','currentColor');
    icon.setAttribute('width','20');
    icon.setAttribute('height','20');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18');
    path.setAttribute('stroke-linecap','round');
    path.setAttribute('stroke-linejoin','round');
    path.setAttribute('stroke-width','1.5');
    icon.appendChild(path);
    sendBtn.appendChild(icon);
    inputW.appendChild(input); inputW.appendChild(sendBtn);
    header.appendChild(logo); header.appendChild(title); header.appendChild(sub); header.appendChild(presets); header.appendChild(options);
    let hasSelectedKeyword = false;
    function setInputsEnabled(enabled){
      if (enabled){
        input.removeAttribute('disabled');
        sendBtn.removeAttribute('disabled');
        input.setAttribute('placeholder','Type your message');
      } else {
        input.setAttribute('disabled','');
        sendBtn.setAttribute('disabled','');
        input.setAttribute('placeholder','Select a keyword to begin');
      }
    }
    function onKeywordSelect(label){
      hasSelectedKeyword = true;
      setInputsEnabled(true);
      input.value = label;
      input.focus();
    }

    // Add three static chips labeled "keyword"
    ['keyword','keyword','keyword'].forEach(lbl => {
      const b = createEl('button', { type: 'button' }, [document.createTextNode(lbl)]);
      b.addEventListener('click', ()=> onKeywordSelect(lbl));
      presets.appendChild(b);
    });

    box.appendChild(refreshBtn); box.appendChild(header); box.appendChild(messages); box.appendChild(inputW);
    wrapper.appendChild(toggle); wrapper.appendChild(box);
    document.body.appendChild(wrapper);

    let slug = DEFAULT_SLUG;
    let enabled = [];
    let disabled = [];

    try {
      const campaigns = await fetchJSON(`${API_BASE}/api/campaigns`);
      const keys = Array.isArray(campaigns)
        ? campaigns.map(it => typeof it === 'string' ? it : (it?.key || it?.slug || it?.id)).filter(Boolean)
        : [];
      if (keys.length) slug = String(keys[0]);

      const config = await fetchJSON(`${API_BASE}/api/campaigns/${slug}`);
      const kwResp = await Promise.all(keys.map(k => fetchJSON(`${API_BASE}/api/campaigns/${k}/keywords`).catch(()=>[])));
      const allMap = {};
      kwResp.forEach((kw, i) => { allMap[keys[i]] = Array.isArray(kw) ? kw : (Array.isArray(kw?.keywords) ? kw.keywords : (Array.isArray(kw?.data) ? kw.data : [])); });

      enabled = Array.isArray(config?.keywords) ? config.keywords.filter(t=>t.enabled).map(t=>t.name) : [];
      const others = [];
      Object.entries(allMap).forEach(([k, arr]) => { if (k !== slug) others.push(...(Array.isArray(arr)?arr:[])); });
      disabled = others;

      title.textContent = 'Hello!';
      options.replaceChildren();
      enabled.forEach(kw => {
        const label = titleCase(kw);
        const b = createEl('button', { type: 'button' }, [document.createTextNode(label)]);
        b.addEventListener('click', ()=> onKeywordSelect(label));
        options.appendChild(b);
      });
    } catch (e) {
      title.textContent = 'Hello!';
    }

    function addMessage(sender, text){
      const klass = sender === 'user' ? 'chatbot-msg chatbot-msg-user' : 'chatbot-msg chatbot-msg-bot';
      const div = createEl('div', { class: klass });
      div.textContent = sender === 'user' ? text : markdownToText(text);
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      // Show refresh after the first bot response exists
      if (sender !== 'user') refreshBtn.removeAttribute('hidden');
    }

    async function send(){
      const txt = (input.value||'').trim();
      if (!txt) return;
      addMessage('user', txt);
      input.value = '';
      // After first send, keep inputs enabled for continued conversation
      if (!hasSelectedKeyword) setInputsEnabled(true);
      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: txt, enabled, disabled })
        });
        if (!res.ok) throw new Error('HTTP '+res.status);
        const d = await res.json();
        addMessage('bot', String(d?.response||'No response'));
        // ensure refresh visible after bot message
        refreshBtn.removeAttribute('hidden');
      } catch (e) {
        addMessage('bot', '❗ Failed to fetch response');
      }
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ e.preventDefault(); send(); }});

    let expanded = false;

    function createCloseIcon(){
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('xmlns','http://www.w3.org/2000/svg');
      icon.setAttribute('viewBox','0 0 24 24');
      icon.setAttribute('fill','none');
      icon.setAttribute('stroke','currentColor');
      icon.setAttribute('width','20');
      icon.setAttribute('height','20');
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d','M6 18 18 6M6 6l12 12');
      path.setAttribute('stroke-linecap','round');
      path.setAttribute('stroke-linejoin','round');
      path.setAttribute('stroke-width','1.5');
      icon.appendChild(path);
      return icon;
    }

    function updateToggle(){
      toggle.replaceChildren();
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      toggle.setAttribute('title', expanded ? 'Close chat' : 'Open chat');
      if (expanded) {
        toggle.appendChild(createCloseIcon());
      } else {
        const img = document.createElement('img');
        img.src = 'assets/louis-vuitton.svg';
        img.alt = 'Open chat';
        toggle.appendChild(img);
      }
    }

    function toggleBox(){
      expanded = !expanded;
      if (expanded) { box.removeAttribute('hidden'); }
      else { box.setAttribute('hidden',''); }
      updateToggle();
    }
    updateToggle();
    toggle.addEventListener('click', toggleBox);

    // Refresh handler: clear messages and hide button
    refreshBtn.addEventListener('click', () => {
      const items = Array.from(messages.children);
      items.forEach((el, idx) => {
        el.classList.add('is-fading');
      });
      refreshBtn.classList.add('is-fading');
      // Wait for fade then clear
      setTimeout(() => {
        messages.replaceChildren();
        refreshBtn.classList.remove('is-fading');
        refreshBtn.setAttribute('hidden','');
        input.value = '';
        // Optionally re-disable inputs until keyword selected again
        // setInputsEnabled(false); hasSelectedKeyword = false; // Uncomment if desired
        messages.scrollTop = 0;
      }, 220);
    });

    // Hide the open chat box while the user is actively scrolling and
    // fade it back in shortly after scrolling stops. The floating button
    // remains available so the user can still close/open manually.
    let scrollHideTimeout = null;
    let isTemporarilyHidden = false;

    function hideOnScroll(){
      if (!expanded || box.hasAttribute('hidden')) return;
      if (!isTemporarilyHidden){
        isTemporarilyHidden = true;
        box.classList.add('is-scroll-hidden');
      }
      if (scrollHideTimeout) clearTimeout(scrollHideTimeout);
      scrollHideTimeout = setTimeout(()=>{
        // Reveal immediately after scrolling stops
        if (expanded && !box.hasAttribute('hidden')){
          box.classList.remove('is-scroll-hidden');
          isTemporarilyHidden = false;
        }
      }, 160); // small debounce for a natural feel
    }

    window.addEventListener('scroll', hideOnScroll, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChatbot);
  else initChatbot();
})();

