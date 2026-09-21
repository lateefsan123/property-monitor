import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntegrationHandler } from '../server/integration-api.js';
import { createIntegrationStore } from '../server/integration-store.js';

function fixture() {
  const calls = [];
  const handler = createIntegrationHandler({
    authenticate: async token => token === 'valid' ? { id: 'owner' } : null,
    configured: provider => provider === 'google',
    read: async args => { calls.push(['read', args]); return { kind: 'email', items: [] }; },
    mail: { prepare: async args => { calls.push(['prepare', args]); return { confirmation: 'opaque' }; }, confirm: async args => { calls.push(['confirm', args]); return { status: 'accepted' }; } },
    store: { list: async user => { calls.push(['list', user]); return [{ provider: 'google', feature: 'sheets', secret: 'never-return' }]; },
      disconnect: async args => calls.push(['disconnect', args]) },
    oauth: { begin: async args => { calls.push(['begin', args]); return { authorizationUrl: 'https://accounts.google.com/test' }; },
      complete: async args => { calls.push(['complete', args]); return { status: 'connected' }; } },
  });
  return { calls, run: async (body, token = 'valid', method = 'POST') => {
    const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } };
    await handler({ method, headers: { authorization: `Bearer ${token}` }, body }, res);
    return res;
  } };
}
test('all operations require a verified session and reject caller-supplied owners', async () => {
  const { run, calls } = fixture();
  for (const action of ['status', 'begin', 'complete', 'disconnect', 'read', 'prepare_email', 'confirm_email']) {
    assert.equal((await run({ action }, 'invalid')).statusCode, 401);
    assert.equal((await run({ action, userId: 'victim' })).statusCode, 400);
  }
  assert.deepEqual(calls, []);
});

test('email confirmation accepts only an opaque preview id, not modified contents or approval flags', async () => {
  const { run, calls } = fixture();
  const base = { action: 'confirm_email', provider: 'google', feature: 'email', confirmation: 'opaque' };
  assert.equal((await run({ ...base, input: { to: 'changed@example.com' } })).statusCode, 400);
  assert.equal((await run({ ...base, approved: true })).statusCode, 400);
  assert.equal((await run(base)).statusCode, 200);
  assert.deepEqual(calls, [['confirm', { userId: 'owner', provider: 'google', confirmation: 'opaque' }]]);
});
test('read API derives the owner from authentication and passes only allowed inputs', async () => {
  const { run, calls } = fixture();
  const result = await run({ action: 'read', provider: 'google', feature: 'email', input: {} });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(calls, [['read', { userId: 'owner', provider: 'google', feature: 'email', input: {} }]]);
  assert.equal((await run({ action: 'read', provider: 'google', feature: 'email', accessToken: 'forged' })).statusCode, 400);
});
test('status returns six safe connection summaries, never credentials', async () => {
  const { run, calls } = fixture();
  const res = await run({ action: 'status' });
  assert.equal(res.body.connections.length, 6);
  assert.equal(res.body.connections[0].connected, true);
  assert.equal(JSON.stringify(res.body).includes('never-return'), false);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.deepEqual(calls, [['list', 'owner']]);
});
test('begin, callback and disconnect use the verified owner', async () => {
  const { run, calls } = fixture();
  for (const action of ['begin', 'disconnect']) {
    assert.equal((await run({ action, provider: 'google', feature: 'email' })).statusCode, 200);
  }
  assert.equal((await run({ action: 'complete', provider: 'google', state: 'state', code: 'code' })).statusCode, 200);
  assert.ok(calls.every(([, args]) => args.userId === 'owner'));
});
test('unconfigured and invalid requests never start OAuth', async () => {
  const { run, calls } = fixture();
  assert.equal((await run({ action: 'begin', provider: 'microsoft', feature: 'email' })).statusCode, 503);
  assert.equal((await run({ action: 'begin', provider: '__proto__', feature: 'email' })).statusCode, 400);
  assert.equal((await run({ action: 'begin', provider: 'google', feature: 'admin' })).statusCode, 400);
  assert.equal((await run('{bad-json')).statusCode, 400);
  assert.equal((await run({ action: 'status' }, 'valid', 'GET')).statusCode, 405);
  assert.deepEqual(calls, []);
});
test('storage consumes state in one scoped RPC and excludes tokens from lists', async () => {
  const calls = [];
  const db = {
    rpc: async (name, args) => { calls.push([name, args]); return { data: [{ user_id: 'owner', provider: 'google', feature: 'email', expires_at: 100, secret: 'encrypted' }] }; },
    from: table => ({ select: fields => ({ eq: async (key, value) => { calls.push([table, fields, key, value]); return { data: [] }; } }) }),
  };
  const store = createIntegrationStore(db);
  const pending = await store.consumePending({ userId: 'owner', provider: 'google', hash: 'hash', now: 1 });
  assert.equal(pending.userId, 'owner');
  assert.deepEqual(calls[0], ['consume_integration_oauth', { p_hash: 'hash', p_user: 'owner', p_provider: 'google', p_now: 1 }]);
  await store.list('owner');
  assert.deepEqual(calls[1], ['integration_connections', 'provider,feature,expires_at,scopes', 'user_id', 'owner']);
});
test('token rotation updates only the matching owner, provider, feature and previous ciphertext', async () => {
  const calls = [];
  const query = {
    update(value) { calls.push(['update', value]); return this; },
    eq(key, value) { calls.push([key, value]); return this; },
    async select(fields) { calls.push(['select', fields]); return { data: [] }; },
  };
  const store = createIntegrationStore({ from: table => { calls.push(['table', table]); return query; } });
  assert.equal(await store.rotateConnection({ userId: 'owner', provider: 'google', feature: 'email', previousSecret: 'old', secret: 'new', scopes: ['scope'], expiresAt: 100 }), false);
  assert.deepEqual(calls, [['table', 'integration_connections'], ['update', { secret: 'new', scopes: ['scope'], expires_at: 100 }],
    ['user_id', 'owner'], ['provider', 'google'], ['feature', 'email'], ['secret', 'old'], ['select', 'provider']]);
});
