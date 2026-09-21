import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANDING_BUILDINGS } from '../src/landing-buildings.js';

test('twelve distinct building logos fill two six-column desktop rows', () => {
  assert.equal(LANDING_BUILDINGS.length, 12);
  assert.equal(new Set(LANDING_BUILDINGS.map(b => b.name)).size, 12);
  assert.equal(LANDING_BUILDINGS.length % 6, 0);
  for (const b of LANDING_BUILDINGS) {
    const bytes = readFileSync(new URL(`../public/landing/tower-logos/${b.logo}`, import.meta.url));
    assert.ok(bytes.length > 100);
    assert.match(b.logo, /\.(png|svg)$/);
  }
  const css = readFileSync(new URL('../src/styles/landing-buildings.css', import.meta.url), 'utf8');
  assert.match(css, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 860px\)[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /gap: 0;/);
  assert.match(css, /border-right: 1px solid #45433e; border-bottom: 1px solid #45433e;/);
  assert.match(css, /width: 140px; max-width: 100%; height: 52px;/);
});

test('logo section is lazy, dimensioned and has no photo gallery or endorsement claims', () => {
  const component = readFileSync(new URL('../src/LandingBuildings.jsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/LandingPage.jsx', import.meta.url), 'utf8');
  assert.match(component, /loading="lazy"/);
  assert.match(component, /width="180"/);
  assert.match(component, /alt=\{building.name\}/);
  assert.match(component, /Your buildings\. One workspace\./);
  assert.match(component, /aria-labelledby="landing-buildings-heading"/);
  assert.doesNotMatch(component, /figcaption|Trusted by|building-photo/);
  assert.equal((page.match(/<LandingBuildings \/>/g) || []).length, 1);
  assert.doesNotMatch(page, /DUBAI_TOWERS/);
});
