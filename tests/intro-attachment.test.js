import test from 'node:test';
import assert from 'node:assert/strict';
import { introAttachmentPath, hasPriorWhatsAppContact } from '../supabase/functions/_shared/intro-attachment.js';

test('only the first message includes the saved image, unless deselected', () => {
  const template = { image_path: 'user/card.png' };
  assert.equal(introAttachmentPath(template.image_path, {}), template.image_path);
  assert.equal(introAttachmentPath(template.image_path, {}, null, false), null);
  assert.equal(template.image_path, 'user/card.png');
  assert.equal(introAttachmentPath(template.image_path, { sent_at: '2026-09-27' }), null);
  assert.equal(introAttachmentPath(template.image_path, { sentAt: '2026-09-27' }), null);
  assert.equal(introAttachmentPath(template.image_path, {}, true), null);
  assert.equal(introAttachmentPath(null, {}), null);
});

function historyClient(result) {
  const calls = [];
  const client = {};
  for (const method of ['from', 'select', 'eq', 'in', 'limit']) {
    client[method] = (...args) => {
      calls.push([method, ...args]);
      return method === 'limit' ? Promise.resolve(result) : client;
    };
  }
  return { client, calls };
}

test('contact history is scoped to the user and recipient, and excludes failed sends', async () => {
  const { client, calls } = historyClient({ data: [{ id: 'previous-send' }], error: null });
  assert.equal(await hasPriorWhatsAppContact(client, { userId: 'user-a', phone: '971500000000' }), true);
  assert.deepEqual(calls, [
    ['from', 'whatsapp_messages'], ['select', 'id'], ['eq', 'user_id', 'user-a'],
    ['eq', 'direction', 'outbound'], ['eq', 'recipient_phone', '971500000000'],
    ['in', 'status', ['sending', 'sent', 'delivered', 'read']], ['limit', 1],
  ]);
});

test('new recipients may receive the image; legacy sent sellers cannot', async () => {
  const { client, calls } = historyClient({ data: [], error: null });
  assert.equal(await hasPriorWhatsAppContact(client, { userId: 'a', phone: '123' }), false);
  calls.length = 0;
  assert.equal(await hasPriorWhatsAppContact(client, { userId: 'a', phone: '123', sentAt: '2026-09-26' }), true);
  assert.equal(calls.length, 0);
});

test('a history lookup failure cannot resend an introduction accidentally', async () => {
  const { client } = historyClient({ data: null, error: { message: 'History unavailable' } });
  await assert.rejects(hasPriorWhatsAppContact(client, { userId: 'a', phone: '123' }), /History unavailable/);
});
