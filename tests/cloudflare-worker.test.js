import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { runHandler } from '../cloudflare/worker.js';

test('adapter preserves JSON body, request headers, status and response headers', async () => {
  const result = await runHandler((req, res) => {
    assert.equal(req.headers.authorization, 'Bearer example');
    assert.deepEqual(JSON.parse(req.body), { action: 'status' });
    res.statusCode = 202;
    res.setHeader('Content-Type', 'application/json');
    res.end('{"ok":true}');
  }, new Request('https://example.com/api/integrations', {
    method: 'POST', headers: { authorization: 'Bearer example' }, body: '{"action":"status"}',
  }));
  assert.equal(result.status, 202);
  assert.deepEqual(await result.json(), { ok: true });
});

test('adapter rejects oversized request bodies before invoking the handler', async () => {
  const result = await runHandler(() => assert.fail('handler must not run'),
    new Request('https://example.com/api/voice', { method: 'POST', body: 'x'.repeat(500001) }));
  assert.equal(result.status, 413);
});

test('SPA legal routes fall back to index while unknown APIs remain 404', async () => {
  const assets = { fetch: async request => new URL(request.url).pathname === '/index.html'
    ? new Response('SPA') : new Response('missing', { status: 404 }) };
  const legal = await worker.fetch(new Request('https://example.com/data-deletion'), { ASSETS: assets });
  assert.equal(legal.status, 200);
  assert.equal(await legal.text(), 'SPA');
  const api = await worker.fetch(new Request('https://example.com/api/missing'), { ASSETS: assets });
  assert.equal(api.status, 404);
});
