import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
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

function SourceCard({ colors, count, importing, onImport, onSave, onUpdateField, saving, source }) {
  const labelValue = source.building_name || source.label || "";

  return (
    <View style={[s.sourceCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={s.sourceHeader}>
        <Text style={[s.sourceTitle, { color: colors.textName }]}>
          {labelValue || `Spreadsheet ${Number(source.sort_order ?? 0) + 1}`}
        </Text>
        <Text style={[s.sourceMeta, { color: colors.textMuted }]}>{count} leads</Text>
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Building name</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
          placeholder="Boulevard Central 1"
          placeholderTextColor={colors.textFaint}
          value={source.building_name || ""}
          onChangeText={(value) => onUpdateField(source.id, "building_name", value)}
        />
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Google Sheet URL</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
          placeholder="https://docs.google.com/..."
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="url"
          value={source.sheet_url || ""}
          onChangeText={(value) => onUpdateField(source.id, "sheet_url", value)}
        />
      </View>

      <View style={s.cardActions}>
        <Pressable
          style={({ pressed }) => [
            s.secondaryBtn,
            { borderColor: colors.border, opacity: saving ? 0.65 : pressed ? 0.8 : 1 },
          ]}
          disabled={saving}
          onPress={() => onSave(source.id)}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={[s.secondaryBtnText, { color: colors.textSecondary }]}>Save</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            s.primaryBtn,
            { backgroundColor: colors.btnPrimaryBg, opacity: !source.sheet_url || importing ? 0.5 : pressed ? 0.8 : 1 },
          ]}
          disabled={!source.sheet_url || importing}
          onPress={() => onImport(source.id)}
        >
          {importing ? (
            <ActivityIndicator size="small" color={colors.btnPrimaryText} />
          ) : (
            <Text style={[s.primaryBtnText, { color: colors.btnPrimaryText }]}>Import</Text>
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
        Importing legacy replaces only leads that are not attached to a named source.
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

export default function SpreadsheetScreen({ onBack, theme, userId }) {
  const d = useSellerSignalPage(userId);
  const colors = getTheme(theme);
  const styles = createStyles(colors);
  const totalLeads = Object.values(d.sourceCounts || {}).reduce((sum, count) => sum + count, 0);
  const legacyCount = d.sourceCounts?.legacy || 0;
  const hasLegacyData = legacyCount > 0 || Boolean(d.legacySheetUrl);
  const showLegacyCard = true;

  async function downloadTemplate() {
    const path = `${FileSystem.cacheDirectory}seller-signal-template.csv`;
    await FileSystem.writeAsStringAsync(path, TEMPLATE_CSV_HEADERS);
    await Sharing.shareAsync(path, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });
  }

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
          <Text style={styles.summaryTitle}>
            {d.leadSources.length} source{d.leadSources.length === 1 ? "" : "s"}{hasLegacyData ? " + legacy" : ""}
          </Text>
          <Text style={styles.summaryMeta}>{totalLeads} leads</Text>
        </View>
        <Text style={styles.helper}>
          Save a building name and public Google Sheet URL for each source. Importing a source replaces only that source's leads.
        </Text>

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

        <View style={styles.sourceList}>
          {d.leadSources.map((source) => (
            <SourceCard
              key={source.id}
              colors={colors}
              count={d.sourceCounts[source.id] || 0}
              importing={d.importingSourceId === source.id}
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
      padding: 20,
      gap: 12,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: c.textName,
    },
    summaryMeta: {
      fontSize: 14,
      color: c.textMuted,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 8,
    },
    helper: {
      fontSize: 13,
      color: c.textMuted,
      lineHeight: 18,
    },
    sourceList: {
      gap: 12,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginVertical: 12,
    },
    templateBtn: {
      borderWidth: 1,
      borderColor: c.textName,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    templateBtnText: {
      color: c.textName,
      fontWeight: "600",
      fontSize: 14,
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
      marginTop: 8,
      backgroundColor: c.errorBg,
      borderWidth: 1,
      borderColor: c.errorBorder,
      borderRadius: 10,
      padding: 12,
    },
    errorText: { color: c.errorText, fontSize: 13 },
  });
