'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getExternalUrl, isAppNavigationUrl } = require('../url-policy.cjs');

const APP_URL = 'https://sellersignal.vercel.app';

test('allows navigation within the Repeat AI production origin', () => {
  assert.equal(isAppNavigationUrl(`${APP_URL}/settings?tab=automation`, APP_URL), true);
});

test('does not treat another website as app navigation', () => {
  assert.equal(isAppNavigationUrl('https://www.bayut.com/property/details-1.html', APP_URL), false);
});

test('only returns safe browser protocols for external URLs', () => {
  assert.equal(
    getExternalUrl('https://www.bayut.com/property/details-1.html'),
    'https://www.bayut.com/property/details-1.html',
  );
  assert.equal(getExternalUrl('javascript:alert(1)'), null);
  assert.equal(getExternalUrl('file:///C:/Windows/System32/calc.exe'), null);
});
