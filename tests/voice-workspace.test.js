import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceWorkspace, voiceResultCards } from '../shared/voice-workspace.js';
import { executeVoiceTool } from '../shared/voice-tools.js';

function fixture() {
  const calls = [];
  let owner = 'owner', settings = { auto_whatsapp_enabled: false, monthly_reports_enabled: false }, writes = 0;
  const supabase = { auth: { getUser: async () => ({ data: { user: { id: owner } } }) }, from(table) {
    const steps = [], q = {};
    for (const name of ['select', 'eq', 'is', 'or', 'ilike', 'order', 'range', 'limit', 'abortSignal', 'maybeSingle', 'single', 'upsert', 'insert', 'update']) {
      q[name] = (...args) => { steps.push([name, ...args]); return q; };
    }
    q.then = (resolve, reject) => Promise.resolve().then(() => {
      calls.push({ table, steps });
      assert.ok(steps.some(step => step[0] === 'eq' && step[1] === 'user_id' && step[2] === 'owner') || steps.some(step => ['upsert', 'insert'].includes(step[0]) && step[1].user_id === 'owner'));
      const upsert = steps.find(step => step[0] === 'upsert');
      if (upsert) { writes++; settings = { auto_whatsapp_enabled: upsert[1].auto_whatsapp_enabled, monthly_reports_enabled: upsert[1].monthly_reports_enabled }; }
      if (steps.some(step => ['insert', 'update'].includes(step[0]))) { writes++; return { data: { id: 'a' } }; }
      if (table === 'seller_signal_automation_settings') return { data: { ...settings } };
      if (table === 'whatsapp_accounts') return { data: [{ connection_status: 'connected' }] };
      if (table === 'leads' && steps.some(step => step[0] === 'single')) return { data: { id: 'a', name: 'Ahmed', building: 'Forte', notes: 'Existing note', status: 'Prospect' } };
      return { data: [{ id: 'a', name: 'Ahmed', building: 'Forte', status: 'Prospect' }], count: 31 };
    }).then(resolve, reject);
    return q;
  } };
  const workspace = createVoiceWorkspace({ supabase, userId: 'owner', fetchPriceDrops: async id => {
    assert.equal(id, 'owner'); return [{ id: 3, buildingName: 'Forte', price: 2000000, previousPrice: 2300000, priceDelta: -300000 }];
  } });
  return { workspace, calls, writes: () => writes, switchUser: () => { owner = 'other'; }, changeSettings: () => { settings.monthly_reports_enabled = true; } };
}
test('lead search is bounded, owner-scoped and strips filter punctuation', async () => {
  const f = fixture();
  const result = await f.workspace.read('find_leads', { query: 'Forte%,id.eq.other', status: '', offset: '0' });
  assert.equal(result.total, 31); assert.equal(result.nextOffset, 20);
  const steps = f.calls[0].steps;
  assert.deepEqual(steps.find(s => s[0] === 'range'), ['range', 0, 19]);
  assert.ok(!steps.find(s => s[0] === 'or')[1].includes('id.eq'));
  await assert.rejects(f.workspace.read('find_leads', { query: '', status: '', offset: '-1' }));
});
test('every lookup rejects an account switch before accessing data', async () => {
  const f = fixture(); f.switchUser();
  await assert.rejects(f.workspace.read('price_drops', { building: '' }), /sign in/);
  assert.equal(f.calls.length, 0);
});
test('automation is preview-only until human confirmation and approval is single-use', async () => {
  const f = fixture();
  const preview = await f.workspace.prepare({ automation: 'followups', action: 'enable' });
  assert.equal(preview.kind, 'automation'); assert.equal(f.writes(), 0);
  await f.workspace.confirm(); assert.equal(f.writes(), 1);
  await assert.rejects(f.workspace.confirm()); assert.equal(f.writes(), 1);
});
test('changed settings and account switching invalidate pending approval', async () => {
  for (const invalidate of ['changeSettings', 'switchUser']) {
    const f = fixture(); await f.workspace.prepare({ automation: 'reports', action: 'enable' });
    f[invalidate](); await assert.rejects(f.workspace.confirm()); assert.equal(f.writes(), 0);
  }
});
test('discard and abort cannot apply an automation', async () => {
  const f = fixture(); await f.workspace.prepare({ automation: 'reports', action: 'enable' });
  f.workspace.discard(); await assert.rejects(f.workspace.confirm());
  const c = new AbortController(); c.abort();
  await assert.rejects(f.workspace.prepare({ automation: 'reports', action: 'enable' }, c.signal));
  assert.equal(f.writes(), 0);
});
test('tool dispatcher renders CRM cards without exposing a confirm tool', async () => {
  const f = fixture(); let shown;
  const data = await executeVoiceTool('price_drops', { building: 'Forte' }, { workspace: f.workspace, onResult: value => { shown = value; } });
  assert.equal(shown, data);
  assert.equal(voiceResultCards(data)[0].detail, 'AED 2,300,000 → AED 2,000,000');
  await assert.rejects(executeVoiceTool('confirm_automation', {}, { workspace: f.workspace }));
  await assert.rejects(executeVoiceTool('find_leads', { query: '', status: '', offset: '0', userId: 'other' }, { workspace: f.workspace }));
});
test('automation preview refusal clears pending change', async () => {
  const f = fixture();
  await assert.rejects(executeVoiceTool('prepare_automation', { automation: 'reports', action: 'enable' }, {
    workspace: f.workspace, onPreview: () => { throw new Error('Pending review'); },
  }));
  await assert.rejects(f.workspace.confirm()); assert.equal(f.writes(), 0);
});
test('unknown workspace actions fail and result cards do not render IDs', async () => {
  const f = fixture(); await assert.rejects(f.workspace.read('delete_lead', {}));
  const cards = voiceResultCards({ kind: 'leads', items: [{ id: 'secret-id', name: 'Priya', building: 'Forte' }] });
  assert.ok(!JSON.stringify(cards).includes('secret-id'));
});
test('notes require a resolved seller and append with an optimistic concurrency guard', async () => {
  const f = fixture();
  await assert.rejects(f.workspace.prepareRecord('prepare_lead_note', { lead_id: 'a', note: 'Call tomorrow' }));
  await f.workspace.read('find_leads', { query: 'Ahmed', status: '', offset: '0' });
  const preview = await f.workspace.prepareRecord('prepare_lead_note', { lead_id: 'a', note: 'Call tomorrow' });
  assert.match(preview.preview.subject, /Ahmed/); assert.equal(f.writes(), 0);
  await f.workspace.confirm();
  const steps = f.calls.at(-1).steps;
  assert.deepEqual(steps.find(step => step[0] === 'update')[1], { notes: 'Existing note\n\nCall tomorrow' });
  assert.ok(steps.some(step => step[0] === 'eq' && step[1] === 'notes' && step[2] === 'Existing note'));
  assert.equal(f.writes(), 1);
});
test('template creation requires transactions and never changes the default', async () => {
  const f = fixture();
  await assert.rejects(f.workspace.prepareRecord('prepare_template', { name: 'Hello', content: 'Missing transactions' }));
  const preview = await f.workspace.prepareRecord('prepare_template', { name: 'Update', content: 'Hi {{name}}, {{transactions}}' });
  assert.equal(preview.kind, 'workspace'); assert.equal(f.writes(), 0);
  await f.workspace.confirm();
  const payload = f.calls.at(-1).steps.find(step => step[0] === 'insert')[1];
  assert.equal(payload.is_default, false); assert.equal(payload.image_path, null); assert.equal(payload.user_id, 'owner');
  await assert.rejects(f.workspace.confirm()); assert.equal(f.writes(), 1);
});
