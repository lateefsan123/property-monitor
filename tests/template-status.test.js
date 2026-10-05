import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPLATE_STATUS_KEYWORDS,
  cleanTemplateStatuses,
  pickTemplateForStatus,
  resolveForLead,
  templateStatusId,
  templateStatusLabels,
} from '../supabase/functions/_shared/template-status.js';
import { introAttachmentPath } from '../supabase/functions/_shared/intro-attachment.js';
import { STATUS_RULES as WEB_STATUS_RULES } from '../src/features/seller-signal/constants.js';
import { STATUS_RULES as MOBILE_STATUS_RULES } from '../mobile/src/features/seller-signal/constants.js';
import { createMessageTemplateServices } from '../shared/message-templates.js';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';

// The web modules use extensionless imports, so bundle them before loading.
// page-helpers' Supabase services are stubbed.
const stubServices = {
  name: 'stub-services',
  setup(builder) {
    builder.onResolve({ filter: /^\.\/services$/ }, () => ({ path: 'services', namespace: 'stub' }));
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const fetchLeadSources = async () => [];' }));
  },
};
async function load(relative) {
  const bundled = await build({ entryPoints: [fileURLToPath(new URL(relative, import.meta.url))], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent', plugins: [stubServices] });
  return import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
}
const { buildMessage } = await load('../src/features/seller-signal/insight-utils.js');

const intro = { id: 'intro', name: 'Intro', content: 'Intro {{transactions}}', is_default: true, statuses: [], image_path: 'u/intro.png', updated_at: '2026-10-01' };
const appraisal = { id: 'appraisal', name: 'Appraisal follow-up', content: 'Valuation {{transactions}}', is_default: false, statuses: ['market_appraisal'], image_path: null, updated_at: '2026-10-02' };
const forSale = { id: 'for-sale', name: 'For sale', content: 'Selling {{transactions}}', is_default: false, statuses: ['for_sale_available', 'none'], image_path: 'u/sale.png', updated_at: '2026-10-03' };

test('seller statuses resolve the same way as the status pills', () => {
  assert.equal(templateStatusId(''), 'none');
  assert.equal(templateStatusId(null), 'none');
  assert.equal(templateStatusId('Prospect'), 'prospect');
  assert.equal(templateStatusId('Market Appraisal'), 'market_appraisal');
  assert.equal(templateStatusId('valuation booked'), 'market_appraisal');
  assert.equal(templateStatusId('For Sale'), 'for_sale_available');
  assert.equal(templateStatusId('Not Interested'), 'not_interested');
  assert.equal(templateStatusId('Sold'), null);
});

test('status keywords match STATUS_RULES on web and mobile', () => {
  const expected = TEMPLATE_STATUS_KEYWORDS.map(([id, keywords]) => [id, keywords]);
  for (const rules of [WEB_STATUS_RULES, MOBILE_STATUS_RULES]) {
    assert.deepEqual(rules.map(rule => [rule.id, rule.keywords]), expected);
  }
});

test('each seller gets the template for their status, else the default', () => {
  const templates = [intro, appraisal, forSale];
  assert.equal(pickTemplateForStatus(templates, 'Appraisal').id, 'appraisal');
  assert.equal(pickTemplateForStatus(templates, 'For Sale').id, 'for-sale');
  assert.equal(pickTemplateForStatus(templates, '').id, 'for-sale');
  assert.equal(pickTemplateForStatus(templates, 'Prospect').id, 'intro');
  assert.equal(pickTemplateForStatus(templates, 'Sold').id, 'intro');
  assert.equal(pickTemplateForStatus([appraisal], 'Prospect'), null);
  assert.equal(pickTemplateForStatus(undefined, 'Prospect'), null);
});

test('a status claimed twice goes to the most recently updated template', () => {
  const older = { ...appraisal, id: 'older', updated_at: '2026-09-01' };
  assert.equal(pickTemplateForStatus([older, appraisal], 'Appraisal').id, 'appraisal');
});

test('statuses are cleaned to known ids in display order', () => {
  assert.deepEqual(cleanTemplateStatuses(['for_sale_available', 'bogus', 'none', 'none']), ['none', 'for_sale_available']);
  assert.deepEqual(cleanTemplateStatuses(null), []);
  assert.deepEqual(templateStatusLabels(['market_appraisal', 'prospect']), ['Prospect', 'Appraisal']);
});

test('messages and intro images follow the per-seller template', () => {
  const templates = [intro, appraisal, forSale];
  const contentFor = lead => pickTemplateForStatus(templates, lead.status)?.content;
  const imageFor = lead => pickTemplateForStatus(templates, lead.status)?.image_path || null;
  const insight = { recentTransactions: [] };
  assert.match(buildMessage({ name: 'Ahmed', building: 'Forte 2', status: 'Appraisal' }, insight, contentFor), /^Valuation/);
  assert.match(buildMessage({ name: 'Priya', building: 'Forte 2', status: 'Prospect' }, insight, contentFor), /^Intro/);
  assert.equal(resolveForLead('fixed', { status: 'x' }), 'fixed');
  assert.equal(introAttachmentPath(imageFor, { status: 'For Sale' }, null), 'u/sale.png');
  assert.equal(introAttachmentPath(imageFor, { status: 'Appraisal' }, null), null);
  assert.equal(introAttachmentPath(imageFor, { status: 'For Sale', sent_at: '2026-09-30' }, null), null);
});

test('web sale messages use the template for each seller’s status', async () => {
  const { buildInsightTarget } = await load('../src/features/seller-signal/page-helpers.js');
  const { createLeadInsightServices } = await load('../shared/lead-insights.js');
  const templates = [intro, appraisal, forSale];
  const messageTemplate = lead => pickTemplateForStatus(templates, lead.status)?.content;
  const targets = [
    { id: 1, name: 'Ahmed', building: 'Forte 2', status: 'Market Appraisal' },
    { id: 2, name: 'Priya', building: 'Forte 2', status: 'Prospect' },
  ].map(buildInsightTarget);
  const { updates } = createLeadInsightServices({}).computeLeadInsights(targets, null, {}, messageTemplate);
  assert.match(updates[1].message, /^Valuation/);
  assert.match(updates[2].message, /^Intro/);
});

test('a stored sale message can be rebuilt with the current templates', async () => {
  const { buildInsightMessage, createLeadInsightServices } = await load('../shared/lead-insights.js');
  const { getBuildingKeyVariants } = await load('../src/features/seller-signal/building-utils.js');
  const { getTodayTransactionDateKey } = await load('../src/features/seller-signal/insight-utils.js');
  const sale = (date, amount) => ({ amount, category: 'Sales', date, beds: 2, area_sqft: 1410, property: { beds: 2, built_up_area: 1410 }, location: {} });
  const marketData = { buildingLookup: {}, transactionsByBuilding: { [getBuildingKeyVariants('Forte 2')[0]]: [sale(getTodayTransactionDateKey(), 4100000), sale('2026-01-15', 3900000)] } };
  const seller = { id: 1, name: 'Ahmed', building: 'Forte 2', status: 'Market Appraisal' };
  // The templates load after the market data: no status template yet.
  const before = lead => pickTemplateForStatus([intro], lead.status)?.content;
  const after = lead => pickTemplateForStatus([intro, appraisal], lead.status)?.content;
  const insight = createLeadInsightServices({}).computeLeadInsights([seller], marketData, {}, before).updates[1];
  assert.equal(insight.status, 'ready');
  assert.equal(buildInsightMessage(seller, insight, before), insight.message);
  const rebuilt = buildInsightMessage(seller, insight, after);
  assert.match(rebuilt, /^Valuation/);
  // Still today's sale only, like the stored message.
  assert.equal(rebuilt.match(/2 Bed/g)?.length, 1);
});

function fakeTemplateTable(existing) {
  const calls = [];
  const client = {
    from(table) {
      const ops = [];
      const query = {
        then(resolve, reject) {
          calls.push({ table, ops });
          const op = name => ops.find(([key]) => key === name);
          let result = { data: null, error: null };
          if (op('overlaps')) {
            const [, , statuses] = op('overlaps');
            const keep = op('neq')?.[2];
            result = { data: existing.filter(row => row.id !== keep && row.statuses.some(status => statuses.includes(status))), error: null };
          } else if (op('single')) {
            const record = (op('update') || op('insert'))[1];
            result = { data: { id: op('eq')?.[2] || 'new', ...record }, error: null };
          }
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      for (const name of ['select', 'eq', 'neq', 'overlaps', 'update', 'insert', 'single']) {
        query[name] = (...args) => { ops.push([name, ...args]); return query; };
      }
      return query;
    },
    storage: { from() { return { createSignedUrls: async () => ({ data: [], error: null }) }; } },
  };
  return { client, calls };
}

test('saving statuses moves them off the account’s other templates', async () => {
  const { client, calls } = fakeTemplateTable([
    { id: 'intro', statuses: ['prospect', 'none'] },
    { id: 'appraisal', statuses: ['market_appraisal'] },
  ]);
  const service = createMessageTemplateServices(client);
  const saved = await service.saveMessageTemplate({ id: 'appraisal', userId: 'owner', name: 'Follow-up', content: 'Hi {{transactions}}', statuses: ['prospect', 'market_appraisal', 'bogus'] });
  assert.deepEqual(saved.statuses, ['prospect', 'market_appraisal']);
  const release = calls.find(call => call.ops.some(([name]) => name === 'overlaps'));
  assert.deepEqual(release.ops.find(([name]) => name === 'eq'), ['eq', 'user_id', 'owner']);
  assert.deepEqual(release.ops.find(([name]) => name === 'neq'), ['neq', 'id', 'appraisal']);
  const moved = calls.find(call => call.ops.some(([name, record]) => name === 'update' && record.statuses && !call.ops.some(([key]) => key === 'single')));
  assert.deepEqual(moved.ops.find(([name]) => name === 'update')[1], { statuses: ['none'] });
  assert.deepEqual(moved.ops.filter(([name]) => name === 'eq'), [['eq', 'id', 'intro'], ['eq', 'user_id', 'owner']]);
});

test('saving without statuses leaves every template’s statuses alone', async () => {
  const { client, calls } = fakeTemplateTable([{ id: 'intro', statuses: ['prospect'] }]);
  const service = createMessageTemplateServices(client);
  const saved = await service.saveMessageTemplate({ id: 'intro', userId: 'owner', name: 'Intro', content: 'Hi {{transactions}}' });
  assert.equal('statuses' in saved, false);
  assert.equal(calls.some(call => call.ops.some(([name]) => name === 'overlaps')), false);
});
