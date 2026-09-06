/* =========================================================
   varun.study — receipt behaviours
     1. reveal + draw-on         4. printer head
     2. typed headings           5. barcode + odds and ends
     3. ink cursor
   ========================================================= */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------------------------------------------------------
     1. REVEAL + DRAW-ON
     --------------------------------------------------------- */
  /* stagger siblings inside each block so lines print one after another */
  $$('.sec, .r-head, .r-foot').forEach(function (block) {
    $$('.rise', block).forEach(function (el, i) { el.style.setProperty('--i', i % 8); });
  });

  /* every hand-drawn stroke needs its own length before it can be dashed */
  $$('.draw path').forEach(function (p) {
    var len = Math.ceil(p.getTotalLength());
    p.parentNode.style.setProperty('--len', len);
  });

  /* reveal is driven by the same rAF pass as the printer read-out (see 4),
     which keeps it in step with scrolling and needs no observer */
  var pending = $$('.rise, .draw');

  /* once a stroke has finished drawing, drop the dash pattern entirely — a dash
     length that doesn't match the rendered path would otherwise leave a gap */
  function settleStroke(el) {
    setTimeout(function () {
      $$('path', el).forEach(function (p) { p.style.strokeDasharray = 'none'; });
    }, 1200);
  }

  /* the slot sits this far up from the foot of the screen */
  function slotLine() {
    var head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head-h')) || 84;
    return window.innerHeight - head;
  }

  function sweep() {
    if (!pending.length) return;
    var h = window.innerHeight;
    var line = slotLine();
    /* at the very bottom there is no more scrolling to do, so print what's left */
    var atEnd = window.scrollY + h >= document.body.scrollHeight - 4;
    for (var i = pending.length - 1; i >= 0; i--) {
      var el = pending[i];
      var r = el.getBoundingClientRect();
      if (atEnd || r.top < line + 8) {  /* has cleared the slot, or is the last page */
        el.classList.add('in');
        if (el.classList.contains('draw')) settleStroke(el);
        if (el.hasAttribute('data-type-host')) typeIn(el);
        pending.splice(i, 1);
      }
    }
  }

  if (reduced) {
    pending.forEach(function (el) { el.classList.add('in'); });
    pending = [];
    $$('[data-type]').forEach(function (t) { t.style.width = 'auto'; t.classList.add('typed'); });
  }

  /* an observer catches scrolls the scroll event misses — #fragment landings,
     restored scroll positions, find-in-page jumps */
  if (!reduced && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var hit = false;
      entries.forEach(function (e) { if (e.isIntersecting) hit = true; });
      if (hit) sweep();
    }, { rootMargin: '0px 0px -8% 0px' });
    pending.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     2. TYPED HEADINGS
     --------------------------------------------------------- */
  var typers = $$('[data-type]');
  typers.forEach(function (t) {
    var host = t.closest('.rise') || t;
    host.setAttribute('data-type-host', '');
    if (reduced) t.style.width = 'auto';
  });

  /* measuring before the webfont lands gives a short, clipped line */
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

  function typeIn(host) { fontsReady.then(function () { runType(host); }); }

  function runType(host) {
    var t = $('[data-type]', host);
    if (!t || t.dataset.done) return;
    t.dataset.done = '1';
    var text = t.textContent.trim();
    var n = text.length;

    /* measure in px, not ch — letter-spacing makes ch widths lie */
    t.style.width = 'auto';
    var full = Math.ceil(t.getBoundingClientRect().width) + 2;
    t.style.width = '0px';
    t.classList.add('typing');

    var i = 0;
    var per = Math.max(38, Math.min(90, 900 / n));
    var timer = setInterval(function () {
      i++;
      t.style.width = Math.round(full * i / n) + 'px';
      if (i >= n) {
        clearInterval(timer);
        t.style.width = 'auto';
        t.classList.add('typed');
        t.classList.remove('typing');
      }
    }, per);
  }

  /* ---------------------------------------------------------
     3. INK CURSOR — a pen that writes, labels what it is over,
        and stamps when you click
     --------------------------------------------------------- */
  var CURSOR_WORDS = [
    ['.acc-head', null],                 /* set per open/closed state in html */
    ['.zoomable', 'expand'],
    ['.proj', 'open repo \u2197'],
    ['.index a', 'jump'],
    ['a[href^="mailto"]', 'say hi'],
    ['a[href$=".pdf"]', 'open pdf'],
    ['.send', 'send it'],
    ['#reprint', 'reprint'],
    ['.lb-close', 'close'],
    ['input, textarea', 'type here'],
    ['a[target="_blank"]', 'visit \u2197']
  ];

  if (fine && !reduced) {
    document.body.classList.add('ink-cursor');
    var dot = $('.cursor-dot'), ring = $('.cursor-ring'), label = $('#cursor-label');
    var cv = $('#ink'), ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var mx = -100, my = -100, rx = -100, ry = -100, px = -100, py = -100;
    var idleTimer = null;

    /* position with `translate`, not `transform` — the ring's spin animation and the
       label's pop-in own `transform`, and setting both would fight */
    var canTranslate = 'translate' in document.body.style;
    function place(el, x, y) {
      if (canTranslate) el.style.translate = x + 'px ' + y + 'px';
      else { el.style.left = x + 'px'; el.style.top = y + 'px'; }
    }

    function sizeCanvas() {
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      cv.style.width = window.innerWidth + 'px';
      cv.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      document.body.classList.add('cursor-on');
      document.body.classList.remove('cursor-idle');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { document.body.classList.add('cursor-idle'); }, 1500);
    });
    document.addEventListener('mouseleave', function () {
      document.body.classList.remove('cursor-on');
    });

    /* the pen: thicker when you move slowly, spitting ink when you move fast */
    (function frame() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      place(dot, mx, my);
      place(ring, rx, ry);
      place(label, mx, my);

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      if (px > -50) {
        var d = Math.hypot(mx - px, my - py);
        if (d > 0.6) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = 'rgba(16,16,16,0.55)';
          ctx.lineWidth = Math.max(0.7, Math.min(2.8, 3.2 - d * 0.09));
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(mx, my);
          ctx.stroke();

          if (d > 26) splatter(mx, my, d);       /* fast flick throws ink */
        }
      }
      px = mx; py = my;
      requestAnimationFrame(frame);
    })();

    function splatter(x, y, d) {
      var n = Math.min(4, Math.round(d / 26));
      ctx.fillStyle = 'rgba(16,16,16,0.4)';
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 16;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.5 + Math.random() * 1.4, 0, 6.3);
        ctx.fill();
      }
    }

    /* click: an ink blot on the canvas and a stamp ring in the dom */
    document.addEventListener('mousedown', function (e) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(16,16,16,0.5)';
      ctx.beginPath();
      ctx.arc(e.clientX, e.clientY, 3.5, 0, 6.3);
      ctx.fill();
      splatter(e.clientX, e.clientY, 30);

      var stamp = document.createElement('div');
      stamp.className = 'stamp';
      stamp.style.left = e.clientX + 'px';
      stamp.style.top = e.clientY + 'px';
      document.body.appendChild(stamp);
      setTimeout(function () { stamp.remove(); }, 520);
    });

    /* labels: what will happen if you click here */
    function wordFor(target) {
      for (var i = 0; i < CURSOR_WORDS.length; i++) {
        var hit = target.closest(CURSOR_WORDS[i][0]);
        if (hit) return hit.dataset.cursor || CURSOR_WORDS[i][1];
      }
      return target.closest('a, button') ? 'click' : null;
    }

    document.addEventListener('mouseover', function (e) {
      var word = wordFor(e.target);
      document.body.classList.toggle('cursor-hot', !!word);
      if (word) {
        label.textContent = word;
        document.body.classList.add('cursor-label-on');
      } else {
        document.body.classList.remove('cursor-label-on');
      }
    });
  }

  /* ---------------------------------------------------------
     4. PRINTER HEAD — status, feed, progress, active section
     --------------------------------------------------------- */
  var nowPrinting = $('#now-printing');
  var lineCount = $('#line-count');
  var feedFill = $('#feed-fill');
  var indexLinks = $$('.index li');
  var sections = $$('.sec');
  var feedTimer = null;
  var ticking = false;

  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }

  function update() {
    ticking = false;
    sweep();
    var y = window.scrollY;
    var max = Math.max(1, document.body.scrollHeight - window.innerHeight);
    var pct = Math.min(1, y / max);

    if (feedFill) feedFill.style.width = (pct * 100).toFixed(1) + '%';

    var total = Math.round(document.body.scrollHeight / 22);
    var at = Math.min(total, Math.round((y + window.innerHeight) / 22));   /* never overshoot the total */
    if (lineCount) lineCount.textContent = 'line ' + pad(at, 4) + '/' + pad(total, 4);

    /* which section is under the printer head right now */
    var current = null;
    sections.forEach(function (s) {
      if (s.getBoundingClientRect().top <= window.innerHeight * 0.42) current = s;
    });
    var name = current ? current.dataset.name : 'header';
    if (nowPrinting && nowPrinting.textContent !== name) nowPrinting.textContent = name;
    indexLinks.forEach(function (li) {
      li.classList.toggle('on', !!current && li.querySelector('a').getAttribute('href') === '#' + current.id);
    });

    if (pct > 0.995 && nowPrinting) nowPrinting.textContent = 'complete';
  }

  window.addEventListener('scroll', function () {
    sweep();
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
    if (reduced) return;
    document.body.classList.add('feeding');
    clearTimeout(feedTimer);
    feedTimer = setTimeout(function () { document.body.classList.remove('feeding'); }, 160);
  }, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('hashchange', update);
  update();
  /* images, the webfont and #fragment landings all move things after first paint */
  window.addEventListener('load', update);
  fontsReady.then(update);
  [60, 300, 900].forEach(function (t) { setTimeout(update, t); });
  /* a short poll covers the first couple of seconds, when a browser may still be
     settling on a restored or #fragment scroll position without firing events */
  var settle = setInterval(function () {
    update();
    if (!pending.length) clearInterval(settle);
  }, 250);
  setTimeout(function () { clearInterval(settle); }, 3000);

  /* ---------------------------------------------------------
     5. BARCODE, TIMESTAMP, REPRINT
     --------------------------------------------------------- */
  var bc = $('#barcode');
  if (bc) {
    /* deterministic bar pattern seeded off the name — same barcode every visit */
    var seed = 0, name = 'varun pathak v5run';
    for (var i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) % 100000;
    var html = '';
    for (var b = 0; b < 46; b++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      var w = 1 + (seed >> 16) % 4;
      html += '<span style="width:' + w + 'px"></span>';
    }
    bc.insertAdjacentHTML('afterbegin', html);   /* keep the signature overlay in place */
  }

  var stamp = $('#printed-at');
  if (stamp) {
    var d = new Date();
    var months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    stamp.textContent = pad(d.getDate(), 2) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ' · ' +
                        pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2);
  }

  var reprint = $('#reprint');
  if (reprint) {
    reprint.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      /* let the headings type themselves out again */
      $$('[data-type]').forEach(function (t) {
        t.dataset.done = '';
        t.classList.remove('typed');
        if (!reduced) t.style.width = '0px';
      });
      $$('[data-type-host]').forEach(function (h) {
        setTimeout(function () { typeIn(h); }, 700);
      });
    });
  }

  /* ---------------------------------------------------------
     5b. EXPERIENCE ACCORDION
     --------------------------------------------------------- */
  var accItems = $$('.acc-item');

  function setOpen(item, open) {
    item.classList.toggle('is-open', open);
    var head = $('.acc-head', item);
    head.setAttribute('aria-expanded', String(open));
    head.dataset.cursor = open ? 'collapse' : 'expand';
    var lbl = $('#cursor-label');
    if (lbl && document.body.classList.contains('cursor-label-on') && head.matches(':hover')) {
      lbl.textContent = head.dataset.cursor;
    }
  }

  accItems.forEach(function (item) {
    $('.acc-head', item).addEventListener('click', function () {
      setOpen(item, !item.classList.contains('is-open'));
      syncExpandAll();
      /* the page just got taller or shorter */
      setTimeout(update, 60);
      setTimeout(update, 460);
    });
  });

  var expandAll = $('#expand-all');
  function syncExpandAll() {
    if (!expandAll) return;
    var allOpen = accItems.every(function (i) { return i.classList.contains('is-open'); });
    expandAll.textContent = allOpen ? '[ collapse all ]' : '[ expand all ]';
    expandAll.dataset.cursor = allOpen ? 'close all' : 'open all';
  }
  if (expandAll) {
    expandAll.addEventListener('click', function () {
      var allOpen = accItems.every(function (i) { return i.classList.contains('is-open'); });
      accItems.forEach(function (i) { setOpen(i, !allOpen); });
      syncExpandAll();
      setTimeout(update, 60);
      setTimeout(update, 460);
    });
    syncExpandAll();
  }

  /* ---------------------------------------------------------
     6. IMAGE VIEWER — every photo opens full size
     --------------------------------------------------------- */
  var lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  var lastFocus = null;

  $$('[data-zoom]').forEach(function (img) {
    /* wrap so the little expand mark has something to sit on */
    var wrap = document.createElement('span');
    wrap.className = 'zoomable';
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('aria-label', 'open ' + (img.dataset.zoom || 'image'));
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    function open(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }   /* don't follow a project link */
      openLightbox(img);
    }
    wrap.addEventListener('click', open);
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') open(e);
    });
  });

  function openLightbox(img) {
    lastFocus = document.activeElement;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt || '';
    lbCap.textContent = img.dataset.zoom || '';
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { lb.classList.add('open'); });
    setTimeout(function () { $('#lb-close').focus(); }, 60);
  }

  function closeLightbox() {
    if (lb.hidden) return;
    lb.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(function () { lb.hidden = true; lbImg.src = ''; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  $('#lb-close').addEventListener('click', closeLightbox);
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('lb-figure')) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });
})();
