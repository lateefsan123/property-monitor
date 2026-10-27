import test from 'node:test';
import assert from 'node:assert/strict';
import { listingPhotoUrl } from '../shared/listing-photo-url.js';

test('saved Bayut photos use the working host without changing photo identity or size', () => {
  assert.equal(listingPhotoUrl('https://images.byt.com/thumbnails/870547204-800x600.jpeg'),
    'https://images.bayut.com/thumbnails/870547204-800x600.jpeg');
  assert.equal(listingPhotoUrl('http://IMAGES.BYT.COM/a.jpg?size=large#photo'),
    'https://images.bayut.com/a.jpg?size=large#photo');
  const old = 'https://images.byt.com/a.jpg';
  const current = 'https://images.bayut.com/a.jpg';
  assert.deepEqual([...new Set([old, current].map(listingPhotoUrl))], [current]);
});

test('unrelated image hosts, paths and empty values remain unchanged', () => {
  for (const value of [null, undefined, '', '/landing/buildings/forte.jpg',
    'https://images.bayut.com/a.jpg', 'https://images.byt.com.example/a.jpg',
    'https://example.com/images.byt.com/a.jpg', 'https://images.byt.com@other.example/a.jpg']) {
    assert.equal(listingPhotoUrl(value), value);
  }
});
