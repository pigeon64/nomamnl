import data from '../data/products.json';
import sheet from '../data/products.cache.json';
import { site, links, peso } from '../config';
import { notes } from '../data/notes';
import { findImage } from './images';

export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: 'scents' | 'dinnerware' | 'body';
  type: string;
  price: number; // 0 = not set yet → "Price on request"
  status: 'in_stock' | 'pre_order' | 'sold_out';
  preorderLeadTime: string;
  size: string;
  burnTime: string;
  scentFamily: string; // a slug from src/data/notes.ts, or empty
  notes: { top: string; heart: string; base: string };
  details: string;
  care: string;
  images: string[];
  featured: boolean;
  // Scent options (Diptyque etc.): the page shows a picker, then the chosen scent's own description and notes.
  variants?: { name: string; details?: string; notes: { top: string; heart: string; base: string } }[];
};

// The Google Sheet (saved to products.cache.json by scripts/sheet.mjs) wins over products.json for
// brand, name, size, price, status, lead time and notes.
const overrides = (sheet as unknown as { overrides: Record<string, Partial<Product>> }).overrides ?? {};
export const products = (data as Product[]).map((p) => {
  const o = overrides[p.slug];
  return o ? { ...p, ...o, notes: { ...p.notes, ...o.notes } } : p;
});

for (const p of products) {
  if (p.scentFamily && !notes.some((n) => n.slug === p.scentFamily))
    console.warn(`products: ⚠ ${p.slug} has scentFamily "${p.scentFamily}", which isn't in src/data/notes.ts`);
}

// Card-only photo by convention: public/images/products/<slug>/thumb.(png|jpg|webp). Missing → undefined.
export const thumbOf = (p: Product) => findImage(`/images/products/${p.slug}/thumb`);

// "Le Labo" → "le-labo", "Côte Noire" → "cote-noire". Used for ?brand= links and src/data/brands.ts.
export const slugify = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// schema.org BreadcrumbList for <script type="application/ld+json">. Paths are site-relative.
export const breadcrumbLd = (items: [name: string, path: string][]) => JSON.stringify({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${site.url}${path}` })),
});

// schema.org Product for <script type="application/ld+json">. No price → no offers (Google rejects a price of 0).
export const productLd = (p: Product, description: string) => JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Product',
  name: fullName(p), description, sku: p.slug, brand: { '@type': 'Brand', name: p.brand },
  image: p.images.map((src) => `${site.url}${src.replace(/^\/images\//, '/_img/').replace(/\.\w+$/, '-1600.webp')}`),
  ...(p.price && {
    offers: {
      '@type': 'Offer', url: productUrl(p), priceCurrency: 'PHP', price: p.price,
      availability: `https://schema.org/${{ in_stock: 'InStock', pre_order: 'PreOrder', sold_out: 'OutOfStock' }[p.status]}`,
    },
  }),
});

export const priceLabel = (p: Product) => (p.price ? peso(p.price) : 'Price on request');

export const fullName = (p: Product) => [p.brand, p.name, p.size].filter(Boolean).join(' ');

export const productUrl = (p: Product) => `${site.url}/products/${p.slug}`;

export const statusLabel = (p: Product) =>
  p.status === 'sold_out' ? 'Sold out'
  : p.status === 'pre_order' ? `Pre-order${p.preorderLeadTime ? `: ships in ${p.preorderLeadTime}` : ''}`
  : 'In stock';

// Plural, human labels for filter chips; unknown types fall back to a capitalised plural.
const TYPE_LABELS: Record<string, string> = {
  candle: 'Candles', diffuser: 'Diffusers', incense: 'Incense', plate: 'Plates', bowl: 'Bowls',
  glassware: 'Glassware', serveware: 'Serveware', mug: 'Mugs', teaware: 'Teaware', cutlery: 'Cutlery',
};
export const typeLabel = (t: string) => TYPE_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1) + 's';

// variant: the chosen scent's name, e.g. "Baies" → "Diptyque Scented Candle 190g in Baies".
export function orderMessage(p: Product, variant?: string) {
  const name = `${fullName(p)}${variant ? ` in ${variant}` : ''}`;
  if (p.status === 'sold_out') return `Hi Nomà! Please let me know when ${name} is back.`;
  const verb = p.status === 'pre_order' ? 'pre-order' : 'order';
  const price = p.price ? ` – ${peso(p.price)}` : '';
  return `Hi Nomà! I'd like to ${verb}: ${name}${price}. ${productUrl(p)}`;
}

export const messengerHref = (p: Product, variant?: string) => `${links.messenger}?text=${encodeURIComponent(orderMessage(p, variant))}`;

// Same category first; prefer same type, then same brand; keep file order otherwise.
export function related(p: Product, n = 4) {
  const score = (q: Product) => (q.type === p.type ? 2 : 0) + (q.brand === p.brand ? 1 : 0);
  return products
    .filter((q) => q.slug !== p.slug && q.category === p.category)
    .map((q, i) => ({ q, s: score(q), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map((x) => x.q);
}
