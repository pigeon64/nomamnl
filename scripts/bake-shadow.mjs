// Run after changing public/images/site/olive-bg.jpg or the tuning below: node scripts/bake-shadow.mjs && npm run images
// Bakes the leaf shadow at FULL strength (grayscale, contrast 1.4, blur, multiplied into cream); the page fades it with
// CSS opacity. Baking it pre-faded left only ~30 tones, which WebP turned into visible blocks when stretched ~2.8x.
// Tuning: softness = blur() in source pixels (shown ~2.8x larger on the page); strength = opacity in [category].astro.
import sharp from 'sharp';
const CREAM = [0xf3, 0xed, 0xe0];
const { data, info } = await sharp('public/images/site/olive-bg.jpg').grayscale().linear(1.4, -0.2 * 255).blur(2.2).raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 3);
for (let i = 0; i < info.width * info.height; i++) {
  const g = data[i * info.channels] / 255;
  for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(CREAM[c] * g);
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).jpeg({ quality: 92 }).toFile('public/images/site/olive-shadow.jpg');
