/* Team page: each cohort is an accordion row (native <details>), animated open and closed. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('details.team-acc').forEach(d => {
    const sum = d.querySelector('summary'), body = d.querySelector('.acc-body');
    if (!sum || !body) return;
    let anim = null;
    const finish = open => { d.classList.remove('is-animating'); body.style.height = ''; body.style.overflow = ''; if (!open) d.removeAttribute('open'); anim = null; };
    sum.addEventListener('click', e => {
      e.preventDefault();
      const opening = !d.open;
      if (reduced.matches) { d.open = opening; return; }
      if (anim) anim.cancel();
      d.classList.add('is-animating');
      if (opening) d.open = true;
      const from = opening ? 0 : body.offsetHeight, to = opening ? body.scrollHeight : 0;
      body.style.overflow = 'hidden';
      anim = body.animate({height: [from + 'px', to + 'px']}, {duration: 420, easing: 'cubic-bezier(.22,1,.36,1)'});
      anim.onfinish = () => finish(opening);
      anim.oncancel = () => { body.style.height = ''; body.style.overflow = ''; };
      d.classList.toggle('is-open', opening);
    });
    d.classList.toggle('is-open', d.open);
  });
})();
