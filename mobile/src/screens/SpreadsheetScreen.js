import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Circle, Line, Path } from "react-native-svg";
import { useSellerSignalPage } from "../features/seller-signal/useSellerSignalPage";
import { getTheme } from "../theme";

function BackIcon({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="19" y1="12" x2="5" y2="12" />
      <Path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}

function LinkIcon({ color }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <Path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </Svg>
  );
}

function CheckIcon({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

function SourceRow({ colors, count, importing, onImport, onSave, onUpdateField, saving, source, isLast }) {
  const name = source.building_name || "";
  const hasUrl = Boolean(source.sheet_url);

  return (
    <View style={[rowStyles.container, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={rowStyles.nameRow}>
        <TextInput
          style={[rowStyles.nameInput, { color: colors.textName }]}
          placeholder="Building name"
          placeholderTextColor={colors.textFaint}
          value={name}
          onChangeText={(value) => onUpdateField(source.id, "building_name", value)}
        />
        <Text style={[rowStyles.count, { color: colors.textMuted }]}>
          {count} {count === 1 ? "lead" : "leads"}
        </Text>
      </View>

      <View style={rowStyles.urlRow}>
        <LinkIcon color={hasUrl ? colors.textMuted : colors.textFaint} />
        <TextInput
          style={[rowStyles.urlInput, { color: colors.text }]}
          placeholder="Google Sheet URL"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="url"
          value={source.sheet_url || ""}
          onChangeText={(value) => onUpdateField(source.id, "sheet_url", value)}
        />
      </View>

      <View style={rowStyles.actions}>
        <Pressable
          style={({ pressed }) => [rowStyles.saveBtn, { borderColor: colors.border, opacity: saving ? 0.5 : pressed ? 0.8 : 1 }]}
          disabled={saving}
          onPress={() => onSave(source.id)}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <CheckIcon color={colors.textMuted} />
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            rowStyles.importBtn,
            { backgroundColor: colors.btnPrimaryBg, opacity: !hasUrl || importing ? 0.4 : pressed ? 0.8 : 1 },
          ]}
          disabled={!hasUrl || importing}
          onPress={() => onImport(source.id)}
        >
          {importing ? (
            <ActivityIndicator size="small" color={colors.btnPrimaryText} />
          ) : (
            <Text style={[rowStyles.importBtnText, { color: colors.btnPrimaryText }]}>Import</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    gap: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    padding: 0,
  },
  count: {
    fontSize: 13,
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  importBtn: {
    flex: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  importBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default function SpreadsheetScreen({ onBack, theme, userId }) {
  const d = useSellerSignalPage(userId);
  const colors = getTheme(theme);
  const styles = createStyles(colors);
  const totalLeads = Object.values(d.sourceCounts || {}).reduce((sum, count) => sum + count, 0);

  if (d.loading && !d.leadSources.length) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12}>
          <BackIcon color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Spreadsheets</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryCount}>{totalLeads}</Text>
          <Text style={styles.summaryLabel}>leads across {d.leadSources.length} {d.leadSources.length === 1 ? "source" : "sources"}</Text>
        </View>

        <View style={styles.sourceList}>
          {d.leadSources.map((source, index) => (
            <SourceRow
              key={source.id}
              colors={colors}
              count={d.sourceCounts[source.id] || 0}
              importing={d.importingSourceId === source.id}
              isLast={index === d.leadSources.length - 1}
              onImport={d.actions.importFromSheet}
              onSave={d.actions.persistLeadSource}
              onUpdateField={d.actions.updateLeadSourceField}
              saving={d.savingSourceId === source.id}
              source={source}
            />
          ))}
        </View>

        {d.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{d.error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: c.textName,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 6,
      paddingVertical: 16,
    },
    summaryCount: {
      fontSize: 24,
      fontWeight: "700",
      color: c.textName,
    },
    summaryLabel: {
      fontSize: 15,
      color: c.textMuted,
    },
    sourceList: {
      // no gap — dividers are handled per-row
    },
    errorBox: {
      marginTop: 12,
      backgroundColor: c.errorBg,
      borderRadius: 10,
      padding: 12,
    },
    errorText: { color: c.errorText, fontSize: 13 },
  });
