# CLAUDE.md — working on the NYU Urban Lab website (v2)

Read this before changing anything. It applies to any AI assistant (Claude, Copilot, Cursor, ChatGPT…) and to humans.

## What this is
A **static website**: plain HTML + CSS + vanilla JS. No framework, no server code, no database. It is uploaded to Hostinger `public_html`. About 979 pages. Content is in **English**. Every page is `noindex,nofollow` on purpose until the owners decide to publish. Keep it that way.

The sibling folder `NYU Urban Lab Website` (without "v2") is the original site. **Never edit it.**

## Golden rules
1. **Edit sources, then run the build.** Never hand-edit `assets/*.min.css`, `assets/*.min.js` or the header/footer inside a page. They are generated and will be overwritten.
2. **Header and footer live in `_build/templates/header.html` and `footer.html`.** Change them there; the build writes them into all pages.
3. **Do not invent copy.** Reuse the text already on the site. If new text is needed, ask the user. Text for outside readers should go through the OSPA tone rules before it is written.
4. **Keep `noindex`.** Do not add a sitemap or indexing tags unless asked. Open Graph/Twitter link-preview tags ARE added by the build (step 3c, `SITE_URL` in `_build/build.py`; update it when the site gets its own domain). The share card is `assets/og-image.jpg`, made by `_build/og/render.sh`.
5. **Do not touch other pages "while you are there".** Change what was asked. Layout changes must be checked on several pages, not one.
6. **Reuse the tokens** (below). No new hard-coded widths, colours or font sizes when a variable exists.
7. **Respect `prefers-reduced-motion`.** Every animation needs a still fallback.
8. **Ask before deleting** pages, images or scripts. Move to a backup folder first.

## Folder map
- `index.html` — home. Hand-written sections (see "Home page").
- `*.html` — every other page, flat in the root. Page types by file prefix: `post-*`, `people-*`, `publication-*`, `event-*`, `learn-*`, research pages, plus `team.html`, `publications.html`, etc.
- `assets/` — all CSS, JS, images, fonts.
  - Sources: `fonts.css`, `site.css`, `immersive.css`, `story.css`, `background.css`, `cinema.css`, `navbar.css`, **`v2.css`** (the main override sheet), `book-carousel.css`; `site.js`, `immersive.js`, `navbar.js`, `v2.js`, `story.js`, `cinema.js`, `book-carousel.js`, `tool-previews.js`, `team-accordion.js`.
  - Generated (do not edit): `app.min.css`, `shelf.min.css`, `app.min.js`, `home.min.js`, `book-carousel.min.js`, `tool-previews.min.js`, `team-accordion.min.js`, `publications-data.js`, `search-index.js`.
  - `covers/` publication covers (webp, 520px wide), `partners/` partner logos (grey, transparent), `tool-*.webp` tool previews.
- `_build/` — build system. Not uploaded to the server. See `_build/README.md`.

## Build workflow
```bash
cd _build && npm install      # once, on a normal machine
cd .. && python3 _build/build.py            # rebuild everything
python3 _build/build.py --package           # also writes ../NYU-Urban-Lab-site.zip for upload
```
If `esbuild` is not installed globally, set `ESBUILD_FROM=/path/to/esbuild/index.js`.

The build: (0) regenerates `publications-data.js` and `search-index.js`, (1) injects header/footer, (2) bundles and minifies CSS/JS with esbuild, (3) links each page to the right bundles with a content hash (`?v=…`, so browsers never serve stale files), (4) checks every local link and asset. **It must end with `broken references: 0`.** The zip leaves out `_build`, `README.md`, `CLAUDE.md`, `AGENTS.md`.

## Where content comes from (what to edit)
| To change… | Edit this | Then |
|---|---|---|
| A publication (title, cover, meta) | its card in `publications.html` | build (feeds the home book carousel and the search) |
| Add a publication | new card FIRST in `publications.html` (newest first), a page `publication-<slug>.html` cloned from an existing one, cover in `assets/` plus a 520px copy in `assets/covers/` (same filename), PDF in `assets/publications/`; bump the count in `publications.html` (`N results`) and the home stat | build |
| Search results | any page's `<title>` / meta description | build |
| Header / footer / menu links | `_build/templates/*.html` | build |
| Home stats (22.4M, 4, 15, 884) | `index.html`, `.v2-stats` — **hand-maintained** | build |
| The three latest posts on the home | `index.html`, `#ul-post-archive` — **hand-maintained** | build |
| Partner logos | `index.html` `.v2-partners` + `assets/partners/` | build |
| Styles | append a new numbered section at the end of `assets/v2.css` (currently up to section 38) | build |

## Design tokens and layout
- Content width `--ul-content: 1400px`. Side padding `--ul-gutter` (24px below 761px; `max(clamp(24px,5.6vw,100px), (100% - 1400px)/2)` above). **Every section must align to this edge** (header, hero text, sections, footer). Check alignment after any change.
- Other variables: `--nb-margin`, `--nb-inset`, `--nb-radius:16px`, `--v2-space`, `--v2-dark:#25063d`, `--v2-light:#f3eff8`, `--v2-line`, type scale `--t-h1`, `--t-h2`, `--t-h3`, `--t-page-h2`.
- Colours: ink `#25063d`, purple `#582483`, grey band `#efeef2`. Easing `cubic-bezier(.22,1,.36,1)`.
- Breakpoints in use: 960, 761/700, 650, 600. Mobile is first-class: test at 375px.
- The page wrapper is `#urbanlab-home`. Override rules are written as `#urbanlab-home .thing {…}` to beat old `site.css` rules. Do not use `!important` unless a legacy rule leaves no choice.

## Home page (`index.html`) — section order and backgrounds
hero (`.cinema.cinema-opening`, full height, photo slideshow with progress bar) → partners strip (`.v2-partners`) → story (`.urban-story`, purple, pinned canvas + 4 stacking cards) → stats (`.v2-stats`, white, count-up) → Publications (`#ul-publications`, grey `#efeef2`, 3D book carousel `.bc`) → Housing Tools (`#ul-tools`, white, live previews) → Recent posts (`#ul-post-archive`, grey) → Get involved (`.v2i-band`, grey) → footer (`.ul-footer.v2f`). Bands alternate white/grey; keep that rhythm.

## Components worth knowing
- **Header** `.ul-header.nb`: `.nb-bar`, `.nb-trigger`, `.nb-panel`, `.nb-search`. On the home it is transparent over the hero (`nb-top` class toggled by `v2.js`). Search reads `window.__SEARCH_INDEX`; the `/` key opens it.
- **Story** (`story.js`): canvas of 6200 points. Scene 0 is a simplified Manhattan from real lon/lat. Four focuses (houses, grove + wind, public–private flows, culture ripples) are tagged point kinds. Cards use `position:sticky` inside nested `.story-stack` wrappers; margins are computed so all cards release together. `--d` is set by JS for the dim/scale effect. Don't change card structure without re-testing the scroll.
- **Hero** (`cinema.js`): `DUR=6900` ms per slide, time driven by `requestAnimationFrame`, does not pause on hover.
- **Book carousel** (`book-carousel.js/.css`): reads cards from `publications.html`, or `window.__PUBLICATIONS` on the home. Spine colour = dominant cover colour. `FOCUS_H=322`. The hinge needs `overflow:visible`.
- **Tool previews** (`tool-previews.js`): canvas chart + dot-field map sampled from `tool-rent-map.webp`. Needs http (not `file://`) because canvas reads image pixels.
- **Team** (`team.html`): `<details class="team-section team-acc">` animated by `team-accordion.js`.
- **Inner pages** share `.site-title` + `.breadcrumb` + `.page-body`; research pages also have `.page-cta`.

## Buttons (one standard)
Inner pages: `.button-link`, `.page-cta a`, `.form-button`, pager buttons all share one look (section 49 of `v2.css`): 48px high, 8px corners, 15px/600. Primary = purple fill, secondary (`.button-link.secondary`) = purple outline, hover = deep ink fill. No lift or shadow. Home hero CTA is the same shape in white outline. Header Contact is purple fill. Do not introduce square or pill buttons; text links use `.ul-link` (no underline until hover).

## Flipbook (page-turning reader)
Any publication with a PDF can be flipped through in a modal (`assets/flipbook.js/.css`). Desktop: real 3D page turns (click a page, drag, arrow keys); phones: one page at a time, swipe. To add one:
1. `python3 _build/flip.py <pdf> <slug>` renders `assets/flip/<slug>/p001.jpg…` (macOS, needs `swiftc`). `flip.py` detects the layout: `spreads` (page 1 cover, last page back cover, pages between are two-page spreads, e.g. InDesign spread exports) or `pages` (one PDF page per page; the viewer adds the blank inside covers). The last PDF page is always used as the back cover, also on the 3D book on the shelf.
2. Add `{slug, href, pdf, title}` to `_build/flipbooks.json` (href = the publication page filename). Look at `assets/flip/<slug>/back.jpg`: if the last PDF page is not a real back cover, add `"back": false` to the entry. The book then keeps that page as a normal page and gets a plain dark back cover, in the reader and on the shelf.
3. Run the build. The book then shows a "Flip through the book" link inside the open book on the shelf. On the publication page add `<button type="button" class="button-link" data-flip="<href>">Flip through the book</button>`.
Pages load lazily (about 250KB per spread). All 16 publications have one (images in `assets/flip/`, about 72MB in total). The original PDFs are not copied into the site, except Magic City Rising; "Open PDF" links to the Lab's own copy.

## Known gotchas
- `overflow:hidden` flattens `preserve-3d` (broke the book cover once).
- A global `p{max-width}` left-aligns centred text; reset it where needed.
- `mix-blend-mode` and `mask-image` are used for the photo duotone; test in Safari and Chrome.
- Lazy images load late: when testing screenshots, scroll first.
- Old `ul-wrap` / `site.css` rules still exist under the v2 layer. Remove dead code only when asked.
- `.pub-head` is reused for the posts section.
- "Congestrian Crisis" in a title may be a typo in the source; kept as-is.
- `wiki.html`, `documents.html`, `contact.html` still have placeholder text.

## Testing before you say "done"
1. Serve over http: `python3 -m http.server 8766` in this folder; open `http://localhost:8766/`. (`file://` breaks canvas and fetch.)
2. Check **375px** and **1440/1920px**. No horizontal scroll. Left/right edges line up with the 1400px column.
3. Browser console: no errors.
4. Check at least: home, one `post-*`, one `people-*`, `publications.html`, `team.html`, one research page.
5. Reduced motion on: nothing essential disappears.
6. Run the build: `broken references: 0`.
7. Say plainly what you did **not** verify.

## Style of changes
Small, targeted edits. Match the surrounding code style (2-space indent, vanilla JS in an IIFE, no dependencies). Keep comments short and in English. Prefer fixing the source of a problem over stacking another override.
