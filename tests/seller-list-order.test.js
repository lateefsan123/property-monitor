import test from 'node:test';
import assert from 'node:assert/strict';
import { orderSellerList } from '../mobile/src/features/seller-signal/seller-list-order.js';
const leads = [{ id: 1, name: 'Zara' }, { id: 2, name: 'Amira' }, { id: 3, name: 'Ben' }];
test('pins move sellers first without mutating the source list', () => {
  assert.deepEqual(orderSellerList(leads, { pins: ['3'] }).map(row => row.id), [3, 1, 2]);
  assert.deepEqual(leads.map(row => row.id), [1, 2, 3]);
});
test('unpinning restores default order and alphabetical sorting keeps pins first', () => {
  assert.deepEqual(orderSellerList(leads).map(row => row.id), [1, 2, 3]);
  assert.deepEqual(orderSellerList(leads, { pins: ['1'], sort: 'alpha' }).map(row => row.id), [1, 2, 3]);
  assert.deepEqual(orderSellerList(leads, { sort: 'alpha' }).map(row => row.id), [2, 3, 1]);
});
test('favourites filter matches stored string ids and preserves pin ordering', () => {
  assert.deepEqual(orderSellerList(leads, { favoritesOnly: true, favorites: ['1', '3'], pins: ['3'] }).map(row => row.id), [3, 1]);
  assert.deepEqual(orderSellerList(leads, { favoritesOnly: true }), []);
});
test('unstarred sellers disappear only while favourites filter is enabled', () => {
  assert.deepEqual(orderSellerList(leads, { favoritesOnly: true, favorites: ['3'] }).map(row => row.id), [3]);
  assert.equal(orderSellerList(leads, { favorites: ['3'] }).length, 3);
});
