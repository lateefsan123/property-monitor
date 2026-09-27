import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { supabase } from '../supabase';
import { requestTemplateDraft } from '../../../shared/template-draft';
import { Button } from './ui';

export default function TemplateDraftControl({ colors, disabled, onApply }) {
  const [open, setOpen] = useState(false), [brief, setBrief] = useState('');
  const [draft, setDraft] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const active = useRef(true), lock = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function generate() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setDraft(null);
    try { const value = await requestTemplateDraft(supabase, brief.trim()); if (active.current) setDraft(value); }
    catch (failure) { if (active.current) setError(failure.message); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  return <View style={{ gap: 10 }}>
    <Button colors={colors} disabled={disabled || busy} onPress={() => setOpen(!open)}>Draft with AI</Button>
    {open && <>
      <Text style={{ color: colors.textMuted }}>Describe your message. 5 drafts a day; review before saving.</Text>
      <TextInput accessibilityLabel="Template drafting instructions" placeholder="A friendly monthly sales update" placeholderTextColor={colors.textMuted}
        value={brief} onChangeText={setBrief} maxLength={600} multiline editable={!disabled && !busy}
        style={{ color: colors.text, padding: 12, minHeight: 80, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }} />
      <Button colors={colors} disabled={disabled || busy || brief.trim().length < 5} onPress={generate}>{busy ? 'Drafting…' : 'Generate draft'}</Button>
      {!!error && <Text accessibilityRole="alert" style={{ color: colors.errorText }}>{error}</Text>}
      {draft && <><Text style={{ color: colors.text }}>{draft.name}{'\n\n'}{draft.content}</Text>
        <Button colors={colors} disabled={disabled || busy} onPress={() => { onApply(draft); setDraft(null); }}>Use draft in editor</Button></>}
    </>}
  </View>;
}
