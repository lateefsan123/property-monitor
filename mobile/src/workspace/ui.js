import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import AppIcon from "../components/AppIcon";

export const Icon = AppIcon;
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
