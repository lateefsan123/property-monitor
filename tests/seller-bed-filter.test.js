import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Buffer } from 'node:buffer';
import process from 'node:process';

const bundle = await build({ stdin: { contents: "export * from './src/features/seller-signal/selectors.js'; export * from './src/features/seller-signal/saved-views.js';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false });
const { filterLeads, findMatchingSellerView, getSellerViewFilters, sellerBedBucket } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('bedroom cells map to Studio, 1, 2, 3 and 4+ buckets', () => {
  const cases = {
    Studio: 'studio', 'STUDIO APT': 'studio', '0': 'studio',
    '1': '1', '1 bed': '1', '1BR': '1', '1 Bedroom + Study': '1',
    '2': '2', '2 bed': '2', '3 Bedrooms': '3',
    '4': '4', '5BR': '4', '8 bed': '4',
    '': '', '  ': '', Office: '', Penthouse: '', '120': '',
  };
  for (const [cell, bucket] of Object.entries(cases)) assert.equal(sellerBedBucket(cell), bucket, cell);
});

test('the bedroom filter keeps only the picked buckets', () => {
  const leads = [
    { id: 'a', bedroom: 'Studio' },
    { id: 'b', bedroom: '1 bed' },
    { id: 'c', bedroom: '2BR' },
    { id: 'd', bedroom: '' },
  ];
  const pick = (bedFilter) => filterLeads({ activeLeads: leads, doneLeads: [], bedFilter, insights: {}, searchTerm: '', viewTab: 'active' }).map((lead) => lead.id);
  assert.deepEqual(pick([]), ['a', 'b', 'c', 'd']);
  assert.deepEqual(pick(['studio']), ['a']);
  assert.deepEqual(pick(['1', '2']), ['b', 'c']);
});

test('saved views remember the bedroom filter', () => {
  const view = { id: 'v', label: '2 bed', filters: getSellerViewFilters({ bedFilter: ['2'] }) };
  assert.equal(findMatchingSellerView([view], { bedFilter: ['2'] })?.id, 'v');
  assert.equal(findMatchingSellerView([view], { bedFilter: [] }), null);
});
