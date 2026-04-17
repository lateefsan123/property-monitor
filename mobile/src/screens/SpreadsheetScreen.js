import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Line, Path } from "react-native-svg";
import { TEMPLATE_CSV_HEADERS } from "../features/seller-signal/constants";
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

function isPlaceholderSourceLabel(source) {
  const label = String(source?.label || "").trim();
  return Boolean(label) && /^Spreadsheet\s+\d+$/i.test(label);
}

function getSourceName(source) {
  const buildingName = String(source?.building_name || "").trim();
  const label = String(source?.label || "").trim();
  if (buildingName && (!label || isPlaceholderSourceLabel(source))) return buildingName;
  return label || buildingName || "";
}

function SourceRow({ colors, count, clearing, importing, onClear, onImport, onSave, onUpdateField, saving, source, isLast }) {
  const name = getSourceName(source);
  const hasUrl = Boolean(source.sheet_url);

  function confirmClear() {
    const label = name || "this source";
    Alert.alert(
      "Remove spreadsheet",
      `Remove "${label}"? This will delete ${count} lead${count === 1 ? "" : "s"} and remove the spreadsheet from the list.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onClear(source.id) },
      ],
    );
  }

  return (
    <View style={[rowStyles.container, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={rowStyles.nameRow}>
        <TextInput
          style={[rowStyles.nameInput, { color: colors.textName }]}
          placeholder="Spreadsheet name"
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

        <Pressable
          style={({ pressed }) => [
            rowStyles.clearBtn,
            { borderColor: colors.errorBorder || "#d00", opacity: clearing ? 0.4 : pressed ? 0.8 : 1 },
          ]}
          disabled={clearing}
          onPress={confirmClear}
        >
          {clearing ? (
            <ActivityIndicator size="small" color={colors.errorText || "#d00"} />
          ) : (
            <Text style={[rowStyles.clearBtnText, { color: colors.errorText || "#d00" }]}>Remove</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function LegacySourceCard({ colors, count, importing, legacySheetUrl, onImport, onUpdateUrl }) {
  return (
    <View style={[s.sourceCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={s.sourceHeader}>
        <Text style={[s.sourceTitle, { color: colors.textName }]}>Legacy spreadsheet</Text>
        <Text style={[s.sourceMeta, { color: colors.textMuted }]}>{count} leads</Text>
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Google Sheet URL</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
          placeholder="https://docs.google.com/..."
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="url"
          value={legacySheetUrl}
          onChangeText={onUpdateUrl}
        />
      </View>

      <Text style={[s.cardHelper, { color: colors.textMuted }]}>
        Import replaces the sellers owned by this spreadsheet.
      </Text>

      <Pressable
        style={({ pressed }) => [
          s.primaryBtn,
          { backgroundColor: colors.btnPrimaryBg, opacity: !legacySheetUrl || importing ? 0.5 : pressed ? 0.8 : 1 },
        ]}
        disabled={!legacySheetUrl || importing}
        onPress={onImport}
      >
        {importing ? (
          <ActivityIndicator size="small" color={colors.btnPrimaryText} />
        ) : (
          <Text style={[s.primaryBtnText, { color: colors.btnPrimaryText }]}>Import Legacy</Text>
        )}
      </Pressable>
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
  clearBtn: {
    borderWidth: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

const HELP_STEPS = [
  "In Google Sheets, tap Share → \"Anyone with the link\" (Viewer). The app can't read private sheets.",
  "Your sheet should have columns for name, building, phone, unit, bedroom, status, and last contact. Order doesn't matter — the app auto-detects them.",
  "Tap Add Spreadsheet, give it a name, and paste the full Google Sheet URL from your browser.",
  "Tap the check to save, then Import to pull leads in. Only new rows are added — re-importing won't create duplicates.",
  "Saved sheets auto-sync every 5 minutes while the app is open. New rows in Sheets become leads automatically.",
];

async function downloadTemplate() {
  const path = `${FileSystem.cacheDirectory}seller-signal-template.csv`;
  await FileSystem.writeAsStringAsync(path, TEMPLATE_CSV_HEADERS);
  await Sharing.shareAsync(path, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
}

export default function SpreadsheetScreen({ onBack, theme, userId }) {
  const d = useSellerSignalPage(userId);
  const colors = getTheme(theme);
  const styles = createStyles(colors);
  const [helpOpen, setHelpOpen] = useState(false);
  const totalLeads = Object.values(d.sourceCounts || {}).reduce((sum, count) => sum + count, 0);
  const legacyCount = d.sourceCounts?.legacy || 0;
  const hasLegacyData = legacyCount > 0 || Boolean(d.legacySheetUrl);
  const showLegacyCard = hasLegacyData;
  const hasNamedSources = d.leadSources.length > 0;

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
          <Text style={styles.summaryLabel}>leads across {d.leadSources.length} {d.leadSources.length === 1 ? "source" : "sources"}{hasLegacyData ? " + legacy" : ""}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.helpToggle, pressed && { opacity: 0.7 }]}
          onPress={() => setHelpOpen((previous) => !previous)}
        >
          <Text style={styles.helpToggleText}>How to add a sheet</Text>
          <Text style={styles.helpToggleChevron}>{helpOpen ? "–" : "+"}</Text>
        </Pressable>

        {helpOpen && (
          <View style={styles.helpBox}>
            {HELP_STEPS.map((step, index) => (
              <View key={index} style={styles.helpStepRow}>
                <Text style={styles.helpStepNumber}>{index + 1}.</Text>
                <Text style={styles.helpStepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {d.notice && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{d.notice}</Text>
          </View>
        )}

        {d.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{d.error}</Text>
          </View>
        )}

        <View style={styles.sourceActions}>
          <Pressable
            style={({ pressed }) => [
              styles.addSourceBtn,
              { backgroundColor: colors.btnPrimaryBg, opacity: !d.canAddSource || d.addingSource ? 0.5 : pressed ? 0.82 : 1 },
            ]}
            disabled={!d.canAddSource || d.addingSource}
            onPress={d.actions.addSource}
          >
            {d.addingSource ? (
              <ActivityIndicator size="small" color={colors.btnPrimaryText} />
            ) : (
              <Text style={[styles.addSourceBtnText, { color: colors.btnPrimaryText }]}>Add Spreadsheet</Text>
            )}
          </Pressable>
          {!d.canAddSource && (
            <Text style={[styles.limitText, { color: colors.textFaint }]}>Maximum 10 spreadsheets.</Text>
          )}
        </View>

        {!hasNamedSources && !showLegacyCard ? (
          <View style={[styles.emptyState, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.textName }]}>No spreadsheets yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Add a spreadsheet only when you need it. It will appear here once you create it.
            </Text>
          </View>
        ) : (
          <View style={styles.sourceList}>
            {d.leadSources.map((source, index) => (
              <SourceRow
                key={source.id}
                clearing={d.clearingSourceId === source.id}
                colors={colors}
                count={d.sourceCounts[source.id] || 0}
                importing={d.importingSourceId === source.id}
                isLast={index === d.leadSources.length - 1 && !showLegacyCard}
                onClear={d.actions.clearSource}
                onImport={d.actions.importFromSheet}
                onSave={d.actions.persistLeadSource}
                onUpdateField={d.actions.updateLeadSourceField}
                saving={d.savingSourceId === source.id}
                source={source}
              />
            ))}
            {showLegacyCard && (
              <LegacySourceCard
                colors={colors}
                count={legacyCount}
                importing={d.importingLegacy}
                legacySheetUrl={d.legacySheetUrl || ""}
                onImport={d.actions.importLegacySheet}
                onUpdateUrl={d.actions.updateLegacySheetUrl}
              />
            )}
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Template</Text>
        <Text style={styles.helper}>
          Download a blank CSV with the correct column headers, fill it in, and upload it to Google Sheets.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.templateBtn, pressed && { opacity: 0.75 }]}
          onPress={downloadTemplate}
        >
          <Text style={styles.templateBtnText}>Download Template</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  sourceCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sourceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  sourceTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  sourceMeta: {
    fontSize: 13,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  cardHelper: {
    fontSize: 13,
    lineHeight: 18,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

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
    sourceActions: {
      gap: 8,
      marginTop: 12,
      marginBottom: 8,
    },
    addSourceBtn: {
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    addSourceBtnText: {
      fontSize: 14,
      fontWeight: "700",
    },
    limitText: {
      fontSize: 12,
    },
    emptyState: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderRadius: 16,
      padding: 18,
      gap: 8,
      marginTop: 4,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
    },
    emptyText: {
      fontSize: 13,
      lineHeight: 19,
    },
    sourceList: {
      // no gap — dividers are handled per-row
    },
    helpToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      marginBottom: 4,
    },
    helpToggleText: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textName,
    },
    helpToggleChevron: {
      fontSize: 20,
      color: c.textMuted,
      width: 20,
      textAlign: "center",
    },
    helpBox: {
      paddingVertical: 12,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      marginBottom: 8,
    },
    helpStepRow: {
      flexDirection: "row",
      gap: 8,
    },
    helpStepNumber: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textMuted,
      width: 18,
    },
    helpStepText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: c.textMuted,
    },
    successBox: {
      marginTop: 8,
      backgroundColor: c.badgeOkBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 12,
    },
    successText: { color: c.badgeOkText, fontSize: 13 },
    errorBox: {
      marginTop: 12,
      backgroundColor: c.errorBg,
      borderWidth: 1,
      borderColor: c.errorBorder,
      borderRadius: 10,
      padding: 12,
    },
    errorText: { color: c.errorText, fontSize: 13 },
  });
