import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../mobile/src/screens/AuthScreen.js', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('  async function handleGoogleAuth()'), source.indexOf('  async function handleAppleAuth()'));
async function login(result, sessionOk = true) {
  const calls = [], errors = [];
  const context = {
    preview: false, redirectTo: 'repeat-outreach://auth/callback',
    setGoogleLoading() {}, setMessage() {}, setError: value => errors.push(value),
    supabase: { auth: { signInWithOAuth: async options => {
      calls.push(options); return {data:{url:'https://accounts.google.com/example'}};
    } } },
    WebBrowser: {openAuthSessionAsync: async (_, callback) => {calls.push(callback);return result;}},
    createSessionFromUrl: async url => {calls.push(url);return {ok:sessionOk};},
  };
  vm.createContext(context);
  await vm.runInContext(`${handler}\nhandleGoogleAuth();`, context);
  return {calls, errors:errors.filter(Boolean)};
}
test('Google login requests the outreach callback and restores the returned session', async () => {
  const result = await login({type:'success',url:'repeat-outreach://auth/callback#access_token=test'});
  assert.equal(result.calls[0].provider,'google');
  assert.equal(result.calls[0].options.redirectTo,'repeat-outreach://auth/callback');
  assert.equal(result.calls[1],'repeat-outreach://auth/callback');
  assert.equal(result.calls.length,3);
  assert.deepEqual(result.errors,[]);
});
test('another app callback cannot restore an outreach session', async () => {
  const result=await login({type:'success',url:'seller-signal://auth/callback#access_token=test'});
  assert.equal(result.calls.length,2);
  assert.match(result.errors[0],/Unexpected sign-in callback/);
});
test('cancellation leaves the login screen and missing tokens report a useful error', async () => {
  const canceled=await login({type:'cancel'});
  assert.equal(canceled.calls.length,2);
  assert.deepEqual(canceled.errors,[]);
  const missing=await login({type:'success',url:'repeat-outreach://auth/callback'},false);
  assert.match(missing.errors[0],/did not return a session/);
});
