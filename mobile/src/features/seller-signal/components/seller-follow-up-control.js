import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { dubaiDateKey, followUpAfterDays } from '../../../../../supabase/functions/_shared/seller-follow-up';
import AppIcon from '../../../components/AppIcon';
import BottomSheet from '../../../components/BottomSheet';

function FollowUpEditor({ lead, colors: c, onSave, onClose }) {
  const [days, setDays] = useState(() => {
    const remaining = Math.round((Date.parse(lead.nextFollowUpOn) - Date.parse(dubaiDateKey())) / 86400000);
    return String(Number.isFinite(remaining) ? Math.min(365, Math.max(0, remaining)) : 7);
  });
  const [calledToday, setCalledToday] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  let nextDate = '';
  try { nextDate = followUpAfterDays(days); } catch { /* Invalid input keeps Save disabled. */ }
  async function save(clear = false) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await onSave(lead.id, { days, calledToday, clear });
      onClose();
    } catch (failure) { setError(failure.message || 'Could not save your follow-up.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <BottomSheet visible colors={c} onClose={() => { if (!locked.current) onClose(); }}>
    <View style={{ paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text accessibilityRole="header" style={{ color: c.text, fontSize: 22, fontWeight: '700' }}>Set follow-up</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 16 }}><Text style={{ color: c.textMuted, fontSize: 15 }}>Cancel</Text></Pressable>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}>
      <Text style={{ color: c.textMuted, fontSize: 15 }}>When would you like to follow up with {lead.name || 'this seller'}?</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{[1, 3, 7, 14, 30].map(day => <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: days === String(day), disabled: busy }} disabled={busy} onPress={() => setDays(String(day))} style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 22, backgroundColor: days === String(day) ? c.tabActiveBg : c.bgBadge }}><Text style={{ color: days === String(day) ? c.tabActiveText : c.text, fontWeight: '600' }}>{day === 1 ? 'Tomorrow' : `${day} days`}</Text></Pressable>)}</View>
      <View style={{ gap: 10 }}>
        <Text style={{ color: c.text, fontWeight: '600' }}>Or choose a number of days</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><TextInput accessibilityLabel="Days until follow-up" keyboardType="number-pad" value={days} onChangeText={setDays} editable={!busy} maxLength={3} style={{ color: c.text, backgroundColor: c.bgInput, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 14, minWidth: 80, fontSize: 16 }} /><Text style={{ color: c.textMuted }}>days from today</Text></View>
        <Text style={{ color: nextDate ? c.textMuted : c.errorText, fontSize: 13 }}>{nextDate ? `${new Date(`${nextDate}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' })} · Dubai time` : 'Choose a whole number from 0 to 365.'}</Text>
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: calledToday, disabled: busy }} disabled={busy} onPress={() => setCalledToday(value => !value)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: calledToday ? c.tabActiveBg : c.bgInput }}>{calledToday ? <AppIcon name="check" color={c.tabActiveText} size={16} /> : null}</View>
        <Text style={{ color: c.text, flex: 1 }}>I contacted this seller today</Text>
      </Pressable>
      <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 18 }}>Automatic transaction messages will wait until this date. Existing sending hours and limits still apply.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: c.errorText }}>{error}</Text> : null}
    </ScrollView>
    <View style={{ padding: 20, gap: 8, borderTopWidth: 1, borderTopColor: c.border }}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !nextDate }} disabled={busy || !nextDate} onPress={() => save()} style={{ padding: 16, borderRadius: 12, backgroundColor: c.btnPrimaryBg, opacity: busy || !nextDate ? 0.5 : 1 }}><Text style={{ color: c.btnPrimaryText, textAlign: 'center', fontWeight: '600', fontSize: 15 }}>{busy ? 'Saving…' : 'Save follow-up'}</Text></Pressable>
      {lead.nextFollowUpOn ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => save(true)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: c.textMuted, textAlign: 'center' }}>Use default schedule</Text></Pressable> : null}
    </View>
  </BottomSheet>;
}

export default function SellerFollowUpControl({ lead, colors: c, onSave }) {
  const [editing, setEditing] = useState(false);
  return <View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ gap: 4, flex: 1 }}><Text style={{ color: c.textFaint, fontSize: 11, fontWeight: '600' }}>FOLLOW-UP</Text><Text style={{ color: c.text, fontSize: 14 }}>{lead.nextFollowUpOn ? `Scheduled for ${lead.nextFollowUpOn}` : lead.dueLabel}</Text></View>
      <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={{ padding: 12 }}><Text style={{ color: c.text, fontWeight: '600' }}>Set follow-up</Text></Pressable>
    </View>
    {editing ? <FollowUpEditor lead={lead} colors={c} onSave={onSave} onClose={() => setEditing(false)} /> : null}
  </View>;
}
