/* =========================================================
   varunp.me — receipt behaviours
     1. reveal + draw-on         5. barcode, torn ends, odds and ends
     2. typed headings           6. image viewer
     3. ink cursor               7. halftone screen
     4. progress + index         8. ascii desk
                                 9. halftone name
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

  /* reveal is driven by the same rAF pass as the progress meter (see 4),
     which keeps it in step with scrolling and needs no observer */
  var pending = $$('.rise, .draw');

  /* once a stroke has finished drawing, drop the dash pattern entirely — a dash
     length that doesn't match the rendered path would otherwise leave a gap */
  function settleStroke(el) {
    setTimeout(function () {
      $$('path', el).forEach(function (p) { p.style.strokeDasharray = 'none'; });
    }, 1200);
  }

  function sweep() {
    if (!pending.length) return;
    var h = window.innerHeight;
    var line = h - 28;   /* lines print just before they come up over the foot of the screen */
    /* at the very bottom there is no more scrolling to do, so print what's left */
    var atEnd = window.scrollY + h >= document.body.scrollHeight - 4;
    for (var i = pending.length - 1; i >= 0; i--) {
      var el = pending[i];
      var r = el.getBoundingClientRect();
      if (atEnd || r.top < line) {
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
    ['.cta', 'jump to contact'],
    ['.dot-name', 'scatter'],
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
     4. PROGRESS — feed meter + active section in the index
     --------------------------------------------------------- */
  var feedFill = $('#feed-fill');
  var indexLinks = $$('.index li');
  var sections = $$('.sec');
  var ticking = false;

  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }

  function update() {
    ticking = false;
    sweep();
    var y = window.scrollY;
    var max = Math.max(1, document.body.scrollHeight - window.innerHeight);
    var pct = Math.min(1, y / max);

    if (feedFill) feedFill.style.width = (pct * 100).toFixed(1) + '%';

    /* which section is being read right now */
    var current = null;
    sections.forEach(function (s) {
      if (s.getBoundingClientRect().top <= window.innerHeight * 0.42) current = s;
    });
    indexLinks.forEach(function (li) {
      li.classList.toggle('on', !!current && li.querySelector('a').getAttribute('href') === '#' + current.id);
    });
  }

  window.addEventListener('scroll', function () {
    sweep();
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
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
      document.dispatchEvent(new Event('receipt:reprint'));
    });
  }

  /* torn ends: a tear bar never cuts clean, so each end gets its own ragged
     edge — seeded, so it is the same tear every visit */
  function seeded(s) {
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  $$('.tear').forEach(function (tear, k) {
    var r = seeded(k ? 40961 : 9173);
    var top = tear.classList.contains('tear-top');
    var H = 16;
    /* y is measured in from the outer edge of the paper */
    var pts = [], x = 0;
    while (x < 100) {
      var w = 1.1 + r() * 1.7;                         /* tooth width, % of the roll */
      var valley = 7.5 + r() * 3.5 + (r() < 0.07 ? 2.5 : 0);   /* now and then it rips deeper */
      var peak = 0.6 + r() * 3.6;
      pts.push([x, valley]);
      pts.push([x + w * (0.25 + r() * 0.2), peak + 1.5 + r() * 2]);   /* a burr on the way up */
      pts.push([x + w * (0.5 + r() * 0.15), peak]);
      x += w;
    }
    pts.push([100, 8]);
    var poly = pts.map(function (p) {
      var y = top ? p[1] : H - p[1];
      return Math.min(p[0], 100).toFixed(2) + '% ' + y.toFixed(1) + 'px';
    });
    poly.unshift(top ? '0% 100%' : '0% 0%');
    poly.push(top ? '100% 100%' : '100% 0%');
    tear.style.setProperty('--edge', 'polygon(' + poly.join(',') + ')');
    tear.classList.add('ragged');
  });

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

  /* ---------------------------------------------------------
     7. HALFTONE — one dot screen, used twice: fig. 1 and the
        name at the top. dots on a 45° grid that swell and
        scatter around the pen and wobble back into place. fig. 1
        prints in row by row under a head; the name is written in,
        soaking into the paper. the name also takes a click (a
        shockwave) and tints the dots the pen disturbs
     --------------------------------------------------------- */
  function halftone(host, opt) {
    var cv = document.createElement('canvas');
    cv.className = 'ht-canvas';
    cv.setAttribute('aria-hidden', 'true');
    var ctx = cv.getContext('2d');
    var REACH = opt.reach || 50;          /* how far from the pen the dots feel it, px */
    var PUSH = opt.push || 10;
    var SWELL = opt.swell || 0.95;
    var WRITE = 1050;                     /* how long writing the whole thing in takes, ms */
    var SOAK = 260;                       /* how long one dot takes to take the ink, ms */

    var dots = [];
    var W = 0, H = 0, dpr = 1, cell = 4;
    var head = reduced ? 2 : -1;          /* print head position, 0..1 down; -1 = waiting */
    var printStart = 0;
    var writing = null;                   /* the ink soaking in, when written rather than printed */
    var pen = { x: -1e4, y: -1e4 };
    var wave = null;                      /* a shockwave on its way out from a click */
    var raf = 0, waves = 0;
    var inView = false;

    /* ink to accent in six steps, for dots the pen has knocked loose */
    var tints = [];
    if (opt.accent) {
      for (var t = 1; t <= 6; t++) {
        tints.push('rgb(' + [0, 1, 2].map(function (k) {
          return Math.round(16 + (opt.accent[k] - 16) * t / 6);
        }).join(',') + ')');
      }
    }

    function build() {
      W = cv.clientWidth; H = cv.clientHeight;
      if (!W || !H) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cell = opt.cell(W);
      var gw = Math.ceil(W), gh = Math.ceil(H);
      var ink = opt.ink(gw, gh, cell);    /* 0..1 per px */

      /* a 45° screen: step along two diagonal axes and keep what lands inside */
      var c = Math.SQRT1_2 * cell;
      var n = Math.ceil((W + H) / cell) + 2;
      dots = [];
      for (var i = -n; i <= n; i++) {
        for (var j = -n; j <= n; j++) {
          var x = W / 2 + (i - j) * c, y = H / 2 + (i + j) * c;
          if (x < -1 || y < -1 || x > W + 1 || y > H + 1) continue;
          /* average a small patch under the dot */
          var sum = 0;
          for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              var sx = Math.min(gw - 1, Math.max(0, Math.round(x + dx * 1.3)));
              var sy = Math.min(gh - 1, Math.max(0, Math.round(y + dy * 1.3)));
              sum += ink[sy * gw + sx];
            }
          }
          var r = cell * 0.7 * Math.sqrt(sum / 9);   /* area, not radius, tracks the ink */
          if (r < 0.3) continue;
          dots.push({ x: x, y: y, r: r, t0: 0, ox: 0, oy: 0, vx: 0, vy: 0, s: 1, vs: 0, hit: 0 });
        }
      }
      if (writing) soak();
      return true;
    }

    /* when each dot takes the ink: broadly left to right, but in clumps — a
       coarse random field decides which patches run ahead — so it soaks in
       the way ink takes to paper, never along a straight front */
    function soak() {
      var C = 26, gx = Math.ceil(W / C) + 2, gy = Math.ceil(H / C) + 2, field = [];
      for (var i = 0; i < gx * gy; i++) field.push(Math.random());
      for (i = 0; i < dots.length; i++) {
        var d = dots[i];
        var fx = Math.max(0, d.x) / C, fy = Math.max(0, d.y) / C;
        var x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        var n = field[y0 * gx + x0] * (1 - tx) * (1 - ty) + field[y0 * gx + x0 + 1] * tx * (1 - ty) +
                field[(y0 + 1) * gx + x0] * (1 - tx) * ty + field[(y0 + 1) * gx + x0 + 1] * tx * ty;
        d.t0 = (d.x / W) * 0.5 * WRITE + n * 0.3 * WRITE + Math.random() * 50;
      }
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (head < 0) return;
      var hy = Math.min(head, 1.2) * H;
      var lifted = tints.length ? [] : null;
      ctx.fillStyle = '#101010';
      ctx.beginPath();
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        if (d.y > hy) continue;
        /* rows just under the head are still warming up */
        var warm = Math.min(1, (hy - d.y) / 7);
        var r = d.r * d.s * (0.35 + 0.65 * warm);
        if (writing) {
          /* each dot takes the ink on its own time, swelling a touch past its
             size before it settles */
          var gk = (writing.at - d.t0) / SOAK;
          if (gk <= 0) continue;
          if (gk < 1) { var o = gk - 1; r *= 1 + 2.4 * o * o * o + 1.4 * o * o; }
        }
        var x = d.x + d.ox, y = d.y + d.oy;
        if (lifted) {
          /* the further the pen has pushed a dot, the more of the accent it takes */
          var q = Math.min(1, (Math.abs(d.ox) + Math.abs(d.oy)) / 9 + Math.max(0, d.s - 1));
          var b = Math.round(q * tints.length);
          if (b > 0) { (lifted[b] || (lifted[b] = [])).push(x, y, r); continue; }
        }
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, 6.2832);
      }
      ctx.fill();
      if (lifted) {
        for (var k = 1; k < lifted.length; k++) {
          var l = lifted[k];
          if (!l) continue;
          ctx.fillStyle = tints[k - 1];
          ctx.beginPath();
          for (var m = 0; m < l.length; m += 3) {
            ctx.moveTo(l[m] + l[m + 2], l[m + 1]);
            ctx.arc(l[m], l[m + 1], l[m + 2], 0, 6.2832);
          }
          ctx.fill();
        }
      }
      /* the head itself: a dark hairline with a soft glow riding down */
      if (head < 1.08) {
        var g = ctx.createLinearGradient(0, hy - 10, 0, hy + 3);
        g.addColorStop(0, 'rgba(16,16,16,0)');
        g.addColorStop(0.75, 'rgba(16,16,16,.10)');
        g.addColorStop(1, 'rgba(16,16,16,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, hy - 10, W, 13);
        ctx.fillStyle = 'rgba(16,16,16,.55)';
        ctx.fillRect(0, hy, W, 1);
      }
    }

    function step(now) {
      raf = 0;
      var busy = false;

      if (head >= 0 && head < 1.2) {
        if (!printStart) printStart = now;
        head = (now - printStart) / 1300 * 1.2;
        busy = true;
      }
      if (writing) {
        writing.at = now - writing.t0;
        if (writing.at >= WRITE) writing = null;
        busy = true;
      }

      var front = wave ? (now - wave.t0) * 0.6 : -1;   /* the ring, px from the click */
      if (wave && front > W + H) wave = null;
      if (wave) busy = true;

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var ex = d.x - pen.x, ey = d.y - pen.y;
        var dist = Math.sqrt(ex * ex + ey * ey);
        var tx = 0, ty = 0, ts = 1;
        if (dist < REACH) {
          var f = 1 - dist / REACH;
          f = f * f * (3 - 2 * f);
          var push = PUSH * f / Math.max(dist, 0.001);
          tx = ex * push; ty = ey * push;
          ts = 1 + SWELL * f;
        }
        /* the shockwave kicks each dot outward as the ring passes it */
        if (wave && d.hit !== wave.id) {
          var wx = d.x - wave.x, wy = d.y - wave.y, wd = Math.sqrt(wx * wx + wy * wy);
          if (wd <= front) {
            d.hit = wave.id;
            var jolt = 7 * Math.exp(-wd / 170) / Math.max(wd, 1);
            d.vx += wx * jolt; d.vy += wy * jolt; d.vs += 0.5 * Math.exp(-wd / 170);
          }
        }
        /* a slightly loose spring, so the dots wobble back into place */
        d.vx = (d.vx + (tx - d.ox) * 0.15) * 0.74;
        d.vy = (d.vy + (ty - d.oy) * 0.15) * 0.74;
        d.vs = (d.vs + (ts - d.s) * 0.15) * 0.74;
        d.ox += d.vx; d.oy += d.vy; d.s += d.vs;
        if (Math.abs(d.vx) + Math.abs(d.vy) + Math.abs(d.vs) > 0.004 ||
            Math.abs(d.ox - tx) + Math.abs(d.oy - ty) > 0.02) busy = true;
      }

      draw();
      if (busy) kick();
    }

    function kick() { if (!raf) raf = requestAnimationFrame(step); }

    /* bring it onto the paper: printed down under the head, or written in */
    function print(delay) {
      if (reduced) { head = 2; writing = null; draw(); return; }
      if (opt.write) {
        head = 2;
        writing = { t0: performance.now() + (delay || 0), at: -1 };
        soak();
        draw();
        kick();
        return;
      }
      head = -1; draw();
      setTimeout(function () { head = 0; printStart = 0; kick(); }, delay || 0);
    }

    function burst(e) {
      if (reduced || head < 1.2 || writing) return;
      var b = cv.getBoundingClientRect();
      wave = { x: e.clientX - b.left - cv.clientLeft, y: e.clientY - b.top - cv.clientTop,
               t0: performance.now(), id: ++waves };
      kick();
    }

    try {
      host.appendChild(cv);
      if (!build()) { cv.remove(); return null; }
    } catch (err) {          /* no pixels to read: leave whatever was there */
      cv.remove();
      return null;
    }
    if (opt.ready) opt.ready();
    draw();

    /* print once it is properly in view; again after a reprint */
    var due = !reduced;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          inView = e.isIntersecting;
          if (inView && due) { due = false; print(opt.delay || 220); }
        });
      }, { threshold: 0.45 }).observe(cv);
    } else { print(0); }
    document.addEventListener('receipt:reprint', function () {
      if (reduced) return;
      head = -1; writing = null; draw();
      due = true;
      if (inView) { due = false; print(650); }
    });

    /* the pen only has to come near, not onto, the dots */
    if (!reduced) {
      document.addEventListener('pointermove', function (e) {
        var b = cv.getBoundingClientRect();
        var x = e.clientX - b.left - cv.clientLeft, y = e.clientY - b.top - cv.clientTop;
        var near = x > -REACH && y > -REACH && x < W + REACH && y < H + REACH;
        if (near) { pen.x = x; pen.y = y; kick(); }
        else if (pen.x > -1e3) { pen.x = pen.y = -1e4; kick(); }
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', function () { pen.x = pen.y = -1e4; kick(); });
      /* a finger lifting off shouldn't leave the loupe parked where it was */
      document.addEventListener('pointerup', function (e) {
        if (e.pointerType === 'touch') { pen.x = pen.y = -1e4; kick(); }
      });
    }

    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (cv.clientWidth !== W || cv.clientHeight !== H) { build(); draw(); }
      }, 150);
    });

    return { burst: burst, canvas: cv };
  }

  /* fig. 1: the photo's tones, cropped like object-fit:cover */
  $$('[data-halftone]').forEach(function (fig) {
    var img = $('img', fig);
    if (!img) return;
    function readPhoto(w, h) {
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var s = Math.max(w / iw, h / ih);
      var sw = w / s, sh = h / s;
      var off = document.createElement('canvas');
      off.width = w; off.height = h;
      var o = off.getContext('2d', { willReadFrequently: true });
      o.imageSmoothingQuality = 'high';
      o.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
      var px = o.getImageData(0, 0, w, h).data;   /* throws on a tainted canvas (file://) */
      var lum = new Float32Array(w * h), hist = new Uint32Array(256);
      for (var i = 0; i < w * h; i++) {
        /* weighted toward blue, like a pale filter on b&w film: the sky lifts
           off the subject instead of printing as a wall of dots */
        var l = 0.25 * px[i * 4] + 0.42 * px[i * 4 + 1] + 0.33 * px[i * 4 + 2];
        lum[i] = l / 255;
        hist[l | 0]++;
      }
      /* stretch the levels between the 2nd and 98th percentile */
      var lo = 0, hi = 255, acc = 0;
      for (i = 0; i < 256; i++) { acc += hist[i]; if (acc > w * h * 0.02) { lo = i / 255; break; } }
      for (acc = 0, i = 255; i >= 0; i--) { acc += hist[i]; if (acc > w * h * 0.02) { hi = i / 255; break; } }
      var span = Math.max(0.1, hi - lo);
      for (i = 0; i < lum.length; i++) {
        /* stretch, then open up the midtones — dots spread on paper, so a
           halftone always prints darker than its numbers say — and turn it to ink */
        lum[i] = 1 - Math.pow(Math.min(1, Math.max(0, (lum[i] - lo) / span)), 0.72);
      }
      return lum;
    }
    function start() {
      halftone(img.parentNode, {          /* the .zoomable wrapper from section 6 */
        ink: readPhoto,
        cell: function (W) { return W > 170 ? 4 : 3.6; },
        ready: function () { fig.classList.add('ht-on'); }
      });
    }
    if (img.complete && img.naturalWidth) start();
    else img.addEventListener('load', start, { once: true });
  });

  /* ---------------------------------------------------------
     8. ASCII DESK — the desk either side of the paper, drawn as
        a slow field of characters drifting like ink in water.
        the pen leaves ripples behind it; a click drops a stone
     --------------------------------------------------------- */
  (function () {
    var cv = $('#desk');
    var roll = $('.roll');
    var index = $('.index');
    if (!cv || !roll) return;
    var ctx = cv.getContext('2d');

    var RAMP = ' .:-=+*#%@';
    var SHADES = [0.09, 0.14, 0.2, 0.28];
    var CW = 9, CH = 15;                  /* character cell, css px */
    var dpr = 1, W = 0, H = 0;
    var atlas = null;
    var ripples = [];
    var pen = { x: -1e4, y: -1e4, lx: -1e4, ly: -1e4, lt: 0 };
    var raf = 0, last = 0;

    /* 2d simplex noise, seeded so the desk is the same desk every visit */
    var perm = new Uint8Array(512);
    var GR = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    (function () {
      var p = [], s = 2026, i;
      for (i = 0; i < 256; i++) p[i] = i;
      for (i = 255; i > 0; i--) {
        s = (s * 16807) % 2147483647;
        var j = s % (i + 1), t = p[i]; p[i] = p[j]; p[j] = t;
      }
      for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    })();
    var F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    function noise(xin, yin) {
      var s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
      var t = (i + j) * G2, x0 = xin - (i - t), y0 = yin - (j - t);
      var i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
      var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      var ii = i & 255, jj = j & 255, n = 0, a, g;
      a = 0.5 - x0 * x0 - y0 * y0;
      if (a > 0) { g = GR[perm[ii + perm[jj]] & 7]; a *= a; n += a * a * (g[0] * x0 + g[1] * y0); }
      a = 0.5 - x1 * x1 - y1 * y1;
      if (a > 0) { g = GR[perm[ii + i1 + perm[jj + j1]] & 7]; a *= a; n += a * a * (g[0] * x1 + g[1] * y1); }
      a = 0.5 - x2 * x2 - y2 * y2;
      if (a > 0) { g = GR[perm[ii + 1 + perm[jj + 1]] & 7]; a *= a; n += a * a * (g[0] * x2 + g[1] * y2); }
      return 70 * n;
    }

    /* every glyph at every shade, rendered once */
    function buildAtlas() {
      atlas = document.createElement('canvas');
      atlas.width = Math.ceil(RAMP.length * CW * dpr);
      atlas.height = Math.ceil(SHADES.length * CH * dpr);
      var a = atlas.getContext('2d');
      a.scale(dpr, dpr);
      a.font = '400 12px "Courier Prime", "Courier New", monospace';
      a.textAlign = 'center';
      a.textBaseline = 'middle';
      for (var s = 0; s < SHADES.length; s++) {
        a.fillStyle = 'rgba(16,16,16,' + SHADES[s] + ')';
        for (var c = 1; c < RAMP.length; c++) a.fillText(RAMP[c], c * CW + CW / 2, s * CH + CH / 2 + 1);
      }
    }

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px';
      cv.style.height = H + 'px';
      buildAtlas();
    }

    /* worth drawing only when there is real desk showing beside the paper */
    function deskShowing() {
      var b = roll.getBoundingClientRect();
      return b.left > 40;
    }

    function frame(now) {
      raf = 0;
      var t = now / 1000;
      var b = roll.getBoundingClientRect();
      var px0 = b.left, px1 = b.right;
      var ib = null;
      var r = index ? index.getBoundingClientRect() : null;   /* zero-sized while hidden */
      if (r && r.width) ib = { l: r.left - 26, t: r.top - 26, r: r.right + 26, b: r.bottom + 26 };
      var scroll = window.scrollY * 0.35;

      /* old ripples die out */
      for (var k = ripples.length - 1; k >= 0; k--) if (t - ripples[k].t0 > 3.2) ripples.splice(k, 1);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);

      var cols = Math.ceil(W / CW), rows = Math.ceil(H / CH);
      var gw = CW * dpr, gh = CH * dpr;
      for (var cx = 0; cx < cols; cx++) {
        var x = cx * CW + CW / 2;
        /* stay clear of the paper and the shadow it throws */
        var edge = x < px0 ? px0 - x : x > px1 ? x - px1 : -1;
        if (edge < 16) continue;
        var mEdge = Math.min(1, (edge - 16) / 44);

        for (var cy = 0; cy < rows; cy++) {
          var y = cy * CH + CH / 2;
          var m = mEdge;
          if (ib && x > ib.l - 24 && x < ib.r + 24 && y > ib.t - 24 && y < ib.b + 24) {
            var ox = Math.max(ib.l - x, 0, x - ib.r), oy = Math.max(ib.t - y, 0, y - ib.b);
            m *= Math.min(1, Math.sqrt(ox * ox + oy * oy) / 24);
            if (m <= 0) continue;
          }

          /* ink in water: two layers of noise drifting against each other,
             with a slow warp so the patches curl rather than slide */
          var nx = x * 0.0058, ny = (y + scroll) * 0.0066;
          var warp = noise(nx * 0.7 + t * 0.018, ny * 0.7 - 4.2) * 0.9;
          var v = noise(nx + warp + t * 0.03, ny - t * 0.017) * 0.66 +
                  noise(nx * 2.3 - t * 0.05 + 7.1, ny * 2.3 + warp + t * 0.04) * 0.34;
          v = Math.max(0, v * 1.25);           /* about half the desk is calm water */

          /* rings spreading out from wherever the pen has been — laid over the
             field, so they show up on calm water as well as in the ink */
          for (var q = 0; q < ripples.length; q++) {
            var rp = ripples[q];
            var age = t - rp.t0;
            if (age < 0) continue;
            var ddx = x - rp.x, ddy = y - rp.y;
            var gap = Math.sqrt(ddx * ddx + ddy * ddy) - age * 210;
            if (gap > 70 || gap < -70) continue;
            v += rp.a * Math.cos(gap * 0.14) * Math.exp(-gap * gap / 900) * Math.exp(-age * 1.1);
          }

          /* and the pen itself parts the water */
          var pdx = x - pen.x, pdy = y - pen.y;
          var pd = pdx * pdx + pdy * pdy;
          if (pd < 4900) { var pf = 1 - Math.sqrt(pd) / 70; v -= pf * pf * 1.6; }

          v *= m;
          if (v < 0.07) continue;
          var ci = Math.min(RAMP.length - 1, 1 + Math.floor(v * 7));
          var si = Math.min(SHADES.length - 1, Math.floor(v * 3.2));
          ctx.drawImage(atlas, ci * gw, si * gh, gw, gh,
                        Math.round((x - CW / 2) * dpr), Math.round((y - CH / 2) * dpr), gw, gh);
        }
      }
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;        /* ~30fps is plenty for drifting ink */
      last = now;
      if (!deskShowing()) { ctx.clearRect(0, 0, cv.width, cv.height); return; }
      frame(now);
    }

    /* background tabs pause requestAnimationFrame on their own */
    function run() {
      if (reduced) { if (deskShowing()) frame(0); return; }
      if (!raf) raf = requestAnimationFrame(loop);
    }

    function onDesk(x, y) {
      var b = roll.getBoundingClientRect();
      return x < b.left - 8 || x > b.right + 8;
    }

    if (!reduced) {
      document.addEventListener('pointermove', function (e) {
        pen.x = e.clientX; pen.y = e.clientY;
        if (!onDesk(pen.x, pen.y)) return;
        /* a ripple every so often as the pen moves, stronger the faster it goes */
        var now = performance.now() / 1000;
        var moved = Math.hypot(pen.x - pen.lx, pen.y - pen.ly);
        if (moved > 18 && now - pen.lt > 0.07) {
          ripples.push({ x: pen.x, y: pen.y, t0: now, a: Math.min(0.55, Math.max(0.18, moved / 70)) });
          if (ripples.length > 26) ripples.shift();
          pen.lx = pen.x; pen.ly = pen.y; pen.lt = now;
        }
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', function () { pen.x = pen.y = -1e4; });
      /* a click on the desk drops a stone */
      document.addEventListener('pointerdown', function (e) {
        if (!onDesk(e.clientX, e.clientY)) return;
        var now = performance.now() / 1000;
        ripples.push({ x: e.clientX, y: e.clientY, t0: now, a: 1.1 });
        ripples.push({ x: e.clientX, y: e.clientY, t0: now + 0.28, a: 0.6 });
      });
    }

    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { size(); if (reduced) run(); }, 120);
    });

    fontsReady.then(function () { size(); run(); });
  })();

  /* ---------------------------------------------------------
     9. HALFTONE NAME — "varun." through the same screen as
        fig. 1, softened so each stroke prints heaviest down its
        middle and tapers at its edges, like a photo of type. each
        visit sets it in one script face, picked at random, and
        writes it in; the pen scatters it (and the dots it moves
        take a little blue ink), and a click sends a shockwave
     --------------------------------------------------------- */
  (function () {
    var box = $('#dot-name');
    if (!box) return;
    var WORD = 'varun.';
    /* the faces it might be set in (offered, cut down to these six letters, in
       index.html — only the one picked is ever downloaded). fat thickens the
       lighter scripts so they hold their dots */
    var FACES = [
      { font: '400 {s}px "Yellowtail"', fat: 0.025 },
      { font: 'italic 800 {s}px "Playfair Display"', fat: 0.01 },
      { font: '400 {s}px "Great Vibes"', fat: 0.032 },
      { font: '400 {s}px "Kaushan Script"', fat: 0.02 },
      { font: '700 {s}px "Dancing Script"', fat: 0.02 },
      { font: '400 {s}px "Allura"', fat: 0.032 },
      { font: '400 {s}px "Pinyon Script"', fat: 0.032 }
    ];

    /* a box blur, one row then one column at a time */
    function blur(src, w, h, r) {
      var tmp = new Float32Array(w * h), out = new Float32Array(w * h);
      var k = 1 / (2 * r + 1), x, y, acc;
      for (y = 0; y < h; y++) {
        var row = y * w;
        for (acc = 0, x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
        for (x = 0; x < w; x++) {
          tmp[row + x] = acc * k;
          acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
        }
      }
      for (x = 0; x < w; x++) {
        for (acc = 0, y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (y = 0; y < h; y++) {
          out[y * w + x] = acc * k;
          acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
        }
      }
      return out;
    }

    /* the word in one face, fitted to the box, read back as ink */
    function setWord(face, w, h, cell) {
      var off = document.createElement('canvas');
      off.width = w; off.height = h;
      var o = off.getContext('2d', { willReadFrequently: true });
      var pad = cell * 3;
      o.font = face.font.replace('{s}', 100);
      var m = o.measureText(WORD);
      var size = 100 * Math.min((w - pad * 2) / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight),
                                (h - pad * 2) / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent));
      o.font = face.font.replace('{s}', size.toFixed(2));
      m = o.measureText(WORD);
      var x = (w - m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2 + m.actualBoundingBoxLeft;
      var y = (h - m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 + m.actualBoundingBoxAscent;
      o.lineWidth = size * face.fat;
      o.lineJoin = 'round';
      o.fillText(WORD, x, y);
      if (face.fat) o.strokeText(WORD, x, y);
      var a = o.getImageData(0, 0, w, h).data;
      var ink = new Float32Array(w * h);
      for (var i = 0; i < w * h; i++) ink[i] = a[i * 4 + 3] / 255;
      var r = Math.max(2, Math.round(cell * 0.9));
      ink = blur(blur(ink, w, h, r), w, h, r);
      for (i = 0; i < ink.length; i++) {
        var v = Math.min(1, Math.max(0, (ink[i] - 0.1) / 0.75));
        ink[i] = 0.64 * v * v * (3 - 2 * v);   /* never solid: every dot stays its own dot */
      }
      return ink;
    }

    function start(face) {
      var ht = halftone(box, {
        ink: function (w, h, cell) { return setWord(face, w, h, cell); },
        cell: function (W) { return W > 400 ? 4.2 : 3.4; },
        reach: 60, push: 12, swell: 0.4,
        accent: [36, 64, 255],
        write: true,
        delay: 420,
        ready: function () { box.classList.add('ready'); }
      });
      if (ht) box.addEventListener('click', ht.burst);
    }

    /* one face per visit; if it won't load, the name falls back to courier prime */
    var face = FACES[(Math.random() * FACES.length) | 0];
    var COURIER = { font: '700 {s}px "Courier Prime"', fat: 0.035 };
    var fonts = document.fonts && document.fonts.load ? document.fonts : null;
    if (!fonts) { start(COURIER); return; }
    fonts.load(face.font.replace('{s}', 100), WORD).then(function (got) {
      start(got.length ? face : COURIER);
    }, function () { start(COURIER); });
  })();

})();
