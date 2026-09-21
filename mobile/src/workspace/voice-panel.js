import { useEffect, useRef } from 'react';
import { AppState, Text, View } from 'react-native';
import { supabase } from '../supabase';
import { integrationRequest } from './integration-client';
import { Button } from './ui';
import { createVoiceRequest } from '../../../shared/voice-request';
import { useVoice } from '../../../shared/use-voice';
import { createNativeVoiceTransport } from './voice-transport';

const sessionRequest = createVoiceRequest({ getSession: () => supabase.auth.getSession(), url: 'https://repeatai.org/api/voice' });
export default function VoicePanel({ colors }) {
  const voice = useVoice({ makeTransport: createNativeVoiceTransport, sessionRequest, integrationRequest });
  const end = useRef(voice.end);
  useEffect(() => { end.current = voice.end; });
  useEffect(() => {
    // iOS permission dialogs temporarily mark the app inactive. Do not cancel
    // the first microphone request; end only when the app actually backgrounds.
    const subscription = AppState.addEventListener('change', state => { if (state === 'background') end.current(); });
    return () => subscription.remove();
  }, []);
  const text = { color: colors.text, fontSize: 14, lineHeight: 21 };
  return <View style={{ gap: 12, paddingBottom: 24, borderBottomWidth: 0.5, borderColor: colors.border }}>
    <Text style={{ ...text, fontSize: 18, fontWeight: '600' }}>Talk to Repeat AI</Text>
    <Text style={text}>Ask about your spreadsheets, inbox or upcoming viewings.</Text>
    <Text style={{ ...text, color: colors.textMuted, fontSize: 12 }}>AI-generated voice. Audio and requested tool results are processed by OpenAI. Calls end after five minutes or when you leave the app.</Text>
    {voice.state === 'idle' ? <Button colors={colors} disabled={voice.sending} onPress={voice.start}>Start conversation</Button> : <View style={{ gap: 10 }}>
      <Text accessibilityLiveRegion="polite" style={text}>{{ connecting: 'Connecting…', listening: 'Listening', muted: 'Microphone muted', ending: 'Ending…' }[voice.state]}</Text>
      <Button colors={colors} disabled={!['listening', 'muted'].includes(voice.state)} onPress={voice.mute}>{voice.state === 'muted' ? 'Unmute' : 'Mute'}</Button>
      <Button colors={colors} disabled={voice.state === 'ending'} onPress={voice.end}>End conversation</Button>
    </View>}
    {voice.error ? <Text selectable accessibilityRole="alert" style={text}>{voice.error}</Text> : null}
    {voice.notice ? <Text selectable accessibilityLiveRegion="polite" style={text}>{voice.notice}</Text> : null}
    {voice.captions.you ? <Text selectable style={text}>You: {voice.captions.you}</Text> : null}
    {voice.captions.assistant ? <Text selectable style={text}>Repeat AI: {voice.captions.assistant}</Text> : null}
    {voice.preview ? <View style={{ gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, borderCurve: 'continuous', padding: 14 }}>
      <Text style={{ ...text, fontWeight: '600' }}>Review email</Text>
      <Text selectable style={text}>Via {voice.preview.provider === 'google' ? 'Gmail' : 'Outlook'}</Text>
      <Text selectable style={text}>To: {voice.preview.preview.to}</Text>
      <Text selectable style={{ ...text, fontWeight: '600' }}>{voice.preview.preview.subject}</Text>
      <Text selectable style={text}>{voice.preview.preview.body}</Text>
      <Button colors={colors} disabled={voice.sending} onPress={voice.confirm}>Confirm and send</Button>
      <Button colors={colors} disabled={voice.sending} onPress={voice.reject}>Discard</Button>
    </View> : null}
    {voice.sending ? <Text accessibilityLiveRegion="polite" style={text}>Sending your approved email…</Text> : null}
  </View>;
}
