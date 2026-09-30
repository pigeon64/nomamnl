// Regenerates every brand asset from public/brand/logo.png:
//   logo.svg, logo-cream.svg, favicon.svg, favicon-16/32.png, apple-touch-icon.png, icon-512.png, og.png
// Run after replacing the logo:  npm run brand
import sharp from 'sharp';
import potrace from 'potrace';
import opentype from 'opentype.js';
import { writeFile, readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const trace = promisify(potrace.trace);
const SRC = 'public/brand/logo.png';
const OUT = 'public';
const CREAM = '#F3EDE0', FOREST = '#1E3D32', GOLD = '#B99A5B';

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

// Build an antialiased greyscale mask (black = ink) for one colour, then trace it.
async function layer(alpha) {
  const mask = Buffer.alloc(W * H);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 3], b = data[i * 3 + 2];
    const a = Math.min(1, Math.max(0, alpha(r, b)));
    mask[i] = Math.round(255 * (1 - a));
    if (a > 0.5) {
      const x = i % W, y = (i / W) | 0;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  const png = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  const svg = await trace(png, { threshold: 128, turdSize: 20, optTolerance: 0.4 });
  return { d: svg.match(/ d="([^"]+)"/)[1], box: [x0, y0, x1, y1] };
}

// Red channel separates forest (30) from cream (243); gold (185) stays below 50% ink.
const ink = await layer((r) => (243 - r) / (243 - 30));
// Red minus blue is high only for gold (94) vs cream (19) and forest (-20).
const flame = await layer((r, b) => (r - b - 19) / (94 - 19));

const pad = 4;
const bx0 = Math.min(ink.box[0], flame.box[0]) - pad, by0 = Math.min(ink.box[1], flame.box[1]) - pad;
const bx1 = Math.max(ink.box[2], flame.box[2]) + pad, by1 = Math.max(ink.box[3], flame.box[3]) + pad;
const vb = (x0, y0, x1, y1) => `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;

const svg = (viewBox, inkFill, bg = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="Nomà">${bg}` +
  `<path fill-rule="evenodd" fill="${inkFill}" d="${ink.d}"/><path fill="${GOLD}" d="${flame.d}"/></svg>\n`;

await writeFile(`${OUT}/brand/logo.svg`, svg(vb(bx0, by0, bx1, by1), FOREST));
await writeFile(`${OUT}/brand/logo-cream.svg`, svg(vb(bx0, by0, bx1, by1), CREAM));

// Favicon: the candle "O" + flame alone, centred in a cream square.
// ponytail: O column is hard-coded to the current artwork (x 470–735); adjust if the logo layout changes.
const oy0 = flame.box[1] - 20, oy1 = ink.box[3] + 20, side = oy1 - oy0, cx = 601;
const iconBox = vb(cx - side / 2, oy0, cx + side / 2, oy1);
const iconBg = `<rect x="${cx - side / 2}" y="${oy0}" width="${side}" height="${side}" fill="${CREAM}"/>`;
// Clip so only the O column shows (N and M sit outside it anyway, but be explicit).
const favicon = svg(iconBox, FOREST, iconBg).replace('<path', `<clipPath id="o"><rect x="470" y="${oy0}" width="265" height="${side}"/></clipPath><g clip-path="url(#o)"><path`).replace('</svg>', '</g></svg>');
await writeFile(`${OUT}/favicon.svg`, favicon);
for (const [name, size] of [['favicon-16.png', 16], ['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-512.png', 512]]) {
  await sharp(Buffer.from(favicon), { density: 300 }).resize(size, size).png().toFile(`${OUT}/${name}`);
}

// Social preview 1200×630: logo centred, tagline beneath in Jost (converted to paths so no font is needed at render time).
const font = opentype.parse((await readFile('node_modules/@fontsource/jost/files/jost-latin-400-normal.woff')).buffer);
const tagline = 'OBJECTS FOR SLOW LIVING';
const size = 22, tracking = size * 0.15;
const glyphs = font.stringToGlyphs(tagline);
const widths = glyphs.map((g) => (g.advanceWidth / font.unitsPerEm) * size + tracking);
const total = widths.reduce((a, b) => a + b, 0) - tracking;
let x = 600 - total / 2, d = '';
glyphs.forEach((g, i) => { d += g.getPath(x, 470, size).toPathData(2); x += widths[i]; });
const logoW = 640, logoH = (logoW * (by1 - by0)) / (bx1 - bx0);
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${CREAM}"/>
<svg x="${600 - logoW / 2}" y="${400 - logoH}" width="${logoW}" height="${logoH}" viewBox="${vb(bx0, by0, bx1, by1)}"><path fill-rule="evenodd" fill="${FOREST}" d="${ink.d}"/><path fill="${GOLD}" d="${flame.d}"/></svg>
<path fill="${FOREST}" d="${d}"/></svg>`;
await sharp(Buffer.from(og)).png().toFile(`${OUT}/og.png`);

console.log('brand assets written', { viewBox: vb(bx0, by0, bx1, by1) });
