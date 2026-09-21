import { createHash, randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { IntegrationError, providerJson } from './integration-http.js';
import { EXTRA_SCOPES } from './integration-scopes.js';

const hash = value => createHash('sha256').update(value).digest('base64url');
const address = value => typeof value === 'string' && value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const messageId = value => typeof value === 'string' && /^[a-zA-Z0-9_=!-]{1,1000}$/.test(value);
const safeHeader = value => typeof value === 'string' && ![...value].some(char => char.charCodeAt(0) < 32);
const mailbox = value => {
  const result = String(value || '').match(/<([^<>]+)>$/)?.[1] || value;
  if (!address(result)) throw new IntegrationError('invalid_input');
  return result;
};

// Only the authenticated web UI calls these endpoints. Do not expose confirm to
// an AI tool without its own trusted, exact-content human approval mechanism.
export function createIntegrationMail({ tokens, store, vault, fetchImpl = fetch, now = Date.now }) {
  function identity(userId, provider) {
    if (!userId || !['google', 'microsoft'].includes(provider)) throw new IntegrationError('invalid_input');
    return { userId, provider, feature: 'email' };
  }
  return {
    async prepare({ userId, provider, input }) {
      const who = identity(userId, provider);
      if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => !['to', 'subject', 'body', 'replyToId'].includes(key))
        || !text(input.body, 6000) || (input.replyToId !== undefined && !messageId(input.replyToId))) throw new IntegrationError('invalid_input');
      const context = await tokens.context(who, EXTRA_SCOPES[provider].send);
      const token = context.accessToken;
      const get = url => providerJson(fetchImpl, url, { headers: { Authorization: `Bearer ${token}` } });
      let to = input.to, subject = input.subject, threadId, internetId;
      if (input.replyToId) {
        if (input.to !== undefined || input.subject !== undefined) throw new IntegrationError('invalid_input');
        if (provider === 'microsoft') {
          const original = await get(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(input.replyToId)}?$select=subject,from,replyTo`);
          const recipients = original.replyTo?.length ? original.replyTo : [original.from];
          // This first release deliberately supports a single reply recipient.
          if (recipients.length !== 1) throw new IntegrationError('invalid_input');
          to = mailbox(recipients[0]?.emailAddress?.address);
          subject = /^re:/i.test(original.subject || '') ? original.subject : `Re: ${original.subject || ''}`;
        } else {
          const original = await get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(input.replyToId)}?format=metadata`);
          const headers = original.payload?.headers || [];
          const header = name => headers.find(h => h.name?.toLowerCase() === name)?.value;
          to = mailbox(header('reply-to') || header('from'));
          subject = header('subject') || '(no subject)';
          threadId = original.threadId;
          internetId = header('message-id');
          if (!messageId(threadId) || !safeHeader(internetId) || !/^<[^<>\s]+>$/.test(internetId)) throw new IntegrationError('invalid_input');
        }
      }
      if (!address(to) || !text(subject, 300) || !safeHeader(subject)) throw new IntegrationError('invalid_input');
      const preview = { to, subject, body: input.body, ...(input.replyToId ? { replyToId: input.replyToId } : {}) };
      const connection = await store.getConnection(who);
      if (!connection || connection.secret !== context.connectionSecret) throw new IntegrationError('changed');
      const confirmation = randomBytes(32).toString('base64url');
      const expiresAt = now() + 5 * 60000;
      await store.putPending({ ...who, hash: hash(`email-send:${confirmation}`), expiresAt,
        secret: vault.seal({ kind: 'email-send', preview, threadId, internetId, connection: hash(connection.secret) }, userId, provider, 'email') });
      return { preview, confirmation, expiresAt };
    },
    async confirm({ userId, provider, confirmation }) {
      const who = identity(userId, provider);
      if (typeof confirmation !== 'string' || !/^[\w-]{43}$/.test(confirmation)) throw new IntegrationError('invalid_input');
      // Atomic consumption BEFORE the provider request prevents retries and races
      // from sending twice. Ambiguous failures must be checked in Sent, not retried.
      const pending = await store.consumePending({ hash: hash(`email-send:${confirmation}`), userId, provider, now: now() });
      if (!pending || pending.userId !== userId || pending.provider !== provider || pending.feature !== 'email' || pending.expiresAt <= now()) throw new IntegrationError('oauth_expired');
      const saved = vault.open(pending.secret, userId, provider, 'email');
      const connection = await store.getConnection(who);
      if (saved.kind !== 'email-send' || !connection || hash(connection.secret) !== saved.connection) throw new IntegrationError('changed');
      const context = await tokens.context(who, EXTRA_SCOPES[provider].send);
      if (hash(context.connectionSecret) !== saved.connection) throw new IntegrationError('changed');
      const token = context.accessToken;
      const { preview } = saved;
      let url, payload;
      if (provider === 'microsoft') {
        const message = { subject: preview.subject, body: { contentType: 'Text', content: preview.body },
          toRecipients: [{ emailAddress: { address: preview.to } }], ccRecipients: [], bccRecipients: [] };
        url = preview.replyToId ? `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(preview.replyToId)}/reply` : 'https://graph.microsoft.com/v1.0/me/sendMail';
        payload = preview.replyToId ? { message } : { message, saveToSentItems: true };
      } else {
        const headers = [`To: ${preview.to}`, `Subject: =?UTF-8?B?${Buffer.from(preview.subject).toString('base64')}?=`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'];
        if (saved.internetId) headers.push(`In-Reply-To: ${saved.internetId}`, `References: ${saved.internetId}`);
        const raw = Buffer.from(`${headers.join('\r\n')}\r\n\r\n${Buffer.from(preview.body).toString('base64').match(/.{1,76}/g).join('\r\n')}`).toString('base64url');
        url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
        payload = { raw, ...(saved.threadId ? { threadId: saved.threadId } : {}) };
      }
      let response;
      try {
        response = await fetchImpl(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload), redirect: 'error', signal: AbortSignal.timeout(15000) });
      } catch { throw new IntegrationError('send_uncertain'); }
      await response.body?.cancel();
      if (!response.ok) throw new IntegrationError(response.status >= 500 ? 'send_uncertain' : 'send_rejected');
      return { status: 'accepted' }; // Accepted by provider is not proof of delivery.
    },
  };
}
