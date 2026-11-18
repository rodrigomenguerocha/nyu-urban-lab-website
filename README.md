# NYU Urban Lab website — v2

Redesigned version of the NYU Urban Lab site. Static HTML, CSS and vanilla JS; no framework.

## Run it locally
```bash
python3 -m http.server 8766
```
Open http://localhost:8766/ (use http, not `file://`, so the canvas animations and image sampling work).

## Edit and rebuild
Edit the source files in `assets/` and the templates in `_build/templates/`, then:
```bash
cd _build && npm install      # first time only
cd .. && python3 _build/build.py
```
The build refreshes the header/footer on every page, regenerates the publications and search data, bundles and minifies CSS/JS, versions the links with a content hash and checks for broken links. It should finish with `broken references: 0`.

Do not edit `assets/*.min.*` files; they are generated.

## Publish
```bash
python3 _build/build.py --package
```
This writes `../NYU-Urban-Lab-site.zip` with only what belongs on the server. Upload its contents to Hostinger `public_html`.

All pages are `noindex,nofollow`. Remove that only when the site is ready to be public.

## Structure
- `index.html` and the other `*.html` pages in the root
- `assets/` CSS, JS, images, fonts (`v2.css` is the main style layer)
- `_build/` build scripts and templates (not uploaded)

For the full working guide (design tokens, components, checklist, gotchas) see [CLAUDE.md](CLAUDE.md).
