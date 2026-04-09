import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { DATA_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "../constants";

function FilterTabs({ onChange, options, value, colors }) {
  const s = tabStyles(colors);
  return (
    <View style={s.row}>
      {options.map((option) => (
        <Pressable
          key={option.id}
          style={[s.tab, value === option.id && s.tabActive]}
          onPress={() => onChange(option.id)}
        >
          <Text style={[s.tabText, value === option.id && s.tabTextActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const tabStyles = (c) =>
  StyleSheet.create({
    row: { flexDirection: "row", borderWidth: 1, borderColor: c.border, borderRadius: 8, overflow: "hidden" },
    tab: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: c.bgCard,
      borderRightWidth: 1,
      borderRightColor: c.border,
    },
    tabActive: { backgroundColor: c.tabActiveBg, borderRightColor: c.tabActiveBg },
    tabText: { fontSize: 12, fontWeight: "500", color: c.textTab },
    tabTextActive: { color: c.tabActiveText },
  });

export default function FiltersToolbar({
  dataFilter,
  isAllExpanded,
  onDataFilterChange,
  onSearchTermChange,
  onStatusFilterChange,
  onToggleAllExpanded,
  onToggleDueOnly,
  searchTerm,
  showDueOnly,
  statusFilter,
  colors,
}) {
  const s = styles(colors);

  return (
    <View style={s.container}>
      <TextInput
        style={s.searchInput}
        placeholder="Search..."
        placeholderTextColor={colors.textFaint}
        value={searchTerm}
        onChangeText={onSearchTermChange}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
        <FilterTabs options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={onStatusFilterChange} colors={colors} />
        <FilterTabs options={DATA_FILTER_OPTIONS} value={dataFilter} onChange={onDataFilterChange} colors={colors} />

        <View style={s.toggleRow}>
          <Switch
            value={showDueOnly}
            onValueChange={onToggleDueOnly}
            trackColor={{ false: colors.border, true: colors.tabActiveBg }}
          />
          <Text style={s.toggleLabel}>Due only</Text>
        </View>

        <Pressable style={s.btnSm} onPress={onToggleAllExpanded}>
          <Text style={s.btnSmText}>{isAllExpanded ? "Collapse All" : "Expand All"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    container: { gap: 8 },
    searchInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      backgroundColor: c.bgInput,
      color: c.text,
    },
    filtersRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    toggleLabel: { fontSize: 12, color: c.textMuted },
    btnSm: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      backgroundColor: c.bgCard,
    },
    btnSmText: { fontSize: 12, fontWeight: "600", color: c.textSecondary },
  });
