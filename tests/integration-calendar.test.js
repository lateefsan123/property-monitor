import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createIntegrationCalendar, calendarEvent } from '../server/integration-calendar.js';
import { createTokenVault } from '../server/integration-oauth.js';
import { executeVoiceTool } from '../shared/voice-tools.js';
import { calendarDay, calendarTime } from '../shared/calendar-day.js';
import { createIntegrationReads } from '../server/integration-reads.js';

const input = { title: 'Viewing', start: '2026-10-01T15:00:00+04:00', end: '2026-10-01T15:30:00+04:00', timeZone: 'Asia/Dubai', location: 'Burj Vista', reminderMinutes: 0 };
function fixture(provider) {
  const pending = new Map(), calls = [];
  let clock = 0, secret = 'first', fail = false;
  const service = createIntegrationCalendar({
    now: () => clock, vault: createTokenVault(Buffer.alloc(32, 1)),
    tokens: { context: async (_who, scopes) => { assert.ok(scopes.length); return { accessToken: 'private', connectionSecret: secret }; } },
    store: {
      getConnection: async () => ({ secret }), putPending: async row => pending.set(row.hash, row),
      consumePending: async ({ hash, userId, provider, now }) => {
        const row = pending.get(hash);
        if (!row || row.userId !== userId || row.provider !== provider || row.expiresAt <= now) return null;
        pending.delete(hash); return row;
      },
    },
    fetchImpl: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); if (fail) throw Error('private error'); return new Response(JSON.stringify({ id: 'saved' })); },
  });
  return { service, calls, who: { userId: 'a', provider }, expire: () => { clock = 999999; }, change: () => { secret = 'other'; }, fail: () => { fail = true; } };
}
for (const provider of ['google', 'microsoft']) {
  test(`${provider}: creates the reviewed event once with an at-start reminder`, async () => {
    const f = fixture(provider), preview = await f.service.prepare({ ...f.who, input });
    assert.equal(f.calls.length, 0);
    assert.match(preview.preview.body, /15:00.*15:30/);
    const result = await f.service.confirm({ ...f.who, confirmation: preview.confirmation });
    assert.equal(result.status, 'created');
    const body = f.calls[0].body;
    assert.equal(provider === 'google' ? body.reminders.overrides[0].minutes : body.reminderMinutesBeforeStart, 0);
    assert.equal(body.attendees, undefined);
    await assert.rejects(f.service.confirm({ ...f.who, confirmation: preview.confirmation }));
    assert.equal(f.calls.length, 1);
  });
}
test('expired, foreign-user and changed-connection previews cannot create events', async () => {
  for (const mode of ['expired', 'foreign', 'changed']) {
    const f = fixture('google'), preview = await f.service.prepare({ ...f.who, input });
    if (mode === 'expired') f.expire();
    if (mode === 'changed') f.change();
    await assert.rejects(f.service.confirm({ ...f.who, userId: mode === 'foreign' ? 'b' : 'a', confirmation: preview.confirmation }));
    assert.equal(f.calls.length, 0);
  }
});
test('uncertain provider failures are never retried using the same approval', async () => {
  const f = fixture('google'), preview = await f.service.prepare({ ...f.who, input }); f.fail();
  await assert.rejects(f.service.confirm({ ...f.who, confirmation: preview.confirmation }), /Check your calendar/);
  await assert.rejects(f.service.confirm({ ...f.who, confirmation: preview.confirmation }));
  assert.equal(f.calls.length, 1);
});
test('rejects ambiguous time, reversed intervals, attendees and invalid reminders', () => {
  for (const changes of [{ start: '2026-10-01T15:00:00' }, { end: input.start }, { attendees: ['someone'] }, { reminderMinutes: -1 }, { timeZone: 'invalid' }]) {
    assert.throws(() => calendarEvent({ ...input, ...changes }));
  }
});
test('calendar tool reveals confirmation only to the human-facing UI', async () => {
  let card;
  const result = await executeVoiceTool('prepare_calendar', { provider: 'google', title: input.title, start: input.start, end: input.end, time_zone: input.timeZone, location: input.location, reminder_minutes: '15' }, {
    request: async body => { assert.equal(body.action, 'prepare_calendar'); return { confirmation: 'private-approval', preview: { subject: 'Viewing', body: 'Tomorrow' } }; },
    onPreview: value => { card = value; },
  });
  assert.equal(card.feature, 'calendar'); assert.equal(card.confirmation, 'private-approval');
  assert.equal(JSON.stringify(result).includes('private-approval'), false);
});
test('today crosses UTC midnight correctly and includes the full Dubai day', () => {
  const day = calendarDay(Date.parse('2026-09-28T21:00:00Z'));
  assert.equal(day.day, '2026-09-29');
  assert.equal(Date.parse(day.end) - Date.parse(day.start), 86400000);
  assert.equal(calendarTime({ start: '2026-09-29T06:00:00.0000000', allDay: false }), '10:00');
  assert.equal(calendarTime({ allDay: true }), 'All day');
});
test('calendar reads use the requested day and omit cancelled appointments', async () => {
  let url;
  const read = createIntegrationReads({ tokens: { accessToken: async () => 'token' }, fetchImpl: async value => { url = new URL(value); return new Response(JSON.stringify({ items: [{ id: 'one', summary: 'Viewing', start: { dateTime: input.start }, end: { dateTime: input.end } }, { id: 'cancelled', status: 'cancelled' }] })); } });
  const result = await read({ userId: 'a', provider: 'google', feature: 'calendar', input: { start: input.start, end: input.end } });
  assert.equal(url.searchParams.get('timeMin'), input.start);
  assert.equal(result.items.length, 1);
});
