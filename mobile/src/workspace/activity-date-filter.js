import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import AppIcon from '../components/AppIcon';
import BottomSheet from '../components/BottomSheet';
import { activityRange, activityRangeLabel, dubaiDateKey, validateActivityRange } from '../../../shared/send-activity-dates';

const PRESETS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'Last 7 days'], ['month', 'Last 30 days'], ['custom', 'Custom dates']];
export function ActivityDateEditor({ value, colors, onApply, onCancel }) {
  const [preset, setPreset] = useState(value.preset || 'custom');
  const [range, setRange] = useState(value.range);
  const [single, setSingle] = useState(value.range.startDate === value.range.endDate);
  const [field, setField] = useState('startDate');
  const [month, setMonth] = useState(value.range.startDate.slice(0, 7));
  const [error, setError] = useState('');
  const today = dubaiDateKey();
  const first = new Date(`${month}-01T12:00:00Z`);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const startOffset = (first.getUTCDay() + 6) % 7;
  function moveMonth(delta) {
    first.setUTCMonth(first.getUTCMonth() + delta);
    setMonth(first.toISOString().slice(0, 7));
  }
  function pick(key) {
    setError('');
    if (single) setRange({ startDate: key, endDate: key });
    else if (field === 'startDate') { setRange({ startDate: key, endDate: key > range.endDate ? key : range.endDate }); setField('endDate'); }
    else setRange({ ...range, endDate: key });
  }
  function apply() {
    try { const next = preset === 'custom' ? range : activityRange(preset); validateActivityRange(next); onApply({ preset, range: next }); }
    catch (failure) { setError(failure.message); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]} contentContainerStyle={{ padding: 20, gap: 18 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard }}>
      <Pressable accessibilityRole="button" onPress={onCancel} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.textMuted }}>Cancel</Text></Pressable>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Date range</Text>
      <Pressable accessibilityRole="button" onPress={apply} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.text, fontWeight: '600' }}>Apply</Text></Pressable>
    </View>
    {preset === 'custom' ? <Pressable accessibilityRole="button" onPress={() => setPreset('today')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.textMuted }}>Back to presets</Text></Pressable> : PRESETS.map(([key, title]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: preset === key }} onPress={() => { setPreset(key); setError(''); }} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.text, fontSize: 15 }}>{title}</Text>{key !== 'custom' && preset === key ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{activityRangeLabel(activityRange(key))}</Text> : null}</View>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: preset === key ? 6 : 1, borderColor: preset === key ? colors.text : colors.textFaint }} />
    </Pressable>)}
    {preset === 'custom' ? <>
      <View style={{ flexDirection: 'row', gap: 8 }}>{[[true, 'Single day'], [false, 'Date range']].map(([isSingle, title]) => <Pressable key={title} accessibilityRole="button" accessibilityState={{ selected: single === isSingle }} onPress={() => { setSingle(isSingle); setField('startDate'); if (isSingle) setRange({ ...range, endDate: range.startDate }); }} style={{ flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: single === isSingle ? colors.btnPrimaryBg : colors.bgBadge }}><Text style={{ color: single === isSingle ? colors.btnPrimaryText : colors.text }}>{title}</Text></Pressable>)}</View>
      <View style={{ flexDirection: 'row', gap: 12 }}>{(single ? ['startDate'] : ['startDate', 'endDate']).map(key => <View key={key} style={{ flex: 1, gap: 6 }}><Text style={{ color: colors.textMuted, fontSize: 12 }}>{single ? 'Date' : key === 'startDate' ? 'From' : 'To'}</Text><TextInput accessibilityLabel={single ? 'Date, YYYY-MM-DD' : key === 'startDate' ? 'Start date, YYYY-MM-DD' : 'End date, YYYY-MM-DD'} value={range[key]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textFaint} maxLength={10} onFocus={() => setField(key)} onChangeText={text => { setError(''); setRange(single ? { startDate: text, endDate: text } : { ...range, [key]: text }); if (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(text)) setMonth(text.slice(0, 7)); }} style={{ borderWidth: 1, borderColor: field === key ? colors.text : colors.border, borderRadius: 10, padding: 12, color: colors.text, fontSize: 14 }} /></View>)}</View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} style={{ padding: 12 }}><AppIcon name="chevronBack" color={colors.text} /></Pressable><Text style={{ color: colors.text, fontWeight: '600' }}>{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={month >= today.slice(0, 7)} onPress={() => moveMonth(1)} style={{ padding: 12, opacity: month >= today.slice(0, 7) ? 0.3 : 1 }}><AppIcon name="chevron" color={colors.text} /></Pressable></View>
      <View style={{ flexDirection: 'row' }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <Text key={index} style={{ width: '14.2857%', textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>{day}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Array.from({ length: startOffset + days }, (_, index) => {
        const day = index - startOffset + 1; if (day < 1) return <View key={index} style={{ width: '14.2857%', height: 44 }} />;
        const key = `${month}-${String(day).padStart(2, '0')}`; const selected = key === range.startDate || key === range.endDate; const inside = key > range.startDate && key < range.endDate; const disabled = key > today;
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={key} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => pick(key)} style={{ width: '14.2857%', height: 44, borderRadius: selected ? 10 : 0, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.btnPrimaryBg : inside ? colors.bgBadge : 'transparent', opacity: disabled ? 0.25 : 1 }}><Text style={{ color: selected ? colors.btnPrimaryText : colors.text }}>{day}</Text></Pressable>;
      })}</View>
    </> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.errorText }}>{error}</Text> : null}
    <Text style={{ color: colors.textMuted, fontSize: 12 }}>All dates use Dubai time.</Text>
  </ScrollView>;
}
export default function ActivityDateFilter({ value, colors, onApply }) {
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Filter dates: ${activityRangeLabel(value.range)}`} onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgCard, borderRadius: 12, padding: 12 }}><AppIcon name="calendar" size={17} color={colors.text} /><Text style={{ color: colors.text, fontSize: 13, flexShrink: 1 }}>{activityRangeLabel(value.range)}</Text><AppIcon name="chevron" size={15} color={colors.textMuted} /></Pressable>
    <BottomSheet visible={open} onClose={() => setOpen(false)} colors={colors}>{open ? <ActivityDateEditor value={value} colors={colors} onCancel={() => setOpen(false)} onApply={next => { onApply(next); setOpen(false); }} /> : null}</BottomSheet>
  </>;
}

