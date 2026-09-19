import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function LeadImportEmptyState({ error, importing, onImport, onSheetUrlChange, sheetUrl, colors }) {
  const s = styles(colors);

  return (
    <View style={s.container}>
      <Text style={s.title}>Import your leads</Text>
      <Text style={s.subtitle}>Paste your Google Sheet to start building your seller pipeline.</Text>

      <View style={s.steps}>
        {["Open your spreadsheet in Google Sheets", 'Make sure it\'s shared (Anyone with the link)', "Copy the URL and paste it below"].map((step, index) => (
          <View key={step} style={s.stepRow}>
            <View style={s.stepNumber}><Text style={s.stepNumberText}>{index + 1}</Text></View>
            <Text style={s.stepText}>{step}</Text>
          </View>
        ))}
      </View>


      <TextInput
        style={s.input}
        placeholder="Paste your Google Sheet URL here..."
        placeholderTextColor={colors.textFaint}
        value={sheetUrl}
        onChangeText={onSheetUrlChange}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Pressable style={[s.btn, importing && s.btnDisabled]} onPress={onImport} disabled={importing || !sheetUrl}>
        {importing ? (
          <ActivityIndicator color={colors.btnPrimaryText} size="small" />
        ) : (
          <Text style={s.btnText}>Import Spreadsheet</Text>
        )}
      </Pressable>

      {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}
    </View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 40,
      gap: 16,
    },
    title: { fontSize: 20, fontWeight: "700", color: c.text },
    subtitle: { fontSize: 14, color: c.textMuted },
    steps: { gap: 12 },
    stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.btnPrimaryBg,
      alignItems: "center",
      justifyContent: "center",
    },
    stepNumberText: { color: c.btnPrimaryText, fontSize: 12, fontWeight: "600" },
    stepText: { fontSize: 14, color: c.textSecondary, flex: 1 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      backgroundColor: c.bgInput,
      color: c.text,
    },
    btn: {
      backgroundColor: c.btnPrimaryBg,
      borderRadius: 8,
      padding: 14,
      alignItems: "center",
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: c.btnPrimaryText, fontWeight: "600", fontSize: 15 },
    errorBox: {
      backgroundColor: c.errorBg,
      borderWidth: 1,
      borderColor: c.errorBorder,
      borderRadius: 8,
      padding: 10,
    },
    errorText: { color: c.errorText, fontSize: 13 },
  });
