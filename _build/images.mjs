// Lighter copies of a few heavy images (no visual change). Run from the site root after replacing any of the source images:
//   node _build/images.mjs
// Needs sharp (cd _build && npm install). Writes only new files next to the originals; never touches the originals.
//  - hero (index.html): cinema-<name>-m.webp, 1280px wide, offered to phones in the photo's srcset;
//                        cinema-<name>-fill.webp, 640px, for the heavily blurred backdrop behind each slide (a 2560px file looks the same at blur(24px))
//  - logos: big PNGs shown at a few hundred px -> WebP at most LOGO_W wide (2x their largest display size), transparency kept
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const A = f => path.join(process.cwd(), 'assets', f);
const LOGO_W = 640;

const HERO = ['culture', 'schack', 'speaker', 'keynote'];
// [file, max width]: max width = about 2x the largest size the logo is shown at. (uli.png and micd.png are already small PNGs; WebP came out larger.)
const LOGOS = [['quiescet-logo-purple.png', 800], ['quiescet-logo.png', LOGO_W], ['partners/un-sdg.png', 240], ['urban-progress-logo.png', LOGO_W],
  ['rudin-center-logo.png', LOGO_W], ['mcsilver-logo.png', LOGO_W], ['public-knowledge-logo.png', LOGO_W], ['marron-logo.png', LOGO_W],
  ['gallatin-logo.png', LOGO_W], ['icis-logo.png', LOGO_W], ['urban-logo.png', LOGO_W], ['partners/quiescet.png', LOGO_W]];

const kb = f => Math.round(fs.statSync(f).size / 1024);
const out = [];
for (const n of HERO) {
  const src = A(`cinema-${n}-hd.webp`);
  if (!fs.existsSync(src)) continue;
  await sharp(src).resize({ width: 1280 }).webp({ quality: 80 }).toFile(A(`cinema-${n}-m.webp`));
  await sharp(src).resize({ width: 640 }).webp({ quality: 60 }).toFile(A(`cinema-${n}-fill.webp`));
  out.push(`hero ${n}: ${kb(src)}KB -> photo ${kb(A(`cinema-${n}-m.webp`))}KB (phones), backdrop ${kb(A(`cinema-${n}-fill.webp`))}KB`);
}
for (const [f, maxW] of LOGOS) {
  const src = A(f);
  if (!fs.existsSync(src)) continue;
  const dst = src.replace(/\.png$/, '.webp');
  const { width } = await sharp(src).metadata();
  await sharp(src).resize({ width: Math.min(width, maxW), withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 100 }).toFile(dst);
  out.push(`logo ${f}: ${kb(src)}KB -> ${kb(dst)}KB`);
}
console.log(out.join('\n'));
