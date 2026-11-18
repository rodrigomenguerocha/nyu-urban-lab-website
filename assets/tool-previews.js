/* Live previews for the two Housing Tools cards.
   - US Worst Case Housing Explorer: lines draw in, then a scrubber moves across the series (follows the mouse on hover).
   - US Rent Ceiling: the map picture becomes a field of dots with a slow wave; the cursor lifts the dots near it.
   Falls back to the original still image if anything is unavailable. Respects reduced motion (draws one still frame). */
(() => {
  'use strict';
  const arts = [...document.querySelectorAll('.tool-art')];
  if (!arts.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const cosInterp = (a, b, f) => a + (b - a) * (1 - Math.cos(f * Math.PI)) / 2;
  const previews = [];

  /* ---------- shared plumbing ---------- */
  function mount(art, kind) {
    const cv = document.createElement('canvas');
    cv.className = 'tp-canvas'; cv.setAttribute('aria-hidden', 'true');
    art.appendChild(cv);
    const p = {art, cv, ctx: cv.getContext('2d'), kind, w: 0, h: 0, visible: false, t0: 0, hover: false,
               mx: 0, my: 0, hv: 0, scrub: 0.5, ready: false};
    const size = () => {
      const r = art.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      if (!r.width || !r.height) return;
      p.w = r.width; p.h = r.height;
      cv.width = Math.round(p.w * dpr); cv.height = Math.round(p.h * dpr);
      p.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (p.onSize) p.onSize();
      if (!p.visible || reduced) drawOnce(p);
    };
    new ResizeObserver(size).observe(art);
    art.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') p.hover = true; });
    art.addEventListener('pointermove', e => { const r = art.getBoundingClientRect(); p.mx = e.clientX - r.left; p.my = e.clientY - r.top; });
    art.addEventListener('pointerleave', () => { p.hover = false; });
    new IntersectionObserver(es => {
      p.visible = es[0].isIntersecting;
      if (p.visible && !p.t0) p.t0 = performance.now();
      if (p.visible) kick();
    }, {threshold: 0.25}).observe(art);
    size();
    previews.push(p);
    return p;
  }
  function ready(p) { p.ready = true; p.art.classList.add('tp-ready'); }
  function drawOnce(p) { if (p.ready) p.draw(p, performance.now(), reduced ? 99999 : 0, 0); }

  let raf = 0, last = 0;
  function kick() { if (!raf && !reduced) raf = requestAnimationFrame(loop); }
  function loop(now) {
    raf = 0;
    const dt = Math.min(64, now - (last || now)); last = now;
    let any = false;
    for (const p of previews) {
      if (!p.visible || !p.ready) continue;
      any = true;
      p.hv += ((p.hover ? 1 : 0) - p.hv) * (1 - Math.exp(-dt / 180));
      p.draw(p, now, now - p.t0, dt);
    }
    if (any && !document.hidden) raf = requestAnimationFrame(loop); else last = 0;
  }
  document.addEventListener('visibilitychange', kick);

  /* ---------- 1. Worst Case explorer: lines + scrubber ---------- */
  const SERIES = [
    {c: '#cbb2ea', w: 1.6, v: [.46, .43, .5, .7, .9, .86, .8, .75, .66, .7, .62, .68]},
    {c: '#9774c3', w: 1.9, v: [.32, .29, .4, .58, .76, .72, .67, .6, .53, .56, .5, .56]},
    {c: '#7a46b0', w: 2.1, v: [.23, .21, .33, .5, .66, .63, .57, .5, .45, .47, .41, .46]},
    {c: '#582483', w: 2.4, v: [.14, .12, .21, .37, .5, .47, .42, .38, .34, .36, .31, .35]},
  ];
  const yAt = (s, u) => { const n = s.v.length - 1, x = clamp(u) * n, i = Math.min(n - 1, Math.floor(x)); return cosInterp(s.v[i], s.v[i + 1], x - i); };
  function drawChart(p, now, t) {
    const {ctx, w, h} = p, padX = 34, top = 38, bot = 40, pw = w - padX * 2, ph = h - top - bot;
    ctx.clearRect(0, 0, w, h);
    // grid
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(88,36,131,.13)';
    for (let i = 0; i <= 4; i++) { const y = top + ph * i / 4; ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(w - padX, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(88,36,131,.35)';
    for (let i = 0; i < 12; i++) { const x = padX + pw * i / 11; ctx.fillRect(x - .5, h - bot + 8, 1, 4); }
    // lines draw in, left to right
    const reveal = easeOut(clamp(t / 1700));
    for (const s of SERIES) {
      ctx.beginPath(); ctx.lineWidth = s.w; ctx.strokeStyle = s.c; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const steps = 120;
      for (let i = 0; i <= steps * reveal; i++) { const u = i / steps, x = padX + pw * u, y = top + ph * (1 - yAt(s, u)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    // scrubber: drifts on its own, follows the cursor on hover
    const auto = .5 + .4 * Math.sin(now * .00035 + 1.1), target = p.hover ? clamp((p.mx - padX) / pw) : auto;
    p.scrub += (target - p.scrub) * (p.hover ? .18 : .05);
    const su = reduced ? .55 : p.scrub, sx = padX + pw * su, a = clamp((reveal - .85) / .15);
    if (a > 0) {
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, top - 10, 0, top + ph + 10); g.addColorStop(0, 'rgba(88,36,131,.0)'); g.addColorStop(.5, 'rgba(88,36,131,.16)'); g.addColorStop(1, 'rgba(88,36,131,.04)');
      ctx.fillStyle = g; ctx.fillRect(sx - 13, top - 10, 26, ph + 20);
      ctx.fillStyle = 'rgba(88,36,131,.5)'; ctx.fillRect(sx - .5, top - 10, 1, ph + 20);
      for (const s of SERIES) {
        const y = top + ph * (1 - yAt(s, su));
        ctx.beginPath(); ctx.arc(sx, y, 4.2, 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = s.c; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- 2. Rent ceiling: the map as a living field of dots ---------- */
  function buildDots(p, img) {
    const {w, h} = p, box = {x: 35, y: 30, w: w - 70, h: h - 60}, sc = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
    const iw = Math.round(img.naturalWidth * sc), ih = Math.round(img.naturalHeight * sc), ox = Math.round(box.x + (box.w - iw) / 2), oy = Math.round(box.y + (box.h - ih) / 2);
    const off = document.createElement('canvas'); off.width = iw; off.height = ih;
    const c = off.getContext('2d', {willReadFrequently: true}); c.drawImage(img, 0, 0, iw, ih);
    const d = c.getImageData(0, 0, iw, ih).data, bg = [d[0], d[1], d[2]], g = Math.max(3.6, Math.round(w / 105 * 10) / 10), dots = [];
    for (let y = g / 2; y < ih; y += g) for (let x = g / 2; x < iw; x += g) {
      const k = ((y | 0) * iw + (x | 0)) * 4;
      if (d[k + 3] < 160 || Math.hypot(d[k] - bg[0], d[k + 1] - bg[1], d[k + 2] - bg[2]) < 26) continue;
      dots.push({x: ox + x, y: oy + y, col: `rgb(${d[k]},${d[k + 1]},${d[k + 2]})`});
    }
    p.dots = dots; p.g = g; p.mapBox = {x: ox, w: iw};
  }
  function drawMap(p, now, t) {
    const {ctx, w, h, dots, g} = p; ctx.clearRect(0, 0, w, h); if (!dots) return;
    const reveal = clamp(t / 1900), span = p.mapBox.w, x0 = p.mapBox.x, R = Math.max(50, w * .16);
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i], appear = clamp(((reveal * 1.35) * span - (d.x - x0)) / (span * .3));
      if (appear <= 0) continue;
      const wave = .5 + .5 * Math.sin((d.x * .02 + d.y * .011) - now * .0012);
      let r = g * (.30 + .12 * wave) * easeOut(appear);
      if (p.hv > .01) { const dist = Math.hypot(d.x - p.mx, d.y - p.my), f = Math.max(0, 1 - dist / R); r += g * .55 * f * f * p.hv; }
      ctx.fillStyle = d.col; ctx.globalAlpha = (.72 + .28 * wave) * appear;
      ctx.fillRect(d.x - r, d.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- wire up ---------- */
  arts.forEach(art => {
    const href = art.getAttribute('href') || '', img = art.querySelector('img');
    if (href.includes('tool-worst-case')) {
      const p = mount(art, 'chart'); p.draw = drawChart; ready(p); drawOnce(p);
    } else if (href.includes('tool-rent-ceiling') && img) {
      const start = () => {
        const p = mount(art, 'map'); p.draw = drawMap;
        try { buildDots(p, img); p.onSize = () => { try { buildDots(p, img); } catch (e) {} }; ready(p); drawOnce(p); }
        catch (e) { p.cv.remove(); previews.pop(); /* tainted canvas (file://): keep the still image */ }
      };
      img.loading = 'eager';
      if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start, {once: true});
    }
  });

  /* ---------- floating tilt on the tool cards (mouse only) ---------- */
  if (!reduced) document.querySelectorAll('.ul-tool').forEach(card => {
    card.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--ry', ((px - .5) * 9).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((.5 - py) * 7).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      card.classList.add('is-tilting');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      ['--rx', '--ry', '--mx', '--my'].forEach(k => card.style.removeProperty(k));
    });
  });

  /* ---------- the same tilt from the phone's motion (assets/motion.js); only cards on screen are touched ---------- */
  const cards = [...document.querySelectorAll('.ul-tool')];
  if (!reduced && cards.length && window.ULTilt) {
    const onScreen = new Set();
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
    cards.forEach(c => io.observe(c));
    ULTilt.on((x, y) => onScreen.forEach(card => {
      card.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (y * 7).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (50 + x * 50).toFixed(1) + '%');
      card.style.setProperty('--my', (50 - y * 50).toFixed(1) + '%');
      card.classList.add('is-tilting');
    }));
  }
})();
