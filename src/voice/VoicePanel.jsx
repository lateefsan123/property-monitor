import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, X, Captions, ArrowUp, AudioLines } from 'lucide-react';
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
  const [open, setOpen] = useState(false), [captions, setCaptions] = useState(false);
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
  function dismiss() { voice.end(); setOpen(false); onOpenChange?.(false); }
  const active = voice.state !== 'idle';
  const cards = voiceResultCards(voice.result);
  const title = { connecting: 'Connecting', listening: 'I’m listening', muted: 'Microphone muted', ending: 'Ending conversation' }[voice.state] || 'What can I help with?';
  return <div className={`repeat-assistant${open ? ' is-open' : ''}`}>
    <audio ref={audio} autoPlay controls={active} hidden={!active} aria-label="Assistant audio" />
    {!open && <button ref={launcher} className="assistant-launcher" type="button" aria-label="Open Repeat AI assistant" aria-expanded={false}
      onClick={() => { setOpen(true); onOpenChange?.(true); }}><AudioLines size={23} /><span>Ask Repeat</span></button>}
    {open && <section className="assistant-panel" role="dialog" aria-label="Repeat AI assistant" onKeyDown={event => { if (event.key === 'Escape') dismiss(); }}>
      <header className="assistant-header"><span><span className="assistant-mini-orb" />Repeat AI</span><button ref={closeButton} type="button" aria-label="Close and end conversation" onClick={dismiss}><X size={20} /></button></header>
      <div className="assistant-body">
        <MatrixOrb className="assistant-matrix-orb" size={cards.length ? 88 : 160} color="currentColor"
          state={voice.loading || voice.sending || voice.state === 'connecting' ? 'thinking' : voice.state === 'listening' ? 'listening' : 'idle'}
          labels={{ idle: '', listening: '', thinking: '' }} aria-hidden="true" />
        <h2 role="status">{title}</h2>
        {!voice.result && <p className="assistant-hint">Your sellers, signals and follow-ups.<br />Just ask.</p>}
        <div className="assistant-suggestions">
          <button disabled={voice.loading} onClick={() => voice.show('find_leads', { query: '', status: '', offset: '0' })}>My leads</button>
          <button disabled={voice.loading} onClick={() => voice.show('price_drops', { building: '' })}>Price drops</button>
          <button disabled={voice.loading} onClick={() => voice.show('automation_status')}>Automations</button>
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
        {captions && <div className="assistant-captions"><p>{voice.captions.you}</p><p>{voice.captions.assistant}</p></div>}
      </div>
      <footer className="assistant-footer"><div className="assistant-controls">
        <button type="button" aria-label="Toggle captions" aria-pressed={captions} onClick={() => setCaptions(!captions)}><Captions size={22} /></button>
        {!active ? <button className="assistant-start" type="button" disabled={voice.sending} onClick={voice.start}><Mic size={20} />Let’s talk<ArrowUp size={18} /></button> : <>
          <button type="button" aria-label={voice.state === 'muted' ? 'Unmute microphone' : 'Mute microphone'} disabled={!['listening', 'muted'].includes(voice.state)} onClick={voice.mute}>{voice.state === 'muted' ? <MicOff size={23} /> : <Mic size={23} />}</button>
          <button type="button" className="assistant-end" aria-label="End conversation" disabled={voice.state === 'ending'} onClick={voice.end}><X size={22} /></button>
        </>}
      </div><small>{voice.sending ? 'Applying your approved action…' : active ? 'Connected until you end. Five-minute limit.' : 'AI voice · Audio and requested app details shared with OpenAI.'}</small></footer>
    </section>}
  </div>;
}
