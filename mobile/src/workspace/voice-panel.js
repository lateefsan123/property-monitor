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

const sessionRequest = createVoiceRequest({ getSession: () => supabase.auth.getSession(), url: 'https://repeatai.org/api/voice' });
export default function VoicePanel({ colors, userId }) {
  const [open, setOpen] = useState(false);
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
  const empty = !voice.messages.length && !voice.result;
  const iconButton = { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' };
  const title = { connecting: 'Connecting', listening: 'I’m listening', muted: 'Microphone muted', ending: 'Ending conversation' }[voice.state] || 'What can I help with?';
  function close() { voice.end(); setOpen(false); }
  return <>
    <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.bg }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Open Repeat AI assistant" onPress={() => setOpen(true)}
      style={{ height: 56, borderRadius: 28, backgroundColor: colors.bgCard, paddingLeft: 8, paddingRight: 18, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border }}>
      <MatrixOrb size={44} color={colors.text} animated={false} /><Text style={{ color: colors.text, fontWeight: '600' }}>Ask Repeat</Text>
    </Pressable>
    </View>
    <Modal visible={open} presentationStyle="fullScreen" animationType="slide" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.bgCard, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 10, borderBottomWidth: .5, borderColor: colors.border }}>
          <Text style={{ ...text, fontWeight: '600' }}>Repeat AI</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="New chat" disabled={voice.sending} onPress={() => { voice.newChat(); setDraft(''); }} style={iconButton}><Icon name="plus" size={26} color={colors.text} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Close and end conversation" onPress={close} style={iconButton}><Icon name="close" size={24} color={colors.text} /></Pressable>
          </View>
        </View>
        <ScrollView ref={scroll} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" contentContainerStyle={{ padding: 22, gap: 14, flexGrow: 1, justifyContent: empty && !voice.error && !voice.notice ? 'center' : 'flex-start' }}>
          {(empty || active) && <><View style={{ alignSelf: 'center', marginBottom: 10 }}>
            <MatrixOrb size={148} color={colors.text} animated={open}
              state={voice.chatting || voice.loading || voice.sending || voice.state === 'connecting' ? 'thinking' : voice.state === 'listening' ? 'listening' : 'idle'} />
          </View>
          <Text accessibilityLiveRegion="polite" style={{ ...text, textAlign: 'center', fontSize: 25, lineHeight: 32, fontWeight: '500' }}>{title}</Text>
          </>}
          {voice.messages.map((message, index) => <View key={index} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'stretch', backgroundColor: message.role === 'user' ? colors.bgInput : 'transparent', borderRadius: 14, padding: 12 }}>
            <Text selectable accessibilityLabel={`${message.role === 'user' ? 'You' : 'Repeat AI'}: ${message.content}`} style={text}>{message.content}</Text>
          </View>)}
          {voice.chatting && <Text accessibilityLiveRegion="polite" style={muted}>Thinking…</Text>}
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
          {active && (voice.captions.you || voice.captions.assistant) ? <View style={{ gap: 12 }}><Text selectable style={muted}>{voice.captions.you}</Text><Text selectable style={text}>{voice.captions.assistant}</Text></View> : null}
          {voice.sending && <Text accessibilityLiveRegion="polite" style={muted}>Applying change…</Text>}
        </ScrollView>
        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 26, padding: 4, paddingLeft: 16, backgroundColor: colors.bgInput }}>
            <TextInput ref={composer} accessibilityLabel="Message Repeat AI" placeholder="Message Repeat" placeholderTextColor={colors.textMuted}
              value={draft} onChangeText={setDraft} multiline maxLength={4000} editable={!voice.chatting && !voice.sending && !voice.preview}
              style={{ ...text, flex: 1, minHeight: 44, maxHeight: 120, paddingVertical: 12 }} />
            {(voice.chatting || draft.trim()) ? <Pressable accessibilityRole="button" accessibilityLabel={voice.chatting ? 'Stop response' : 'Send message'} disabled={voice.sending || !!voice.preview}
              style={{ ...iconButton, width: 44, height: 44, backgroundColor: colors.btnPrimaryBg, opacity: voice.sending || voice.preview ? .4 : 1 }}
              onPress={voice.chatting ? voice.stopChat : () => { const text = draft; setDraft(''); void voice.sendText(text).then(() => scroll.current?.scrollToEnd({ animated: true })); }}><Icon name={voice.chatting ? 'stop' : 'arrowUp'} size={22} color={colors.btnPrimaryText} /></Pressable> : null}
          </View>
          {active && <Pressable accessibilityRole="button" accessibilityLabel={voice.state === 'muted' ? 'Unmute microphone' : 'Mute microphone'} disabled={!['listening', 'muted'].includes(voice.state)} onPress={voice.mute} style={iconButton}><Icon name={voice.state === 'muted' ? 'micOff' : 'mic'} size={24} color={colors.text} /></Pressable>}
          <Pressable accessibilityRole="button" accessibilityLabel={active ? 'End conversation' : 'Start voice conversation'} disabled={voice.sending || !!voice.preview || voice.chatting || voice.state === 'ending'} onPress={active ? voice.end : voice.start}
            style={{ ...iconButton, marginBottom: 2, backgroundColor: colors.btnPrimaryBg, opacity: voice.sending || voice.preview || voice.chatting || voice.state === 'ending' ? .4 : 1 }}><Icon name={active ? 'stop' : 'voice'} size={24} color={colors.btnPrimaryText} /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
