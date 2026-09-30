import { defineConfig } from 'astro/config';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { site } from './src/config.ts';

// While `npm run dev` runs, re-make the resized copies whenever a photo in public/images/ is added or changed.
const images = {
  name: 'images',
  hooks: {
    'astro:server:setup': ({ server }) => {
      let timer;
      // Absolute path: with a relative one, Vite doesn't recognise new files here as public files and 404s them until a restart.
      server.watcher.add(fileURLToPath(new URL('./public/images', import.meta.url)));
      server.watcher.on('all', (_event, file) => {
        if (!/(^|[\\/])public[\\/]images[\\/]/.test(file)) return;
        clearTimeout(timer);
        timer = setTimeout(() => execFile('node', ['scripts/images.mjs'], (_err, out, err) => console.log(out + err)), 500);
      });
    },
  },
};

export default defineConfig({
  site: site.url,
  redirects: { '/shop': '/#collections' }, // the removed shop page: old links and bookmarks land on the collections
  integrations: [images],
});
