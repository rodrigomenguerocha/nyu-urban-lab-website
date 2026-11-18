// Slim responsive navigation: hover-intent on desktop, accordion on mobile. Works with keyboard (Esc, Tab).
(() => {
 const header = document.querySelector('#urbanlab-home .ul-header.nb');
 if (!header) return;
 const nav = header.querySelector('.nb-nav');
 const toggle = header.querySelector('.nb-toggle');
 const triggers = [...header.querySelectorAll('.nb-trigger')];
 const mobile = matchMedia('(max-width: 960px)');
 let timer;

 const panelOf = t => document.getElementById(t.getAttribute('aria-controls'));
 function show(active) {
  clearTimeout(timer);
  triggers.forEach(t => {
   const on = t === active;
   t.setAttribute('aria-expanded', String(on));
   panelOf(t).classList.toggle('is-open', on);
  });
 }
 const closeAll = () => show(null);
 function setMenu(open) {
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  if (!open) closeAll();
 }

 triggers.forEach(t => {
  t.addEventListener('click', () => show(t.getAttribute('aria-expanded') === 'true' ? null : t));
  t.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !mobile.matches) show(t); });
 });
 header.querySelectorAll('.nb-item').forEach(item => {
  item.addEventListener('pointerleave', e => {
   if (e.pointerType === 'mouse' && !mobile.matches) timer = setTimeout(closeAll, 180);
  });
  item.addEventListener('pointerenter', () => clearTimeout(timer));
 });
 header.addEventListener('focusout', e => {
  if (!mobile.matches && e.relatedTarget && !header.contains(e.relatedTarget)) closeAll();
 });
 toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
 header.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
 document.addEventListener('click', e => { if (!header.contains(e.target)) setMenu(false); });
 document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const open = triggers.find(t => t.getAttribute('aria-expanded') === 'true');
  setMenu(false);
  if (open && !mobile.matches) open.focus();
  else if (nav.classList.contains('is-open') === false && mobile.matches) toggle.focus({preventScroll: true});
 });
 mobile.addEventListener('change', () => setMenu(false));
})();
