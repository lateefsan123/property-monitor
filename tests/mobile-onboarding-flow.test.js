import test from 'node:test';
import assert from 'node:assert/strict';
import { ONBOARDING_GOALS, ONBOARDING_STEPS, onboardingDestination } from '../mobile/src/onboarding-flow.js';

test('each onboarding goal opens its real setup route', () => {
  assert.deepEqual(onboardingDestination('organise'), { page: 'spreadsheets', request: { add: true } });
  assert.deepEqual(onboardingDestination('market'), { page: 'listing-alerts', request: { search: true } });
  assert.deepEqual(onboardingDestination('connect'), { page: 'settings', request: { section: 'WhatsApp' } });
  assert.deepEqual(onboardingDestination('unknown'), onboardingDestination('organise'));
});
test('full tour introduces integrations and ends after product demonstrations', () => {
  assert.deepEqual(ONBOARDING_STEPS.map(step => step.id), ['integrations', 'goal', 'sellers', 'listings', 'messages', 'schedule', 'finish']);
  assert.equal(new Set(ONBOARDING_GOALS.map(goal => goal.id)).size, 3);
});
