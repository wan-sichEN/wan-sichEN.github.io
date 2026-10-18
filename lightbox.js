/* Image lightbox for project pages.
   Include once per page:  <script src="lightbox.js" defer></script>
   Works automatically on photos inside .report-header-photo, .report-body and carousels.
   - Add data-zoom to any other <img> to opt in, data-no-zoom to opt out.
   - Images inside a .report-carousel can be browsed with the arrows / arrow keys.
   - Click the enlarged image to zoom in further (move the pointer to pan), click again to zoom out. Esc closes. */
(function () {
  var SELECTOR = '.report-header-photo img, .report-body img, .carousel-slide img, img[data-zoom]';
  var overlay, stage, imgEl, capEl, prevBtn, nextBtn, closeBtn;
  var group = [], idx = 0, lastFocus = null, zoomed = false;

  function eligible(img) {
    return img && img.matches && img.matches(SELECTOR) && !img.hasAttribute('data-no-zoom');
  }

  function captionFor(img) {
    var slide = img.closest('.carousel-slide');
    if (slide && slide.getAttribute('data-caption')) return slide.getAttribute('data-caption');
    var fig = img.closest('figure');
    if (fig && fig.querySelector('figcaption')) return fig.querySelector('figcaption').textContent.trim();
    var rf = img.closest('.report-fig');
    if (rf && rf.querySelector('.carousel-caption')) return rf.querySelector('.carousel-caption').textContent.trim();
    var media = img.closest('.report-media');
    if (media && media.querySelector('.carousel-caption')) return media.querySelector('.carousel-caption').textContent.trim();
    return img.getAttribute('alt') || '';
  }

  function build() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image viewer');
    overlay.innerHTML =
      '<button class="lb-btn lb-close" aria-label="Close image">&#10005;</button>' +
      '<button class="lb-btn lb-prev" aria-label="Previous image">&#10094;</button>' +
      '<div class="lb-stage"><img class="lb-img" alt=""></div>' +
      '<button class="lb-btn lb-next" aria-label="Next image">&#10095;</button>' +
      '<p class="lb-caption"></p>';
    document.body.appendChild(overlay);

    stage = overlay.querySelector('.lb-stage');
    imgEl = overlay.querySelector('.lb-img');
    capEl = overlay.querySelector('.lb-caption');
    prevBtn = overlay.querySelector('.lb-prev');
    nextBtn = overlay.querySelector('.lb-next');
    closeBtn = overlay.querySelector('.lb-close');

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    nextBtn.addEventListener('click', function (e) { e.stopPropagation(); step(1); });
    // Click on the dark area (not the image) closes
    overlay.addEventListener('click', function (e) { if (e.target === overlay || e.target === stage) close(); });
    imgEl.addEventListener('click', function (e) { e.stopPropagation(); setZoom(!zoomed, e); });
    imgEl.addEventListener('pointermove', function (e) { if (zoomed) pan(e); });
    imgEl.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  function pan(e) {
    var r = imgEl.getBoundingClientRect();
    // r is the scaled box; recover the unscaled origin so panning follows the pointer smoothly
    var x = ((e.clientX - r.left) / r.width) * 100;
    var y = ((e.clientY - r.top) / r.height) * 100;
    imgEl.style.transformOrigin = Math.max(0, Math.min(100, x)) + '% ' + Math.max(0, Math.min(100, y)) + '%';
  }

  function setZoom(on, e) {
    zoomed = on;
    overlay.classList.toggle('is-zoomed', on);
    if (on && e) {
      var r = imgEl.getBoundingClientRect();
      imgEl.style.transformOrigin = (((e.clientX - r.left) / r.width) * 100) + '% ' + (((e.clientY - r.top) / r.height) * 100) + '%';
    } else if (!on) {
      imgEl.style.transformOrigin = '50% 50%';
    }
  }

  function show(i) {
    idx = (i + group.length) % group.length;
    var src = group[idx];
    setZoom(false);
    imgEl.src = src.currentSrc || src.src;
    imgEl.alt = src.getAttribute('alt') || '';
    var cap = captionFor(src);
    capEl.textContent = cap;
    overlay.classList.toggle('is-single', group.length < 2);
  }

  function step(d) { if (group.length > 1) show(idx + d); }

  function open(img) {
    build();
    var carousel = img.closest('.report-carousel');
    group = carousel
      ? Array.prototype.slice.call(carousel.querySelectorAll('.carousel-slide img')).filter(eligible)
      : [img];
    if (!group.length) group = [img];
    lastFocus = document.activeElement;
    show(Math.max(0, group.indexOf(img)));
    overlay.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    if (!overlay || !overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open', 'is-zoomed');
    zoomed = false;
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var img = e.target.closest && e.target.closest('img');
    if (eligible(img) && !(overlay && overlay.contains(img))) open(img);
  });

  document.addEventListener('keydown', function (e) {
    if (overlay && overlay.classList.contains('is-open')) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Tab') {
        var f = Array.prototype.slice.call(overlay.querySelectorAll('button')).filter(function (b) { return b.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    // Keyboard access: Enter/Space on a focused photo opens it
    var t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && eligible(t)) { e.preventDefault(); open(t); }
  });

  // Make photos keyboard-focusable
  function makeFocusable() {
    Array.prototype.forEach.call(document.querySelectorAll(SELECTOR), function (img) {
      if (!img.hasAttribute('data-no-zoom') && !img.hasAttribute('tabindex')) img.setAttribute('tabindex', '0');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', makeFocusable);
  else makeFocusable();
})();


/* ---- Warm-up for the exit button ----
   Preload homepage images on intent and wait for them before navigating back. */
(function () {
  if (/(^|\/)index\.html?$/.test(location.pathname) || location.pathname.slice(-1) === '/') return;
  var conn = navigator.connection;
  var allowIntentPrefetch = !(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
  var warmPromise = null;
  var warmComplete = false;

  function warm() {
    if (warmPromise) return warmPromise;
    warmPromise = fetch('index.html', { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.text() : ''; })
      .then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var indexUrl = new URL('index.html', location.href);
        var images = Array.prototype.map.call(doc.querySelectorAll('img[src]'), function (source) {
          return new Promise(function (resolve) {
            var image = new Image();
            var settled = false;
            function finish() {
              if (settled) return;
              settled = true;
              if (image.decode && image.naturalWidth) image.decode().then(resolve, resolve);
              else resolve();
            }
            image.onload = finish;
            image.onerror = resolve;
            image.src = new URL(source.getAttribute('src'), indexUrl).href;
            if (image.complete) finish();
          });
        });
        return Promise.all(images);
      })
      .catch(function () {})
      .then(function () { warmComplete = true; });
    return warmPromise;
  }

  var exitLink = document.querySelector('.exit-fab');
  if (exitLink) {
    if (allowIntentPrefetch) {
      exitLink.addEventListener('pointerenter', warm, { once: true });
      exitLink.addEventListener('focus', warm, { once: true });
    }
    exitLink.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || warmComplete) return;
      event.preventDefault();
      exitLink.classList.add('is-open');
      exitLink.setAttribute('aria-busy', 'true');
      exitLink.setAttribute('aria-label', 'Loading projects');
      var label = exitLink.querySelector('.exit-fab-label');
      if (label) label.textContent = 'Loading projects...';
      warm().then(function () { window.location.assign(exitLink.href); });
    });
  }
})();
