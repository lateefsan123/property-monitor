import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function ImportPanel({ importing, onImport, onSheetUrlChange, sheetUrl, colors }) {
  const s = styles(colors);

  return (
    <View style={s.container}>
      <TextInput
        style={s.input}
        placeholder="Paste Google Sheet URL..."
        placeholderTextColor={colors.textFaint}
        value={sheetUrl}
        onChangeText={onSheetUrlChange}
        autoCapitalize="none"
        keyboardType="url"
      />
      <Pressable style={[s.btn, importing && s.btnDisabled]} onPress={onImport} disabled={importing}>
        {importing ? (
          <ActivityIndicator color={colors.btnPrimaryText} size="small" />
        ) : (
          <Text style={s.btnText}>Import</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    container: { flexDirection: "row", gap: 8, alignItems: "center" },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      backgroundColor: c.bgInput,
      color: c.text,
    },
    btn: {
      backgroundColor: c.btnPrimaryBg,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: c.btnPrimaryText, fontWeight: "600", fontSize: 14 },
  });
