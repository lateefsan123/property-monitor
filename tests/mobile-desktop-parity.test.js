import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { Buffer } from 'node:buffer';
import process from 'node:process';

// Bundle the real application modules so Node can resolve their Metro/Vite imports.
const bundle = await build({ stdin: { contents: `
 export * from './src/features/seller-signal/lead-utils.js';
 export * from './mobile/src/features/seller-signal/selectors.js';
 export * from './shared/home-insights.js';
 export * from './shared/message-templates.js';
 export * from './shared/automation-settings.js';
 export * from './shared/lead-insights.js';
 export * from './src/features/listing-alerts/change-detection.js';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('native queue follows the desktop cadence, including sent dates and unknown statuses', () => {
  const today = new Date('2026-09-12T12:00:00');
  const rows = [
    { id: 'due', name: 'A', status: 'Prospect', last_contact: '2026-01-01' },
    { id: 'sent', name: 'B', status: 'Prospect', last_contact: '2026-01-01', sent_at: '2026-09-11T12:00:00Z' },
    { id: 'unknown', name: 'C', status: 'Other', last_contact: '2026-01-01' },
    { id: 'cold', name: 'D', status: 'Not Interested' },
  ].map((row, index) => api.mapStoredLeadRow(row, index, today));
  const desktop = api.summarizeLeadCadence(rows);
  const native = api.splitLeadsBySentStatus(rows);
  assert.equal(native.activeLeads.length, desktop.due);
  assert.equal(native.doneLeads.length, desktop.scheduled);
  assert.deepEqual(native.activeLeads.map(row => row.id), ['due', 'unknown']);
  assert.deepEqual(native.doneLeads.map(row => row.id), ['sent']);
});

test('scheduled sellers respect status, source, market-data and unit search filters', () => {
  const doneLeads = [{ id: '1', statusRule: { id: 'prospect' }, sourceId: 'a', unit: '401', dataQuality: { level: 'review' } }, { id: '2', statusRule: { id: 'market_appraisal' }, sourceId: 'a', unit: '401' }];
  const filtered = api.filterLeads({ activeLeads: [], doneLeads, dataFilter: 'with_data', dataQualityFilter: 'review', insights: { 1: { status: 'ready' } }, searchTerm: '401', showDueOnly: true, sourceFilter: 'a', statusFilter: ['prospect'], viewTab: 'done' });
  assert.deepEqual(filtered.map(row => row.id), ['1']);
});

test('daily chart excludes queued and failed messages', () => {
  const { buildDailyMessageSeries } = api.createHomeInsightServices(null, api);
  const sent_at = new Date().toISOString();
  const series = buildDailyMessageSeries(['sent', 'read', 'delivered', 'failed', 'queued'].map(status => ({ status, sent_at, queued_at: sent_at })));
  assert.equal(series.length, 14);
  assert.equal(series.reduce((sum, day) => sum + day.count, 0), 3);
});

test('price-drop rows retain the real history needed by the mobile detail screen', async () => {
  const at = new Date().toISOString();
  const entry = { id: '123', locationId: '456', currentPrice: 900000, dropsCount: 1, totalChanges: 1, priceHistory: [{ type: 'price_drop', at, price: 900000, previousPrice: 1000000, priceDelta: -100000 }] };
  const query = { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { listing_history: { '456:123': entry } }, error: null }) };
  const service = api.createHomeInsightServices({ from: () => query }, api);
  const drops = await service.fetchListingPriceDrops('u');
  assert.equal(drops.length, 1);
  assert.equal(drops[0].priceDelta, -100000);
  assert.equal(drops[0].priceHistory.length, 1);
  assert.equal(drops[0].dropsCount, 1);
});

test('template validation cannot write incomplete messages', async () => {
  let calls = 0;
  const templates = api.createMessageTemplateServices({ from() { calls++; throw new Error('Unexpected write'); } });
  await assert.rejects(templates.saveMessageTemplate({ userId: 'u', name: '', content: '{{transactions}}' }), /name/);
  await assert.rejects(templates.saveMessageTemplate({ userId: 'u', name: 'Update', content: 'Hello', isDefault: true }), /transactions/);
  assert.equal(calls, 0);
});

test('automation failures propagate instead of reporting a saved switch', async () => {
  const query = { upsert() { return this; }, select() { return this; }, single: async () => ({ error: { message: 'Offline' } }) };
  const { saveAutomationSettings } = api.createAutomationServices({ from: () => query });
  await assert.rejects(saveAutomationSettings('u', { autoWhatsAppEnabled: false, monthlyReportsEnabled: true }), /Offline/);
});

test('shared market service falls back when the availability RPC is missing', async () => {
  const query = { select() { return this; }, eq() { return this; }, limit: async () => ({ data: [{ building_key: 'tower' }], error: null }) };
  const service = api.createLeadInsightServices({ rpc: async () => ({ error: { code: 'PGRST202' } }), from: () => query });
  assert.deepEqual(await service.fetchAvailableMarketBuildingKeys(['tower', 'tower']), ['tower']);
});
