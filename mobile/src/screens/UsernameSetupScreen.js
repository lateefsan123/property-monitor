import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../supabase";
import { getTheme } from "../theme";

export default function UsernameSetupScreen({ onComplete, theme }) {
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const colors = getTheme(theme);

  async function handleSubmit() {
    const trimmed = username.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ data: { username: trimmed } });
    if (updateError) {
      setError(updateError.message);
    } else {
      onComplete?.(trimmed);
    }

    setSaving(false);
  }

  const s = styles(colors);

  return (
    <View style={s.page}>
      <View style={s.card}>
        <Text style={s.title}>Seller Signal</Text>
        <Text style={s.subtitle}>Choose a display name to get started</Text>

        {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

        <TextInput
          style={s.input}
          placeholder="Username"
          placeholderTextColor={colors.textFaint}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Pressable
          style={[s.btnPrimary, saving && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.btnPrimaryText} />
          ) : (
            <Text style={s.btnPrimaryText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: c.bg,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    card: { width: "100%", maxWidth: 360, gap: 12 },
    title: { fontSize: 24, fontWeight: "700", color: c.textName, textAlign: "center", marginBottom: 4 },
    subtitle: { fontSize: 14, color: c.textMuted, textAlign: "center", marginBottom: 8 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      backgroundColor: c.bgInput,
      color: c.text,
    },
    btnPrimary: {
      backgroundColor: c.btnPrimaryBg,
      borderRadius: 8,
      padding: 14,
      alignItems: "center",
    },
    btnDisabled: { opacity: 0.5 },
    btnPrimaryText: { color: c.btnPrimaryText, fontWeight: "600", fontSize: 15 },
    errorBox: {
      backgroundColor: c.errorBg,
      borderWidth: 1,
      borderColor: c.errorBorder,
      borderRadius: 8,
      padding: 10,
    },
    errorText: { color: c.errorText, fontSize: 13 },
  });
