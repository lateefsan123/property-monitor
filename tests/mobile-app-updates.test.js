/* global process */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareVersions, getStoreRelease, readStoreRelease } from '../mobile/src/app-updates.js';
import withVariant from '../mobile/app.config.js';

const lookup = version => ({ resultCount: 1, results: [{ kind: 'software', version }] });
const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('offers only a newer live App Store version', () => {
  assert.deepEqual(readStoreRelease(lookup('1.0.2'), '1.0.1'), { version: '1.0.2', build: 0, highlights: [] });
  assert.ok(readStoreRelease(lookup('1.1'), '1.0.9'));
  assert.equal(readStoreRelease(lookup('1.0.1'), '1.0.1'), null);
  assert.equal(readStoreRelease(lookup('1.0'), '1.0.1'), null);
  assert.equal(compareVersions('1.0.10', '1.0.9'), 1);
});

test('ignores empty and malformed store responses', () => {
  for (const value of [null, {}, { results: [] }, lookup('soon'), lookup(''), { results: [{ kind: 'ebook', version: '9.0.0' }] }]) {
    assert.equal(readStoreRelease(value, '1.0.1'), null);
  }
});

test('offline and non-JSON store responses reject instead of reporting a release', async () => {
  const original = globalThis.fetch;
  try {
    for (const fetch of [async () => { throw new Error('offline'); }, async () => ({ ok: false }),
      async () => ({ ok: true, json: async () => { throw new Error('invalid'); } })]) {
      globalThis.fetch = fetch;
      await assert.rejects(getStoreRelease('1.0.1'));
    }
  } finally { globalThis.fetch = original; }
});

test('production OTA is isolated to the 1.0.1 runtime and checked by the in-app manager', () => {
  const { expo } = json('../mobile/app.json');
  const eas = json('../mobile/eas.json');
  assert.equal(expo.version, '1.0.1');
  assert.equal(expo.ios.buildNumber, '36');
  assert.deepEqual(expo.runtimeVersion, { policy: 'appVersion' });
  assert.equal(expo.updates.enabled, true);
  assert.equal(expo.updates.checkAutomatically, 'NEVER');
  assert.equal(expo.updates.fallbackToCacheTimeout, 0);
  assert.equal(expo.updates.url, 'https://u.expo.dev/4cae8513-9326-42eb-8cdb-3b07f6785b71');
  assert.equal(eas.build['release-ios'].channel ?? eas.build.production.channel, 'production');
  assert.equal(eas.build['release-ios'].env.EXPO_PUBLIC_FILM, '0');
  assert.equal(eas.build['release-ios'].env.REPEAT_APP_VARIANT, 'production');
});

test('the outreach app stays on its own channel and keeps native update checks', () => {
  const { expo } = json('../mobile/app.json');
  const eas = json('../mobile/eas.json');
  const previous = process.env.REPEAT_APP_VARIANT;
  process.env.REPEAT_APP_VARIANT = 'outreach';
  try {
    const outreach = withVariant({ config: expo });
    assert.equal(outreach.updates.checkAutomatically, 'ON_LOAD');
    assert.equal(outreach.ios.bundleIdentifier, 'com.lateefsan.repeatoutreach');
  } finally {
    if (previous === undefined) delete process.env.REPEAT_APP_VARIANT; else process.env.REPEAT_APP_VARIANT = previous;
  }
  assert.equal(eas.build['outreach-android'].channel, 'outreach');
});
