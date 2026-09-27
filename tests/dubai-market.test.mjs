import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDubaiMarket, dateWindow, fetchDubaiExport } from '../scripts/lib/dubai-market.mjs';
import { syncDubaiMarket } from '../scripts/import-dubai-market.mjs';
import { matchBayutLocation } from '../shared/bayut-location-match.js';
import { selectCachedBuildings } from '../shared/cached-buildings.js';

const period = { start: '2026-09-01', end: '2026-09-27' };
const base = { TRANSACTION_NUMBER: '11-123-2026', PROJECT_EN: 'Marina Tower', AREA_EN: 'DUBAI MARINA',
  INSTANCE_DATE: '2026-09-25 14:00:00', TRANS_VALUE: '1500000', PROP_SB_TYPE_EN: 'Flat',
  PROCEDURE_EN: 'Sale', ACTUAL_AREA: '90', PROCEDURE_AREA: '90', ROOMS_EN: '2 B/R', IS_OFFPLAN_EN: 'Ready' };
function csv(rows) {
  const headers = [...new Set(rows.flatMap(Object.keys))];
  const cell = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map(r => headers.map(h => cell(r[h])).join(','))].join('\n');
}
const market = rows => buildDubaiMarket(csv(rows), period);

test('discovers projects across Dubai without the seller sheet or Downtown registry', () => {
  const data = market([base, { ...base, TRANSACTION_NUMBER: '2', PROJECT_EN: 'Lake Tower', AREA_EN: 'JUMEIRAH LAKES TOWERS' }]);
  assert.equal(data.buildings.length, 2);
  assert.equal(data.summary.areas.length, 2);
  assert.equal(data.transactions[0].builtup_area_sqft, 968.75);
  assert.equal(data.transactions[0].beds, '2');
  assert.equal(data.buildings[0].search_name, 'Marina Tower, DUBAI MARINA');
});
test('never merges same-name projects across areas or numbered towers', () => {
  const data = market([base, { ...base, TRANSACTION_NUMBER: '2', AREA_EN: 'BUSINESS BAY' },
    { ...base, TRANSACTION_NUMBER: '3', PROJECT_EN: 'Marina Tower 2' }]);
  assert.equal(new Set(data.buildings.map(b => b.key)).size, 3);
});
test('skips offices, blank projects, partial transfers, nominal and out-of-window sales', () => {
  const rows = [base, { ...base, PROP_SB_TYPE_EN: 'Office' }, { ...base, PROJECT_EN: '' },
    { ...base, PROCEDURE_AREA: '40' }, { ...base, TRANS_VALUE: '3500' },
    { ...base, INSTANCE_DATE: '2026-08-01' }, { ...base, PROCEDURE_EN: 'Mortgage' }];
  const data = market(rows);
  assert.equal(data.transactions.length, 1);
  assert.deepEqual(data.summary.skipped, { nonResidentialUnit: 1, missingProjectOrArea: 1, partialShare: 1, invalidComp: 1, outsideWindow: 1, nonSale: 1 });
});
test('keeps distinct identical-price sales using source IDs and rejects conflicting IDs', () => {
  assert.equal(market([base, { ...base, TRANSACTION_NUMBER: '2' }, base]).transactions.length, 2);
  assert.throws(() => market([base, { ...base, TRANS_VALUE: '1600000' }]), /Conflicting/);
});
test('fails closed for truncated or invalid export', () => {
  assert.throws(() => market([{ ...base, TOTAL: '20' }]), /Incomplete/);
  assert.throws(() => buildDubaiMarket('<html>Failure</html>'), /Missing/);
  assert.equal(market([{ ...base, PROJECT_EN: 'Studio One' }, { ...base, TRANSACTION_NUMBER: '2', PROJECT_EN: 'One' }]).buildings.length, 2);
});
test('date window is inclusive and export uses an unrestricted area filter', async () => {
  assert.deepEqual(dateWindow(27, new Date('2026-09-27T12:00:00Z')), period);
  assert.throws(() => dateWindow(0), /Days/);
  await fetchDubaiExport(period, async (_url, options) => {
    const p = JSON.parse(options.body).parameters;
    assert.equal(p.P_AREA_ID, ''); assert.equal(p.P_FROM_DATE, '09/01/2026');
    return { ok: true, text: async () => csv([base]) };
  });
  await assert.rejects(fetchDubaiExport(period, async () => ({ ok: false, status: 500 })), /HTTP 500/);
});
test('Bayut rejects unrelated, parent, numbered sibling and ambiguous matches', () => {
  assert.equal(matchBayutLocation([{ id: 1, name: 'Madinat Hind 4' }], 'ZAABEEL ONE'), null);
  assert.equal(matchBayutLocation([{ id: 1, name: 'Burj Views', path: 'Dubai | Burj Views' }], 'Burj Views Tower C'), null);
  assert.equal(matchBayutLocation([{ id: 1, name: 'Forte 2' }], 'Forte 1'), null);
  assert.equal(matchBayutLocation([{ id: 1, name: 'Tower C' }], 'Tower C'), null);
  assert.equal(matchBayutLocation([{ id: 1, name: 'Tower C' }, { id: 2, name: 'Tower C' }], 'Tower C'), null);
  assert.equal(matchBayutLocation([{ id: 7, location: ['Dubai', 'Marina', 'Marina Tower'] }], 'Marina Tower').id, 7);
});
test('citywide sync batches to 500 and stops on a failed batch', async () => {
  const data = { buildings: [{ key: 'a' }], transactions: Array.from({ length: 1100 }, (_, i) => ({ building_key: 'a', source_transaction_id: String(i) })) };
  const sizes = [];
  assert.equal(await syncDubaiMarket(data, async (b, t) => { assert.equal(b.length, 1); sizes.push(t.length); }), 1100);
  assert.deepEqual(sizes, [500, 500, 100]);
  let calls = 0;
  await assert.rejects(syncDubaiMarket(data, async () => { if (++calls === 2) throw new Error('batch failed'); }), /batch failed/);
  assert.equal(calls, 2);
});
test('building catalogue loads beyond 1000 with stable ordering', async () => {
  const rows = Array.from({ length: 2333 }, (_, i) => ({ key: String(i) }));
  const orders = [];
  const db = { from: () => ({ select: () => {
    const q = { order: name => { orders.push(name); return q; }, range: async (a, b) => ({ data: rows.slice(a, b + 1), count: rows.length }) };
    return q;
  } }) };
  assert.deepEqual(await selectCachedBuildings(db), rows);
  assert.deepEqual(orders, ['search_name', 'key', 'search_name', 'key', 'search_name', 'key']);
});
