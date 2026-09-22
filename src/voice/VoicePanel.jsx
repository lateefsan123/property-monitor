import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, X, Plus, Square, ArrowUp, AudioLines } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { integrationRequest } from '../integration-client';
import { fetchListingPriceDrops } from '../features/home/home-insight-services';
import { createVoiceRequest } from '../../shared/voice-request.js';
import { useVoice } from '../../shared/use-voice.js';
import { createVoiceWorkspace, voiceResultCards } from '../../shared/voice-workspace.js';
import { createBrowserVoiceTransport } from './voice-transport';
import './voice.css';
import MatrixOrb from './MatrixOrb';

const sessionRequest = createVoiceRequest({ getSession: () => supabase.auth.getSession(), url: '/api/voice' });
export default function VoicePanel({ userId, onOpenChange }) {
  const audio = useRef(null), launcher = useRef(null), closeButton = useRef(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const chatEnd = useRef(null);
  const composer = useRef(null);
  const cache = useQueryClient();
  const workspace = useMemo(() => createVoiceWorkspace({ supabase, userId, fetchPriceDrops: fetchListingPriceDrops,
    onChanged: () => cache.invalidateQueries() }), [userId, cache]);
  const voice = useVoice({ makeTransport: onError => createBrowserVoiceTransport(audio.current, onError), sessionRequest, integrationRequest, workspace });
  const end = useRef(voice.end);
  useEffect(() => { end.current = voice.end; });
  useEffect(() => {
    const hidden = () => { if (document.hidden) end.current(); };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, []);
  useEffect(() => { if (open) closeButton.current?.focus(); else launcher.current?.focus(); }, [open]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest' }); }, [voice.messages.length, voice.chatting]);
  function dismiss() { voice.end(); setOpen(false); onOpenChange?.(false); }
  const active = voice.state !== 'idle';
  const cards = voiceResultCards(voice.result);
  const empty = !voice.messages.length && !voice.result;
  const title = { connecting: 'Connecting', listening: 'I’m listening', muted: 'Microphone muted', ending: 'Ending conversation' }[voice.state] || 'What can I help with?';
  return <div className={`repeat-assistant${open ? ' is-open' : ''}`}>
    <audio ref={audio} autoPlay hidden aria-label="Assistant audio" />
    {!open && <button ref={launcher} className="assistant-launcher" type="button" aria-label="Open Repeat AI assistant" aria-expanded={false}
      onClick={() => { setOpen(true); onOpenChange?.(true); }}><AudioLines size={23} /><span>Ask Repeat</span></button>}
    {open && <section className="assistant-panel" role="dialog" aria-label="Repeat AI assistant" onKeyDown={event => { if (event.key === 'Escape') dismiss(); }}>
      <header className="assistant-header"><span>Repeat AI</span><div className="assistant-header-actions"><button type="button" disabled={voice.sending} aria-label="New chat" onClick={() => { voice.newChat(); setDraft(''); }}><Plus size={26} /></button><button ref={closeButton} type="button" aria-label="Close and end conversation" onClick={dismiss}><X size={24} /></button></div></header>
      <div className={`assistant-body${empty && !voice.error && !voice.notice ? ' is-empty' : ''}`}>
        {(empty || active) && <><MatrixOrb className="assistant-matrix-orb" size={148} color="currentColor"
          state={voice.chatting || voice.loading || voice.sending || voice.state === 'connecting' ? 'thinking' : voice.state === 'listening' ? 'listening' : 'idle'}
          labels={{ idle: '', listening: '', thinking: '' }} aria-hidden="true" />
        <h2 role="status">{title}</h2></>}
        <div className="assistant-chat-log" role="log" aria-label="Conversation">
          {voice.messages.map((message, index) => <p key={index} className={`assistant-chat-message is-${message.role}`}><span className="assistant-speaker">{message.role === 'user' ? 'You' : 'Repeat AI'}: </span>{message.content}</p>)}
          {voice.chatting && <p role="status">Thinking…</p>}
          <div ref={chatEnd} />
        </div>
        {voice.loading && <p role="status">Checking your workspace…</p>}
        {voice.error && <p className="assistant-error" role="alert">{voice.error}</p>}
        {voice.notice && <p role="status">{voice.notice}</p>}
        {voice.result && <div className="assistant-results" aria-live="polite">
          <h3>{voice.result.title || 'Here’s what I found'}{typeof voice.result.total === 'number' && <span>{voice.result.total}</span>}</h3>
          {voice.result.note && <p className="assistant-note">{voice.result.note}</p>}
          {!cards.length && <p>No results found.</p>}
          {cards.map((card, index) => <article className="assistant-result" key={index}><strong>{card.title}</strong>{card.detail && <p>{card.detail}</p>}{card.meta && <small>{card.meta}</small>}</article>)}
          {voice.result.nextOffset != null && <p className="assistant-note">Showing {voice.result.offset + 1}–{voice.result.offset + cards.length}. Ask for the next page.</p>}
        </div>}
        {voice.preview && <div className="assistant-approval">
          <h3>{voice.preview.preview.subject}</h3>
          {voice.preview.preview.to && <p>To: {voice.preview.preview.to}</p>}
          <p>{voice.preview.preview.body}</p>
          <button disabled={voice.sending} onClick={voice.confirm}>{voice.preview.kind ? 'Confirm change' : 'Confirm and send'}</button>
          <button disabled={voice.sending} onClick={voice.reject}>Discard</button>
        </div>}
        {active && (voice.captions.you || voice.captions.assistant) && <div className="assistant-captions"><p>{voice.captions.you}</p><p>{voice.captions.assistant}</p></div>}
        {voice.sending && <p role="status">Applying change…</p>}
      </div>
      <footer className="assistant-footer">
        <form className="assistant-composer" onSubmit={event => { event.preventDefault(); if (draft.trim()) { void voice.sendText(draft); setDraft(''); } }}>
          <textarea ref={composer} aria-label="Message Repeat AI" placeholder="Message Repeat" value={draft} maxLength={4000} rows={1}
            disabled={voice.chatting || voice.sending || !!voice.preview} onChange={event => setDraft(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} />
          {voice.chatting ? <button type="button" aria-label="Stop response" onClick={voice.stopChat}><Square size={20} /></button>
            : draft.trim() ? <button type="submit" aria-label="Send message" disabled={voice.sending || !!voice.preview}><ArrowUp size={22} /></button> : null}
        </form>
        {active && <button className="assistant-mute" type="button" aria-label={voice.state === 'muted' ? 'Unmute microphone' : 'Mute microphone'} disabled={!['listening', 'muted'].includes(voice.state)} onClick={voice.mute}>{voice.state === 'muted' ? <MicOff size={24} /> : <Mic size={24} />}</button>}
        <button className="assistant-voice-toggle" type="button" aria-label={active ? 'End conversation' : 'Start voice conversation'} disabled={voice.sending || !!voice.preview || voice.chatting || voice.state === 'ending'} onClick={active ? voice.end : voice.start}>{active ? <Square size={22} /> : <AudioLines size={24} />}</button>
      </footer>
    </section>}
  </div>;
}
