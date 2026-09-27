import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { followUpAfterDays } from '../../../../../supabase/functions/_shared/seller-follow-up';
import AppIcon from '../../../components/AppIcon';

export default function SellerFollowUpControl({ lead, colors: c, onSave }) {
  const [days, setDays] = useState('7');
  const [calledToday, setCalledToday] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  let nextDate = '';
  try { nextDate = followUpAfterDays(days); } catch { /* Show validation on save. */ }
  async function save(clear = false) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await onSave(lead.id, { days, calledToday, clear });
      setEditing(false);
      setCalledToday(false);
    } catch (failure) { setError(failure.message || 'Could not save your follow-up.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ gap: 4, flex: 1 }}><Text style={{ color: c.textFaint, fontSize: 11, fontWeight: '600' }}>FOLLOW-UP</Text><Text style={{ color: c.text, fontSize: 14 }}>{lead.nextFollowUpOn ? `Scheduled for ${lead.nextFollowUpOn}` : lead.dueLabel}</Text></View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => setEditing(value => !value)} style={{ padding: 12 }}><Text style={{ color: c.text, fontWeight: '600' }}>{editing ? 'Cancel' : 'Set follow-up'}</Text></Pressable>
    </View>
    {editing ? <>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{[1, 3, 7, 14, 30].map(day => <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: days === String(day), disabled: busy }} disabled={busy} onPress={() => setDays(String(day))} style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, backgroundColor: days === String(day) ? c.tabActiveBg : c.bgBadge }}><Text style={{ color: days === String(day) ? c.tabActiveText : c.text }}>{day}d</Text></Pressable>)}</View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ color: c.text }}>Follow up in</Text><TextInput accessibilityLabel="Days until follow-up" keyboardType="number-pad" value={days} onChangeText={setDays} editable={!busy} maxLength={3} style={{ color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 12, minWidth: 64 }} /><Text style={{ color: c.text }}>days</Text></View>
      {nextDate ? <Text style={{ color: c.textMuted, fontSize: 12 }}>Next follow-up: {nextDate} · Dubai time</Text> : null}
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: calledToday, disabled: busy }} disabled={busy} onPress={() => setCalledToday(value => !value)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 }}><AppIcon name={calledToday ? 'checkCircle' : 'person'} color={c.text} size={20} /><Text style={{ color: c.text }}>I contacted this seller today</Text></Pressable>
      <Text style={{ color: c.textMuted, fontSize: 12 }}>Automatic transaction messages will wait until this date. Existing sending hours and limits still apply.</Text>
      <Pressable accessibilityRole="button" disabled={busy || !nextDate} onPress={() => save()} style={{ padding: 14, borderRadius: 12, backgroundColor: c.tabActiveBg, opacity: busy || !nextDate ? 0.5 : 1 }}><Text style={{ color: c.tabActiveText, textAlign: 'center', fontWeight: '600' }}>{busy ? 'Saving…' : 'Save follow-up'}</Text></Pressable>
      {lead.nextFollowUpOn ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => save(true)} style={{ padding: 10 }}><Text style={{ color: c.textMuted, textAlign: 'center' }}>Use default schedule</Text></Pressable> : null}
    </> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: c.errorText }}>{error}</Text> : null}
  </View>;
}
