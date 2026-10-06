import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const mobileRoot = fileURLToPath(new URL('../mobile/', import.meta.url));
const nativeRequire = createRequire(new URL('../mobile/package.json', import.meta.url));
const source = readFileSync(new URL('../mobile/metro.config.js', import.meta.url), 'utf8');
const mockRequire = (name) => name === 'expo/metro-config'
  ? { getDefaultConfig: () => ({ resolver: {} }) }
  : nativeRequire(name);
mockRequire.resolve = nativeRequire.resolve;
// Metro runs the config in Node, so it sees process.env; EXPO_PUBLIC_FILM picks film mode.
function loadConfig(env = {}) {
  const scope = { require: mockRequire, __dirname: mobileRoot, module: { exports: {} }, process: { env } };
  vm.runInNewContext(source, scope);
  return scope.module.exports;
}
const { resolver } = loadConfig();

test('shared source can find dependencies installed only in the native app', () => {
  assert.equal(resolver.nodeModulesPaths[0], path.join(mobileRoot, 'node_modules'));
});

test('React and JSX runtime use the same native installation for all importers', () => {
  for (const name of ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime']) {
    const result = resolver.resolveRequest({}, name, 'android');
    assert.equal(result.type, 'sourceFile');
    assert.equal(result.filePath, nativeRequire.resolve(name));
    assert.ok(result.filePath.startsWith(path.join(mobileRoot, 'node_modules')));
  }
});

test('other modules retain Expo platform-aware resolution', () => {
  const expected = { type: 'sourceFile', filePath: 'voice-transport.native.js' };
  const context = { resolveRequest: (received, name, platform) => {
    assert.equal(received, context);
    assert.equal(name, './voice-transport');
    assert.equal(platform, 'ios');
    return expected;
  } };
  assert.equal(resolver.resolveRequest(context, './voice-transport', 'ios'), expected);
});

test('shared schedule hooks use the native QueryClient provider installation', () => {
  for (const platform of ['ios', 'android', 'web']) {
    const result = resolver.resolveRequest({}, '@tanstack/react-query', platform);
    assert.equal(result.filePath, nativeRequire.resolve('@tanstack/react-query'));
    assert.ok(result.filePath.startsWith(path.join(mobileRoot, 'node_modules')));
  }
});

test('the offline film backend replaces Supabase only when EXPO_PUBLIC_FILM=1', () => {
  const realSupabase = path.join(mobileRoot, 'src', 'supabase.js');
  const context = { resolveRequest: () => ({ type: 'sourceFile', filePath: realSupabase }) };
  assert.equal(resolver.resolveRequest(context, '../supabase', 'ios').filePath, realSupabase);
  assert.equal(loadConfig({ EXPO_PUBLIC_FILM: '0' }).resolver.resolveRequest(context, '../supabase', 'ios').filePath, realSupabase);
  const film = loadConfig({ EXPO_PUBLIC_FILM: '1' }).resolver.resolveRequest(context, '../supabase', 'web');
  assert.equal(film.filePath, path.join(mobileRoot, 'film', 'fake-supabase.js'));
});
