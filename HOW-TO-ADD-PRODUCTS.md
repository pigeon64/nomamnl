# How to update products on the Nomà website

There are two places product information lives:

| Where | What goes there | How often you'll touch it |
| --- | --- | --- |
| **Google Sheet** | Brand, name (with the scent), size, price, stock status, pre-order lead time, scent notes | All the time |
| **`src/data/products.json`** | Everything else: category, type, photos, description, care, "featured" | Only when adding a brand-new product |

The sheet always wins. If a cell in the sheet is filled in, the website uses it. If it's empty, the website uses what's in `products.json`. The one exception is **price**: an empty price cell shows **"Price on request"**.

---

## Everyday changes: edit the sheet, then rebuild

1. Open the Google Sheet and change what you need: a price, a scent name, "Sold out", and so on.
2. Wait about 5 minutes. Google takes a few minutes to update the published copy.
3. **Rebuild the site** with your bookmarked rebuild link (see below). The site updates in about 1–2 minutes.

That's it. Nothing on your computer needs to change.

### The sheet's columns

The first row must have these headings. Capitals and spaces don't matter, so `Notes Top` and `notes_top` both work.

| Column | What to put | Example |
| --- | --- | --- |
| `slug` | **Don't change this.** It's how the sheet finds the product. | `diptyque-scented-candle-190g` |
| `brand` | Brand name | `Diptyque` |
| `name` | Product name **with the scent**. It's shown as brand + name + size, and used in the order message. | `Baies Candle` |
| `size` | Weight or size | `190g` |
| `price` | Pesos. `3500`, `3,500` and `₱3,500` all work. **Leave empty for "Price on request".** | `3500` |
| `status` | `In stock`, `Pre-order` or `Sold out` | `In stock` |
| `preorder_lead_time` | Only for pre-orders. Shown as "Pre-order: ships in …" | `2–3 weeks` |
| `notes_top`, `notes_heart`, `notes_base` | Scent notes, shown on scent product pages | `Blackcurrant leaves` |

With those details filled in, the Diptyque row appears on the site as **"Diptyque Baies Candle 190g · ₱3,500"**, and the Messenger message reads:
> Hi Nomà! I'd like to order: Diptyque Baies Candle 190g – ₱3,500. https://…

You can add your own extra columns, like cost or supplier. The website ignores them, and they're never published on the site. They are visible to anyone who has the sheet's CSV link, though, so keep private numbers in a separate tab that isn't published.

### Setting up the sheet (once)

1. In Google Sheets: **File → Import → Upload** `products-sheet-template.csv` (in this folder). It already has every product and its slug.
2. **File → Share → Publish to web**. Choose the tab with your products and **Comma-separated values (.csv)**, then click **Publish**.
3. Copy the link. It looks like `https://docs.google.com/spreadsheets/d/e/…/pub?output=csv`.
4. Paste it into `src/config.ts` as `productSheetCsvUrl: '…'`.

### No Google Sheet? Use a local file

Save the sheet as `products.csv` in the project folder, next to this file. It uses the same columns as the sheet. The site reads it on every `npm run dev` / `npm run build`.

The order is: **published sheet link → `products.csv` → last saved copy**. So `products.csv` is used only when there's no sheet link, or the sheet can't be reached. If you set a sheet link, delete `products.csv` or keep it as an offline backup. To go live on Netlify, commit and push it.

### Your rebuild link (once)

Netlify only reads the sheet when it builds the site, so after editing the sheet you need to trigger a rebuild.

**Easiest: bookmark the Netlify deploys page.** In Netlify, open your site → **Deploys**, and bookmark that page (`https://app.netlify.com/sites/<your-site>/deploys`). To rebuild, open the bookmark and click **Trigger deploy → Deploy site**. This works on your phone too.

**One-click option: a build hook.**
1. In Netlify: **Site configuration → Build & deploy → Build hooks → Add build hook**. Name it "Sheet updated" and pick the `main` branch.
2. Netlify gives you a URL like `https://api.netlify.com/build_hooks/abc123`.
3. Make a bookmark in your browser, and paste this as its **URL**, with your hook in place of the example:
   ```
   javascript:fetch('https://api.netlify.com/build_hooks/abc123',{method:'POST',mode:'no-cors'}).then(()=>alert('Nomà is rebuilding, live in about 2 minutes'))
   ```
4. Clicking the bookmark starts a rebuild. It's best on a laptop, because phone browsers are fussy about bookmarks like this.

Keep the build hook URL private. Anyone who has it can trigger rebuilds, though they can't change anything on the site.

### If something doesn't show up

- **Check the build log** in Netlify (**Deploys** → click the latest one). Lines starting with `sheet:` show:
  - the columns it found,
  - any row whose slug doesn't match a product (usually a typo in the slug),
  - any price or status it didn't understand.
- **If the sheet can't be reached**, the site uses the last saved copy (`src/data/products.cache.json`) and still builds. The log will say `could not fetch the sheet`.

---

## Adding a brand-new product

The sheet updates existing products. A new product needs an entry in `products.json` first, because that's where its photos and category live.

1. **Copy an existing product** in `src/data/products.json`, from its `{` to its `},`, and paste it at the end of the list, before the final `]`. The last product must **not** have a comma after its `}`.
2. Change:
   - `slug`: lowercase words joined by dashes, unique, e.g. `diptyque-baies-candle-300g`. This becomes the page address: `/products/diptyque-baies-candle-300g`.
   - `category`: `scents` or `dinnerware` (later `body`).
   - `type`: `candle`, `diffuser`, `incense`, `glassware`, `mug`, `teaware`, `cutlery`, `plate`, `bowl` …
   - `images`: one line per photo, e.g. `"/images/products/diptyque-baies-candle-300g/1.webp"`.
   - `details` and `care`: descriptions (optional; empty sections are hidden).
   - `featured`: `true` to show it in "The Edit" on the homepage (keep it to 4 products).
   - `scentFamily`: `woody`, `floral`, `fresh`, `smoky` or `sweet` (the list is in `src/data/notes.ts`). Once a product has one, its note appears on **Shop by notes** and in the Scent family filter.
3. **Add a row to the sheet** with the same `slug`, and fill in brand, name, price and the rest.
4. **Add the photos** (below).
5. Save, commit and push to GitHub. Netlify rebuilds automatically.

"Newest" sorting uses the order in `products.json`, so new products go at the end.

---

## Scent options (one product, several scents)

Some products, like the Diptyque candles, come in several scents. In `src/data/products.json` they have a `variants` list, one entry per scent, each with its own notes:

```json
"variants": [
  { "name": "Baies", "notes": { "top": "Blackcurrant leaves", "heart": "Bulgarian rose", "base": "" } },
  { "name": "Figuier", "notes": { "top": "Fig leaf", "heart": "Green fig", "base": "Fig wood" } }
]
```

The product page shows the scents as buttons (the first is picked to start), shows the picked scent's notes, and adds the scent to the order message: *"Diptyque Scented Candle 190g in Figuier"*. The card says "7 scents", and search finds the scent names. To stop offering a scent, delete its entry. All scents share the product's price and stock status; if one scent sells out, remove it until it's back.

## Brands and notes (Scents menu)

Hovering **Scents** in the menu shows three photo tiles: **Shop All**, **Brands** and **Notes** (on phones they're text rows under Scents). Labels, links and photos all live in `src/data/nav.ts`. Give Dinnerware (or Body) a `children` list the same way and it gets its own submenu.

**Add a brand to Shop by brand:** add a line to `src/data/brands.ts`:
```
{ slug: 'le-labo', name: 'Le Labo', alt: 'A Le Labo candle in amber glass' },
```
- `slug` is the brand name as it's written in the sheet, lowercase, with dashes instead of spaces and no accents (`Côte Noire` → `cote-noire`).
- Photo: `public/images/brands/<slug>.jpg` (portrait 4:5). Until you add one, the tile is plain forest green.
- The number of pieces is counted for you. A brand with no scents yet is hidden.
- Tiles link to the Scents page with that brand ticked, e.g. `/scents?brand=le-labo`.

**Add or rename a note on Shop by notes:** edit `src/data/notes.ts`:
```
{ slug: 'sweet', name: 'Sweet', mood: 'Vanilla, amber, honey. Warm and gourmand.' },
```
- Then set `"scentFamily": "sweet"` on the products in `products.json`. A note with no products is hidden, and the build log warns about any `scentFamily` that isn't in the list.
- Photo: `public/images/notes/<slug>.jpg` (landscape 4:3).
- Tiles link to e.g. `/scents?family=sweet`.

**Other photos:** the three menu tiles are `public/images/nav/scents-all.jpg`, `scents-brands.jpg` and `scents-notes.jpg` (landscape 4:3, 1000px+ wide; the label sits bottom-left, so keep that corner calm). The page banners are `public/images/collections/scents-brands-hero.jpg` and `scents-notes-hero.jpg`.

You can link to any filtered view: `?brand=`, `?family=`, `?type=` (`candle`, `incense` …) and `?price=` (`u3`, `3-6`, `6-10`, `o10`), and combine them with `&`.

## Photos

**Product photos:** `public/images/products/<slug>/`
- `1` = main photo (cards, product page, share previews)
- `2` = shown when someone hovers over the card
- `3`, `4`, … = extra gallery photos
- `thumb` (optional) = shown **only** on product cards (shop, collections, "You may also like"). The product page still starts with `1`, and hovering the card shows `1`. Handy for a transparent cutout on the cards and a styled photo on the product page. No need to list it in `products.json`.

**Collection banners:** `public/images/collections/`
- `scents-hero`, `dinnerware-hero` (and later `body-hero`)
- Landscape, at least 2400px wide. The bottom-left corner sits under the title, so keep that area calm.

**Homepage photos:** `public/images/site/`: `hero`, `scents`, `dinnerware`, `story`.
- **Hero video (optional):** add `public/images/site/hero.mp4` and it plays over the hero photo: muted, looping, no controls. Delete it to go back to the photo. Keep the `hero` photo too: it shows while the video loads, and it's all that visitors who turn off motion on their device see.
  - Landscape, 1920×1080, H.264 MP4, 8–15 seconds, **no sound** and **under ~8 MB** so it starts fast on phones. The headline sits on the left, so keep that side calm.
  - Free tool to shrink it: HandBrake, "Web" preset, then drop quality until it's under 8 MB.

Rules:
- JPG, PNG or WebP all work. When replacing a photo, **delete the old one**: don't keep `1.webp` and `1.jpg` in the same folder.
- In `products.json`, always write `.webp` in the `images` list, even for a `.jpg`. The site finds the right file.
- Product photos: **portrait 4:5, at least 1600px wide**, the same background and light for every product.
- **Transparent PNG cutouts** (product on a see-through background) work too. The site trims the empty edges and scales every cutout to the same size. It centres each one with a soft shadow on the cream page, so there's no box around it. Any amount of empty space around the product is fine. Aim for **1200px+ tall**, because smaller cutouts get enlarged and can look soft. The build log warns you when that happens.
- To make cutouts bigger or smaller on the cards, change `FIT` near the top of `scripts/images.mjs` (0.66 = 66% of the frame width).
- iPhone: use **JPG, not HEIC** (Settings → Camera → Formats → Most Compatible).
- The site automatically makes smaller copies for phones during every build, and while `npm run dev` is running it redoes them as soon as you add or replace a photo.

---

## Previewing on your computer

```
npm run dev
```
Open http://localhost:4321. This also pulls the latest sheet and saves it to `products.cache.json`. Commit that file now and then, so the saved backup copy stays recent.
