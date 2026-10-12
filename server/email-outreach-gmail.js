import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { emailAddress } from '../shared/email-outreach.js';
import { providerJson } from './integration-http.js';

const ROOT = 'https://gmail.googleapis.com/gmail/v1/users/me';
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.send'];
const header = (mail, name) => mail.payload?.headers?.find(h => h.name.toLowerCase() === name)?.value || '';
function body(part) {
  return [part?.body?.data ? Buffer.from(part.body.data,'base64url').toString('utf8') : '', ...(part?.parts || []).map(body)].join('\n');
}
function mailbox(value) { try { return emailAddress(value.match(/<([^<>]+)>/)?.[1] || value); } catch { return null; } }

export function bounceFor(mail, email) {
  const text = body(mail.payload);
  // Require a machine-readable DSN block naming this recipient, not quoted text.
  const isDsn = header(mail,'content-type').toLowerCase().includes('multipart/report')
    || JSON.stringify(mail.payload?.parts || []).includes('message/delivery-status');
  if (!isDsn) return false;
  return text.split(/\r?\n\r?\n/).some(block => {
    const recipient = block.match(/(?:Final|Original)-Recipient:\s*rfc822;\s*([^\s\r\n]+)/i)?.[1];
    return recipient?.toLowerCase() === email && /^Action:\s*failed\s*$/im.test(block);
  });
}

export function createOutreachGmail({ tokens, fetchImpl = fetch }) {
  const context = userId => tokens.context({userId,provider:'google',feature:'email'},SCOPES);
  const get = (token,url) => providerJson(fetchImpl,url,{headers:{Authorization:`Bearer ${token}`}});
  return {
    async verify(userId, sender) {
      const token = await context(userId);
      const profile = await get(token.accessToken,`${ROOT}/profile`);
      if (emailAddress(profile.emailAddress) !== sender) throw new Error('Connected Gmail is not the selected outreach inbox');
      return token;
    },
    async inspect(userId, contact, sender) {
      const token = await this.verify(userId,sender);
      const q = `{from:${contact.email} to:${contact.email} "${contact.email}"}`;
      let pageToken, pages = 0, prior = false, reply = false, bounce = false, optOut = false;
      do {
        const params = new URLSearchParams({q,maxResults:'100',includeSpamTrash:'true',...(pageToken ? {pageToken} : {})});
        const page = await get(token.accessToken,`${ROOT}/messages?${params}`);
        for (const item of page.messages || []) {
          const mail = await get(token.accessToken,`${ROOT}/messages/${encodeURIComponent(item.id)}?format=full`);
          const from = mailbox(header(mail,'from'));
          const incoming = from === contact.email;
          if (incoming) {
            reply = true;
            optOut ||= /\b(unsubscribe|stop|remove me|no thanks|not interested|do not contact|don't contact)\b/i.test(body(mail.payload));
          }
          bounce ||= bounceFor(mail,contact.email);
          const recipients = header(mail,'to').split(',').map(mailbox);
          if (from === sender && recipients.includes(contact.email)) prior = true;
        }
        pageToken = page.nextPageToken;
        if (++pages >= 10 && pageToken) throw new Error('Mailbox check incomplete; no email sent');
      } while (pageToken);
      return { status: optOut ? 'opted_out' : bounce ? 'bounced' : reply ? 'replied' : prior && contact.step === 0 ? 'excluded' : null };
    },
    async send(userId, sender, contact, message) {
      const token = await this.verify(userId,sender);
      const internetId = `<${randomUUID()}@${sender.split('@')[1]}>`;
      const headers = [`From: Lateef Sanusi <${sender}>`, `To: ${contact.email}`, `Message-ID: ${internetId}`,
        `Subject: =?UTF-8?B?${Buffer.from(message.subject).toString('base64')}?=`, 'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'];
      if (contact.internetId && /^<[^<>\s\r\n]+>$/.test(contact.internetId)) headers.push(`In-Reply-To: ${contact.internetId}`,`References: ${contact.internetId}`);
      const text = `${message.body}\n\nIf you'd rather not hear from me, reply unsubscribe and I'll stop.`;
      const encoded = Buffer.from(text).toString('base64').match(/.{1,76}/g).join('\r\n');
      const raw = Buffer.from(`${headers.join('\r\n')}\r\n\r\n${encoded}`).toString('base64url');
      // No retries on POST. Any transport/HTTP/response ambiguity is held by worker.
      const result = await providerJson(fetchImpl,`${ROOT}/messages/send`,{method:'POST',headers:{Authorization:`Bearer ${token.accessToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({raw,...(contact.threadId ? {threadId:contact.threadId} : {})})});
      if (!result.id || !result.threadId) throw new Error('Send result unconfirmed');
      return { messageId:result.id, threadId:result.threadId, internetId };
    },
  };
}
