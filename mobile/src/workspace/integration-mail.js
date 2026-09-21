import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button } from './ui';
import { integrationRequest } from './integration-client';

export default function IntegrationMail({ provider, replyToId, colors, onClose }) {
  const [draft, setDraft] = useState(replyToId ? { replyToId, body: '' } : { to: '', subject: '', body: '' });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [attempted, setAttempted] = useState(false);
  const lock = useRef(false);
  const text = { color: colors.text, fontSize: 14, lineHeight: 21 };
  function edit(key, value) { setPreview(null); setNotice(''); setDraft(current => ({ ...current, [key]: value })); }
  async function run(send) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice('');
    try {
      if (send) {
        const confirmation = preview?.confirmation;
        if (!confirmation) return;
        setPreview(null); setAttempted(true);
        await integrationRequest({ action: 'confirm_email', provider, feature: 'email', confirmation });
        setNotice('Accepted by your email provider. Delivery is not yet confirmed.');
      } else {
        setPreview(await integrationRequest({ action: 'prepare_email', provider, feature: 'email', input: draft }));
      }
    } catch (error) { setNotice(send ? `${error.message} Check Sent before composing another email. Nothing was retried.` : error.message); }
    finally { lock.current = false; setBusy(false); }
  }
  return <View style={{ gap: 12, paddingVertical: 16 }}>
    <Text style={{ ...text, fontSize: 18, fontWeight: '600' }}>{replyToId ? 'Write a reply' : 'New email'}</Text>
    {!attempted ? <>
      {(replyToId ? ['body'] : ['to', 'subject', 'body']).map(key => <View key={key} style={{ gap: 6 }}>
        <Text style={text}>{key === 'body' ? 'Message' : key === 'to' ? 'To' : 'Subject'}</Text>
        <TextInput accessibilityLabel={key === 'body' ? 'Message' : key === 'to' ? 'To' : 'Subject'} value={draft[key]} onChangeText={value => edit(key, value)} editable={!busy}
          multiline={key === 'body'} keyboardType={key === 'to' ? 'email-address' : 'default'} autoCapitalize={key === 'to' ? 'none' : 'sentences'}
          maxLength={key === 'body' ? 6000 : key === 'to' ? 254 : 300} style={{ ...text, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, minHeight: key === 'body' ? 140 : 44, textAlignVertical: 'top' }} />
      </View>)}
      <Button colors={colors} disabled={busy || !draft.body.trim() || (!replyToId && (!draft.to.trim() || !draft.subject.trim()))} onPress={() => run(false)}>Preview email</Button>
    </> : null}
    {preview ? <View style={{ gap: 10, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
      <Text style={{ ...text, fontWeight: '600' }}>Review before sending</Text>
      <Text selectable style={text}>To: {preview.preview.to}</Text>
      <Text selectable style={text}>{preview.preview.subject}</Text>
      <Text selectable style={text}>{preview.preview.body}</Text>
      <Button colors={colors} disabled={busy} onPress={() => run(true)}>Confirm and send</Button>
    </View> : null}
    {notice ? <Text selectable accessibilityLiveRegion="polite" style={text}>{notice}</Text> : null}
    <Button colors={colors} disabled={busy} onPress={onClose}>{attempted ? 'Close' : 'Cancel'}</Button>
  </View>;
}
