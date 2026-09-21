import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createIntegrationOAuth, createTokenVault } from '../server/integration-oauth.js';

function fixture(provider = 'google', feature = 'calendar') {
  const pending = new Map(); const saved = []; const requests = [];
  let clock = 1000;
  const store = {
    async putPending(row) { pending.set(row.hash, row); },
    async consumePending({hash,userId,provider,now}) { const row = pending.get(hash); if (!row || row.userId !== userId || row.provider !== provider || row.expiresAt <= now) return null; pending.delete(hash); return row; },
    async saveConnection(row) { saved.push(row); },
  };
  const configs = Object.fromEntries(['google','microsoft'].map(p => [p, { clientId: 'client', clientSecret: 'secret', redirectUri: `https://example.com/callback/${p}` }]));
  const vault = createTokenVault(randomBytes(32));
  const tokens = { access_token: 'private-access', refresh_token: 'private-refresh', token_type: 'Bearer', expires_in: 3600,
    scope: provider === 'google' ? 'https://www.googleapis.com/auth/calendar.events.readonly' : 'Calendars.Read' };
  const oauth = createIntegrationOAuth({configs,store,vault,now:()=>clock,fetchImpl:async (url, options) => {requests.push({url,options}); return {ok:true,json:async()=>tokens};}});
  return { oauth, pending, saved, requests, tokens, vault, advance:()=>{clock+=600001;}, begin:async()=>new URL((await oauth.begin({userId:'a',provider,feature})).authorizationUrl), provider };
}
test('both providers use PKCE and feature-specific permissions without leaking credentials', async () => {
  for (const provider of ['google','microsoft']) {
    const f=fixture(provider); const url=await f.begin();
    assert.equal(url.searchParams.get('code_challenge_method'),'S256');
    assert.equal(url.searchParams.get('state').length,43);
    assert.ok(!url.toString().includes('secret'));
    assert.ok(!url.searchParams.get('scope').includes('Mail'));
    assert.ok(!JSON.stringify([...f.pending.values()]).includes('verifier'));
    const result=await f.oauth.complete({userId:'a',provider,state:url.searchParams.get('state'),code:'code'});
    assert.equal(result.status,'connected');
    assert.ok(!JSON.stringify(result).includes('private'));
    assert.ok(!JSON.stringify(f.saved).includes('private'));
    assert.equal(f.vault.open(f.saved[0].secret,'a',provider,'calendar').refreshToken,'private-refresh');
  }
});
test('state rejects cross-user access, expiry and replay',async()=>{
  const f=fixture(); const url=await f.begin(); const state=url.searchParams.get('state');
  await assert.rejects(f.oauth.complete({userId:'b',provider:'google',state,code:'code'}));
  assert.equal(f.requests.length,0);
  await f.oauth.complete({userId:'a',provider:'google',state,code:'code'});
  await assert.rejects(f.oauth.complete({userId:'a',provider:'google',state,code:'code'}));
  assert.equal(f.requests.length,1);
  const expired=await f.begin(); f.advance();
  await assert.rejects(f.oauth.complete({userId:'a',provider:'google',state:expired.searchParams.get('state'),code:'code'}));
});
test('concurrent callbacks exchange a code once',async()=>{
  const f=fixture(); const url=await f.begin(); const input={userId:'a',provider:'google',state:url.searchParams.get('state'),code:'code'};
  const results=await Promise.allSettled([f.oauth.complete(input),f.oauth.complete(input)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1); assert.equal(f.requests.length,1);
});
test('denial, missing permissions and absent refresh token never create a connection',async()=>{
  for(const variant of ['denial','scope','refresh']) {
    const f=fixture(); const url=await f.begin();
    if(variant==='scope') f.tokens.scope='';
    if(variant==='refresh') delete f.tokens.refresh_token;
    const promise=f.oauth.complete({userId:'a',provider:'google',state:url.searchParams.get('state'),code:'code',error:variant==='denial'?'access_denied':undefined});
    if(variant==='denial') assert.equal((await promise).status,'cancelled'); else await assert.rejects(promise);
    assert.equal(f.saved.length,0);
  }
});
test('vault authenticates ciphertext and binds it to user, provider and feature',()=>{
  const vault=createTokenVault(randomBytes(32)); const encrypted=vault.seal({token:'secret'},'a','google','email');
  for(const args of [['b','google','email'],['a','microsoft','email'],['a','google','calendar']]) assert.throws(()=>vault.open(encrypted,...args));
  assert.throws(()=>vault.open(encrypted.slice(0,-5)+'xxxxx','a','google','email'));
  assert.throws(()=>createTokenVault(Buffer.alloc(3)));
});

test('callback failures expose only actionable fixed error codes', async () => {
  for (const [variant, expected] of [['expired', 'oauth_expired'], ['scope', 'oauth_scope'], ['refresh', 'oauth_offline']]) {
    const f = fixture();
    const url = await f.begin();
    if (variant === 'expired') f.advance();
    if (variant === 'scope') f.tokens.scope = '';
    if (variant === 'refresh') delete f.tokens.refresh_token;
    await assert.rejects(f.oauth.complete({ userId: 'a', provider: 'google', state: url.searchParams.get('state'), code: 'private-code' }), error => {
      assert.equal(error.code, expected);
      assert.equal(error.status, 409);
      assert.ok(!error.message.includes('private'));
      return true;
    });
    assert.equal(f.saved.length, 0);
  }
});
