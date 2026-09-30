// Makes resized WebP copies of every photo in public/images/ into public/_img/ for responsive srcset.
// Runs automatically before `npm run dev` and `npm run build` (or `npm run images`). Only re-processes photos that changed.
//
// Transparent product cutouts (PNG/WebP with see-through background) are normalised so every product
// sits the same size: empty edges trimmed, scaled to fit a fixed box, centred on a clear 4:5 canvas,
// with a soft floor shadow. They then float on the page background instead of sitting in a box.
import sharp from 'sharp';
import { readdir, stat, mkdir } from 'node:fs/promises';
import { join, dirname, relative, basename } from 'node:path';

export const WIDTHS = [400, 800, 1200, 1600];
const SRC = 'public/images', OUT = 'public/_img';
const CANVAS = { w: 1600, h: 2000 };
// Cutout size on the canvas. Tweak these if products look too big or small in the cards.
const FIT = { w: 0.66, h: 0.7, centreY: 0.5 };
const CREAM = '#F3EDE0';

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(jpe?g|png|webp|avif)$/i.test(e.name)) yield p;
  }
}

const mtime = (p) => stat(p).then((s) => s.mtimeMs, () => 0);
// Copied files can keep an old "modified" date, so also count when the file arrived here.
const arrived = (p) => stat(p).then((s) => Math.max(s.mtimeMs, s.ctimeMs, s.birthtimeMs));

// Trim → scale into the fit box → centre on a transparent 4:5 canvas → soft contact shadow underneath.
async function normaliseCutout(file) {
  const { data, info } = await sharp(file).rotate().trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const box = { w: Math.round(CANVAS.w * FIT.w), h: Math.round(CANVAS.h * FIT.h) };
  const scale = Math.min(box.w / info.width, box.h / info.height);
  if (scale > 1.6) console.warn(`images: ⚠ ${file} is small (${info.width}×${info.height}px) and is being enlarged ${scale.toFixed(1)}×; it may look soft. 1200px+ tall is best.`);
  const w = Math.round(info.width * scale), h = Math.round(info.height * scale);
  const left = Math.round((CANVAS.w - w) / 2), top = Math.round(CANVAS.h * FIT.centreY - h / 2);
  const product = await sharp(data).resize(w, h).png().toBuffer();
  // Two layers: a wide soft ambient pool, then a tight dark contact line where the product meets the surface.
  const ambient = await footShadow(product, w, h, left, top, { spread: 1.15, height: w * 0.06, blur: w * 0.03, opacity: 0.16, drop: 0.3 });
  const contact = await footShadow(product, w, h, left, top, { spread: 1, height: w * 0.018, blur: w * 0.006, opacity: 0.4, drop: 0 });
  return sharp({ create: { width: CANVAS.w, height: CANVAS.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([ambient, contact, { input: product, left, top }])
    .png().toBuffer();
}

// Shadow cast by the product's own footprint: its bottom rows' silhouette, squashed flat, tinted and blurred.
// So three incense bundles cast three shadows and a narrow bottle a narrow one, instead of one generic ellipse.
async function footShadow(product, w, h, left, top, { spread, height, blur, opacity, drop }) {
  const band = Math.max(2, Math.round(h * 0.04));
  const sw = Math.round(w * spread), sh = Math.max(2, Math.round(height)), pad = Math.ceil(blur * 3);
  const W = sw + pad * 2, H = sh + pad * 2;
  // Separate pipelines on purpose: sharp runs a chain's steps in its own fixed order, so extractChannel would come last.
  const foot = await sharp(product).extract({ left: 0, top: h - band, width: w, height: band }).extractChannel('alpha').raw().toBuffer();
  const flat = await sharp(foot, { raw: { width: w, height: band, channels: 1 } }).resize(sw, sh, { fit: 'fill' })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#000' }).extractChannel(0).raw().toBuffer();
  const mask = await sharp(flat, { raw: { width: W, height: H, channels: 1 } }).blur(Math.max(0.3, blur)).extractChannel(0).raw().toBuffer();
  for (let i = 0; i < mask.length; i++) mask[i] *= opacity;
  const input = await sharp({ create: { width: W, height: H, channels: 3, background: '#3c3223' } })
    .joinChannel(mask, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  return { input, left: Math.round(left + (w - W) / 2), top: Math.round(top + h - H / 2 + sh * drop) };
}

const PRODUCTS = join(SRC, 'products');
const isCutout = async (file) => file.startsWith(PRODUCTS) && !(await sharp(file).stats()).isOpaque;

// Same photo in two formats (e.g. 1.webp and 1.jpg): keep only the newest, and say so.
const newest = new Map();
for await (const file of walk(SRC)) {
  const key = file.replace(/\.\w+$/, ''), t = await arrived(file), prev = newest.get(key);
  if (prev) console.warn(`images: ⚠ ${prev.file} and ${file} are the same photo in two formats, using the newer one. Delete the other.`);
  if (!prev || t > prev.t) newest.set(key, { file, t });
}

// Editing this script (e.g. the shadow) counts as a change too, so every image is redone with the new look.
const scriptTime = await mtime(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
let made = 0;
for (const { file, t } of newest.values()) {
  const srcTime = Math.max(t, scriptTime);
  const base = join(OUT, relative(SRC, file)).replace(/\.\w+$/, '');
  const isMain = file.startsWith(PRODUCTS) && basename(base) === '1';
  const outs = [...WIDTHS.map((w) => `${base}-${w}.webp`), ...(isMain ? [`${base}-og.jpg`] : [])];
  const stale = [];
  for (const o of outs) if ((await mtime(o)) <= srcTime) stale.push(o);
  if (!stale.length) continue;

  await mkdir(dirname(base), { recursive: true });
  const cutout = await isCutout(file);
  const master = cutout ? await normaliseCutout(file) : await sharp(file).rotate().toBuffer();
  for (const w of WIDTHS) {
    const out = `${base}-${w}.webp`;
    if (!stale.includes(out)) continue;
    await sharp(master).resize({ width: w, withoutEnlargement: !cutout }).webp({ quality: 74, effort: 6, alphaQuality: 90 }).toFile(out);
    made++;
  }
  // Share previews (Messenger, Facebook, IG links): JPG on cream, since some apps show transparency as black.
  if (isMain && stale.includes(`${base}-og.jpg`)) {
    await sharp(master).resize({ width: 1200, withoutEnlargement: !cutout }).flatten({ background: CREAM }).jpeg({ quality: 82 }).toFile(`${base}-og.jpg`);
    made++;
  }
  if (cutout) console.log(`images: ${relative(SRC, file)} is a transparent cutout, sized and centred`);
}
console.log(`images: ${made} file(s) written`);
