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


