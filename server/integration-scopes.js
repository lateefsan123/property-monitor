export const EXTRA_SCOPES = {
  google: { events: ['https://www.googleapis.com/auth/calendar.events'], send: ['https://www.googleapis.com/auth/gmail.send'], browse: ['https://www.googleapis.com/auth/drive.metadata.readonly'] },
  microsoft: { events: ['Calendars.ReadWrite'], send: ['Mail.Send'], workbook: ['Files.ReadWrite'] },
};

export function includesScopes(provider, granted, required) {
  const normalize = scope => provider === 'microsoft'
    ? scope.replace(/^https:\/\/graph\.microsoft\.com\//i, '').toLowerCase() : scope;
  const scopes = new Set((granted || []).map(normalize));
  if (scopes.has('https://www.googleapis.com/auth/calendar.events')) scopes.add('https://www.googleapis.com/auth/calendar.events.readonly');
  if (scopes.has('calendars.readwrite')) scopes.add('calendars.read');
  return Boolean(required?.every(scope => scope === 'offline_access' || scopes.has(normalize(scope))));
}
