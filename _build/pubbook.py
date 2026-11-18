#!/usr/bin/env python3
"""Puts the 3D book (cover = first page of the publication) on every publication page that has a flipbook.
   python3 _build/pubbook.py      (from the site root; safe to run again: it rewrites the book it made before)
   Needs _build/flipbooks.json and assets/flip/<slug>/manifest.json + p001.jpg (made by _build/flip.py).
   Styles: .pbook* in assets/flipbook.css. Clicking the book opens the flipbook through its data-flip attribute (assets/flipbook.js)."""
import html, json, os, re

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
ICON = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5v13c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5z"/>'
        '<path d="M12 6v13"/></svg>')
FIG = re.compile(r'(<div class="feature-row">)<figure[^>]*>.*?</figure>', re.S)

done = []
for fb in json.load(open('_build/flipbooks.json', encoding='utf-8')):
    page, slug, title = fb['href'], fb['slug'], fb['title']
    mf = f'assets/flip/{slug}/manifest.json'
    if not (os.path.exists(page) and os.path.exists(mf)):
        continue
    m = json.load(open(mf, encoding='utf-8'))
    w, h = m['sizes'][0]                                         # page 1 = the cover
    pages = (2 * (m['count'] - 2) + 2) if m.get('mode', 'spreads') == 'spreads' else m['count']
    depth = max(.10, min(.24, .08 + pages * .0015))              # thickness as a share of the book's width, grows with the page count
    t = html.escape(title, quote=True)
    book = (f'<figure class="pbook-fig"><button type="button" class="pbook" data-flip="{page}" aria-label="See inside: {t}" '
            f'style="--ar:{w}/{h};--d:calc(var(--w) * {depth:.3f})"><span class="pbook-body"><span class="pbook-cover">'
            f'<img src="assets/flip/{slug}/p001.jpg" alt="Cover of {t}" width="{w}" height="{h}" decoding="async">'
            f'<span class="pbook-bind"></span></span><span class="pbook-pages"></span><span class="pbook-back"></span></span>'
            f'<span class="pbook-cta">{ICON}See inside</span></button></figure>')
    s = open(page, encoding='utf-8').read()
    s2, n = FIG.subn(lambda mm: mm.group(1) + book, s, count=1)
    if n:
        open(page, 'w', encoding='utf-8').write(s2)
        done.append(page)
print(f'books on {len(done)} publication pages')
