import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { getBuildingExteriorEntry, getBuildingImage } from '../src/features/listing-alerts/building-images.js';

test('verified projects have local exterior images', () => {
  for (const name of ['Forte 1', 'Forte 2', 'Burj Khalifa', "One Za'abeel", 'Marina Gate I', 'St. Regis Financial Centre Road', 'Jumeirah Living Business Bay']) {
    const image = getBuildingImage(name);
    assert.ok(image, name);
    assert.ok(existsSync(new URL(`../public${image.src}`, import.meta.url)), name);
  }
  assert.match(getBuildingImage('Forte 1').alt, /complex architectural render/);
  assert.deepEqual(getBuildingImage('  BURJ   KHALIFA '), getBuildingImage('Burj Khalifa'));
});

test('unknown and similarly named towers never receive a different building image', () => {
  for (const name of [null, '', 'Forte 10', 'Marina Gate II', 'Jumeirah Living Marina Gate', 'St. Regis Residences', 'Burj Khalifa View', 'One Zaabeel The Residences']) {
    assert.equal(getBuildingImage(name), null, name);
    assert.equal(getBuildingExteriorEntry(name), null, name);
  }
});

test('web uses the mobile exterior registry with exact tower identity', () => {
  const tower1 = getBuildingExteriorEntry('The St. Regis The Residences Tower 1');
  const tower2 = getBuildingExteriorEntry('the st regis the residences tower 2');
  assert.equal(tower1.name, 'The St. Regis The Residences Tower 1');
  assert.equal(tower2.name, 'The St. Regis The Residences Tower 2');
  assert.equal(tower1.scope, 'complex');
  assert.equal(getBuildingExteriorEntry('St. Regis Financial Centre Road'), null);
  for (const entry of [tower1, tower2]) {
    assert.ok(existsSync(new URL(`../mobile/assets/buildings/${entry.asset}`, import.meta.url)), entry.asset);
  }
});
