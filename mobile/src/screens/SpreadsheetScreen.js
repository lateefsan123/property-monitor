import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Line, Path } from "react-native-svg";
import ImportPanel from "../features/seller-signal/components/ImportPanel";
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

export default function SpreadsheetScreen({ onBack, theme, userId }) {
  const d = useSellerSignalPage(userId);
  const colors = getTheme(theme);
  const s = styles(colors);

  async function downloadTemplate() {
    const path = `${FileSystem.cacheDirectory}seller-signal-template.csv`;
    await FileSystem.writeAsStringAsync(path, TEMPLATE_CSV_HEADERS);
    await Sharing.shareAsync(path, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });
  }

  return (
    <SafeAreaView style={s.page} edges={["top"]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onBack} hitSlop={12}>
          <BackIcon color={colors.text} />
        </Pressable>
        <Text style={s.title}>Spreadsheet</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>Import from Google Sheets</Text>
        <Text style={s.helper}>
          Paste the URL of a shared Google Sheet that follows the template. Your leads will be merged in.
        </Text>
        <ImportPanel
          importing={d.importing}
          onImport={d.actions.importFromSheet}
          onSheetUrlChange={d.actions.updateSheetUrl}
          sheetUrl={d.sheetUrl}
          colors={colors}
        />

        <View style={s.divider} />

        <Text style={s.sectionLabel}>Template</Text>
        <Text style={s.helper}>
          Download a blank CSV with the correct column headers, fill it in, and upload it to Google Sheets.
        </Text>
        <Pressable
          style={({ pressed }) => [s.templateBtn, pressed && { opacity: 0.75 }]}
          onPress={downloadTemplate}
        >
          <Text style={s.templateBtnText}>Download Template</Text>
        </Pressable>

        {d.error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{d.error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg },
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
      gap: 10,
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
      marginBottom: 4,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginVertical: 20,
    },
    templateBtn: {
      borderWidth: 1,
      borderColor: c.textName,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
    },
    templateBtnText: {
      color: c.textName,
      fontWeight: "600",
      fontSize: 14,
    },
    errorBox: {
      marginTop: 16,
      backgroundColor: c.errorBg,
      borderRadius: 10,
      padding: 12,
    },
    errorText: { color: c.errorText, fontSize: 13 },
  });
