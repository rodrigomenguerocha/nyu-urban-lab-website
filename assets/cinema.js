/* v2: autoplaying cinematic photography WITH visitor controls (a clickable progress bar of dots; arrow keys also work). */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.cinema').forEach(section => {
    const all = [...section.querySelectorAll('.cinema-slide')];
    if (!all.length) return;
    // slides marked data-only="desktop" / "mobile" belong to one screen size; the count, the bar and the loop only see the ones in use
    const phone = window.matchMedia('(max-width:760px)');
    const wanted = s => !s.dataset.only || (s.dataset.only === 'mobile') === phone.matches;
    let slides = all.filter(wanted);
    const rail = section.querySelector('.cinema-slides');
    const strip = section.classList.contains('cinema-strip');
    const caption = section.querySelector('.cinema-caption');
    const counter = section.querySelector('.cinema-counter');
    let index = 0, visible = false, raf = 0, last = 0, elapsed = 0, paused = false;
    const DUR = 6900;   // time each photo stays, in ms
    const mustRest = () => reduced.matches || !visible || document.hidden || paused;   // the mouse over the hero does not pause it

    /* ---- controls ---- */
    const controls = section.querySelector('.cinema-controls');
    let bar = null, dots = [];
    function buildDots() {
      if (bar) bar.remove();
      bar = document.createElement('div'); bar.className = 'cinema-dots cinema-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Choose photo');
      bar.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Photo ${i + 1} of ${slides.length}"></button>`).join('');
      if (controls) controls.prepend(bar);
      dots = [...bar.querySelectorAll('button')];
      dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
    }
    buildDots();
    section.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    const setProgress = () => section.style.setProperty('--cp', String(Math.min(1, elapsed / DUR)));
    function loop(now) {
      raf = 0;
      if (mustRest() || slides.length < 2) { last = 0; return; }
      const dt = last ? Math.min(100, now - last) : 0; last = now; elapsed += dt;
      if (elapsed >= DUR) { show((index + 1) % slides.length); return; }
      setProgress(); raf = requestAnimationFrame(loop);
    }
    // progress is driven by real elapsed time, so the bar pauses exactly when the slideshow pauses
    function schedule() {
      cancelAnimationFrame(raf); raf = 0; last = 0;
      section.dataset.rest = String(mustRest());
      if (!mustRest() && slides.length > 1) raf = requestAnimationFrame(loop);
    }
    function show(next) {
      index = (next + slides.length) % slides.length;
      section.dataset.active = String(index);
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
        slide.setAttribute('aria-hidden', String(i !== index));
      });
      elapsed = 0; setProgress();
      dots.forEach((d, i) => { d.setAttribute('aria-current', String(i === index)); d.classList.toggle('is-done', i < index); });
      if (caption) caption.textContent = slides[index].dataset.caption || '';
      if (counter) counter.textContent = `${String(index + 1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
      if (strip && rail) {
        const slide = slides[index];
        const left = slide.offsetLeft - (rail.clientWidth - slide.clientWidth) / 2;
        rail.scrollTo({ left, behavior: reduced.matches ? 'instant' : 'smooth' });
      }
      schedule();
    }
    const observer = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false;
      section.dataset.visible = String(visible);
      schedule();
    }, {threshold: .14});
    observer.observe(section);
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', schedule);
    phone.addEventListener('change', () => { slides = all.filter(wanted); all.forEach(s => s.classList.remove('is-active')); buildDots(); show(0); });
    section.classList.add('is-ready');
    show(0);
  });
})();
