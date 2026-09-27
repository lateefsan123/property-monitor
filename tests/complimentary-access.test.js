import test from 'node:test';
import assert from 'node:assert/strict';
import { complimentaryAccess } from '../supabase/functions/_shared/complimentary-access.js';
import { hasActiveSubscription } from '../src/billing-access.js';

test('confirmed account receives non-expiring access without a billing record', () => {
  const access = complimentaryAccess({ id: '441421f9-1089-4694-a66e-ab75b5459003' });
  assert.equal(access.source, 'complimentary');
  assert.equal(access.amount, 0);
  assert.equal(access.current_period_end, null);
  assert.equal(hasActiveSubscription(access, Date.parse('2100-01-01')), true);
});
test('other accounts cannot obtain unlimited access through email or editable metadata', () => {
  assert.equal(complimentaryAccess(null), null);
  assert.equal(complimentaryAccess({ id: 'another-user', email: 'lateefsanusi682@gmail.com',
    user_metadata: { unlimited: true, id: '441421f9-1089-4694-a66e-ab75b5459003' } }), null);
  assert.equal(hasActiveSubscription({ source: 'complimentary', unlimited: false, status: 'active' }), false);
});
