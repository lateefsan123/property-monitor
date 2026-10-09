import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue, resolveDeterministic } from '../supabase/functions/_shared/building-resolution.js';

const dld = (project, area) => ({ key: `${project}${area}`.toLowerCase().replace(/[^a-z0-9]/g, ''), search_name: `${project}, ${area}`,
  source_project: project, source_area: area, source: 'dld_citywide' });
const old = name => ({ key: name.toLowerCase().replace(/[^a-z0-9]/g, ''), search_name: name });
const catalogue = buildCatalogue([
  dld('Club Place', 'Hadaeq Sheikh Mohammed Bin Rashid'),
  dld('THE RESIDENCES AT MARINA GATE 1', 'DUBAI MARINA'), dld('THE RESIDENCES AT MARINA GATE 2', 'DUBAI MARINA'),
  dld('JUMEIRAH LIVING MARINA GATE', 'Marsa Dubai'),
  old('The Lofts West'),
  dld('SKY VIEW TOWER', 'DUBAI MARINA'), dld('THE ADDRESS RESIDENCE SKY VIEW', 'BURJ KHALIFA'),
  dld('BLISS TOWER', 'DUBAI LAND RESIDENCE COMPLEX'),
  dld('PALACE TOWER', 'SILICON OASIS'), dld('PALACE RESIDENCES DUBAI HILLS ESTATE', 'DUBAI HILLS'),
  dld('PARK LANE', 'DUBAI HILLS'), dld('PARK LANE BY HEILBRONN', 'JUMEIRAH VILLAGE CIRCLE'),
  dld('CREEK GATE', 'DUBAI CREEK HARBOUR'), dld('CREEK GATE TOWER 1', 'DUBAI CREEK HARBOUR'),
]);
const match = raw => resolveDeterministic(raw, catalogue)?.name || null;

test('ignores filler words and expands "T" for Tower', () => {
  assert.equal(match('LOFTS T WEST'), 'The Lofts West');
  assert.equal(match('Marina Gate 2'), 'THE RESIDENCES AT MARINA GATE 2, DUBAI MARINA');
});

test('a tower maps to its development only when DLD records it as one project', () => {
  assert.equal(match('Club Place Tower B'), 'Club Place, Hadaeq Sheikh Mohammed Bin Rashid');
  assert.equal(resolveDeterministic('Club Place Tower B', catalogue).method, 'parent');
  // DLD has a project per Creek Gate tower, so Tower 2 is not "Creek Gate".
  assert.equal(match('Creek Gate Tower 2'), null);
});

test('ambiguous or loosely similar names go to review', () => {
  for (const raw of ['SKY VIEW', 'Palace Residences', 'Bliss', 'Marina Gate', 'Park Lane Building 1', 'Marina Gate 3']) {
    assert.equal(match(raw), null, raw);
  }
});
