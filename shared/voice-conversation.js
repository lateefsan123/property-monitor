import { executeVoiceTool } from './voice-tools.js';

// Platform adapters own microphone, speaker and peer setup. The conversation
// lifecycle and tool authorization are identical on web and native.
export function createVoiceConversation({ transport, sessionRequest, integrationRequest, onState, onCaption, onPreview, onError, onUsage = () => {} }) {
  const abort = new AbortController();
  let peer, channel, microphone, deadline, closeTimer, durationTimer;
  let closed = false, closing = false, ready = false, started = false, toolCount = 0;
  const responses = new Map();
  const seenCalls = new Set();
  const send = event => {
    if (!closed && channel?.readyState === 'open') channel.send(JSON.stringify(event));
  };
  function cleanup() {
    if (closed) return;
    closed = true; ready = false; abort.abort();
    clearTimeout(deadline); clearTimeout(closeTimer); clearTimeout(durationTimer);
    microphone?.getTracks().forEach(track => track.stop());
    channel?.close(); peer?.close(); transport.cleanup(); responses.clear(); onPreview(null);
    onState('idle');
  }
  function fail(message) { if (!closed) { onError(message); cleanup(); } }
  function end() {
    if (closed || closing) return;
    closing = true; abort.abort(); clearTimeout(deadline); clearTimeout(durationTimer);
    microphone?.getTracks().forEach(track => { track.enabled = false; });
    onPreview(null);
    if (!ready || channel?.readyState !== 'open') { cleanup(); return; }
    onState('ending');
    closeTimer = setTimeout(() => { onError('Conversation ended; final usage could not be confirmed.'); cleanup(); }, 5000);
    send({ type: 'session.close' });
  }
  async function finishResponse(batch) {
    if (!batch.done || batch.finishing || !batch.calls.length) return;
    batch.finishing = true;
    const outputs = await Promise.all(batch.calls);
    if (closed || closing) return;
    for (const { callId, result } of outputs) {
      const json = JSON.stringify(result);
      const output = json.length <= 30000 ? json : JSON.stringify({ truncated: true, preview: json.slice(0,26000), note: 'Partial result only; do not claim complete coverage.' });
      send({ type: 'response.item.create', item: { type: 'function_call_output', call_id: callId, output } });
    }
    send({ type: 'response.create' });
  }
  function receive(raw) {
    if (closed) return;
    let event;
    try { event = JSON.parse(raw); } catch { return; }
    if (event.type === 'session.closed') { onUsage({ ...event.usage, finalized: true }); cleanup(); return; }
    if (closing) return;
    if (event.type === 'session.started') {
      if (ready) return;
      ready = true; clearTimeout(deadline); onState('listening');
      durationTimer = setTimeout(end, 5 * 60 * 1000);
    } else if (event.type === 'session.usage.updated') onUsage({ ...event.usage, finalized: false });
    else if (event.type === 'session.input_transcript.delta' || event.type === 'session.output_transcript.delta') {
      if (typeof event.delta === 'string') onCaption({ speaker: event.type.includes('input_') ? 'you' : 'assistant', text: event.delta, start: event.start_ms, end: event.end_ms });
    } else if (event.type === 'error') fail('Voice encountered a problem. Please end and start a new conversation.');
    else if (event.type === 'response.event') {
      const inner = event.event;
      if (!inner || typeof event.delegation_id !== 'string') return;
      if (inner.type === 'response.created') responses.set(event.delegation_id, { calls: [], done: false, finishing: false });
      const batch = responses.get(event.delegation_id);
      if (!batch) return;
      if (inner.type === 'response.output_item.done' && inner.item?.type === 'function_call') {
        const item = inner.item;
        if (typeof item.call_id !== 'string' || seenCalls.has(item.call_id)) return;
        seenCalls.add(item.call_id);
        batch.calls.push((async () => {
          try {
            if (++toolCount > 40 || typeof item.arguments !== 'string' || item.arguments.length > 10000) throw new Error('Voice action limit reached.');
            const result = await executeVoiceTool(item.name, JSON.parse(item.arguments), { request: integrationRequest, onPreview, signal: abort.signal });
            return { callId: item.call_id, result };
          } catch { return { callId: item.call_id, result: { error: 'Action unavailable or invalid. Nothing has been sent. Check the integration or ask for clarification.' } }; }
        })());
      } else if (inner.type === 'response.completed') { batch.done = true; void finishResponse(batch); }
      else if (inner.type === 'response.failed' || inner.type === 'response.incomplete') onError('The assistant could not finish that lookup. No email was sent.');
    }
  }
  async function start() {
    if (started || closed) return;
    started = true;
    onState('connecting');
    deadline = setTimeout(() => fail('Voice connection timed out. Please try again.'), 40000);
    try {
      const status = await sessionRequest({ action: 'status' }, abort.signal);
      if (closed || closing) return;
      if (!status.available) throw new Error(status.reason || 'Voice is not enabled yet.');
      const stream = await transport.microphone();
      if (closed || closing) { stream.getTracks().forEach(track => track.stop()); return; }
      microphone = stream;
      peer = transport.peer();
      peer.addEventListener('track', event => { if (!closed) transport.play(event); });
      peer.addEventListener('connectionstatechange', () => {
        if (!closing && ['failed', 'disconnected'].includes(peer.connectionState)) fail('Voice disconnected. Start a new conversation when your connection returns.');
      });
      for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);
      channel = peer.createDataChannel('oai-events');
      channel.addEventListener('message', event => receive(event.data));
      channel.addEventListener('close', () => { if (!closed) fail('Voice disconnected before final usage was confirmed.'); });
      const offer = await peer.createOffer();
      if (closed || closing) return;
      await peer.setLocalDescription(offer);
      await waitForIce(peer, abort.signal);
      if (closed || closing) return;
      const result = await sessionRequest({ action: 'start', sdp: peer.localDescription.sdp }, abort.signal);
      if (closed || closing) return;
      await peer.setRemoteDescription(transport.answer(result.transport.sdp));
    } catch (error) { if (!closed && !closing) fail(error.name === 'NotAllowedError' ? 'Allow microphone access to start voice.' : error.message || 'Voice could not connect.'); }
  }
  return {
    start, end, dispose: cleanup,
    mute(value) { if (ready && !closing) { microphone?.getAudioTracks().forEach(track => { track.enabled = !value; }); onState(value ? 'muted' : 'listening'); } },
    notify(content) { if (ready && !closing) send({ type: 'session.commentary.append', delegation_id: null, content: String(content).slice(0,1000) }); },
  };
}

function waitForIce(peer, signal) {
  if (signal.aborted) return Promise.reject(new Error('Conversation ended.'));
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const finish = error => {
      clearTimeout(timer); peer.removeEventListener('icegatheringstatechange', changed); signal.removeEventListener('abort', aborted);
      if (error) reject(error); else resolve();
    };
    const changed = () => { if (peer.iceGatheringState === 'complete') finish(); };
    const aborted = () => finish(new Error('Conversation ended.'));
    const timer = setTimeout(() => finish(new Error('Voice network setup timed out.')), 10000);
    peer.addEventListener('icegatheringstatechange', changed); signal.addEventListener('abort', aborted, { once: true }); changed();
  });
}
