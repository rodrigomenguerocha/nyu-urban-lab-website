#!/usr/bin/env python3
"""Regenerates the two data files the home page and the search box read (run automatically by build.py):
   assets/publications-data.js  <- the publication cards in publications.html
   assets/search-index.js       <- title + short description of every page
"""
import glob, html, json, os, re

def text(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()

def cats(card):
    m = re.search(r'data-categories="([^"]*)"', card)
    try: v = json.loads(html.unescape(m.group(1))) if m else []
    except Exception: v = []
    return [html.unescape(x).strip() for x in v]

def publications():
    s = open('publications.html', encoding='utf-8').read()
    items = []
    for r in re.findall(r'<article[^>]*data-record[^>]*>.*?</article>', s, re.S):
        a = re.search(r'<h3[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r, re.S)
        img = re.search(r'<img[^>]*src="([^"]*)"', r)
        m = re.search(r'class="card-meta"[^>]*>(.*?)</p>', r, re.S)
        if not a:
            continue
        dm = re.search(r'</h3>\s*<p>(.*?)</p>', r, re.S)
        items.append({'title': text(a.group(2)), 'href': a.group(1), 'img': img.group(1) if img else '', 'meta': text(m.group(1)) if m else '', 'desc': text(dm.group(1)) if dm else '', 'cats': cats(r)})
    open('assets/publications-data.js', 'w', encoding='utf-8').write('window.__PUBLICATIONS=' + json.dumps(items, ensure_ascii=False) + ';')
    return len(items)

def search_index():
    out = []
    for f in sorted(glob.glob('*.html')):
        s = open(f, encoding='utf-8').read()
        t = re.search(r'<title>(.*?)</title>', s, re.S)
        title = text(t.group(1)).replace(' | NYU Urban Lab', '') if t else f
        m = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"|<meta[^>]*content="([^"]*)"[^>]*name="description"', s)
        d = html.unescape((m.group(1) or m.group(2))) if m else ''
        if len(d) < 30:
            pb = re.search(r'<div class="page-body">(.*)', s, re.S)
            d = text(pb.group(1))[:170] if pb else ''
        if f == 'index.html':
            title = 'NYU Urban Lab — Home'
        low_t, low_d = title.lower().strip(), d.lower().strip()
        if low_d.startswith(low_t[:40]) or low_t.startswith(low_d[:40]):
            d = ''   # the description only repeats the title
        out.append([title, f, d[:170]])
    open('assets/search-index.js', 'w', encoding='utf-8').write('window.__SEARCH_INDEX=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';')
    return len(out)

def flipbooks():
    """assets/flipbooks-data.js <- _build/flipbooks.json + assets/flip/<slug>/manifest.json (made by _build/flip.py)"""
    cfg = json.load(open('_build/flipbooks.json', encoding='utf-8')); out = {}
    for b in cfg:
        m = json.load(open(f"assets/flip/{b['slug']}/manifest.json"))
        mode = m.get('mode', 'spreads')
        ratio = (m['sizes'][1] if len(m['sizes']) > 2 else m['sizes'][0]) if mode == 'spreads' else m['sizes'][0]
        out[b['href']] = {'dir': f"assets/flip/{b['slug']}/", 'count': m['count'], 'mode': mode, 'ratio': ratio, 'pdf': b.get('pdf', ''), 'title': b.get('title', ''), 'sizes': (m['sizes'] if mode == 'pages' else []), 'hasBack': b.get('back', True) is not False, 'back': (f"assets/flip/{b['slug']}/back.jpg" if b.get('back', True) is not False and os.path.exists(f"assets/flip/{b['slug']}/back.jpg") else '')}
    open('assets/flipbooks-data.js', 'w', encoding='utf-8').write('window.__FLIPBOOKS=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';')
    return len(out)

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    print(f'publications: {publications()}  search entries: {search_index()}  flipbooks: {flipbooks()}')
