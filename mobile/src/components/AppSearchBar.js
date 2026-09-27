import AppIcon from "./AppIcon";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

export default function AppSearchBar({ colors, value, onChangeText, onClear, inputRef, clearLabel = "Clear search", style, ...inputProps }) {
  return (
    <View style={[styles.container, { backgroundColor: colors.isDark ? "#171717" : "#ffffff" }, style]}>
      <AppIcon name="search" size={20} color={colors.textFaint} />
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text }]}
        placeholderTextColor={colors.textFaint}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel={clearLabel} hitSlop={8} onPress={onClear || (() => onChangeText(""))}>
          <AppIcon name="closeCircle" size={18} color={colors.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 27, paddingHorizontal: 20, height: 54 },
  input: { flex: 1, fontSize: 18, fontWeight: "800", paddingVertical: 0 },
});
