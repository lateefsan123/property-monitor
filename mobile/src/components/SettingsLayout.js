import { Image, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import AppIcon from "./AppIcon";

export function settingsBackground(colors) {
  return colors.bg;
}

export function SettingsToggle({ colors, value, ...props }) {
  const thumbColor = value && colors.isDark ? "#222222" : "#ffffff";
  return <Switch {...props} value={value}
    trackColor={{ false: colors.border, true: colors.isDark ? "#e0e0e0" : "#222222" }}
    thumbColor={thumbColor}
    ios_backgroundColor={colors.border}
    {...(Platform.OS === "web" ? { activeThumbColor: thumbColor } : {})}
  />;
}

export function SettingsGroup({ title, colors, children }) {
  return <View style={styles.section}>
    {title ? <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>{title}</Text> : null}
    <View style={[styles.group, { backgroundColor: colors.bgCard }]}>{children}</View>
  </View>;
}

export function SettingsItem({ label, icon, colors, onPress, children, value, last = false, destructive = false, disabled = false }) {
  const content = <>
    <AppIcon name={icon} size={21} color={destructive ? colors.errorText : colors.text} />
    <View style={[styles.rowContent, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: destructive ? colors.errorText : colors.text }]}>{label}</Text>
      {value ? <Text numberOfLines={1} style={[styles.value, { color: colors.textMuted }]}>{value}</Text> : null}
      {children || (onPress ? <AppIcon name="chevron" size={17} color={colors.textFaint} /> : null)}
    </View>
  </>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.row, { opacity: disabled ? 0.5 : pressed ? 0.55 : 1 }]}>{content}</Pressable> : <View style={styles.row}>{content}</View>;
}

export function SettingsProfile({ displayName, avatarUrl, colors, onPress }) {
  const name = displayName?.trim() || "Your account";
  const initials = name.split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("").toUpperCase();
  const content = <>
    <View style={[styles.avatar, { backgroundColor: colors.bgBadge }]}>
      {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatar} accessibilityLabel="Profile photo" /> : <Text style={[styles.initials, { color: colors.text }]}>{initials}</Text>}
    </View>
    <View style={{ flex: 1, gap: 5 }}>
      <Text numberOfLines={2} style={[styles.name, { color: colors.text }]}>{name}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{onPress ? "Manage your account" : "Repeat AI account"}</Text>
    </View>
    {onPress ? <AppIcon name="chevron" size={18} color={colors.textMuted} /> : null}
  </>;
  const style = [styles.profile, { backgroundColor: colors.bgCard }];
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`Manage account for ${name}`} onPress={onPress} style={({ pressed }) => [...style, { opacity: pressed ? 0.65 : 1 }]}>{content}</Pressable> : <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 25 },
  heading: { fontSize: 14, fontWeight: "600", marginBottom: 10, marginLeft: 4 },
  group: { borderRadius: 18, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingLeft: 16, gap: 13 },
  rowContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 55, paddingVertical: 13, paddingRight: 16 },
  label: { flex: 1, fontSize: 15, lineHeight: 21 },
  value: { maxWidth: "38%", fontSize: 13 },
  profile: { flexDirection: "row", alignItems: "center", gap: 13, padding: 16, minHeight: 88, borderRadius: 14, marginTop: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 17, fontWeight: "600" },
  name: { fontSize: 17, fontWeight: "600" },
  subtitle: { fontSize: 13, lineHeight: 18 },
});
