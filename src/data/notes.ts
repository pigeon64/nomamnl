// Scent families, used by /scents/notes and the Scent family filter. slug is what goes in a product's
// scentFamily (products.json). Rename or add freely; a note with no products is hidden automatically.
// Photo: public/images/notes/<slug>.(jpg|png|webp), landscape 4:3. Until it exists the tile shows a plain block.
export const notes = [
  { slug: 'woody', name: 'Woody', mood: 'Cedar, sandalwood, vetiver. Warm and grounding.' },
  { slug: 'floral', name: 'Floral', mood: 'Rose, jasmine, peony. Soft and romantic.' },
  { slug: 'fresh', name: 'Fresh', mood: 'Citrus, fig leaf, sea air. Clean and bright.' },
  { slug: 'smoky', name: 'Smoky', mood: 'Incense, oud, tobacco. Deep and evening-ready.' },
  { slug: 'sweet', name: 'Sweet', mood: 'Vanilla, amber, honey. Warm and gourmand.' },
];
