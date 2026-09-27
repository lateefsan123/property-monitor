import AppIcon from "../components/AppIcon";
import { Alert, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../supabase";
import { getTheme } from "../theme";

const PRIVACY_URL = "https://repeatai.org/privacy";
const TERMS_URL = "https://repeatai.org/terms";
const DATA_DELETION_URL = "https://repeatai.org/data-deletion";

function BackIcon({ color }) {
  return (
    <AppIcon name="back" size={24} color={color} />
  );
}

function PersonIcon({ color }) {
  return (
    <AppIcon name="person" size={20} color={color} />
  );
}

function MoonIcon({ color }) {
  return (
    <AppIcon name="moon" size={20} color={color} />
  );
}

function CreditCardIcon({ color }) {
  return (
    <AppIcon name="card" size={20} color={color} />
  );
}

function ReplayIcon({ color }) {
  return (
    <AppIcon name="refresh" size={20} color={color} />
  );
}

function DocumentIcon({ color }) {
  return (
    <AppIcon name="document" size={20} color={color} />
  );
}

function LogOutIcon({ color }) {
  return (
    <AppIcon name="logout" size={20} color={color} />
  );
}

function TrashIcon({ color }) {
  return (
    <AppIcon name="trash" size={20} color={color} />
  );
}

function ChevronRight({ color }) {
  return (
    <AppIcon name="chevron" size={20} color={color} />
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
  hideAppearance = false, embedded = false,
  displayName,
  manageSubscriptionPending = false,
  onBack,
  onManageSubscription,
  onReplayOnboarding,
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
    <SafeAreaView style={s.page} edges={embedded ? [] : ["top", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {!embedded && <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onBack} hitSlop={12}>
          <BackIcon color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={s.backBtn} />
      </View>}

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        <Row
          icon={PersonIcon}
          label="Profile"
          value={displayName || "-"}
          colors={colors}
        />
        {!hideAppearance && <Row
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
        />}
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
          icon={ReplayIcon}
          label="Replay onboarding"
          rightElement={<ChevronRight color={colors.textFaint} />}
          onPress={onReplayOnboarding}
          colors={colors}
        />
        <Row
          icon={DocumentIcon}
          label="Privacy policy"
          rightElement={<ChevronRight color={colors.textFaint} />}
          onPress={() => Linking.openURL(PRIVACY_URL)}
          colors={colors}
        />
        <Row
          icon={DocumentIcon}
          label="Terms of service"
          rightElement={<ChevronRight color={colors.textFaint} />}
          onPress={() => Linking.openURL(TERMS_URL)}
          colors={colors}
        />
        <Row
          icon={DocumentIcon}
          label="Data deletion help"
          rightElement={<ChevronRight color={colors.textFaint} />}
          onPress={() => Linking.openURL(DATA_DELETION_URL)}
          colors={colors}
        />
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
