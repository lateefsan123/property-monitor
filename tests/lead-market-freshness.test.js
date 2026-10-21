import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Buffer } from 'node:buffer';
import { createMarketBuildingResolver } from '../shared/market-building-resolver.js';

const bundle = await build({ entryPoints: ['shared/lead-insights.js'], bundle: true, platform: 'node', format: 'esm', write: false });
const { createLeadInsightServices } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const currentBuilding = { key: 'forteburjkhalifa', search_name: 'FORTE, BURJ KHALIFA', source: 'dld_citywide', source_project: 'FORTE', source_area: 'BURJ KHALIFA' };
const legacyBuilding = { key: 'fortet2', search_name: 'Forte T2' };
const sale = (key, date, amount) => ({ building_key: key, date, amount, beds: 2, builtup_area_sqft: 1089, location_name: 'FORTE', full_location: 'FORTE | BURJ KHALIFA' });
const oldSale = sale('fortet2', '2026-07-16', 3000000);
const newSale = sale('forteburjkhalifa', '2026-10-19', 2900000);

function fixture({ catalogue = [currentBuilding], transactions = [oldSale, newSale] } = {}) {
  let catalogueReads = 0;
  const client = {
    from(table) {
      let rows = table === 'buildings' ? [legacyBuilding, ...catalogue] : transactions;
      const query = {
        select() { return this; },
        eq(key, value) { rows = rows.filter(row => row[key] === value); return this; },
        in(key, values) { rows = rows.filter(row => values.includes(row[key])); return this; },
        order(key, { ascending }) { rows = [...rows].sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (ascending ? 1 : -1)); return this; },
        limit(count) { rows = rows.slice(0, count); return this; },
        range(from, to) { catalogueReads++; rows = rows.slice(from, to + 1); return this; },
        then(resolve) { return Promise.resolve({ data: rows, error: null }).then(resolve); },
      };
      return query;
    },
    async rpc(name, { target_keys }) {
      assert.equal(name, 'get_available_market_building_keys');
      return { data: [...new Set(transactions.map(row => row.building_key))].filter(key => target_keys.includes(key)).map(building_key => ({ building_key })), error: null };
    },
  };
  return { client, reads: () => catalogueReads };
}

test('Forte seller details and preview use the current automation feed despite populated legacy sales', async () => {
  const { client } = fixture();
  const service = createLeadInsightServices(client);
  const target = { id: 1, name: 'Demo seller', building: 'Forte T2' };
  const data = await service.fetchBuildingMarketData(['fortet2'], [target.building]);
  const { updates } = service.computeLeadInsights([target], data);
  assert.equal(updates[1].recentTransactions[0].price, 2900000);
  assert.equal(updates[1].recentTransactions[0].date.getDate(), 19);
  assert.match(updates[1].message, /19 Oct 2026/);
  assert.doesNotMatch(updates[1].message, /16 Jul 2026/);
  assert.equal(updates[1].locationName, 'FORTE, BURJ KHALIFA');
  assert.equal(target.building, 'Forte T2');
  assert.deepEqual(service.getMissingFallbackBuildingNames([target], data.transactionsByBuilding), []);
});

test('complete names keep area context and do not borrow another district or numbered tower', async () => {
  const service = createLeadInsightServices(fixture().client);
  const target = { id: 1, building: 'Forte 2, Dubai Marina' };
  const data = await service.fetchBuildingMarketData(['forte2dubaimarina'], [target.building]);
  assert.equal(service.computeLeadInsights([target], data).updates[1].status, 'error');
  const separateTower = { ...currentBuilding, key: 'fortetower1burjkhalifa', source_project: 'FORTE TOWER 1', search_name: 'FORTE TOWER 1, BURJ KHALIFA' };
  const other = createLeadInsightServices(fixture({ catalogue: [currentBuilding, separateTower] }).client);
  const legacy = await other.fetchBuildingMarketData(['fortet2'], ['Forte T2']);
  assert.equal(other.computeLeadInsights([{ id: 2, building: 'Forte T2' }], legacy).updates[2].recentTransactions[0].price, 3000000);
});

test('legacy sales remain available when the resolved feed has no transactions', async () => {
  const service = createLeadInsightServices(fixture({ transactions: [oldSale] }).client);
  const data = await service.fetchBuildingMarketData(['fortet2'], ['Forte T2']);
  assert.equal(service.computeLeadInsights([{ id: 1, building: 'Forte T2' }], data).updates[1].recentTransactions[0].price, 3000000);
});

test('a resolved market feed cannot replace more recent legacy sales with older dates', async () => {
  const fresherLegacy = sale('fortet2', '2026-10-20', 3100000);
  const service = createLeadInsightServices(fixture({ transactions: [fresherLegacy, newSale] }).client);
  const data = await service.fetchBuildingMarketData(['fortet2'], ['Forte T2']);
  const insight = service.computeLeadInsights([{ id: 1, building: 'Forte T2' }], data).updates[1];
  assert.equal(insight.recentTransactions[0].price, 3100000);
  assert.match(insight.message, /20 Oct 2026/);
  assert.equal(insight.locationName, 'Forte T2');
});

test('catalogue pagination and in-flight caching do not drop matches after the first 1000 buildings', async () => {
  const { client, reads } = fixture({ catalogue: [...Array.from({ length: 1000 }, (_, i) => ({ ...currentBuilding, key: `a${i}`, source_project: `Fixture ${i}`, search_name: `Fixture ${i}` })), currentBuilding] });
  const load = createMarketBuildingResolver(client);
  const [one, two] = await Promise.all([load(), load()]);
  assert.equal(one, two);
  assert.equal(one('Forte T2').key, currentBuilding.key);
  assert.equal(await load(), one);
  assert.equal(reads(), 2);
});

test('catalogue failure is visible and retryable instead of silently reporting stale market data', async () => {
  let fail = true;
  const { client } = fixture();
  const load = createMarketBuildingResolver({ from: (...args) => fail
    ? { select() { return this; }, eq() { return this; }, order() { return this; }, range: async () => ({ error: { message: 'internal database detail' } }) }
    : client.from(...args) });
  await assert.rejects(load(), /Could not load current property market data/);
  fail = false;
  assert.equal((await load())('Forte T2').key, currentBuilding.key);
});
