// All site settings live here. Fill in the REPLACE_ME values — nothing else in the code needs to change.

export const site = {
  name: 'Nomà',
  tagline: 'Objects for slow living',
  // Your live domain, no trailing slash (used for sitemap, share previews and order messages).
  url: 'https://noma.example.com',

  // Messenger: the username in your page link, e.g. m.me/nomamanila → 'nomamanila'
  messengerUsername: 'REPLACE_ME',
  // Instagram handle without the @
  instagramHandle: 'noma.mnl',
  facebookUrl: 'https://www.facebook.com/share/1JDq8DN2ng/',
  email: 'noma.mnla@gmail.com',

  // In pesos, whole number
  freeShippingThreshold: 5000,
  giftWrapPrice: 150,

  // Returns, shown on /shipping-returns and /faq. These are starting defaults: change them to match how you work.
  returnDays: 7, // unopened, unused pieces can be returned within this many days of delivery
  damageReportHours: 48, // damaged or wrong items must be reported within this many hours, with photos

  // Google Sheet with prices, stock and names. File → Share → Publish to web → CSV, paste the link here.
  // Leave empty to use src/data/products.json only. See HOW-TO-ADD-PRODUCTS.md.
  productSheetCsvUrl: '',

  // Analytics — leave empty to disable. Only load after cookie consent.
  ga4Id: '', // e.g. 'G-XXXXXXXXXX'
  metaPixelId: '', // e.g. '123456789012345'
};

export const links = {
  messenger: `https://m.me/${site.messengerUsername}`,
  instagram: `https://www.instagram.com/${site.instagramHandle}`,
  instagramDm: `https://ig.me/m/${site.instagramHandle}`,
  facebook: site.facebookUrl,
};

// The main menu lives in src/data/nav.ts.

// Category squares on Home and Shop. Add Body here when it launches; the grid adapts to 3 across.
export const categories = [
  { slug: 'scents', label: 'Scents', href: '/scents', image: '/images/site/scents.webp', alt: 'A candle in dark green glass on a travertine table in afternoon light',
    intro: 'Candles, diffusers and incense from the houses we love, for rooms that feel like somewhere.' },
  { slug: 'dinnerware', label: 'Dinnerware', href: '/dinnerware', image: '/images/site/dinnerware.webp', alt: 'A stack of cream ceramic dinner plates on a stone table',
    intro: 'Glassware, tea sets and table pieces for long lunches and unhurried evenings.' },
];

export const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`;
