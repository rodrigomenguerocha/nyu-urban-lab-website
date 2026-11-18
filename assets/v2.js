/* v2 behaviours: transparent header over the home hero, current-section marker, site search ("/" or the magnifier). */
(() => {
  'use strict';
  const root = document.getElementById('urbanlab-home');
  const header = root && root.querySelector('.ul-header.nb');
  if (!root || !header) return;

  /* 1. header is transparent only while the home hero is at the top */
  if (root.querySelector('.cinema-opening')) {
    const update = () => header.classList.toggle('nb-top', window.scrollY < 40);
    update();
    window.addEventListener('scroll', update, {passive: true});
  }

  /* 2. mark the menu group that contains the current page */
  root.querySelectorAll('.nb-panel').forEach(panel => {
    if (!panel.querySelector('a[aria-current="page"]')) return;
    const trigger = header.querySelector(`[aria-controls="${panel.id}"]`);
    if (trigger) trigger.setAttribute('data-current', '');
  });

  /* 3. search */
  let box, input, list, data = null, items = [], sel = -1, lastFocus = null, loading = false;
  const esc = s => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  function build() {
    box = document.createElement('div');
    box.className = 'sx';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Search the site');
    box.innerHTML =
      '<div class="sx-box"><div class="sx-input">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="search" placeholder="Search publications, events, people…" aria-label="Search" autocomplete="off"><kbd>Esc</kbd></div>' +
      '<ul class="sx-list" role="listbox"></ul></div>';
    root.appendChild(box);
    input = box.querySelector('input');
    list = box.querySelector('.sx-list');
    box.addEventListener('click', e => { if (e.target === box) close(); });
    input.addEventListener('input', render);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && items[sel]) { location.href = items[sel][1]; }
    });
  }
  function load(cb) {
    if (data) return cb();
    if (loading) return;
    loading = true;
    const s = document.createElement('script');
    s.src = 'assets/search-index.js?v=fb68b274';
    s.onload = () => { data = window.__SEARCH_INDEX || []; cb(); };
    s.onerror = () => { loading = false; list.innerHTML = '<li class="sx-empty">Search is unavailable right now.</li>'; };
    document.head.appendChild(s);
  }
  function move(d) {
    if (!items.length) return;
    sel = (sel + d + items.length) % items.length;
    [...list.querySelectorAll('a')].forEach((a, i) => {
      a.setAttribute('aria-selected', String(i === sel));
      if (i === sel) a.scrollIntoView({block: 'nearest'});
    });
  }
  function render() {
    const q = input.value.trim().toLowerCase();
    if (!data) return;
    if (!q) { items = []; sel = -1; list.innerHTML = '<li class="sx-empty">Type to search the whole site.</li>'; return; }
    const tokens = q.split(/\s+/);
    items = data.map(r => {
      const t = r[0].toLowerCase(), d = (r[2] || '').toLowerCase();
      let score = 0;
      for (const k of tokens) {
        const inT = t.includes(k), inD = d.includes(k);
        if (!inT && !inD) return null;
        score += (inT ? 10 : 0) + (t.startsWith(k) ? 4 : 0) + (inD ? 1 : 0);
      }
      return [score, r];
    }).filter(Boolean).sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
    sel = items.length ? 0 : -1;
    list.innerHTML = items.length
      ? items.map((r, i) => `<li><a href="${esc(r[1])}" role="option" aria-selected="${i === 0}"><strong>${esc(r[0])}</strong>${r[2] ? `<span>${esc(r[2])}</span>` : ''}</a></li>`).join('')
      : '<li class="sx-empty">No results. Try a different word.</li>';
  }
  function open() {
    if (!box) build();
    lastFocus = document.activeElement;
    box.classList.add('is-open');
    input.value = '';
    list.innerHTML = '<li class="sx-empty">Loading…</li>';
    load(render);
    setTimeout(() => input.focus(), 0);
  }
  function close() {
    if (!box) return;
    box.classList.remove('is-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll: true});
  }
  header.querySelectorAll('.nb-search').forEach(b => b.addEventListener('click', open));
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && box && box.classList.contains('is-open')) { e.stopPropagation(); close(); }
  }, true);
})();

/* Facts strip: numbers count up the first time the strip scrolls into view. */
(() => {
  'use strict';
  const strip = document.querySelector('.v2-stats');
  const nums = [...document.querySelectorAll('.v2-stat strong')];
  if (!strip || !nums.length) return;
  // Reduced-motion visitors get the same count, only much faster (it is a small change, not a large movement).
  const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 1600;
  const items = nums.map(el => {
    const m = el.textContent.trim().match(/^([^\d]*)([\d.,]+)(.*)$/);
    if (!m) return null;
    const raw = m[2].replace(/,/g, '');
    return {el, pre: m[1], suf: m[3], value: parseFloat(raw), dec: (raw.split('.')[1] || '').length, final: el.textContent.trim()};
  }).filter(Boolean);
  if (!items.length) return;
  const fmt = (it, v) => it.pre + v.toLocaleString('en-US', {minimumFractionDigits: it.dec, maximumFractionDigits: it.dec}) + it.suf;
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  let started = false;
  function play() {
    if (started) return; started = true;
    items.forEach(it => { it.el.setAttribute('aria-label', it.final); });
    const t0 = performance.now();
    (function tick(now) {
      const t = Math.min(1, (now - t0) / dur);
      items.forEach(it => { it.el.textContent = t < 1 ? fmt(it, it.value * easeOut(t)) : it.final; });
      if (t < 1) requestAnimationFrame(tick);
    })(t0);
  }
  // start from zero, so the first frame already shows the count beginning
  items.forEach(it => { it.el.textContent = fmt(it, 0); });
  const inView = () => { const r = strip.getBoundingClientRect(); return r.top < innerHeight * 0.85 && r.bottom > 0; };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); play(); } }, {threshold: 0.3});
    io.observe(strip);
  } else {
    const onScroll = () => { if (inView()) { removeEventListener('scroll', onScroll); play(); } };
    addEventListener('scroll', onScroll, {passive: true}); onScroll();
  }
  // safety net: never leave the numbers at zero if the observer is delayed
  setTimeout(() => { if (!started && inView()) play(); }, 1200);
})();

/* Partners strip: on phones the logos run as one endless line (CSS does the motion; here only the loop copy). */
(() => {
  const list = document.querySelector('.v2p-list');
  if (!list || list.dataset.loop) return;
  list.dataset.loop = '1';
  const view = document.createElement('div');
  view.className = 'v2p-viewport';
  list.parentNode.insertBefore(view, list);
  view.appendChild(list);
  [...list.children].forEach(li => {
    const c = li.cloneNode(true);
    c.classList.add('v2p-clone'); c.setAttribute('aria-hidden', 'true');
    c.querySelector('img')?.setAttribute('alt', '');
    c.querySelector('img')?.setAttribute('loading', 'eager');
    list.appendChild(c);
  });
})();

/* Get involved: staggered reveal when the section scrolls into view */
(() => {
  const s = document.querySelector('.v2i');
  if (!s || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  s.classList.add('v2i-js');
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { s.classList.add('is-in'); io.disconnect(); } }, {threshold: .18});
  io.observe(s);
  setTimeout(() => s.classList.add('is-in'), 4000);   // safety net
})();

/* TEMPORARY diagnostics for the iPhone toolbar issue: add ?fx=0, ?pin=0, ?filter=0 or ?canvas=0 to the URL (combine with &) to switch one thing off */
(() => {
  const q = new URLSearchParams(location.search);
  ['fx', 'pin', 'filter', 'canvas'].forEach(k => { if (q.get(k) === '0') document.documentElement.classList.add('dbg-no-' + k); });
})();
