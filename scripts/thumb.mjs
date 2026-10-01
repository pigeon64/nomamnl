// node scripts/thumb.mjs <product-slug> <photo>  → public/images/products/<slug>/thumb.png
// Removes a plain light/white photo background (flood-fill from the edges, feathered) and saves a transparent PNG.
// scripts/images.mjs then trims, centres, scales and shadows it like every other cutout (npm run images / build).
// Works for studio shots on a near-uniform background; busy or dark backgrounds need a proper cutout tool.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const [slug, file, tol = '22'] = process.argv.slice(2);
if (!slug || !file) { console.error('usage: node scripts/thumb.mjs <slug> <photo> [tolerance=22]'); process.exit(1); }
const T = +tol;

const { data, info } = await sharp(file).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
// Background colour = average of the four corners.
const corners = [0, W - 1, (H - 1) * W, H * W - 1].map(px);
const bg = [0, 1, 2].map((c) => corners.reduce((s, p) => s + p[c], 0) / 4);
const dist = (i) => Math.max(...px(i).map((v, c) => Math.abs(v - bg[c])));

// Flood fill from every border pixel through pixels close to the background colour.
const isBg = new Uint8Array(W * H), stack = [];
const push = (i) => { if (!isBg[i] && dist(i) <= T) { isBg[i] = 1; stack.push(i); } };
for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
while (stack.length) {
  const i = stack.pop(), x = i % W;
  if (x > 0) push(i - 1);
  if (x < W - 1) push(i + 1);
  if (i >= W) push(i - W);
  if (i < W * (H - 1)) push(i + W);
}
// Alpha mask, then a 1px blur to feather the cut edge.
const mask = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) mask[i] = isBg[i] ? 0 : 255;
const soft = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).blur(0.8).toColourspace('b-w').raw().toBuffer();
for (let i = 0; i < W * H; i++) data[i * 4 + 3] = soft[i];
const dir = `public/images/products/${slug}`;
await mkdir(dir, { recursive: true });
await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${dir}/thumb.png`);
console.log(`thumb: ${dir}/thumb.png (background ≈ rgb(${bg.map(Math.round)}), tolerance ${T})`);
