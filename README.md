# varun.study — the receipt

my personal portfolio as a single long receipt: one scroll, black ink on paper,
everything lowercase. the page "prints" as you scroll — a fixed printer head at the
top, line items that rise into view, headings that type themselves, hand-drawn rules
and boxes that draw on, an ink cursor that leaves a fading trail, and a torn edge at
the bottom.

- `index.html` — the receipt content, top to bottom (experience is a collapsible list;
  awards live inside the total)
- `style.css` — paper, grain, line items, dot leaders, printer head, tear edge
- `script.js` — reveal sweep, typing, ink cursor, printer read-out, barcode

deep links: `/#about`, `/#stack`, `/#experience`, `/#projects`, `/#total`, `/#contact`. respects `prefers-reduced-motion` (no typing, no trail, everything shown).

plain static html/css/js — no build step. served by github pages.
