import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Circle, Line, Path, Polyline } from "react-native-svg";
import { supabase } from "../supabase";
import { getTheme } from "../theme";

function BackIcon({ color }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="19" y1="12" x2="5" y2="12" />
      <Path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}

function PersonIcon({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

function MoonIcon({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}

function CreditCardIcon({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9z" />
      <Path d="M3 10h18" />
      <Path d="M7 15h4" />
    </Svg>
  );
}

function LogOutIcon({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Polyline points="16 17 21 12 16 7" />
      <Line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  );
}

function TrashIcon({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="3 6 5 6 21 6" />
      <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
  );
}

function ChevronRight({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="9 18 15 12 9 6" />
    </Svg>
  );
}

function Row({ icon, label, labelColor, value, rightElement, onPress, isLast, colors }) {
  const s = rowStyles(colors);
  const IconComponent = icon;
  const content = (
    <View style={s.rowInner}>
      <View style={s.rowLeft}>
        <View style={s.iconWrap}>
          <IconComponent color={labelColor || colors.text} />
        </View>
        <Text style={[s.label, labelColor && { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={s.rowRight}>
        {value ? (
          <Text style={s.value} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {rightElement}
      </View>
    </View>
  );

  return (
    <View>
      {onPress ? (
        <Pressable
          style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.bgHover }]}
          onPress={onPress}
        >
          {content}
        </Pressable>
      ) : (
        <View style={s.row}>{content}</View>
      )}
      {!isLast && <View style={[s.separator, { backgroundColor: colors.border }]} />}
    </View>
  );
}

export default function SettingsScreen({
  displayName,
  manageSubscriptionPending = false,
  onBack,
  onManageSubscription,
  onToggleTheme,
  subscriptionStoreLabel = "",
  theme,
}) {
  const colors = getTheme(theme);
  const s = styles(colors);
  const isDark = theme === "dark";

  function handleSignOut() {
    Alert.alert("Sign out?", "You will be signed out of your current account.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.rpc("delete_user");
              if (error) {
                Alert.alert("Error", error.message);
                return;
              }
              await supabase.auth.signOut();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to delete account");
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={s.page} edges={["top", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onBack} hitSlop={12}>
          <BackIcon color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        <Row
          icon={PersonIcon}
          label="Profile"
          value={displayName || "-"}
          colors={colors}
        />
        <Row
          icon={MoonIcon}
          label="Dark mode"
          rightElement={
            <Switch
              value={isDark}
              onValueChange={onToggleTheme}
              trackColor={{ false: colors.border, true: colors.tabActiveBg }}
              thumbColor="#fff"
            />
          }
          colors={colors}
        />
        {onManageSubscription ? (
          <Row
            icon={CreditCardIcon}
            label="Manage subscription"
            value={manageSubscriptionPending ? "Opening..." : subscriptionStoreLabel}
            rightElement={<ChevronRight color={colors.textFaint} />}
            onPress={onManageSubscription}
            colors={colors}
          />
        ) : null}
        <Row
          icon={LogOutIcon}
          label="Sign out"
          labelColor={colors.errorText}
          rightElement={<ChevronRight color={colors.textFaint} />}
          onPress={handleSignOut}
          colors={colors}
        />
        <Row
          icon={TrashIcon}
          label="Delete account"
          labelColor={colors.errorText}
          rightElement={<ChevronRight color={colors.textFaint} />}
          onPress={handleDeleteAccount}
          isLast
          colors={colors}
        />
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
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "600",
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 40,
    },
  });

const rowStyles = (c) =>
  StyleSheet.create({
    row: {
      paddingVertical: 14,
    },
    rowInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.bgBadge,
    },
    label: {
      fontSize: 16,
      color: c.text,
      fontWeight: "500",
      flexShrink: 1,
    },
    rowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginLeft: 12,
    },
    value: {
      fontSize: 15,
      color: c.textMuted,
      maxWidth: 180,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 48,
    },
  });
