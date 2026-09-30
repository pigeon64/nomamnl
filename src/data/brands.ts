// Featured brands, shown first on /scents/brands in this order. Every other brand with scents gets a tile
// automatically after these; list one here only to move it up or give its photo alt text. slug must match the
// brand name in products.json/the sheet, lowercased with dashes (Le Labo → le-labo, Côte Noire → cote-noire).
// Photo: public/images/brands/<slug>.(jpg|png|webp), portrait 4:5. Until it exists the tile is a plain forest block.
export const brands = [
  { slug: 'diptyque', name: 'Diptyque', alt: 'Diptyque candles on a travertine table' },
  { slug: 'le-labo', name: 'Le Labo', alt: 'A Le Labo candle in amber glass' },
  { slug: 'byredo', name: 'Byredo', alt: 'Byredo candles and incense on a stone ledge' },
];
