import { useEffect, useRef, useState } from 'react';
import { createVoiceConversation } from './voice-conversation.js';

export function useVoice({ makeTransport, sessionRequest, integrationRequest, workspace }) {
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [captions, setCaptions] = useState({ you: '', assistant: '' });
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const lookup = useRef(null);
  const call = useRef(null), card = useRef(null), sendLock = useRef(false), generation = useRef(0);
  useEffect(() => () => { generation.current++; lookup.current?.abort(); call.current?.dispose(); }, []);
  async function show(name, args = {}) {
    lookup.current?.abort();
    const controller = new AbortController(); lookup.current = controller;
    setLoading(true); setError('');
    try {
      const next = await workspace.read(name, args, controller.signal);
      if (!controller.signal.aborted) setResult(next);
    } catch (error) { if (!controller.signal.aborted) setError(error.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  function start() {
    if (call.current || sendLock.current) return;
    const current = ++generation.current;
    const active = () => generation.current === current;
    setError(''); setNotice(''); setCaptions({ you: '', assistant: '' });
    const conversation = createVoiceConversation({
      transport: makeTransport(message => { if (active()) setError(message); }), sessionRequest, integrationRequest, workspace,
      onResult: next => { if (active()) setResult(next); },
      onState: next => { if (active()) { setState(next); if (next === 'idle') call.current = null; } },
      onError: message => { if (active()) setError(message); },
      onCaption: item => { if (active()) setCaptions(previous => ({ ...previous, [item.speaker]: (previous[item.speaker] + item.text).slice(-3000) })); },
      onPreview: next => {
        if (!active()) return;
        if (next && (card.current || sendLock.current)) throw new Error('Review the pending action first.');
        if (!next) workspace?.discard();
        card.current = next; setPreview(next);
      },
    });
    call.current = conversation;
    void conversation.start();
  }
  function end() { lookup.current?.abort(); setLoading(false); workspace?.discard(); card.current = null; setPreview(null); call.current?.end(); }
  function reject() {
    if (sendLock.current) return;
    workspace?.discard(); card.current = null; setPreview(null); setNotice('Dismissed. Nothing changed or sent.');
    call.current?.notify('The user dismissed the pending action. Nothing changed or sent.');
  }
  async function confirm() {
    if (!card.current || sendLock.current) return;
    const selected = card.current, current = generation.current;
    sendLock.current = true; setSending(true); setError('');
    card.current = null; setPreview(null); // Never reuse a consumed/uncertain approval.
    try {
      const applied = selected.kind ? await workspace.confirm() : await integrationRequest({ action: 'confirm_email', provider: selected.provider, feature: 'email', confirmation: selected.confirmation });
      if (current !== generation.current) return;
      const message = selected.kind ? applied.message : 'Accepted by your email provider. Delivery is not yet confirmed.';
      setNotice(message); call.current?.notify(message);
    } catch {
      if (current === generation.current) setError('The action could not be confirmed. Check the current settings or Sent folder before trying again.');
    } finally {
      sendLock.current = false;
      if (current === generation.current) setSending(false);
    }
  }
  return { state, error, notice, captions, preview, sending, result, loading, show, start, end, confirm, reject,
    mute: () => call.current?.mute(state !== 'muted') };
}
