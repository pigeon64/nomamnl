// Run: node scripts/sheet.test.mjs
import assert from 'node:assert/strict';
import { parseCsv, toOverrides, decode } from './sheet.mjs';

const csv = '﻿Slug,Brand,Name,Size,Price,Status,Notes Top,Notes Heart,Notes Base,Supplier\r\n' +
  'diptyque-scented-candle-190g,Diptyque,Baies Candle,190g,"₱3,500",In stock,Blackcurrant leaves,"Rose, Bulgarian",,Acme\r\n' +
  'le-labo-scented-candle-200g,,"Santal 26 ""Classic"" Candle",,,Pre-order,,,,\n' +
  ',,,,,,,,,\n' +
  'wedgwood-gio-mug-set,,,,abc,maybe,,,,\n';

assert.deepEqual(parseCsv('a,"b,\nc"\n1,2'), [['a', 'b,\nc'], ['1', '2']]);

const { columns, overrides, warnings } = toOverrides(parseCsv(csv));
assert.deepEqual(columns.slice(0, 7), ['slug', 'brand', 'name', 'size', 'price', 'status', 'notes_top']);
assert.deepEqual(overrides['diptyque-scented-candle-190g'], {
  brand: 'Diptyque', name: 'Baies Candle', size: '190g', price: 3500, status: 'in_stock',
  notes: { top: 'Blackcurrant leaves', heart: 'Rose, Bulgarian' },
});
// Empty price = price on request (0); empty text cells don't override.
assert.deepEqual(overrides['le-labo-scented-candle-200g'], { name: 'Santal 26 "Classic" Candle', price: 0, status: 'pre_order' });
// Bad price and status are ignored with warnings; blank rows are dropped.
assert.deepEqual(overrides['wedgwood-gio-mug-set'], {});
assert.equal(warnings.length, 2);
// Excel's Windows-1252 "CSV" and real UTF-8 both decode correctly.
assert.equal(decode(Buffer.from([0x4c, 0x61, 0x6e, 0x63, 0xf4, 0x6d, 0x65, 0x20, 0xd7])), 'Lancôme ×');
assert.equal(decode(Buffer.from('Lancôme ×', 'utf8')), 'Lancôme ×');
console.log('sheet.test: all passed');
