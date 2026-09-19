import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const paths = {
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
  home: "M3 10l9-7 9 7M5 9v12h5v-7h4v7h5V9",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  pin: "M16 3l5 5-4 1-3 3 1 4-3 3-3-4-6 6 6-6-4-3 3-3 4 1 3-3z",
  plus: "M12 4v16M4 12h16",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87",
  building:
    "M3 21h18M5 21V7l7-4v18M12 9h7v12M8 9v1M8 13v1M8 17v1M15 12h1M15 16h1",
  table: "M3 3h18v18H3zM3 9h18M9 3v18",
  message: "M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M10 2h4l1 3 3-1 2 3-2 3 3 1v4l-3 1 1 3-3 2-3-2-1 3H8l-1-3-3 1-2-3 2-3-3-1v-4l3-1-1-3 3-2 3 2z",
  logout: "M9 3H3v18h6M9 12h12M17 8l4 4-4 4",
  moon: "M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5",
  back: "M19 12H5M11 6l-6 6 6 6",
  filter: "M4 7h16M7 12h10M10 17h4",
  chevron: "M9 5l7 7-7 7",
  star: "M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
};
export function Icon({ name, color = "#64748b", size = 20 }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={paths[name] || paths.table} />
    </Svg>
  );
}
export function Button({
  children,
  onPress,
  colors,
  disabled,
  icon,
  primary,
  style,
  accessibilityLabel,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ||
        (typeof children === "string" ? children : undefined)
      }
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 44,
          paddingHorizontal: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: primary ? colors.btnPrimaryBg : colors.bgCard,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          color={primary ? colors.btnPrimaryText : colors.textMuted}
        />
      )}
      <Text
        style={{
          color: primary ? colors.btnPrimaryText : colors.text,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Card({ children, colors, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.bgCardBorder,
          borderWidth: 1,
          borderRadius: 14,
          padding: 16,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Field({ label, colors, ...props }) {
  return (
    <View style={{ gap: 7 }}>
      <Text
        style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600" }}
      >
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          backgroundColor: colors.bgInput,
          color: colors.text,
          padding: 12,
          minHeight: 44,
          textAlignVertical: "top",
        }}
        {...props}
      />
    </View>
  );
}
export function Feedback({ error, loading, onRetry, colors }) {
  if (loading)
    return (
      <ActivityIndicator
        accessibilityLabel="Loading"
        style={{ margin: 24 }}
        color={colors.textMuted}
      />
    );
  if (!error) return null;
  return (
    <Card colors={colors}>
      <Text selectable style={{ color: colors.errorText }}>
        {error.message || String(error)}
      </Text>
      {onRetry && (
        <Button colors={colors} onPress={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}
