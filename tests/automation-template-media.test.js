import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTOMATION_ACCOUNT_ID, requiresTransactionToken } from '../supabase/functions/_shared/automation-account.js';
import { templateMediaPayload, templateMediaType } from '../supabase/functions/_shared/template-media.js';
import { templateStatusOptions } from '../supabase/functions/_shared/template-status.js';
import { sendableStatuses, dueFollowUps } from '../supabase/functions/_shared/status-followups.js';
import { createMessageTemplateServices } from '../shared/message-templates.js';
import { baileysMediaContent } from '../services/whatsapp-baileys/src/message-content.js';
import { generateTemplateDraft } from '../supabase/functions/_shared/template-draft.js';

test('only the verified automation account may omit sales from default and built-in templates', async () => {
  const service = createMessageTemplateServices({});
  for (const userId of ['ordinary', null, AUTOMATION_ACCOUNT_ID]) {
    const required = requiresTransactionToken({ userId, isDefault: true, statuses: ['prospect'] });
    assert.equal(required, userId !== AUTOMATION_ACCOUNT_ID);
  }
  await assert.rejects(service.saveMessageTemplate({ userId: 'ordinary', name: 'Intro', content: 'Hello', isDefault: true, statuses: ['prospect'] }), /transactions/);
  assert.equal(requiresTransactionToken({ userId: 'ordinary', isDefault: false, statuses: ['custom:abc'] }), false);
  assert.equal(requiresTransactionToken({ userId: 'ordinary', isDefault: true, statuses: ['custom:abc'] }), true);
});

test('saving the first automation video template preserves owner, default, statuses and signed preview', async () => {
  let stored, uploaded;
  const query = {
    update() { return this; }, eq() { return this; }, neq() { return this; }, select() { return this; },
    insert(row) { stored = row; return this; },
    single: async () => ({ data: { id: 'new', ...stored } }),
    overlaps: async () => ({ data: [] }),
    then(resolve) { return Promise.resolve({ data: [] }).then(resolve); },
  };
  const service = createMessageTemplateServices({ from: () => query, storage: { from: () => ({
    upload: async (path, file, options) => { uploaded = { path, file, options }; return {}; },
    createSignedUrls: async paths => ({ data: paths.map(path => ({ path, signedUrl: `https://example.com/${path}` })) }),
  }) } }, () => 'asset');
  const saved = await service.saveMessageTemplate({ userId: AUTOMATION_ACCOUNT_ID, name: 'Intro', content: 'Hi {{name}}', isDefault: true, statuses: ['prospect'], imageFile: { type: 'video/mp4', size: 3000000 } });
  assert.equal(uploaded.path, `${AUTOMATION_ACCOUNT_ID}/asset.mp4`);
  assert.equal(uploaded.options.contentType, 'video/mp4');
  assert.equal(saved.media_type, 'video');
  assert.equal(saved.is_default, true);
  assert.equal(saved.content, 'Hi {{name}}');
  assert.equal(saved.user_id, AUTOMATION_ACCOUNT_ID);
  assert.deepEqual(saved.statuses, ['prospect']);
  assert.ok(saved.image_url.endsWith('/asset.mp4'));
});

test('invalid media fails before any default or status mutation', async () => {
  const service = createMessageTemplateServices({ from() { throw new Error('Unexpected mutation'); } });
  for (const file of [{ type: 'video/mp4', size: 16777217 }, { type: 'image/png', size: 5242881 }, { type: 'text/html', size: 1 }]) {
    await assert.rejects(service.saveMessageTemplate({ userId: AUTOMATION_ACCOUNT_ID, name: 'Intro', content: 'Hello', isDefault: true, imageFile: file }), /Choose|smaller/);
  }
});

test('video caption routes as video for both providers and existing images stay images', () => {
  const input = { to: '123', body: 'Hi Alex', imageUrl: 'https://example.com/clip.mp4', mediaType: templateMediaType('owner/clip.mp4') };
  assert.deepEqual(templateMediaPayload(input, true).video, { link: input.imageUrl, caption: input.body });
  assert.deepEqual(templateMediaPayload(input).video, { url: input.imageUrl, caption: input.body });
  assert.deepEqual(baileysMediaContent({ videoUrl: input.imageUrl, text: input.body }), { video: { url: input.imageUrl }, mimetype: 'video/mp4', caption: input.body });
  assert.ok(baileysMediaContent({ imageUrl: 'https://example.com/a.png', text: 'Hi' }).image);
  assert.equal(templateMediaPayload({ ...input, imageUrl: null }).type, 'text');
  assert.throws(() => templateMediaPayload({ ...input, body: 'x'.repeat(1025) }), /1,024/);
  assert.throws(() => baileysMediaContent({ imageUrl: input.imageUrl, videoUrl: input.imageUrl, text: 'Hi' }), /one attachment/);
  assert.throws(() => baileysMediaContent({ videoUrl: 'http://example.com/a.mp4', text: 'Hi' }), /HTTPS/);
});

test('all built-in choices are available while opt-outs, replies and disabled cadence stay excluded', () => {
  assert.ok(templateStatusOptions({ includeNotInterested: true }).some(s => s.id === 'not_interested'));
  assert.ok(!templateStatusOptions().some(s => s.id === 'not_interested'));
  const templates = [{ content: 'Hi {{name}}', statuses: ['prospect', 'market_appraisal', 'for_sale_available', 'not_interested'] }];
  assert.deepEqual(sendableStatuses([], templates, 'ordinary'), []);
  const statuses = sendableStatuses([{ id: 'off', builtin_key: 'prospect', follow_up_days: 0 }], templates, AUTOMATION_ACCOUNT_ID);
  assert.deepEqual(statuses.map(s => s.builtin_key), ['market_appraisal', 'for_sale_available']);
  const due = dueFollowUps({ statuses, leads: [
    { id: 1, status: 'Market Appraisal' }, { id: 2, status: 'Not Interested' },
    { id: 3, status: 'For Sale' }, { id: 4, status: 'Prospect' },
  ], repliedLeadIds: new Set([3]) });
  assert.deepEqual(due.map(row => row.lead.id), [1]);
});

test('automation AI drafting permits a real introduction without inserting sales placeholders', async () => {
  const result = await generateTemplateDraft('Introduce Repeat AI', 'test', async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.match(request.messages[0].content, /automation account/);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ name: 'Introduction', content: 'Hi {{name}}, see Repeat AI.' }) } }] }) };
  }, true);
  assert.equal(result.content, 'Hi {{name}}, see Repeat AI.');
});
