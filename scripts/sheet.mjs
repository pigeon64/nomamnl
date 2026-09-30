// Pulls the published Google Sheet (CSV), or a local products.csv, into src/data/products.cache.json.
// Runs before `npm run dev` and `npm run build`. If the fetch fails, the last cache is kept so the build never breaks.
// src/lib/products.ts merges the cache over products.json by slug.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CONFIG = 'src/config.ts', PRODUCTS = 'src/data/products.json', CACHE = 'src/data/products.cache.json', LOCAL = 'products.csv';
// Status cell, ignoring case/spaces/punctuation: "In stock", "pre-order", "SOLD_OUT"…
const STATUSES = { instock: 'in_stock', available: 'in_stock', preorder: 'pre_order', soldout: 'sold_out' };

// RFC 4180-ish CSV: quoted fields, "" escapes, commas and newlines inside quotes.
export function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

// Excel on Windows saves "CSV" as Windows-1252, not UTF-8 (ô, é, × turn into garbage). Accept both.
export function decode(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { console.log('sheet: file is not UTF-8, reading it as Excel/Windows text'); return new TextDecoder('windows-1252').decode(buf); }
}

// "Notes Top" / "notes-top" / "NOTES_TOP" → "notes_top"
export const normHeader = (h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// Turns sheet rows into { slug: { field: value } } with only the cells that should override products.json.
export function toOverrides(rows) {
  const [head, ...body] = rows;
  const cols = head.map(normHeader);
  const warnings = [], out = {};
  body.forEach((cells, n) => {
    const r = Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? '').trim()]));
    const line = n + 2; // sheet row number, counting the header
    if (!r.slug) { warnings.push(`row ${line}: no slug, skipped`); return; }
    if (out[r.slug]) warnings.push(`row ${line}: duplicate slug "${r.slug}", later row wins`);
    const o = {};
    for (const k of ['brand', 'name', 'size']) if (r[k]) o[k] = r[k];
    // Empty price cell = "Price on request". "₱3,500", "3500", "3,500.00" all → 3500.
    if ('price' in r) {
      const digits = r.price.replace(/[^0-9.]/g, '');
      const n = r.price ? Math.round(Number(digits)) : 0;
      if (!r.price || (digits && Number.isFinite(n))) o.price = n;
      else warnings.push(`row ${line}: price "${r.price}" not understood, ignored`);
    }
    if (r.status) {
      const s = STATUSES[r.status.toLowerCase().replace(/[^a-z]/g, '')];
      if (s) o.status = s; else warnings.push(`row ${line}: status "${r.status}" not understood (use In stock / Pre-order / Sold out), ignored`);
    }
    if (r.preorder_lead_time) o.preorderLeadTime = r.preorder_lead_time;
    const notes = {};
    for (const k of ['top', 'heart', 'base']) if (r[`notes_${k}`]) notes[k] = r[`notes_${k}`];
    if (Object.keys(notes).length) o.notes = notes;
    out[r.slug] = o;
  });
  return { columns: cols, overrides: out, warnings };
}

async function main() {
  // Source order: published sheet URL → local products.csv → last saved cache.
  const url = readFileSync(CONFIG, 'utf8').match(/productSheetCsvUrl:\s*'([^']*)'/)?.[1] ?? '';
  let text;
  if (url) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
      if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('got a web page, not CSV — is the sheet published as CSV?');
      console.log('sheet: using the published Google Sheet');
    } catch (e) {
      console.warn(`sheet: ⚠ could not fetch the sheet (${e.message}).`);
    }
  }
  if (!text && existsSync(LOCAL)) {
    text = decode(readFileSync(LOCAL));
    console.log(`sheet: using local ${LOCAL}`);
  }
  if (!text) {
    console.log(`sheet: no sheet URL or ${LOCAL}; using products.json + last saved copy in ${CACHE}`);
    return;
  }

  const { columns, overrides, warnings } = toOverrides(parseCsv(text));
  const slugs = new Set(JSON.parse(readFileSync(PRODUCTS, 'utf8')).map((p) => p.slug));
  const unmatched = Object.keys(overrides).filter((s) => !slugs.has(s));
  const missing = [...slugs].filter((s) => !overrides[s]);
  const known = ['slug', 'brand', 'name', 'size', 'price', 'status', 'preorder_lead_time', 'notes_top', 'notes_heart', 'notes_base'];

  console.log(`sheet: columns found: ${columns.join(', ')}`);
  const ignored = columns.filter((c) => !known.includes(c));
  if (ignored.length) console.log(`sheet: columns ignored (not used by the site): ${ignored.join(', ')}`);
  if (!columns.includes('slug')) { console.warn('sheet: ⚠ no "slug" column, cannot match rows. Keeping last saved copy.'); return; }
  for (const w of warnings) console.warn(`sheet: ⚠ ${w}`);
  for (const s of unmatched) console.warn(`sheet: ⚠ row slug "${s}" does not match any product in products.json, ignored`);
  if (missing.length) console.log(`sheet: ${missing.length} product(s) not in the sheet, using products.json values: ${missing.join(', ')}`);

  for (const s of unmatched) delete overrides[s];
  writeFileSync(CACHE, JSON.stringify({ fetchedAt: new Date().toISOString(), columns, overrides }, null, 2) + '\n');
  console.log(`sheet: ✓ ${Object.keys(overrides).length} product(s) updated from the sheet`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
