/* Flipbook viewer: flip through the real pages of a publication.
   Data: window.__FLIPBOOKS = { "<publication page href>": { dir, count, ratio:[spreadW, H], coverW, pdf, title } }  (built by _build/data.py)
   Trigger: any element with data-flip="<publication page href>".
   Page images: <dir>/p001.jpg ... (page 1 = cover, last = back cover, the pages in between are two-page spreads).
   Desktop: real 3D page turns (click a page, drag a corner, ← → keys). Phones: one page at a time, swipe. */
(() => {
  'use strict';
  const DATA = window.__FLIPBOOKS || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let ui = null;

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-flip]');
    if (!t) return;
    const key = t.getAttribute('data-flip');
    if (!DATA[key]) return;
    e.preventDefault(); e.stopPropagation();
    open(key, t);
  });

  function open(key, opener) {
    if (ui) return;
    const D = DATA[key], N = D.count, spreadsMode = (D.mode || 'spreads') === 'spreads';
    const pageAspect = spreadsMode ? (D.ratio[0] / 2) / D.ratio[1] : D.ratio[0] / D.ratio[1];     // width / height of ONE page
    // PL = every page of the book in reading order: [pdfPage, part] with part 'whole' | 'left' | 'right', or null for a blank page.
    // PL[0] is the cover (alone on the right), then left/right pairs, and the last entry is the back cover. Leaf k = front PL[2k], back PL[2k+1].
    const PL = [[1, 'whole']];
    if (spreadsMode) for (let m = 2; m < N; m++) PL.push([m, 'left'], [m, 'right']);
    else {
      // Books whose last PDF page is a content page (not a back cover) keep it as a normal page and get a plain dark back cover.
      PL.push(null); for (let m = 2; m < (D.hasBack === false ? N + 1 : N); m++) PL.push([m, 'whole']);
      if ((PL.length + 1) % 2) PL.push(null);
    }
    PL.push(D.hasBack === false ? [0, 'dark'] : [N, 'whole']);
    const total = PL.length, L = total / 2;                       // single pages, leaves
    const printed = spreadsMode ? total - 1 : N;                  // page count shown to the reader
    const numOf = i => spreadsMode ? i + 1 : (PL[i] ? PL[i][0] : null);
    const img = n => `${D.dir}p${String(n).padStart(3, '0')}.jpg`;
    // Single-page PDFs can mix page sizes: fit each image inside the page box (letterboxed on white) instead of stretching it.
    const fit = (n, pw, ph) => { const s = D.sizes && D.sizes[n - 1]; if (!s) return {w: pw, h: ph, x: 0, y: 0}; const k = Math.min(pw / s[0], ph / s[1]), w = s[0] * k, h = s[1] * k; return {w, h, x: (pw - w) / 2, y: (ph - h) / 2}; };
    const bg = (n, part) => ({backgroundImage: `url(${img(n)})`, backgroundRepeat: 'no-repeat',
      backgroundSize: part === 'whole' ? (spreadsMode ? '100% 100%' : 'contain') : '200% 100%', backgroundPosition: part === 'right' ? '100% 0' : part === 'left' ? '0 0' : 'center'});
    const apply = (el, n, part) => { if (part === 'dark') el.classList.add('fb-dark'); else if (n) Object.assign(el.style, bg(n, part)); };

    let pg = 0;                                                    // current single-page index (0 = cover … total-1 = back cover)
    let single = innerWidth < 760;
    let pos = 0;                                                   // spread mode: leaves flipped
    const lastFocus = opener;

    /* ---------- shell ---------- */
    const root = document.createElement('div');
    root.className = 'fb'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Flip through ' + (D.title || 'the book'));
    root.innerHTML =
      '<button type="button" class="fb-x" aria-label="Close book"><span></span><span></span></button>' +
      '<div class="fb-stage"><div class="fb-book"></div></div>' +
      '<div class="fb-bar">' +
        '<button type="button" class="fb-prev" aria-label="Previous page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>' +
        '<span class="fb-count" aria-live="polite"></span>' +
        '<button type="button" class="fb-next" aria-label="Next page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>' +
        (D.pdf ? `<a class="fb-pdf" href="${D.pdf}" target="_blank" rel="noopener">Open PDF <span aria-hidden="true">↗</span></a>` : '') +
      '</div>';
    document.body.appendChild(root);
    document.documentElement.classList.add('fb-lock');
    requestAnimationFrame(() => root.classList.add('is-in'));
    const stage = root.querySelector('.fb-stage'), book = root.querySelector('.fb-book');
    const count = root.querySelector('.fb-count'), btnPrev = root.querySelector('.fb-prev'), btnNext = root.querySelector('.fb-next');

    /* ---------- sizing ---------- */
    let ph = 0, pw = 0;
    function size() {
      const availH = innerHeight - 150, availW = innerWidth - (single ? 32 : 160);
      ph = single ? Math.min(availH, availW / pageAspect) : Math.min(availH, availW / (2 * pageAspect));
      ph = Math.max(200, Math.floor(ph)); pw = Math.floor(ph * pageAspect);
      book.style.setProperty('--pw', pw + 'px'); book.style.setProperty('--ph', ph + 'px');
    }

    /* ---------- spread mode (3D) ----------
       Resting leaves are flat. While a leaf turns it is swapped for a "bend": the page cut into thin nested slices, each rotated a little
       more than the one before, so the sheet curls like paper (the free edge trails, then catches up). */
    const SL = 36, BMAX = 2.1, OVER = 3;                                       // slices per page, peak bend per slice (degrees), overlap in px that hides the seams
    const PERSP = 2600;                                                         // must match .fb-stage perspective
    let curShift = 0;
    let leaves = [];
    const bends = new Map();
    function buildSpread() {
      bends.forEach(B => { cancelAnimationFrame(B.raf); B.wrap.remove(); B.castR.remove(); B.castL.remove(); }); bends.clear();
      book.className = 'fb-book fb-spread'; book.innerHTML = ''; leaves = [];
      const add = c => { const d = document.createElement('div'); d.className = c; book.appendChild(d); };
      add('fb-shadow');
      for (let k = 0; k < L; k++) {
        const leaf = document.createElement('div'); leaf.className = 'fb-leaf';
        const f = document.createElement('div'); f.className = 'fb-face fb-front';
        const b = document.createElement('div'); b.className = 'fb-face fb-back';
        leaf._f = f; leaf._b = b; leaf._k = k; leaf._loaded = false;
        leaf.append(f, b); book.appendChild(leaf); leaves.push(leaf);
      }
      add('fb-gutter fb-gutter-l'); add('fb-gutter fb-gutter-r');           // after the leaves: drawn over the resting pages
      render();
    }
    const frontOf = k => PL[2 * k] || [0, 'whole'];
    const backOf = k => PL[2 * k + 1] || [0, 'whole'];
    function loadLeaf(leaf) {
      if (leaf._loaded) return; leaf._loaded = true; const k = leaf._k;
      apply(leaf._f, ...frontOf(k)); apply(leaf._b, ...backOf(k));
    }
    // Book position and shadows are driven by the turn itself (not by CSS transitions), so they move exactly with the sheet.
    function setVars(shift, x, w, gl, gr) {
      curShift = shift;
      book.style.setProperty('--shift', shift.toFixed(2) + 'px'); book.style.setProperty('--sl', `calc(50% + ${x.toFixed(2)}px)`);
      book.style.setProperty('--sw', w.toFixed(2) + 'px'); book.style.setProperty('--gl', gl.toFixed(3)); book.style.setProperty('--gr', gr.toFixed(3));
    }
    // Closed book: the cover / back cover is the outside of the book, so no gutter crease on it.
    function restVars() {
      if (pos === 0) setVars(-pw / 2, 0, pw, 0, 0);
      else if (pos === L) setVars(pw / 2, -pw, pw, 0, 0);
      else setVars(0, -pw, 2 * pw, 1, 1);
    }
    // Cover (leaf 0) and back cover (last leaf): the book slides to stay centred, and the shadow under the book and the gutter
    // crease follow where paper actually lies (g = sheet geometry), never the empty table beside it.
    function edgeVars(k, t, g) {
      const ramp = v => clamp(v, 0, 1);
      if (k === 0) { const x = Math.min(0, g.xmin); setVars(-pw / 2 * (1 - t), x, pw - x, ramp(-g.x / pw), ramp(t / .12)); }
      else if (k === L - 1) { const x = Math.max(0, g.xmax); setVars(pw / 2 * t, -pw, pw + x, ramp((1 - t) / .12), ramp(g.x / pw)); }
    }
    // Where the curled sheet is: walks the nested slices (each turned b degrees more than the last) and returns the free edge (x, z),
    // its horizontal extent (flat and as seen through the stage perspective) and how much each slice faces the viewer.
    // Slice boundaries in WHOLE pixels. The slices are nested, each placed at the end of the one before; with fractional widths the
    // browser rounds every level to the pixel grid when it draws, the rounding piles up over the 36 levels and the page content is drawn
    // several px wider than the flat page the moment the turn starts (a visible outward "stretch" that layout measurements don't show).
    const xb = i => Math.round(i * pw / SL);
    function geom(B, t) {
      const b = curl(B, t), rad = Math.PI / 180, sh = curShift;
      let x = 0, z = 0, xmin = 0, xmax = 0, pmin = 0, pmax = 0; const face = new Array(SL);
      for (let i = 0; i < SL; i++) {
        const a = (-180 * t + (i + 1) * b) * rad, w = xb(i + 1) - xb(i);
        face[i] = Math.abs(Math.cos(a));
        x += w * Math.cos(a); z -= w * Math.sin(a);
        const p = (sh + x) * PERSP / (PERSP - z) - sh;
        if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (p < pmin) pmin = p; if (p > pmax) pmax = p;
      }
      return {x, z, xmin, xmax, pmin, pmax, face};
    }
    function restZ(k) { return k < pos ? k + 1 : L - k; }
    function render() {
      leaves.forEach((leaf, k) => {
        if (Math.abs(k - pos) <= 4) loadLeaf(leaf);
        leaf.style.display = Math.abs(k - pos) <= 5 ? '' : 'none';
        if (!bends.has(k)) { leaf.classList.toggle('is-flipped', k < pos); leaf.style.zIndex = restZ(k); }
      });
      if (!bends.has(0) && !bends.has(L - 1)) restVars();
      label();
    }
    function slicePaint(el, [n, part], off) {
      if (part === 'dark') { el.classList.add('fb-dark'); return; }
      if (!n) return;
      el.style.backgroundImage = `url(${img(n)})`; el.style.backgroundRepeat = 'no-repeat';
      if (part === 'whole' && !spreadsMode) { const f = fit(n, pw, ph); el.style.backgroundSize = `${f.w}px ${f.h}px`; el.style.backgroundPosition = `${f.x - off}px ${f.y}px`; return; }
      el.style.backgroundSize = part === 'whole' ? `${pw}px ${ph}px` : `${2 * pw}px ${ph}px`;
      el.style.backgroundPosition = `${-(part === 'right' ? pw + off : off)}px 0`;
    }
    function startBend(k) {
      let B = bends.get(k); if (B) return B;
      const leaf = leaves[k]; loadLeaf(leaf);
      const wrap = document.createElement('div'); wrap.className = 'fb-bend';
      let parent = wrap; const slices = [];
      for (let i = 0; i < SL; i++) {
        const over = i < SL - 1 ? OVER : 0, x0 = xb(i), x1 = xb(i + 1);
        const sl = document.createElement('div'); sl.className = 'fb-slice'; sl.style.width = (x1 - x0 + over) + 'px'; slices.push(sl);
        if (i > 0) sl.style.left = (x0 - xb(i - 1)) + 'px';
        // The overlap sticks out on the slice's outer side. The back face is mirrored, so there that extra strip comes first:
        // start the back image `over` px earlier, or the landed page sits 3px left (with a light strip at the spine) and jumps on landing.
        const fo = x0, bo = pw - x1 - over;
        const f = document.createElement('div'); f.className = 'fb-sf'; slicePaint(f, frontOf(k), fo); f.style.setProperty('--gx', -fo + 'px');
        const b = document.createElement('div'); b.className = 'fb-sb'; slicePaint(b, backOf(k), bo); b.style.setProperty('--gx', -bo + 'px');
        sl.append(f, b); parent.appendChild(sl); parent = sl;
      }
      const mk = side => { const c = document.createElement('div'); c.className = 'fb-cast fb-cast-' + side; return c; };
      const castR = mk('r'), castL = mk('l');
      book.append(castR, castL, wrap);
      B = {k, wrap, castR, castL, slices, t: leaf.classList.contains('is-flipped') ? 1 : 0, dir: 1, raf: 0, leaf};
      leaf.style.visibility = 'hidden'; bends.set(k, B); setT(B, B.t); return B;
    }
    const sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
    // Bend per slice. The curl fades out over the last 40% of the turn (in the direction of travel), so the sheet comes down flat
    // instead of landing with its free edge still raised: a raised edge is nearer the viewer and, through the perspective, makes the
    // landing page look taller and wider than the resting page and then visibly shrink into place.
    function curl(B, t) {
      const land = B.dir > 0 ? t : 1 - t;
      return B.dir * BMAX * Math.sin(Math.PI * t) * (1 - sm((land - .6) / .4));
    }
    function setT(B, t) {
      B.t = t;
      if (B.k === 0) curShift = -pw / 2 * (1 - t); else if (B.k === L - 1) curShift = pw / 2 * t;   // geom() needs this frame's book position
      const g = geom(B, t);
      if (B.k === 0 || B.k === L - 1) edgeVars(B.k, t, g);
      // A sheet that is nearly flat but tilted up toward the viewer projects WIDER than the page it lies on (perspective), so just
      // before landing (and just after lifting) it would bulge past the resting page and then shrink into place. Shorten it from
      // the spine by exactly that excess (at most ~1%), so its edge never goes beyond the page edge. scaleX only: a uniform scale
      // would also make the sheet shorter at the spine, where it must stay exactly as tall as the book (it would visibly shrink there).
      const far = g.x < 0 ? -g.pmin : g.pmax, fit = far > pw ? pw / far : 1;
      B.wrap.style.transform = `translateZ(2px) rotateY(${-180 * t}deg) scaleX(${fit.toFixed(5)})`;
      B.wrap.style.setProperty('--b', curl(B, t).toFixed(3) + 'deg');
      // The sheet's own gutter crease: full while it lies flat (matching the flat crease it covers), fading softly as it lifts;
      // the back face gains its crease as it lands. Covers are the outside of the book: no crease on them.
      B.wrap.style.setProperty('--gf', ((B.k === 0 ? 0 : 1) * (1 - sm(t / .45))).toFixed(3));
      B.wrap.style.setProperty('--gb', ((B.k === L - 1 ? 0 : 1) * sm((t - .55) / .45)).toFixed(3));
      // Self-shading: each slice darkens as it turns edge-on to the viewer (front and back alike), so the curl reads as a curve.
      for (let i = 0; i < SL; i++) B.slices[i].style.setProperty('--s', (.5 * (1 - g.face[i])).toFixed(3));
      // Cast shadow: falls on the page the sheet is over, starting at the sheet's visible edge and spreading as the sheet rises.
      // Near vertical it is shared by both pages; nothing is cast where there is no page (beside the cover / back cover).
      // Strength follows the sheet's height with a smoothstep, so it fades out gradually as the sheet settles instead of staying
      // dark until the last frame; the falloff is wide and eased (several stops), so there is never a hard line beside the sheet.
      const lift = Math.max(0, g.z), u = clamp(lift / (.35 * pw), 0, 1);
      const a = .4 * u * u * (3 - 2 * u) * (1 - .35 * clamp(lift / pw, 0, 1)), spread = 40 + lift * .7;
      const FALL = [[0, 1], [.15, .72], [.35, .42], [.6, .16], [.82, .04], [1, 0]];
      const wR = clamp(.5 + g.x / (.25 * pw), 0, 1), wL = 1 - wR;
      const cast = (el, deg, e, w) => {
        el.style.opacity = w.toFixed(3);
        el.style.background = `linear-gradient(${deg}deg, rgba(0,0,0,${a.toFixed(3)}) ${(e - 6).toFixed(1)}px, ` +
          FALL.map(([x, k]) => `rgba(0,0,0,${(a * k).toFixed(3)}) ${(e + x * spread).toFixed(1)}px`).join(', ') + ')';
      };
      cast(B.castR, 90, clamp(g.pmax * fit, 0, pw), B.k === L - 1 ? 0 : wR);
      cast(B.castL, 270, clamp(-g.pmin * fit, 0, pw), B.k === 0 ? 0 : wL);
    }
    function finishBend(B, target) {
      B.wrap.remove(); B.castR.remove(); B.castL.remove(); bends.delete(B.k);
      B.leaf.classList.toggle('is-flipped', target === 1); B.leaf.style.visibility = ''; B.leaf.style.zIndex = restZ(B.k);
      if (!bends.has(0) && !bends.has(L - 1)) restVars();

    }
    function animateBend(B, target, dur) {
      cancelAnimationFrame(B.raf);
      const from = B.t; if (from === target) { finishBend(B, target); return; }
      B.dir = target > from ? 1 : -1;
      if (reduced.matches) { finishBend(B, target); return; }
      const t0 = performance.now(), d = dur * Math.abs(target - from) ** .6 + 160;
      const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const tick = now => {
        const p = Math.min(1, (now - t0) / d);
        setT(B, from + (target - from) * ease(p));
        if (p < 1) B.raf = requestAnimationFrame(tick); else finishBend(B, target);
      };
      B.raf = requestAnimationFrame(tick);
    }
    function turn(dir) {                                           // dir +1 next, -1 previous
      const next = clamp(pos + dir, 0, L);
      if (next === pos) return;
      const k = dir > 0 ? pos : next;
      const B = startBend(k);                                      // before render(), which would flip the flat leaf at once
      pos = next; render();
      animateBend(B, dir > 0 ? 1 : 0, 1000);
    }

    /* drag a page: the sheet follows the pointer and curls, then settles */
    let drag = null;
    book.addEventListener('pointerdown', e => {
      if (single || e.button) return;
      const r = book.getBoundingClientRect(), right = (e.clientX - r.left) > r.width / 2;
      if ((right && pos >= L) || (!right && pos <= 0)) return;
      drag = {right, x0: e.clientX, moved: 0, id: e.pointerId, t0: performance.now(), p: 0, B: null};
      book.setPointerCapture(e.pointerId);
    });
    book.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0; drag.moved = Math.max(drag.moved, Math.abs(dx));
      if (drag.moved < 6) return;
      if (!drag.B) { const k = drag.right ? pos : pos - 1; drag.B = startBend(k); cancelAnimationFrame(drag.B.raf); drag.k = k; }
      const p = clamp((drag.right ? -dx : dx) / pw, 0, 1);
      drag.p = p; drag.B.dir = drag.right ? 1 : -1;
      setT(drag.B, drag.right ? p : 1 - p);
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (d.moved < 6) { turn(d.right ? 1 : -1); return; }          // a plain click on a page
      const fast = (performance.now() - d.t0) < 260 && d.moved > 24;
      const commit = d.p > .35 || fast, dir = d.right ? 1 : -1;
      if (commit) { pos = clamp(pos + dir, 0, L); render(); animateBend(d.B, d.right ? 1 : 0, 1000); }
      else animateBend(d.B, d.right ? 0 : 1, 1000);
    };
    book.addEventListener('pointerup', endDrag); book.addEventListener('pointercancel', endDrag);

    /* ---------- single-page mode (phones) ---------- */
    let one = null;
    const pageSrc = i => PL[i] || [0, 'whole'];
    function buildSingle() {
      book.className = 'fb-book fb-singlepage'; book.innerHTML = ''; one = null; showOne(0);
    }
    function showOne(dir) {
      const el = document.createElement('div'); el.className = 'fb-one'; const [n, part] = pageSrc(pg); apply(el, n, part);
      book.appendChild(el);
      const old = one; one = el;
      if (old) {
        if (reduced.matches || !dir) old.remove();
        else {
          old.animate([{transform: 'none', opacity: 1}, {transform: `translateX(${-dir * 40}px)`, opacity: 0}], {duration: 260, easing: 'ease', fill: 'forwards'}).onfinish = () => old.remove();
          el.animate([{transform: `translateX(${dir * 40}px)`, opacity: 0}, {transform: 'none', opacity: 1}], {duration: 260, easing: 'ease'});
        }
      }
      [pg + 1, pg + 2].forEach(i => { if (i < total && pageSrc(i)[0]) { const im = new Image(); im.src = img(pageSrc(i)[0]); } });
      label();
    }
    let sw = null;
    book.addEventListener('pointerdown', e => { if (single) sw = {x: e.clientX, y: e.clientY}; });
    book.addEventListener('pointerup', e => {
      if (!single || !sw) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      else if (Math.abs(dx) < 8) { const r = book.getBoundingClientRect(); step(e.clientX - r.left > r.width / 2 ? 1 : -1); }
    });

    /* ---------- shared ---------- */
    function step(dir) {
      if (single) { const n = clamp(pg + dir, 0, total - 1); if (n !== pg) { pg = n; showOne(dir); } }
      else turn(dir);
    }
    function label() {
      let t, atStart, atEnd;
      if (single) {
        const n1 = numOf(pg);
        t = pg === 0 ? 'Cover' : pg === total - 1 ? 'Back cover' : n1 ? `Page ${n1} of ${printed}` : 'Inside cover';
        atStart = pg === 0; atEnd = pg === total - 1;
      } else {
        const a = numOf(2 * pos - 1), b = numOf(2 * pos);
        t = pos === 0 ? 'Cover' : pos === L ? 'Back cover' : a && b ? `Pages ${a}–${b} of ${printed}` : `Page ${a || b} of ${printed}`;
        atStart = pos === 0; atEnd = pos === L;
      }
      count.textContent = t; btnPrev.disabled = atStart; btnNext.disabled = atEnd;
    }
    function closeBook() {
      if (!ui) return;
      removeEventListener('keydown', onKey, true); removeEventListener('resize', onResize);
      root.classList.remove('is-in'); document.documentElement.classList.remove('fb-lock');
      const done = () => { root.remove(); ui = null; lastFocus && lastFocus.focus && lastFocus.focus({preventScroll: true}); };
      reduced.matches ? done() : setTimeout(done, 260);
    }
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeBook(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'Home') { e.preventDefault(); if (single) { pg = 0; showOne(-1); } else { pos = 0; render(); } }
      else if (e.key === 'End') { e.preventDefault(); if (single) { pg = total - 1; showOne(1); } else { pos = L; render(); } }
      else if (e.key === 'Tab') {
        const f = [...root.querySelectorAll('button:not([disabled]),a[href]')]; if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    let rz = 0;
    const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { const s = innerWidth < 760; if (s !== single) { if (s) pg = pos === 0 ? 0 : clamp(2 * pos - 1, 0, total - 1); else pos = clamp(Math.ceil(pg / 2), 0, L); single = s; } size(); single ? buildSingle() : buildSpread(); }, 120); };
    addEventListener('keydown', onKey, true); addEventListener('resize', onResize);
    root.querySelector('.fb-x').addEventListener('click', closeBook);
    btnPrev.addEventListener('click', () => step(-1)); btnNext.addEventListener('click', () => step(1));
    stage.addEventListener('click', e => { if (e.target === stage) closeBook(); });          // click outside the book
    root.addEventListener('click', e => { if (e.target === root) closeBook(); });
    ui = root;
    size(); single ? buildSingle() : buildSpread();
    root.querySelector('.fb-x').focus({preventScroll: true});
  }
  window.__flipbook = {open, has: k => !!DATA[k]};
})();
