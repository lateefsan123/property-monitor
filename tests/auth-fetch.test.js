import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthFetch } from '../src/auth-fetch.js';

test('stalled token refresh aborts and the next request can recover', async () => {
  let calls = 0;
  const request = createAuthFetch((_input, { signal }) => {
    if (++calls > 1) return Promise.resolve('restored');
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  }, 5);
  await assert.rejects(request('https://example.test/auth/v1/token'), /aborted/);
  assert.equal(await request('https://example.test/auth/v1/token'), 'restored');
});

test('caller cancellation still reaches the auth request', async () => {
  const controller = new AbortController();
  controller.abort();
  const request = createAuthFetch((_input, { signal }) => Promise.resolve(signal.aborted));
  assert.equal(await request('https://example.test/auth/v1/user', { signal: controller.signal }), true);
});

test('application requests keep their original signal and options', async () => {
  const options = { method: 'POST', signal: new AbortController().signal };
  const request = createAuthFetch((_input, received) => Promise.resolve(received));
  assert.equal(await request('https://example.test/storage/v1/upload', options), options);
});

test('network failures are distinguished from an actual auth rejection', async () => {
  const states = [];
  let status = 503;
  const request = createAuthFetch(async () => ({ status }), 100, failed => states.push(failed));
  await request('https://example.test/auth/v1/token');
  status = 401;
  await request('https://example.test/auth/v1/token');
  assert.deepEqual(states, [true, false]);
  const offline = createAuthFetch(async () => { throw new TypeError('offline'); }, 100, failed => states.push(failed));
  await assert.rejects(offline('https://example.test/auth/v1/token'), /offline/);
  assert.equal(states.at(-1), true);
});
