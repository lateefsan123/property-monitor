import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssistantMarket, marketResultCards, salesFilters, summarizeSales } from '../shared/assistant-market.js';
import { createVoiceWorkspace } from '../shared/voice-workspace.js';
import { executeVoiceTool, VOICE_TOOLS } from '../shared/voice-tools.js';
import { marketInstructions, ASSISTANT_PROMPTS } from '../shared/assistant-prompts.js';
import { voiceSessionConfig } from '../server/voice-session.js';

const args = { building_key: 'forte2', area: '', start_date: '2026-08-01', end_date: '2026-08-31', beds: '', property_type: '', min_area_sqft: '', max_area_sqft: '' };
const sale = (amount = 2000000, size = 1000, extra = {}) => ({ id: 1, amount, builtup_area_sqft: size, date: '2026-08-10', category: 'Sale | Sale', beds: '2', property_type: 'Flat | Unit', location_name: 'Forte 2', created_at: '2026-09-21', ...extra });

function fixture({ rows = [sale()], count = rows.length, edgeError = false, owner = 'owner', latest = '2026-08-10', earliest = latest, buildings } = {}) {
  const calls = [], edge = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: owner } } }) },
    from(table) {
      const steps = [], q = {};
      for (const name of ['select', 'or', 'order', 'limit', 'eq', 'ilike', 'gte', 'lte', 'range', 'abortSignal']) q[name] = (...args) => { steps.push([name, ...args]); return q; };
      q.then = (resolve, reject) => Promise.resolve().then(() => {
        calls.push({ table, steps });
        if (table === 'buildings') {
          const data = buildings ? buildings(steps) : [{ key: 'forte2', search_name: 'Forte 2', location_name: 'Downtown Dubai' }];
          return { data, count: data.length };
        }
        const range = steps.find(s => s[0] === 'range');
        if (!range) {
          const date = steps.find(s => s[0] === 'order')?.[2]?.ascending ? earliest : latest;
          return { data: date ? [{ date }] : [], count };
        }
        return { data: rows.slice(range[1], range[2] + 1), count };
      }).then(resolve, reject);
      return q;
    },
    functions: { invoke: async (name, options) => {
      edge.push({ name, ...options });
      if (edgeError) return { error: new Error('private provider detail') };
      if (options.body.mode === 'search') return { data: { locations: [{ locationId: '123', buildingName: 'Burj Khalifa', fullPath: 'Dubai > Downtown Dubai' }] } };
      return { data: { buildings: [{ locationId: '123', latestVerifiedAt: '2026-09-20', listings: [
        { title: 'Two bed', price: 3000000, beds: 2, areaSqft: 1300 }, { title: 'Studio', price: 1000000, beds: 0, areaSqft: 400 },
      ] }] } };
    } },
  };
  return { supabase, calls, edge, market: createAssistantMarket({ supabase, now: () => new Date('2026-09-21T12:00:00Z') }) };
}

test('sales calculations use all rows, weighted sqft and missing size denominator', () => {
  const { summary } = summarizeSales([sale(1000000, 1000), sale(6000000, 3000), sale(2000000, null)], salesFilters(args));
  assert.equal(summary.count, 3);
  assert.equal(summary.totalValueAed, 9000000);
  assert.equal(summary.averagePriceAed, 3000000);
  assert.equal(summary.medianPriceAed, 2000000);
  assert.equal(summary.pricePerSqftAed, 1750);
  assert.equal(summary.pricePerSqftSampleSize, 2);
});

test('exclude nominal transfers, rents, gifts, unknown categories and unmatched types/beds', () => {
  const rows = [sale(), sale(1), sale(2000000, 1000, { category: 'Gift' }), sale(2000000, 1000, { category: null }),
    sale(2000000, 1000, { category: 'Rental Sale' }), sale(2000000, 1000, { category: 'Partial Sale' }),
    sale(2000000, 1000, { beds: null }), sale(2000000, 1000, { property_type: 'Villa' })];
  const result = summarizeSales(rows, salesFilters({ ...args, beds: '2', property_type: 'apartment' }));
  assert.equal(result.summary.count, 1);
  const studio = summarizeSales([sale(1000000, 400, { beds: 'Studio' }), sale()], salesFilters({ ...args, beds: '0', max_area_sqft: '500' }));
  assert.equal(studio.summary.count, 1);
});

test('reject invalid dates, broad queries and invalid bounds before querying', () => {
  for (const patch of [{ start_date: '2026-02-30' }, { start_date: '2027-01-01' }, { start_date: '2020-01-01' },
    { building_key: '', area: '' }, { beds: 'any' }, { min_area_sqft: '-1' }, { min_area_sqft: '1500', max_area_sqft: '1000' }]) {
    assert.throws(() => salesFilters({ ...args, ...patch }));
  }
});

test('resolved sales keys only; pages beyond first 250 contribute to aggregates', async () => {
  const rows = Array.from({ length: 260 }, (_, i) => sale(1000000 + i, 1000, { id: i }));
  const f = fixture({ rows });
  await assert.rejects(f.market.read('market_sales', args), /Find the sales building/);
  await f.market.read('market_locations', { query: 'Forte', source: 'sales' });
  const r = await f.market.read('market_sales', args);
  assert.equal(r.complete, true); assert.equal(r.summary.count, 260); assert.equal(r.items.length, 20);
  assert.equal(r.summary.averagePriceAed, 1000129.5);
  const pages = f.calls.filter(c => c.steps.some(s => s[0] === 'range'));
  assert.equal(pages.length, 2);
  for (const page of pages) {
    assert.ok(page.steps.some(s => s[0] === 'eq' && s[1] === 'building_key' && s[2] === 'forte2'));
    assert.ok(page.steps.some(s => s[0] === 'gte' && s[2] === '2026-08-01'));
    assert.ok(page.steps.some(s => s[0] === 'lte' && s[2] === '2026-08-31'));
  }
  assert.equal(r.coverage.latestRecordedSale, '2026-08-10');
  assert.match(r.limitations, /not all Dubai/);
});

test('more than 5000 records withholds all totals and averages rather than extrapolating', async () => {
  const f = fixture({ rows: Array.from({ length: 5001 }, (_, id) => sale(2000000, 1000, { id })) });
  const r = await f.market.read('market_sales', { ...args, building_key: '', area: 'Downtown Dubai' });
  assert.equal(r.complete, false); assert.equal(r.scannedRows, 5000); assert.equal(r.summary, null); assert.equal(r.total, null);
  assert.match(r.note, /Narrow/);
  assert.ok(f.calls.every(c => c.steps.some(s => s[0] === 'ilike' && s[1] === 'full_location')));
});

test('empty sales are zero imported matches, not a claim about market activity', async () => {
  const f = fixture({ rows: [] });
  const r = await f.market.read('market_sales', { ...args, building_key: '', area: 'Dubai Marina' });
  assert.equal(r.summary, null); assert.equal(r.total, null);
  assert.equal(r.coverage.availability, 'no_matching_records');
  assert.equal(marketResultCards(r)[0].title, 'No matching imported sales');
});

test('Forte 1 stale history produces coverage guidance, never a zero-sales card', async () => {
  const f = fixture({ rows: [], latest: '2026-03-06', earliest: '2025-08-01' });
  const r = await f.market.read('market_sales', { ...args, building_key: '', area: 'Forte 1', start_date: '2026-09-01', end_date: '2026-09-21' });
  assert.equal(r.summary, null); assert.equal(r.total, null);
  assert.equal(r.coverage.availability, 'outside_recorded_range');
  assert.match(r.emptyState.detail, /2026-03-06/);
  assert.doesNotMatch(JSON.stringify(marketResultCards(r)), /0 (recorded|imported|qualifying) sales/);
  assert.match(marketInstructions(), /lead with the coverage limitation/);
});

test('missing history and periods before the first record are unavailable, not zero', async () => {
  for (const dates of [{ latest: null }, { earliest: '2026-09-01', latest: '2026-09-20' }]) {
    const f = fixture({ rows: [], ...dates });
    const r = await f.market.read('market_sales', { ...args, building_key: '', area: 'Dubai Marina' });
    assert.equal(r.summary, null); assert.equal(r.total, null);
    assert.match(r.coverage.availability, /no_history|outside_recorded_range/);
    assert.ok(marketResultCards(r).length);
  }
});

test('Fort 1 fallback preserves tower number and discloses the spelling match', async () => {
  const f = fixture({ buildings: steps => steps.some(s => s[0] === 'or' && s[1].includes('%Forte 1%'))
    ? [{ key: 'forte1', search_name: 'Forte 1', location_name: 'Forte 1' }] : [] });
  const r = await f.market.read('market_locations', { query: 'Fort 1', source: 'sales' });
  assert.equal(r.matchedQuery, 'Forte 1'); assert.equal(r.items[0].key, 'forte1');
  assert.match(r.note, /Tell the user/);
  assert.equal(f.calls.length, 2);
  const other = fixture({ buildings: () => [] });
  const no = await other.market.read('market_locations', { query: 'Fort 3', source: 'sales' });
  assert.deepEqual(no.items, []); assert.equal(other.calls.length, 1);
});

test('Bayut resolves provider IDs, supports studio, labels asking-price samples and caching', async () => {
  const f = fixture();
  await assert.rejects(f.market.read('market_listings', { location_key: '123', beds: '' }), /Search Bayut/);
  await f.market.read('market_locations', { query: 'Burj Khalifa', source: 'bayut' });
  const r = await f.market.read('market_listings', { location_key: '123', beds: 'studio' });
  assert.equal(r.sampleSize, 1); assert.equal(r.items[0].beds, '0'); assert.equal(r.priceType, 'asking');
  assert.equal(r.complete, false); assert.match(r.note, /cached/); assert.match(r.note, /not completed sales/);
  assert.equal(f.edge[1].body.locations.length, 1);
  assert.match(marketResultCards(r)[0].meta, /Asking price/);
});

test('provider failures are not zero inventory; cancellation prevents requests', async () => {
  const f = fixture({ edgeError: true });
  await assert.rejects(f.market.read('market_locations', { query: 'Forte', source: 'bayut' }), /temporarily unavailable/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(f.market.read('market_locations', { query: 'Forte', source: 'sales' }, controller.signal), /stopped/);
  assert.equal(f.calls.length, 0);
});

test('market tools share the authenticated workspace gate and reject unknown parameters', async () => {
  const f = fixture({ owner: 'other' });
  const workspace = createVoiceWorkspace({ supabase: f.supabase, userId: 'owner' });
  await assert.rejects(executeVoiceTool('market_locations', { query: 'Forte', source: 'sales' }, { workspace }), /sign in/);
  assert.equal(f.calls.length, 0);
  await assert.rejects(executeVoiceTool('market_locations', { query: 'Forte', source: 'sales', user_id: 'other' }, { workspace }));
});

test('voice and text share market tools and source guardrails, with Dubai date context', () => {
  const config = voiceSessionConfig();
  for (const name of ['market_locations', 'market_sales', 'market_listings']) assert.ok(VOICE_TOOLS.some(t => t.name === name));
  assert.match(config.instructions, /Delegate every request about market data/);
  assert.match(config.delegation.responses.instructions, /individual|per-row provider/);
  assert.match(marketInstructions(new Date('2026-08-31T22:00:00Z')), /2026-09-01/);
  assert.equal(ASSISTANT_PROMPTS.length, 4); assert.ok(!ASSISTANT_PROMPTS.join(' ').includes('account'));
});
