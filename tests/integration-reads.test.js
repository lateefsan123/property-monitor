import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntegrationTokens } from '../server/integration-tokens.js';
import { createIntegrationReads } from '../server/integration-reads.js';
import { createTokenVault, INTEGRATION_PROVIDERS } from '../server/integration-oauth.js';
import { providerJson } from '../server/integration-http.js';
import { includesScopes } from '../server/integration-scopes.js';
import { Buffer } from 'node:buffer';

const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const identity = { userId: 'alice', provider: 'google', feature: 'email' };

test('Google spreadsheet picker uses scoped metadata, escapes searches and bounds results', async () => {
  let called = false;
  const read = createIntegrationReads({ tokens: { requireScopes: async (owner, scopes) => {
    assert.equal(owner.userId, 'alice');
    assert.deepEqual(scopes, ['https://www.googleapis.com/auth/drive.metadata.readonly']); return 'access';
  } }, fetchImpl: async (url, options) => {
    called = true;
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://www.googleapis.com');
    assert.equal(parsed.searchParams.get('pageSize'), '50');
    assert.equal(parsed.searchParams.get('pageToken'), 'next-page');
    assert.ok(parsed.searchParams.get('q').includes("name contains 'Seller\\'s'"));
    assert.equal(options.method, undefined);
    return json({ files: [{ id: 'sheet_1', name: 'Sellers', privateData: 'not-returned' }], nextPageToken: 'page-2' });
  } });
  const result = await read({ ...identity, feature: 'sheets', input: { query: "Seller's", pageToken: 'next-page' } });
  assert.ok(called);
  assert.deepEqual(result.items, [{ id: 'sheet_1', name: 'Sellers', spreadsheet: true }]);
  assert.equal(result.nextPageToken, 'page-2');
});

test('Google worksheet selection returns titles only and rejects mixed picker inputs', async () => {
  const f = readFixture([{ sheets: [{ properties: { title: 'Sellers', hidden: false }, data: 'not-returned' }] }]);
  const result = await f.read({ ...identity, feature: 'sheets', input: { spreadsheetId: 'sheet_1', tabs: true } });
  assert.deepEqual(result, { kind: 'worksheet-list', items: [{ name: 'Sellers' }] });
  assert.equal(f.calls[0].url.searchParams.get('fields'), 'sheets.properties.title');
  for (const input of [{ tabs: true }, { sheetName: 'Sellers' }, { spreadsheetId: 'id', query: 'mixed' }, { query: 'x'.repeat(101) }, { pageToken: '\n' }]) {
    await assert.rejects(f.read({ ...identity, feature: 'sheets', input }), { code: 'invalid_input' });
  }
});

test('workbook reads require upgraded scope, stay bounded and never write', async () => {
  const calls = [];
  const read = createIntegrationReads({ tokens: { requireScopes: async (who, scopes) => { assert.equal(who.userId, 'alice'); assert.deepEqual(scopes, ['Files.ReadWrite']); return 'token'; } },
    fetchImpl: async (url, options) => { calls.push({ url, options }); return json({ address: 'Sheet1!A1:Z100', text: [['Name', 'Phone'], ['Seller', '123']] }); } });
  const result = await read({ userId: 'alice', provider: 'microsoft', feature: 'sheets', input: { fileId: 'file!1', sheetName: 'Sheet 1' } });
  assert.equal(result.rows[1][0], 'Seller');
  assert.ok(calls[0].url.includes("range(address='A1:Z100')"));
  assert.equal(calls[0].options.method, undefined);
  await assert.rejects(read({ userId: 'alice', provider: 'microsoft', feature: 'sheets', input: { fileId: '../bad' } }));
});
function fixture({ expired = false, provider = 'google', fetchImpl, rotate } = {}) {
  const owner = { ...identity, provider };
  const vault = createTokenVault(Buffer.alloc(32, 1));
  let row = { ...owner, scopes: INTEGRATION_PROVIDERS[provider].scopes.email,
    expiresAt: expired ? 0 : 3600000, secret: vault.seal({ accessToken: 'access', refreshToken: 'refresh' }, owner.userId, provider, 'email') };
  const calls = [];
  const store = {
    getConnection: async who => who.userId === owner.userId && who.provider === owner.provider && who.feature === owner.feature ? row : null,
    rotateConnection: async value => { calls.push(value); if (rotate) return rotate(); row = { ...row, ...value }; return true; },
  };
  return { owner, vault, calls, get row() { return row; }, set row(value) { row = value; }, tokens: createIntegrationTokens({ store, vault,
    configs: { [provider]: { clientId: 'client', clientSecret: 'secret' } }, now: () => 100000,
    fetchImpl: fetchImpl || (async () => json({ access_token: 'new', refresh_token: 'rotated', expires_in: 3600, token_type: 'Bearer' })),
  }) };
}
test('current tokens do not refresh; missing and cross-user connections fail closed', async () => {
  const f = fixture({ fetchImpl: () => assert.fail('must not fetch') });
  assert.equal(await f.tokens.accessToken(identity), 'access');
  await assert.rejects(f.tokens.accessToken({ ...identity, userId: 'bob' }), { code: 'reconnect' });
  await assert.rejects(f.tokens.accessToken({ ...identity, provider: '__proto__' }), { code: 'invalid_input' });
});

test('extra permission checks apply to the exact token context without breaking read-only access', async () => {
  const f = fixture({ provider: 'microsoft' });
  f.row = { ...f.row, scopes: ['Mail.Read'] };
  assert.equal(await f.tokens.accessToken(f.owner), 'access');
  await assert.rejects(f.tokens.requireScopes(f.owner, ['Mail.Send']), { code: 'reconnect' });
  f.row = { ...f.row, scopes: ['Mail.Read', 'Mail.Send'] };
  const context = await f.tokens.context(f.owner, ['Mail.Send']);
  assert.equal(context.connectionSecret, f.row.secret);
  assert.equal(context.accessToken, 'access');
});
test('expired tokens refresh once per concurrent owner/feature and encrypt rotated tokens', async () => {
  let exchanges = 0;
  const f = fixture({ expired: true, fetchImpl: async (url, options) => {
    exchanges++;
    assert.equal(url, INTEGRATION_PROVIDERS.google.token);
    assert.equal(options.body.get('grant_type'), 'refresh_token');
    assert.equal(options.redirect, 'error');
    return json({ access_token: 'new', refresh_token: 'rotated', expires_in: 3600, token_type: 'Bearer' });
  } });
  assert.deepEqual(await Promise.all([f.tokens.accessToken(identity), f.tokens.accessToken(identity)]), ['new', 'new']);
  assert.equal(exchanges, 1);
  assert.equal(f.calls.length, 1);
  assert.equal(f.vault.open(f.row.secret, 'alice', 'google', 'email').refreshToken, 'rotated');
});
test('refresh preserves an omitted refresh token and validates Microsoft qualified scopes', async () => {
  const f = fixture({ expired: true, provider: 'microsoft', fetchImpl: async () => json({ access_token: 'new', expires_in: 3600,
    token_type: 'Bearer', scope: 'https://graph.microsoft.com/mail.read' }) });
  await f.tokens.accessToken(f.owner);
  assert.equal(f.vault.open(f.row.secret, 'alice', 'microsoft', 'email').refreshToken, 'refresh');
  assert.ok(includesScopes('microsoft', ['https://graph.microsoft.com/Files.Read'], ['offline_access', 'Files.Read']));
  assert.equal(includesScopes('microsoft', ['Files.Read'], ['Mail.Read']), false);
});
test('disconnect during refresh cannot recreate the connection', async () => {
  const f = fixture({ expired: true, rotate: () => { f.row = null; return false; } });
  await assert.rejects(f.tokens.accessToken(identity), { code: 'changed' });
  assert.equal(f.row, null);
});
test('refresh does not overwrite newer credentials from another worker', async () => {
  const f = fixture({ expired: true, rotate: () => {
    f.row = { ...f.row, expiresAt: 3600000, secret: f.vault.seal({ accessToken: 'winner', refreshToken: 'winner-refresh' }, 'alice', 'google', 'email') };
    return false;
  } });
  assert.equal(await f.tokens.accessToken(identity), 'winner');
});
test('invalid tokens or reduced permissions are not persisted', async () => {
  for (const patch of [{ scope: 'unrelated' }, { expires_in: -1 }, { token_type: 'MAC' }, { refresh_token: '' }]) {
    const f = fixture({ expired: true, fetchImpl: async () => json({ access_token: 'new', expires_in: 3600, token_type: 'Bearer', ...patch }) });
    await assert.rejects(f.tokens.accessToken(identity), { code: 'reconnect' });
    assert.equal(f.calls.length, 0);
  }
});
test('provider errors, redirects and oversized payloads are sanitized', async () => {
  await assert.rejects(providerJson(async () => new Response('secret error', { status: 401 }), 'https://example.test'), { code: 'reconnect' });
  await assert.rejects(providerJson(async () => new Response('invalid_grant secret', { status: 400 }), 'https://example.test', {}, true), { code: 'reconnect' });
  await assert.rejects(providerJson(async () => { throw new Error('secret'); }, 'https://example.test'), { message: 'The provider is unavailable. Please try again later' });
  await assert.rejects(providerJson(async () => new Response('x'.repeat(2 * 1024 * 1024 + 1)), 'https://example.test'), { code: 'unavailable' });
});
function readFixture(responses) {
  const calls = [];
  const identities = [];
  const read = createIntegrationReads({ tokens: { accessToken: async owner => { identities.push(owner); return 'access'; } },
    fetchImpl: async (url, options) => { calls.push({ url: new URL(url), options }); return json(responses.shift()); }, now: () => Date.parse('2026-09-21T12:00:00Z') });
  return { read, calls, identities };
}
test('Gmail reads bounded inbox metadata without returning unselected data', async () => {
  const f = readFixture([{ messages: [{ id: 'abc' }], nextPageToken: 'not-returned' }, { snippet: 'Hello', raw: 'private-body', payload: { headers: [{ name: 'Subject', value: 'Viewing' }] } }]);
  const result = await f.read(identity);
  assert.equal(result.items[0].subject, 'Viewing');
  assert.equal(result.hasMore, true);
  assert.equal(JSON.stringify(result).includes('private-body'), false);
  assert.equal(f.calls[0].url.searchParams.get('maxResults'), '10');
  assert.equal(f.calls[1].url.searchParams.get('format'), 'metadata');
  assert.deepEqual(f.identities, [identity]);
});
test('Outlook reads inbox previews without opening provider pagination URLs', async () => {
  const f = readFixture([{ value: [{ id: '1', subject: 'Viewing', from: { emailAddress: { address: 'broker@example.com' } }, bodyPreview: 'Hello' }], '@odata.nextLink': 'https://attacker.test' }]);
  const result = await f.read({ ...identity, provider: 'microsoft' });
  assert.equal(result.items[0].from, 'broker@example.com');
  assert.equal(result.hasMore, true);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url.hostname, 'graph.microsoft.com');
});
test('both calendars return bounded upcoming events and preserve time zones/all-day dates', async () => {
  for (const provider of ['google', 'microsoft']) {
    const f = readFixture([provider === 'google' ? { items: [{ id: '1', summary: 'Viewing', start: { date: '2026-09-22' }, end: { date: '2026-09-23' } }] }
      : { value: [{ id: '1', subject: 'Viewing', start: { dateTime: '2026-09-22T10:00:00', timeZone: 'UTC' }, end: { dateTime: '2026-09-22T11:00:00' } }] }]);
    const result = await f.read({ ...identity, provider, feature: 'calendar' });
    assert.equal(result.items[0].title, 'Viewing');
    assert.equal(result.items[0].allDay, provider === 'google');
    assert.ok(f.calls[0].url.href.includes('2026-10-21'));
  }
});
test('Sheets uses fixed preview limits and safely encodes selected tabs', async () => {
  const f = readFixture([{ range: "'Seller list'!A1:Z100", values: [['Name', 'Phone'], ['Sample', '000']] }]);
  const result = await f.read({ ...identity, feature: 'sheets', input: { spreadsheetId: 'sheet_123', sheetName: "Seller's list" } });
  assert.equal(result.rows.length, 2);
  assert.equal(result.rowLimit, 100);
  assert.ok(decodeURIComponent(f.calls[0].url.pathname).endsWith("/'Seller''s list'!A1:Z100"));
});
test('OneDrive lists selected folder metadata, never download URLs', async () => {
  const f = readFixture([{ value: [{ id: '2', name: 'Sellers.xlsx', '@microsoft.graph.downloadUrl': 'https://secret.test' }, { id: '3', name: 'Archive', folder: {} }] }]);
  const result = await f.read({ ...identity, provider: 'microsoft', feature: 'sheets', input: { folderId: 'ABC!123' } });
  assert.equal(result.items[0].spreadsheet, true);
  assert.equal(result.items[1].folder, true);
  assert.equal(JSON.stringify(result).includes('secret.test'), false);
});
test('arbitrary URLs, unknown fields and unbounded ranges are rejected before reading credentials', async () => {
  const f = readFixture([]);
  for (const input of [{ url: 'https://attacker.test' }, { spreadsheetId: '../other' }, { spreadsheetId: 'id', range: 'A:ZZ' }, { spreadsheetId: 'id', sheetName: '\n' }]) {
    await assert.rejects(f.read({ ...identity, feature: 'sheets', input }), { code: 'invalid_input' });
  }
  await assert.rejects(f.read({ ...identity, input: { userId: 'bob' } }), { code: 'invalid_input' });
  assert.equal(f.identities.length, 0);
});
