import { useEffect, useRef, useState } from 'react';
import { createVoiceConversation } from './voice-conversation.js';

export function useVoice({ makeTransport, sessionRequest, integrationRequest }) {
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [captions, setCaptions] = useState({ you: '', assistant: '' });
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const call = useRef(null), card = useRef(null), sendLock = useRef(false), generation = useRef(0);
  useEffect(() => () => { generation.current++; call.current?.dispose(); }, []);
  function start() {
    if (call.current || sendLock.current) return;
    const current = ++generation.current;
    const active = () => generation.current === current;
    setError(''); setNotice(''); setCaptions({ you: '', assistant: '' });
    const conversation = createVoiceConversation({
      transport: makeTransport(message => { if (active()) setError(message); }), sessionRequest, integrationRequest,
      onState: next => { if (active()) { setState(next); if (next === 'idle') call.current = null; } },
      onError: message => { if (active()) setError(message); },
      onCaption: item => { if (active()) setCaptions(previous => ({ ...previous, [item.speaker]: (previous[item.speaker] + item.text).slice(-3000) })); },
      onPreview: next => {
        if (!active()) return;
        if (next && (card.current || sendLock.current)) throw new Error('Review the pending email first.');
        card.current = next; setPreview(next);
      },
    });
    call.current = conversation;
    void conversation.start();
  }
  function end() { call.current?.end(); }
  function reject() {
    if (sendLock.current) return;
    card.current = null; setPreview(null); setNotice('Draft dismissed. Nothing sent.');
    call.current?.notify('The user dismissed the email preview. Nothing was sent.');
  }
  async function confirm() {
    if (!card.current || sendLock.current) return;
    const selected = card.current, current = generation.current;
    sendLock.current = true; setSending(true); setError('');
    card.current = null; setPreview(null); // Never reuse a consumed/uncertain approval.
    try {
      await integrationRequest({ action: 'confirm_email', provider: selected.provider, feature: 'email', confirmation: selected.confirmation });
      if (current !== generation.current) return;
      const message = 'Accepted by your email provider. Delivery is not yet confirmed.';
      setNotice(message); call.current?.notify(message);
    } catch {
      if (current === generation.current) setError('The send could not be confirmed. Check your Sent folder before trying again.');
    } finally {
      sendLock.current = false;
      if (current === generation.current) setSending(false);
    }
  }
  return { state, error, notice, captions, preview, sending, start, end, confirm, reject,
    mute: () => call.current?.mute(state !== 'muted') };
}
