(() => {
  const root = document.getElementById('urbanlab-home');
  if (!root) return;
  const header = root.querySelector('.ul-header');
  const buttons = [...header.querySelectorAll('.ul-nav button')];
  const panels = [...header.querySelectorAll('.ul-mega')];
  let closeTimer;
  let hoverOpened = null;
  function showMenu(id, fromHover = false) {
    hoverOpened = fromHover ? id : null;
    clearTimeout(closeTimer);
    panels.forEach(panel => { panel.hidden = panel.id !== id; });
    buttons.forEach(button => button.setAttribute('aria-expanded', String(button.getAttribute('aria-controls') === id)));
  }
  buttons.forEach(button => {
    button.addEventListener('click', event => {
      const id = button.getAttribute('aria-controls');
      if (event.detail > 0 && hoverOpened === id) showMenu(id);
      else showMenu(button.getAttribute('aria-expanded') === 'true' ? null : id);
    });
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') showMenu(button.getAttribute('aria-controls'), true);
    });
  });
  header.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  header.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') closeTimer = setTimeout(() => showMenu(null), 250);
  });
  header.addEventListener('focusout', event => { if (!header.contains(event.relatedTarget)) showMenu(null); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const active = buttons.find(button => button.getAttribute('aria-expanded') === 'true');
    showMenu(null);
    if (active) active.focus();
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target) || event.target.closest('a')) showMenu(null);
  });
  root.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      const note = document.createElement('span');
      note.className = 'unavailable-image';
      note.textContent = img.alt || 'Image unavailable';
      img.replaceWith(note);
    }, {once:true});
  });
  root.querySelectorAll('[data-archive]').forEach(archive => {
    const cards = [...archive.querySelectorAll('[data-record]')];
    const search = archive.querySelector('[data-search]');
    const category = archive.querySelector('[data-category]');
    const year = archive.querySelector('[data-year]');
    const results = archive.querySelector('[data-results]');
    const status = archive.querySelector('[data-page-status]');
    const previous = archive.querySelector('[data-previous]');
    const next = archive.querySelector('[data-next]');
    const perPage = Number(archive.dataset.perPage || 18);
    const params = new URLSearchParams(location.search);
    let page = 1;
    if (params.has('q')) search.value = params.get('q');
    if (category && params.has('topic')) {
      const topic = params.get('topic');
      if ([...category.options].some(option => option.value === topic)) category.value = topic;
      else search.value = topic;
    }
    function update() {
      const query = search.value.trim().toLocaleLowerCase();
      const selectedCategory = category ? category.value : '';
      const selectedYear = year ? year.value : '';
      const matches = cards.filter(card => {
        const categories = JSON.parse(card.dataset.categories || '[]');
        return (!query || card.dataset.search.includes(query)) &&
          (!selectedCategory || categories.includes(selectedCategory)) &&
          (!selectedYear || card.dataset.year === selectedYear);
      });
      const pages = Math.max(1, Math.ceil(matches.length / perPage));
      page = Math.min(page, pages);
      cards.forEach(card => { card.hidden = true; });
      matches.slice((page - 1) * perPage, page * perPage).forEach(card => { card.hidden = false; });
      results.textContent = matches.length === 0 ? 'No results match your selection.' : `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`;
      status.textContent = `Page ${page} of ${pages}`;
      previous.disabled = page === 1;
      next.disabled = page >= pages;
    }
    [search, category, year].filter(Boolean).forEach(control => {
      control.addEventListener(control === search ? 'input' : 'change', () => { page = 1; update(); });
    });
    previous.addEventListener('click', () => { page -= 1; update(); archive.scrollIntoView({block:'start'}); });
    next.addEventListener('click', () => { page += 1; update(); archive.scrollIntoView({block:'start'}); });
    update();
  });
  const contact = root.querySelector('.contact-form');
  const fullTool = root.querySelector('iframe[data-full-tool]');
  if (fullTool) {
    const expectedOrigin = new URL(fullTool.src).origin;
    let lastWidth = 0, resizeTimer;
    // Rent Ceiling has no height-message API yet. These bounds include its
    // loaded results, 40-row table, comparison, and expanded detail sections.
    const rentBounds = [[260,8300],[300,7700],[340,7400],[400,7050],[500,6850],[600,6750],[700,6600],[800,5350],[900,5250],[1000,5100],[1100,4600],[1200,4600],[1320,4550]];
    const fit = () => {
      const width = Math.floor(fullTool.getBoundingClientRect().width);
      if (Math.abs(width-lastWidth)<2) return;
      lastWidth=width;
      if(fullTool.dataset.fullTool==='worst-case') {
        // Let the child finish its width change before requesting a smaller
        // viewport; otherwise a message from the previous layout can win.
        clearTimeout(resizeTimer);
        resizeTimer=setTimeout(()=>{fullTool.style.height='100px';},120);
      }
      else {
        const bound=[...rentBounds].reverse().find(row=>width>=row[0]) || rentBounds[0];
        fullTool.style.height=bound[1]+'px';
      }
    };
    window.addEventListener('message', event => {
      if(event.source!==fullTool.contentWindow || event.origin!==expectedOrigin) return;
      const allowedType=fullTool.dataset.fullTool==='worst-case'?'quiescet-wchn-height':'quiescet-rent-height';
      if(event.data?.type!==allowedType) return;
      const height=Number(event.data.height);
      if(!Number.isFinite(height)||height<100||height>30000) return;
      const next=Math.ceil(height);
      if(Math.abs(parseFloat(fullTool.style.height||'0')-next)>1)fullTool.style.height=next+'px';
    });
    new ResizeObserver(fit).observe(fullTool.parentElement);
    fit();
  }
  if (contact) contact.addEventListener('submit', event => {
    event.preventDefault();
    contact.querySelector('[role="status"]').textContent = 'Your message passes the preview checks. Nothing has been sent. The website administrator will connect delivery during WordPress integration.';
  });
})();
