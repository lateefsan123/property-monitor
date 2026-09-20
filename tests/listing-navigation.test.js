import test from 'node:test';
import assert from 'node:assert/strict';
import { readListingNavigation, writeListingNavigation } from '../src/features/listing-alerts/listing-navigation.js';

test('building and listing selections form separate Back/Forward entries', () => {
  const entries = [null]; let index = 0;
  const history = {
    get state() { return entries[index]; },
    pushState(state) { entries.splice(++index); entries.push(state); },
    replaceState(state) { entries[index] = state; },
  };
  writeListingNavigation(history, { buildingId: 'forte', listingKey: null });
  writeListingNavigation(history, { buildingId: 'forte', listingKey: 'forte:123' });
  assert.equal(entries.length, 3);
  index--;
  assert.deepEqual(readListingNavigation(history.state), { buildingId: 'forte', listingKey: null });
  index--;
  assert.deepEqual(readListingNavigation(history.state), { buildingId: null, listingKey: null });
  index += 2;
  assert.equal(readListingNavigation(history.state).listingKey, 'forte:123');
  writeListingNavigation(history, { buildingId: 'forte', listingKey: 'forte:123' });
  assert.equal(entries.length, 3);
});

test('deep-link replacement preserves unrelated history state', () => {
  const history = { state: { other: 1 }, replaceState(state) { this.state = state; } };
  writeListingNavigation(history, { buildingId: 'b', listingKey: 'b:1' }, { replace: true });
  assert.equal(history.state.other, 1);
  assert.equal(readListingNavigation(history.state).listingKey, 'b:1');
  assert.deepEqual(readListingNavigation({ repeatListingNavigation: { buildingId: {} } }), { buildingId: null, listingKey: null });
});
