import { createHash, randomBytes } from 'node:crypto';
import { IntegrationError, providerJson } from './integration-http.js';
import { EXTRA_SCOPES } from './integration-scopes.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const date = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
export function calendarEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some(key => !['title', 'start', 'end', 'timeZone', 'location', 'reminderMinutes'].includes(key))
    || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200
    || typeof input.location !== 'string' || input.location.length > 500
    || !date(input.start) || !date(input.end) || Date.parse(input.end) <= Date.parse(input.start)
    || Date.parse(input.end) - Date.parse(input.start) > 7 * 86400000
    || !Number.isInteger(input.reminderMinutes) || input.reminderMinutes < 0 || input.reminderMinutes > 40320
    || typeof input.timeZone !== 'string' || input.timeZone.length > 100) throw new IntegrationError('invalid_input');
  try { new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format(); } catch { throw new IntegrationError('invalid_input'); }
  return { ...input, title: input.title.trim(), start: new Date(input.start).toISOString(), end: new Date(input.end).toISOString() };
}

// Confirmation tokens are account-bound, short-lived and consumed atomically.
// Only the human-facing confirmation button receives the token.
export function createIntegrationCalendar({ tokens, store, vault, fetchImpl = fetch, now = Date.now }) {
  const identity = (userId, provider) => {
    if (!userId || !['google', 'microsoft'].includes(provider)) throw new IntegrationError('invalid_input');
    return { userId, provider, feature: 'calendar' };
  };
  return {
    async prepare({ userId, provider, input }) {
      const who = identity(userId, provider), event = calendarEvent(input);
      const context = await tokens.context(who, EXTRA_SCOPES[provider].events);
      const connection = await store.getConnection(who);
      if (!connection || connection.secret !== context.connectionSecret) throw new IntegrationError('changed');
      const format = value => new Date(value).toLocaleString('en-GB', { timeZone: event.timeZone, dateStyle: 'medium', timeStyle: 'short' });
      const preview = { subject: event.title, body: `${provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'}\n${format(event.start)} – ${format(event.end)} (${event.timeZone})\n${event.location || 'No location'}\nReminder: ${event.reminderMinutes === 0 ? 'at the start' : `${event.reminderMinutes} minutes before`}` };
      const confirmation = randomBytes(32).toString('base64url'), expiresAt = now() + 5 * 60000;
      await store.putPending({ ...who, hash: hash(`calendar-create:${confirmation}`), expiresAt,
        secret: vault.seal({ kind: 'calendar-create', event, connection: hash(connection.secret) }, userId, provider, 'calendar') });
      return { preview, confirmation, expiresAt };
    },
    async confirm({ userId, provider, confirmation }) {
      const who = identity(userId, provider);
      if (typeof confirmation !== 'string' || !/^[\w-]{43}$/.test(confirmation)) throw new IntegrationError('invalid_input');
      const pending = await store.consumePending({ hash: hash(`calendar-create:${confirmation}`), userId, provider, now: now() });
      if (!pending || pending.userId !== userId || pending.provider !== provider || pending.feature !== 'calendar' || pending.expiresAt <= now()) throw new IntegrationError('oauth_expired');
      const saved = vault.open(pending.secret, userId, provider, 'calendar');
      const connection = await store.getConnection(who);
      if (saved.kind !== 'calendar-create' || !connection || hash(connection.secret) !== saved.connection) throw new IntegrationError('changed');
      const context = await tokens.context(who, EXTRA_SCOPES[provider].events);
      if (hash(context.connectionSecret) !== saved.connection) throw new IntegrationError('changed');
      const event = calendarEvent(saved.event);
      const payload = provider === 'google' ? {
        id: hash(confirmation), summary: event.title, location: event.location,
        start: { dateTime: event.start, timeZone: event.timeZone }, end: { dateTime: event.end, timeZone: event.timeZone },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: event.reminderMinutes }] },
      } : {
        transactionId: hash(confirmation), subject: event.title, location: { displayName: event.location },
        start: { dateTime: event.start.replace('Z', ''), timeZone: 'UTC' }, end: { dateTime: event.end.replace('Z', ''), timeZone: 'UTC' },
        isReminderOn: true, reminderMinutesBeforeStart: event.reminderMinutes,
      };
      try {
        const result = await providerJson(fetchImpl, provider === 'google' ? 'https://www.googleapis.com/calendar/v3/calendars/primary/events' : 'https://graph.microsoft.com/v1.0/me/events', {
          method: 'POST', headers: { Authorization: `Bearer ${context.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        if (!result.id) throw new Error('Missing event');
        return { status: 'created', message: 'Added to your calendar with a reminder.', id: result.id };
      } catch { throw new IntegrationError('calendar_uncertain'); }
    },
  };
}
