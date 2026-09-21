import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceSessionHandler, voiceSessionConfig } from '../server/voice-session.js';
import { executeVoiceTool, VOICE_TOOLS } from '../shared/voice-tools.js';

const offer = 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';
function fixture(overrides = {}) {
  const requests = [];
  const handler = createVoiceSessionHandler({ apiKey: 'test-private-key', allowedUserIds: ['owner'],
    authenticate: async token => token === 'owner-token' ? { id: 'owner' } : { id: 'other' },
    fetchImpl: async (url, options) => { requests.push({ url, options }); return new Response(JSON.stringify({ session: { id: 'live_test', private: 'hidden' }, transport: { sdp: offer }, secret: 'hidden' })); }, ...overrides });
  return { requests, call: async (body, token = 'owner-token', method = 'POST') => {
    const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } };
    await handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res);
    return res;
  } };
}
test('voice requires server-verified identity and a private account allowlist', async () => {
  const f = fixture();
  assert.equal((await f.call({ action: 'start', sdp: offer }, '')).statusCode, 401);
  assert.equal((await f.call({ action: 'start', sdp: offer }, 'other')).statusCode, 503);
  assert.equal((await f.call({ action: 'start', sdp: offer, userId: 'owner' })).statusCode, 400);
  assert.equal((await f.call({ action: 'start', sdp: offer }, 'owner-token', 'GET')).statusCode, 405);
  assert.equal(f.requests.length, 0);
});
test('missing separate key fails closed without a provider call', async () => {
  const f = fixture({ apiKey: '' });
  assert.equal((await f.call({ action: 'status' })).body.available, false);
  assert.equal((await f.call({ action: 'start', sdp: offer })).statusCode, 503);
  assert.equal(f.requests.length, 0);
});
test('voice uses a fixed GPT-Live configuration, bounded SDP, private key and safe result', async () => {
  const f = fixture();
  for (const sdp of ['', 'v=0', offer.repeat(3000)]) assert.equal((await f.call({ action: 'start', sdp })).statusCode, 400);
  const result = await f.call({ action: 'start', sdp: offer });
  assert.equal(result.statusCode, 201);
  assert.deepEqual(result.body, { session: { id: 'live_test' }, transport: { type: 'webrtc', sdp: offer } });
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(f.requests[0].url, 'https://api.openai.com/v1/live/sessions');
  assert.equal(f.requests[0].options.redirect, 'error');
  assert.equal(JSON.parse(f.requests[0].options.body).session.model, 'gpt-live-1');
  assert.equal(voiceSessionConfig().store, false);
  assert.equal((await f.call({ action: 'start', sdp: offer })).statusCode, 429);
});
test('provider failures never expose provider bodies or secrets', async () => {
  const f = fixture({ fetchImpl: async () => new Response('secret-key-details', { status: 401 }) });
  const result = await f.call({ action: 'start', sdp: offer });
  assert.equal(result.statusCode, 502);
  assert.ok(!JSON.stringify(result.body).includes('secret-key-details'));
});
test('voice tool dispatcher cannot send, confirm, connect or inject an owner', async () => {
  let calls = 0;
  const deps = { request: async () => { calls++; } };
  for (const name of ['confirm_email', 'send_email', 'begin', '__proto__']) await assert.rejects(executeVoiceTool(name, {}, deps));
  await assert.rejects(executeVoiceTool('connected_apps', { userId: 'other' }, deps));
  assert.equal(calls, 0);
  assert.deepEqual(VOICE_TOOLS.map(item => item.name), ['connected_apps', 'read_connected_app', 'prepare_email']);
});
test('voice resolves sheets through authenticated read calls, not manual IDs', async () => {
  let body;
  const result = await executeVoiceTool('read_connected_app', { provider: 'google', feature: 'sheets', input_json: '{"query":"Dubai"}' }, { request: async input => { body = input; return { items: [] }; } });
  assert.deepEqual(body, { action: 'read', provider: 'google', feature: 'sheets', input: { query: 'Dubai' } });
  assert.deepEqual(result, { items: [] });
});
test('email tools deliver confirmation only to the UI, never to the model', async () => {
  let card;
  const preview = { to: 'broker@example.com', subject: 'Viewing', body: 'Tomorrow?' };
  const result = await executeVoiceTool('prepare_email', { provider: 'google', ...preview, reply_to_id: '' }, {
    request: async body => { assert.equal(body.action, 'prepare_email'); return { preview, confirmation: 'private-approval' }; },
    onPreview: value => { card = value; },
  });
  assert.equal(card.confirmation, 'private-approval');
  assert.equal(result.status, 'awaiting_user_confirmation');
  assert.ok(!JSON.stringify(result).includes('private-approval'));
});
test('ended calls do not display late email approvals', async () => {
  const controller = new AbortController(); let shown = false;
  await assert.rejects(executeVoiceTool('prepare_email', { provider: 'google', to: 'a@b.com', subject: 'Hi', body: 'Hi', reply_to_id: '' }, {
    signal: controller.signal, request: async () => { controller.abort(); return { preview: {}, confirmation: 'unused' }; }, onPreview: () => { shown = true; },
  }));
  assert.equal(shown, false);
});
