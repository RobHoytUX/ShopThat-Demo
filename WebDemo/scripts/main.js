/* Basic interactivity to emulate LV page behavior */
(function () {
  const header = document.querySelector('.lv-header');
  const burger = document.querySelector('.lv-burger');
  const searchLink = document.querySelector('.lv-search-link');
  const nav = document.getElementById('nav');

  function readStoredArray(key) {
    if (window.ShopThatStorage) return window.ShopThatStorage.readArray(key);
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      localStorage.removeItem(key);
      return [];
    }
  }
  
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
    const hero = document.querySelector('.hero');
    let readyHandled = false;
    const onReady = () => {
      if (readyHandled) return;
      readyHandled = true;
      if (hero) hero.classList.add('hero--video-ready');
    };
    // If the video has already buffered enough by the time this script runs
    // (common on fast CDNs), the canplay event has already fired and a fresh
    // listener would never run. Check readyState first, then listen to several
    // events so we don't get stuck behind the white fallback overlay.
    if (video.readyState >= 2 /* HAVE_CURRENT_DATA */) {
      onReady();
    }
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('playing', onReady);
    // Fallback: if for any reason the video never reports ready (autoplay blocked,
    // codec not negotiated, etc.) reveal the underlying area after a short delay
    // so the page doesn't sit behind the white overlay.
    setTimeout(onReady, 2500);
    // Best-effort autoplay kick — some browsers need an explicit play() after load
    const tryPlay = () => {
      const p = video.play && video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    tryPlay();

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
  .chatbot-drop-zone{position:absolute;inset:0;background:linear-gradient(135deg,rgba(74,144,226,0.15),rgba(74,144,226,0.08));border:2px dashed rgba(74,144,226,0.5);border-radius:12px;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:100;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);transition:all 200ms ease}
  .chatbot-drop-zone.is-active{display:flex}
  .chatbot-drop-zone.is-over{background:linear-gradient(135deg,rgba(74,144,226,0.25),rgba(74,144,226,0.15));border-color:rgba(74,144,226,0.8);transform:scale(1.01)}
  .chatbot-drop-zone__icon{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#4A90E2,#357ABD);display:grid;place-items:center;box-shadow:0 4px 16px rgba(74,144,226,0.4);animation:drop-pulse 1.5s ease-in-out infinite}
  .chatbot-drop-zone__icon svg{width:24px;height:24px;color:#fff}
  .chatbot-drop-zone__text{font-size:14px;font-weight:600;color:#4A90E2;text-align:center}
  .chatbot-drop-zone__hint{font-size:12px;color:#666;text-align:center}
  @keyframes drop-pulse{0%,100%{transform:scale(1);box-shadow:0 4px 16px rgba(74,144,226,0.4)}50%{transform:scale(1.08);box-shadow:0 6px 24px rgba(74,144,226,0.6)}}
  .product-card.is-dragging{opacity:0.5;transform:scale(0.95)}
  .product-card__image{cursor:grab}
  .product-card__image:active{cursor:grabbing}
  .drop-success-toast{position:fixed;bottom:120px;left:50%;transform:translateX(-50%) translateY(20px);background:linear-gradient(135deg,#10B981,#059669);color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(16,185,129,0.3);opacity:0;pointer-events:none;z-index:10000;transition:all 300ms cubic-bezier(0.34,1.56,0.64,1);display:flex;align-items:center;gap:8px}
  .drop-success-toast.is-visible{opacity:1;transform:translateX(-50%) translateY(0)}
  .drop-success-toast svg{width:20px;height:20px}
  .chatbot-product-card-image{width:100px;height:100px;border-radius:12px;object-fit:cover;flex-shrink:0}
  .chatbot-product-card-info{flex:1;min-width:0}
  .chatbot-product-card-title{font-size:15px;font-weight:600;color:#111;margin:0 0 6px;line-height:1.3}
  .chatbot-product-card-model{font-size:13px;color:#666;margin:0 0 6px}
  .chatbot-product-card-price{font-size:15px;font-weight:600;color:#111;margin:0}
  .chatbot-product-card-link{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#4A90E2;margin-top:6px;text-decoration:none;transition:color 150ms ease}
  .chatbot-product-card-link:hover{color:#357ABD}
  .chatbot-product-card-link svg{width:14px;height:14px}
  .lv-header,.lv-main,.lv-footer{transition:transform 300ms ease}
  body.luxury-preview-open .lv-header,body.luxury-preview-open .lv-main,body.luxury-preview-open .lv-footer{transform:translateX(-25vw)}
  body.luxury-preview-open .chatbot-wrapper{right:calc(50vw + 20px)}
  body.luxury-preview-open .image-gallery-wrapper{right:calc(50vw + 20px)}
  .luxury-image-preview-panel{position:fixed;inset:0 0 0 auto;width:50vw;height:100vh;z-index:10001;background:rgba(255,255,255,0.96);box-shadow:-16px 0 44px rgba(0,0,0,0.18);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);transform:translateX(100%);opacity:0;pointer-events:none;transition:transform 300ms ease,opacity 300ms ease;display:flex;flex-direction:column;padding:28px;box-sizing:border-box}
  .luxury-image-preview-panel.is-visible{transform:translateX(0);opacity:1;pointer-events:auto}
  .luxury-image-preview-panel[hidden]{display:none}
  .luxury-image-preview-close{align-self:flex-end;width:44px;height:44px;border-radius:50%;border:1px solid rgba(0,0,0,0.14);background:#fff;color:#111;font-size:28px;line-height:1;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.1)}
  .luxury-image-preview-close:hover{transform:scale(1.04)}
  .luxury-image-preview-body{flex:1;display:grid;place-items:center;min-height:0;padding:20px 0}
  .luxury-image-preview-img{max-width:100%;max-height:calc(100vh - 140px);object-fit:contain;border-radius:18px;box-shadow:0 18px 54px rgba(0,0,0,0.22);background:#f5f5f5}
  .luxury-image-preview-caption{font-size:13px;color:#555;text-align:center;margin:0}
  .chatbot-wrapper{position:fixed;bottom:104px;right:20px;z-index:999;transition:bottom 0.3s ease,right 300ms ease}
  .chatbot-wrapper.expanded{bottom:104px}
  .chatbot-wrapper.gallery-open{bottom:310px}
  .chatbot-wrapper.gallery-open.map-view-active{bottom:200px}
  .chatbot-wrapper.gallery-open .chatbot-toggle{bottom:-80px}
  .image-gallery-wrapper{position:fixed;top:auto;bottom:-200px;right:20px;z-index:997;width:506px;opacity:0;transform:translateY(20px);pointer-events:none;transition:opacity 300ms ease,transform 300ms ease,bottom 0.3s ease,max-height 0.3s ease}
  .image-gallery-wrapper.is-visible{opacity:1;transform:translateY(0);pointer-events:auto;bottom:20px}
  .image-gallery-wrapper.compact-mode{max-height:90px}
  .image-gallery-wrapper.compact-mode .image-gallery{min-height:70px;padding:8px 40px}
  .image-gallery-wrapper.compact-mode .image-gallery-item{width:56px;height:56px}
  .image-gallery-wrapper.compact-mode .image-gallery-title{font-size:13px;top:8px;left:8px}
  .image-gallery-wrapper.compact-mode .image-gallery-clear{top:8px;right:8px;padding:4px 8px;font-size:10px}
  .image-gallery-wrapper[hidden]{display:none}
  .image-gallery{background:linear-gradient(135deg,rgba(255,255,255,0.4),rgba(255,255,255,0.22));border:1px solid rgba(255,255,255,0.35);border-radius:12px;padding:12px 40px;min-height:144px;box-shadow:0 8px 32px 0 rgba(31,38,135,0.3);backdrop-filter:blur(16px) saturate(180%);-webkit-backdrop-filter:blur(16px) saturate(180%);position:relative;overflow:visible}
  .image-gallery-title{position:absolute;top:12px;left:12px;font-size:16px;font-weight:600;color:#111;pointer-events:none;z-index:1}
  .image-gallery-clear{position:absolute;top:12px;right:12px;padding:6px 12px;border-radius:8px;border:1px solid rgba(0,0,0,0.2);background:rgba(255,255,255,0.95);font-size:12px;font-weight:500;color:#111;cursor:pointer;transition:all 200ms ease;z-index:1}
  .image-gallery-clear:hover{background:rgba(255,255,255,1);transform:scale(1.05)}
  .product-component{position:fixed;bottom:20px;left:20px;z-index:999;width:506px;opacity:0;transform:translateX(20px);pointer-events:none;transition:opacity 300ms ease,transform 300ms ease}
  .product-component.is-visible{opacity:1;transform:translateX(0);pointer-events:auto}
  .product-component[hidden]{display:none}
  .product-component-inner{background:linear-gradient(135deg,rgba(255,255,255,0.4),rgba(255,255,255,0.22));border:1px solid rgba(255,255,255,0.35);border-radius:12px;padding:12px;min-height:220px;box-shadow:0 8px 32px 0 rgba(31,38,135,0.3);backdrop-filter:blur(16px) saturate(180%);-webkit-backdrop-filter:blur(16px) saturate(180%);position:relative;overflow:visible}
  .product-component-title{position:absolute;top:12px;left:12px;font-size:16px;font-weight:600;color:#111;pointer-events:none;z-index:1}
  .product-component-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(0,0,0,0.2);background:rgba(255,255,255,0.95);display:grid;place-items:center;color:#111;cursor:pointer;transition:all 200ms ease;z-index:2}
  .product-component-close:hover{background:rgba(255,255,255,1);transform:scale(1.1)}
  .product-component-content{display:flex;flex-direction:column;gap:12px;padding:40px 20px 8px 20px}
  .product-component-card{background:rgba(255,255,255,0.98);border-radius:16px;padding:16px;display:flex;gap:16px;align-items:center;box-shadow:0 2px 12px rgba(0,0,0,0.12)}
  .product-component-gallery-label{font-size:15px;font-weight:600;color:#111;margin:0 0 8px 0}
  .product-component-gallery{display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:4px 0}
  .product-component-gallery::-webkit-scrollbar{display:none}
  .product-component-gallery-item{flex:0 0 auto;width:80px;height:80px;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all 200ms ease;background:#f5f5f5}
  .product-component-gallery-item:hover{transform:scale(1.05);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
  .product-component-gallery-item.is-active{border-color:#111;transform:scale(1.05)}
  .product-component-gallery-item img{width:100%;height:100%;object-fit:cover}
  .product-component-image{width:100px;height:100px;border-radius:12px;object-fit:cover;flex-shrink:0;background:#f5f5f5}
  .product-component-info{flex:1;min-width:0}
  .product-component-info h3{margin:0 0 4px;font-size:16px;font-weight:600;color:#111;line-height:1.3}
  .product-component-info p{margin:2px 0;color:#666;font-size:13px}
  .image-gallery-track{display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:40px 0 4px 0}
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
  .chatbot-map-container{display:none;width:100%;height:220px;border-radius:8px;overflow:hidden;margin:10px 0 10px 0;position:relative;z-index:1;flex-shrink:0}
  .chatbot-map-container.is-visible{display:block}
  .chatbot-wrapper.map-view-active .chatbot-box{overflow:hidden}
  .chatbot-wrapper.map-view-active .chatbot-map-container{height:280px;margin:32px 0 10px 0}
  .chatbot-wrapper.map-view-active .chatbot-location-explorer{margin-top:12px}
  .chatbot-product-gallery{display:none !important;width:100%;margin-top:6px;margin-bottom:0;overflow-x:auto;overflow-y:visible;white-space:nowrap;scrollbar-width:thin;padding:0 0 4px 0;gap:10px;flex-shrink:0;min-height:108px}
  .chatbot-product-gallery.is-visible{display:flex !important}
  .chatbot-wrapper.map-view-active .chatbot-product-gallery.is-visible{position:relative;left:auto;right:auto;bottom:auto;width:100%;display:grid !important;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;min-height:104px;overflow:visible;white-space:normal;padding:0}
  .chatbot-header[hidden],.chatbot-messages[hidden],.chatbot-input[hidden]{display:none !important}
  .chatbot-product-gallery::-webkit-scrollbar{height:6px}
  .chatbot-product-gallery::-webkit-scrollbar-track{background:rgba(0,0,0,0.06);border-radius:3px}
  .chatbot-product-gallery::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.25);border-radius:3px}
  .chatbot-map-empty{padding:20px;text-align:center;color:#666;font-size:14px;width:100%}
  .chatbot-map-product-card{flex:0 0 auto;width:248px;background:#fff;border-radius:14px;padding:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);display:flex;gap:10px;align-items:center;transition:all 0.2s ease;cursor:pointer;overflow:hidden;height:112px}
  .chatbot-map-product-card:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,0.15)}
  .chatbot-map-product-image{width:78px;height:88px;border-radius:10px;object-fit:cover;flex-shrink:0;background:#f5f5f5}
  .chatbot-map-product-info{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;overflow:hidden;justify-content:center}
  .chatbot-map-product-title{font-size:12px;font-weight:600;color:#111;margin:0;line-height:1.25;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-wrap:break-word}
  .chatbot-map-product-model{font-size:11px;color:#888;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chatbot-map-product-price{font-size:13px;font-weight:700;color:#111;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chatbot-map-product-link{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#4A90E2;text-decoration:none;margin-top:0;transition:color 0.2s ease;flex-shrink:0}
  .chatbot-map-product-link:hover{color:#357ABD}
  .chatbot-map-product-link svg{width:13px;height:13px;flex-shrink:0}
  .chatbot-wrapper.map-view-active .chatbot-map-product-card{width:auto;height:104px;padding:8px;flex-direction:column;align-items:stretch;gap:4px}
  .chatbot-wrapper.map-view-active .chatbot-map-product-image{width:100%;height:52px;object-fit:contain;border-radius:8px;background:transparent}
  .chatbot-wrapper.map-view-active .chatbot-map-product-info{gap:1px;text-align:left}
  .chatbot-wrapper.map-view-active .chatbot-map-product-title{font-size:9px;line-height:1.15;-webkit-line-clamp:2}
  .chatbot-wrapper.map-view-active .chatbot-map-product-price{font-size:10px}
  .chatbot-wrapper.map-view-active .chatbot-map-product-model,.chatbot-wrapper.map-view-active .chatbot-map-product-link{display:none}
  .chatbot-location-explorer{display:none !important;background:rgba(255,255,255,0.98);border-radius:12px;padding:16px;padding-bottom:24px;margin:0;box-shadow:0 2px 12px rgba(0,0,0,0.08);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);flex-direction:column;flex-shrink:0;min-height:250px}
  .chatbot-location-explorer.is-visible:not([hidden]){display:flex !important}
  .chatbot-explorer-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
  .chatbot-explorer-header h3{font-size:16px;font-weight:600;color:#111;margin:0}
  .chatbot-explorer-close{width:28px;height:28px;border-radius:50%;border:1px solid rgba(0,0,0,0.1);background:#fff;display:grid;place-items:center;cursor:pointer;transition:all 0.2s ease}
  .chatbot-explorer-close:hover{background:#f5f5f5;transform:scale(1.1)}
  .chatbot-explorer-close svg{width:14px;height:14px;color:#666}
  .chatbot-explorer-tabs{display:flex;gap:8px;margin-bottom:12px;border-bottom:1px solid rgba(0,0,0,0.1);padding-bottom:2px}
  .chatbot-explorer-tab{padding:8px 16px;border:none;background:transparent;font-size:12px;font-weight:500;color:#666;cursor:pointer;transition:all 0.2s ease;border-bottom:2px solid transparent;margin-bottom:-2px;white-space:nowrap}
  .chatbot-explorer-tab:hover{color:#111}
  .chatbot-explorer-tab.is-active{color:#111;border-bottom-color:#111}
  .chatbot-explorer-content{display:flex;gap:10px;overflow-x:auto;overflow-y:visible;padding-bottom:8px;scroll-behavior:smooth;scrollbar-width:none;-ms-overflow-style:none}
  .chatbot-explorer-content::-webkit-scrollbar{display:none}
  .chatbot-explorer-item{cursor:pointer;border-radius:10px;overflow:hidden;transition:all 0.2s ease;background:#f8f8f8;flex:0 0 auto;width:140px}
  .chatbot-explorer-item:hover{transform:translateY(-3px);box-shadow:0 4px 12px rgba(0,0,0,0.12)}
  .chatbot-explorer-image{width:140px;height:110px;object-fit:cover;display:block}
  .chatbot-explorer-name{padding:8px 6px;font-size:11px;font-weight:500;color:#111;margin:0;text-align:center;background:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .chatbot-toggle{background:#000;color:#fff;border-radius:50%;cursor:pointer;position:absolute;bottom:-80px;right:8px;border:0;outline:none;box-shadow:none;display:grid;place-items:center;width:56px;height:56px;padding:0;transition:bottom 0.3s ease}
  .chatbot-toggle:focus{outline:none}
  .chatbot-toggle img{width:24px;height:24px;filter:brightness(0) invert(1)}
  .chatbot-toggle--glass{background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7)); color:#111; border:1px solid rgba(0,0,0,0.15); box-shadow:0 8px 32px 0 rgba(31,38,135,0.2); backdrop-filter: blur(12px) saturate(160%); -webkit-backdrop-filter: blur(12px) saturate(160%)}
  .chatbot-toggle--glass img{filter:none}
  .chatbot-wrapper.expanded .chatbot-toggle{bottom:-80px}
  .chatbot-box{height:781.25px;width:506px;color:#111;border-radius:12px;padding:28px 12px 20px 12px;display:flex;flex-direction:column;position:relative;box-sizing:border-box;overflow-x:hidden;overflow-y:visible;
    background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.22));
    border: 1px solid rgba(255,255,255,0.35);
    box-shadow: 0 8px 32px 0 rgba(31,38,135,0.3);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    opacity:1; transform: translateY(0);
    transition: opacity 200ms ease, transform 200ms ease, width 200ms ease, height 200ms ease;
  }
  .chatbot-box.chatbot-box--compact{width:253px;height:351px}
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
  .chatbot-media-btn{position:absolute;top:20px;left:46px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(0,0,0,0.2);background:rgba(255,255,255,0.95);display:grid;place-items:center;color:#111;cursor:pointer;transition:background 200ms ease,box-shadow 200ms ease;z-index:10}
  .chatbot-media-btn:hover{background:rgba(255,255,255,1)}
  .chatbot-media-btn.is-active{background:#6366f1;color:#fff;border-color:#6366f1}
  .chatbot-media-btn[hidden]{display:none}
  .chatbot-nav{position:fixed;bottom:104px;right:542px;width:56px;background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.9));border:1px solid rgba(0,0,0,0.1);border-radius:28px;padding:16px 0;display:flex;flex-direction:column;align-items:center;gap:8px;box-shadow:0 4px 24px rgba(0,0,0,0.12);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;transform:translateX(-8px);pointer-events:none;transition:opacity 200ms ease,transform 200ms ease,bottom 0.3s ease}
  .chatbot-nav.is-visible{opacity:1;transform:translateX(0);pointer-events:auto}
  .chatbot-wrapper.gallery-open .chatbot-nav{bottom:310px}
  .chatbot-wrapper.gallery-open.map-view-active .chatbot-nav{bottom:200px}
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
  .chatbot-wrapper[data-chatbot-view=chat] .chatbot-messages .chatbot-product-card,
  .chatbot-wrapper[data-chatbot-view=chat] .chatbot-messages .product-list-grid{display:none !important}
  .chatbot-msg{max-width:80%;padding:10px 12px;border-radius:16px;line-height:1.35;font-size:14px;word-wrap:break-word;white-space:pre-wrap;position:relative;transition:opacity 200ms ease}
  .chatbot-msg.chatbot-msg-markdown{white-space:normal}
  .chatbot-msg-markdown p{margin:0 0 8px}
  .chatbot-msg-markdown p:last-child{margin-bottom:0}
  .chatbot-msg-markdown ul,.chatbot-msg-markdown ol{margin:8px 0;padding-left:1.2em}
  .chatbot-msg-markdown li{margin:4px 0}
  .chatbot-msg-markdown img{max-width:100%;height:auto;border-radius:8px}
  .chatbot-msg-markdown a{color:#1a1a1a;text-decoration:underline}
  .chatbot-msg-domain{font-size:11px;color:#666;margin-top:6px;font-weight:500}
  .chatbot-msg-user{align-self:flex-end;background:rgba(0,0,0,0.78);color:#fff;border-radius:30px 30px 6px 30px;margin-right:8px}
  .chatbot-msg-bot{align-self:flex-start;background:#f2f2f2;color:#111;border-radius:30px 30px 30px 6px}
  .chatbot-images{align-self:stretch;width:100%;max-width:100%;background:transparent;padding:8px;border-radius:12px;display:flex;flex-wrap:nowrap;gap:8px;justify-content:flex-start;box-sizing:border-box;overflow:visible}
  .chatbot-image-wrap{position:relative;display:inline-block;flex:1 1 0;min-width:0}
  .chatbot-rank-badge{position:absolute;top:8px;left:8px;border-radius:999px;background:rgba(17,17,17,0.82);color:#fff;font-size:10px;font-weight:600;line-height:1;padding:5px 7px;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.22)}
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
  .product-list-bookmark{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,0.95);cursor:pointer;display:grid;place-items:center;transition:all 0.2s ease;z-index:2}
  .product-list-bookmark:hover{background:#fff;transform:scale(1.1)}
  .product-list-bookmark svg{width:18px;height:18px;color:#4A90E2}
  .product-list-bookmark.is-active svg{fill:#4A90E2}
  .nav-badge{position:absolute;top:-4px;right:-4px;background:#e74c3c;color:#fff;border-radius:10px;padding:0 6px;font-size:10px;line-height:18px;height:18px;min-width:18px;display:inline-grid;place-items:center;font-weight:600}
  @media (max-width:900px){body.luxury-preview-open .lv-header,body.luxury-preview-open .lv-main,body.luxury-preview-open .lv-footer{transform:none}.luxury-image-preview-panel{width:100vw}.chatbot-wrapper{transition:bottom 0.3s ease}body.luxury-preview-open .chatbot-wrapper,body.luxury-preview-open .image-gallery-wrapper{right:20px}}
  .chatbot-product-item--filled{background:transparent;border:1px solid rgba(0,0,0,0.15);position:relative;overflow:hidden}
  .chatbot-product-item--filled img{width:100%;height:100%;object-fit:cover}
  .chatbot-map-legend{position:absolute;bottom:20px;right:20px;background:white;padding:12px 16px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:1000;min-width:180px}
  .chatbot-map-legend .map-legend-title{font-size:13px;font-weight:600;margin:0 0 10px 0;color:#111}
  .chatbot-map-legend .map-legend-items{display:flex;flex-direction:column;gap:8px}
  .chatbot-map-legend .map-legend-item{display:flex;align-items:center;gap:8px}
  .chatbot-map-legend .map-legend-marker{width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);flex-shrink:0}
  .chatbot-map-legend .map-legend-item span{font-size:12px;color:#333}
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

  function readStoredArray(key){
    if (window.ShopThatStorage) return window.ShopThatStorage.readArray(key);
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      try { localStorage.removeItem(key); } catch (_) {}
      return [];
    }
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

    const wrapper = createEl('div', { class: 'chatbot-wrapper', role: 'complementary', 'aria-label': 'Chatbot', 'data-chatbot-view': 'chat' });
    const toggle  = createEl('button', { class: 'chatbot-toggle', 'aria-expanded': 'true', 'aria-controls': 'chatbot-box', title: 'Open chat' });
    const box     = createEl('div', { class: 'chatbot-box', id: 'chatbot-box' });
    
    // Create drop zone for product drag and drop
    const dropZone = createEl('div', { class: 'chatbot-drop-zone' });
    const dropIcon = createEl('div', { class: 'chatbot-drop-zone__icon' });
    const dropIconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    dropIconSvg.setAttribute('viewBox', '0 0 24 24');
    dropIconSvg.setAttribute('fill', 'none');
    dropIconSvg.setAttribute('stroke', 'currentColor');
    dropIconSvg.setAttribute('stroke-width', '2');
    const dropIconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    dropIconPath.setAttribute('d', 'M12 4v16m8-8H4');
    dropIconPath.setAttribute('stroke-linecap', 'round');
    dropIconPath.setAttribute('stroke-linejoin', 'round');
    dropIconSvg.appendChild(dropIconPath);
    dropIcon.appendChild(dropIconSvg);
    const dropText = createEl('div', { class: 'chatbot-drop-zone__text' }, [document.createTextNode('Drop to add product')]);
    const dropHint = createEl('div', { class: 'chatbot-drop-zone__hint' }, [document.createTextNode('Will be saved to Dashboard, Map & Bookmarks')]);
    dropZone.appendChild(dropIcon);
    dropZone.appendChild(dropText);
    dropZone.appendChild(dropHint);
    box.appendChild(dropZone);
    
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
    const sortBtn = createEl('button', { class: 'chatbot-sort', title: 'Menu', type: 'button' });
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

    const mediaBtn = createEl('button', { class: 'chatbot-media-btn', title: 'My Media', type: 'button' });
    const mediaIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mediaIcon.setAttribute('xmlns','http://www.w3.org/2000/svg');
    mediaIcon.setAttribute('viewBox','0 0 24 24');
    mediaIcon.setAttribute('fill','none');
    mediaIcon.setAttribute('stroke','currentColor');
    mediaIcon.setAttribute('width','16');
    mediaIcon.setAttribute('height','16');
    mediaIcon.setAttribute('stroke-width','1.5');
    const mediaPath1 = document.createElementNS('http://www.w3.org/2000/svg','rect');
    mediaPath1.setAttribute('x','3');
    mediaPath1.setAttribute('y','3');
    mediaPath1.setAttribute('width','18');
    mediaPath1.setAttribute('height','18');
    mediaPath1.setAttribute('rx','2');
    mediaPath1.setAttribute('ry','2');
    const mediaPath2 = document.createElementNS('http://www.w3.org/2000/svg','circle');
    mediaPath2.setAttribute('cx','8.5');
    mediaPath2.setAttribute('cy','8.5');
    mediaPath2.setAttribute('r','1.5');
    const mediaPath3 = document.createElementNS('http://www.w3.org/2000/svg','polyline');
    mediaPath3.setAttribute('points','21 15 16 10 5 21');
    mediaIcon.appendChild(mediaPath1);
    mediaIcon.appendChild(mediaPath2);
    mediaIcon.appendChild(mediaPath3);
    mediaBtn.appendChild(mediaIcon);
    
    // Create navigation menu
    const chatbotNav = createEl('div', { class: 'chatbot-nav' });

    // Create product component (styled like gallery, positioned above it)
    const productComponent = createEl('div', { class: 'product-component', hidden: '' });
    const productComponentInner = createEl('div', { class: 'product-component-inner' });
    const productComponentTitle = createEl('div', { class: 'product-component-title' }, [document.createTextNode('My Products')]);
    const productComponentBack = createEl('button', { class: 'product-component-close', 'aria-label': 'Back to My Media' });
    
    const productBackIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    productBackIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    productBackIcon.setAttribute('viewBox', '0 0 24 24');
    productBackIcon.setAttribute('fill', 'none');
    productBackIcon.setAttribute('stroke', 'currentColor');
    productBackIcon.setAttribute('width', '20');
    productBackIcon.setAttribute('height', '20');
    const productBackPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    productBackPath.setAttribute('d', 'M15 18l-6-6 6-6');
    productBackPath.setAttribute('stroke-linecap', 'round');
    productBackPath.setAttribute('stroke-linejoin', 'round');
    productBackPath.setAttribute('stroke-width', '1.5');
    productBackIcon.appendChild(productBackPath);
    productComponentBack.appendChild(productBackIcon);

    const productComponentContent = createEl('div', { class: 'product-component-content' });

    productComponentBack.addEventListener('click', () => {
      toggleProductComponent(false);
      setTimeout(() => {
        galleryVisible = true; // Update state when showing gallery
        toggleGallery(true);
      }, 150);
    });

    productComponentInner.appendChild(productComponentTitle);
    productComponentInner.appendChild(productComponentBack);
    productComponentInner.appendChild(productComponentContent);
    productComponent.appendChild(productComponentInner);
    document.body.appendChild(productComponent);

    const imagePreviewPanel = createEl('aside', {
      class: 'luxury-image-preview-panel',
      'aria-label': 'Image preview',
      hidden: ''
    });
    const imagePreviewClose = createEl('button', {
      class: 'luxury-image-preview-close',
      type: 'button',
      'aria-label': 'Close image preview',
      text: 'x'
    });
    const imagePreviewBody = createEl('div', { class: 'luxury-image-preview-body' });
    const imagePreviewImg = createEl('img', { class: 'luxury-image-preview-img', alt: 'Luxury Intelligence preview' });
    const imagePreviewCaption = createEl('p', { class: 'luxury-image-preview-caption', text: 'Luxury Intelligence image preview' });
    imagePreviewBody.appendChild(imagePreviewImg);
    imagePreviewPanel.appendChild(imagePreviewClose);
    imagePreviewPanel.appendChild(imagePreviewBody);
    imagePreviewPanel.appendChild(imagePreviewCaption);
    document.body.appendChild(imagePreviewPanel);

    function openImagePreview(imageUrl) {
      imagePreviewImg.src = imageUrl;
      imagePreviewPanel.removeAttribute('hidden');
      requestAnimationFrame(() => {
        document.body.classList.add('luxury-preview-open');
        imagePreviewPanel.classList.add('is-visible');
      });
    }

    function closeImagePreview() {
      document.body.classList.remove('luxury-preview-open');
      imagePreviewPanel.classList.remove('is-visible');
      window.setTimeout(() => {
        if (!imagePreviewPanel.classList.contains('is-visible')) {
          imagePreviewPanel.setAttribute('hidden', '');
          imagePreviewImg.removeAttribute('src');
        }
      }, 300);
    }

    imagePreviewClose.addEventListener('click', closeImagePreview);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && imagePreviewPanel.classList.contains('is-visible')) {
        closeImagePreview();
      }
    });

    let navVisible = false;
    let galleryVisible = false; // Track gallery visibility state
    
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
        case 'bookmark':
          path.setAttribute('d', 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z');
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
      { icon: 'map', id: 'nav-map', title: 'Map', view: 'map', closeNav: false },
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
          window.open('product-dashboard.html', '_blank');
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
    let chatbotLocationMarkers = []; // Store location markers for cleanup
    
    const chatbotLocationData = window.ShopThatMainMapData || {
      restaurants: [],
      museums: [],
      galleries: [],
      others: []
    };

    // Function to initialize Leaflet map
    function initializeMap() {
      if (leafletMap) return; // Already initialized

      if (typeof L !== 'undefined') {
          // Initialize map centered between both stores, zoomed out to show both
          leafletMap = L.map('chatbot-map').setView([40.7438, -73.9853], 12);
          
          // Define base layers for map and satellite views
          const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          });
          
          const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '',
            maxZoom: 19
          });
          
          // Add default layer (street map)
          streetMap.addTo(leafletMap);
          
          // Create layer control
          const baseMaps = {
            "Map View": streetMap,
            "Satellite View": satelliteMap
          };
          
          L.control.layers(baseMaps, null, { position: 'topright' }).addTo(leafletMap);
          
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
          
          // Add Louis Vuitton NYC store markers with custom icon
          const stores = [
            { lat: 40.7632, lng: -73.9732, name: 'Louis Vuitton 57th Street', address: '6 E 57th St, New York, NY 10022' },
            { lat: 40.7245, lng: -73.9975, name: 'Louis Vuitton SoHo', address: '116 Greene St, New York, NY 10012' }
          ];
          
          stores.forEach(store => {
            L.marker([store.lat, store.lng], { icon: lvIcon })
              .bindPopup(`<b>${store.name}</b><br>${store.address}`)
              .addTo(leafletMap);
          });
          
          // Add all nearby locations to map by default with color-coded markers
          const addNearbyLocations = () => {
            // Create custom icons for different categories
            const restaurantIcon = L.divIcon({
              className: 'custom-restaurant-marker',
              html: '<div style="width: 12px; height: 12px; background: #10b981; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });
            
            const museumIcon = L.divIcon({
              className: 'custom-museum-marker',
              html: '<div style="width: 12px; height: 12px; background: #8b5cf6; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });
            
            const galleryIcon = L.divIcon({
              className: 'custom-gallery-marker',
              html: '<div style="width: 12px; height: 12px; background: #f59e0b; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });
            
            const otherIcon = L.divIcon({
              className: 'custom-other-marker',
              html: '<div style="width: 12px; height: 12px; background: #3b82f6; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });
            
            // Add restaurants
            chatbotLocationData.restaurants.forEach(location => {
              const popupContent = location.address 
                ? `<b>${location.name}</b><br><small>${location.address}</small>`
                : `<b>${location.name}</b>`;
              L.marker([location.lat, location.lng], { icon: restaurantIcon })
                .bindPopup(popupContent)
                .addTo(leafletMap);
            });
            
            // Add museums
            chatbotLocationData.museums.forEach(location => {
              const popupContent = location.address 
                ? `<b>${location.name}</b><br><small>${location.address}</small>`
                : `<b>${location.name}</b>`;
              L.marker([location.lat, location.lng], { icon: museumIcon })
                .bindPopup(popupContent)
                .addTo(leafletMap);
            });
            
            // Add galleries
            chatbotLocationData.galleries.forEach(location => {
              const popupContent = location.address 
                ? `<b>${location.name}</b><br><small>${location.address}</small>`
                : `<b>${location.name}</b>`;
              L.marker([location.lat, location.lng], { icon: galleryIcon })
                .bindPopup(popupContent)
                .addTo(leafletMap);
            });
            
            // Add others
            chatbotLocationData.others.forEach(location => {
              const popupContent = location.address 
                ? `<b>${location.name}</b><br><small>${location.address}</small>`
                : `<b>${location.name}</b>`;
              L.marker([location.lat, location.lng], { icon: otherIcon })
                .bindPopup(popupContent)
                .addTo(leafletMap);
            });
          };
          
          addNearbyLocations();
          
          // Add map legend
          const mapLegend = createEl('div', { class: 'chatbot-map-legend' });
          mapLegend.innerHTML = `
            <h4 class="map-legend-title">Map Legend</h4>
            <div class="map-legend-items">
              <div class="map-legend-item">
                <div class="map-legend-marker" style="background: #000;"></div>
                <span>Louis Vuitton</span>
              </div>
              <div class="map-legend-item">
                <div class="map-legend-marker" style="background: #10b981;"></div>
                <span>Restaurants</span>
              </div>
              <div class="map-legend-item">
                <div class="map-legend-marker" style="background: #8b5cf6;"></div>
                <span>Museums</span>
              </div>
              <div class="map-legend-item">
                <div class="map-legend-marker" style="background: #f59e0b;"></div>
                <span>Galleries</span>
              </div>
              <div class="map-legend-item">
                <div class="map-legend-marker" style="background: #3b82f6;"></div>
                <span>Others Nearby</span>
              </div>
            </div>
          `;
          document.getElementById('chatbot-map').appendChild(mapLegend);
          
          // Fix map display after the container has had a layout frame.
          requestAnimationFrame(() => {
            if (leafletMap) {
              leafletMap.invalidateSize();
            }
          });
      }
    }
    
    // Helper to clear map view specific classes
    function clearMapViewClasses() {
      wrapper.classList.remove('map-view-active');
      if (galleryWrapper) {
        galleryWrapper.classList.remove('compact-mode');
      }
    }
    
    // Function to switch chatbot views
    function switchChatbotView(view) {
      wrapper.setAttribute('data-chatbot-view', view);
      // Clear map view classes for non-map views
      if (view !== 'map') {
        clearMapViewClasses();
      }
      
      // Hide/show different sections based on view
      if (view === 'chat') {
        // Show chatbot interface ONLY - chat view is the only one with input
        header.removeAttribute('hidden');
        messages.removeAttribute('hidden');
        inputW.removeAttribute('hidden');
        mapContainer.classList.remove('is-visible');
        productGallery.classList.remove('is-visible');
        chatbotLocationExplorer.classList.remove('is-visible');
        // Close location explorer and return to default size
        closeChatbotLocationExplorer();
        // Return to default chat size
        updateBoxSizeForState();
        // Restore chat messages if they exist - DON'T clear them
      } else if (view === 'library') {
        // Show product list view (book icon) - NO INPUT
        header.setAttribute('hidden', '');
        messages.removeAttribute('hidden');
        inputW.setAttribute('hidden', '');
        mapContainer.classList.remove('is-visible');
        productGallery.classList.remove('is-visible');
        chatbotLocationExplorer.classList.remove('is-visible');
        // Close location explorer and return to default size
        closeChatbotLocationExplorer();
        // Return to default size
        updateBoxSizeForState();
        // Render product list - DON'T clear existing messages
        renderProductListView();
      } else if (view === 'favorites') {
        // Show wishlist view (heart icon) - NO INPUT
        header.setAttribute('hidden', '');
        messages.removeAttribute('hidden');
        inputW.setAttribute('hidden', '');
        mapContainer.classList.remove('is-visible');
        productGallery.classList.remove('is-visible');
        chatbotLocationExplorer.classList.remove('is-visible');
        // Close location explorer and return to default size
        closeChatbotLocationExplorer();
        // Return to default size
        updateBoxSizeForState();
        // Render wishlist - DON'T clear existing messages
        renderWishlistView();
      } else if (view === 'map') {
        // Show map view with product gallery - NO CHAT MESSAGES OR INPUT
        header.setAttribute('hidden', '');
        messages.setAttribute('hidden', '');
        inputW.setAttribute('hidden', '');
        mapContainer.classList.add('is-visible');
        productGallery.classList.add('is-visible');
        // Don't add is-visible to explorer yet - it opens when clicking a product card

        // Add map-view-active class to wrapper for compact gallery positioning
        wrapper.classList.add('map-view-active');
        // Keep My Media at full size in map view
        if (galleryWrapper) {
          galleryWrapper.classList.remove('compact-mode');
        }

        // Set appropriate height for map view with product cards (no explorer)
        // Tightly fit: top padding (28) + map top margin (32) + map (280) + gap (10) + products (~104) + bottom padding (20)
        const mapViewHeight = Math.min(495, getMaxChatbotHeight());
        setBoxSize(FULL_W, mapViewHeight);

        // Initialize map and render products
        initializeMap();
        renderMapView();
        
        // Ensure map displays correctly
        setTimeout(() => {
          if (leafletMap) {
            leafletMap.invalidateSize();
          }
        }, 100);
      } else {
        // For other views (search), hide all chat elements including input
        header.setAttribute('hidden', '');
        messages.setAttribute('hidden', '');
        inputW.setAttribute('hidden', '');
        mapContainer.classList.remove('is-visible');
        productGallery.classList.remove('is-visible');
        chatbotLocationExplorer.classList.remove('is-visible');
        
        // Close location explorer and return to default size
        closeChatbotLocationExplorer();
        // Return to default size
        updateBoxSizeForState();
      }
    }
    
    // Create map and product gallery containers
    const mapContainer = createEl('div', { class: 'chatbot-map-container', id: 'chatbot-map' });
    const productGallery = createEl('div', { class: 'chatbot-product-gallery' });
    
    // Create location explorer for chatbot
    const chatbotLocationExplorer = createEl('div', { class: 'chatbot-location-explorer', id: 'chatbot-location-explorer', hidden: '' });
    const explorerHeader = createEl('div', { class: 'chatbot-explorer-header' });
    const explorerTitle = createEl('h3', { text: 'Explore Nearby' });
    const explorerClose = createEl('button', { class: 'chatbot-explorer-close', 'aria-label': 'Close' });
    const closeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    closeSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    closeSvg.setAttribute('viewBox', '0 0 24 24');
    closeSvg.setAttribute('fill', 'none');
    closeSvg.setAttribute('stroke', 'currentColor');
    closeSvg.setAttribute('stroke-width', '2');
    const explorerClosePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    explorerClosePath.setAttribute('d', 'M6 18L18 6M6 6l12 12');
    explorerClosePath.setAttribute('stroke-linecap', 'round');
    explorerClosePath.setAttribute('stroke-linejoin', 'round');
    closeSvg.appendChild(explorerClosePath);
    explorerClose.appendChild(closeSvg);
    explorerHeader.appendChild(explorerTitle);
    explorerHeader.appendChild(explorerClose);
    
    const explorerTabs = createEl('div', { class: 'chatbot-explorer-tabs' });
    const tabRestaurants = createEl('button', { class: 'chatbot-explorer-tab is-active', 'data-category': 'restaurants', text: 'Restaurants' });
    const tabMuseums = createEl('button', { class: 'chatbot-explorer-tab', 'data-category': 'museums', text: 'Museums' });
    const tabGalleries = createEl('button', { class: 'chatbot-explorer-tab', 'data-category': 'galleries', text: 'Galleries' });
    const tabOthers = createEl('button', { class: 'chatbot-explorer-tab', 'data-category': 'others', text: 'Others Nearby' });
    explorerTabs.appendChild(tabRestaurants);
    explorerTabs.appendChild(tabMuseums);
    explorerTabs.appendChild(tabGalleries);
    explorerTabs.appendChild(tabOthers);
    
    const explorerContent = createEl('div', { class: 'chatbot-explorer-content', id: 'chatbot-explorer-content' });
    
    chatbotLocationExplorer.appendChild(explorerHeader);
    chatbotLocationExplorer.appendChild(explorerTabs);
    chatbotLocationExplorer.appendChild(explorerContent);
    
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
    // Sizing constants and helpers (10% less than original 562.5px)
    const FULL_W = 506;
    const COMPACT_W = 253;
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
    
    function setBoxSize(widthPx, heightPx, skipConstraint = false){
      if (skipConstraint) {
        box.style.width = widthPx + 'px';
        box.style.height = heightPx + 'px';
      } else {
      const maxHeight = getMaxChatbotHeight();
      const constrainedHeight = Math.min(heightPx, maxHeight);
      box.style.width = widthPx + 'px';
      box.style.height = constrainedHeight + 'px';
      }
    }
    // Start in full expanded state with reduced width (10% less than original 562.5px)
    const INITIAL_W = 506;
    setBoxSize(INITIAL_W, 600);

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

    function keywordToLuxuryQuery(label) {
      const q = String(label || '').toLowerCase();
      if (q === 'kusama' || q === 'kusama x lv campaign') {
        return 'Tell me about the Louis Vuitton and Yayoi Kusama collaboration: campaigns, iconic products, and visual themes.';
      }
      if (q.includes('capucines')) {
        return 'Tell me about the Louis Vuitton Capucines bag, including Kusama editions and pricing context.';
      }
      return 'Tell me about "' + label + '" in the context of Louis Vuitton luxury fashion, campaigns, and retail.';
    }

    async function runLuxuryQueryForKeyword(label) {
      if (!window.LuxuryIntelligence) return;
      showThinking();
      try {
        const data = await window.LuxuryIntelligence.ask(keywordToLuxuryQuery(label));
        hideThinking();
        addMessage('bot', String(data.answer || ''), {
          renderMarkdown: true,
          domain: data.domain
        });
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          displayImages(data.images, data.rank_data);
        } else {
          finalizeAssistantTurnScroll();
        }
        if (window.ShopThatData && currentSessionId) {
          const botKeywords = window.ShopThatData.extractKeywordsFromText(String(data.answer || ''));
          window.ShopThatData.addChatMessage(currentSessionId, String(data.answer || ''), 'bot', botKeywords);
        }
      } catch (e) {
        hideThinking();
        console.error('LuxuryIntelligence keyword query failed', e);
        addMessage('bot', 'Luxury Intelligence is temporarily unavailable. Please try again in a moment.');
        finalizeAssistantTurnScroll();
      }
    }

    function onKeywordSelect(label){
      hasSelectedKeyword = true;
      setInputsEnabled(true);
      input.value = label;
      input.focus();

      addMessage('user', label);

      if (window.ShopThatData) {
        window.ShopThatData.trackKeywordUsage(label, 'chatbot-selection');
        if (currentSessionId) {
          window.ShopThatData.addChatMessage(currentSessionId, label, 'user', [label]);
        }
      }

      void runLuxuryQueryForKeyword(label);
    }

    // Remove hardcoded mock keywords - now using ShopThatData system above

    // Details functionality removed since we're using ShopThatData keywords directly
    // The back button is no longer needed since there are no detail views
    backBtn.setAttribute('hidden','');

    box.appendChild(refreshBtn); box.appendChild(backBtn); box.appendChild(sortBtn); box.appendChild(mediaBtn); box.appendChild(header); box.appendChild(mapContainer); box.appendChild(productGallery); box.appendChild(chatbotLocationExplorer); box.appendChild(messages); box.appendChild(inputW);
    
    // Navigation toggle functionality (menu only)
    sortBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navVisible = !navVisible;
      chatbotNav.classList.toggle('is-visible', navVisible);
    });

    // My Media toggle functionality
    mediaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      galleryVisible = !galleryVisible;
      mediaBtn.classList.toggle('is-active', galleryVisible);
      toggleGallery(galleryVisible);
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
    const MIN_MAP_PRODUCTS = 3;
    const defaultMapProducts = [
      { id: 'default-map-capucines-bb', title: 'LV X YK CAPUCINES BB', model: 'M46401', price: '$6,400.00', image: 'assets/Products/0047_LV X YK Capucines BB.jpg' },
      { id: 'default-map-capucines-white', title: 'LV X YK CAPUCINES BB WHITE', model: 'M46402', price: '$6,400.00', image: 'assets/Products/0048_LV X YK Capucines BB-white.jpg' },
      { id: 'default-map-twist-mm', title: 'LV X YK TWIST MM RED WHITE', model: 'M46403', price: '$4,200.00', image: 'assets/Products/0049_Louis-Vuitton-x-Yayoi-Kusama-Twist-MM-Red-White.jpg' }
    ];
    
    // Gallery images - declare early
    const galleryImages = [];

    function getProductKey(product) {
      return String(product?.id || product?.model || product?.title || product?.image || product?.src || '').toLowerCase();
    }

    function getMapProductsWithFallback(products) {
      const mapProducts = (Array.isArray(products) ? products : []).filter(Boolean).map(product => ({ ...product }));
      const existingKeys = new Set(mapProducts.map(getProductKey));

      defaultMapProducts.forEach(product => {
        if (mapProducts.length >= MIN_MAP_PRODUCTS) return;
        if (existingKeys.has(getProductKey(product))) return;

        mapProducts.push({ ...product, isDefaultMapProduct: true });
        existingKeys.add(getProductKey(product));
      });

      return mapProducts;
    }

    function getCompactMapProducts(products) {
      const compactProducts = defaultMapProducts.map(product => ({ ...product, isDefaultMapProduct: true }));
      const existingKeys = new Set(compactProducts.map(getProductKey));

      (Array.isArray(products) ? products : []).filter(Boolean).forEach(product => {
        if (existingKeys.has(getProductKey(product))) return;
        compactProducts.push({ ...product });
        existingKeys.add(getProductKey(product));
      });

      return compactProducts;
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
    
    // Track whether products are in view for keyword display
    let productsInView = false;
    
    // Helper function to show keywords based on scroll position
    function showKeywordsAnimated(allKeywords) {
      // First two chips when at top of page
      const initialKeywords = ['Capucines Bag', 'Kusama'];
      // Additional keywords to show when products are in view
      const productKeywords = ['Capucines BB', 'Capucines White', 'Twist MM'];
      
      showKeywords(initialKeywords);
          
      // Set up scroll listener for product visibility
      setupProductScrollListener(initialKeywords, productKeywords);
      }
      
    // Function to display keywords with animation
    function showKeywords(keywordList) {
        presets.replaceChildren();
      
      keywordList.forEach((label, index) => {
            const b = createEl('button', { type: 'button' }, [document.createTextNode(label)]);
            b.style.opacity = '0';
            b.style.transform = 'scale(0.8)';
            b.style.transition = 'opacity 300ms ease, transform 300ms ease';
        b.addEventListener('click', () => onKeywordSelect(label));
            presets.appendChild(b);
            
        // Stagger animation
        setTimeout(() => {
              b.style.opacity = '1';
              b.style.transform = 'scale(1)';
        }, index * 150);
      });
      
      ensureSizeForContent();
    }
    
    // Set up scroll listener to detect when products section is visible
    function setupProductScrollListener(initialKeywords, productKeywords) {
      const productGrid = document.querySelector('.product-grid');
      if (!productGrid) return;
      
      // Use Intersection Observer for efficient scroll detection
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !productsInView) {
            // Products are now visible - show additional keywords
            productsInView = true;
            console.log('Products in view - showing additional keywords');
            showKeywords([...initialKeywords, ...productKeywords]);
          } else if (!entry.isIntersecting && productsInView) {
            // Products no longer visible - show only initial keywords
            productsInView = false;
            console.log('Products out of view - showing only initial keywords');
            showKeywords(initialKeywords);
      }
        });
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of products section is visible
      });
      
      observer.observe(productGrid);
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

    /** After assistant text + optional images, align scroll so the latest user prompt is at the top of the messages viewport (AI reply starts in view, not scrolled to the bottom). */
    function finalizeAssistantTurnScroll(){
      requestAnimationFrame(() => {
        const users = messages.querySelectorAll('.chatbot-msg-user');
        const lastUser = users[users.length - 1];
        if (lastUser) {
          lastUser.scrollIntoView({ block: 'start', behavior: 'instant' });
        }
      });
    }

    function addMessage(sender, text, opts){
      const klass = sender === 'user' ? 'chatbot-msg chatbot-msg-user' : 'chatbot-msg chatbot-msg-bot';
      const div = createEl('div', { class: klass });
      if (sender === 'user') {
        div.textContent = text;
      } else if (opts && opts.renderMarkdown && window.LuxuryIntelligence) {
        div.classList.add('chatbot-msg-markdown');
        div.innerHTML = window.LuxuryIntelligence.markdownToHtml(text);
        if (opts.domain) {
          const dom = createEl('div', { class: 'chatbot-msg-domain', text: String(opts.domain) });
          div.appendChild(dom);
        }
      } else {
        div.textContent = markdownToText(text);
      }
      messages.appendChild(div);
      if (sender === 'user') {
        messages.scrollTop = messages.scrollHeight;
      }
      // Show refresh after the first bot response exists
      if (sender !== 'user') refreshBtn.removeAttribute('hidden');
      ensureSizeForContent();
    }

    function displayImages(imageUrls, rankData) {
      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) return;
      
      const imageContainer = createEl('div', { class: 'chatbot-msg chatbot-msg-bot chatbot-images' });
      imageUrls.forEach(imageUrl => {
        const imgWrapper = createEl('div', {
          class: 'chatbot-image-wrap'
        });
        imgWrapper.setAttribute('draggable', 'true');
        
        const img = createEl('img', {
          src: imageUrl,
          alt: 'Related image',
          style: 'width: 100%; height: 112px; object-fit: cover; border-radius: 8px; cursor: pointer; display: block;'
        });
        img.setAttribute('draggable', 'false'); // Prevent default image drag
        
        // Make wrapper draggable to gallery
        imgWrapper.addEventListener('dragstart', (e) => {
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('text/plain', imageUrl);
          e.dataTransfer.setData('application/json', JSON.stringify({
            src: imageUrl,
            title: 'Yayoi Kusama'
          }));
          imgWrapper.style.opacity = '0.5';
        });
        
        imgWrapper.addEventListener('dragend', (e) => {
          imgWrapper.style.opacity = '1';
        });
        
        img.addEventListener('click', () => openImagePreview(imageUrl));
        img.addEventListener('error', () => {
          imgWrapper.style.display = 'none';
        });
        
        imgWrapper.appendChild(img);
        if (window.LuxuryIntelligence && window.LuxuryIntelligence.getImageRank) {
          const rank = window.LuxuryIntelligence.getImageRank(rankData, imageUrl);
          const label = window.LuxuryIntelligence.getRankBadgeLabel(rank);
          if (label) {
            imgWrapper.appendChild(createEl('span', { class: 'chatbot-rank-badge', text: label }));
          }
        }
        imageContainer.appendChild(imgWrapper);
      });
      
      messages.appendChild(imageContainer);
      requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
      });
      ensureSizeForContent();
    }

    function displayProductCard(product) {
      if (currentView === 'chat') return;
      // Create product card element
      const card = createEl('div', { class: 'chatbot-product-card' });
      
      // Product image
      const img = createEl('img', { 
        class: 'chatbot-product-card-image',
        src: product.image || product.src,
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
      finalizeAssistantTurnScroll();
      ensureSizeForContent();
    }

    let thinkingIndicator = null;

    function showThinking() {
      if (thinkingIndicator) return; // Already showing
      
      thinkingIndicator = createEl('div', { class: 'chatbot-thinking' });
      const thinkingText = createEl('span', { class: 'chatbot-thinking-text', text: (window.LuxuryIntelligence && window.LuxuryIntelligence.ANALYZING_TEXT) || 'Analyzing Luxury Catalogs' });
      const dots = createEl('div', { class: 'chatbot-dots' });
      
      // Create three animated dots
      for (let i = 0; i < 3; i++) {
        const dot = createEl('span');
        dots.appendChild(dot);
      }
      
      thinkingIndicator.appendChild(thinkingText);
      thinkingIndicator.appendChild(dots);
      messages.appendChild(thinkingIndicator);
      const userNodes = messages.querySelectorAll('.chatbot-msg-user');
      const lastUser = userNodes[userNodes.length - 1];
      if (lastUser) {
        lastUser.scrollIntoView({ block: 'start', behavior: 'instant' });
      } else {
        messages.scrollTop = messages.scrollHeight;
      }
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
      
      addMessage('user', txt);

      if (window.ShopThatData && currentSessionId) {
        const keywordsFound = window.ShopThatData.extractKeywordsFromText(txt);
        window.ShopThatData.addChatMessage(currentSessionId, txt, 'user', keywordsFound);
      }
      input.value = '';
      // After first send, keep inputs enabled for continued conversation
      if (!hasSelectedKeyword) setInputsEnabled(true);
      
      // Show thinking indicator
      showThinking();
      
      try {
        if (!window.LuxuryIntelligence) throw new Error('LuxuryIntelligence not loaded');
        const d = await window.LuxuryIntelligence.ask(txt);
        hideThinking();

        const botResponse = String(d.answer || 'No response');
        addMessage('bot', botResponse, { renderMarkdown: true, domain: d.domain });

        if (d.images && Array.isArray(d.images) && d.images.length > 0) {
          displayImages(d.images, d.rank_data);
        } else {
          finalizeAssistantTurnScroll();
        }

        if (window.ShopThatData && currentSessionId) {
          const botKeywords = window.ShopThatData.extractKeywordsFromText(botResponse);
          window.ShopThatData.addChatMessage(currentSessionId, botResponse, 'bot', botKeywords);
        }

        refreshBtn.removeAttribute('hidden');
      } catch (e) {
        hideThinking();
        console.error('LuxuryIntelligence send failed', e);
        addMessage('bot', '❗ Luxury Intelligence could not answer right now. Please try again.');
        finalizeAssistantTurnScroll();
      }
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ e.preventDefault(); send(); }});

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
    
    // Add title to gallery
    const galleryTitle = createEl('div', { class: 'image-gallery-title' }, [document.createTextNode('My Media')]);
    
    // Add clear button
    const galleryClearBtn = createEl('button', { class: 'image-gallery-clear', type: 'button', 'aria-label': 'Clear added images' });
    galleryClearBtn.textContent = 'Clear';
    
    galleryClearBtn.addEventListener('click', () => {
      const keepSrcs = ['assets/canvas-1.jpg','assets/canvas-2.jpg','assets/canvas-3.jpg','assets/canvas-4.jpg','assets/canvas-5.jpg'];
      const kept = galleryImages.filter(img => keepSrcs.includes(img.src));
      galleryImages.length = 0;
      galleryImages.push(...kept);
      saveGalleryImages();
      renderGallery();
    });
    
    gallery.appendChild(galleryTitle);
    gallery.appendChild(galleryClearBtn);
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
      // Gallery is closed by default - user opens via hamburger menu
    }
    function closeBox(){
      // End chat session when closing
      if (window.ShopThatData && currentSessionId) {
        window.ShopThatData.endChatSession(currentSessionId);
      }
      
      // Close nav if it's open
      navVisible = false;
      galleryVisible = false;
      chatbotNav.classList.remove('is-visible');
      mediaBtn.classList.remove('is-active');
      
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
    
    function initializeDefaultMedia() {
      const defaultMediaImages = [
        { src: 'assets/canvas-1.jpg', productData: { title: 'Kusama Portrait - Polka Dot Room' } },
        { src: 'assets/canvas-2.jpg', productData: { title: 'Blue Face Paint Editorial' } },
        { src: 'assets/canvas-3.jpg', productData: { title: 'Kusama Polka Dot Outfit' } },
        { src: 'assets/canvas-4.jpg', productData: { title: 'LV x Kusama Blue Bag' } },
        { src: 'assets/canvas-5.jpg', productData: { title: 'Blue Paint Swatch' } }
      ];

      defaultMediaImages.forEach(defaultImg => {
        if (!galleryImages.some(img => img.src === defaultImg.src)) {
          galleryImages.push(defaultImg);
        }
      });

      saveGalleryImages();
      renderGallery();
    }
    
    // Load saved data from localStorage
    loadProducts();
    loadGalleryImages();
    loadWishlist();
    
    // Initialize default media if gallery is empty
    initializeDefaultMedia();
    
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
      
      saveGalleryImages(); // Save to localStorage
      
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
        emptyMessage.textContent = 'Click the bookmark icon on any product to add it to your favorites!';
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

          // Add click handler to open product modal
          galleryItem.addEventListener('click', () => {
            openProductModal(item);
          });

          // Add drag event listeners
          galleryItem.addEventListener('dragstart', handleDragStart);
          galleryItem.addEventListener('dragend', handleDragEnd);
        });
      }

      updateNavigationButtons();
    }

    // Toggle product component visibility
    function toggleProductComponent(show) {
      if (show) {
        productComponent.removeAttribute('hidden');
        requestAnimationFrame(() => {
          productComponent.classList.add('is-visible');
        });
      } else {
        productComponent.classList.remove('is-visible');
        setTimeout(() => {
          productComponent.setAttribute('hidden', '');
        }, 300);
      }
    }
    
    // Generate related products for gallery
    function generateRelatedProducts(currentProduct) {
      const allProducts = [
        { title: 'LV X YK CAPUCINES BB', model: 'M46401', price: '$6,400.00', image: 'assets/Products/0047_LV X YK Capucines BB.jpg' },
        { title: 'LV X YK CAPUCINES BB WHITE', model: 'M46402', price: '$6,400.00', image: 'assets/Products/0048_LV X YK Capucines BB-white.jpg' },
        { title: 'LV X YK TWIST MM RED WHITE', model: 'M46403', price: '$4,200.00', image: 'assets/Products/0049_Louis-Vuitton-x-Yayoi-Kusama-Twist-MM-Red-White.jpg' },
        { title: 'LV X YK CAPUCINES BB SILVER', model: 'M46404', price: '$6,400.00', image: 'assets/Products/0055_Louis-Vuitton-x-Yayoi-Kusama-Capucines-BB-Silver.jpg' },
        { title: 'LV X YK TECHNICAL GABARDINE BLAZER', model: 'M46406', price: '$3,900.00', image: 'assets/Products/0084_LV X YK TECHNICAL GABARDINE BLAZER.jpg' },
        { title: 'LV X YK COLLECTION BAG', model: 'M46407', price: '$2,750.00', image: 'assets/Products/0089_louisvuitton--FOPA50P89900_PM2_Front view.jpg' },
        { title: 'LV X YK METAL STUDS METAL JACKET', model: 'M46408', price: '$4,800.00', image: 'assets/Products/0102_LV X YK METAL STUDS METAL JACKET.jpg' },
        { title: 'LV X YK PAINTED DOTS ONE PIECE SWIMSUIT', model: 'M46409', price: '$1,200.00', image: 'assets/Products/0083_Louis-Vuitton-x-Yayoi-Kusama-Painted-Dots-One-Piece-Swimsuit-Black.jpg' }
      ];
      
      return allProducts;
    }
    
    // Function to show product in component above gallery
    function openProductModal(item) {
      // Clear previous content
      productComponentContent.replaceChildren();
      
      // Create card wrapper
      const productCard = createEl('div', { class: 'product-component-card' });
      
      // Create product image
      const productImg = createEl('img', {
        class: 'product-component-image',
        src: item.src,
        alt: item.productData?.title || 'Product image'
      });
      
      // Create product info
      const productInfo = createEl('div', { class: 'product-component-info' });
      const productTitle = createEl('h3', { text: item.productData?.title || 'Product Title' });
      const productModel = createEl('p', { text: `Model: ${item.productData?.model || 'N/A'}` });
      const productPrice = createEl('p', { text: `Price: ${item.productData?.price || 'N/A'}` });
      
      productInfo.appendChild(productTitle);
      productInfo.appendChild(productModel);
      productInfo.appendChild(productPrice);
      
      // Assemble card
      productCard.appendChild(productImg);
      productCard.appendChild(productInfo);
      
      // Add card to content
      productComponentContent.appendChild(productCard);
      
      // Create gallery label
      const galleryLabel = createEl('div', { class: 'product-component-gallery-label', text: 'Related products' });
      productComponentContent.appendChild(galleryLabel);
      
      // Create product gallery
      const gallery = createEl('div', { class: 'product-component-gallery' });
      const relatedProducts = generateRelatedProducts(item);
      
      relatedProducts.forEach((product, index) => {
        const galleryItem = createEl('div', { 
          class: index === 0 ? 'product-component-gallery-item is-active' : 'product-component-gallery-item'
        });
        
        const img = createEl('img', {
          src: product.image || product.src,
          alt: product.title
        });
        
        galleryItem.appendChild(img);
        
        // Add click handler to update main product card
        galleryItem.addEventListener('click', () => {
          // Remove active class from all items
          gallery.querySelectorAll('.product-component-gallery-item').forEach(i => 
            i.classList.remove('is-active')
          );
          // Add active class to clicked item
          galleryItem.classList.add('is-active');
          
          // Update main product card
          productImg.src = product.image || product.src;
          productTitle.textContent = product.title;
          productModel.textContent = `Model: ${product.model}`;
          productPrice.textContent = `Price: ${product.price}`;
        });
        
        gallery.appendChild(galleryItem);
      });
      
      productComponentContent.appendChild(gallery);
      
      // Hide My Media and show My Products with smooth transition
      galleryVisible = false; // Update state when hiding gallery
      toggleGallery(false);
      setTimeout(() => {
        toggleProductComponent(true);
      }, 150);
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
    
    // Save products to localStorage
    function saveProducts() {
      localStorage.setItem('droppedProducts', JSON.stringify(droppedProducts));
    }
    
    // Save gallery images to localStorage
    function saveGalleryImages() {
      localStorage.setItem('galleryImages', JSON.stringify(galleryImages));
    }
    
    // Save wishlist to localStorage
    function saveWishlist() {
      localStorage.setItem('wishlistProducts', JSON.stringify(wishlistProducts));
    }
    
    // Load products from localStorage on init
    function loadProducts() {
      const saved = localStorage.getItem('droppedProducts');
      if (saved) {
        try {
          const products = JSON.parse(saved);
          droppedProducts.push(...products);
        } catch (e) {
          console.error('Failed to load products:', e);
        }
      }
    }
    
    // Load gallery images from localStorage on init
    function loadGalleryImages() {
      const saved = localStorage.getItem('galleryImages');
      if (saved) {
        try {
          const images = JSON.parse(saved);
          galleryImages.push(...images);
          renderGallery();
        } catch (e) {
          console.error('Failed to load gallery images:', e);
        }
      }
    }
    
    // Load wishlist from localStorage on init
    function loadWishlist() {
      const saved = localStorage.getItem('wishlistProducts');
      if (saved) {
        try {
          const products = JSON.parse(saved);
          wishlistProducts.push(...products);
        } catch (e) {
          console.error('Failed to load wishlist:', e);
        }
      }
    }
    
    // Render product list view (book icon)
    function renderProductListView() {
      messages.replaceChildren();

      // Always reload from localStorage to get latest products
      const savedProducts = readStoredArray('droppedProducts');

      if (savedProducts.length === 0) {
        const emptyMsg = createEl('div', {
          class: 'no-products-message',
          text: 'No products yet. Drop images from the gallery to add products.'
        });
        messages.appendChild(emptyMsg);
      } else {
        const grid = createEl('div', { class: 'product-list-grid' });

        savedProducts.forEach(product => {
          const card = createEl('div', { class: 'product-list-card' });

          const img = createEl('img', { src: product.image || product.src, alt: product.title });
          const info = createEl('div', { class: 'product-list-info' });
          const title = createEl('h3', { class: 'product-list-title', text: product.title });
          const model = createEl('p', { class: 'product-list-model', text: product.model });
          const price = createEl('p', { class: 'product-list-price', text: product.price });

          const bookmarkBtn = createEl('button', { class: 'product-list-bookmark', 'aria-label': 'Add to bookmarks' });
          const bookmarkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          bookmarkSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          bookmarkSvg.setAttribute('viewBox', '0 0 24 24');
          bookmarkSvg.setAttribute('fill', wishlistProducts.some(p => p.id === product.id) ? 'currentColor' : 'none');
          bookmarkSvg.setAttribute('stroke', 'currentColor');
          bookmarkSvg.setAttribute('stroke-width', '1.5');
          const bookmarkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          bookmarkPath.setAttribute('d', 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z');
          bookmarkSvg.appendChild(bookmarkPath);
          bookmarkBtn.appendChild(bookmarkSvg);

          bookmarkBtn.addEventListener('click', () => {
            const index = wishlistProducts.findIndex(p => p.id === product.id);
            if (index > -1) {
              wishlistProducts.splice(index, 1);
              bookmarkSvg.setAttribute('fill', 'none');
            } else {
              wishlistProducts.push(product);
              bookmarkSvg.setAttribute('fill', 'currentColor');
            }
            saveWishlist(); // Save to localStorage
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
          card.appendChild(bookmarkBtn);
          card.appendChild(info);
          grid.appendChild(card);
        });

        messages.appendChild(grid);
      }
    }
    
    // Render wishlist view (heart icon)
    function renderWishlistView() {
      messages.replaceChildren();

      // Always reload from localStorage to get latest favorites
      const savedWishlist = readStoredArray('wishlistProducts');

      if (savedWishlist.length === 0) {
        const emptyMsg = createEl('div', {
          class: 'no-products-message',
          text: 'No bookmarks yet. Add products to your bookmarks from the product list.'
        });
        messages.appendChild(emptyMsg);
      } else {
        const grid = createEl('div', { class: 'product-list-grid' });

        savedWishlist.forEach(product => {
          const card = createEl('div', { class: 'product-list-card' });

          const img = createEl('img', { src: product.image || product.src, alt: product.title });
          const info = createEl('div', { class: 'product-list-info' });
          const title = createEl('h3', { class: 'product-list-title', text: product.title });
          const model = createEl('p', { class: 'product-list-model', text: product.model });
          const price = createEl('p', { class: 'product-list-price', text: product.price });

          const removeBtn = createEl('button', { class: 'product-list-bookmark is-active', 'aria-label': 'Remove from bookmarks' });
          const bookmarkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          bookmarkSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          bookmarkSvg.setAttribute('viewBox', '0 0 24 24');
          bookmarkSvg.setAttribute('fill', 'currentColor');
          bookmarkSvg.setAttribute('stroke', 'currentColor');
          bookmarkSvg.setAttribute('stroke-width', '1.5');
          const bookmarkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          bookmarkPath.setAttribute('d', 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z');
          bookmarkSvg.appendChild(bookmarkPath);
          removeBtn.appendChild(bookmarkSvg);

          removeBtn.addEventListener('click', () => {
            const index = wishlistProducts.findIndex(p => p.id === product.id);
            if (index > -1) {
              wishlistProducts.splice(index, 1);
              saveWishlist(); // Save to localStorage
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
      
      // Always reload from localStorage to get latest products
      const storedProducts = readStoredArray('droppedProducts');
      // Match the product-dashboard map: show at most 3 products,
      // preferring stored ones and filling the rest from defaults.
      const savedProducts = getMapProductsWithFallback(storedProducts).slice(0, MIN_MAP_PRODUCTS);
      
      // NYC LV store locations for product assignment
      const storeLocations = [
        { lat: 40.7632, lng: -73.9732, name: 'Louis Vuitton 57th Street', address: '6 E 57th St, New York, NY 10022' },
        { lat: 40.7245, lng: -73.9975, name: 'Louis Vuitton SoHo', address: '116 Greene St, New York, NY 10012' }
      ];
      
      if (savedProducts.length === 0) {
        // Show empty message
        const emptyMsg = createEl('div', { 
          class: 'chatbot-map-empty',
          text: 'No products yet. Drop product images from the homepage to see them here!' 
        });
        productGallery.appendChild(emptyMsg);
      } else {
        // Show actual product cards
        savedProducts.forEach((product, index) => {
          // Assign location alternately between the two stores
          const storeIndex = index % 2;
          product.location = {
            lat: storeLocations[storeIndex].lat,
            lng: storeLocations[storeIndex].lng
          };
          
          const card = createEl('div', { class: 'chatbot-map-product-card' });
          
          // Product image
          const img = createEl('img', { 
            class: 'chatbot-map-product-image',
            src: product.image || product.src,
            alt: product.title
          });
          
          // Product info
          const info = createEl('div', { class: 'chatbot-map-product-info' });
          const title = createEl('h3', { class: 'chatbot-map-product-title', text: product.title });
          const model = createEl('p', { class: 'chatbot-map-product-model', text: product.model });
          const price = createEl('p', { class: 'chatbot-map-product-price', text: product.price });
          
          // View on LV Store link
          const link = createEl('a', { 
            class: 'chatbot-map-product-link',
            href: `https://us.louisvuitton.com/eng-us/search/${encodeURIComponent(product.model || product.title || 'Louis Vuitton')}`,
            target: '_blank',
            rel: 'noopener noreferrer',
            text: 'View on LV Store '
          });
          
          // Add external link icon
          const linkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          linkIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          linkIcon.setAttribute('viewBox', '0 0 24 24');
          linkIcon.setAttribute('fill', 'none');
          linkIcon.setAttribute('stroke', 'currentColor');
          linkIcon.setAttribute('stroke-width', '2');
          linkIcon.setAttribute('width', '16');
          linkIcon.setAttribute('height', '16');
          const linkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          linkPath.setAttribute('d', 'M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25');
          linkPath.setAttribute('stroke-linecap', 'round');
          linkPath.setAttribute('stroke-linejoin', 'round');
          linkIcon.appendChild(linkPath);
          link.appendChild(linkIcon);
          
          info.appendChild(title);
          info.appendChild(model);
          info.appendChild(price);
          info.appendChild(link);
          
          card.appendChild(img);
          card.appendChild(info);
          
          // Add click handler to zoom to product location and open explorer
          card.addEventListener('click', (e) => {
            // Don't zoom or open explorer if clicking the link
            if (e.target.tagName === 'A' || e.target.closest('a')) return;
            
            if (leafletMap && product.location) {
              leafletMap.invalidateSize();
              leafletMap.flyTo([product.location.lat, product.location.lng], 15, {
                animate: true,
                duration: 0.5
              });
            }
            
            // Open location explorer
            openChatbotLocationExplorer();
          });
          
          productGallery.appendChild(card);
          
          // Add marker to map if available
          if (leafletMap && product.location) {
            const marker = L.marker([product.location.lat, product.location.lng])
              .bindPopup(`<b>${product.title}</b><br>${product.price}`)
              .addTo(leafletMap);
          }
        });
        
        // Keep saved products updated without writing default map placeholders into the library.
        if (storedProducts.length > 0) {
          storedProducts.forEach((product, index) => {
            const storeIndex = index % 2;
            product.location = {
              lat: storeLocations[storeIndex].lat,
              lng: storeLocations[storeIndex].lng
            };
          });
          localStorage.setItem('droppedProducts', JSON.stringify(storedProducts));
        }
      }
    }
    
    // Chatbot Location Explorer Functions
    function openChatbotLocationExplorer() {
      chatbotLocationExplorer.removeAttribute('hidden');
      chatbotLocationExplorer.classList.add('is-visible');
      loadChatbotLocationCategory('restaurants');
      
      // Mark wrapper as expanded (keeps bottom aligned with nav at 104px)
      wrapper.classList.add('expanded');
      
      // Calculate height to fit all content without scrolling:
      // top padding (28) + map top margin (32) + map (280) + gap (10) + products (~104) + gap (12) + explorer (~285) + bottom padding (20)
      // Total: ~770-790px, but constrain to viewport
      const viewportHeight = window.innerHeight;
      const wrapperBottomPosition = 104;
      const topMargin = 20;
      const maxAvailableHeight = viewportHeight - wrapperBottomPosition - topMargin;
      const contentHeight = 795; // map + products + explorer with full gallery + padding
      const expandedHeight = Math.min(contentHeight, maxAvailableHeight);
      
      setBoxSize(FULL_W, expandedHeight, true);
      
      // Ensure map resizes properly
      setTimeout(() => {
        if (leafletMap) {
          leafletMap.invalidateSize();
        }
      }, 300);
    }
    
    function closeChatbotLocationExplorer() {
      chatbotLocationExplorer.setAttribute('hidden', '');
      chatbotLocationExplorer.classList.remove('is-visible');
      clearChatbotLocationMarkers();
      
      // Remove expanded class from wrapper
      wrapper.classList.remove('expanded');
      
      // Only resize if we're still in map view
      // (other view switches handle their own sizing)
      if (mapContainer.classList.contains('is-visible')) {
        // Return to compact map view height (map + products only)
        const normalHeight = Math.min(495, getMaxChatbotHeight());
        setBoxSize(FULL_W, normalHeight);
        
        // Ensure map resizes properly
        setTimeout(() => {
          if (leafletMap) {
            leafletMap.invalidateSize();
          }
        }, 300);
      }
    }
    
    function clearChatbotLocationMarkers() {
      chatbotLocationMarkers.forEach(marker => {
        if (leafletMap) {
          leafletMap.removeLayer(marker);
        }
      });
      chatbotLocationMarkers = [];
    }
    
    function loadChatbotLocationCategory(category) {
      const content = document.getElementById('chatbot-explorer-content');
      content.replaceChildren();
      
      clearChatbotLocationMarkers();
      
      const locations = chatbotLocationData[category] || [];
      
      if (!leafletMap) return;
      
      locations.forEach(location => {
        // Add standard marker to map (different from LV product markers)
        const popupContent = location.address 
          ? `<b>${location.name}</b><br><small>${location.address}</small>`
          : `<b>${location.name}</b>`;
        const marker = L.marker([location.lat, location.lng])
          .bindPopup(popupContent)
          .addTo(leafletMap);
        chatbotLocationMarkers.push(marker);
        
        // Add image to content
        const item = createEl('div', { class: 'chatbot-explorer-item' });
        const img = createEl('img', { 
          class: 'chatbot-explorer-image',
          src: location.image,
          alt: location.name
        });
        const name = createEl('p', { class: 'chatbot-explorer-name', text: location.name });
        
        item.appendChild(img);
        item.appendChild(name);
        content.appendChild(item);
        
        // Click to zoom to location and center map
        item.addEventListener('click', () => {
          if (leafletMap) {
            // Invalidate size first to ensure proper centering
            leafletMap.invalidateSize();
            // Use flyTo for smooth animation and proper centering
            leafletMap.flyTo([location.lat, location.lng], 16, {
              animate: true,
              duration: 0.5
            });
            // Open popup after animation completes
            setTimeout(() => {
              marker.openPopup();
            }, 500);
          }
        });
      });
    }
    
    // Event listeners for chatbot location explorer
    explorerClose.addEventListener('click', closeChatbotLocationExplorer);
    
    const chatbotExplorerTabs = document.querySelectorAll('.chatbot-explorer-tab');
    chatbotExplorerTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const category = tab.getAttribute('data-category');
        
        // Update active tab
        chatbotExplorerTabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        
        // Load category
        loadChatbotLocationCategory(category);
      });
    });
    
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
      
      // Use the global dragged product data if available, otherwise generate from image
      let productInfo;
      if (window.currentDraggedProduct && window.currentDraggedProduct.src) {
        productInfo = {
          id: Date.now() + Math.random(),
          image: window.currentDraggedProduct.src,
          title: window.currentDraggedProduct.title || 'Product',
          price: window.currentDraggedProduct.price || '',
          model: window.currentDraggedProduct.model || '',
          location: { lat: 48.8566 + (Math.random() - 0.5) * 0.02, lng: 2.3522 + (Math.random() - 0.5) * 0.02 }
        };
        // Clear the global variable
        window.currentDraggedProduct = null;
      } else {
        productInfo = window.ShopThatMainProductData
          ? window.ShopThatMainProductData.productInfoFromImage(imageSrc)
          : { id: Date.now() + Math.random(), image: imageSrc, title: 'Product', price: '', model: '' };
      }
      
      try {
        if (!window.LuxuryIntelligence) throw new Error('no client');
        const dropQuery =
          'Context: user dragged a Louis Vuitton product into the assistant. Product title: ' +
          (productInfo.title || 'Unknown') +
          '. Describe this item, materials, and campaign context if known. Image reference: ' +
          imageSrc;
        const data = await window.LuxuryIntelligence.ask(dropQuery);
        const botResponse = String(data.answer || 'This is a beautiful Louis Vuitton x Yayoi Kusama piece.');

        hideThinking();
        chatbotNav.classList.remove('is-disabled');

        displayProductCard(productInfo);

        addMessage('bot', botResponse, { renderMarkdown: true, domain: data.domain });
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          displayImages(data.images, data.rank_data);
        } else {
          finalizeAssistantTurnScroll();
        }

        droppedProducts.push(productInfo);
        saveProducts();

        if (typeof saveProductToCollections === 'function') {
          saveProductToCollections({
            src: productInfo.image,
            title: productInfo.title,
            model: productInfo.model,
            price: productInfo.price
          });
        }

        window.dispatchEvent(new StorageEvent('storage', {
          key: 'galleryImages',
          newValue: localStorage.getItem('galleryImages')
        }));

        if (window.ShopThatData && currentSessionId) {
          window.ShopThatData.addChatMessage(currentSessionId, '📸 Image dropped', 'user', []);
          const botKeywords = window.ShopThatData.extractKeywordsFromText(botResponse);
          window.ShopThatData.addChatMessage(currentSessionId, botResponse, 'bot', botKeywords);
        }
      } catch (e) {
        // API failed, still show product card and text
        hideThinking();
        chatbotNav.classList.remove('is-disabled');
        
        // Display product card FIRST
        displayProductCard(productInfo);
        
        // Then display text response
        addMessage('bot', `I've added this ${productInfo.title} to your product library. You can view it in the Library tab or see it on the map!`);
        finalizeAssistantTurnScroll();

        droppedProducts.push(productInfo);
        saveProducts(); // Save to localStorage
        
        // Also save to all collections for dashboard
        if (typeof saveProductToCollections === 'function') {
          saveProductToCollections({
            src: productInfo.image,
            title: productInfo.title,
            model: productInfo.model,
            price: productInfo.price
          });
        }
        
        // Trigger storage event for dashboard
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'galleryImages',
          newValue: localStorage.getItem('galleryImages')
        }));
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
          wrapper.classList.add('gallery-open'); // Push chatbot up
        });
      } else {
        galleryWrapper.classList.remove('is-visible');
        wrapper.classList.remove('gallery-open'); // Reset chatbot position
        setTimeout(() => {
          galleryWrapper.setAttribute('hidden', '');
        }, 300);
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
})();
