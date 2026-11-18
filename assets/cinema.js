/* v2: autoplaying cinematic photography WITH visitor controls (a clickable progress bar of dots; arrow keys also work). */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.cinema').forEach(section => {
    const slides = [...section.querySelectorAll('.cinema-slide')];
    if (!slides.length) return;
    const rail = section.querySelector('.cinema-slides');
    const strip = section.classList.contains('cinema-strip');
    const caption = section.querySelector('.cinema-caption');
    const counter = section.querySelector('.cinema-counter');
    let index = 0, visible = false, raf = 0, last = 0, elapsed = 0, paused = false;
    const DUR = 6900;   // time each photo stays, in ms
    const mustRest = () => reduced.matches || !visible || document.hidden || paused;   // the mouse over the hero does not pause it

    /* ---- controls ---- */
    const ui = document.createElement('div');
    ui.className = 'cinema-ui';
    ui.innerHTML = '<div class="cinema-dots" role="group" aria-label="Choose photo">' + slides.map((_, i) => `<button type="button" aria-label="Photo ${i + 1} of ${slides.length}"></button>`).join('') + '</div>';
    const bar = ui.querySelector('.cinema-dots'), controls = section.querySelector('.cinema-controls');
    if (bar && controls) { bar.classList.add('cinema-bar'); controls.prepend(bar); }
    const dots = [...(bar ? bar.querySelectorAll('button') : [])];
    dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
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
    section.classList.add('is-ready');
    show(0);
  });
})();
