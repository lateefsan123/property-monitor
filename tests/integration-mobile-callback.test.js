import test from 'node:test';
import assert from 'node:assert/strict';
import { mobileIntegrationCallback } from '../src/integration-mobile-callback.js';

test('native callback uses a fixed app scheme and preserves opaque state/code', () => {
  const state = `m_${'a'.repeat(43)}`;
  const url = new URL(mobileIntegrationCallback({ provider: 'google', state, code: 'code+/=&', returnUrl: 'https://attacker.test' }));
  assert.equal(url.protocol, 'seller-signal:'); assert.equal(url.hostname, 'integrations');
  assert.equal(url.searchParams.get('code'), 'code+/=&'); assert.equal(url.searchParams.get('state'), state);
  assert.equal(url.searchParams.has('returnUrl'), false);
});
test('web, malformed and unsupported callbacks never open a native destination', () => {
  for (const callback of [{ provider: 'google', state: 'a'.repeat(43) }, { provider: 'evil', state: `m_${'a'.repeat(43)}` }, { provider: 'google', state: 'm_bad' }]) assert.equal(mobileIntegrationCallback(callback), null);
});
