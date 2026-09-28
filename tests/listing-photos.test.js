import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

test('listing photos authenticate, validate, normalize, cache, and handle provider failure', async () => {
  let handler; let calls = 0; let signedIn = true; let fail = false;
  const source = (await readFile('supabase/functions/listing-photos/index.ts', 'utf8')).replace(/^import .*;\r?\n/gm, '');
  const { code } = await transform(source, { loader: 'ts', format: 'cjs' });
  vm.runInNewContext(code, { Request, Response, AbortSignal, URL, Date, Map, Set,
    Deno: { env: { get: () => 'fixture' }, serve: fn => { handler = fn; } },
    createClient: () => ({ auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'test' } : null } }) } }),
    fetch: async () => { calls++; return new Response(JSON.stringify({ data: { photos: [{ url: 'https://example.com/1.jpg' }, 'https://example.com/2.jpg', 'https://example.com/1.jpg', 'javascript:bad'] } }), { status: fail ? 502 : 200 }); },
  });
  const request = (id, auth=true) => new Request('https://local.test', { method: 'POST', headers: auth ? { Authorization: 'Bearer fixture' } : {}, body: JSON.stringify({ listingId: id }) });
  assert.equal((await handler(request('1',false))).status,401);
  signedIn=false; assert.equal((await handler(request('1'))).status,401); signedIn=true;
  assert.equal((await handler(request('../bad'))).status,400);
  assert.deepEqual(await (await handler(request('1'))).json(), { photos: ['https://example.com/1.jpg','https://example.com/2.jpg'] });
  await handler(request('1')); assert.equal(calls,1);
  fail=true; assert.equal((await handler(request('2'))).status,502);
});
