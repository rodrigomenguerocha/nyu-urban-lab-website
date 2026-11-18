#!/usr/bin/env python3
"""NYU Urban Lab site build (static site, no frameworks).

  python3 _build/build.py [--package]

What it does, in order:
  1. Writes the shared header and footer (templates/) into every page, marking the current page in the menu.
  2. Minifies and bundles the CSS and JS from assets/ (needs Node: `cd _build && npm install` once).
  3. Points every page at the bundles, with a content hash in the URL so browsers always fetch the latest file.
  4. Checks that every local link and asset exists.
  5. With --package, writes ../NYU-Urban-Lab-site.zip with only what belongs on the server.

Edit the SOURCE files (assets/*.css, assets/*.js, templates/*.html), then run this again.
Do not upload the _build folder to the server.
"""
import glob, hashlib, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
T = lambda n: open(os.path.join('_build', 'templates', n), encoding='utf-8').read().strip()
HEADER, FOOTER = T('header.html'), T('footer.html')

def header_for(page):
    h = HEADER
    # mark the current page in the menu (panels and the Contact button)
    h = re.sub(r'(<a (?:class="[^"]*" )?href="%s")' % re.escape(page), r'\1 aria-current="page"', h)
    return h

# 0. data files read by the home page and the search box
sys.path.insert(0, os.path.join(ROOT, '_build'))
import data
print('data:', data.publications(), 'publications,', data.search_index(), 'search entries,', data.flipbooks(), 'flipbooks')

# 1. shared header / footer
pages = sorted(glob.glob('*.html'))
for f in pages:
    s = open(f, encoding='utf-8').read()
    s = re.sub(r'<header class="ul-header nb">.*?</header>', lambda m: header_for(f), s, count=1, flags=re.S)
    s = re.sub(r'<footer class="ul-footer v2f">.*?</footer>', lambda m: FOOTER, s, count=1, flags=re.S)
    open(f, 'w', encoding='utf-8').write(s)

# 2. minify + bundle
env = dict(os.environ)
if not os.path.isdir(os.path.join('_build', 'node_modules')) and os.environ.get('ESBUILD_FROM'):
    pass
print(subprocess.run(['node', os.path.join('_build', 'bundle.mjs'), ROOT], capture_output=True, text=True, env=env, check=True).stdout.strip())

# 3. link the bundles, with content hashes
def h8(name):
    return hashlib.sha1(open(os.path.join('assets', name), 'rb').read()).hexdigest()[:8]
H = {n: h8(n) for n in ['app.min.css', 'shelf.min.css', 'app.min.js', 'home.min.js', 'book-carousel.min.js', 'tool-previews.min.js', 'team-accordion.min.js', 'flipbook.min.css', 'flipbook.min.js', 'flipbooks-data.js', 'publications-data.js', 'search-index.js']}
CSS_SRC = ['fonts', 'site', 'immersive', 'story', 'background', 'cinema', 'navbar', 'v2']
JS_APP = ['motion', 'site', 'immersive', 'navbar', 'v2']; JS_HOME = ['story', 'cinema']
def link(name): return f'<link rel="stylesheet" href="assets/{name}?v={H[name]}">'
def script(name): return f'<script defer src="assets/{name}?v={H[name]}"></script>'
tag_re = lambda base, ext: re.compile(r'<%s[^>]*(?:href|src)="assets/%s(?:\.min)?\.%s(?:\?[^"]*)?"[^>]*>(?:</script>)?' % ('link' if ext == 'css' else 'script', base, ext))
ICONS = ('<link rel="icon" type="image/png" sizes="32x32" href="assets/icon-32.png"><link rel="apple-touch-icon" href="assets/icon-180.png">'
         # the site font is otherwise only found once app.min.css has downloaded; asking for it up front gets text in it sooner
         '<link rel="preload" href="assets/NYUPerstare-VF.woff2" as="font" type="font/woff2" crossorigin>')
for f in pages:
    s = open(f, encoding='utf-8').read()
    # site icon (the NYU torch square, cropped from the logo) and font preload: one copy, right after <meta charset>
    s = re.sub(r'<link[^>]*rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*>', '', s)
    s = re.sub(r'<link rel="preload" href="assets/NYUPerstare-VF\.woff2"[^>]*>', '', s)
    s = re.sub(r'(<meta charset="[^"]*"\s*/?>)', lambda m: m.group(1) + ICONS, s, count=1)
    # CSS
    first = None
    for b in CSS_SRC + ['app']:
        m = tag_re(b, 'css').search(s)
        if m and first is None: first = m.start()
    for b in CSS_SRC + ['app']:
        s = tag_re(b, 'css').sub(lambda m: '\0APPCSS\0' if m.start() == first else '', s) if first is not None else s
    s = s.replace('\0APPCSS\0', link('app.min.css'))
    s = tag_re('book-carousel', 'css').sub(link('shelf.min.css'), s)
    s = re.sub(r'<link[^>]*assets/shelf\.min\.css[^>]*>', link('shelf.min.css'), s)
    # JS: app bundle first, then page-specific scripts in their original order
    for b in JS_APP + JS_HOME + ['app', 'home']:
        pass
    has = lambda b: bool(tag_re(b, 'js').search(s))
    wants_home = has('story') or has('cinema') or has('home')
    wants_shelf = has('book-carousel')
    wants_tools = has('tool-previews'); wants_team = has('team-accordion'); wants_data = bool(re.search(r'assets/publications-data\.js', s))
    for b in JS_APP + JS_HOME + ['app', 'home', 'book-carousel', 'tool-previews', 'team-accordion']:
        s = tag_re(b, 'js').sub('', s)
    s = re.sub(r'<script[^>]*assets/publications-data\.js[^>]*></script>', '', s)
    tail = script('app.min.js') + (script('home.min.js') if wants_home else '') + (script('publications-data.js') if wants_data else '') \
         + (script('book-carousel.min.js') if wants_shelf else '') + (script('tool-previews.min.js') if wants_tools else '') + (script('team-accordion.min.js') if wants_team else '')
    s = re.sub(r'<link[^>]*assets/flipbook\.min\.css[^>]*>', '', s)
    s = re.sub(r'<script[^>]*assets/flipbook(?:s-data|\.min)\.js[^>]*></script>', '', s)
    if wants_shelf or 'data-flip=' in s:
        s = s.replace('</head>', link('flipbook.min.css') + '</head>', 1)
        tail = script('flipbooks-data.js') + script('flipbook.min.js') + tail
    s = s.replace('</head>', tail + '</head>', 1)
    open(f, 'w', encoding='utf-8').write(s)

# 3b. phone browser chrome: viewport-fit=cover (page may use the full screen, safe-area padding keeps content clear of the notch / home bar),
#     theme-color (tints Safari's bars), and standalone web-app tags (added to the Home Screen the site opens with no browser bars at all)
for f in pages:
    s = open(f, encoding='utf-8').read()
    vp = re.compile(r'<meta\s+(?:content="[^"]*"\s+name="viewport"|name="viewport"\s+content="[^"]*")\s*/?>')
    if not vp.search(s): continue
    s = vp.sub('<meta content="width=device-width,initial-scale=1,viewport-fit=cover" name="viewport"/>', s, 1)
    s = re.sub(r'<meta name="theme-color"[^>]*>|<meta name="apple-mobile-web-app-[^>]*>|<meta name="mobile-web-app-capable"[^>]*>|<link rel="manifest"[^>]*>', '', s)
    color = '#ffffff'      # phones get an opaque white header on every page, so Safari's bars (white) match
    tags = (f'<meta name="theme-color" content="{color}"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
            '<meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Urban Lab"><link rel="manifest" href="manifest.webmanifest">')
    s = s.replace('<title>', tags + '<title>', 1)
    open(f, 'w', encoding='utf-8').write(s)

# the search box and the shelf load their data lazily; keep their URLs hashed too
for js in ['v2.js']:
    p = os.path.join('assets', js); t = open(p, encoding='utf-8').read()
    t = re.sub(r"assets/search-index\.js\?v=[0-9a-z]+", f"assets/search-index.js?v={H['search-index.js']}", t)
    open(p, 'w', encoding='utf-8').write(t)

# 4. checks
bad = []
for f in pages:
    s = open(f, encoding='utf-8').read()
    for ref in set(re.findall(r'(?:src|href)="([^"#?:]+\.[a-z0-9]+)(?:\?[^"]*)?(?:#[^"]*)?"', s)):
        if ref.startswith(('http', 'mailto', 'tel', '//')): continue
        if not os.path.exists(ref): bad.append((f, ref))
print(f'{len(pages)} pages built; broken references: {len(bad)}', bad[:5])
if '--package' in sys.argv:
    # zip of what should go to the server: no sources of the build, no notes for humans/AI, no leftovers
    import zipfile
    skip_dirs = {'_build', '.git', 'node_modules'}; skip_files = {'README.md', 'CLAUDE.md', 'AGENTS.md', '.DS_Store'}
    out = os.path.join(os.path.dirname(ROOT), 'NYU-Urban-Lab-site.zip')
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for dp, dn, fn in os.walk(ROOT):
            dn[:] = [d for d in dn if d not in skip_dirs]
            for f in fn:
                if f in skip_files or f.upper().endswith('README.TXT'): continue
                p = os.path.join(dp, f); z.write(p, os.path.relpath(p, ROOT))
    print('package:', out)
sys.exit(1 if bad else 0)
