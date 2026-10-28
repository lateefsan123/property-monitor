import test from 'node:test';
import assert from 'node:assert/strict';
import { projectMessageContext, projectMessageTemplate } from '../supabase/functions/_shared/project-message.js';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import vm from 'node:vm';

test('project wording preserves the seller record and names the development explicitly', () => {
  const lead = { building: 'Mangrove Residences 2', resolvedBuilding: 'Mangrove Residences 2', name: 'Seller' };
  const match = { name: 'Expo City Mangrove Residences, Madinat Al Mataar', scope: 'development' };
  const context = projectMessageContext(lead, match);
  assert.equal(context.lead.building, match.name);
  assert.equal(context.lead.resolvedBuilding, match.name);
  assert.equal(lead.building, 'Mangrove Residences 2');
  const message = projectMessageTemplate('Sales in {{building}}. Your tower has activity. {{transactions}}', context.projectWide)
    .replaceAll('{{building}}', context.lead.building);
  assert.match(message, /Expo City Mangrove Residences, Madinat Al Mataar \(project-wide\)/);
  assert.doesNotMatch(message, /Residences 2|your tower/i);
  assert.match(message, /the development has activity/);
});

test('exact buildings and nearby updates retain their own scope', () => {
  const lead = { building: 'Celestia A' };
  assert.equal(projectMessageContext(lead, { scope: 'building', name: 'Celestia A' }).lead, lead);
  assert.equal(projectMessageContext(lead, { scope: 'development', name: 'CELESTIA' }, true).projectWide, false);
  assert.equal(projectMessageTemplate('Sales in {{building}}', false), 'Sales in {{building}}');
});

test('automated sender renders all five approved labels as project sales and preserves the custom template', async () => {
  const source = (await readFile('supabase/functions/seller-signal-auto-whatsapp/index.ts', 'utf8'))
    .replace(/^import .*;\r?\n/gm, '') + '\nglobalThis.renderMessage = buildMessage;';
  const { code } = await transform(source, { loader: 'ts', format: 'cjs' });
  const context = { projectMessageContext, projectMessageTemplate, Date, Intl, Map, Set,
    Deno: { serve() {} } };
  vm.runInNewContext(code, context);
  const template = 'Hi {{name}}, Donal here from White&Co. Here are the latest recorded sales in {{building}}.\n\n{{transactions}}\n\nMy original buyer sentence.';
  const mappings = [
    ['CELESTIA A', 'CELESTIA, DUBAI SOUTH'], ['CELESTIA B', 'CELESTIA, DUBAI SOUTH'],
    ['Mangrove Residences 2', 'Expo City Mangrove Residences, Madinat Al Mataar'],
    ['URBANA II STACKED HOUSE BLOCK-06', 'URBANA II, EMAAR SOUTH'],
    ['URBANA II STACKED HOUSE BLOCK-07', 'URBANA II, EMAAR SOUTH'],
  ];
  for (const [raw, name] of mappings) {
    const message = context.renderMessage({ building: raw, name: 'Seller' },
      [{ date: '2026-10-22', amount: 495000, beds: '0' }], raw, template, false, { name, scope: 'development' });
    assert.ok(message.includes(`${name} (project-wide)`), message);
    assert.ok(!message.includes(raw), message);
    assert.ok(message.includes(`- ${name} | Studio`), message);
    assert.ok(message.endsWith('My original buyer sentence.'));
  }
});
