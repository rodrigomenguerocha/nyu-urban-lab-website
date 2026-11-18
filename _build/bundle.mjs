// Minifies and bundles the site's CSS and JS. Run through build.py (python3 _build/build.py).
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(process.env.ESBUILD_FROM || import.meta.url);
const esbuild = require('esbuild');
const root = path.resolve(process.argv[2]);
const A = f => path.join(root, 'assets', f);
const read = f => fs.readFileSync(A(f), 'utf8');
const css = (files) => esbuild.transformSync(files.map(read).join('\n'), { loader: 'css', minify: true }).code;
const js = (files) => esbuild.transformSync(files.map(read).join(';\n'), { loader: 'js', minify: true, target: 'es2020' }).code;
const out = {
  'app.min.css':  css(['fonts.css', 'site.css', 'immersive.css', 'story.css', 'background.css', 'cinema.css', 'navbar.css', 'v2.css']),
  'shelf.min.css': css(['book-carousel.css']),
  'flipbook.min.css': css(['flipbook.css']),
  'app.min.js':   js(['motion.js', 'site.js', 'immersive.js', 'navbar.js', 'v2.js']),
  'home.min.js':  js(['story.js', 'cinema.js']),
  'book-carousel.min.js': js(['book-carousel.js']),
  'flipbook.min.js': js(['flipbook.js']),
  'tool-previews.min.js': js(['tool-previews.js']),
  'team-accordion.min.js': js(['team-accordion.js']),
};
for (const [name, code] of Object.entries(out)) fs.writeFileSync(A(name), code);
console.log(Object.entries(out).map(([n, c]) => `${n} ${(Buffer.byteLength(c) / 1024).toFixed(1)}KB`).join('\n'));
