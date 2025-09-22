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
        // center hero content between header bottom and hero bottom by tracking heights
        const header = document.querySelector('.lv-header');
        const headerH = header ? header.getBoundingClientRect().height : 72;
        const contentInner = content.querySelector('.hero__content-inner');
        if (contentInner) {
          const innerH = contentInner.getBoundingClientRect().height;
          document.documentElement.style.setProperty('--header-h', headerH + 'px');
          document.documentElement.style.setProperty('--content-h', innerH + 'px');
        }
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
  const API_BASE = 'http://3.15.39.180';
  const DEFAULT_SLUG = 'kusama_campaign';

  const styles = `
  .chatbot-wrapper{position:fixed;bottom:104px;right:20px;z-index:999}
  .chatbot-toggle{background:#000;color:#fff;border-radius:50%;cursor:pointer;position:absolute;bottom:-80px;right:8px;border:0;outline:none;box-shadow:none;display:grid;place-items:center;width:56px;height:56px;padding:0}
  .chatbot-toggle:focus{outline:none}
  .chatbot-toggle img{width:24px;height:24px;filter:brightness(0) invert(1)}
  .chatbot-toggle--glass{background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7)); color:#111; border:1px solid rgba(0,0,0,0.15); box-shadow:0 8px 32px 0 rgba(31,38,135,0.2); backdrop-filter: blur(12px) saturate(160%); -webkit-backdrop-filter: blur(12px) saturate(160%)}
  .chatbot-toggle--glass img{filter:none}
  .chatbot-box{height:781.25px;width:562.5px;color:#111;border-radius:12px;padding:28px 12px 20px 12px;display:flex;flex-direction:column;position:relative;box-sizing:border-box;overflow:hidden;
    background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.22));
    border: 1px solid rgba(255,255,255,0.35);
    box-shadow: 0 8px 32px 0 rgba(31,38,135,0.3);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    opacity:1; transform: translateY(0);
    transition: opacity 200ms ease, transform 200ms ease, width 200ms ease, height 200ms ease;
  }
  .chatbot-box.chatbot-box--compact{width:281.25px;height:390.625px}
  .chatbot-box.is-scroll-hidden{opacity:0; transform: translateY(8px); pointer-events:none}
  .chatbot-box[hidden]{display:none !important}
  .chatbot-refresh{position:absolute;top:20px;right:8px;width:32px;height:32px;border-radius:16px;border:1px solid rgba(0,0,0,0.2);background:rgba(255,255,255,0.95);display:grid;place-items:center;color:#111;cursor:pointer;transition:opacity 200ms ease}
  .chatbot-refresh[hidden]{display:none}
  .chatbot-refresh.is-fading{opacity:0;pointer-events:none}
  .chatbot-back{position:absolute;top:20px;left:8px;width:24px;height:24px;border:0;background:transparent;color:#111;cursor:pointer;display:grid;place-items:center}
  .chatbot-back[hidden]{display:none}
  .chatbot-header{text-align:center;padding-top:8px}
  .chatbot-title{font-size:21px;font-weight:600;margin:0 0 8px}
  .chatbot-sub{font-size:15px;color:#232323;margin:0 0 8px;font-weight:600}
  .chatbot-logo{display:block;margin:0 auto 8px;height:40px;width:auto}
  .chatbot-options{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:8px}
  .chatbot-options button{padding:6px 10px;border:1px solid rgba(0,0,0,0.35);border-radius:12px;background:rgba(255,255,255,0.92);cursor:pointer;font-size:12px}
  .chatbot-presets{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:24px 0 8px}
  .chatbot-presets button{padding:8px 12px;border:1px solid rgba(0,0,0,0.35);border-radius:16px;background:rgba(255,255,255,0.92);backdrop-filter:saturate(160%);font-size:12px;cursor:pointer;position:relative;transition:opacity 150ms ease, transform 150ms ease}
  .chatbot-presets[hidden]{display:none !important}
  .chatbot-presets--details{display:grid;grid-template-columns:repeat(3,max-content);gap:8px;justify-content:center}
  .chatbot-presets--details[hidden]{display:none !important}
  .chip-badge{position:absolute;top:-6px;right:-6px;background:#111;color:#fff;border-radius:12px;padding:0 6px;font-size:10px;line-height:16px;height:16px;min-width:16px;display:inline-grid;place-items:center}
  .chatbot-messages{flex:1 1 auto;min-height:48px;overflow:auto;margin-bottom:8px;display:flex;flex-direction:column;gap:8px;padding:4px;padding-right:12px;scrollbar-gutter:stable both-edges}
  .chatbot-messages::-webkit-scrollbar{width:10px}
  .chatbot-messages::-webkit-scrollbar-track{background:rgba(0,0,0,0.06);border-radius:8px}
  .chatbot-messages::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.25);border-radius:8px}
  .chatbot-msg{max-width:80%;padding:10px 12px;border-radius:16px;line-height:1.35;font-size:14px;word-wrap:break-word;white-space:pre-wrap;position:relative;transition:opacity 200ms ease}
  .chatbot-msg-user{align-self:flex-end;background:rgba(0,0,0,0.78);color:#fff;border-radius:30px 30px 6px 30px;margin-right:8px}
  .chatbot-msg-bot{align-self:flex-start;background:#f2f2f2;color:#111;border-radius:30px 30px 30px 6px}
  .chatbot-images{background:transparent;padding:8px;border-radius:12px;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-start}
  .chatbot-images img{border-radius:8px;transition:transform 0.2s ease}
  .chatbot-images img:hover{transform:scale(1.05)}
  .chatbot-thinking{align-self:flex-start;background:#f2f2f2;color:#111;border-radius:30px 30px 30px 6px;padding:10px 16px;display:flex;align-items:center;gap:8px}
  .chatbot-thinking-text{font-size:14px;color:#666}
  .chatbot-dots{display:flex;gap:2px}
  .chatbot-dots span{width:4px;height:4px;background:#666;border-radius:50%;animation:bounce 1.4s infinite ease-in-out both}
  .chatbot-dots span:nth-child(1){animation-delay:-0.32s}
  .chatbot-dots span:nth-child(2){animation-delay:-0.16s}
  .chatbot-dots span:nth-child(3){animation-delay:0s}
  @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
  .chatbot-msg.is-fading{opacity:0}
  .chatbot-input{display:flex;gap:8px;width:100%;padding-top:8px}
  .chatbot-input input{flex:1;min-width:0;padding:12px 8px 12px 20px;border-radius:50px;border:1px solid #ccc}
  .chatbot-input input::placeholder{color:#444;opacity:1}
  .chatbot-input input::-webkit-input-placeholder{color:#444;opacity:1}
  .chatbot-input input:focus{outline:none;box-shadow:none;border-color:#ccc}
  .chatbot-input button{width:40px;height:40px;border-radius:50%;border:0;background:#000;color:#fff;cursor:pointer;display:grid;place-items:center;padding:0}
  .chatbot-input button[disabled]{background:rgba(0,0,0,0.15);color:#666;cursor:not-allowed;border:1px solid rgba(0,0,0,0.1)}
  .no-keywords-message{text-align:center;padding:16px 12px;color:#666;font-size:13px;font-style:italic;background:rgba(255,255,255,0.5);border-radius:12px;margin:8px 0}
  .error-message{text-align:center;padding:16px 12px;color:#d32f2f;font-size:13px;background:rgba(255,235,238,0.8);border-radius:12px;margin:8px 0;border:1px solid rgba(211,47,47,0.3)}
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
    const backBtn = createEl('button', { class: 'chatbot-back', title: 'Back', hidden: '' });
    const backIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    backIcon.setAttribute('xmlns','http://www.w3.org/2000/svg');
    backIcon.setAttribute('viewBox','0 0 24 24');
    backIcon.setAttribute('fill','none');
    backIcon.setAttribute('stroke','currentColor');
    backIcon.setAttribute('width','20');
    backIcon.setAttribute('height','20');
    const backPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    backPath.setAttribute('d','M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3');
    backPath.setAttribute('stroke-linecap','round');
    backPath.setAttribute('stroke-linejoin','round');
    backPath.setAttribute('stroke-width','1.5');
    backIcon.appendChild(backPath);
    backBtn.appendChild(backIcon);
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
    // Sizing constants and helpers
    const FULL_W = 562.5; const FULL_H = 795.25; // slightly taller to ensure input isn't clipped
    const COMPACT_W = 281.25; const COMPACT_H = 406.625; // maintain proportion with added paddings
    function setBoxSize(widthPx, heightPx){
      box.style.width = widthPx + 'px';
      box.style.height = heightPx + 'px';
    }
    // Initial compact size with glass background intact
    box.classList.add('chatbot-box--compact');
    setBoxSize(COMPACT_W, COMPACT_H);

    function measureChipRowWidth(container){
      if (!container || container.hasAttribute('hidden') || !container.children.length) return 0;
      let total = 0;
      const gap = 8; // approximate gap between chips
      Array.from(container.children).forEach((child, idx) => {
        if (!(child instanceof HTMLElement)) return;
        total += (child.offsetWidth || 0);
        if (idx) total += gap;
      });
      // add some side padding inside the box
      return total + 40;
    }

    function preferredCompactWidth(){
      const w1 = measureChipRowWidth(options);
      const w2 = measureChipRowWidth(presets);
      const needed = Math.max(COMPACT_W, w1, w2);
      return Math.min(FULL_W, needed);
    }

    function computeMinHeight(){
      const style = getComputedStyle(box);
      const padTop = parseFloat(style.paddingTop) || 0;
      const padBottom = parseFloat(style.paddingBottom) || 0;
      const headerH = header ? (header.offsetHeight || 0) : 0;
      const inputH = inputW ? (inputW.offsetHeight || 0) : 0;
      const gaps = 24; // spacing between sections
      const minMessages = 48; // minimal space reserved for messages area
      return Math.ceil(padTop + headerH + gaps + minMessages + inputH + padBottom);
    }

    function updateBoxSizeForState(){
      const hasBot = Array.from(messages.children).some(el => el.classList.contains('chatbot-msg-bot'));
      if (hasBot){
        box.classList.remove('chatbot-box--compact');
        const minH = computeMinHeight();
        setBoxSize(FULL_W, Math.max(FULL_H, minH));
      } else {
        const w = preferredCompactWidth();
        box.classList.add('chatbot-box--compact');
        const minH = computeMinHeight();
        setBoxSize(w, Math.max(COMPACT_H, minH));
      }
      // Ensure top controls are always visible: scroll container to top and keep padding
      box.scrollTop = 0;
    }

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
      
      // Track keyword usage in ShopThatData system
      if (window.ShopThatData) {
        window.ShopThatData.trackKeywordUsage(label, 'chatbot-selection');
        
        // Add message to current chat session
        if (currentSessionId) {
          window.ShopThatData.addChatMessage(currentSessionId, label, 'user', [label]);
        }
      }
    }

    // Remove hardcoded mock keywords - now using ShopThatData system above

    // Details functionality removed since we're using ShopThatData keywords directly
    // The back button is no longer needed since there are no detail views
    backBtn.setAttribute('hidden','');

    box.appendChild(refreshBtn); box.appendChild(backBtn); box.appendChild(header); box.appendChild(messages); box.appendChild(inputW);
    wrapper.appendChild(toggle); wrapper.appendChild(box);
    document.body.appendChild(wrapper);

    let slug = DEFAULT_SLUG;
    let enabled = [];
    let disabled = [];
    let currentSessionId = null;
    
    // Initialize chat session tracking
    if (window.ShopThatData) {
      currentSessionId = window.ShopThatData.startChatSession();
    }

    // Use ShopThatData system for keywords instead of API
    function loadKeywordsFromSharedData() {
      if (window.ShopThatData) {
        const keywords = window.ShopThatData.getKeywords();
        enabled = keywords.map(k => k.name);
        disabled = [];

        title.textContent = 'Hello!';
        options.replaceChildren();
        
        if (enabled.length > 0) {
          enabled.forEach(kw => {
            const label = titleCase(kw);
            const b = createEl('button', { type: 'button' }, [document.createTextNode(label)]);
            b.addEventListener('click', ()=> onKeywordSelect(label));
            options.appendChild(b);
          });
        } else {
          // Show message when no keywords available
          const noKeywordsMsg = createEl('div', { class: 'no-keywords-message' }, [
            document.createTextNode('No keywords available. Add keywords in the Keywords Manager.')
          ]);
          options.appendChild(noKeywordsMsg);
        }
      } else {
        title.textContent = 'Hello!';
        options.replaceChildren();
        const errorMsg = createEl('div', { class: 'error-message' }, [
          document.createTextNode('Keywords system not available.')
        ]);
        options.appendChild(errorMsg);
      }
    }

    // Load keywords from shared data
    loadKeywordsFromSharedData();

    // Listen for keyword changes from other pages
    if (window.ShopThatData) {
      window.ShopThatData.on('keywords', () => {
        loadKeywordsFromSharedData();
        ensureSizeForContent();
      });
    }

    function ensureSizeForContent(){
      // Compact when no chat; adapt compact width to chips; expand to full on bot reply
      updateBoxSizeForState();
    }

    function addMessage(sender, text){
      const klass = sender === 'user' ? 'chatbot-msg chatbot-msg-user' : 'chatbot-msg chatbot-msg-bot';
      const div = createEl('div', { class: klass });
      div.textContent = sender === 'user' ? text : markdownToText(text);
      messages.appendChild(div);
      if (sender === 'user') {
        // keep UX: after sending, keep at bottom to see pending reply
        messages.scrollTop = messages.scrollHeight;
      } else {
        // after bot response, anchor just above the preceding user bubble
        // so both the query and the start of the response are visible
        const botH = div.offsetHeight || 0;
        const prev = div.previousElementSibling;
        const prevH = prev && prev instanceof HTMLElement ? (prev.offsetHeight || 0) : 0;
        const gutter = 16; // small padding so both bubbles breathe
        const target = Math.max(0, messages.scrollHeight - (botH + prevH + gutter));
        messages.scrollTop = target;
      }
      // Show refresh after the first bot response exists
      if (sender !== 'user') refreshBtn.removeAttribute('hidden');
      ensureSizeForContent();
    }

    function displayImages(imageUrls) {
      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) return;
      
      const imageContainer = createEl('div', { class: 'chatbot-msg chatbot-msg-bot chatbot-images' });
      imageUrls.forEach(imageUrl => {
        const img = createEl('img', { 
          src: imageUrl, 
          alt: 'Related image',
          style: 'max-width: 200px; max-height: 200px; border-radius: 8px; margin: 4px; cursor: pointer;'
        });
        img.addEventListener('click', () => {
          window.open(imageUrl, '_blank');
        });
        img.addEventListener('error', () => {
          img.style.display = 'none';
        });
        imageContainer.appendChild(img);
      });
      
      messages.appendChild(imageContainer);
      messages.scrollTop = messages.scrollHeight;
      ensureSizeForContent();
    }

    let thinkingIndicator = null;

    function showThinking() {
      if (thinkingIndicator) return; // Already showing
      
      thinkingIndicator = createEl('div', { class: 'chatbot-thinking' });
      const thinkingText = createEl('span', { class: 'chatbot-thinking-text', text: 'Thinking' });
      const dots = createEl('div', { class: 'chatbot-dots' });
      
      // Create three animated dots
      for (let i = 0; i < 3; i++) {
        const dot = createEl('span');
        dots.appendChild(dot);
      }
      
      thinkingIndicator.appendChild(thinkingText);
      thinkingIndicator.appendChild(dots);
      messages.appendChild(thinkingIndicator);
      messages.scrollTop = messages.scrollHeight;
      ensureSizeForContent();
    }

    function hideThinking() {
      if (thinkingIndicator) {
        thinkingIndicator.remove();
        thinkingIndicator = null;
        ensureSizeForContent();
      }
    }
    // removed expand/collapse control; default size reflects previous expanded state

    async function send(){
      const txt = (input.value||'').trim();
      if (!txt) return;
      
      // Track keyword usage from user message
      if (window.ShopThatData) {
        const keywordsFound = window.ShopThatData.extractKeywordsFromText(txt);
        if (currentSessionId && keywordsFound.length > 0) {
          window.ShopThatData.addChatMessage(currentSessionId, txt, 'user', keywordsFound);
        }
      }
      
      addMessage('user', txt);
      input.value = '';
      // After first send, keep inputs enabled for continued conversation
      if (!hasSelectedKeyword) setInputsEnabled(true);
      
      // Show thinking indicator
      showThinking();
      
      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: txt })
        });
        if (!res.ok) throw new Error('HTTP '+res.status);
        const d = await res.json();
        
        // Hide thinking indicator before showing response
        hideThinking();
        
        const botResponse = String(d?.answer||'No response');
        addMessage('bot', botResponse);
        
        // Handle image URLs if provided
        if (d?.image_urls && Array.isArray(d.image_urls) && d.image_urls.length > 0) {
          displayImages(d.image_urls);
        }
        
        // Track keywords from bot response
        if (window.ShopThatData) {
          const botKeywords = window.ShopThatData.extractKeywordsFromText(botResponse);
          if (currentSessionId && botKeywords.length > 0) {
            window.ShopThatData.addChatMessage(currentSessionId, botResponse, 'bot', botKeywords);
          }
        }
        
        // ensure refresh visible after bot message
        refreshBtn.removeAttribute('hidden');
      } catch (e) {
        // Hide thinking indicator on error too
        hideThinking();
        addMessage('bot', '❗ Failed to fetch response');
      }
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ e.preventDefault(); send(); }});

    // Health check functionality
    async function checkHealth() {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) {
          const data = await res.json();
          console.log('Health check successful:', data);
          return true;
        }
        throw new Error('Health check failed');
      } catch (e) {
        console.error('Health check error:', e);
        return false;
      }
    }

    // Search functionality
    async function searchQuery(query) {
      try {
        const encodedQuery = encodeURIComponent(query);
        const res = await fetch(`${API_BASE}/search?q=${encodedQuery}`);
        if (!res.ok) throw new Error('HTTP '+res.status);
        const data = await res.json();
        return data;
      } catch (e) {
        console.error('Search error:', e);
        return null;
      }
    }

    // Perform initial health check when chatbot opens
    function performHealthCheck() {
      checkHealth().then(isHealthy => {
        if (!isHealthy) {
          addMessage('bot', '⚠️ Backend service is currently unavailable. Some features may not work properly.');
        }
      });
    }

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
        const closeIcon = createCloseIcon();
        // Force black X in glass state
        closeIcon.style.stroke = '#111';
        toggle.appendChild(closeIcon);
      } else {
        const img = document.createElement('img');
        img.src = 'assets/louis-vuitton.svg';
        img.alt = 'Open chat';
        toggle.appendChild(img);
      }
      // Apply glass style when chat is OPEN (X shown); keep default black when CLOSED (LV shown)
      toggle.classList.toggle('chatbot-toggle--glass', expanded);
    }

    // Smooth open/close using the same fade class as scroll behavior
    const OPEN_CLOSE_MS = 200;
    function openBox(){
      // Start hidden style then reveal next frame for a fade-in
      box.removeAttribute('hidden');
      box.classList.add('is-scroll-hidden');
      requestAnimationFrame(()=>{
        box.classList.remove('is-scroll-hidden');
      });
      // kick off analysis of the currently visible image(s)
      scheduleAnalysis();
      // On open, determine size based on current content
      ensureSizeForContent();
      // Perform health check when opening
      performHealthCheck();
    }
    function closeBox(){
      // End chat session when closing
      if (window.ShopThatData && currentSessionId) {
        window.ShopThatData.endChatSession(currentSessionId);
      }
      
      // Fade out, then actually hide after transition ends
      box.classList.add('is-scroll-hidden');
      setTimeout(()=>{
        box.setAttribute('hidden','');
        box.classList.remove('is-scroll-hidden');
      }, OPEN_CLOSE_MS);
    }
    function toggleBox(){
      expanded = !expanded;
      if (expanded) openBox(); else closeBox();
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
      
      // Clear thinking indicator immediately
      hideThinking();
      
      // Wait for fade then clear
      setTimeout(() => {
        messages.replaceChildren();
        refreshBtn.classList.remove('is-fading');
        refreshBtn.setAttribute('hidden','');
        input.value = '';
        // Optionally re-disable inputs until keyword selected again
        // setInputsEnabled(false); hasSelectedKeyword = false; // Uncomment if desired
        messages.scrollTop = 0;
        // Adjust size based on remaining chips/options
        ensureSizeForContent();
      }, 220);
    });

    // Scroll-based hide/show functionality removed - chatbot stays visible when open

    // =====================
    // Visible image → bag keywords
    // =====================
    const keywordsCache = new Map(); // imageUrl -> payload
    let analyzeDebounce = null;
    let selectedBagIndex = 0;
    const visibleImageRatios = new Map(); // img -> ratio

    function observeImages(){
      if (!('IntersectionObserver' in window)) return;
      const imgs = Array.from(document.querySelectorAll('img'));
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(e => {
          if (e.isIntersecting) {
            visibleImageRatios.set(e.target, e.intersectionRatio || 0);
          } else {
            visibleImageRatios.delete(e.target);
          }
        });
      }, { threshold: [0, 0.5, 0.75, 0.9], root: null });
      imgs.forEach(img => io.observe(img));
    }

    function getTopVisibleImage(){
      if (!visibleImageRatios.size) return null;
      const arr = Array.from(visibleImageRatios.entries())
        .filter(([img]) => img && img.src)
        .sort((a,b)=>{
          const brA = a[0].getBoundingClientRect();
          const brB = b[0].getBoundingClientRect();
          if (a[1] !== b[1]) return b[1] - a[1]; // higher ratio first
          return brA.top - brB.top; // otherwise topmost
        });
      return arr.length ? arr[0][0] : null;
    }

    function assembleBagLabel(bag){
      const pick = (arr)=>Array.isArray(arr)&&arr.length ? String(arr[0]) : '';
      const parts = [pick(bag?.attributes?.collection), pick(bag?.attributes?.pattern) || pick(bag?.attributes?.material), pick(bag?.attributes?.style)];
      const label = parts.filter(Boolean).map(titleCase).join(' ');
      return label || 'Bag';
    }

    async function mockVisionKeywords(imageUrl){
      // Lightweight deterministic mock based on URL for demo
      const isKusama = /kusama/i.test(imageUrl);
      return {
        imageId: String(imageUrl||'mock'),
        bags: [
          {
            box: [120,140,640,520],
            keywords: isKusama ? ['louis vuitton','neverfull','monogram','polka dot motif','gold-tone hardware','tote'] : ['louis vuitton','alma','epi leather','black','silver-tone hardware','top-handle'],
            attributes: isKusama ? {
              material: ['Coated Canvas'],
              pattern: ['Monogram','Polka Dot'],
              color: ['Brown','White'],
              hardware: ['Gold-tone'],
              style: ['Tote'],
              collection: ['Neverfull']
            } : {
              material: ['Epi Leather'],
              pattern: [],
              color: ['Black'],
              hardware: ['Silver-tone'],
              style: ['Top-handle'],
              collection: ['Alma']
            },
            confidence: 0.9
          }
        ],
        campaign: isKusama ? { name: 'LV x Kusama 2023', confidence: 0.88 } : { name: 'Core Values', confidence: 0.72 },
        designer: isKusama ? { name: 'Yayoi Kusama', confidence: 0.93 } : { name: 'Louis Vuitton Studio', confidence: 0.6 }
      };
    }

    async function fetchVisionKeywords(imageUrl){
      if (!imageUrl) return null;
      const url = String(imageUrl);
      if (keywordsCache.has(url)) return keywordsCache.get(url);
      try {
        const res = await fetch(`${API_BASE}/api/vision/keywords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url })
        });
        if (!res.ok) throw new Error('HTTP '+res.status);
        const data = await res.json();
        keywordsCache.set(url, data);
        return data;
      } catch (e) {
        const mock = await mockVisionKeywords(url);
        keywordsCache.set(url, mock);
        return mock;
      }
    }

    function clearChildren(el){ while (el.firstChild) el.removeChild(el.firstChild); }

    function renderCampaignOptions(payload){
      // Instead of using image analysis keywords, use ShopThatData keywords
      loadKeywordsFromSharedData();
    }

    // Removed detail view functions since we're using ShopThatData keywords directly

    function renderBagChips(payload){
      // Don't render bag chips since we're using ShopThatData keywords
      // Keep presets area clear for our keyword system
    }

    async function analyzeCurrentView(){
      if (!expanded || box.hasAttribute('hidden')) return;
      const img = getTopVisibleImage();
      const url = img ? (img.currentSrc || img.src) : '';
      if (!url) return;
      const payload = await fetchVisionKeywords(url);
      title.textContent = 'Hello!';
      sub.textContent = 'Would you like to learn more about these?';
      renderCampaignOptions(payload);
      renderBagChips(payload);
    }

    function scheduleAnalysis(){
      if (analyzeDebounce) clearTimeout(analyzeDebounce);
      analyzeDebounce = setTimeout(()=>{ analyzeCurrentView(); }, 180);
    }

    // Observe images and trigger analysis on scroll when chat is open
    observeImages();
    window.addEventListener('scroll', ()=>{ if (expanded) scheduleAnalysis(); }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChatbot);
  else initChatbot();
})();

