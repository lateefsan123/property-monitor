import test from 'node:test';
import assert from 'node:assert/strict';
import { ONBOARDING_GOALS, ONBOARDING_STEPS, onboardingDestination, toggleOnboardingGoal } from '../mobile/src/onboarding-flow.js';

test('each onboarding goal opens its real setup route', () => {
  assert.deepEqual(onboardingDestination('organise'), { page: 'spreadsheets', request: { add: true } });
  assert.deepEqual(onboardingDestination('market'), { page: 'listing-alerts', request: { search: true } });
  assert.deepEqual(onboardingDestination('connect'), { page: 'settings', request: { section: 'WhatsApp' } });
  assert.deepEqual(onboardingDestination('unknown'), onboardingDestination('organise'));
});
test('full tour introduces integrations and ends after product demonstrations', () => {
  assert.deepEqual(ONBOARDING_STEPS.map(step => step.id), ['integrations', 'goal', 'sellers', 'listings', 'messages', 'schedule', 'account', 'username', 'finish']);
  assert.equal(new Set(ONBOARDING_GOALS.map(goal => goal.id)).size, 3);
});

test('goals toggle independently and the last selection can be removed', () => {
  let selected = toggleOnboardingGoal([], 'organise');
  selected = toggleOnboardingGoal(selected, 'market');
  assert.deepEqual(selected, ['organise', 'market']);
  assert.deepEqual(onboardingDestination(selected), { page: 'home' });
  selected = toggleOnboardingGoal(selected, 'organise');
  assert.deepEqual(onboardingDestination(selected), onboardingDestination('market'));
  assert.deepEqual(toggleOnboardingGoal(selected, 'market'), []);
  assert.deepEqual(onboardingDestination([]), { page: 'home' });
});
