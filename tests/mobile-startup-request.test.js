import test from 'node:test';
import assert from 'node:assert/strict';
import { withStartupTimeout } from '../mobile/src/startup-request.js';

test('startup read resolves normally', async () => {
  assert.equal(await withStartupTimeout(async () => 'session', 'timed out', 100), 'session');
});
test('stalled startup read rejects so the UI can leave loading', async () => {
  await assert.rejects(withStartupTimeout(() => new Promise(() => {}), 'Please retry', 10), /Please retry/);
});
test('startup read rejection and synchronous errors propagate', async () => {
  await assert.rejects(withStartupTimeout(async () => { throw new Error('offline'); }, 'timeout', 100), /offline/);
  await assert.rejects(withStartupTimeout(() => { throw new Error('storage'); }, 'timeout', 100), /storage/);
});
test('late response cannot replace a failed attempt, and retry succeeds', async () => {
  let resolve;
  const pending = withStartupTimeout(() => new Promise((done) => { resolve = done; }), 'timeout', 10);
  await assert.rejects(pending, /timeout/);
  resolve('late session');
  assert.equal(await withStartupTimeout(async () => 'fresh session', 'timeout', 100), 'fresh session');
  await assert.rejects(pending, /timeout/);
});
