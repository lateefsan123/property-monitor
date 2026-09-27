/* global process */
import "react-native-url-polyfill/auto";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Platform, Alert, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useThemePreference } from "./src/hooks/useThemePreference";
import { useSubscriptionAccess } from "./src/hooks/useSubscriptionAccess";
import WorkspaceShell from './src/workspace/workspace-shell';
import AuthScreen from "./src/screens/AuthScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";
import UsernameSetupScreen from "./src/screens/UsernameSetupScreen";
import { registerForPushNotifications, saveTokenToSupabase } from "./src/notifications";
import { useSellerSignalRealtime } from "./src/features/seller-signal/useSellerSignalRealtime";
import { supabase } from "./src/supabase";
import { getTheme } from "./src/theme";
import { withStartupTimeout } from './src/startup-request';

import { createAccountCacheGuard, mobileQueryDefaults } from "./src/query-cache";

const ONBOARDING_KEY = "@seller_signal_onboarding_completed_v3";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: mobileQueryDefaults,
  },
});

const syncCacheAccount = createAccountCacheGuard(queryClient);

export default function App() {
  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    focusManager.setFocused(AppState.currentState === "active");
    const listener = AppState.addEventListener("change", state => focusManager.setFocused(state === "active"));
    return () => listener.remove();
  }, []);
  const [iconsLoaded, iconError] = useFonts(Ionicons.font);
  if (iconError) throw iconError;
  if (!iconsLoaded) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator accessibilityLabel="Loading app" /></View>;
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}

function AppInner() {
  const [session, setSession] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState(null);
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [gateState, setGateState] = useState({
    hydrated: false,
    onboardingCompleted: false,
  });
  const [displayNameOverride, setDisplayNameOverride] = useState({
    userId: null,
    value: "",
  });
  const [theme, setTheme] = useThemePreference();
  const colors = getTheme(theme);
  const sessionUserId = session?.user.id ?? null;
  useSellerSignalRealtime(sessionUserId);
  const metadataDisplayName = session?.user.user_metadata?.username?.trim() || "";
  const displayName = metadataDisplayName
    || (displayNameOverride.userId === sessionUserId ? displayNameOverride.value : "");
  const subscription = useSubscriptionAccess({
    userId: sessionUserId,
    email: session?.user.email ?? null,
    displayName: displayName || null,
  });

  useEffect(() => {
    let isActive = true;

    async function bootstrapApp() {
      setStartupError(null);
      setLoading(true);
      try {
        const [storedFlags, sessionResult] = await withStartupTimeout(() => Promise.all([
          AsyncStorage.multiGet([ONBOARDING_KEY]),
          supabase.auth.getSession(),
        ]), 'Could not restore your session. Check your connection and try again.');

        if (!isActive) return;
        if (sessionResult.error) throw sessionResult.error;

        const [[, onboardingValue]] = storedFlags;

        setGateState({
          hydrated: true,
          onboardingCompleted: onboardingValue === "true",
        });
        syncCacheAccount(sessionResult.data.session?.user.id);
        setSession(sessionResult.data.session);
        setLoading(false);
      } catch {
        if (isActive) {
          setStartupError('Could not restore your session. Check your connection and try again.');
          setLoading(false);
        }
      }
    }

    void bootstrapApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncCacheAccount(nextSession?.user.id);
      setSession(nextSession);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [startupAttempt]);

  useEffect(() => {
    if (!sessionUserId) return;

    let isActive = true;

    async function syncPushToken() {
      const token = await registerForPushNotifications();
      if (!isActive || !token) return;
      await saveTokenToSupabase(token);
    }

    void syncPushToken();

    return () => {
      isActive = false;
    };
  }, [sessionUserId]);

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  async function handleOnboardingComplete() {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setGateState((currentState) => ({ ...currentState, onboardingCompleted: true }));
  }

  async function handleReplayOnboarding() {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setGateState((currentState) => ({ ...currentState, onboardingCompleted: false }));
  }

  async function handleManageSubscription() {
    try {
      await subscription.manage();
    } catch (error) {
      Alert.alert(
        "Could not open subscription settings",
        error instanceof Error ? error.message : "Check your connection and try again.",
      );
    }
  }

  if (globalThis.__DEV__ && process.env.EXPO_PUBLIC_SUBSCRIPTION_PREVIEW === "true") {
    return (
      <SafeAreaProvider>
        <SubscriptionScreen
          action={null}
          canPurchase
          error={null}
          onPurchase={async () => false}
          onRefresh={async () => {}}
          onRestore={async () => false}
          onSignOut={() => {}}
          priceString="€25.00"
          storeConfigured
          storeLabel="App Store"
          trialEligible
        />
      </SafeAreaProvider>
    );
  }

  if (startupError) {
    return <View style={[styles.loading, { backgroundColor: colors.bg, padding: 32, gap: 20 }]}>
      <Text accessibilityRole="alert" style={{ color: colors.text, textAlign: 'center', fontSize: 16 }}>{startupError}</Text>
      <Pressable accessibilityRole="button" onPress={() => setStartupAttempt((value) => value + 1)} style={{ padding: 16 }}><Text style={{ color: colors.text, fontWeight: '700' }}>Try again</Text></Pressable>
    </View>;
  }

  if (loading || !gateState.hydrated || session === undefined) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.textMuted} />
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <AuthScreen
          theme={theme}
          onPasswordRecovery={() => setIsRecoveringPassword(true)}
        />
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
      </SafeAreaProvider>
    );
  }

  if (isRecoveringPassword) {
    return (
      <SafeAreaProvider>
        <ResetPasswordScreen onComplete={() => setIsRecoveringPassword(false)} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  if (!displayName) {
    return (
      <SafeAreaProvider>
        <UsernameSetupScreen
          onComplete={(value) => setDisplayNameOverride({ userId: session.user.id, value })}
          theme={theme}
        />
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
      </SafeAreaProvider>
    );
  }

  if (!gateState.onboardingCompleted) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen theme={theme} onComplete={handleOnboardingComplete} />
        <StatusBar barStyle="light-content" />
      </SafeAreaProvider>
    );
  }

  if (subscription.isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.textMuted} />
        <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      </View>
    );
  }

  if (!subscription.hasAccess) {
    return (
      <SafeAreaProvider>
        <SubscriptionScreen
          action={subscription.action}
          canPurchase={subscription.canPurchase}
          error={subscription.error}
          onPurchase={subscription.purchase}
          onRefresh={subscription.refresh}
          onRestore={subscription.restore}
          onSignOut={() => supabase.auth.signOut({ scope: "local" })}
          priceString={subscription.priceString}
          storeConfigured={subscription.storeConfigured}
          storeLabel={subscription.storeLabel}
          trialEligible={subscription.trialEligible}
        />
      </SafeAreaProvider>
    );
  }

  return (<SafeAreaProvider>
    <WorkspaceShell key={session.user.id} userId={session.user.id} displayName={displayName} theme={theme} onToggleTheme={toggleTheme}
      avatarUrl={session.user.user_metadata?.avatar_url || ''}
      manageSubscriptionPending={subscription.action === "manage"}
      onManageSubscription={handleManageSubscription}
      onReplayOnboarding={handleReplayOnboarding}
      subscriptionStoreLabel={subscription.storeLabel} />
    <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
  </SafeAreaProvider>);
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
