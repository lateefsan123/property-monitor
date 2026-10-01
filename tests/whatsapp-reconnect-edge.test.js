import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';

async function harness(savedPhone = '+12025550123') {
  const source = (await fs.readFile(new URL('../supabase/functions/whatsapp-connect-account/index.ts', import.meta.url), 'utf8')).replace(/^import.*;\r?\n/gm, '');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const filters = []; const requests = []; let stored;
  const account = { id: 'own-account', phone_number_id: 'baileys:own-session', display_phone_number: savedPhone };
  const query = {
    select() { return this; }, eq(key, value) { filters.push([key,value]); return this; }, order() { return this; }, limit() { return this; },
    maybeSingle: async () => ({data:account}),
    upsert(value) { stored = value; return this; }, single: async () => ({data:{id:account.id,...stored}}),
  };
  const admin = { from: () => query };
  const context = vm.createContext({Response, Headers, URLSearchParams, Date, console,
    Deno: { env: { get: () => 'test' }, serve() {} },
    fetch: async (_url, options) => {
      requests.push(options.body ? JSON.parse(options.body) : null);
      return new Response(JSON.stringify({sessionId:'own-session',status:'connecting',displayPhoneNumber:null}));
    },
  });
  vm.runInContext(`${code}\nglobalThis.connect = handleBaileysConnect;`, context);
  return { connect: input => context.connect(admin, 'signed-in-user', input), filters, requests, stored: () => stored };
}

test('reuse saved number selects only the signed-in account and ignores a supplied alternative', async () => {
  const h = await harness();
  await h.connect({action:'start',reuseSavedNumber:true,accountId:'own-account',phoneNumber:'+12025550999'});
  assert.ok(h.filters.some(([key,value]) => key==='id' && value==='own-account'));
  assert.ok(h.filters.some(([key,value]) => key==='user_id' && value==='signed-in-user'));
  assert.equal(h.requests[0].phoneNumber, '+12025550123');
  assert.equal(h.requests[0].sessionId, 'own-session');
  assert.equal(h.requests[0].resetSession, true);
  assert.equal(h.stored().display_phone_number, '+12025550123');
});

test('pending status preserves the saved number while WhatsApp has no confirmed number', async () => {
  const h = await harness();
  await h.connect({action:'status',accountId:'own-account'});
  assert.equal(h.stored().display_phone_number, '+12025550123');
  assert.ok(h.filters.some(([key,value]) => key==='id' && value==='own-account'));
  assert.ok(h.filters.some(([key,value]) => key==='user_id' && value==='signed-in-user'));
});

test('saved-number reconnect with no saved number fails before creating a session', async () => {
  const h = await harness(null);
  await assert.rejects(h.connect({action:'start',reuseSavedNumber:true}), /No saved WhatsApp number/);
  assert.equal(h.requests.length, 0);
});
