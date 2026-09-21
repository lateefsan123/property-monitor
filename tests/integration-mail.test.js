import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createIntegrationMail } from '../server/integration-mail.js';
import { createTokenVault } from '../server/integration-oauth.js';

const input = { to: 'seller@example.com', subject: 'Viewing', body: 'Are you available tomorrow?' };
function fixture(provider = 'microsoft') {
  const pending = new Map(), calls = [];
  let clock = 0, secret = 'connection', fail = false, denied = false;
  const store = {
    getConnection: async () => secret ? { secret } : null,
    putPending: async row => pending.set(row.hash, row),
    consumePending: async ({ hash, userId, provider, now }) => {
      const row = pending.get(hash);
      if (!row || row.userId !== userId || row.provider !== provider || row.expiresAt <= now) return null;
      pending.delete(hash); return row;
    },
  };
  const mail = createIntegrationMail({ store, vault: createTokenVault(Buffer.alloc(32, 1)), now: () => clock,
    tokens: { context: async () => { if (denied) throw Error('reconnect'); return { accessToken: 'private', connectionSecret: secret }; } },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (options.method === 'POST') { if (fail) throw Error('secret provider error'); return new Response(null, { status: 202 }); }
      return new Response(JSON.stringify(provider === 'microsoft' ? { subject: 'Viewing', from: { emailAddress: { address: 'wrong@example.com' } }, replyTo: [{ emailAddress: { address: 'reply@example.com' } }] }
        : { threadId: 'thread', payload: { headers: [{ name: 'From', value: 'Seller <seller@example.com>' }, { name: 'Reply-To', value: 'reply@example.com' }, { name: 'Subject', value: 'Viewing' }, { name: 'Message-ID', value: '<original@example.com>' }] } }));
    },
  });
  return { mail, calls, pending, provider, prepare: value => mail.prepare({ userId: 'a', provider, input: value || input }),
    confirm: confirmation => mail.confirm({ userId: 'a', provider, confirmation }),
    expire: () => { clock = 300001; }, change: () => { secret = 'different'; }, disconnect: () => { secret = null; }, fail: () => { fail = true; }, deny: () => { denied = true; } };
}
test('preview never sends; exact encrypted message sends once even with concurrent confirms', async () => {
  const f = fixture(); const preview = await f.prepare();
  assert.equal(f.calls.length, 0);
  assert.ok(!JSON.stringify([...f.pending.values()]).includes('seller@example.com'));
  assert.deepEqual(preview.preview, input);
  const results = await Promise.allSettled([f.confirm(preview.confirmation), f.confirm(preview.confirmation)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.calls.length, 1);
  assert.deepEqual(JSON.parse(f.calls[0].options.body).message.toRecipients, [{ emailAddress: { address: input.to } }]);
  assert.equal(f.calls[0].options.redirect, 'error');
});
test('cross-user/provider, expiry, changed account and disconnected account cannot send', async () => {
  for (const variant of ['user', 'provider', 'expire', 'change', 'disconnect']) {
    const f = fixture(); const p = await f.prepare();
    if (typeof f[variant] === 'function') f[variant]();
    await assert.rejects(f.mail.confirm({ userId: variant === 'user' ? 'b' : 'a', provider: variant === 'provider' ? 'google' : 'microsoft', confirmation: p.confirmation }));
    assert.equal(f.calls.length, 0);
  }
});
test('missing scope and invalid recipients/header injection never prepare a send', async () => {
  for (const value of [{ ...input, to: 'a@example.com\r\nBcc: victim@example.com' }, { ...input, subject: 'x\r\nBcc: y' }, { ...input, bcc: 'x@example.com' }, { ...input, body: '' }, { body: 'reply', replyToId: '../victim' }]) {
    await assert.rejects(fixture().prepare(value));
  }
  const f = fixture(); f.deny(); await assert.rejects(f.prepare()); assert.equal(f.pending.size, 0);
});
test('uncertain send is not retried and provider errors remain private', async () => {
  const f = fixture(); const p = await f.prepare(); f.fail();
  await assert.rejects(f.confirm(p.confirmation), { code: 'send_uncertain' });
  await assert.rejects(f.confirm(p.confirmation)); assert.equal(f.calls.length, 1);
});
test('replies resolve Reply-To server-side and Gmail preserves thread headers', async () => {
  for (const provider of ['google', 'microsoft']) {
    const f = fixture(provider); const p = await f.prepare({ replyToId: 'original=', body: 'Yes, tomorrow.' });
    assert.equal(p.preview.to, 'reply@example.com');
    await f.confirm(p.confirmation);
    const payload = JSON.parse(f.calls[1].options.body);
    if (provider === 'google') {
      assert.equal(payload.threadId, 'thread');
      const mime = Buffer.from(payload.raw, 'base64url').toString();
      assert.ok(mime.includes('In-Reply-To: <original@example.com>'));
      assert.ok(mime.includes('To: reply@example.com'));
    } else {
      assert.ok(f.calls[1].url.endsWith('/original%3D/reply'));
      assert.deepEqual(payload.message.ccRecipients, []);
    }
  }
});
