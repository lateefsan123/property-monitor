import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import MatrixOrb from './matrix-orb';
import { integrationRequest } from './integration-client';
import { fetchListingPriceDrops } from './home-insights';
import { Button, Icon } from './ui';
import { createVoiceRequest } from '../../../shared/voice-request';
import { useVoice } from '../../../shared/use-voice';
import { createVoiceWorkspace, voiceResultCards } from '../../../shared/voice-workspace';
import { createNativeVoiceTransport } from './voice-transport';
import { ASSISTANT_PROMPTS } from '../../../shared/assistant-prompts';

const sessionRequest = createVoiceRequest({ getSession: () => supabase.auth.getSession(), url: 'https://repeatai.org/api/voice' });
export default function VoicePanel({ colors, userId }) {
  const [open, setOpen] = useState(false), [captions, setCaptions] = useState(false);
  const [draft, setDraft] = useState('');
  const scroll = useRef(null);
  const composer = useRef(null);
  const insets = useSafeAreaInsets();
  const cache = useQueryClient();
  const workspace = useMemo(() => createVoiceWorkspace({ supabase, userId, fetchPriceDrops: fetchListingPriceDrops,
    onChanged: () => cache.invalidateQueries() }), [cache, userId]);
  const voice = useVoice({ makeTransport: createNativeVoiceTransport, sessionRequest, integrationRequest, workspace });
  const end = useRef(voice.end);
  useEffect(() => { end.current = voice.end; });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'background') end.current(); });
    return () => subscription.remove();
  }, []);
  const active = voice.state !== 'idle';
  const text = { color: colors.text, fontSize: 14, lineHeight: 21 };
  const muted = { ...text, color: colors.textMuted, fontSize: 12 };
  const cards = voiceResultCards(voice.result);
  const title = { connecting: 'Connecting', listening: 'I’m listening', muted: 'Microphone muted', ending: 'Ending conversation' }[voice.state] || 'What can I help with?';
  function close() { voice.end(); setOpen(false); }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Open Repeat AI assistant" onPress={() => setOpen(true)}
      style={{ position: 'absolute', right: 20, bottom: Math.max(insets.bottom, 16) + 8, height: 52, borderRadius: 26, backgroundColor: colors.bgCard, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, boxShadow: '0 4px 20px #0003' }}>
      <MatrixOrb size={28} color={colors.text} animated={false} /><Text style={{ color: colors.text, fontWeight: '600' }}>Ask Repeat</Text>
    </Pressable>
    <Modal visible={open} presentationStyle="fullScreen" animationType="slide" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.bgCard, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 10, borderBottomWidth: .5, borderColor: colors.border }}>
          <Text style={{ ...text, fontWeight: '600' }}>Repeat AI</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="New chat" disabled={voice.sending} onPress={voice.newChat} style={{ padding: 12 }}><Text style={text}>+</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Close and end conversation" onPress={close} style={{ padding: 12, borderRadius: 24, backgroundColor: colors.bgInput }}><Icon name="close" color={colors.text} /></Pressable>
          </View>
        </View>
        <ScrollView ref={scroll} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" contentContainerStyle={{ padding: 22, gap: 14 }}>
          <View style={{ alignSelf: 'center', marginTop: cards.length || voice.messages.length ? 0 : 18, marginBottom: 10 }}>
            <MatrixOrb size={cards.length || voice.messages.length ? 64 : 116} color={colors.text} animated={open}
              state={voice.chatting || voice.loading || voice.sending || voice.state === 'connecting' ? 'thinking' : voice.state === 'listening' ? 'listening' : 'idle'} />
          </View>
          <Text accessibilityLiveRegion="polite" style={{ ...text, textAlign: 'center', fontSize: 25, lineHeight: 32, fontWeight: '500' }}>{title}</Text>
          {!voice.result && !voice.messages.length && <Text style={{ ...muted, textAlign: 'center' }}>Sales, market insights and your sellers. Type or talk to me.</Text>}
          {voice.messages.map((message, index) => <View key={index} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'stretch', backgroundColor: message.role === 'user' ? colors.bgInput : 'transparent', borderRadius: 14, padding: 12 }}>
            <Text selectable accessibilityLabel={`${message.role === 'user' ? 'You' : 'Repeat AI'}: ${message.content}`} style={text}>{message.content}</Text>
          </View>)}
          {voice.chatting && <Text accessibilityLiveRegion="polite" style={muted}>Thinking…</Text>}
          {!voice.messages.length && !voice.result && <View style={{ gap: 8 }}>
            {ASSISTANT_PROMPTS.map(prompt => <Pressable key={prompt} accessibilityRole="button" disabled={voice.loading || voice.chatting || voice.sending || !!voice.preview}
              onPress={() => { setDraft(prompt); composer.current?.focus(); }} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.bgInput }}>
              <Text style={text}>{prompt}</Text>
            </Pressable>)}
          </View>}
          {voice.loading && <Text style={muted}>Checking your workspace…</Text>}
          {voice.error ? <Text selectable accessibilityRole="alert" style={text}>{voice.error}</Text> : null}
          {voice.notice ? <Text selectable accessibilityLiveRegion="polite" style={text}>{voice.notice}</Text> : null}
          {voice.result && <View style={{ gap: 8 }}>
            <Text style={{ ...text, fontWeight: '600' }}>{voice.result.title || 'Here’s what I found'}{typeof voice.result.total === 'number' ? ` · ${voice.result.total}` : ''}</Text>
            {voice.result.note && <Text style={muted}>{voice.result.note}</Text>}
            {!cards.length && <Text style={muted}>No results found.</Text>}
            {cards.map((card, i) => <View key={i} style={{ paddingVertical: 12, gap: 3, borderBottomWidth: .5, borderColor: colors.border }}>
              <Text selectable style={{ ...text, fontWeight: '600' }}>{card.title}</Text>
              {!!card.detail && <Text selectable style={text}>{card.detail}</Text>}
              {!!card.meta && <Text selectable style={muted}>{card.meta}</Text>}
            </View>)}
            {voice.result.nextOffset != null && <Text style={muted}>Showing {voice.result.offset + 1}–{voice.result.offset + cards.length}. Ask for the next page.</Text>}
          </View>}
          {voice.preview && <View style={{ padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 16, gap: 12 }}>
            <Text style={{ ...text, fontWeight: '600' }}>{voice.preview.preview.subject}</Text>
            {voice.preview.preview.to && <Text selectable style={text}>To: {voice.preview.preview.to}</Text>}
            <Text selectable style={text}>{voice.preview.preview.body}</Text>
            <Button colors={colors} disabled={voice.sending} onPress={voice.confirm}>{voice.preview.kind ? 'Confirm change' : 'Confirm and send'}</Button>
            <Button colors={colors} disabled={voice.sending} onPress={voice.reject}>Discard</Button>
          </View>}
          {captions && <View style={{ gap: 12 }}><Text selectable style={muted}>{voice.captions.you}</Text><Text selectable style={text}>{voice.captions.assistant}</Text></View>}
        </ScrollView>
        <View style={{ padding: 18, gap: 12, borderTopWidth: .5, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 10, backgroundColor: colors.bgInput }}>
            <TextInput ref={composer} accessibilityLabel="Message Repeat AI" placeholder="Ask Repeat anything…" placeholderTextColor={colors.textMuted}
              value={draft} onChangeText={setDraft} multiline maxLength={4000} editable={!voice.chatting && !voice.sending && !voice.preview}
              style={{ ...text, flex: 1, minHeight: 40, maxHeight: 90 }} />
            {voice.chatting ? <Button colors={colors} onPress={voice.stopChat}>Stop</Button> : <Button colors={colors} primary disabled={!draft.trim() || voice.sending || !!voice.preview}
              onPress={() => { const text = draft; setDraft(''); void voice.sendText(text).then(() => scroll.current?.scrollToEnd({ animated: true })); }}>Send</Button>}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
            <Button colors={colors} accessibilityLabel="Toggle captions" onPress={() => setCaptions(!captions)}>CC</Button>
            {!active ? <Button colors={colors} primary disabled={voice.sending || !!voice.preview} onPress={voice.start}>Let’s talk ↑</Button> : <>
              <Button colors={colors} disabled={!['listening', 'muted'].includes(voice.state)} onPress={voice.mute}>{voice.state === 'muted' ? 'Unmute' : 'Mute'}</Button>
              <Button colors={colors} disabled={voice.state === 'ending'} onPress={voice.end}>End</Button>
            </>}
          </View>
          <Text style={{ ...muted, fontSize: 10, textAlign: 'center' }}>{voice.sending ? 'Applying your approved action…' : active ? 'Connected until you end. Five-minute limit.' : 'AI assistant · Messages and requested app details shared with OpenAI.'}</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
