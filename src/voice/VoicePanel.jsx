import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { integrationRequest } from '../integration-client';
import { createVoiceRequest } from '../../shared/voice-request.js';
import { useVoice } from '../../shared/use-voice.js';
import { createBrowserVoiceTransport } from './voice-transport';
import './voice.css';

const sessionRequest = createVoiceRequest({ getSession: () => supabase.auth.getSession(), url: '/api/voice' });
export default function VoicePanel() {
  const audio = useRef(null);
  const voice = useVoice({ makeTransport: onError => createBrowserVoiceTransport(audio.current, onError), sessionRequest, integrationRequest });
  const end = useRef(voice.end);
  useEffect(() => { end.current = voice.end; });
  useEffect(() => {
    const hidden = () => { if (document.hidden) end.current(); };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, []);
  const active = voice.state !== 'idle';
  return <section className="repeat-voice" aria-label="Repeat AI voice assistant">
    <h3>Talk to Repeat AI</h3>
    <p>Ask about your spreadsheets, inbox or upcoming viewings.</p>
    <p className="voice-disclosure">AI-generated voice. Audio and requested tool results are processed by OpenAI. Calls end after five minutes or when you leave this page.</p>
    <div className="voice-controls">
      {!active ? <button type="button" disabled={voice.sending} onClick={voice.start}>Start conversation</button> : <>
        <button type="button" disabled={!['listening', 'muted'].includes(voice.state)} onClick={voice.mute}>{voice.state === 'muted' ? 'Unmute' : 'Mute'}</button>
        <button type="button" disabled={voice.state === 'ending'} onClick={voice.end}>End conversation</button>
      </>}
      <span role="status">{{ connecting: 'Connecting…', listening: 'Listening', muted: 'Microphone muted', ending: 'Ending…' }[voice.state]}</span>
    </div>
    <audio ref={audio} autoPlay controls hidden={!active} aria-label="Assistant audio" />
    {voice.error && <p role="alert">{voice.error}</p>}
    {voice.notice && <p role="status">{voice.notice}</p>}
    {(voice.captions.you || voice.captions.assistant) && <details><summary>Captions</summary><p><strong>You</strong> {voice.captions.you}</p><p><strong>Repeat AI</strong> {voice.captions.assistant}</p></details>}
    {voice.preview && <div className="voice-email-preview" role="group" aria-label="Review email before sending">
      <h4>Review email</h4><p>Via {voice.preview.provider === 'google' ? 'Gmail' : 'Outlook'} · To: {voice.preview.preview.to}</p>
      <strong>{voice.preview.preview.subject}</strong><pre>{voice.preview.preview.body}</pre>
      <div className="voice-controls"><button type="button" disabled={voice.sending} onClick={voice.confirm}>Confirm and send</button><button type="button" disabled={voice.sending} onClick={voice.reject}>Discard</button></div>
    </div>}
    {voice.sending && <p role="status">Sending your approved email…</p>}
  </section>;
}
