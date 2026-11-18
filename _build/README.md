# Building the site

Source files live in `assets/` (`*.css`, `*.js`) and `_build/templates/` (shared header and footer).
After any change, run from the site root:

    python3 _build/build.py

It rewrites the header and footer in every page, minifies and bundles the CSS/JS, updates the links with content hashes,
and checks for broken references. The first time on a new machine: `cd _build && npm install`.

Upload everything except the `_build` folder. The bundles (`app.min.*`, `home.min.js`, `shelf.min.css` ...) are generated; do not edit them.

Lighter image copies (hero slides for phones, blurred hero backdrops, partner/resource logos as WebP) are made by

    node _build/images.mjs

Run it after replacing any hero photo (`assets/cinema-*-hd.webp`) or one of the logo PNGs it lists. It only writes new files next to the originals.
