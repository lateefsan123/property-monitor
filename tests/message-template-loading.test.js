import test from 'node:test';
import assert from 'node:assert/strict';
import { createMessageTemplateServices } from '../shared/message-templates.js';

function fixture() {
  const calls = [];
  const rows = [{ id: 't1', user_id: 'owner', name: 'Update', content: '{{transactions}}', image_path: 'owner/photo.png' }];
  const query = { select() { return this; }, eq(key, value) { calls.push([key, value]); return this; }, order() { return this; }, then(resolve) { return Promise.resolve({ data: rows }).then(resolve); } };
  const service = createMessageTemplateServices({
    from() { return query; },
    storage: { from() { return { createSignedUrls: async paths => { calls.push(['sign', paths]); throw new Error('Storage unavailable'); } }; } },
  });
  return { service, calls };
}
test('text list loads without waiting for attachment storage and retains owner scoping', async () => {
  const { service, calls } = fixture();
  const rows = await service.fetchMessageTemplates('owner', { includeImagePreviews: false });
  assert.equal(rows[0].image_path, 'owner/photo.png');
  assert.deepEqual(calls, [['user_id', 'owner']]);
});
test('existing callers still request image previews', async () => {
  const { service, calls } = fixture();
  await assert.rejects(service.fetchMessageTemplates('owner'), /Storage unavailable/);
  assert.deepEqual(calls[1], ['sign', ['owner/photo.png']]);
});
test('signed-out list does not make a request', async () => {
  const { service, calls } = fixture();
  assert.deepEqual(await service.fetchMessageTemplates(null, { includeImagePreviews: false }), []);
  assert.deepEqual(calls, []);
});
