/* 3D book carousel for the Publications page (vanilla port of the React "3D Book Carousel — Reading Mode").
   Reads the publication cards already on the page, so the shelf and the list never disagree.
   Input: drag, horizontal swipe/scroll, ← → keys, click a book. Click the centred book to open it. */
(() => {
  'use strict';
  const root = document.querySelector('[data-book-carousel]');
  if (!root) return;
  const cards = [...document.querySelectorAll('.publication-card[data-record]')];
  const catsOf = c => { try { return JSON.parse(c.getAttribute('data-categories') || '[]').map(x => { const t = document.createElement('textarea'); t.innerHTML = x; t.innerHTML = t.value; return t.value.trim(); }); } catch (e) { return []; } };
  // On the Publications page the shelf reads the cards on screen; elsewhere (home) it uses assets/publications-data.js.
  const items = cards.length >= 2
    ? cards.map(c => {
        const a = c.querySelector('h3 a'), img = c.querySelector('img'), meta = c.querySelector('.card-meta');
        const dp = c.querySelector('h3 + p');
        return {title: a ? a.textContent.trim() : 'Publication', href: a ? a.getAttribute('href') : '#',
                img: img ? img.getAttribute('src') : '', meta: meta ? meta.textContent.trim() : '', desc: dp ? dp.textContent.trim() : '', cats: catsOf(c)};
      })
    : (window.__PUBLICATIONS || []);
  if (items.length < 2) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const OPEN_W = 240, GAP = 80, FOCUS_H = 322;
  const OPEN_ANGLE = 174;                          // how far the cover swings: nearly flat, so both pages have the same height (180 would be perfectly flat)   // the centred book is always shown at this height
  const smoothstep = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const PALETTE = [
    ['#582483', '#fff'], ['#25063d', '#fff'], ['#9774c3', '#fff'], ['#3d156d', '#fff'], ['#d9c8ee', '#25063d'],
    ['#2f064f', '#fff'], ['#7a46b0', '#fff'], ['#e9dff5', '#25063d'], ['#4a1f82', '#fff'], ['#b79ad9', '#25063d'],
  ];
  const SPINE = [50, 25, 70, 20, 35, 50, 25, 45, 60, 55, 25, 30, 45, 40, 30];
  const HEIGHT = [320, 296, 346, 324, 338, 308, 352, 316, 332, 300, 344, 326, 304, 340, 322];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

  // Main title + auxiliary line, split at the first natural separator already present in the title.
  function splitTitle(title, cat) {
    const m = title.match(/^(.+?)(?::\s+|\s+[-–—]\s+)(.+)$/);
    if (!m) return [title, ''];
    let main = m[1].trim(), sub = m[2].trim();
    const generic = main.length <= 4 || (cat && main.toLowerCase() === cat.toLowerCase().replace(/s$/, '')) || /^briefing book$/i.test(main);
    if (generic) { return /^briefing book$/i.test(main) ? [sub, ''] : [sub, main]; }   // "ULI: Creative…" -> main "Creative…", aux "ULI"
    sub = sub.replace(/\s+[-–—]\s+/g, ' · ');                                           // "ULI Spring 2026 - Council" -> "ULI Spring 2026 · Council"
    return [main, sub];
  }
  // the shelf shows covers at 240px, so it uses the 520px copies in assets/covers/ (the full images stay as a fallback)
  const cover = src => src.replace(/^assets\//, 'assets/covers/');
  const fb = b => (window.__FLIPBOOKS || {})[b.href];
  // Spine of the Public Private Development books (the ULI PPP council series): "<City> PPD", short enough to fit the spine.
  const spineText = b => {
    const m = b.title.match(/^(.+?)['\u2019]s Public[- ]Private Partnerships/i);
    if ((b.cats || []).includes('Public Private Development') || m) {
      const city = m ? m[1] : ((b.title.match(/Reshaping\s+(.+)$/) || [])[1] || '');
      if (city) return city.trim() + ' PPD';
    }
    return short(b.main, 34);
  };
  const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const meaningful = b => b.desc && b.desc.length > 45 && norm(b.desc) !== norm(b.title);       // many older entries only repeat the title
  const topics = b => (b.cats || []).filter(t => !/^(research paper|case study|case studies|briefing book|event report out|white paper)$/i.test(t)).slice(0, 3);
  const books = items.map((it, i) => {
    const [color, textColor] = PALETTE[i % PALETTE.length];
    return {
      title: it.title, main: '', sub: '', href: it.href, img: it.img, meta: it.meta, desc: it.desc || '', cats: it.cats || [],
      color, textColor, spineW: SPINE[i % SPINE.length], h: HEIGHT[i % HEIGHT.length],
      rotZ: ({3: -2.5, 5: -1.5, 8: 3, 12: -5}[i]) || 0,
    };
  });

  books.forEach(b => { const cat = (b.meta.split(' · ')[1] || ''); [b.main, b.sub] = splitTitle(b.title, cat); });
  const track = root.querySelector('.bc-track');
  const progress = root.querySelector('.bc-progress-bar');
  const titleEl = root.querySelector('.bc-title');
  const metaEl = root.querySelector('.bc-meta');
  const closeBtn = root.querySelector('.bc-close');
  const live = root.querySelector('.bc-live');
  // caption block (below the books): title, date + category chip, link. Only the link is exposed to assistive tech.
  const header = root.querySelector('.bc-header');
  header.removeAttribute('aria-hidden');
  titleEl.setAttribute('aria-hidden', 'true'); metaEl.setAttribute('aria-hidden', 'true');
  const subEl = document.createElement('p'); subEl.className = 'bc-sub'; subEl.setAttribute('aria-hidden', 'true'); titleEl.after(subEl);
  const readEl = document.createElement('a');
  readEl.className = 'bc-read';
  header.appendChild(readEl);

  track.innerHTML = books.map((b, i) => {
    const sW = b.spineW;
    return `<div class="bc-wrapper" data-i="${i}"><div class="bc-ground" aria-hidden="true"></div><div class="bc-book" style="height:${b.h}px">
      <div class="bc-face bc-hinge" style="transform:translateZ(${sW / 2}px)">
        <div class="bc-face bc-front" style="width:${OPEN_W}px;background:${b.color}"><div class="bc-overlay"></div>
          ${b.img ? `<img src="${esc(cover(b.img))}" data-full="${esc(b.img)}" alt="" class="bc-cover-img" draggable="false" loading="lazy" decoding="async" onerror="if(this.dataset.full&&this.src.indexOf(this.dataset.full)<0){this.src=this.dataset.full}">` : `<div class="bc-cover-text" style="color:${b.textColor}">${esc(b.main)}</div>`}
        </div>
        <div class="bc-face bc-inside" style="width:${OPEN_W}px;background-color:color-mix(in srgb,${b.color} 14%,#fdfcff)"><div class="bc-in">
          <div class="bc-in-label">About this publication</div>
          <div class="bc-in-by">NYU Urban Lab</div>
          ${meaningful(b) ? `<p class="bc-in-desc">${esc(short(b.desc, 150))}</p>` : ''}
          ${topics(b).length ? `<div class="bc-in-tags-label">Topics</div><ul class="bc-in-tags">${topics(b).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
          <div class="bc-in-foot"><span>${esc(b.meta.split(' · ')[0] || '')}</span>${fb(b) ? `<span>${fb(b).mode === 'pages' ? fb(b).count : 2 * fb(b).count - 3} pages</span>` : ''}</div>
        </div></div>
      </div>
      <div class="bc-face bc-page" style="transform:translateZ(${sW / 2 - 1}px)"><div class="bc-page-inner${fb(b) ? ' has-flip' : ''}">
        <div class="bc-page-eyebrow">${esc(b.meta.split(' · ')[0] || 'Publication')}</div>
        <h3 class="bc-page-title">${esc(short(b.main, 80))}</h3>${b.sub ? `<p class="bc-page-sub">${esc(short(b.sub, 90))}</p>` : ''}<div class="bc-page-rule"></div>
        <div class="bc-page-actions">${fb(b) ? `<button class="bc-flip" type="button" data-flip="${esc(b.href)}" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10.3 5.3 8 5 4.5 5v13c3.5 0 5.8.3 7.5 1.5 1.7-1.2 4-1.5 7.5-1.5V5C16 5 13.7 5.3 12 6.5zM12 6.5V19.5"/></svg>Flip through the book</button>` : ''}<a class="bc-page-link" href="${esc(b.href)}" tabindex="-1">Read publication <span aria-hidden="true">↗︎</span></a></div>
      </div></div>
      <div class="bc-face bc-back" style="width:${OPEN_W}px;background:${fb(b) && !fb(b).back ? `color-mix(in srgb,${b.color} 28%,#150a20)` : b.color};transform:rotateY(180deg) translateZ(${sW / 2}px)">${fb(b) && fb(b).back ? `<img src="${esc(fb(b).back)}" alt="" class="bc-cover-img" draggable="false" loading="lazy" decoding="async">` : ''}<div class="bc-overlay"></div></div>
      <div class="bc-face bc-spine" style="width:${sW}px;left:${-sW / 2}px;background:${b.color}"><div class="bc-spine-text" style="color:${b.textColor}">${esc(spineText(b))}</div></div>
      <div class="bc-face bc-pages bc-pages-right" style="width:${sW}px;left:${OPEN_W - sW / 2}px"></div>
      <div class="bc-face bc-pages bc-pages-top" style="height:${sW}px;top:${-sW / 2}px"></div>
      <div class="bc-face bc-pages bc-pages-bottom" style="height:${sW}px;bottom:${-sW / 2}px"></div>
    </div></div>`;
  }).join('');
  const wrappers = [...track.querySelectorAll('.bc-wrapper')];

  /* ---- ambient colours taken from each cover ---- */
  function extract(img) {
    const w = 32, h = 42, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', {willReadFrequently: true}); ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data, buckets = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, sat = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
      if (d[i + 3] < 128 || l > 0.94 || l < 0.08) continue;
      const k = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5), e = buckets.get(k) || {n: 0, r: 0, g: 0, b: 0};
      const wt = 1 + sat * 3; e.n += wt; e.r += r * wt; e.g += g * wt; e.b += b * wt; buckets.set(k, e);
    }
    const list = [...buckets.values()].sort((a, b) => b.n - a.n).map(e => [e.r / e.n, e.g / e.n, e.b / e.n]);
    if (!list.length) return null;
    const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    const c1 = list[0], c2 = list.find(c => dist(c, c1) > 90) || c1.map(v => Math.min(255, v + 50));
    return c1;
  }
  books.forEach((b, i) => {
    if (!b.img) return;
    const im = new Image();
    im.onload = () => { try { const c = extract(im); if (c) spine(i, c); } catch (e) { /* tainted canvas: keep the palette colour */ } };
    // sample the colour from the same 520px copy the shelf already shows (same colours, ~3x lighter, and already in cache);
    // the full-size cover is only a fallback
    im.onerror = () => { if (im.src.indexOf('/covers/') > -1) { im.onerror = null; im.src = b.img; } };
    im.src = cover(b.img);
  });
  // the side of each book takes the dominant colour of its cover (slightly deepened, like cloth ink)
  function spine(i, [r, g, b]) {
    const k = 0.86, col = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
    const lum = (0.299 * r * k + 0.587 * g * k + 0.114 * b * k) / 255;
    const w = wrappers[i]; if (!w) return;
    w.querySelector('.bc-spine').style.background = col;
    w.querySelector('.bc-back').style.background = col;
    w.querySelector('.bc-front').style.background = col;
    w.querySelector('.bc-inside').style.backgroundColor = `color-mix(in srgb, ${col} 14%, #fdfcff)`;
    w.querySelector('.bc-spine-text').style.color = lum > 0.58 ? '#25063d' : '#ffffff';
  }

  const start = 0;
  const s = {target: start, current: start, dragging: false, moved: 0, startX: 0, scrollStart: 0, opened: -1,
             open: new Array(books.length).fill(0), raf: 0, visible: false, active: -1};
  const clamp = v => Math.max(0, Math.min(v, books.length - 1));
  const spineW = books.map(b => b.spineW), rotZs = books.map(b => b.rotZ);
  const ease = () => (reduced.matches ? 1 : s.touch ? 0.1 : 0.06);   // glide: share of the remaining distance covered per frame (a finger flick settles quicker)
  const easeOpen = () => (reduced.matches ? 1 : 0.06);

  // each book's moving parts, looked up once (frame() runs every animation frame for all books)
  const parts = wrappers.map(el => ({book: el.querySelector('.bc-book'), ground: el.querySelector('.bc-ground'),
    hinge: el.querySelector('.bc-hinge'), spine: el.querySelector('.bc-spine')}));
  function frame() {
    s.raf = 0;
    s.current += (s.target - s.current) * ease();
    if (Math.abs(s.target - s.current) < 0.0005) s.current = s.target;
    const pos = []; let left = 0;
    for (let i = 0; i < books.length; i++) {
      pos[i] = left;
      const eo = smoothstep(Math.max(0, 1 - Math.abs(i - s.current)));
      left += spineW[i] + eo * (OPEN_W - spineW[i]) + GAP;
    }
    const center = i => {
      const eo = smoothstep(Math.max(0, 1 - Math.abs(i - s.current)));
      return pos[i] + (spineW[i] + eo * (OPEN_W - spineW[i])) / 2;
    };
    const prev = Math.floor(s.current), next = prev + 1, frac = s.current - prev;
    const c1 = center(prev), c2 = next < books.length ? center(next) : c1;
    const cameraX = c1 * (1 - frac) + c2 * frac;

    const ai = Math.max(0, Math.min(books.length - 1, Math.round(s.current)));
    if (ai !== s.active) {
      s.active = ai;
      titleEl.innerHTML = `<span class="bc-title-text">${esc(books[ai].main)}</span>`;
      subEl.textContent = books[ai].sub;
      const [date, cat] = books[ai].meta.split(' · ');
      metaEl.innerHTML = (date ? `<span class="bc-date">${esc(date)}</span>` : '') + (cat ? `<span class="bc-chip">${esc(cat)}</span>` : '');
      readEl.href = books[ai].href;
      readEl.innerHTML = `Read publication <span aria-hidden="true">↗︎</span>`;
      readEl.setAttribute('aria-label', `Read publication: ${books[ai].title}`);
      readEl.tabIndex = s.opened === -1 ? 0 : -1;
      if (live) live.textContent = `${books[ai].title}, ${ai + 1} of ${books.length}`;
    }
    let settling = s.current !== s.target;
    wrappers.forEach((el, i) => {
      const diff = i - s.current, eo = smoothstep(Math.max(0, 1 - Math.abs(diff)));
      let x = pos[i] - cameraX + (1 - eo) * (spineW[i] / 2), z = eo * 60, y = 0;
      const rotateY = (1 - eo) * 90, scale = 1 + eo * (FOCUS_H / books[i].h * 1.05 - 1), rotZ = rotZs[i] * (1 - eo);
      const tgt = s.opened === i ? 1 : 0;
      s.open[i] += (tgt - s.open[i]) * easeOpen();
      if (Math.abs(tgt - s.open[i]) < 0.002) s.open[i] = tgt; else settling = true;
      const o = s.open[i], riseP = Math.min(1, o * 2), swingP = Math.max(0, (o - 0.5) * 2);
      const eR = smoothstep(riseP), eS = smoothstep(swingP);
      x += eS * (OPEN_W / 2); z += eR * 150; y -= eR * root.clientHeight * 0.2;   // lifts up, over the section heading (the frame no longer clips it)
      el.style.zIndex = String(Math.round(100 - Math.abs(diff) * 10));
      el.style.transform = `translateX(${x}px) translateY(${y}px) translateZ(${z}px) scale(${scale}) rotateZ(${rotZ}deg)`;
      parts[i].book.style.transform = `rotateY(${rotateY}deg)`;
      // contact shadow: sits under the book's real footprint at this angle (cover edge-on = the spine's width), and fades as the book turns to show its spine
      const th = rotateY * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th), fw = OPEN_W * cs + spineW[i] * sn, gr = parts[i].ground;
      const swing = eS * OPEN_ANGLE * Math.PI / 180, ex = Math.max(0, -OPEN_W * Math.cos(swing)),   // the cover only reaches past the hinge once it has turned beyond 90°
            sh = smoothstep(Math.min(1, Math.max(0, (eS - 0.35) / 0.65))),   // shadows of the open pages: they start once the first page is actually uncovered
            span = fw + ex;                     // an open book also covers the page the cover swung over to the left
      // Only the focused book has a ground shadow; books on the shelf (spine facing us) have none. It fades out as a book turns away.
      const front = cs * cs, wf = 1.14 + 0.5 * (1 - front);
      gr.style.left = (-ex - span * (wf - 1) / 2 - spineW[i] * sn / 2).toFixed(1) + 'px'; gr.style.width = (span * wf).toFixed(1) + 'px';   // a book turned spine-on is centred on the hinge, not hanging to its right
      gr.style.height = (22 + 8 * front + 26 * eR).toFixed(1) + 'px'; gr.style.opacity = (front * front * (1 - sh)).toFixed(3);   // pages' own shadow takes over once open
      el.style.setProperty('--op', sh.toFixed(3));
      parts[i].hinge.style.transform = `translateZ(${spineW[i] / 2}px) rotateY(${eS * -OPEN_ANGLE}deg)`;
      parts[i].spine.style.filter = `brightness(${0.6 + eo * 0.4})`;
      el.classList.toggle('is-open', s.opened === i && o > 0.6);
      el.classList.toggle('is-active', i === ai);
    });
    progress.style.width = `${(s.current / (books.length - 1)) * 100}%`;
    if (settling && s.visible) kick();
  }
  function kick() { if (!s.raf) s.raf = requestAnimationFrame(frame); }

  /* ---- input ---- */
  const go = v => { if (s.opened === -1) { s.target = clamp(v); kick(); } };
  root.addEventListener('pointerdown', e => {
    if (e.target.closest('.bc-close,.bc-nav,.bc-page-link,.bc-flip')) return;
    if (s.opened !== -1) return;
    s.dragging = true; s.moved = 0; s.startX = e.clientX; s.scrollStart = s.target;
    s.touch = e.pointerType !== 'mouse'; s.trail = [[e.clientX, e.timeStamp]];
  });
  window.addEventListener('pointermove', e => {
    if (!s.dragging) return;
    s.moved = Math.max(s.moved, Math.abs(e.clientX - s.startX));
    s.trail.push([e.clientX, e.timeStamp]); if (s.trail.length > 6) s.trail.shift();
    if (s.moved > 6) { s.target = clamp(s.scrollStart + (e.clientX - s.startX) * -(s.touch ? DRAG_TOUCH : DRAG)); root.classList.add('is-dragging'); kick(); }
  });
  const endDrag = e => {
    if (!s.dragging) return;
    s.dragging = false; root.classList.remove('is-dragging');
    // finger: keep going with the speed of the flick, then land on a whole book (the mouse keeps its free, unsnapped drag)
    if (s.touch && s.moved > 6 && e.type === 'pointerup') {
      const [x0, t0] = s.trail[0], [x1, t1] = s.trail[s.trail.length - 1];
      const v = t1 > t0 ? (x1 - x0) / (t1 - t0) : 0;                       // px per ms, over the last few moves
      s.target = clamp(Math.round(s.target - v * FLICK_MS * DRAG_TOUCH)); kick();
    } else if (s.touch && e.type === 'pointercancel') { s.target = clamp(Math.round(s.target)); kick(); }
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  // Speeds, in books per pixel. A trackpad swipe sends dozens of wheel events, so the wheel moves in proportion to how far
  // the fingers travel (capped per event), not a fixed step per event, which used to fling past several books at once.
  const DRAG = 0.006, WHEEL = 0.0035, WHEEL_MAX = 0.12;
  // touch: ~100px of finger per book, and a flick carries on as if the finger kept moving for FLICK_MS
  const DRAG_TOUCH = 0.01, FLICK_MS = 140;
  root.addEventListener('wheel', e => {
    if (s.opened !== -1 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   // vertical wheel keeps scrolling the page
    e.preventDefault(); s.touch = false;
    const px = e.deltaX * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);   // lines / pages -> pixels
    s.target = clamp(s.target + Math.max(-WHEEL_MAX, Math.min(WHEEL_MAX, px * WHEEL))); kick();
  }, {passive: false});
  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.round(s.target) + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.round(s.target) - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(books.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') {
      if (e.target.closest('.bc-nav,.bc-close,a')) return;
      e.preventDefault();
      if (s.opened !== -1) location.href = books[s.opened].href; else toggle(Math.round(s.target));
    } else if (e.key === 'Escape' && s.opened !== -1) { e.stopPropagation(); close(); }
  });
  function toggle(i) {
    if (Math.round(s.current) === i) {
      s.opened = s.opened === i ? -1 : i;
      root.classList.toggle('is-reading', s.opened !== -1);
      closeBtn.tabIndex = s.opened !== -1 ? 0 : -1;
      kick();
    } else go(i);
  }
  function close() { s.opened = -1; root.classList.remove('is-reading'); closeBtn.tabIndex = -1; kick(); root.focus({preventScroll: true}); }
  track.addEventListener('click', e => {
    if (s.moved > 6) { s.moved = 0; return; }
    if (e.target.closest('.bc-page-link,.bc-flip')) return;
    const w = e.target.closest('.bc-wrapper'); if (w) toggle(Number(w.dataset.i));
  });
  closeBtn.addEventListener('click', close);
  // click anywhere outside the open book (empty shelf, page background, a neighbouring book) closes it
  document.addEventListener('click', e => {
    if (s.opened === -1) return;
    if (e.target.closest('.bc-close,.bc-nav,a,button,.fb')) return;
    const w = e.target.closest('.bc-wrapper');
    if (w && Number(w.dataset.i) === s.opened) return;
    close();
  });
  root.querySelector('.bc-prev').addEventListener('click', () => go(Math.round(s.target) - 1));
  root.querySelector('.bc-next').addEventListener('click', () => go(Math.round(s.target) + 1));

  new IntersectionObserver(en => { s.visible = en[0].isIntersecting; if (s.visible) kick(); }, {threshold: 0.05}).observe(root);
  reduced.addEventListener('change', kick);
  root.classList.add('is-ready');
  s.visible = true; frame();
})();
