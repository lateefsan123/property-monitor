import test from 'node:test';
import assert from 'node:assert/strict';
import { getRecentPriceDrop } from '../src/features/listing-alerts/price-drop-utils.js';

const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

test('a recent drop survives an unchanged sync and an untracked listing', () => {
  const listing = { isTracked: false, priceDelta: 0, priceHistory: [
    { type: 'price_drop', at: daysAgo(2), previousPrice: 2000000, price: 1900000, priceDelta: -100000 },
    { type: 'unchanged', at: daysAgo(1), price: 1900000 },
  ] };
  assert.equal(getRecentPriceDrop(listing).hasDrop, true);
  assert.equal(getRecentPriceDrop(listing).priceDelta, -100000);
});

test('drops outside the rolling window are excluded even when last delta is negative', () => {
  assert.equal(getRecentPriceDrop({ priceDelta: -100000, priceHistory: [
    { type: 'price_drop', at: daysAgo(15), price: 1900000, previousPrice: 2000000 },
  ] }).hasDrop, false);
});
