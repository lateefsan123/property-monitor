import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { createApprovalStore, mountApprovalRoutes, approvalPage } from '../services/seller-signal-mcp/src/browser-approval.js';
const require = createRequire(new URL('../services/seller-signal-mcp/package.json', import.meta.url));
const request = { userId: 'owner', action: 'update_my_seller_lead', input: { leadId: '1', notes: '<script>bad</script>' } };
const idOf = result => result.approvalUrl.split('/').at(-1);

test('pending actions require the same user and one explicit approval', async () => {
  let writes = 0;
  const store = createApprovalStore({ origin: 'https://example.test' });
  const pending = store.create(request, async () => { writes++; });
  const id = idOf(pending);
  assert.equal(writes, 0);
  assert.throws(() => store.inspect(id, 'other'), /unavailable/);
  await assert.rejects(store.decide(id, 'other', true), /unavailable/);
  assert.equal(store.inspect(id, 'owner').input.notes, request.input.notes);
  const results = await Promise.allSettled([store.decide(id, 'owner', true), store.decide(id, 'owner', true)]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(writes, 1);
});

test('declines, expiry, lost state and execution failures never enable retries', async () => {
  let clock = 0, writes = 0;
  const store = createApprovalStore({ origin: 'https://example.test', now: () => clock, ttl: 100 });
  let id = idOf(store.create(request, async () => { writes++; }));
  await store.decide(id, 'owner', false);
  await assert.rejects(store.decide(id, 'owner', true), /already/);
  id = idOf(store.create(request, async () => { writes++; }));
  clock = 101;
  await assert.rejects(store.decide(id, 'owner', true), /expired/);
  await assert.rejects(store.decide('unknown', 'owner', true), /expired/);
  id = idOf(store.create(request, async () => { throw new Error('private database detail'); }));
  await assert.rejects(store.decide(id, 'owner', true), /could not be confirmed/);
  await assert.rejects(store.decide(id, 'owner', true), /already/);
  assert.equal(writes, 0);
});

test('browser routes reject OAuth tokens, wrong origins and cross-account access', async () => {
  const express = require('express');
  const app = express(); app.use(express.json());
  const store = createApprovalStore({ origin: 'https://example.test' });
  let writes = 0;
  const id = idOf(store.create(request, async () => { writes++; }));
  const token = claims => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
  const direct = token({ role: 'authenticated' });
  mountApprovalRoutes(app, { store, origin: 'https://example.test', config: { url: 'https://auth.example.test', publishableKey: 'public-key' }, verifyUser: async value => value === direct ? { id: 'owner' } : null });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/approve/${id}`;
  try {
    const page = await fetch(base);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
    const send = (origin, auth, body) => fetch(`${base}/decision`, { method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    for (const [origin, auth, body] of [
      ['https://evil.test', direct, { approve: true }],
      ['https://example.test', token({ role: 'authenticated', client_id: 'oauth-app' }), { approve: true }],
      ['https://example.test', token({ role: 'service_role' }), { approve: true }],
      ['https://example.test', 'bad', { approve: true }],
      ['https://example.test', direct, { approve: 'true' }],
    ]) assert.equal((await send(origin, auth, body)).status, 400);
    assert.equal(writes, 0);
    assert.equal((await send('https://example.test', direct, { approve: true })).status, 200);
    assert.equal(writes, 1);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('approval page never embeds action data or privileged keys', () => {
  const page = approvalPage({ url: 'https://auth.example.test', publishableKey: 'public-key', serviceRoleKey: 'SECRET', nonce: 'nonce' });
  assert.ok(!page.includes('SECRET'));
  assert.match(page, /textContent=JSON.stringify/);
  assert.ok(!page.includes('localStorage'));
});
