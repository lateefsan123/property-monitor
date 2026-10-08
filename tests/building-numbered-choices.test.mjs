import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue, findCandidates, numberedChoices, safeCandidate } from '../supabase/functions/_shared/building-resolution.js';

const catalogue = buildCatalogue([
  { key: 'arabianranches1', search_name: 'Arabian Ranches 1' },
  { key: 'arabianranches2', search_name: 'Arabian Ranches 2' },
  { key: 'arabianranches3', search_name: 'Arabian Ranches 3' },
  { key: 'raya', search_name: 'Arabian Ranches lll - Raya, Wadi Al Safa 5', source_project: 'Arabian Ranches lll - Raya', source_area: 'Wadi Al Safa 5' },
]);

test('a name missing its number offers the numbered communities to pick from, never an automatic match', () => {
  assert.deepEqual(numberedChoices('Arabian Ranches', catalogue).map(c => c.name), ['Arabian Ranches 1', 'Arabian Ranches 2', 'Arabian Ranches 3']);
  assert.equal(safeCandidate(findCandidates('Arabian Ranches', catalogue)), null);
});

test('names that already have a number or are a single word get no numbered options', () => {
  assert.deepEqual(numberedChoices('Arabian Ranches 3', catalogue), []);
  assert.deepEqual(numberedChoices('Ranches', catalogue), []);
});
