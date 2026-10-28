import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransactionBuildingResolver, loadTransactionBuildingMatches } from '../supabase/functions/_shared/transaction-building-matches.js';
import { loadAutomaticAliases } from '../supabase/functions/_shared/automatic-aliases.js';

const row = (source_project, source_area) => ({ key: (source_project + source_area).toLowerCase().replace(/[^a-z0-9]/g, ''),
  search_name: `${source_project}, ${source_area}`, source_project, source_area, source: 'dld_citywide' });
const catalogue = [row('ZADA TOWER', 'BUSINESS BAY'), row('Ahad Residences', 'BUSINESS BAY'),
  row('The St. Regis Residences, Downtown Dubai', 'BURJ KHALIFA'),
  row('Marina Tower 1', 'DUBAI MARINA'), row('Marina Tower 2', 'DUBAI MARINA'),
  row('Common Tower', 'BUSINESS BAY'), row('Common Tower', 'DUBAI MARINA'), row('Bliss Tower', 'DUBAI LAND'),
  row('FORTE', 'BURJ KHALIFA'), row('29 BOULEVARD', 'BURJ KHALIFA'), row('CREEK GATE', 'DUBAI CREEK HARBOUR'),
  row('CREEK GATE TOWER 1', 'DUBAI CREEK HARBOUR')];
const resolve = createTransactionBuildingResolver(catalogue);

test('legacy project names resolve to the actual area-qualified transaction key', () => {
  assert.equal(resolve('ZADA TOWER').key, 'zadatowerbusinessbay');
  assert.equal(resolve('Ahad residence').key, 'ahadresidencesbusinessbay');
  assert.equal(resolve('Ahad Residences, BUSINESS BAY').key, 'ahadresidencesbusinessbay');
  assert.equal(resolve('zadatowerbusinessbay').key, 'zadatowerbusinessbay');
});

test('verified St Regis tower names use development sales without changing tower identity', () => {
  for (const name of ['ST REGIS TOWER 1', 'ST REGIS TOWER2', 'St Regis tower 2',
    'The St. Regis The Residences Tower 1, Downtown Dubai', 'The St. Regis The Residences Tower 2, Downtown Dubai']) {
    assert.equal(resolve(name).key, 'thestregisresidencesdowntowndubaiburjkhalifa');
    assert.equal(resolve(name).scope, 'development');
  }
  assert.equal(resolve('ST REGIS TOWER 3'), null);
  assert.equal(createTransactionBuildingResolver([...catalogue, row('St Regis Tower 1', 'BURJ KHALIFA')])('ST REGIS TOWER2'), null);
});

test('rejects ambiguous areas, unknown places, different numbered towers and loose names', () => {
  for (const raw of ['Common Tower', 'ZADA TOWER, DUBAI MARINA', 'ZADA TOWER, Unknown Area', 'Marina Tower 3', 'Marina Tower', 'Bliss']) {
    assert.equal(resolve(raw), null, raw);
  }
  assert.equal(resolve('Marina Twr 2').key, 'marinatower2dubaimarina');
  assert.equal(resolve('Common Tower, BUSINESS BAY').key, 'commontowerbusinessbay');
});

test('resolves development sales only without conflicting DLD tower records and keeps area context', () => {
  for (const raw of ['Forte tower 1', 'Forte 2, Downtown Dubai']) {
    assert.equal(resolve(raw).key, 'forteburjkhalifa');
    assert.equal(resolve(raw).scope, 'development');
  }
  assert.equal(resolve('29 Boulevard Tower 1, Downtown Dubai').key, '29boulevardburjkhalifa');
  assert.equal(resolve('29 Boulevard t2').key, '29boulevardburjkhalifa');
  assert.equal(resolve('Forte 2, Dubai Marina'), null);
  assert.equal(resolve('Creek Gate Tower 2'), null);
});

const client = (pages, error = null, projects = []) => ({ from(table) {
  assert.ok(['buildings', 'building_resolutions'].includes(table));
  return { select() { return this; }, in() { return this; }, eq() { return this; }, order() { return this; },
    range(from) { return Promise.resolve({ data: table === 'buildings' ? pages[from / 1000] || [] : projects.slice(from, from + 1000), error: table === 'buildings' ? error : null }); } };
} });

test('reviewed project scope survives aliases without affecting another account or a changed target', async () => {
  const project = row('CELESTIA', 'DUBAI SOUTH');
  const aliases = new Map([['u:celestiaa', new Set([project.search_name])], ['other:celestiaa', new Set([project.search_name])]]);
  const leads = [{ user_id: 'u', building: 'Celestia A' }, { user_id: 'other', building: 'Celestia A' }];
  const choices = [{ user_id: 'u', raw_name: 'Celestia A', building_key: project.key }];
  const result = await loadTransactionBuildingMatches(client([[project]], null, choices), leads, aliases, () => []);
  assert.equal(result.matches.get('u|Celestia A').scope, 'development');
  assert.equal(result.matches.get('other|Celestia A').scope, 'building');
  choices[0].building_key = 'different-project';
  const changed = await loadTransactionBuildingMatches(client([[project]], null, choices), leads, aliases, () => []);
  assert.equal(changed.matches.get('u|Celestia A').scope, 'building');
});
test('reads the full catalogue and respects account aliases ahead of global choices', async () => {
  const aliases = new Map([['u:raw', new Set(['Ahad residence'])], ['*:raw', new Set(['ZADA TOWER'])],
    ['other:raw', new Set(['Marina Tower 2'])]]);
  const leads = [{ user_id: 'u', building: 'raw' }, { user_id: 'other', building: 'raw' }, { user_id: 'u', building: 'raw' }];
  const { matches, summary } = await loadTransactionBuildingMatches(client([Array.from({ length: 1000 }, (_, n) => row(`Fixture ${n}`, 'AREA')), catalogue]), leads, aliases, () => []);
  assert.equal(matches.get('u|raw').key, 'ahadresidencesbusinessbay');
  assert.equal(matches.get('other|raw').key, 'marinatower2dubaimarina');
  assert.equal(summary.buildings, 2);
  assert.equal(summary.matched, 2);
});
test('reports unresolved names and fails the run when the catalogue cannot be read', async () => {
  const leads = [{ user_id: 'u', building: 'Unknown Tower' }];
  const result = await loadTransactionBuildingMatches(client([catalogue]), leads, new Map(), () => []);
  assert.equal(result.matches.get('u|Unknown Tower'), null);
  assert.deepEqual(result.summary.unresolved, [{ userId: 'u', building: 'Unknown Tower' }]);
  await assert.rejects(loadTransactionBuildingMatches(client([], { message: 'offline' }), leads, new Map(), () => []), /catalogue: offline/);
});

test('automatic resolution read errors cannot silently masquerade as no matching sales', async () => {
  const broken = { from() { return { select() { return this; }, in() { return this; }, eq() { return this; }, order() { return this; },
    range: async () => ({ data: null, error: { message: 'resolution unavailable' } }) }; } };
  await assert.rejects(loadAutomaticAliases(broken, ['u']), /automatic building matches: resolution unavailable/);
});
