import { readdirSync } from 'node:fs';

// '/images/brands/diptyque' → '/images/brands/diptyque.webp' when a photo of that name exists in public/
// in any format (Img picks the resized copy), otherwise undefined so the caller can show a placeholder.
export function findImage(path: string) {
  const dir = path.slice(0, path.lastIndexOf('/')), name = path.slice(dir.length + 1);
  try {
    return readdirSync(`public${dir}`).some((f) => /\.(jpe?g|png|webp|avif)$/i.test(f) && f.replace(/\.\w+$/, '') === name)
      ? `${path}.webp` : undefined;
  } catch { return undefined; }
}

// Every photo in a folder, as '/images/…/<name>.webp' paths sorted 1, 2, … 10. Missing folder → [].
export function findImages(dir: string) {
  try {
    const names = readdirSync(`public${dir}`).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).map((f) => f.replace(/\.\w+$/, ''));
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((n) => `${dir}/${n}.webp`);
  } catch { return []; }
}
