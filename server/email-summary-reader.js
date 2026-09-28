import { Buffer } from 'node:buffer';
import { providerJson } from './integration-http.js';

export function plainEmail(value, html = false) {
  let text = String(value || '').slice(0, 150000);
  if (html) text = text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<(br|\/p|\/div)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ');
  return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, entity => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[entity])
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
}
function gmailBody(part, depth = 0) {
  if (!part || depth > 8 || part.filename) return '';
  if (part.mimeType === 'text/plain' && part.body?.data) return Buffer.from(part.body.data, 'base64url').toString('utf8');
  const parts = (part.parts || []).slice(0, 30);
  const plain = parts.find(item => item.mimeType === 'text/plain' && !item.filename);
  if (plain) return gmailBody(plain, depth + 1);
  const children = parts.map(item => gmailBody(item, depth + 1)).filter(Boolean);
  if (children.length) return children.join('\n');
  if (part.mimeType === 'text/html' && part.body?.data) return plainEmail(Buffer.from(part.body.data, 'base64url').toString('utf8'), true);
  return '';
}

// Fixed mailbox endpoints. Bodies stay in memory; attachments are never fetched.
export function createSummaryReader({ tokens, fetchImpl = fetch }) {
  return async ({ userId, providers, start, end }) => {
    const results = await Promise.all(providers.map(async provider => {
      const token = await tokens.accessToken({ userId, provider, feature: 'email' });
      const get = url => providerJson(fetchImpl, url, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' } });
      if (provider === 'google') {
        const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
        url.search = new URLSearchParams({ maxResults: '10', labelIds: 'INBOX', q: `after:${Math.floor(start / 1000)} before:${Math.floor(end / 1000)}` });
        const list = await get(url.href);
        const items = await Promise.all((list.messages || []).slice(0, 10).map(async item => {
          const mail = await get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=full`);
          const header = name => (mail.payload?.headers || []).find(h => h.name?.toLowerCase() === name)?.value || '';
          const body = plainEmail(gmailBody(mail.payload));
          return { provider, id: mail.id, subject: header('subject').slice(0, 250), from: header('from').slice(0, 250),
            receivedAt: Number(mail.internalDate), body: body || plainEmail(mail.snippet), partial: !body || body.length > 7000 };
        }));
        return { items, hasMore: Boolean(list.nextPageToken) };
      }
      const url = new URL('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages');
      url.search = new URLSearchParams({ '$top': '10', '$orderby': 'receivedDateTime desc',
        '$filter': `receivedDateTime ge ${new Date(start).toISOString()} and receivedDateTime lt ${new Date(end).toISOString()}`,
        '$select': 'id,subject,from,receivedDateTime,body,bodyPreview' });
      const list = await get(url.href);
      return { hasMore: Boolean(list['@odata.nextLink']), items: (list.value || []).slice(0, 10).map(mail => {
        const body = plainEmail(mail.body?.content, mail.body?.contentType?.toLowerCase() === 'html');
        return { provider, id: mail.id, subject: String(mail.subject || '').slice(0, 250), from: String(mail.from?.emailAddress?.address || '').slice(0, 250),
          receivedAt: Date.parse(mail.receivedDateTime), body: body || plainEmail(mail.bodyPreview), partial: !body || body.length > 7000 };
      }) };
    }));
    const candidates = results.flatMap(result => result.items).filter(item => item.receivedAt >= start && item.receivedAt < end).sort((a,b) => b.receivedAt - a.receivedAt);
    const selected = candidates.slice(0, 10);
    const items = selected.map(item => {
      const length = Math.min(7000, Math.floor(30000 / selected.length));
      return { ...item, body: item.body.slice(0, length), partial: item.partial || item.body.length > length };
    });
    return { items, hasMore: candidates.length > 10 || results.some(result => result.hasMore) };
  };
}
