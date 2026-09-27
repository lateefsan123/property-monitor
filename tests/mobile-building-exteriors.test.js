import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getBuildingExterior, selectBuildingResults } from '../mobile/src/features/listing-alerts/building-exteriors.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const manifest = read('../mobile/src/data/building-exteriors.json');

test('every catalogue and bundled-feed building has a bundled exterior and source', () => {
  const registry = read('../public/data/downtown-dubai-building-registry.json');
  const feed = read('../mobile/src/data/listing-alerts-feed.json');
  for (const name of [...registry.buildings.map((b) => b.canonical_name), ...feed.buildings.map((b) => b.buildingName)]) {
    const image = getBuildingExterior(name);
    assert.ok(image, name);
    assert.ok(existsSync(new URL(`../mobile/assets/buildings/${image.asset}`, import.meta.url)), name);
    assert.match(image.sourcePage, /^https:\/\//);
    assert.doesNotMatch(image.sourceImage, /\/(Building_Guide|building_cover)|\.svg/i);
  }
});

test('aliases do not silently map to different buildings', () => {
  const aliases = new Map();
  for (const image of manifest) {
    for (const name of [image.name, ...image.aliases]) {
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (aliases.has(key)) assert.equal(aliases.get(key), image.asset, name);
      aliases.set(key, image.asset);
    }
  }
});

test('tower identity stays exact and unrelated listing photos are never used', () => {
  assert.equal(getBuildingExterior('FORTE 2').label, 'Forte complex');
  assert.ok(getBuildingExterior('The St. Regis The Residences Tower 2'));
  assert.equal(getBuildingExterior('The St. Regis Residences Financial Centre Road'), null);
  assert.equal(getBuildingExterior({ buildingName: 'Forte 99', imageUrl: 'apartment.jpg' }), null);
  assert.equal(getBuildingExterior('Burj Khalifa View'), null);
});

test('watching only intersects search results without adding unrelated watched buildings', () => {
  const a = { locationId: '1' }, b = { locationId: '2' }, c = { locationId: '3' };
  const input = { watchedBuildings: [a, b], searchResults: [b, c], searching: true };
  assert.deepEqual(selectBuildingResults(input), [b, c]);
  assert.deepEqual(selectBuildingResults({ ...input, watchingOnly: true }), [b]);
  assert.deepEqual(selectBuildingResults({ ...input, watchingOnly: true, selectedBuilding: c }), []);
  assert.deepEqual(selectBuildingResults({ ...input, watchingOnly: true, searching: false }), [a, b]);
  assert.deepEqual(selectBuildingResults({ ...input, watchingOnly: true, watchedBuildings: [] }), []);
});
