// /sitemap.xml: every page on the site. Add new top-level pages to PAGES.
import { site, categories } from '../config';
import { products } from '../lib/products';

const PAGES = ['/', '/scents/brands', '/scents/notes', '/dinnerware/categories', '/dinnerware/brands', '/about'];

export function GET() {
  const paths = [
    ...PAGES,
    ...categories.filter((c) => products.some((p) => p.category === c.slug)).map((c) => c.href),
    ...products.map((p) => `/products/${p.slug}`),
  ];
  const urls = paths.map((p) => `  <url><loc>${site.url}${p}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } });
}
