import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../supabase";

export default function ResetPasswordScreen({ onComplete }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function handleSubmit() {
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated.");
    setTimeout(() => onComplete?.(), 600);
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topArea}>
        <Text style={s.title}>Choose a new password</Text>

        <View style={s.formInputs}>
          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
          {message && (
            <View style={s.successBox}>
              <Text style={s.successText}>{message}</Text>
            </View>
          )}

          <View style={s.inputContainer}>
            <Text style={s.inputLabel}>New password</Text>
            <TextInput
              style={s.inputField}
              placeholder="••••••••"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={s.inputContainer}>
            <Text style={s.inputLabel}>Confirm new password</Text>
            <TextInput
              style={s.inputField}
              placeholder="••••••••"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.bottomActionContainer}
      >
        <Pressable
          style={({ pressed }) => [s.continueBtn, pressed && s.btnPressed, loading && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#aaa" />
          ) : (
            <Text style={s.continueBtnText}>Update password</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
  },
  topArea: {
    paddingHorizontal: 24,
    paddingTop: 56,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 32,
  },
  formInputs: {
    width: "100%",
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    position: "relative",
  },
  inputLabel: {
    position: "absolute",
    top: -10,
    left: 12,
    backgroundColor: "#111",
    paddingHorizontal: 6,
    color: "#ccc",
    fontSize: 12,
    fontWeight: "600",
  },
  inputField: {
    color: "#fff",
    fontSize: 16,
  },
  errorBox: {
    backgroundColor: "rgba(255,50,50,0.2)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,50,50,0.4)",
  },
  errorText: { color: "#ff8888", fontSize: 13, textAlign: "center" },
  successBox: {
    backgroundColor: "rgba(50,255,50,0.2)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(50,255,50,0.4)",
  },
  successText: { color: "#88ff88", fontSize: 13, textAlign: "center" },
  bottomActionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    width: "100%",
  },
  continueBtn: {
    backgroundColor: "#2A2A2A",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: {
    color: "#999",
    fontSize: 16,
    fontWeight: "600",
  },
  btnPressed: { opacity: 0.8 },
  btnDisabled: { opacity: 0.5 },
});
