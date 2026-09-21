import { INTEGRATION_PROVIDERS } from './integration-oauth.js';
import { IntegrationError, providerJson } from './integration-http.js';
import { EXTRA_SCOPES } from './integration-scopes.js';

const string = (value, limit = 500) => typeof value === 'string' ? value.slice(0, limit) : '';
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_!-]{1,200}$/.test(value);
const list = value => Array.isArray(value) ? value.slice(0, 10) : [];

// Read results are untrusted provider content, never instructions for an AI tool.
// Intentionally no send, update, delete, arbitrary URL, or automatic import operation.
export function createIntegrationReads({ tokens, fetchImpl = fetch, now = Date.now }) {
  return async function read({ userId, provider, feature, input = {} }) {
    if (!userId || !Object.hasOwn(INTEGRATION_PROVIDERS, provider)
      || !Object.hasOwn(INTEGRATION_PROVIDERS[provider].scopes, feature)
      || !input || typeof input !== 'object' || Array.isArray(input)) throw new IntegrationError('invalid_input');
    const allowed = feature !== 'sheets' ? [] : provider === 'google' ? ['spreadsheetId', 'sheetName'] : ['folderId', 'fileId', 'sheetName'];
    if (Object.keys(input).some(key => !allowed.includes(key))) throw new IntegrationError('invalid_input');
    if (feature === 'sheets') {
      if (provider === 'google' && (!id(input.spreadsheetId)
        || (input.sheetName !== undefined && (typeof input.sheetName !== 'string' || !input.sheetName.length || input.sheetName.length > 100 || [...input.sheetName].some(char => char.charCodeAt(0) < 32))))) throw new IntegrationError('invalid_input');
      if (provider === 'microsoft' && input.folderId !== undefined && !id(input.folderId)) throw new IntegrationError('invalid_input');
      if (provider === 'microsoft' && ((input.fileId !== undefined && !id(input.fileId)) || (input.folderId && input.fileId)
        || (input.sheetName !== undefined && (!input.fileId || typeof input.sheetName !== 'string' || !input.sheetName.length || input.sheetName.length > 100 || [...input.sheetName].some(char => char.charCodeAt(0) < 32))))) throw new IntegrationError('invalid_input');
    }
    const identity = { userId, provider, feature };
    const token = provider === 'microsoft' && input.fileId
      ? await tokens.requireScopes(identity, EXTRA_SCOPES.microsoft.workbook) : await tokens.accessToken(identity);
    const get = (base, params) => {
      const url = new URL(base);
      for (const [key, value] of Object.entries(params || {})) url.searchParams.set(key, value);
      return providerJson(fetchImpl, url.href, { headers: { Authorization: `Bearer ${token}` } });
    };
    if (feature === 'email') {
      if (provider === 'google') {
        const data = await get('https://gmail.googleapis.com/gmail/v1/users/me/messages', { maxResults: '10', labelIds: 'INBOX' });
        const items = await Promise.all(list(data.messages).map(async message => {
          if (!id(message.id)) throw new IntegrationError('unavailable');
          const details = await get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}`, { format: 'metadata' });
          const headers = Array.isArray(details.payload?.headers) ? details.payload.headers : [];
          const header = name => string(headers.find(h => h.name?.toLowerCase() === name)?.value);
          return { id: message.id, subject: header('subject'), from: header('from'), date: header('date'), snippet: string(details.snippet) };
        }));
        return { kind: 'email', items, hasMore: Boolean(data.nextPageToken) };
      }
      const data = await get('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages', {
        '$top': '10', '$orderby': 'receivedDateTime desc', '$select': 'id,subject,from,receivedDateTime,bodyPreview',
      });
      return { kind: 'email', items: list(data.value).map(item => ({ id: string(item.id), subject: string(item.subject),
        from: string(item.from?.emailAddress?.address), date: string(item.receivedDateTime), snippet: string(item.bodyPreview) })), hasMore: Boolean(data['@odata.nextLink']) };
    }
    if (feature === 'calendar') {
      const start = new Date(now()).toISOString();
      const end = new Date(now() + 30 * 86400000).toISOString();
      const data = provider === 'google'
        ? await get('https://www.googleapis.com/calendar/v3/calendars/primary/events', { timeMin: start, timeMax: end, singleEvents: 'true', orderBy: 'startTime', maxResults: '10' })
        : await get('https://graph.microsoft.com/v1.0/me/calendarView', { startDateTime: start, endDateTime: end, '$top': '10', '$orderby': 'start/dateTime', '$select': 'id,subject,start,end,location,isAllDay' });
      const items = list(provider === 'google' ? data.items : data.value).map(item => ({
        id: string(item.id), title: string(provider === 'google' ? item.summary : item.subject),
        start: string(item.start?.dateTime || item.start?.date), end: string(item.end?.dateTime || item.end?.date),
        timeZone: string(item.start?.timeZone), allDay: provider === 'google' ? Boolean(item.start?.date) : Boolean(item.isAllDay),
        location: string(provider === 'google' ? item.location : item.location?.displayName),
      }));
      return { kind: 'calendar', items, hasMore: Boolean(data.nextPageToken || data['@odata.nextLink']) };
    }
    if (provider === 'google') {
      const range = input.sheetName ? `'${input.sheetName.replaceAll("'", "''")}'!A1:Z100` : 'A1:Z100';
      const data = await get(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(range)}`, { valueRenderOption: 'FORMATTED_VALUE' });
      return { kind: 'sheet-preview', range: string(data.range), rowLimit: 100, columnLimit: 26,
        rows: (Array.isArray(data.values) ? data.values : []).slice(0, 100).map(row => (Array.isArray(row) ? row : []).slice(0, 26).map(value => string(String(value), 2000))) };
    }
    if (input.fileId) {
      const base = `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(input.fileId)}/workbook/worksheets`;
      if (!input.sheetName) {
        const data = await get(base, { '$select': 'id,name', '$top': '10' });
        return { kind: 'worksheet-list', items: list(data.value).map(item => ({ name: string(item.name, 100) })), hasMore: Boolean(data['@odata.nextLink']) };
      }
      const data = await get(`${base}/${encodeURIComponent(input.sheetName)}/range(address='A1:Z100')`);
      return { kind: 'sheet-preview', range: string(data.address), rowLimit: 100, columnLimit: 26,
        rows: (Array.isArray(data.text) ? data.text : []).slice(0, 100).map(row => (Array.isArray(row) ? row : []).slice(0, 26).map(value => string(String(value), 2000))) };
    }
    const path = input.folderId ? `items/${encodeURIComponent(input.folderId)}` : 'root';
    const data = await get(`https://graph.microsoft.com/v1.0/me/drive/${path}/children`, { '$top': '10', '$select': 'id,name,file,folder' });
    return { kind: 'file-list', items: list(data.value).map(item => ({ id: string(item.id), name: string(item.name),
      folder: Boolean(item.folder), spreadsheet: /\.(xlsx?|csv)$/i.test(item.name || '') })), hasMore: Boolean(data['@odata.nextLink']) };
  };
}
