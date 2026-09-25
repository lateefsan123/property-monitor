import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('data deletion has an explicit SPA rewrite before the data asset exclusion', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rewrite = config.rewrites.find(({ source }) => new RegExp(`^${source}$`).test('/data-deletion'));
  assert.equal(rewrite?.destination, '/index.html');
  assert.equal(config.rewrites.some(({ source }) => new RegExp(`^${source}$`).test('/api/desktop/download')), false);
});

test('mobile legal links use Repeat AI and deletion help has its own page', () => {
  for (const screen of ['AuthScreen', 'SettingsScreen', 'SubscriptionScreen']) {
    const source = readFileSync(new URL(`../mobile/src/screens/${screen}.js`, import.meta.url), 'utf8');
    assert.ok(source.includes('const PRIVACY_URL = "https://repeatai.org/privacy";'));
    assert.ok(source.includes('const TERMS_URL = "https://repeatai.org/terms";'));
    if (screen === 'SettingsScreen') {
      assert.ok(source.includes('const DATA_DELETION_URL = "https://repeatai.org/data-deletion";'));
    }
  }
});
