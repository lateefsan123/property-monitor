import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet from '../components/BottomSheet';
import { Feedback, Icon } from '../workspace/ui';
import { OUTREACH_TEMPLATES, renderOutreach } from '../../../shared/email-outreach';

const TIMING = ['First email', '3 days later', '7 days after email 2'];
const SAMPLE = { name: 'Alex Morgan', first_name: 'Alex', agency: 'Harbor Real Estate' };

// The three-email sequence, listed like the original Templates screen; each
// opens the original full-screen editor layout.
export default function OutreachTemplates({ colors, outreach }) {
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const campaign = outreach.campaign.data;
  const templates = campaign?.templates || OUTREACH_TEMPLATES;
  const locked = Boolean(campaign?.lastAttemptAt) || campaign?.status === 'active';
  return <View style={{ flex: 1, backgroundColor: colors.isDark ? colors.bg : colors.bgCard }}>
    {notice ? <Text accessibilityRole="alert" style={{ color: colors.badgeOkText, paddingHorizontal: 20, paddingVertical: 8 }}>{notice}</Text> : null}
    {outreach.campaign.isPending || (outreach.campaign.error && !campaign) ? <View style={{ padding: 20 }}><Feedback colors={colors} error={outreach.campaign.error} loading={outreach.campaign.isPending} onRetry={outreach.campaign.refetch} /></View> : <FlatList
      data={templates.map((template, index) => ({ ...template, index }))}
      keyExtractor={item => String(item.index)}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 80 }}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Edit email ${item.index + 1}`} onPress={() => { setNotice(''); setEditing(item.index); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 74, opacity: pressed ? 0.5 : 1 })}>
        <Icon name="mail" size={21} color={colors.textMuted} />
        <View style={{ flex: 1, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text numberOfLines={1} style={{ flex: 1, color: colors.textName, fontSize: 15, fontWeight: '500' }}>Email {item.index + 1}</Text>
            <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.textMuted, fontSize: 12 }}>{TIMING[item.index]}</Text>
          </View>
          <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 13 }}>{item.subject} · {item.body.replace(/\s+/g, ' ').trim()}</Text>
        </View>
      </Pressable>}
      ListFooterComponent={<Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, paddingTop: 20 }}>{locked ? 'Emails can’t be edited after the first send.' : 'Every email ends with a line asking people to reply “no” to stop. Any reply stops the follow-ups.'}</Text>}
    />}
    {editing !== null ? <EmailEditor key={editing} index={editing} templates={templates} locked={locked} colors={colors} outreach={outreach} onClose={message => { setEditing(null); if (typeof message === 'string') setNotice(message); }} /> : null}
  </View>;
}

function EmailEditor({ index, templates, locked, colors, outreach, onClose }) {
  const [subject, setSubject] = useState(templates[index].subject);
  const [body, setBody] = useState(templates[index].body);
  const [dirty, setDirty] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const blue = colors.isDark ? '#6EA8FF' : '#1769E8';
  const canSave = !locked && !busy && dirty && subject.trim() && body.trim();
  let preview = null;
  try { preview = renderOutreach({ subject, body }, SAMPLE); } catch (cause) { preview = { error: cause.message }; }
  async function save() {
    setBusy(true); setError(null);
    try {
      await outreach.run({ action: 'templates', templates: templates.map((template, i) => i === index ? { subject, body } : { subject: template.subject, body: template.body }) });
      onClose('Email saved.');
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  const requestClose = () => (dirty && !busy ? setSheet('discard') : onClose());
  const field = { color: colors.textName, fontSize: 16, minHeight: 44, paddingVertical: 10, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: colors.border };
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={requestClose}>
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.isDark ? colors.bg : colors.bgCard }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close editor" disabled={busy} onPress={requestClose} style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.bgCard, opacity: pressed || busy ? 0.5 : 1, boxShadow: '0 3px 16px rgba(0,0,0,0.04)' })}>
              <Icon name="close" size={26} color={colors.textName} />
            </Pressable>
            {locked ? null : <Pressable accessibilityRole="button" accessibilityLabel="Save email" accessibilityState={{ disabled: !canSave }} disabled={!canSave} onPress={save} style={({ pressed }) => ({ minWidth: 60, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, opacity: !canSave ? 0.4 : pressed ? 0.6 : 1, boxShadow: '0 3px 16px rgba(0,0,0,0.04)' })}>
              <Text style={{ color: blue, fontSize: 15, fontWeight: '600' }}>{busy ? 'Saving…' : 'Save'}</Text>
            </Pressable>}
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 18 }}>
            <View style={{ gap: 8, marginBottom: 8 }}>
              <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 28, fontWeight: '700', letterSpacing: -0.7 }}>Email {index + 1}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 16, lineHeight: 23 }}>{TIMING[index]}{locked ? ' · Sending has started, so this can’t be edited.' : ''}</Text>
            </View>
            <Feedback colors={colors} error={error} />
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Subject</Text>
              <TextInput accessibilityLabel="Subject" value={subject} editable={!locked && !busy} placeholder="Subject" placeholderTextColor={colors.textFaint} onChangeText={value => { setSubject(value); setDirty(true); }} style={field} />
            </View>
            <View style={{ gap: 10 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Message</Text>
              <TextInput accessibilityLabel="Message" value={body} editable={!locked && !busy} multiline scrollEnabled={false} textAlignVertical="top" placeholder="Write your email…" placeholderTextColor={colors.textFaint}
                onChangeText={value => { setBody(value); setDirty(true); }} style={{ color: colors.text, fontSize: 16, lineHeight: 25, minHeight: 100, padding: 0 }} />
            </View>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 10 }}>
              {locked ? <View style={{ flex: 1 }} /> : <Pressable accessibilityRole="button" disabled={busy} onPress={() => setSheet('details')} style={{ minHeight: 44, flex: 1, justifyContent: 'center' }}><Text style={{ color: colors.textMuted, fontSize: 14 }}>Insert details</Text></Pressable>}
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setSheet('preview')} style={{ minHeight: 44, paddingLeft: 20, justifyContent: 'center' }}><Text style={{ color: blue, fontSize: 14 }}>Preview</Text></Pressable>
            </View>
          </ScrollView>
          <BottomSheet visible={Boolean(sheet)} onClose={() => setSheet(null)} colors={colors}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 18 }}>
              <Text style={{ color: colors.textName, fontSize: 21, fontWeight: '600' }}>{sheet === 'preview' ? 'Preview' : sheet === 'discard' ? 'Unsaved changes' : 'Insert details'}</Text>
              {sheet === 'details' ? <>
                <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>These are filled in for each contact when the email is sent.</Text>
                {[['First name', '{first_name}'], ['Full name', '{name}'], ['Agency', '{agency}']].map(([label, token]) => <Pressable key={token} accessibilityRole="button" accessibilityLabel={`Insert ${label.toLowerCase()}`} onPress={() => { setBody(previous => previous + token); setDirty(true); setSheet(null); }} style={{ minHeight: 48, justifyContent: 'center' }}>
                  <Text style={{ color: colors.textName, fontSize: 16 }}>{label}</Text>
                </Pressable>)}
              </> : sheet === 'preview' ? (preview.error ? <Text style={{ color: colors.errorText, fontSize: 15 }}>{preview.error}</Text> : <View style={{ gap: 10 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>To Alex Morgan, Harbor Real Estate</Text>
                <Text selectable style={{ color: colors.textName, fontSize: 16, fontWeight: '600' }}>{preview.subject}</Text>
                <Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>{preview.body}</Text>
              </View>) : <>
                <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>Close without saving your changes?</Text>
                <Pressable accessibilityRole="button" onPress={() => onClose()} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.errorText, fontSize: 16 }}>Discard changes</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => setSheet(null)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.textName, fontSize: 16 }}>Keep editing</Text></Pressable>
              </>}
            </ScrollView>
          </BottomSheet>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
}
