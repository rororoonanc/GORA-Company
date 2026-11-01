/* ==========================================================================
   GORA – Main script (vanilla JS, no dependencies)
   Features:
   1.  Helpers
   2.  Missing-image fallbacks (placeholders)
   3.  Preloader + page-load fade-in
   4.  Navbar (scroll state, active link, mobile menu)
   5.  Hero parallax
   6.  Scroll-reveal (IntersectionObserver)
   7.  Product carousel (arrows, dots, autoplay, swipe, keyboard)
   8.  Button ripple effect
   9.  Back-to-top button + footer year
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. HELPERS
     ------------------------------------------------------------------ */
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     2. MISSING-IMAGE FALLBACKS
     If an image file is missing, show a neutral beige placeholder
     so the layout never breaks.
     ------------------------------------------------------------------ */
  function markMissing(img) {
    var frame = img.closest('.img-frame');
    if (frame) { frame.classList.add('is-missing'); return; }

    // Logo fallback: replace the broken logo with a simple "G" badge
    if (img.getAttribute('data-fallback') === 'logo') {
      var badge = document.createElement('span');
      badge.className = 'logo-fallback';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = 'G';
      if (img.parentNode) { img.parentNode.replaceChild(badge, img); }
    }
  }

  $$('img').forEach(function (img) {
    img.addEventListener('error', function () { markMissing(img); });
    // Handle images that already failed before this script ran
    if (img.complete && img.naturalWidth === 0) { markMissing(img); }
  });

  /* ------------------------------------------------------------------
     3. PRELOADER + PAGE-LOAD FADE-IN
     ------------------------------------------------------------------ */
  var preloader = $('#preloader');
  var started = Date.now();
  var MIN_PRELOAD = prefersReducedMotion ? 0 : 900;   // ms – keeps the logo visible briefly
  var pageRevealed = false;

  function revealPage() {
    if (pageRevealed) { return; }
    pageRevealed = true;
    if (preloader) { preloader.classList.add('is-hidden'); }
    document.body.classList.add('loaded');            // triggers hero entrance animations
    // Remove the preloader from the layout once it has faded out
    setTimeout(function () { if (preloader) { preloader.style.display = 'none'; } }, 900);
  }

  function onLoaded() {
    var wait = Math.max(0, MIN_PRELOAD - (Date.now() - started));
    setTimeout(revealPage, wait);
  }

  if (document.readyState === 'complete') { onLoaded(); }
  else { window.addEventListener('load', onLoaded); }
  setTimeout(revealPage, 4000);                        // failsafe if a resource hangs

  /* ------------------------------------------------------------------
     4. NAVBAR
     ------------------------------------------------------------------ */
  var navbar    = $('#navbar');
  var navToggle = $('#navToggle');
  var navMenu   = $('#navLinks');
  var navLinks  = $$('.nav__link');
  var sections  = navLinks
    .map(function (link) { return $(link.getAttribute('href')); })
    .filter(Boolean);

  // Mobile menu
  function setMenu(open) {
    navMenu.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  }

  navToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setMenu(!navMenu.classList.contains('is-open'));
  });
  navLinks.forEach(function (link) {
    link.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('click', function (e) {
    if (!navbar.contains(e.target)) { setMenu(false); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setMenu(false); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 860) { setMenu(false); }
  });

  // Highlight the link of the section currently in view
  function updateActiveLink() {
    var offset = window.scrollY + navbar.offsetHeight + window.innerHeight * 0.25;
    var current = sections[0];

    sections.forEach(function (section) {
      if (section.offsetTop <= offset) { current = section; }
    });

    // At the very bottom of the page, always highlight the last section
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = sections[sections.length - 1];
    }

    navLinks.forEach(function (link) {
      var isActive = current && link.getAttribute('href') === '#' + current.id;
      link.classList.toggle('is-active', isActive);
      if (isActive) { link.setAttribute('aria-current', 'page'); }
      else { link.removeAttribute('aria-current'); }
    });
  }

  /* ------------------------------------------------------------------
     5. HERO PARALLAX (disabled for reduced-motion users)
     ------------------------------------------------------------------ */
  var heroParallax = $('#heroParallax');

  function updateParallax() {
    if (!heroParallax || prefersReducedMotion) { return; }
    var y = window.scrollY;
    if (y < window.innerHeight * 1.2) {
      heroParallax.style.transform = 'translate3d(0,' + (y * 0.09).toFixed(1) + 'px,0)';
    }
  }

  /* ------------------------------------------------------------------
     9a. BACK-TO-TOP BUTTON
     ------------------------------------------------------------------ */
  var toTop = $('#toTop');
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  /* ------------------------------------------------------------------
     Single rAF-throttled scroll handler for everything scroll-related
     ------------------------------------------------------------------ */
  var ticking = false;

  function onScroll() {
    navbar.classList.toggle('is-scrolled', window.scrollY > 24);
    toTop.classList.toggle('is-visible', window.scrollY > 600);
    updateActiveLink();
    updateParallax();
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ------------------------------------------------------------------
     6. SCROLL-REVEAL
     Classes in HTML: .reveal + .reveal-up | .reveal-left | .reveal-right
     Stagger via inline style="--d:.16s"
     ------------------------------------------------------------------ */
  var revealItems = $$('.reveal');

  function showItem(el) {
    el.classList.add('is-visible');
    // After the entrance finishes, drop the stagger delay so hover effects respond instantly
    var delay = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
    setTimeout(function () { el.classList.add('reveal-done'); }, (delay + 1) * 1000);
  }

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          showItem(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealItems.forEach(showItem);   // very old browsers: just show everything
  }

  /* ------------------------------------------------------------------
     7. PRODUCT CAROUSEL
     ------------------------------------------------------------------ */
  (function initCarousel() {
    var carousel = $('#carousel');
    if (!carousel) { return; }

    var viewport = $('.carousel__viewport', carousel);
    var track    = $('#carouselTrack');
    var slides   = $$('.carousel__slide', track);
    var dotsWrap = $('#carouselDots');
    var prevBtn  = $('#carouselPrev');
    var nextBtn  = $('#carouselNext');
    var AUTOPLAY_MS = 5000;

    var index = 0;
    var timer = null;
    var dots  = [];

    // Build dot indicators
    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); restartAutoplay(); });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    // Go to a slide (wraps around at both ends)
    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-index * 100) + '%)';

      slides.forEach(function (slide, n) {
        var active = n === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      dots.forEach(function (dot, n) {
        var active = n === index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
      });
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    // Arrows
    nextBtn.addEventListener('click', function () { next(); restartAutoplay(); });
    prevBtn.addEventListener('click', function () { prev(); restartAutoplay(); });

    // Keyboard arrows (when the carousel has focus)
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); restartAutoplay(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); restartAutoplay(); }
    });

    // Autoplay (pauses on hover / focus / hidden tab; off for reduced-motion users)
    function startAutoplay() {
      if (prefersReducedMotion || timer || slides.length < 2) { return; }
      timer = setInterval(next, AUTOPLAY_MS);
    }
    function stopAutoplay() { clearInterval(timer); timer = null; }
    function restartAutoplay() { stopAutoplay(); startAutoplay(); }

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stopAutoplay(); } else { startAutoplay(); }
    });

    // Touch / mouse swipe using Pointer Events
    var startX = 0, deltaX = 0, dragging = false;

    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) { return; }
      dragging = true;
      startX = e.clientX;
      deltaX = 0;
      track.classList.add('is-dragging');
      stopAutoplay();
    });

    viewport.addEventListener('pointermove', function (e) {
      if (!dragging) { return; }
      deltaX = e.clientX - startX;
      var pct = (deltaX / viewport.offsetWidth) * 100;
      track.style.transform = 'translateX(' + (-index * 100 + pct) + '%)';
    });

    function endDrag() {
      if (!dragging) { return; }
      dragging = false;
      track.classList.remove('is-dragging');
      var threshold = viewport.offsetWidth * 0.15;
      if (deltaX < -threshold) { next(); }
      else if (deltaX > threshold) { prev(); }
      else { goTo(index); }          // snap back
      startAutoplay();
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('pointerleave', endDrag);

    goTo(0);
    startAutoplay();
  })();

  /* ------------------------------------------------------------------
     8. BUTTON RIPPLE EFFECT
     ------------------------------------------------------------------ */
  document.addEventListener('pointerdown', function (e) {
    var btn = e.target.closest ? e.target.closest('.btn') : null;
    if (!btn || prefersReducedMotion) { return; }

    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top  = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', function () { ripple.remove(); });
  });

  /* ------------------------------------------------------------------
     9b. FOOTER YEAR (auto-updates)
     ------------------------------------------------------------------ */
  var yearEl = $('#year');
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

})();
