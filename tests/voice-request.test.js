import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceRequest } from '../shared/voice-request.js';

test('voice requests use the current session each time and never an API key', async () => {
  let token = 'first'; const seen = [];
  const request = createVoiceRequest({ getSession: async () => ({ data: { session: { access_token: token } } }), url: '/api/voice',
    fetchImpl: async (url, options) => { seen.push({ url, ...options }); return new Response('{"available":false}'); } });
  await request({ action: 'status' }); token = 'second'; await request({ action: 'status' });
  assert.deepEqual(seen.map(item => item.headers.Authorization), ['Bearer first', 'Bearer second']);
  assert.ok(seen.every(item => item.url === '/api/voice' && item.method === 'POST'));
});
test('signed-out voice requests never reach the server', async () => {
  let called = false;
  const request = createVoiceRequest({ getSession: async () => ({ data: { session: null } }), url: '/api/voice', fetchImpl: async () => { called = true; } });
  await assert.rejects(request({ action: 'status' }), /Sign in/); assert.equal(called, false);
});
test('aborting a conversation propagates to the voice HTTP request', async () => {
  const controller = new AbortController(); controller.abort(); let observed;
  const request = createVoiceRequest({ getSession: async () => ({ data: { session: { access_token: 'test' } } }), url: '/api/voice',
    fetchImpl: async (_, { signal }) => { observed = signal.aborted; throw new Error('Aborted'); } });
  await assert.rejects(request({ action: 'start', sdp: 'test' }, controller.signal)); assert.equal(observed, true);
});
test('voice HTTP failures use the safe server error and never return invalid data', async () => {
  const request = createVoiceRequest({ getSession: async () => ({ data: { session: { access_token: 'test' } } }), url: '/api/voice',
    fetchImpl: async () => new Response('{"error":"Voice is not enabled yet."}', { status: 503 }) });
  await assert.rejects(request({ action: 'status' }), /not enabled/);
});
