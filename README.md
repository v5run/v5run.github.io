# varunp.me — the receipt

my personal portfolio as a single long receipt: one scroll, black ink on thermal paper
(bar one spot of colour, below), everything lowercase. the page "prints" as you scroll —
line items rise into view, headings type themselves, hand-drawn rules and boxes draw on, and an ink cursor leaves
a fading trail. the paper is an 80mm-style strip torn off at both ends, with crumples,
folds, and the odd pale line where a print-head dot has worn out.

three toys live on it:
- **the name** at the top goes through the same halftone screen as fig. 1, set in one
  of seven script faces picked at random each visit. it's written in — the dots soak
  into the paper left to right in uneven clumps — and stays put until the next refresh.
  the pen scatters it like fig. 1, and the dots it moves take a little blue ink (the
  only colour on the site); a click sends a shockwave through it.
- **fig. 1** is reprinted as a 45° halftone that prints in row by row; the dots swell and
  scatter around the pen. (section 7 of `script.js` draws both it and the name.)
- **the desk** either side of the paper is a slow field of ascii characters drifting like
  ink in water. moving the pen leaves ripples; clicking drops a stone.

- `index.html` — the receipt content, top to bottom (experience is a collapsible list;
  awards live inside the total)
- `style.css` — paper, grain, line items, dot leaders, torn ends, folds
- `script.js` — reveal sweep, typing, ink cursor, progress, barcode, torn edges,
  halftone portrait, ascii desk, halftone name
- `images/paper-crumple.svg`, `images/paper-fade.svg` — the paper's relief and the
  uneven print density, as svg filter tiles

deep links: `/#about`, `/#stack`, `/#experience`, `/#projects`, `/#total`, `/#contact`. respects `prefers-reduced-motion` (no typing, no trail, a still desk, everything shown).

plain static html/css/js — no build step. served by github pages. bump the `?v=` on the
css/js links in `index.html` when they change, so a cached copy never meets new html.
