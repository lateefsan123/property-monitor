import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceConversation } from '../shared/voice-conversation.js';

class Channel extends EventTarget {
  readyState = 'open'; sent = [];
  send(text) { this.sent.push(JSON.parse(text)); }
  close() { this.readyState = 'closed'; }
  message(event) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(event) })); }
}
function fixture(overrides = {}) {
  const channel = new Channel();
  const track = { enabled: true, stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const peer = Object.assign(new EventTarget(), { iceGatheringState: 'complete', connectionState: 'connected',
    addTrack() {}, createDataChannel: () => channel, createOffer: async () => ({ sdp: 'offer' }),
    async setLocalDescription(offer) { this.localDescription = offer; }, async setRemoteDescription(answer) { this.answer = answer; }, close() { this.closed = true; } });
  const state = { states: [], errors: [], captions: [], previews: [], usage: [], requests: [], mediaRequests: 0 };
  const conversation = createVoiceConversation({
    transport: { microphone: async () => { state.mediaRequests++; return stream; }, peer: () => peer, answer: sdp => ({ type: 'answer', sdp }), play() {}, cleanup() { state.cleaned = true; } },
    sessionRequest: async body => { state.requests.push(body); return body.action === 'status' ? { available: true } : { transport: { sdp: 'answer' } }; },
    integrationRequest: async () => ({ connections: [] }), onState: value => state.states.push(value), onError: value => state.errors.push(value),
    onCaption: value => state.captions.push(value), onPreview: value => state.previews.push(value), onUsage: value => state.usage.push(value), ...overrides,
  });
  return { conversation, channel, track, peer, state };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
test('voice startup does not request microphone before backend availability', async () => {
  const f = fixture({ sessionRequest: async () => ({ available: false, reason: 'Not enabled' }) });
  await f.conversation.start();
  assert.equal(f.state.mediaRequests, 0);
  assert.deepEqual(f.state.errors, ['Not enabled']);
  assert.equal(f.state.cleaned, true);
});
test('one start, session.started readiness, independent captions, mute and graceful close', async () => {
  const f = fixture();
  await Promise.all([f.conversation.start(), f.conversation.start()]);
  assert.equal(f.state.requests.length, 2);
  assert.equal(f.peer.answer.sdp, 'answer');
  assert.equal(f.channel.sent.length, 0); // Never session.start over WebRTC.
  f.channel.message({ type: 'session.started' });
  f.channel.message({ type: 'session.input_transcript.delta', delta: 'My sheet', start_ms: 0, end_ms: 500 });
  f.channel.message({ type: 'session.output_transcript.delta', delta: 'Sure', start_ms: 100, end_ms: 300 });
  assert.deepEqual(f.state.captions.map(item => item.speaker), ['you', 'assistant']);
  f.conversation.mute(true); assert.equal(f.track.enabled, false);
  f.conversation.mute(false); assert.equal(f.track.enabled, true);
  f.conversation.end(); assert.equal(f.track.enabled, false);
  assert.equal(f.channel.sent.at(-1).type, 'session.close');
  assert.notEqual(f.peer.closed, true);
  f.channel.message({ type: 'session.closed', usage: { seconds: 20 } });
  assert.equal(f.peer.closed, true); assert.equal(f.track.stopped, true);
  assert.deepEqual(f.state.usage, [{ seconds: 20, finalized: true }]);
});
test('tool results wait for response completion and duplicate calls do not run twice', async () => {
  let count = 0;
  const f = fixture({ integrationRequest: async () => { count++; return { connections: [] }; } });
  await f.conversation.start(); f.channel.message({ type: 'session.started' });
  const emit = event => f.channel.message({ type: 'response.event', delegation_id: 'd1', event });
  emit({ type: 'response.created', response: { id: 'r1' } });
  const item = { type: 'function_call', call_id: 'c1', name: 'connected_apps', arguments: '{}' };
  emit({ type: 'response.output_item.done', item }); emit({ type: 'response.output_item.done', item });
  await tick(); assert.equal(f.channel.sent.length, 0);
  emit({ type: 'response.completed', response: { output: [] } }); await tick();
  assert.equal(count, 1);
  assert.deepEqual(f.channel.sent.map(event => event.type), ['response.item.create', 'response.create']);
  f.conversation.dispose();
});
test('late tools after closing cannot continue a response or show an approval', async () => {
  let resolve;
  const f = fixture({ integrationRequest: () => new Promise(done => { resolve = done; }) });
  await f.conversation.start(); f.channel.message({ type: 'session.started' });
  const emit = event => f.channel.message({ type: 'response.event', delegation_id: 'd1', event });
  emit({ type: 'response.created' });
  emit({ type: 'response.output_item.done', item: { type: 'function_call', call_id: 'c1', name: 'connected_apps', arguments: '{}' } });
  emit({ type: 'response.completed' }); f.conversation.end();
  resolve({ connections: [] }); await tick();
  assert.deepEqual(f.channel.sent.map(event => event.type), ['session.close']);
  f.conversation.dispose();
});
test('closing while permission is pending stops the late microphone stream', async () => {
  let resolve, stopped = false;
  const f = fixture({ transport: { microphone: () => new Promise(done => { resolve = done; }), cleanup() {} } });
  const starting = f.conversation.start(); await tick(); f.conversation.end();
  resolve({ getTracks: () => [{ stop() { stopped = true; } }] }); await starting;
  assert.equal(stopped, true);
});
