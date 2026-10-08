import { Buffer } from 'node:buffer';
import { IntegrationError, providerJson } from './integration-http.js';
import { EXTRA_SCOPES } from './integration-scopes.js';

const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_!-]{1,200}$/.test(value) && value !== '..';
const fail = message => { const error = new IntegrationError('invalid_input'); error.message = message; throw error; };
const enc = encodeURIComponent;
// Google worksheets are read 2,000 rows at a time: a whole 27,000-row sheet
// passes the 2 MB provider read limit and the browser response limit.
export const GOOGLE_ROW_CHUNK = 2000;
export const MAX_IMPORT_ROWS = 60000;

// Dedicated import reads: unlike the integration preview, never truncate seller rows.
export async function readSpreadsheetImport({ userId, provider, input, tokens, fetchImpl }) {
  const { operation, fileId, driveId, folderId, sheetName, pageToken, query, url, start } = input;
  const fields = { browse: ['operation', 'folderId', 'pageToken', 'query'], tabs: ['operation', 'fileId', 'driveId'], rows: ['operation', 'fileId', 'driveId', 'sheetName', 'start'], resolve: ['operation', 'url'] };
  if (!Object.hasOwn(fields, operation) || Object.keys(input).some(key => !fields[operation].includes(key))) throw new IntegrationError('invalid_input');
  if ([fileId, driveId, folderId].some(value => value !== undefined && !validId(value)) || (['tabs', 'rows'].includes(operation) && !fileId)) throw new IntegrationError('invalid_input');
  if (operation === 'rows' && (typeof sheetName !== 'string' || !sheetName || sheetName.length > 100 || [...sheetName].some(char => char.charCodeAt(0) < 32))) throw new IntegrationError('invalid_input');
  if (query !== undefined && (typeof query !== 'string' || query.length > 100)) throw new IntegrationError('invalid_input');
  if (start !== undefined && (provider !== 'google' || !Number.isInteger(start) || start < 1 || start > MAX_IMPORT_ROWS + 1)) throw new IntegrationError('invalid_input');
  if (pageToken !== undefined && (typeof pageToken !== 'string' || !/^[\x21-\x7e]{1,2048}$/.test(pageToken))) throw new IntegrationError('invalid_input');
  let link;
  if (operation === 'resolve') {
    try { link = new URL(url); } catch { throw new IntegrationError('invalid_input'); }
    if (provider !== 'microsoft' || link.protocol !== 'https:' || link.username || link.password || link.port || !(link.hostname === '1drv.ms' || link.hostname === 'onedrive.live.com' || link.hostname.endsWith('.sharepoint.com'))) fail('Use an Excel sharing link from OneDrive or SharePoint.');
  }
  const identity = { userId, provider, feature: 'sheets' };
  const token = provider === 'microsoft' && operation !== 'browse' ? await tokens.requireScopes(identity, EXTRA_SCOPES.microsoft.workbook)
    : provider === 'google' && operation === 'browse' ? await tokens.requireScopes(identity, EXTRA_SCOPES.google.browse) : await tokens.accessToken(identity);
  const get = (base, params = {}) => { const address = new URL(base); Object.entries(params).forEach(([key, value]) => address.searchParams.set(key, value)); return providerJson(fetchImpl, address.href, { headers: { Authorization: `Bearer ${token}` } }); };
  const graph = 'https://graph.microsoft.com/v1.0';
  const base = driveId ? `${graph}/drives/${enc(driveId)}/items/${enc(fileId)}` : `${graph}/me/drive/items/${enc(fileId)}`;
  if (operation === 'resolve') {
    const file = await get(`${graph}/shares/u!${Buffer.from(link.href).toString('base64url')}/driveItem`, { '$select': 'id,name,parentReference,file' });
    if (!validId(file.id) || !validId(file.parentReference?.driveId) || !/\.xlsx$/i.test(file.name || '')) fail('Choose an Excel .xlsx workbook link.');
    return { kind: 'resolved-file', file: { id: file.id, name: file.name, driveId: file.parentReference.driveId } };
  }
  if (operation === 'browse') {
    if (provider === 'google') {
      const search = (query || '').replaceAll('\\', '\\\\').replaceAll("'", "\\'");
      const data = await get('https://www.googleapis.com/drive/v3/files', { q: `trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'${search ? ` and name contains '${search}'` : ''}`, pageSize: '50', fields: 'nextPageToken,files(id,name)', orderBy: 'modifiedTime desc', ...(pageToken ? { pageToken } : {}) });
      return { kind: 'file-list', items: (data.files || []).filter(item => validId(item.id)).map(({ id, name }) => ({ id, name })), nextPageToken: data.nextPageToken || '' };
    }
    const path = folderId ? `items/${enc(folderId)}` : 'root';
    const data = await get(`${graph}/me/drive/${path}/children`, { '$top': '50', '$select': 'id,name,folder,file', ...(pageToken ? { '$skiptoken': pageToken } : {}) });
    let nextPageToken = '';
    if (data['@odata.nextLink']) { const next = new URL(data['@odata.nextLink']); if (next.origin !== 'https://graph.microsoft.com' || next.pathname !== `/v1.0/me/drive/${path}/children`) throw new IntegrationError('unavailable'); nextPageToken = next.searchParams.get('$skiptoken') || ''; if (!nextPageToken) throw new IntegrationError('unavailable'); }
    return { kind: 'file-list', items: (data.value || []).filter(item => validId(item.id) && (item.folder || /\.xlsx$/i.test(item.name || ''))).map(item => ({ id: item.id, name: item.name, folder: Boolean(item.folder) })), nextPageToken };
  }
  if (operation === 'tabs') {
    const data = provider === 'google' ? await get(`https://sheets.googleapis.com/v4/spreadsheets/${enc(fileId)}`, { fields: 'sheets.properties.title' }) : await get(`${base}/workbook/worksheets`, { '$select': 'name', '$top': '200' });
    if (data['@odata.nextLink']) fail('This workbook has too many worksheets. Export the worksheet you need as CSV.');
    return { kind: 'worksheet-list', items: provider === 'google' ? (data.sheets || []).map(item => ({ name: item.properties.title })) : (data.value || []).map(item => ({ name: item.name })) };
  }
  if (provider === 'google') return readGoogleRows(get, fileId, sheetName, start || 1);
  const data = await get(`${base}/workbook/worksheets/${enc(sheetName)}/usedRange(valuesOnly=true)`, { '$select': 'text,rowCount,columnCount' });
  const rows = data.text;
  if (Number.isInteger(data.rowCount) && data.rowCount !== rows?.length) throw new IntegrationError('unavailable');
  if (!Array.isArray(rows) || rows.length < 2) fail('This worksheet needs column headings and at least one seller.');
  if (rows.length > 10001 || rows.some(row => !Array.isArray(row) || row.length > 100)) fail('Import up to 10,000 sellers and 100 columns at once. Split this worksheet before importing.');
  return { kind: 'sheet-import', rows: rows.map(row => row.map(cell => String(cell ?? ''))) };
}

// One chunk of a Google worksheet: rows start..start+1999 (1-based, row 1 is
// the headings). nextStart is set while the sheet has more rows, so the app
// asks again and joins the chunks.
async function readGoogleRows(get, fileId, sheetName, start) {
  const quoted = "'" + sheetName.replaceAll("'", "''") + "'";
  const meta = await get(`https://sheets.googleapis.com/v4/spreadsheets/${enc(fileId)}`, { fields: 'sheets.properties(title,gridProperties.rowCount)' });
  const sheet = (meta.sheets || []).find(item => item.properties?.title === sheetName);
  if (!sheet) fail('This worksheet was not found. Choose it again.');
  const rowCount = Number(sheet.properties.gridProperties?.rowCount) || 0;
  if (rowCount > MAX_IMPORT_ROWS + 1) fail(`Import up to ${MAX_IMPORT_ROWS.toLocaleString('en-US')} sellers at once. Split this worksheet before importing.`);
  const end = Math.min(start + GOOGLE_ROW_CHUNK - 1, Math.max(rowCount, start));
  const data = await get(`https://sheets.googleapis.com/v4/spreadsheets/${enc(fileId)}/values/${enc(`${quoted}!A${start}:CV${end}`)}`, { valueRenderOption: 'FORMATTED_VALUE' });
  const values = Array.isArray(data.values) ? data.values : [];
  if (start === 1 && values.length < 2) fail('This worksheet needs column headings and at least one seller.');
  if (values.some(row => !Array.isArray(row) || row.length > 100)) fail('Import up to 100 columns at once. Remove unused columns before importing.');
  return { kind: 'sheet-import', rows: values.map(row => row.map(cell => String(cell ?? ''))), nextStart: end < rowCount ? end + 1 : null };
}
