import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '../mobile/node_modules/@tanstack/react-query/build/modern/index.js';
import { createAccountCacheGuard, mobileQueryDefaults } from '../mobile/src/query-cache.js';

test('fresh queries reuse cached data and invalidation fetches again', async () => {
  const client = new QueryClient({ defaultOptions: { queries: mobileQueryDefaults } });
  let reads = 0;
  const query = { queryKey: ['sellers', 'account-a'], queryFn: async () => ++reads };
  try {
    assert.equal(await client.fetchQuery(query), 1);
    assert.equal(await client.fetchQuery(query), 1);
    await client.invalidateQueries({ queryKey: query.queryKey });
    assert.equal(await client.fetchQuery(query), 2);
  } finally { client.clear(); }
});

test('token refresh keeps data; switching accounts and signing out discard it', () => {
  const client = new QueryClient();
  const sync = createAccountCacheGuard(client);
  sync('account-a');
  client.setQueryData(['sellers', 'account-a'], ['private seller']);
  sync('account-a');
  assert.deepEqual(client.getQueryData(['sellers', 'account-a']), ['private seller']);
  sync('account-b');
  assert.equal(client.getQueryData(['sellers', 'account-a']), undefined);
  client.setQueryData(['sellers', 'account-b'], ['another seller']);
  sync(null);
  assert.equal(client.getQueryCache().getAll().length, 0);
  client.clear();
});
