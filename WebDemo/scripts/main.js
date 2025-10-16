/* Basic interactivity to emulate LV page behavior */
(function () {
  const header = document.querySelector('.lv-header');
  const burger = document.querySelector('.lv-burger');
  const searchLink = document.querySelector('.lv-search-link');
  const nav = document.getElementById('nav');
  
  // Keep header fixed at top - removed auto-hide behavior
  // Header will remain visible and fixed at the top at all times

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

    // Make video area clickable to skip to end
    const heroMedia = document.querySelector('.hero__media');
    if (heroMedia) {
      heroMedia.addEventListener('click', () => {
        // Skip to end of video
        if (video.duration && video.duration > 0) {
          video.currentTime = video.duration - 0.1; // Skip to 0.1s before end
        }
      });

      // Add visual indicator that video is clickable
      heroMedia.style.cursor = 'pointer';
      heroMedia.title = 'Click to skip video';
    }
    
  }

  // Parallax effect disabled for banner-style hero
  // (Parallax was designed for full-screen hero and doesn't work well with banner layout)

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
  .chatbot-product-card{background:rgba(255,255,255,0.98);border-radius:16px;padding:16px;margin:8px 0;display:flex;gap:16px;align-items:center;box-shadow:0 2px 12px rgba(0,0,0,0.12);cursor:pointer;transition:all 200ms ease;align-self:flex-start;max-width:90%}
  .chatbot-product-card:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,0.18)}
  .chatbot-product-card-image{width:100px;height:100px;border-radius:12px;object-fit:cover;flex-shrink:0}
  .chatbot-product-card-info{flex:1;min-width:0}
  .chatbot-product-card-title{font-size:15px;font-weight:600;color:#111;margin:0 0 6px;line-height:1.3}
  .chatbot-product-card-model{font-size:13px;color:#666;margin:0 0 6px}
  .chatbot-product-card-price{font-size:15px;font-weight:600;color:#111;margin:0}
  .chatbot-product-card-link{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#4A90E2;margin-top:6px;text-decoration:none;transition:color 150ms ease}
  .chatbot-product-card-link:hover{color:#357ABD}
  .chatbot-product-card-link svg{width:14px;height:14px}
  .chatbot-wrapper{position:fixed;bottom:104px;right:20px;z-index:999}
  .image-gallery-wrapper{position:fixed;bottom:20px;left:20px;z-index:998;width:562.5px;opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity 200ms ease,transform 200ms ease}
  .image-gallery-wrapper.is-visible{opacity:1;transform:translateY(0);pointer-events:auto}
  .image-gallery-wrapper[hidden]{display:none}
  .image-gallery{background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.9));border:1px solid rgba(0,0,0,0.1);border-radius:12px;padding:12px 40px;box-shadow:0 8px 32px rgba(0,0,0,0.12);backdrop-filter:blur(16px) saturate(180%);-webkit-backdrop-filter:blur(16px) saturate(180%);position:relative;overflow:hidden}
  .image-gallery-track{display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:4px 0}
  .image-gallery-track::-webkit-scrollbar{display:none}
  .image-gallery-item{flex:0 0 auto;width:120px;height:120px;border-radius:8px;overflow:hidden;cursor:grab;position:relative;transition:transform 200ms ease,box-shadow 200ms ease}
  .image-gallery-item:active{cursor:grabbing}
  .image-gallery-item:hover{transform:scale(1.05);box-shadow:0 4px 16px rgba(0,0,0,0.2)}
  .image-gallery-item img{width:100%;height:100%;object-fit:cover;pointer-events:none;user-select:none;-webkit-user-drag:none}
  .image-gallery-item.is-dragging{opacity:0.5;transform:scale(0.95)}
  .gallery-nav-btn{position:absolute;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;border:1px solid rgba(0,0,0,0.2);background:rgba(255,255,255,0.98);display:grid;place-items:center;cursor:pointer;z-index:10;transition:all 200ms ease;color:#111}
  .gallery-nav-btn:hover{background:rgba(255,255,255,1);transform:translateY(-50%) scale(1.1)}
  .gallery-nav-btn:active{transform:translateY(-50%) scale(0.95)}
  .gallery-nav-btn.is-disabled{opacity:0.3;pointer-events:none}
  .gallery-nav-btn--prev{left:4px}
  .gallery-nav-btn--next{right:4px}
  .gallery-nav-btn svg{width:16px;height:16px}
  .chatbot-input.drag-over{background:rgba(74,144,226,0.1);border-color:#4A90E2}
  .chatbot-map-container{display:none;width:100%;height:400px;border-radius:8px;overflow:hidden;margin:60px 0 16px 0;position:relative;z-index:1}
  .chatbot-map-container.is-visible{display:block}
  .chatbot-product-gallery{display:none;width:100%;height:120px;margin-bottom:16px;overflow-x:auto;overflow-y:visible;white-space:nowrap;scrollbar-width:thin;padding-bottom:4px}
  .chatbot-product-gallery.is-visible{display:block}
  .chatbot-header[hidden],.chatbot-messages[hidden],.chatbot-input[hidden]{display:none !important}
  .chatbot-product-gallery::-webkit-scrollbar{height:6px}
  .chatbot-product-gallery::-webkit-scrollbar-track{background:rgba(0,0,0,0.06);border-radius:3px}
  .chatbot-product-gallery::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.25);border-radius:3px}
  .chatbot-product-item{display:inline-block;width:100px;height:100px;background:linear-gradient(135deg,rgba(200,200,200,0.3),rgba(150,150,150,0.3));border:1px solid rgba(0,0,0,0.1);border-radius:8px;margin-right:8px;vertical-align:top}
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
  .chatbot-refresh{position:absolute;top:20px;right:8px;width:32px;height:32px;border-radius:16px;border:1px solid rgba(0,0,0,0.2);background:rgba(255,255,255,0.95);display:grid;place-items:center;color:#111;cursor:pointer;transition:opacity 200ms ease;z-index:10}
  .chatbot-refresh[hidden]{display:none}
  .chatbot-refresh.is-fading{opacity:0;pointer-events:none}
  .chatbot-back{position:absolute;top:20px;left:8px;width:24px;height:24px;border:0;background:transparent;color:#111;cursor:pointer;display:grid;place-items:center;z-index:10}
  .chatbot-back[hidden]{display:none}
  .chatbot-sort{position:absolute;top:20px;left:8px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(0,0,0,0.2);background:rgba(255,255,255,0.95);display:grid;place-items:center;color:#111;cursor:pointer;transition:background 200ms ease;z-index:10}
  .chatbot-sort:hover{background:rgba(255,255,255,1)}
  .chatbot-sort[hidden]{display:none}
  .chatbot-nav{position:fixed;bottom:104px;right:598.5px;width:56px;background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.9));border:1px solid rgba(0,0,0,0.1);border-radius:28px;padding:16px 0;display:flex;flex-direction:column;align-items:center;gap:8px;box-shadow:0 4px 24px rgba(0,0,0,0.12);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;transform:translateX(-8px);pointer-events:none;transition:opacity 200ms ease,transform 200ms ease}
  .chatbot-nav.is-visible{opacity:1;transform:translateX(0);pointer-events:auto}
  .chatbot-nav.is-disabled{opacity:0.5}
  .chatbot-nav.is-disabled .chatbot-nav-item{pointer-events:none;cursor:not-allowed;opacity:0.6}
  .chatbot-nav[hidden]{display:none}
  .chatbot-nav-item{width:40px;height:40px;display:grid;place-items:center;border-radius:20px;border:1px solid rgba(0,0,0,0.2);background:rgba(255,255,255,0.95);cursor:pointer;transition:all 200ms ease;color:#232323}
  .chatbot-nav-item:hover{background:rgba(240,245,255,0.95);transform:scale(1.05)}
  .chatbot-nav-item.is-active{background:linear-gradient(135deg,#4A90E2,#357ABD);border:1px solid rgba(74,144,226,0.3);color:#fff}
  .chatbot-nav-item.is-active svg{stroke:#fff}
  .chatbot-nav-item svg{width:24px;height:24px}
  .chatbot-nav-separator{width:32px;height:1px;background:rgba(0,0,0,0.1);margin:4px 0}
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
  .no-keywords-message,.no-products-message{text-align:center;padding:16px 12px;color:#666;font-size:13px;font-style:italic;background:rgba(255,255,255,0.5);border-radius:12px;margin:8px 0}
  .error-message{text-align:center;padding:16px 12px;color:#d32f2f;font-size:13px;background:rgba(255,235,238,0.8);border-radius:12px;margin:8px 0;border:1px solid rgba(211,47,47,0.3)}
  .product-list-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:8px;width:100%}
  .product-list-card{background:rgba(255,255,255,0.95);border-radius:12px;overflow:hidden;position:relative;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:transform 0.2s ease,box-shadow 0.2s ease}
  .product-list-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.15)}
  .product-list-card img{width:100%;height:150px;object-fit:cover;display:block}
  .product-list-info{padding:12px}
  .product-list-title{font-size:14px;font-weight:600;margin:0 0 4px;color:#111;line-height:1.3}
  .product-list-model{font-size:12px;color:#666;margin:0 0 4px}
  .product-list-price{font-size:14px;font-weight:600;color:#111;margin:0}
  .product-list-heart{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,0.95);cursor:pointer;display:grid;place-items:center;transition:all 0.2s ease;z-index:2}
  .product-list-heart:hover{background:#fff;transform:scale(1.1)}
  .product-list-heart svg{width:18px;height:18px;color:#e74c3c}
  .product-list-heart.is-active svg{fill:#e74c3c}
  .nav-badge{position:absolute;top:-4px;right:-4px;background:#e74c3c;color:#fff;border-radius:10px;padding:0 6px;font-size:10px;line-height:18px;height:18px;min-width:18px;display:inline-grid;place-items:center;font-weight:600}
  .chatbot-product-item--filled{background:transparent;border:1px solid rgba(0,0,0,0.15);position:relative;overflow:hidden}
  .chatbot-product-item--filled img{width:100%;height:100%;object-fit:cover}
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
    const toggle  = createEl('button', { class: 'chatbot-toggle', 'aria-expanded': 'true', 'aria-controls': 'chatbot-box', title: 'Open chat' });
    const box     = createEl('div', { class: 'chatbot-box', id: 'chatbot-box' });
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
    const sortBtn = createEl('button', { class: 'chatbot-sort', title: 'Sort options', type: 'button' });
    const sortIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sortIcon.setAttribute('xmlns','http://www.w3.org/2000/svg');
    sortIcon.setAttribute('viewBox','0 0 24 24');
    sortIcon.setAttribute('fill','none');
    sortIcon.setAttribute('stroke','currentColor');
    sortIcon.setAttribute('width','18');
    sortIcon.setAttribute('height','18');
    sortIcon.setAttribute('stroke-width','1.5');
    const sortPath = document.createElementNS('http://www.w3.org/2000/svg','path');
    sortPath.setAttribute('d','M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12');
    sortPath.setAttribute('stroke-linecap','round');
    sortPath.setAttribute('stroke-linejoin','round');
    sortIcon.appendChild(sortPath);
    sortBtn.appendChild(sortIcon);
    
    // Create navigation menu
    const chatbotNav = createEl('div', { class: 'chatbot-nav' });
    let navVisible = false;
    
    // Helper function to create nav icons
    function createNavIcon(iconType) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', '#232323');
      svg.setAttribute('stroke-width', '1.5');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      switch(iconType) {
        case 'user':
          path.setAttribute('d', 'M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z');
          break;
        case 'book':
          path.setAttribute('d', 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25');
          break;
        case 'globe':
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', '11.5');
          circle.setAttribute('cy', '11.5');
          circle.setAttribute('r', '9.5');
          svg.appendChild(circle);
          path.setAttribute('d', 'M11.5 2.5c0 0-3 4.5-3 9s3 9 3 9m0-18c0 0 3 4.5 3 9s-3 9-3 9m-9.5-9h18M3.5 6.5h16m-17 9h18');
          break;
        case 'map':
          path.setAttribute('d', 'M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z');
          break;
        case 'heart':
          path.setAttribute('d', 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z');
          break;
        case 'grid':
          path.setAttribute('d', 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z');
          break;
      }
      
      svg.appendChild(path);
      return svg;
    }
    
    // Create nav items
    const navItems = [
      { icon: 'user', id: 'nav-user', title: 'Chat', view: 'chat', active: true, closeNav: true },
      { icon: 'book', id: 'nav-library', title: 'Library', view: 'library', closeNav: false },
      { icon: 'globe', id: 'nav-search', title: 'Search', view: 'search', closeNav: false },
      { icon: 'map', id: 'nav-map', title: 'Map', view: 'map', closeNav: false },
      { icon: 'heart', id: 'nav-favorites', title: 'Favorites', view: 'favorites', closeNav: false },
      { icon: 'grid', id: 'nav-grid', title: 'Grid View', view: 'grid', closeNav: true }
    ];
    
    let currentView = 'chat'; // Default view
    
    navItems.forEach((item, index) => {
      // Add separator after first item and before last item
      if (index === 1 || index === navItems.length - 1) {
        const separator = createEl('div', { class: 'chatbot-nav-separator' });
        chatbotNav.appendChild(separator);
      }
      
      const navItem = createEl('button', { 
        class: item.active ? 'chatbot-nav-item is-active' : 'chatbot-nav-item',
        id: item.id,
        title: item.title,
        type: 'button'
      });
      navItem.appendChild(createNavIcon(item.icon));
      
      // Add click handler directly to the nav item
      navItem.addEventListener('click', () => {
        // Special handling for grid icon - open new tab
        if (item.view === 'grid') {
          window.open('/homepage', '_blank');
          // Close nav after opening new tab
          navVisible = false;
          chatbotNav.classList.remove('is-visible');
          return;
        }
        
        // Remove active class from all items in the nav
        chatbotNav.querySelectorAll('.chatbot-nav-item').forEach(i => i.classList.remove('is-active'));
        // Add active class to clicked item
        navItem.classList.add('is-active');
        
        // Switch view
        currentView = item.view;
        switchChatbotView(currentView);
        
        // Close nav if specified
        if (item.closeNav) {
          navVisible = false;
          chatbotNav.classList.remove('is-visible');
        }
      });
      
      chatbotNav.appendChild(navItem);
    });
    
    // Leaflet map instance
    let leafletMap = null;
    
    // Function to initialize Leaflet map
    function initializeMap() {
      if (leafletMap) return; // Already initialized
      
      // Wait a bit for the container to be visible
      setTimeout(() => {
        if (typeof L !== 'undefined') {
          // Initialize map centered on Paris (Louis Vuitton HQ)
          leafletMap = L.map('chatbot-map').setView([48.8566, 2.3522], 13);
          
          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(leafletMap);
          
          // Create custom LV icon
          const lvIcon = L.divIcon({
            className: 'custom-lv-marker',
            html: `
              <div style="
                width: 40px;
                height: 40px;
                background: #000;
                border-radius: 50%;
                display: grid;
                place-items: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 2px solid #fff;
              ">
                <img src="assets/louis-vuitton.svg" 
                     style="width: 20px; height: 20px; filter: brightness(0) invert(1);" 
                     alt="LV" />
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
          });
          
          // Add sample markers for Louis Vuitton stores with custom icon
          const stores = [
            { lat: 48.8698, lng: 2.3075, name: 'Louis Vuitton Champs-Élysées' },
            { lat: 48.8606, lng: 2.3376, name: 'Louis Vuitton Place Vendôme' },
            { lat: 48.8529, lng: 2.3368, name: 'Louis Vuitton Saint-Germain' }
          ];
          
          stores.forEach(store => {
            L.marker([store.lat, store.lng], { icon: lvIcon })
              .bindPopup(`<b>${store.name}</b>`)
              .addTo(leafletMap);
          });
          
          // Fix map display issues
          setTimeout(() => {
            if (leafletMap) {
              leafletMap.invalidateSize();
            }
          }, 100);
        }
      }, 100);
    }
    
    // Function to switch chatbot views
    function switchChatbotView(view) {
      // Hide/show different sections based on view
      if (view === 'chat') {
        // Show chatbot interface ONLY - chat view is the only one with input
        header.removeAttribute('hidden');
        messages.removeAttribute('hidden');
        inputW.removeAttribute('hidden');
        mapContainer.classList.remove('is-visible');
        productGallery.classList.remove('is-visible');
        // Restore chat messages if they exist - DON'T clear them
      } else if (view === 'library') {
        // Show product list view (book icon) - NO INPUT
        header.setAttribute('hidden', '');
        messages.removeAttribute('hidden');
        inputW.setAttribute('hidden', '');
        mapContainer.classList.remove('is-visible');
        productGallery.classList.remove('is-visible');
        // Render product list - DON'T clear existing messages
        renderProductListView();
      } else if (view === 'favorites') {
        // Show wishlist view (heart icon) - NO INPUT
        header.setAttribute('hidden', '');
        messages.removeAttribute('hidden');
        inputW.setAttribute('hidden', '');
        mapContainer.classList.remove('is-visible');
        productGallery.classList.remove('is-visible');
        // Render wishlist - DON'T clear existing messages
        renderWishlistView();
      } else if (view === 'map') {
        // Show map view with product gallery - NO CHAT MESSAGES OR INPUT
        header.setAttribute('hidden', '');
        messages.setAttribute('hidden', '');
        inputW.setAttribute('hidden', '');
        mapContainer.classList.add('is-visible');
        productGallery.classList.add('is-visible');

        // Initialize map and render products
        initializeMap();
        renderMapView();
      } else {
        // For other views (search), hide all chat elements including input
        header.setAttribute('hidden', '');
        messages.setAttribute('hidden', '');
        inputW.setAttribute('hidden', '');
        mapContainer.classList.remove('is-visible');
        productGallery.classList.remove('is-visible');
      }
    }
    
    // Create map and product gallery containers
    const mapContainer = createEl('div', { class: 'chatbot-map-container', id: 'chatbot-map' });
    const productGallery = createEl('div', { class: 'chatbot-product-gallery' });
    
    // Create placeholder product items
    for (let i = 0; i < 8; i++) {
      const productItem = createEl('div', { class: 'chatbot-product-item' });
      productGallery.appendChild(productItem);
    }
    
    const options = createEl('div', { class: 'chatbot-options', hidden: '' }); // Hide options - only use presets
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
    const FULL_W = 562.5;
    const COMPACT_W = 281.25;
    const COMPACT_H = 406.625; // maintain proportion with added paddings
    const CHATBOT_BOTTOM = 104; // px from bottom of viewport
    const GALLERY_HEIGHT = 144; // approximate height of gallery
    const GALLERY_GAP = 16; // gap between gallery and chatbot
    const TOP_PADDING = 20; // minimum padding from top of viewport
    
    // Calculate max chatbot height to ensure gallery doesn't go off-screen
    function getMaxChatbotHeight() {
      const viewportHeight = window.innerHeight;
      // Available space = viewport - chatbot bottom - gallery height - gap - top padding
      const maxHeight = viewportHeight - CHATBOT_BOTTOM - GALLERY_HEIGHT - GALLERY_GAP - TOP_PADDING;
      return Math.max(400, maxHeight); // Minimum 400px for usability
    }
    
    function setBoxSize(widthPx, heightPx){
      const maxHeight = getMaxChatbotHeight();
      const constrainedHeight = Math.min(heightPx, maxHeight);
      box.style.width = widthPx + 'px';
      box.style.height = constrainedHeight + 'px';
    }
    // Start in full expanded state instead of compact
    setBoxSize(FULL_W, 600);

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
      const maxHeight = getMaxChatbotHeight();
      
      if (hasBot){
        box.classList.remove('chatbot-box--compact');
        const minH = computeMinHeight();
        const targetHeight = Math.min(maxHeight, Math.max(minH, 600)); // Default to 600px when expanded
        setBoxSize(FULL_W, targetHeight);
      } else {
        // Always keep full width, just adjust height
        const minH = computeMinHeight();
        const targetHeight = Math.max(600, minH);
        setBoxSize(FULL_W, targetHeight);
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
      
      // Special handling for "Kusama x LV Campaign" keyword
      if (label.toLowerCase() === 'kusama x lv campaign') {
        // Populate gallery with Kusama images
        const kusamaImages = [
          { src: 'assets/kusama-gal1.png', title: 'Yayoi Kusama' },
          { src: 'assets/kusama-gal2.png', title: 'Yayoi Kusama' },
          { src: 'assets/kusama-gal3.png', title: 'Yayoi Kusama' },
          { src: 'assets/kusama-gal4.png', title: 'Yayoi Kusama' }
        ];
        
        // Clear existing gallery images
        galleryImages.length = 0;
        
        // Add Kusama images to gallery
        kusamaImages.forEach(img => {
          if (typeof window.addProductToGallery === 'function') {
            window.addProductToGallery(img.src, { title: img.title });
          } else {
            galleryImages.push({ src: img.src, productData: { title: img.title } });
          }
        });
        
        // Re-render gallery
        renderGallery();
        
        // Add informational blurb about Kusama
        addMessage('bot', 'Yayoi Kusama is a renowned Japanese contemporary artist known for her immersive installations and signature polka dot patterns. Her work explores themes of infinity, self-obliteration, and the cosmos. The Louis Vuitton x Yayoi Kusama collaboration celebrates her iconic artistic vision.');
      }
      
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

    box.appendChild(refreshBtn); box.appendChild(backBtn); box.appendChild(sortBtn); box.appendChild(header); box.appendChild(mapContainer); box.appendChild(productGallery); box.appendChild(messages); box.appendChild(inputW);
    
    // Navigation toggle functionality
    sortBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Sort button clicked! Current navVisible:', navVisible);
      navVisible = !navVisible;
      console.log('New navVisible:', navVisible);
      chatbotNav.classList.toggle('is-visible', navVisible);
      console.log('Nav classList:', chatbotNav.classList.toString());
    });
    wrapper.appendChild(toggle); wrapper.appendChild(box); wrapper.appendChild(chatbotNav);
    document.body.appendChild(wrapper);

    let slug = DEFAULT_SLUG;
    let enabled = [];
    let disabled = [];
    let currentSessionId = null;
    
    // Initialize chat session tracking
    if (window.ShopThatData) {
      currentSessionId = window.ShopThatData.startChatSession();
    }
    
    // Declare these variables early to avoid initialization errors
    const keywordsCache = new Map(); // imageUrl -> payload
    let analyzeDebounce = null;
    let selectedBagIndex = 0;
    const visibleImageRatios = new Map(); // img -> ratio
    
    // Product storage - declare early
    const droppedProducts = [];
    const wishlistProducts = [];
    
    // Gallery images - declare early
    const galleryImages = [];

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

    // Function to generate keywords one by one with animation
    function startKeywordGeneration() {
      console.log('Starting keyword generation...');
      
      // Set title text
      title.textContent = 'Hello!';
      
      if (!window.ShopThatData) {
        console.warn('ShopThatData not available, using fallback keywords');
        // Show default keywords as fallback
        const defaultKeywords = [
          { name: 'Yayoi Kusama' },
          { name: 'Pharrell' },
          { name: 'Infinity Mirrors' },
          { name: 'Painted Dots' }
        ];
        showKeywordsAnimated(defaultKeywords);
        return;
      }
      
      const keywords = window.ShopThatData.getKeywords();
      console.log('Retrieved keywords:', keywords);
      
      // Clear any existing keywords
      presets.replaceChildren();
      
      if (keywords.length === 0) {
        console.warn('No keywords available, using fallback');
        // Show default keywords as fallback
        const defaultKeywords = [
          { name: 'Yayoi Kusama' },
          { name: 'Pharrell' },
          { name: 'Infinity Mirrors' },
          { name: 'Painted Dots' }
        ];
        showKeywordsAnimated(defaultKeywords);
        return;
      }
      
      // Limit to 4 keywords
      const keywordsToShow = keywords.slice(0, 4);
      showKeywordsAnimated(keywordsToShow);
    }
    
    // Helper function to cycle through all keywords then show final 4
    function showKeywordsAnimated(allKeywords) {
      // Get all keywords from ShopThatData
      const cycleKeywords = window.ShopThatData ? window.ShopThatData.getKeywords() : allKeywords;
      
      // Final 4 keywords to end with
      const finalKeywords = ['Kusama x LV Campaign', 'Kusama', 'Stores', 'Capucines Bag'];
      
      let cycleIndex = 0;
      let isInCyclePhase = true;
      
      // Function to cycle through keywords
      function cycleNextKeyword() {
        if (isInCyclePhase && cycleIndex < cycleKeywords.length) {
          const kw = cycleKeywords[cycleIndex];
          const label = titleCase(kw.name);
          
          // Clear previous keywords
          presets.replaceChildren();
          
          // Show current keyword
          const b = createEl('button', { type: 'button' }, [document.createTextNode(label)]);
          b.style.opacity = '0';
          b.style.transform = 'scale(0.9)';
          b.style.transition = 'opacity 200ms ease, transform 200ms ease';
          b.addEventListener('click', ()=> onKeywordSelect(label));
          presets.appendChild(b);
          
          // Animate in
          requestAnimationFrame(() => {
            b.style.opacity = '1';
            b.style.transform = 'scale(1)';
          });
          
          cycleIndex++;
          
          // Continue cycling at 1 second intervals
          setTimeout(cycleNextKeyword, 1000);
        } else if (isInCyclePhase) {
          // Cycling done, now show final 4 keywords
          console.log('Cycling complete, showing final 4 keywords');
          isInCyclePhase = false;
          showFinalKeywords();
        }
      }
      
      // Function to show final 4 keywords one by one
      function showFinalKeywords() {
        presets.replaceChildren();
        let finalIndex = 0;
        
        function showNextFinalKeyword() {
          if (finalIndex < finalKeywords.length) {
            const label = finalKeywords[finalIndex];
            console.log('Showing final keyword:', label);
            
            const b = createEl('button', { type: 'button' }, [document.createTextNode(label)]);
            b.style.opacity = '0';
            b.style.transform = 'scale(0.8)';
            b.style.transition = 'opacity 300ms ease, transform 300ms ease';
            b.addEventListener('click', ()=> onKeywordSelect(label));
            presets.appendChild(b);
            
            // Animate in
            requestAnimationFrame(() => {
              b.style.opacity = '1';
              b.style.transform = 'scale(1)';
            });
            
            finalIndex++;
            
            // Show next final keyword after delay
            setTimeout(showNextFinalKeyword, 300);
          } else {
            console.log('All final keywords displayed');
          }
        }
        
        showNextFinalKeyword();
      }
      
      // Start the cycling animation
      cycleNextKeyword();
    }
    
    // Load keywords from shared data (fallback)
    // loadKeywordsFromSharedData(); // Commented out since we're using startKeywordGeneration

    // Listen for keyword changes from other pages
    if (window.ShopThatData) {
      window.ShopThatData.on('keywords', () => {
        // Don't reload keywords into options - only cycling animation uses keywords
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

    function displayProductCard(product) {
      // Create product card element
      const card = createEl('div', { class: 'chatbot-product-card' });
      
      // Product image
      const img = createEl('img', { 
        class: 'chatbot-product-card-image',
        src: product.image,
        alt: product.title
      });
      
      // Product info container
      const info = createEl('div', { class: 'chatbot-product-card-info' });
      const title = createEl('div', { class: 'chatbot-product-card-title', text: product.title });
      const model = createEl('div', { class: 'chatbot-product-card-model', text: product.model });
      const price = createEl('div', { class: 'chatbot-product-card-price', text: product.price });
      
      // Create link to Louis Vuitton store
      const link = createEl('a', { 
        class: 'chatbot-product-card-link',
        href: `https://us.louisvuitton.com/eng-us/search/${encodeURIComponent(product.model)}`,
        target: '_blank',
        rel: 'noopener noreferrer',
        text: 'View on LV Store'
      });
      
      // Add external link icon
      const linkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      linkIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      linkIcon.setAttribute('viewBox', '0 0 24 24');
      linkIcon.setAttribute('fill', 'none');
      linkIcon.setAttribute('stroke', 'currentColor');
      linkIcon.setAttribute('stroke-width', '2');
      linkIcon.setAttribute('stroke-linecap', 'round');
      linkIcon.setAttribute('stroke-linejoin', 'round');
      const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      iconPath.setAttribute('d', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3');
      linkIcon.appendChild(iconPath);
      link.appendChild(linkIcon);
      
      // Assemble product info
      info.appendChild(title);
      info.appendChild(model);
      info.appendChild(price);
      info.appendChild(link);
      
      // Assemble card
      card.appendChild(img);
      card.appendChild(info);
      
      // Make entire card clickable to open product page
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking the link directly
        if (e.target.tagName !== 'A') {
          window.open(`https://us.louisvuitton.com/eng-us/search/${encodeURIComponent(product.model)}`, '_blank');
        }
      });
      
      // Add card to messages
      messages.appendChild(card);
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

    // =====================
    // Image Gallery Component - MUST be created before openBox() is called
    // =====================
    const galleryWrapper = createEl('div', { class: 'image-gallery-wrapper', hidden: '' });
    const gallery = createEl('div', { class: 'image-gallery' });
    const galleryTrack = createEl('div', { class: 'image-gallery-track' });
    
    // Create navigation arrows
    function createArrowIcon(direction) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6');
      svg.appendChild(path);
      return svg;
    }
    
    const galPrevBtn = createEl('button', { class: 'gallery-nav-btn gallery-nav-btn--prev', type: 'button', 'aria-label': 'Previous images' });
    galPrevBtn.appendChild(createArrowIcon('left'));
    const galNextBtn = createEl('button', { class: 'gallery-nav-btn gallery-nav-btn--next', type: 'button', 'aria-label': 'Next images' });
    galNextBtn.appendChild(createArrowIcon('right'));
    
    gallery.appendChild(galPrevBtn);
    gallery.appendChild(galleryTrack);
    gallery.appendChild(galNextBtn);
    galleryWrapper.appendChild(gallery);
    document.body.appendChild(galleryWrapper);

    let expanded = true; // Start with chatbot open

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
      // Don't analyze - we're using cycling keyword animation instead
      // scheduleAnalysis(); // Disabled
      // On open, determine size based on current content
      ensureSizeForContent();
      // Perform health check when opening
      performHealthCheck();
      // Show gallery when chatbot opens
      toggleGallery(true);
    }
    function closeBox(){
      // End chat session when closing
      if (window.ShopThatData && currentSessionId) {
        window.ShopThatData.endChatSession(currentSessionId);
      }
      
      // Close nav if it's open
      navVisible = false;
      chatbotNav.classList.remove('is-visible');
      
      // Hide gallery when chatbot closes
      toggleGallery(false);
      
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
    
    // Auto-open chatbot and start keyword animation on page load
    openBox();
    
    // Start keyword generation animation after a brief delay
    setTimeout(() => {
      console.log('About to call startKeywordGeneration...');
      console.log('presets element:', presets);
      console.log('title element:', title);
      console.log('ShopThatData available:', !!window.ShopThatData);
      startKeywordGeneration();
    }, 500);

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
      // Don't load keywords into options - only use presets for cycling animation
      // options container should remain empty
    }

    // Removed detail view functions since we're using ShopThatData keywords directly

    function renderBagChips(payload){
      // Don't render bag chips since we're using ShopThatData keywords
      // Keep presets area clear for our keyword system
    }

    async function analyzeCurrentView(){
      // Don't analyze - we're using cycling keyword animation instead
      return;
    }

    function scheduleAnalysis(){
      if (analyzeDebounce) clearTimeout(analyzeDebounce);
      analyzeDebounce = setTimeout(()=>{ analyzeCurrentView(); }, 180);
    }

    // Observe images and trigger analysis on scroll when chat is open
    observeImages();
    window.addEventListener('scroll', ()=>{ if (expanded) scheduleAnalysis(); }, { passive: true });

    // Gallery functions - defined after gallery elements are created above
    
    // Add image to gallery
    function addToGallery(imageSrc, productData) {
      // Check if image already exists
      const exists = galleryImages.some(item => item.src === imageSrc);
      if (exists) return;
      
      // Add to gallery array
      galleryImages.push({
        src: imageSrc,
        productData: productData
      });
      
      // Re-render gallery
      renderGallery();
    }
    
    // Populate gallery with favorited images
    function renderGallery() {
      galleryTrack.replaceChildren();
      
      if (galleryImages.length === 0) {
        // Show empty state message
        const emptyMessage = createEl('div', {
          style: 'text-align: center; padding: 48px 20px; color: #666; font-size: 14px; width: 100%;'
        });
        emptyMessage.textContent = 'Click the heart icon on any product to add it to your favorites!';
        galleryTrack.appendChild(emptyMessage);
      } else {
        // Create gallery items from favorited images
        galleryImages.forEach((item, index) => {
          const galleryItem = createEl('div', { 
            class: 'image-gallery-item',
            draggable: 'true',
            'data-image-src': item.src,
            'data-image-index': String(index)
          });
          
          const galleryImg = createEl('img', { 
            src: item.src,
            alt: item.productData?.title || 'Product image',
            draggable: 'false'
          });
          
          galleryItem.appendChild(galleryImg);
          galleryTrack.appendChild(galleryItem);
          
          // Add drag event listeners
          galleryItem.addEventListener('dragstart', handleDragStart);
          galleryItem.addEventListener('dragend', handleDragEnd);
        });
      }
      
      updateNavigationButtons();
    }
    
    // Drag and drop functionality
    let draggedItem = null;
    let draggedImageSrc = null;
    
    function handleDragStart(e) {
      draggedItem = e.currentTarget;
      draggedImageSrc = draggedItem.getAttribute('data-image-src');
      draggedItem.classList.add('is-dragging');
      
      // Set drag data
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', draggedImageSrc);
      
      // Create a custom drag image
      const dragImage = draggedItem.querySelector('img');
      if (dragImage) {
        e.dataTransfer.setDragImage(dragImage, 60, 60);
      }
    }
    
    function handleDragEnd(e) {
      if (draggedItem) {
        draggedItem.classList.remove('is-dragging');
      }
      draggedItem = null;
      draggedImageSrc = null;
    }
    
    // Add drop zone handling to chatbot input area
    inputW.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      inputW.classList.add('drag-over');
    });
    
    inputW.addEventListener('dragleave', (e) => {
      inputW.classList.remove('drag-over');
    });
    
    // Generate product info from image name/URL
    function generateProductInfoFromImage(imgSrc) {
      const filename = imgSrc.split('/').pop().split('?')[0];
      const isKusama = /kusama/i.test(imgSrc);
      
      // Extract number from filename if present
      const numberMatch = filename.match(/\d+/);
      const productNum = numberMatch ? parseInt(numberMatch[0]) : Math.floor(Math.random() * 9) + 1;
      
      const products = [
        { title: 'LV X YK KEEPALL 25', model: 'M46406', price: '$2,980.00' },
        { title: 'LV X YK SAC PLAT', model: 'M46404', price: '$3,800.00' },
        { title: 'LV X YK MINI SOFT TRUNK', model: 'M81936', price: '$4,000.00' },
        { title: 'LV X YK KEEPALL 55', model: 'M46401', price: '$3,650.00' },
        { title: 'LV X YK NEVERFULL MM', model: 'M46402', price: '$2,750.00' },
        { title: 'LV X YK SPEEDY 25', model: 'M46403', price: '$2,900.00' },
        { title: 'LV X YK COSMETIC POUCH', model: 'M46407', price: '$1,890.00' },
        { title: 'LV X YK BACKPACK', model: 'M46408', price: '$3,950.00' }
      ];
      
      const selectedProduct = products[productNum % products.length];
      
      return {
        id: Date.now() + Math.random(),
        image: imgSrc,
        title: selectedProduct.title,
        price: selectedProduct.price,
        model: selectedProduct.model,
        location: { lat: 48.8566 + (Math.random() - 0.5) * 0.02, lng: 2.3522 + (Math.random() - 0.5) * 0.02 }
      };
    }
    
    // Render product list view (book icon)
    function renderProductListView() {
      messages.replaceChildren();

      if (droppedProducts.length === 0) {
        const emptyMsg = createEl('div', {
          class: 'no-products-message',
          text: 'No products yet. Drop images from the gallery to add products.'
        });
        messages.appendChild(emptyMsg);
      } else {
        const grid = createEl('div', { class: 'product-list-grid' });

        droppedProducts.forEach(product => {
          const card = createEl('div', { class: 'product-list-card' });

          const img = createEl('img', { src: product.image, alt: product.title });
          const info = createEl('div', { class: 'product-list-info' });
          const title = createEl('h3', { class: 'product-list-title', text: product.title });
          const model = createEl('p', { class: 'product-list-model', text: product.model });
          const price = createEl('p', { class: 'product-list-price', text: product.price });

          const heartBtn = createEl('button', { class: 'product-list-heart', 'aria-label': 'Add to wishlist' });
          const heartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          heartSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          heartSvg.setAttribute('viewBox', '0 0 24 24');
          heartSvg.setAttribute('fill', wishlistProducts.some(p => p.id === product.id) ? 'currentColor' : 'none');
          heartSvg.setAttribute('stroke', 'currentColor');
          heartSvg.setAttribute('stroke-width', '2');
          const heartPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          heartPath.setAttribute('d', 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z');
          heartSvg.appendChild(heartPath);
          heartBtn.appendChild(heartSvg);

          heartBtn.addEventListener('click', () => {
            const index = wishlistProducts.findIndex(p => p.id === product.id);
            if (index > -1) {
              wishlistProducts.splice(index, 1);
              heartSvg.setAttribute('fill', 'none');
            } else {
              wishlistProducts.push(product);
              heartSvg.setAttribute('fill', 'currentColor');
            }
            updateWishlistBadge();
            // Refresh wishlist view to show updated list
            if (currentView === 'favorites') {
              renderWishlistView();
            }
          });

          info.appendChild(title);
          info.appendChild(model);
          info.appendChild(price);

          card.appendChild(img);
          card.appendChild(heartBtn);
          card.appendChild(info);
          grid.appendChild(card);
        });

        messages.appendChild(grid);
      }
    }
    
    // Render wishlist view (heart icon)
    function renderWishlistView() {
      messages.replaceChildren();

      if (wishlistProducts.length === 0) {
        const emptyMsg = createEl('div', {
          class: 'no-products-message',
          text: 'No favorites yet. Add products to your wishlist from the product list.'
        });
        messages.appendChild(emptyMsg);
      } else {
        const grid = createEl('div', { class: 'product-list-grid' });

        wishlistProducts.forEach(product => {
          const card = createEl('div', { class: 'product-list-card' });

          const img = createEl('img', { src: product.image, alt: product.title });
          const info = createEl('div', { class: 'product-list-info' });
          const title = createEl('h3', { class: 'product-list-title', text: product.title });
          const model = createEl('p', { class: 'product-list-model', text: product.model });
          const price = createEl('p', { class: 'product-list-price', text: product.price });

          const removeBtn = createEl('button', { class: 'product-list-heart is-active', 'aria-label': 'Remove from wishlist' });
          const heartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          heartSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          heartSvg.setAttribute('viewBox', '0 0 24 24');
          heartSvg.setAttribute('fill', 'currentColor');
          heartSvg.setAttribute('stroke', 'currentColor');
          heartSvg.setAttribute('stroke-width', '2');
          const heartPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          heartPath.setAttribute('d', 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z');
          heartSvg.appendChild(heartPath);
          removeBtn.appendChild(heartSvg);

          removeBtn.addEventListener('click', () => {
            const index = wishlistProducts.findIndex(p => p.id === product.id);
            if (index > -1) {
              wishlistProducts.splice(index, 1);
              renderWishlistView();
              updateWishlistBadge();
            }
          });

          info.appendChild(title);
          info.appendChild(model);
          info.appendChild(price);

          card.appendChild(img);
          card.appendChild(removeBtn);
          card.appendChild(info);
          grid.appendChild(card);
        });

        messages.appendChild(grid);
      }
    }
    
    // Update wishlist badge count
    function updateWishlistBadge() {
      const heartNavItem = document.getElementById('nav-favorites');
      if (!heartNavItem) return;
      
      let badge = heartNavItem.querySelector('.nav-badge');
      if (wishlistProducts.length > 0) {
        if (!badge) {
          badge = createEl('span', { class: 'nav-badge', text: String(wishlistProducts.length) });
          heartNavItem.appendChild(badge);
        } else {
          badge.textContent = String(wishlistProducts.length);
        }
      } else if (badge) {
        badge.remove();
      }
    }
    
    // Render map view with products
    function renderMapView() {
      productGallery.replaceChildren();
      
      if (droppedProducts.length === 0) {
        // Show placeholder boxes
        for (let i = 0; i < 8; i++) {
          const placeholder = createEl('div', { class: 'chatbot-product-item' });
          productGallery.appendChild(placeholder);
        }
      } else {
        // Show actual products
        droppedProducts.forEach(product => {
          const item = createEl('div', { class: 'chatbot-product-item chatbot-product-item--filled' });
          const img = createEl('img', { src: product.image, alt: product.title });
          item.appendChild(img);
          productGallery.appendChild(item);
          
          // Add marker to map if available
          if (leafletMap && product.location) {
            const marker = L.marker([product.location.lat, product.location.lng])
              .bindPopup(`<b>${product.title}</b><br>${product.price}`)
              .addTo(leafletMap);
          }
        });
      }
    }
    
    inputW.addEventListener('drop', async (e) => {
      e.preventDefault();
      inputW.classList.remove('drag-over');
      
      const imageSrc = e.dataTransfer.getData('text/plain');
      if (!imageSrc) return;
      
      // Open side navigation in disabled state
      navVisible = true;
      chatbotNav.classList.add('is-visible', 'is-disabled');
      
      // Add user message showing they dropped an image
      addMessage('user', '📸 [Image dropped]');
      
      // Enable input if not already enabled
      setInputsEnabled(true);
      hasSelectedKeyword = true;
      
      // Show thinking indicator
      showThinking();
      
      // Try to get AI response, but always use product database for consistent info
      const productInfo = generateProductInfoFromImage(imageSrc);
      
      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'What product is in this image?',
            image_url: imageSrc
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          const botResponse = String(data?.answer || 'This is a beautiful Louis Vuitton x Yayoi Kusama piece.');
          
          hideThinking();
          chatbotNav.classList.remove('is-disabled');
          
          // Display product card FIRST
          displayProductCard(productInfo);
          
          // Then display text response
          addMessage('bot', botResponse);
          
          // Store product with consistent naming from our database
          droppedProducts.push(productInfo);
          
          // Track in ShopThatData if available
          if (window.ShopThatData && currentSessionId) {
            window.ShopThatData.addChatMessage(currentSessionId, '📸 Image dropped', 'user', []);
            const botKeywords = window.ShopThatData.extractKeywordsFromText(botResponse);
            window.ShopThatData.addChatMessage(currentSessionId, botResponse, 'bot', botKeywords);
          }
        } else {
          throw new Error('API failed');
        }
      } catch (e) {
        // API failed, still show product card and text
        hideThinking();
        chatbotNav.classList.remove('is-disabled');
        
        // Display product card FIRST
        displayProductCard(productInfo);
        
        // Then display text response
        addMessage('bot', `I've added this ${productInfo.title} to your product library. You can view it in the Library tab or see it on the map!`);
        
        droppedProducts.push(productInfo);
      }
      
      refreshBtn.removeAttribute('hidden');
    });
    
    // Gallery navigation
    function updateNavigationButtons() {
      const scrollLeft = galleryTrack.scrollLeft;
      const scrollWidth = galleryTrack.scrollWidth;
      const clientWidth = galleryTrack.clientWidth;
      
      // Disable prev button at start
      if (scrollLeft <= 0) {
        galPrevBtn.classList.add('is-disabled');
      } else {
        galPrevBtn.classList.remove('is-disabled');
      }
      
      // Disable next button at end
      if (scrollLeft + clientWidth >= scrollWidth - 5) {
        galNextBtn.classList.add('is-disabled');
      } else {
        galNextBtn.classList.remove('is-disabled');
      }
    }
    
    galPrevBtn.addEventListener('click', () => {
      const scrollAmount = 250;
      galleryTrack.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      setTimeout(updateNavigationButtons, 300);
    });
    
    galNextBtn.addEventListener('click', () => {
      const scrollAmount = 250;
      galleryTrack.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(updateNavigationButtons, 300);
    });
    
    galleryTrack.addEventListener('scroll', () => {
      updateNavigationButtons();
    }, { passive: true });
    
    // Show/hide gallery with chatbot
    function toggleGallery(show) {
      if (show) {
        galleryWrapper.removeAttribute('hidden');
        renderGallery();
        requestAnimationFrame(() => {
          galleryWrapper.classList.add('is-visible');
        });
      } else {
        galleryWrapper.classList.remove('is-visible');
        setTimeout(() => {
          galleryWrapper.setAttribute('hidden', '');
        }, 200);
      }
    }
    
    // Expose addToGallery function globally so product cards can access it
    window.addProductToGallery = addToGallery;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChatbot);
  else initChatbot();
})();

// Product Gallery Sticky Navigation and Tabs
(function() {
  const categoryNav = document.getElementById('category-nav');
  const galleryTabs = document.querySelectorAll('.gallery-tab');
  const categoryLinks = document.querySelectorAll('.category-link');
  
  if (!categoryNav) return;
  
  // Sticky navigation behavior
  let lastScrollY = window.scrollY;
  const header = document.querySelector('.lv-header');
  const headerHeight = header ? header.offsetHeight : 73;
  
  function handleStickyNav() {
    const navTop = categoryNav.getBoundingClientRect().top;
    const scrollY = window.scrollY;
    
    // Add stuck class when nav reaches the header
    if (navTop <= headerHeight) {
      categoryNav.classList.add('is-stuck');
    } else {
      categoryNav.classList.remove('is-stuck');
    }
    
    lastScrollY = scrollY;
  }
  
  // Attach scroll listener
  window.addEventListener('scroll', handleStickyNav, { passive: true });
  
  // Initial check
  handleStickyNav();
  
  // Gallery tab switching
  galleryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      galleryTabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Here you could add logic to filter products based on selected tab
      const selectedTab = tab.getAttribute('data-tab');
      console.log('Selected tab:', selectedTab);
    });
  });
  
  // Category link interactions
  categoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links
      categoryLinks.forEach(l => l.classList.remove('active'));
      // Add active class to clicked link
      link.classList.add('active');
      
      // Here you could add logic to filter products based on selected category
      const categoryText = link.textContent;
      console.log('Selected category:', categoryText);
      
      // Smooth scroll to product grid
      const productGrid = document.querySelector('.product-grid');
      if (productGrid) {
        const gridTop = productGrid.getBoundingClientRect().top + window.scrollY - headerHeight - categoryNav.offsetHeight - 20;
        window.scrollTo({
          top: gridTop,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Update sticky position on resize
  window.addEventListener('resize', handleStickyNav, { passive: true });
})();

// Product Card Wishlist Toggle and Gallery Integration
(function() {
  const wishlistButtons = document.querySelectorAll('.product-card__wishlist');
  
  wishlistButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Toggle active state
      button.classList.toggle('is-active');
      
      // Get product data from card
      const productCard = button.closest('.product-card');
      const productImg = productCard.querySelector('.product-card__image img');
      const productTitle = productCard.querySelector('.product-card__title')?.textContent;
      const productModel = productCard.querySelector('.product-card__model')?.textContent;
      const productPrice = productCard.querySelector('.product-card__price')?.textContent;
      const imageSrc = productImg?.src;
      
      if (button.classList.contains('is-active')) {
        console.log('Added to wishlist:', productTitle);
        
        // Add to gallery if function exists
        if (typeof window.addProductToGallery === 'function' && imageSrc) {
          window.addProductToGallery(imageSrc, {
            title: productTitle,
            model: productModel,
            price: productPrice
          });
        }
      } else {
        console.log('Removed from wishlist:', productTitle);
        // TODO: Could remove from gallery here if needed
      }
    });
  });
  
  // Enable drag and drop from product cards to gallery
  const productImages = document.querySelectorAll('.product-card__image');
  
  productImages.forEach(imageContainer => {
    const img = imageContainer.querySelector('img');
    if (!img) return;
    
    // Make the image container draggable
    imageContainer.setAttribute('draggable', 'true');
    
    imageContainer.addEventListener('dragstart', (e) => {
      const productCard = imageContainer.closest('.product-card');
      const productTitle = productCard.querySelector('.product-card__title')?.textContent;
      const productModel = productCard.querySelector('.product-card__model')?.textContent;
      const productPrice = productCard.querySelector('.product-card__price')?.textContent;
      const imageSrc = img.src;
      
      // Set drag data
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', imageSrc);
      e.dataTransfer.setData('application/json', JSON.stringify({
        src: imageSrc,
        title: productTitle,
        model: productModel,
        price: productPrice
      }));
      
      // Visual feedback
      imageContainer.style.opacity = '0.5';
    });
    
    imageContainer.addEventListener('dragend', (e) => {
      imageContainer.style.opacity = '1';
    });
  });
  
  // Add drop zone to gallery wrapper
  setTimeout(() => {
    const galleryWrapper = document.querySelector('.image-gallery-wrapper');
    if (!galleryWrapper) return;
    
    galleryWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      galleryWrapper.style.transform = 'translateY(-4px) scale(1.02)';
      galleryWrapper.style.boxShadow = '0 12px 40px rgba(0,0,0,0.18)';
    });
    
    galleryWrapper.addEventListener('dragleave', (e) => {
      galleryWrapper.style.transform = '';
      galleryWrapper.style.boxShadow = '';
    });
    
    galleryWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      galleryWrapper.style.transform = '';
      galleryWrapper.style.boxShadow = '';
      
      const imageSrc = e.dataTransfer.getData('text/plain');
      const productDataStr = e.dataTransfer.getData('application/json');
      
      if (imageSrc && typeof window.addProductToGallery === 'function') {
        const productData = productDataStr ? JSON.parse(productDataStr) : { title: 'Product' };
        window.addProductToGallery(imageSrc, productData);
      }
    });
  }, 1000);
})();
