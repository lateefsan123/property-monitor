import { useState } from "react";
import { FlatList, Pressable, ScrollView, Switch, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useBuildingSchedule } from "../../../shared/use-building-schedule";
import { SCHEDULE_DAYS, scheduleBuildingKey } from "../../../supabase/functions/_shared/building-schedule";
import { supabase } from "../supabase";
import BottomSheet from "../components/BottomSheet";
import { Button } from "./ui";
import { useSpreadsheetBuildings } from "./use-spreadsheet-buildings";

export default function ScheduleScreen({ userId, colors }) {
  const spreadsheets = useSpreadsheetBuildings(userId);
  const state = useBuildingSchedule(supabase, userId, spreadsheets);
  const [day, setDay] = useState(null);
  const [search, setSearch] = useState("");
  const [choosingSource, setChoosingSource] = useState(false);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(310, width - 64);
  const blocked = state.loading || Boolean(state.loadError) || state.saving;
  const text = { color: colors.text, fontSize: 14 };
  const muted = { color: colors.textMuted, fontSize: 13 };
  return <>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingVertical: 20, paddingBottom: 150, gap: 20 }}>
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Switch accessibilityLabel="Weekly schedule" accessibilityHint="Repeats weekly in Dubai time. Turning off restores account-wide automation, not a pause." disabled={blocked} value={state.value.enabled} onValueChange={enabled => state.change({ enabled })} trackColor={{ false: colors.border, true: colors.textMuted }} /><Text style={text}>Weekly schedule</Text></View>
          <Button colors={colors} primary disabled={blocked || !state.dirty} onPress={state.save}>{state.saving ? "Saving…" : state.saved ? "Saved" : "Save"}</Button>
        </View>
        {state.loadError ? <><Text selectable style={text}>{state.loadError.message}</Text><Button colors={colors} onPress={state.retry}>Retry</Button></> : null}
        {state.error ? <Text selectable accessibilityRole="alert" style={text}>{state.error.message}</Text> : null}
        {state.loading ? <Text accessibilityLiveRegion="polite" style={muted}>Loading…</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator snapToInterval={cardWidth + 12} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {SCHEDULE_DAYS.map(name => <View key={name} style={{ width: cardWidth, minHeight: 360, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.bgCard, gap: 18 }}>
          <Text style={{ ...text, fontWeight: "700", fontSize: 18 }}>{name}</Text>
          <View style={{ flex: 1, gap: 10 }}>
            {state.value.days[name].map(building => <View key={building} style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingLeft: 12, gap: 6 }}><Text selectable style={{ ...text, flex: 1 }}>{building}</Text><Button colors={colors} accessibilityLabel={`Remove ${building} from ${name}`} disabled={blocked} onPress={() => state.toggleBuilding(name, building)} style={{ borderWidth: 0, width: 44 }}>×</Button></View>)}
            {!state.value.days[name].length ? <Text style={{ ...muted, marginVertical: 70, textAlign: "center" }}>No sends</Text> : null}
          </View>
          <Button colors={colors} icon="plus" disabled={blocked} accessibilityLabel={`Add buildings to ${name}`} onPress={() => { setSearch(""); setChoosingSource(!spreadsheets.sourceId); setDay(name); }}>Add buildings</Button>
        </View>)}
      </ScrollView>
      <View style={{ marginHorizontal: 20 }}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><Text style={{ ...text, flex: 1 }}>Fill unused slots from other buildings</Text><Switch accessibilityLabel="Fill unused slots from other buildings" accessibilityHint="Uses other buildings when selected buildings run out. Empty days stay off and sending limits still apply." disabled={blocked} value={state.value.fill_unused} onValueChange={fill_unused => state.change({ fill_unused })} trackColor={{ false: colors.border, true: colors.textMuted }} /></View>
      </View>
    </ScrollView>
    <BottomSheet visible={Boolean(day)} onClose={() => setDay(null)} colors={colors}>
      <View style={{ padding: 20, gap: 16 }}>
        <Text style={{ ...text, fontSize: 20, fontWeight: "700" }}>{day} buildings</Text>
        <View style={{ gap: 6 }}><Text style={muted}>Spreadsheet</Text><Button colors={colors} accessibilityLabel="Choose spreadsheet" onPress={() => setChoosingSource(!choosingSource)}>{spreadsheets.sources.find(source => source.id === spreadsheets.sourceId)?.label || "Choose a spreadsheet"}</Button></View>
        {choosingSource ? <FlatList style={{ maxHeight: 330 }} data={spreadsheets.sources} keyExtractor={source => source.id} keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: item.id === spreadsheets.sourceId }} onPress={() => { spreadsheets.setSourceId(item.id); setSearch(""); setChoosingSource(false); }} style={{ paddingVertical: 16, borderBottomWidth: .5, borderColor: colors.border }}><Text style={text}>{item.label}</Text></Pressable>}
          ListEmptyComponent={<Text style={muted}>Import a spreadsheet to choose its buildings.</Text>} /> : <>
          <TextInput accessibilityLabel="Search spreadsheet buildings" placeholder="Search spreadsheet buildings" placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} style={{ ...text, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 }} />
          <FlatList style={{ maxHeight: 330 }} data={state.buildings.filter(name => name.toLowerCase().includes(search.toLowerCase()))} keyExtractor={name => name} keyboardShouldPersistTaps="handled" renderItem={({ item }) => <View style={{ flexDirection: "row", alignItems: "center", minHeight: 52, gap: 12 }}><Text style={{ ...text, flex: 1 }}>{item}</Text><Switch accessibilityLabel={item} disabled={blocked} value={Boolean(day && state.value.days[day].some(name => scheduleBuildingKey(name) === scheduleBuildingKey(item)))} onValueChange={() => state.toggleBuilding(day, item)} trackColor={{ false: colors.border, true: colors.textMuted }} /></View>} ListEmptyComponent={<Text style={muted}>{!spreadsheets.sourceId ? "Choose a spreadsheet to see its buildings." : state.buildings.length ? "No matching buildings." : "This spreadsheet has no sellers with building names yet."}</Text>} />
        </>}
        <Button colors={colors} primary onPress={() => setDay(null)}>Done</Button>
      </View>
    </BottomSheet>
  </>;
}
