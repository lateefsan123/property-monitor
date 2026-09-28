import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingRequest } from '../src/billing-request.js';
import { billingFailureState } from '../src/billing-state.js';
import { hasActiveSubscription } from '../src/billing-access.js';

const failure = (status) => ({ error: { context: { status } } });
test('stalled access check times out, aborts transport and allows a later recovery', async () => {
  let calls = 0;
  let signal;
  const request = createBillingRequest({
    functions: { invoke: async (_, options) => {
      calls++;
      signal = options.signal;
      return calls === 1 ? new Promise(() => {}) : { data: { subscription: null } };
    } },
  }, 10);
  await assert.rejects(request('get-billing-access'), /couldn’t connect/);
  assert.equal(signal.aborted, true);
  assert.equal(calls, 1);
  assert.deepEqual(await request('get-billing-access'), { subscription: null });
  assert.equal(signal.aborted, false);
});
test('a timed-out checkout is never automatically replayed', async () => {
  let calls = 0;
  const request = createBillingRequest({
    auth: { refreshSession: () => assert.fail('must not refresh on timeout') },
    functions: { invoke: async () => { calls++; return new Promise(() => {}); } },
  }, 10);
  await assert.rejects(request('create-checkout-session'), /couldn’t connect/);
  assert.equal(calls, 1);
});
test('expired billing token refreshes once and uses the new token', async () => {
  const calls = [];
  let refreshes = 0;
  const request = createBillingRequest({
    auth: { refreshSession: async () => { refreshes++; return { data: { session: { access_token: 'fresh' } } }; } },
    functions: { invoke: async (...args) => { calls.push(args); return calls.length === 1 ? failure(401) : { data: { subscription: null } }; } },
  });
  assert.deepEqual(await request('get-billing-access'), { subscription: null });
  assert.equal(refreshes, 1);
  assert.equal(calls[1][1].headers.Authorization, 'Bearer fresh');
});
test('persistent 401 stops after one retry without a retry loop', async () => {
  let calls = 0;
  const request = createBillingRequest({
    auth: { refreshSession: async () => ({ data: { session: { access_token: 'fresh' } } }) },
    functions: { invoke: async () => { calls++; return failure(401); } },
  });
  await assert.rejects(request('get-billing-access'), /couldn’t connect/);
  assert.equal(calls, 2);
});
test('server failures do not replay checkout or sign out', async () => {
  let calls = 0;
  const request = createBillingRequest({
    auth: { refreshSession: () => assert.fail('must not refresh on 503'), signOut: () => assert.fail('must not sign out') },
    functions: { invoke: async () => { calls++; return failure(503); } },
  });
  await assert.rejects(request('create-checkout-session'), /couldn’t connect/);
  assert.equal(calls, 1);
});
test('failed refresh retains only the same account entitlement and respects expiry', () => {
  const subscription = { status: 'active', raw: { livemode: true }, current_period_end: '2026-10-01T00:00:00Z' };
  const previous = { userId: 'a', subscription };
  const next = billingFailureState(previous, 'a', 'offline');
  assert.equal(next.subscription, subscription);
  assert.equal(hasActiveSubscription(next.subscription, Date.parse('2026-09-27')), true);
  assert.equal(hasActiveSubscription(next.subscription, Date.parse('2026-10-02')), false);
  assert.equal(billingFailureState(previous, 'b', 'offline').subscription, null);
  assert.equal(billingFailureState({ userId: 'a', subscription: null }, 'a', 'offline').subscription, null);
});
