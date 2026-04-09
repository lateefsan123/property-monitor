import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ViewTabs({ activeCount, doneCount, onChange, value, colors }) {
  const tabs = [
    { id: "active", label: "Active", count: activeCount },
    { id: "done", label: "Done", count: doneCount },
  ];

  const s = styles(colors);

  return (
    <View style={s.row}>
      {tabs.map((tab) => (
        <Pressable key={tab.id} style={[s.tab, value === tab.id && s.tabActive]} onPress={() => onChange(tab.id)}>
          <Text style={[s.tabText, value === tab.id && s.tabTextActive]}>{tab.label}</Text>
          <View style={[s.countBadge, value === tab.id && s.countBadgeActive]}>
            <Text style={[s.countText, value === tab.id && s.countTextActive]}>{tab.count}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: 24, borderBottomWidth: 1, borderBottomColor: c.border },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 2,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
      marginBottom: -1,
    },
    tabActive: { borderBottomColor: c.tabActiveBg },
    tabText: { fontSize: 13, fontWeight: "500", color: c.textMuted },
    tabTextActive: { color: c.text },
    countBadge: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      borderRadius: 10,
      backgroundColor: c.bgBadge,
      alignItems: "center",
      justifyContent: "center",
    },
    countBadgeActive: { backgroundColor: c.tabActiveBg },
    countText: { fontSize: 11, fontWeight: "600", color: c.textBadge },
    countTextActive: { color: c.tabActiveText },
  });
