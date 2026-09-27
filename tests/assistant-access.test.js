import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIVATE_ASSISTANT_USER_ID, canUsePrivateAssistant } from '../shared/assistant-access.js';
import { createVoiceSessionHandler } from '../server/voice-session.js';

test('private assistant cannot be opened to other accounts by configuration or profile metadata', async () => {
  let calls = 0;
  const handler = createVoiceSessionHandler({ apiKey: 'fixture', allowedUserIds: ['other', PRIVATE_ASSISTANT_USER_ID],
    authenticate: async () => ({ id: 'other', email: 'lateefsanusi682@gmail.com', user_metadata: { id: PRIVATE_ASSISTANT_USER_ID } }),
    fetchImpl: async () => { calls++; throw new Error('Must not call provider'); } });
  for (const body of [{ action: 'chat', input: [{ role: 'user', content: 'hi' }] }, { action: 'start', sdp: 'v=0\r\nm=audio 9' }, { action: 'status' }]) {
    const res = { setHeader() {}, end(value) { this.body = JSON.parse(value); } };
    await handler({ method: 'POST', headers: { authorization: 'Bearer fixture' }, body }, res);
    assert.equal(res.statusCode, body.action === 'status' ? 200 : 403);
    if (body.action === 'status') assert.equal(res.body.available, false);
  }
  assert.equal(calls, 0);
  assert.equal(canUsePrivateAssistant(PRIVATE_ASSISTANT_USER_ID), true);
  for (const id of [undefined, null, '', 'other', 'lateefsanusi682@gmail.com']) assert.equal(canUsePrivateAssistant(id), false);
});
