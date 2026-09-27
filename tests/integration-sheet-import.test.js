import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntegrationReads } from '../server/integration-reads.js';
const json = value => new Response(JSON.stringify(value));
const owner = { userId: 'alice', provider: 'google', feature: 'sheets' };
function fixture(responses) {
  const calls = [];
  const identities = [];
  const tokens = { accessToken: async identity => { identities.push(identity); return 'secret'; }, requireScopes: async (identity, scopes) => { identities.push({ ...identity, scopes }); return 'secret'; } };
  return { calls, identities, read: createIntegrationReads({ tokens, fetchImpl: async (url, options) => { calls.push({ url: new URL(url), options }); return json(responses.shift()); } }) };
}
test('connected Google import reads more than the preview and preserves cells without truncation', async () => {
  const rows = [['Name', 'Building'], ...Array.from({ length: 150 }, (_, index) => [`Seller ${index}`, 'Forte'])];
  const f = fixture([{ values: rows }]);
  const result = await f.read({ ...owner, input: { operation: 'rows', fileId: 'sheet_1', sheetName: "Seller's list" } });
  assert.deepEqual(result.rows, rows);
  assert.equal(result.kind, 'sheet-import');
  assert.equal(decodeURIComponent(f.calls[0].url.pathname).endsWith("/values/'Seller''s list'"), true);
  assert.equal(f.identities[0].userId, 'alice');
  assert.equal(f.calls[0].options.redirect, 'error');
});
test('oversized and empty worksheets fail instead of importing a partial result', async () => {
  for (const values of [[['Name']], Array.from({ length: 10002 }, () => ['seller']), [['Name'], Array(101).fill('cell')]]) {
    const f = fixture([{ values }]);
    await assert.rejects(f.read({ ...owner, input: { operation: 'rows', fileId: 'sheet', sheetName: 'Sellers' } }), { code: 'invalid_input' });
  }
});
test('Excel sharing link resolves through Graph only and workbook reads require scoped owner', async () => {
  const f = fixture([{ id: 'file!1', name: 'Sellers.xlsx', parentReference: { driveId: 'drive!1' } }, { text: [['Name'], ['Alice']], rowCount: 2 }]);
  const result = await f.read({ ...owner, provider: 'microsoft', input: { operation: 'resolve', url: 'https://tenant.sharepoint.com/:x:/s/team/link' } });
  assert.equal(result.file.driveId, 'drive!1');
  assert.equal(f.calls[0].url.origin, 'https://graph.microsoft.com');
  assert.ok(f.calls[0].url.pathname.startsWith('/v1.0/shares/u!'));
  const rows = await f.read({ ...owner, provider: 'microsoft', input: { operation: 'rows', fileId: result.file.id, driveId: result.file.driveId, sheetName: 'Sellers' } });
  assert.equal(rows.rows.length, 2);
  assert.deepEqual(f.identities[1].scopes, ['Files.ReadWrite']);
  assert.equal(f.identities[1].userId, 'alice');
  assert.ok(f.calls[1].url.pathname.includes('/drives/drive!1/items/file!1/workbook/'));
});
test('untrusted links and extra operations never reach providers', async () => {
  const f = fixture([]);
  for (const url of ['http://1drv.ms/link', 'https://evil.test/a.xlsx', 'https://tenant.sharepoint.com.evil.test/a', 'https://user:pass@1drv.ms/link']) await assert.rejects(f.read({ ...owner, provider: 'microsoft', input: { operation: 'resolve', url } }));
  await assert.rejects(f.read({ ...owner, input: { operation: 'rows', fileId: '../file', sheetName: 'Sellers' } }));
  await assert.rejects(f.read({ ...owner, input: { operation: 'browse', userId: 'bob' } }));
  assert.equal(f.calls.length, 0); assert.equal(f.identities.length, 0);
});
test('OneDrive pagination stays on the selected folder and excludes unsupported formats', async () => {
  const f = fixture([{ value: [{ id: 'one', name: 'One.xlsx' }, { id: 'old', name: 'Old.xls' }, { id: 'folder', name: 'Folder', folder: {} }], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/drive/items/folder1/children?$skiptoken=next' }]);
  const result = await f.read({ ...owner, provider: 'microsoft', input: { operation: 'browse', folderId: 'folder1', pageToken: 'before' } });
  assert.equal(result.nextPageToken, 'next');
  assert.deepEqual(result.items.map(item => item.id), ['one', 'folder']);
  assert.equal(f.calls[0].url.searchParams.get('$skiptoken'), 'before');
});
