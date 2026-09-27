import { useState } from 'react';
import scheduleArt from '../../assets/schedule-empty.png';
import { FlatList, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SCHEDULE_DAYS, scheduleBuildingKey } from '../../../supabase/functions/_shared/building-schedule';
import BottomSheet from '../components/BottomSheet';
import AppIcon from '../components/AppIcon';
import { Button, Feedback } from './ui';

const daysFor = (value, name) => SCHEDULE_DAYS.filter(day => value.days[day].some(item => scheduleBuildingKey(item) === scheduleBuildingKey(name)));

export default function ScheduleEditor({ state, colors }) {
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(null);
  const [editing, setEditing] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const blocked = state.loading || Boolean(state.loadError) || state.saving;
  const scheduled = [...new Map(SCHEDULE_DAYS.flatMap(day => state.value.days[day]).map(name => [scheduleBuildingKey(name), name])).values()];
  const editingExisting = scheduled.some(name => scheduleBuildingKey(name) === scheduleBuildingKey(editing));
  const available = state.buildings.filter(name => !scheduled.some(item => scheduleBuildingKey(item) === scheduleBuildingKey(name)) && name.toLowerCase().includes(search.trim().toLowerCase()));
  const text = { color: colors.text, fontSize: 15 };
  const muted = { color: colors.textMuted, fontSize: 13, lineHeight: 19 };
  function edit(name) { setEditing(name); setSelectedDays(daysFor(state.value, name)); setSheet('edit'); }
  function done() {
    state.change(current => ({ days: Object.fromEntries(SCHEDULE_DAYS.map(day => {
      const remaining = current.days[day].filter(name => scheduleBuildingKey(name) !== scheduleBuildingKey(editing));
      return [day, selectedDays.includes(day) ? [...remaining, editing] : remaining];
    })) }));
    setSheet(null);
  }
  return <View style={{ flex: 1 }}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 88 }}>
      <Feedback colors={colors} error={state.loadError} loading={state.loading} onRetry={state.retry} />
      {scheduled.length ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Add building to schedule" disabled={blocked} onPress={() => { setSearch(''); setSheet('add'); }} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard }}><AppIcon name="plus" color={colors.text} /></Pressable>
      </View> : null}
      {scheduled.map(name => <Pressable key={scheduleBuildingKey(name)} accessibilityRole="button" accessibilityLabel={`Edit schedule for ${name}`} disabled={blocked} onPress={() => edit(name)} style={({ pressed }) => ({ padding: 16, gap: 12, borderRadius: 16, backgroundColor: colors.bgCard, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', opacity: pressed ? 0.65 : 1 })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: '600' }}>{name}</Text><AppIcon name="edit" size={18} color={colors.text} /><AppIcon name="checkCircle" size={20} color={colors.badgeOkText} /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{daysFor(state.value, name).map(day => <View key={day} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.bgBadge }}><Text style={{ color: colors.text, fontSize: 12 }}>{day.slice(0, 3)}</Text></View>)}</View>
      </Pressable>)}
      {!scheduled.length && !state.loading && !state.loadError ? <View style={{ backgroundColor: colors.bgCard, borderRadius: 20, padding: 24, paddingTop: 28, alignItems: 'center', gap: 20 }}>
        <Image source={scheduleArt} accessible={false} resizeMode="contain" style={{ width: '100%', height: 180 }} />
        <View style={{ gap: 8, alignItems: 'center' }}><Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 22, fontWeight: '600', textAlign: 'center' }}>Plan your first send</Text><Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' }}>Choose a building and the days to reach its sellers.</Text></View>
        <Button colors={colors} primary onPress={() => { setSearch(''); setSheet('add'); }} disabled={blocked} style={{ width: '100%', minHeight: 48, borderRadius: 12 }}>Add building</Button>
      </View> : null}
    </ScrollView>
    {state.dirty ? <View style={{ padding: 16, paddingTop: 12, gap: 8, backgroundColor: colors.bg }}>
      {state.error ? <Text accessibilityRole="alert" style={{ ...muted, color: colors.errorText }}>{state.error.message}</Text> : null}
      <Button colors={colors} primary disabled={blocked || !state.dirty} onPress={state.save} style={{ minHeight: 52, borderRadius: 26 }}>{state.saving ? 'Saving…' : state.saved ? 'Saved' : 'Save schedule'}</Button>
    </View> : null}
    <BottomSheet visible={Boolean(sheet)} onClose={() => setSheet(null)} colors={colors}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 8 }}><Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{sheet === 'edit' ? (editingExisting ? 'Edit schedule' : 'New schedule') : 'Add building'}</Text>{sheet === 'edit' ? <Text style={muted}>{editing}</Text> : null}</View>
      {sheet === 'edit' ? <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 28 }}>
        <View style={{ flexDirection: 'row', gap: 2 }}>{SCHEDULE_DAYS.map(day => { const checked = selectedDays.includes(day); return <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={`${editing}, ${day}`} accessibilityState={{ checked, disabled: blocked }} disabled={blocked} onPress={() => setSelectedDays(previous => previous.includes(day) ? previous.filter(item => item !== day) : [...previous, day])} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: checked ? colors.btnPrimaryBg : colors.bgBadge, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 14, fontWeight: '600', color: checked ? colors.btnPrimaryText : colors.text }}>{day.slice(0, 2)}</Text></View></Pressable>; })}</View>
        {!selectedDays.length ? <Text style={{ ...muted, textAlign: 'center' }}>{editingExisting ? 'No days selected. Done removes this building from the schedule.' : 'Choose the days to send.'}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>{editingExisting ? <Button colors={colors} disabled={blocked} onPress={() => { state.removeBuilding(editing); setSheet(null); }} style={{ flex: 1, minHeight: 50, borderRadius: 25, backgroundColor: colors.errorBg, borderColor: colors.errorBg }}>Remove</Button> : null}<Button colors={colors} primary disabled={blocked || (!editingExisting && !selectedDays.length)} onPress={done} style={{ flex: 1, minHeight: 50, borderRadius: 25 }}>Done</Button></View>
      </View> : <>
        <View style={{ marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.bgBadge, flexDirection: 'row', alignItems: 'center', gap: 8 }}><AppIcon name="search" size={18} color={colors.textMuted} /><TextInput accessibilityLabel="Search buildings" placeholder="Search" placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} style={{ ...text, flex: 1, minHeight: 46 }} /></View>
        <FlatList style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} data={available} keyExtractor={scheduleBuildingKey} renderItem={({ item }) => <Pressable accessibilityRole="button" disabled={blocked} onPress={() => edit(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, borderBottomWidth: 0.5, borderColor: colors.border }}><Text style={{ ...text, flex: 1 }}>{item}</Text><AppIcon name="plus" size={18} color={colors.textMuted} /></Pressable>} ListEmptyComponent={<Text style={{ ...muted, paddingVertical: 24 }}>{state.loading ? 'Loading buildings…' : search ? 'No matching buildings.' : state.buildings.length ? 'All your buildings are already scheduled.' : 'Import sellers with building names to get started.'}</Text>} />
      </>}
    </BottomSheet>
  </View>;
}
