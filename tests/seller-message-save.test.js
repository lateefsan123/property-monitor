import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

for (const file of ['src/features/seller-signal/lead-import-services.js', 'mobile/src/features/seller-signal/services.js']) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const body = source.split('export async function updateLead(')[1].split('\nexport async function deleteLead')[0];
  function setup(error = null) {
    const calls = [];
    const query = { update(value) { calls.push(['update', value]); return this; }, eq(...args) { calls.push(['eq', ...args]); return this; }, select(value) { calls.push(['select', value]); return this; }, async single() { return { data: error ? null : { id: 42 }, error }; } };
    const supabase = { from(table) { calls.push(['from', table]); return query; } };
    return { calls, update: new Function('supabase', `return async function updateLead(${body}`)(supabase) };
  }
  test(`${file}: saves exact text with owner and seller scope`, async () => {
    const { calls, update } = setup();
    const text = 'Hello Alex\nYour update is ready.';
    await update({ userId: 'owner', leadId: 42, updates: { message_draft: text } });
    assert.deepEqual(calls, [['from','leads'], ['update',{ message_draft: text }], ['eq','user_id','owner'], ['eq','id',42], ['select','id']]);
  });
  test(`${file}: reset clears override and failed saves reject`, async () => {
    const { calls, update } = setup();
    await update({ userId:'owner', leadId:42, updates:{ message_draft:null } });
    assert.deepEqual(calls[1], ['update',{ message_draft:null }]);
    await assert.rejects(setup({ message:'No matching seller' }).update({ userId:'other', leadId:42, updates:{ message_draft:'test' } }), /No matching seller/);
  });
}
