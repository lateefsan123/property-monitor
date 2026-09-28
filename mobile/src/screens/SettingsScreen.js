import AppIcon from "../components/AppIcon";
import { SettingsGroup, SettingsItem, SettingsProfile, SettingsToggle, settingsBackground } from "../components/SettingsLayout";
import { Alert, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../supabase";
import { getTheme } from "../theme";

const PRIVACY_URL = "https://repeatai.org/privacy";
const TERMS_URL = "https://repeatai.org/terms";
const DATA_DELETION_URL = "https://repeatai.org/data-deletion";

export default function SettingsScreen({
  hideAppearance = false, embedded = false, section = "all",
  displayName,
  avatarUrl,
  onEditProfile,
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
    <SafeAreaView style={s.page} edges={embedded ? [] : ["top", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {!embedded && <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" style={s.backBtn} onPress={onBack} hitSlop={12}>
          <AppIcon name="back" size={24} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={s.backBtn} />
      </View>}

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {section !== "support" && <>
          <SettingsProfile displayName={displayName} avatarUrl={avatarUrl} colors={colors} onPress={onEditProfile} />
          <SettingsGroup title="Account" colors={colors}>
            {onEditProfile ? <SettingsItem icon="person" label="Edit profile" onPress={onEditProfile} colors={colors} last={!onManageSubscription} /> : null}
            {onManageSubscription ? <SettingsItem icon="card" label="Manage subscription" value={manageSubscriptionPending ? "Opening..." : subscriptionStoreLabel} disabled={manageSubscriptionPending} onPress={onManageSubscription} colors={colors} last /> : null}
          </SettingsGroup>
          {!hideAppearance && <SettingsGroup title="Preferences" colors={colors}>
            <SettingsItem icon="moon" label="Dark mode" colors={colors} last>
              <SettingsToggle colors={colors} accessibilityLabel="Dark mode" value={isDark} onValueChange={onToggleTheme} />
            </SettingsItem>
          </SettingsGroup>}
        </>}
        {section !== "account" && <>
          <SettingsGroup title="Legal" colors={colors}>
            <SettingsItem icon="document" label="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)} colors={colors} />
            <SettingsItem icon="document" label="Terms of service" onPress={() => Linking.openURL(TERMS_URL)} colors={colors} />
            <SettingsItem icon="document" label="Data deletion help" onPress={() => Linking.openURL(DATA_DELETION_URL)} colors={colors} last />
          </SettingsGroup>
        </>}
        {section !== "support" && <SettingsGroup colors={colors}>
          <SettingsItem icon="logout" label="Sign out" destructive onPress={handleSignOut} colors={colors} />
          <SettingsItem icon="trash" label="Delete account" destructive onPress={handleDeleteAccount} colors={colors} last />
        </SettingsGroup>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: settingsBackground(c) },
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
