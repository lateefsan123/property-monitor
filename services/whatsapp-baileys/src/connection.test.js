import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createVersionResolver } from './wa-version.js';

test('version lookup deduplicates requests, caches success, and keeps last good version on failure', async () => {
  let time = 1; let calls = 0; let fail = false;
  const resolve = createVersionResolver({ fallback: [2, 3000, 1], now: () => time, fetchImpl: async () => {
    calls++;
    if (fail) throw new Error('offline');
    return { ok: true, json: async () => ({ version: [2, 3000, 2] }) };
  } });
  assert.deepEqual(await Promise.all([resolve(), resolve()]), [[2, 3000, 2], [2, 3000, 2]]);
  assert.equal(calls, 1);
  await resolve(); assert.equal(calls, 1);
  time += 3600001; fail = true;
  assert.deepEqual(await resolve(), [2, 3000, 2]);
  await resolve(); assert.equal(calls, 2);
});

test('version lookup aborts a stalled request and uses bundled fallback', async () => {
  const resolve = createVersionResolver({ fallback: [2, 3000, 1], timeoutMs: 10, fetchImpl: (_url, {signal}) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason));
  }) });
  // AbortSignal timers are unrefed; keep the test process alive until it fires.
  const keepAlive = setTimeout(() => {}, 1000);
  try { assert.deepEqual(await resolve(), [2, 3000, 1]); } finally { clearTimeout(keepAlive); }
});

async function serviceHarness() {
  const source = (await fs.readFile(new URL('./server.js', import.meta.url), 'utf8'))
    .replace(/^import\s+[\s\S]*?;\r?\n/gm, '');
  const sockets = []; const timers = [];
  const logger = { warn() {}, error() {}, info() {}, child() { return this; } };
  const app = { use() {}, get() {}, post() {}, delete() {}, listen() {} };
  const context = vm.createContext({
    process: { env: {} }, console, Date, setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout() {},
    express: Object.assign(() => app, { json: () => () => {} }), pino: () => logger,
    createVersionResolver: () => async () => [2, 3000, 2], DEFAULT_CONNECTION_CONFIG: { version: [2, 3000, 1] },
    registerProfilePhotoRoute() {}, fs: { mkdir: async () => {}, rm: async () => {} }, path: { join: (...parts) => parts.join('/') },
    useMultiFileAuthState: async () => ({ state: {}, saveCreds() {} }),
    Browsers: { macOS: () => [] }, DisconnectReason: { loggedOut: 401 }, Boom: class extends Error { constructor(error) { super(error); this.output = {statusCode:500}; } },
    QRCode: { toDataURL: async () => 'data:qr' },
    makeWASocket: () => {
      const handlers = {}; const socket = { authState: {creds:{}}, ev: { on: (name, callback) => { handlers[name] = callback; } },
        requestPairingCode: async () => '12345678', end() {}, emit: update => handlers['connection.update'](update) };
      sockets.push(socket); return socket;
    },
  });
  vm.runInContext(`${source}\nglobalThis.api = { startSession, getSession, resetSession, requestSessionPairingCode };`, context);
  return { api: context.api, sockets, timers };
}

test('switching a ready QR session to phone linking immediately requests a code', async () => {
  const {api, sockets} = await serviceHarness();
  const session = await api.startSession('test');
  await sockets[0].emit({qr:'qr-value'});
  await api.requestSessionPairingCode(session, '353850000000');
  assert.equal(session.pairingCode, '12345678');
  assert.equal(session.qr, null);
});

test('reset ignores late updates and reconnect timers belonging to the old socket', async () => {
  const {api, sockets, timers} = await serviceHarness();
  await api.startSession('test');
  await sockets[0].emit({connection:'close',lastDisconnect:{error:{output:{statusCode:405},message:'Connection Failure'}}});
  await api.resetSession('test');
  const fresh = await api.startSession('test');
  await sockets[0].emit({connection:'open'});
  timers[0]();
  assert.equal(fresh.status, 'starting');
  assert.equal(sockets.length, 2);
});

test('status polling does not bypass reconnect backoff or restart failed sessions', async () => {
  const {api, sockets} = await serviceHarness();
  const session = await api.startSession('test');
  await sockets[0].emit({connection:'close',lastDisconnect:{error:{output:{statusCode:405},message:'Connection Failure'}}});
  assert.equal(await api.getSession('test'), session);
  assert.equal(sockets.length, 1);
  session.status = 'error';
  assert.equal(await api.getSession('test'), session);
  assert.equal(sockets.length, 1);
});
