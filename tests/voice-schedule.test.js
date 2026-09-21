import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceWorkspace, voiceResultCards } from '../shared/voice-workspace.js';
import { executeVoiceTool, VOICE_TOOLS } from '../shared/voice-tools.js';
import { emptySchedule } from '../supabase/functions/_shared/building-schedule.js';
import { voiceSessionConfig } from '../server/voice-session.js';
import { runAssistantChat } from '../shared/assistant-chat.js';

function fixture(initial = emptySchedule()) {
  let row = initial && structuredClone(initial), owner = 'owner', writes = 0, changed = 0, writeError = false;
  const calls = [];
  const supabase = { auth: { getUser: async () => ({ data: { user: { id: owner } } }) }, from(table) {
    const steps = [], query = {};
    for (const method of ['select', 'eq', 'not', 'order', 'range', 'maybeSingle', 'abortSignal', 'update', 'insert']) {
      query[method] = (...args) => { steps.push([method, ...args]); return query; };
    }
    query.then = (resolve, reject) => Promise.resolve().then(() => {
      calls.push({ table, steps });
      assert.ok(steps.some(s => s[0] === 'eq' && s[1] === 'user_id' && s[2] === 'owner') || steps.some(s => s[0] === 'insert' && s[1].user_id === 'owner'));
      if (table === 'leads') return { data: ['Forte 1', 'Forte 2', 'Burj Khalifa'].map((building, id) => ({ id, building })) };
      assert.equal(table, 'seller_signal_building_schedules');
      const update = steps.find(s => s[0] === 'update');
      const insert = steps.find(s => s[0] === 'insert');
      if (update || insert) {
        if (writeError) return { error: { code: 'NETWORK', message: 'offline' } };
        if (insert && row) return { error: { code: '23505' } };
        if (update && (!row || steps.some(s => s[0] === 'eq' && s[1] !== 'user_id' && (s[1] === 'days' ? JSON.stringify(row.days) !== s[2] : row[s[1]] !== s[2])))) return { data: null };
        row = structuredClone((update || insert)[1]); writes++;
      }
      return { data: row && structuredClone(row) };
    }).then(resolve, reject);
    return query;
  } };
  const workspace = createVoiceWorkspace({ supabase, userId: 'owner', fetchPriceDrops: async () => [], onChanged: () => changed++ });
  const act = (action, day = '', names = []) => ({ action, day, buildings_json: JSON.stringify(names) });
  return { workspace, act, calls, row: () => row, writes: () => writes, changed: () => changed,
    switchUser: () => { owner = 'other'; }, externalEdit: value => { row = value; }, failWrite: () => { writeError = true; } };
}
test('weekly schedule reads show all days, mode and Dubai today/tomorrow without writes', async () => {
  const f = fixture();
  const result = await f.workspace.read('weekly_schedule', {});
  assert.equal(result.timeZone, 'Asia/Dubai'); assert.equal(result.items.length, 9);
  assert.equal(result.enabled, false); assert.equal(f.writes(), 0);
  assert.ok(voiceResultCards(result).some(card => card.title === 'Monday'));
});
test('building lookup uses only owned leads and matches numbered towers separately', async () => {
  const f = fixture();
  const result = await f.workspace.read('schedule_buildings', { query: 'forte', offset: '0' });
  assert.deepEqual(result.items.map(x => x.name), ['Forte 1', 'Forte 2']);
  await assert.rejects(f.workspace.prepareRecord('prepare_schedule', f.act('add', 'Monday', ['Forte'])), /exact building/);
  assert.equal(f.writes(), 0);
});
test('voice and text tool dispatch only previews; explicit confirmation saves once and invalidates cache', async () => {
  const f = fixture(); let preview;
  const result = await executeVoiceTool('prepare_schedule', f.act('add', 'Monday', ['forte 1', 'Forte 2']), { workspace: f.workspace, onPreview: value => { preview = value; } });
  assert.equal(result.status, 'awaiting_user_confirmation'); assert.equal(preview.kind, 'workspace');
  assert.equal(f.writes(), 0); assert.match(preview.preview.body, /Weekly mode is off/);
  await f.workspace.confirm();
  assert.deepEqual(f.row().days.Monday, ['Forte 1', 'Forte 2']);
  assert.equal(f.row().enabled, false); assert.equal(f.changed(), 1);
  await assert.rejects(f.workspace.confirm(), /expired/); assert.equal(f.writes(), 1);
});
test('add preserves buildings, remove and replace affect only the requested day', async () => {
  const initial = emptySchedule(); initial.days.Monday = ['Forte 1']; initial.days.Tuesday = ['Burj Khalifa'];
  const f = fixture(initial);
  await f.workspace.prepareRecord('prepare_schedule', f.act('add', 'Monday', ['Forte 2'])); await f.workspace.confirm();
  assert.deepEqual(f.row().days.Monday, ['Forte 1', 'Forte 2']);
  await f.workspace.prepareRecord('prepare_schedule', f.act('remove', 'Monday', ['Forte 1'])); await f.workspace.confirm();
  assert.deepEqual(f.row().days.Monday, ['Forte 2']);
  await f.workspace.prepareRecord('prepare_schedule', f.act('replace', 'Monday', ['Burj Khalifa'])); await f.workspace.confirm();
  assert.deepEqual(f.row().days.Monday, ['Burj Khalifa']);
  assert.deepEqual(f.row().days.Tuesday, initial.days.Tuesday);
});
test('fallback and mode are independent; disable preview warns that it does not pause sends', async () => {
  const f = fixture();
  await f.workspace.prepareRecord('prepare_schedule', f.act('fallback_on')); await f.workspace.confirm();
  assert.equal(f.row().fill_unused, true); assert.equal(f.row().enabled, false);
  await f.workspace.prepareRecord('prepare_schedule', f.act('enable')); await f.workspace.confirm();
  const preview = await f.workspace.prepareRecord('prepare_schedule', f.act('disable'));
  assert.match(preview.preview.body, /does not pause sending/);
  f.workspace.discard(); assert.equal(f.row().enabled, true);
});
test('concurrent edits cannot be overwritten, including first-save races', async () => {
  for (const initial of [emptySchedule(), null]) {
    const f = fixture(initial);
    await f.workspace.prepareRecord('prepare_schedule', f.act('add', 'Monday', ['Forte 1']));
    const other = emptySchedule(); other.days.Friday = ['Forte 2']; f.externalEdit(other);
    await assert.rejects(f.workspace.confirm(), /fresh preview/); assert.equal(f.writes(), 0);
    assert.deepEqual(f.row().days.Friday, ['Forte 2']);
  }
});
test('account switch, abort, expiry and discard prevent saving', async () => {
  for (const invalidate of ['switchUser', 'discard', 'expiry']) {
    const f = fixture();
    await f.workspace.prepareRecord('prepare_schedule', f.act('enable'));
    const originalNow = Date.now;
    if (invalidate === 'switchUser') f.switchUser();
    if (invalidate === 'discard') f.workspace.discard();
    if (invalidate === 'expiry') Date.now = () => originalNow() + 130000;
    try { await assert.rejects(f.workspace.confirm()); } finally { Date.now = originalNow; }
    assert.equal(f.writes(), 0);
  }
  const f = fixture(), controller = new AbortController(); controller.abort();
  await assert.rejects(f.workspace.prepareRecord('prepare_schedule', f.act('enable'), controller.signal));
  assert.equal(f.calls.length, 0);
});
test('malformed requests and model-side confirmation attempts fail closed', async () => {
  const f = fixture();
  for (const args of [f.act('add', 'Monday', []), f.act('enable', 'Monday'), f.act('add', 'Tomorrow', ['Forte 1']), { action: 'add', day: 'Monday', buildings_json: '{}' }]) {
    await assert.rejects(executeVoiceTool('prepare_schedule', args, { workspace: f.workspace, onPreview: () => {} }));
  }
  await assert.rejects(executeVoiceTool('confirm_schedule', {}, { workspace: f.workspace }));
  assert.equal(f.writes(), 0);
  assert.ok(!VOICE_TOOLS.some(tool => tool.name.includes('confirm')));
});
test('failed preview display discards approval and network failures are not called saved', async () => {
  const f = fixture();
  await assert.rejects(executeVoiceTool('prepare_schedule', f.act('enable'), { workspace: f.workspace, onPreview: () => { throw new Error('not visible'); } }));
  await assert.rejects(f.workspace.confirm());
  await f.workspace.prepareRecord('prepare_schedule', f.act('enable')); f.failWrite();
  await assert.rejects(f.workspace.confirm(), /Could not save/);
  assert.equal(f.writes(), 0); assert.equal(f.changed(), 0);
});
test('voice config and shared text tool registry advertise confirmed schedule editing', () => {
  const config = voiceSessionConfig();
  assert.match(config.delegation.responses.instructions, /prepare_schedule/);
  assert.ok(config.delegation.responses.tools.some(tool => tool.name === 'weekly_schedule'));
  assert.ok(VOICE_TOOLS.some(tool => tool.name === 'prepare_schedule'));
});
test('text conversation reads the schedule then stops at a human review card', async () => {
  const f = fixture(); let step = 0, visible;
  const result = await runAssistantChat({ text: 'Add Forte 1 to Mondays', workspace: f.workspace,
    signal: new AbortController().signal, onResult: () => {}, onPreview: preview => { visible = preview; },
    request: async () => ({ output: [{ type: 'function_call', call_id: String(++step),
      name: step === 1 ? 'weekly_schedule' : 'prepare_schedule',
      arguments: JSON.stringify(step === 1 ? {} : f.act('add', 'Monday', ['Forte 1'])) }] }),
  });
  assert.match(result.answer, /Nothing has been changed/); assert.equal(f.writes(), 0);
  assert.match(visible.preview.subject, /Monday/);
  await f.workspace.confirm(); assert.deepEqual(f.row().days.Monday, ['Forte 1']);
});
test('clear day leaves other days and fallback unchanged; a second preview cannot replace approval', async () => {
  const initial = emptySchedule(); initial.fill_unused = true; initial.days.Monday = ['Forte 1']; initial.days.Tuesday = ['Forte 2'];
  const f = fixture(initial);
  await f.workspace.prepareRecord('prepare_schedule', f.act('clear_day', 'Monday'));
  await assert.rejects(f.workspace.prepareRecord('prepare_schedule', f.act('fallback_off')), /current change/);
  await f.workspace.confirm();
  assert.deepEqual(f.row().days.Monday, []); assert.deepEqual(f.row().days.Tuesday, ['Forte 2']);
  assert.equal(f.row().fill_unused, true);
});
