import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SCHEDULE_DAYS, scheduleBuildingKey } from '../../../supabase/functions/_shared/building-schedule';
import BottomSheet from '../components/BottomSheet';
import AppIcon from '../components/AppIcon';
import { SettingsToggle } from '../components/SettingsLayout';
import { Button, Feedback } from './ui';

function BuildingDays({ name, state, colors, blocked }) {
  const selected = SCHEDULE_DAYS.filter(day => state.value.days[day].some(item => scheduleBuildingKey(item) === scheduleBuildingKey(name)));
  return <View style={{ padding: 16, gap: 16, borderRadius: 16, backgroundColor: colors.bgCard }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><AppIcon name="building" size={19} color={colors.textMuted} /><Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: '600', lineHeight: 22 }}>{name}</Text></View>
    <View style={{ flexDirection: 'row', gap: 4 }}>{SCHEDULE_DAYS.map(day => {
      const checked = selected.includes(day);
      return <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={`${name}, ${day}`} accessibilityState={{ checked, disabled: blocked }} disabled={blocked} onPress={() => state.toggleBuilding(day, name)} style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: checked ? colors.btnPrimaryBg : colors.bgBadge, opacity: blocked ? 0.5 : pressed ? 0.65 : 1 })}><Text style={{ color: checked ? colors.btnPrimaryText : colors.textMuted, fontSize: 12, fontWeight: '600' }}>{day.slice(0, 2)}</Text></Pressable>;
    })}</View>
    {!selected.length ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>Choose sending days</Text> : null}
  </View>;
}

export default function ScheduleEditor({ state, spreadsheets, colors }) {
  const [search, setSearch] = useState('');
  const [choosingSource, setChoosingSource] = useState(false);
  const blocked = state.loading || Boolean(state.loadError) || state.saving;
  const source = spreadsheets.sources.find(item => item.id === spreadsheets.sourceId);
  const scheduled = [...new Map(SCHEDULE_DAYS.flatMap(day => state.value.days[day]).map(name => [scheduleBuildingKey(name), name])).values()];
  const sourceKeys = new Set(state.buildings.map(scheduleBuildingKey));
  const otherBuildings = scheduled.filter(name => !sourceKeys.has(scheduleBuildingKey(name)));
  const matches = name => name.toLowerCase().includes(search.trim().toLowerCase());
  const visibleBuildings = state.buildings.filter(matches);
  const visibleOtherBuildings = otherBuildings.filter(matches);
  const text = { color: colors.text, fontSize: 15 };
  const muted = { color: colors.textMuted, fontSize: 13, lineHeight: 19 };
  return <View style={{ flex: 1 }}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 24 }}>
      <View style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ ...text, fontWeight: '600' }}>Weekly schedule</Text><Text style={muted}>Repeats every week · Dubai time</Text></View><SettingsToggle colors={colors} accessibilityLabel="Weekly schedule" disabled={blocked} value={state.value.enabled} onValueChange={enabled => state.change({ enabled })} /></View>
        {!state.loading && !state.value.enabled ? <Text style={muted}>Off uses your account-wide automation.</Text> : null}
      </View>
      <Feedback colors={colors} error={state.loadError} loading={state.loading} onRetry={state.retry} />
      <View style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={muted}>Spreadsheet</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose spreadsheet" disabled={state.loading || state.saving} onPress={() => setChoosingSource(true)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 56, borderRadius: 14, backgroundColor: colors.bgCard, opacity: pressed ? 0.6 : 1 })}><AppIcon name="table" size={20} color={colors.textMuted} /><Text style={{ ...text, flex: 1 }}>{source?.label || 'Choose a spreadsheet'}</Text><AppIcon name="chevron" size={17} color={colors.textMuted} /></Pressable>
      </View>
      {source ? <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text accessibilityRole="header" style={{ ...text, fontWeight: '600' }}>Buildings</Text><Text style={muted}>{state.buildings.length}</Text></View>
        <View style={{ backgroundColor: colors.bgCard, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}><AppIcon name="search" size={18} color={colors.textMuted} /><TextInput accessibilityLabel="Search buildings" placeholder="Search buildings" placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} style={{ ...text, flex: 1, minHeight: 46 }} /></View>
        {visibleBuildings.map(name => <BuildingDays key={scheduleBuildingKey(name)} name={name} state={state} colors={colors} blocked={blocked} />)}
        {!visibleBuildings.length && !state.loading ? <Text style={{ ...muted, paddingVertical: 20, textAlign: 'center' }}>{state.buildings.length ? 'No matching buildings.' : 'This spreadsheet has no building names yet.'}</Text> : null}
      </View> : !scheduled.length && !state.loading ? <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}><AppIcon name="calendar" size={32} color={colors.textFaint} /><Text style={{ ...text, fontWeight: '600' }}>Plan your weekly outreach</Text><Text style={{ ...muted, textAlign: 'center' }}>Choose a spreadsheet, then set days for each building.</Text></View> : null}
      {visibleOtherBuildings.length ? <View style={{ gap: 12 }}><Text accessibilityRole="header" style={muted}>{source ? 'Other scheduled buildings' : 'Scheduled buildings'}</Text>{visibleOtherBuildings.map(name => <BuildingDays key={scheduleBuildingKey(name)} name={name} state={state} colors={colors} blocked={blocked} />)}</View> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.bgCard, borderRadius: 16 }}><View style={{ flex: 1, gap: 5 }}><Text style={text}>Fill unused slots</Text><Text style={muted}>Use other buildings when needed. Empty days stay off.</Text></View><SettingsToggle colors={colors} accessibilityLabel="Fill unused slots from other buildings" disabled={blocked} value={state.value.fill_unused} onValueChange={fill_unused => state.change({ fill_unused })} /></View>
    </ScrollView>
    <View style={{ padding: 16, paddingTop: 12, gap: 8, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.bg }}>
      {state.error ? <Text accessibilityRole="alert" style={{ ...muted, color: colors.errorText }}>{state.error.message}</Text> : null}
      <Button colors={colors} primary disabled={blocked || !state.dirty} onPress={state.save} style={{ minHeight: 52, borderRadius: 12 }}>{state.saving ? 'Saving…' : state.saved ? 'Saved' : 'Save schedule'}</Button>
    </View>
    <BottomSheet visible={choosingSource} onClose={() => setChoosingSource(false)} colors={colors}>
      <View style={{ padding: 20, paddingBottom: 12 }}><Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>Choose spreadsheet</Text></View>
      <FlatList style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} data={spreadsheets.sources} keyExtractor={item => item.id} renderItem={({ item }) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: item.id === spreadsheets.sourceId }} onPress={() => { spreadsheets.setSourceId(item.id); setSearch(''); setChoosingSource(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18, borderBottomWidth: 0.5, borderColor: colors.border }}><AppIcon name="table" color={colors.textMuted} /><Text style={{ ...text, flex: 1 }}>{item.label}</Text>{item.id === spreadsheets.sourceId ? <AppIcon name="check" color={colors.text} /> : null}</Pressable>} ListEmptyComponent={<Text style={{ ...muted, paddingVertical: 24 }}>Import a spreadsheet to choose its buildings.</Text>} />
    </BottomSheet>
  </View>;
}

