import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Svg, Circle, Line, Path } from "react-native-svg";

export default function AppSearchBar({ colors, value, onChangeText, onClear, inputRef, clearLabel = "Clear search", style, ...inputProps }) {
  return (
    <View style={[styles.container, { backgroundColor: colors.isDark ? "#171717" : "#ffffff" }, style]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
        <Line x1="21" y1="21" x2="16.65" y2="16.65" />
      </Svg>
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
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="10" fill={colors.textFaint} />
            <Path d="m9 9 6 6m0-6-6 6" stroke={colors.bgCard} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 27, paddingHorizontal: 20, height: 54 },
  input: { flex: 1, fontSize: 18, fontWeight: "800", paddingVertical: 0 },
});
