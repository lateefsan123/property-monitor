import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowOnboarding } from '../mobile/src/onboarding-flow.js';
import { resolveSubscriptionAccess } from '../mobile/src/subscription-access.js';
import { complimentaryAccess } from '../supabase/functions/_shared/complimentary-access.js';

test('fresh installs and restored accounts never require onboarding', () => {
  assert.equal(shouldShowOnboarding(undefined, null), false);
  assert.equal(shouldShowOnboarding(undefined, 'existing-user'), false);
});

test('tour is opt-in and signing in or switching accounts leaves it', () => {
  assert.equal(shouldShowOnboarding(null, null), true);
  assert.equal(shouldShowOnboarding(null, 'existing-user'), false);
  assert.equal(shouldShowOnboarding('existing-user', 'existing-user'), true);
  assert.equal(shouldShowOnboarding('existing-user', 'other-user'), false);
  assert.equal(shouldShowOnboarding('existing-user', null), false);
});

const baseline = { userId: 'current', store: { userId: 'current', isPro: false, loading: false }, sharedSubscription: null, sharedLoading: false, sharedError: null };
test('server-confirmed unlimited access works without an App Store purchase', () => {
  const access = complimentaryAccess({ id: '441421f9-1089-4694-a66e-ab75b5459003' });
  for (const subscription of [access, { source: 'complimentary', status: 'active', unlimited: true }]) {
    const result = resolveSubscriptionAccess({ ...baseline, sharedSubscription: subscription, store: { ...baseline.store, loading: true, error: 'Store unavailable' } });
    assert.equal(result.hasAccess, true);
    assert.equal(result.isLoading, false);
    assert.equal(result.verificationError, null);
  }
});

test('pending and failed checks cannot be presented as confirmed unpaid access', () => {
  assert.equal(resolveSubscriptionAccess({ ...baseline, sharedLoading: true }).isLoading, true);
  const failed = resolveSubscriptionAccess({ ...baseline, sharedError: new Error('Offline') });
  assert.equal(failed.hasAccess, false);
  assert.match(failed.verificationError, /verify your access/);
  assert.equal(resolveSubscriptionAccess(baseline).verificationError, null);
});

test('previous account store entitlements cannot unlock the next account', () => {
  const result = resolveSubscriptionAccess({ ...baseline, store: { userId: 'previous', isPro: true } });
  assert.equal(result.hasAccess, false);
  assert.equal(result.isLoading, true);
  assert.equal(resolveSubscriptionAccess({ ...baseline, sharedSubscription: { unlimited: true, status: 'active' } }).hasAccess, false);
});

test('valid store access remains usable if the shared endpoint is unavailable', () => {
  const result = resolveSubscriptionAccess({ ...baseline, store: { ...baseline.store, isPro: true }, sharedError: new Error('Offline') });
  assert.equal(result.hasAccess, true);
  assert.equal(result.verificationError, null);
});
