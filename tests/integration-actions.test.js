import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { prepareAction } from '../services/seller-signal-mcp/src/action-preview.js';
const require = createRequire(new URL('../services/seller-signal-mcp/package.json', import.meta.url));
const { z } = require('zod');
const source = readFileSync(new URL('../services/seller-signal-mcp/src/action-registry.js', import.meta.url), 'utf8');
function setup(options = {}) {
  const calls = [];
  const context = { z, structuredClone, prepareAction, normalizeWhatsAppPhone: value => value };
  for (const name of ['addLead', 'getAccountSummary', 'getLead', 'listLeads', 'listWhatsAppAccounts', 'listWhatsAppMessages', 'sendWhatsAppMessage', 'updateLead']) {
    context[name] = async (...args) => { calls.push({ name, args }); return { ok: true }; };
  }
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('const leadIdSchema')).replace('export function', 'function') + '\nthis.create = createActionRegistry;', context);
  return { registry: context.create(options), calls };
}
const authInfo = { extra: { userId: 'user-a' } };
test('all eight existing actions are reusable and reads retain server identity', async () => {
  const { registry, calls } = setup({ authInfo });
  assert.equal(registry.list().length, 8);
  await registry.execute('list_my_seller_leads', { limit: 5 });
  assert.equal(calls[0].args[0], authInfo);
  assert.equal(calls[0].args[1].limit, 5);
});
test('missing identity, unknown actions and forged identity are rejected', async () => {
  await assert.rejects(setup().registry.execute('list_my_seller_leads'), /Authenticated/);
  const { registry, calls } = setup({ authInfo });
  await assert.rejects(registry.execute('unknown'), /Unknown/);
  await assert.rejects(registry.execute('list_my_seller_leads', { userId: 'user-b' }));
  assert.equal(calls.length, 0);
});
test('writes fail closed; an argument cannot self-approve', async () => {
  const { registry, calls } = setup({ authInfo });
  const result = await registry.execute('send_seller_signal_whatsapp_message', { body: 'Hello', to: '971500000000' });
  assert.equal(result.status, 'confirmation_required');
  await assert.rejects(registry.execute('send_seller_signal_whatsapp_message', { body: 'Hello', confirmed: true }));
  assert.equal(calls.length, 0);
});
test('approval is exact, cloned, awaited and denial does not execute', async () => {
  let approval;
  const { registry, calls } = setup({ authInfo, confirmAction: async request => { approval = request; request.input.notes = 'tampered'; return true; } });
  await registry.execute('update_my_seller_lead', { leadId: '1', notes: 'Original' });
  assert.equal(approval.userId, 'user-a');
  assert.equal(approval.action, 'update_my_seller_lead');
  assert.equal(calls[0].args[1].notes, 'Original');
  for (const answer of [false, undefined, 'true']) {
    const denied = setup({ authInfo, confirmAction: async () => answer });
    assert.equal((await denied.registry.execute('add_my_seller_lead', { name: 'Omar' })).status, 'cancelled');
    assert.equal(denied.calls.length, 0);
  }
});
