#!/usr/bin/env python3
"""Makes the page images for a flipbook (macOS: needs swiftc).
   python3 _build/flip.py <pdf> <slug> [height=900] [quality=0.7]
   Output: assets/flip/<slug>/p001.jpg ... + manifest.json (with the detected layout mode) + back.jpg (the last page, used as the back cover of the 3D book).  Then add the slug to FLIPBOOKS in _build/data.py (publication page href)."""
import os, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf, slug = sys.argv[1], sys.argv[2]
h = sys.argv[3] if len(sys.argv) > 3 else '900'; q = sys.argv[4] if len(sys.argv) > 4 else '0.7'
exe = os.path.join(root, '_build', 'flip', 'render')
if not os.path.exists(exe):
    subprocess.run(['swiftc', '-O', os.path.join(root, '_build', 'flip', 'render.swift'), '-o', exe], check=True)
out = os.path.join(root, 'assets', 'flip', slug)
subprocess.run([exe, pdf, out, h, q], check=True)
# back cover (last PDF page) for the 3D book on the shelf: 520px wide
import json
mf = os.path.join(out, 'manifest.json'); m = json.load(open(mf)); n = m['count']
# layout: 'spreads' = cover, two-page spreads, back cover (InDesign spread export); 'pages' = one PDF page per page
sz = m['sizes']; m['mode'] = 'spreads' if len(sz) > 2 and abs(sz[1][0] - 2 * sz[0][0]) <= 4 else 'pages'
json.dump(m, open(mf, 'w'))
subprocess.run(['sips', '--resampleWidth', '520', '-s', 'formatOptions', '74', os.path.join(out, 'p%03d.jpg' % n), '--out', os.path.join(out, 'back.jpg')], check=True, capture_output=True)
