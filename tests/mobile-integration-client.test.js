import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../mobile/src/workspace/integration-client.js', import.meta.url), 'utf8');
function setup(session) {
  const calls = [];
  const context = {
    supabase: { auth: { getSession: async () => ({ data: { session } }) } },
    fetch: async (...args) => {
      calls.push(args);
      return { ok: true, json: async () => ({ connections: [] }) };
    },
  };
  vm.createContext(context);
  vm.runInContext(source.replace(/^import .*;\r?\n/, '').replace('export async function', 'async function'), context);
  return { request: context.integrationRequest, calls };
}

test('mobile preloading cannot put another signed-in account into the requested cache', async () => {
  const { request, calls } = setup({ user: { id: 'other' }, access_token: 'test-token' });
  await assert.rejects(request({ action: 'status' }, undefined, 'owner'), /account changed/);
  assert.equal(calls.length, 0);
});

test('signed-out mobile preloading never makes a network request', async () => {
  const { request, calls } = setup(null);
  await assert.rejects(request({ action: 'status' }, undefined, 'owner'), /Sign in/);
  assert.equal(calls.length, 0);
});

test('mobile status preserves cancellation and uses the current session', async () => {
  const { request, calls } = setup({ user: { id: 'owner' }, access_token: 'test-token' });
  const signal = new AbortController().signal;
  await request({ action: 'status' }, signal, 'owner');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].signal, signal);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(calls[0][1].body), { action: 'status' });
});
