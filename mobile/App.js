import "react-native-url-polyfill/auto";
import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearSubscriptionClient,
  configureSubscriptionClient,
  fetchSubscriptionOfferings,
  getSubscriptionVerificationWarning,
  getSubscriptionStoreLabel,
  hasSubscriptionAccess,
  isPurchaseCancelledError,
  openSubscriptionCustomerCenter,
  purchaseSubscriptionPackage,
  restoreSubscriptionPurchases,
  subscribeToSubscriptionUpdates,
} from "./src/subscriptions";
import { useThemePreference } from "./src/hooks/useThemePreference";
import AuthScreen from "./src/screens/AuthScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ListingAlertsScreen from "./src/screens/ListingAlertsScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SpreadsheetScreen from "./src/screens/SpreadsheetScreen";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";
import UsernameSetupScreen from "./src/screens/UsernameSetupScreen";
import { supabase } from "./src/supabase";
import { getTheme } from "./src/theme";

const ONBOARDING_KEY = "@seller_signal_onboarding_completed_v2";
const INITIAL_SUBSCRIPTION_STATE = {
  currentOffering: null,
  customerInfo: null,
  error: null,
  initialized: false,
  managePending: false,
  message: null,
  productOptions: [],
  purchasePending: false,
  restorePending: false,
  statusLoading: false,
};

export default function App() {
  const [session, setSession] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [gateState, setGateState] = useState({
    hydrated: false,
    onboardingCompleted: false,
  });
  const [subscriptionState, setSubscriptionState] = useState(INITIAL_SUBSCRIPTION_STATE);
  const [displayNameOverride, setDisplayNameOverride] = useState({
    userId: null,
    value: "",
  });
  const [screen, setScreen] = useState("home");
  const [theme, setTheme] = useThemePreference();
  const colors = getTheme(theme);
  const sessionUserId = session?.user.id ?? null;
  const metadataDisplayName = session?.user.user_metadata?.username?.trim() || "";
  const displayName = metadataDisplayName
    || (displayNameOverride.userId === sessionUserId ? displayNameOverride.value : "");

  useEffect(() => {
    let isActive = true;

    async function bootstrapApp() {
      const [storedFlags, sessionResult] = await Promise.all([
        AsyncStorage.multiGet([ONBOARDING_KEY]),
        supabase.auth.getSession(),
      ]);

      if (!isActive) return;

      const [[, onboardingValue]] = storedFlags;

      setGateState({
        hydrated: true,
        onboardingCompleted: onboardingValue === "true",
      });
      setSession(sessionResult.data.session);
      setLoading(false);
    }

    void bootstrapApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    let unsubscribeFromCustomerInfo = () => {};

    async function syncSubscriptionState() {
      if (!sessionUserId) {
        await clearSubscriptionClient();
        if (!ignore) {
          setSubscriptionState({ ...INITIAL_SUBSCRIPTION_STATE, initialized: true });
        }
        return;
      }

      setSubscriptionState((currentState) => ({
        ...currentState,
        error: null,
        statusLoading: true,
      }));

      try {
        const customerInfo = await configureSubscriptionClient({
          userId: sessionUserId,
          email: session?.user.email ?? null,
          displayName: metadataDisplayName || null,
        });

        unsubscribeFromCustomerInfo = subscribeToSubscriptionUpdates((nextCustomerInfo) => {
          if (ignore) return;

          const verificationWarning = getSubscriptionVerificationWarning(nextCustomerInfo);

          setSubscriptionState((currentState) => ({
            ...currentState,
            customerInfo: nextCustomerInfo,
            error: verificationWarning || currentState.error,
          }));
        });

        let currentOffering = null;
        let productOptions = [];
        let offeringError = null;

        try {
          const offeringData = await fetchSubscriptionOfferings();
          currentOffering = offeringData.currentOffering;
          productOptions = offeringData.productOptions;
        } catch (offeringLoadError) {
          offeringError = offeringLoadError instanceof Error
            ? offeringLoadError.message
            : "Could not load subscription plans";
        }

        if (ignore) return;

        const verificationWarning = getSubscriptionVerificationWarning(customerInfo);

        setSubscriptionState((currentState) => ({
          ...currentState,
          currentOffering,
          customerInfo,
          error: verificationWarning || offeringError,
          initialized: true,
          productOptions,
          statusLoading: false,
        }));
      } catch (error) {
        if (ignore) return;

        setSubscriptionState((currentState) => ({
          ...currentState,
          currentOffering: null,
          customerInfo: null,
          error: error instanceof Error ? error.message : "Could not load subscription status",
          initialized: true,
          productOptions: [],
          statusLoading: false,
        }));
      }
    }

    void syncSubscriptionState();

    return () => {
      ignore = true;
      unsubscribeFromCustomerInfo();
    };
  }, [metadataDisplayName, session?.user.email, sessionUserId]);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const inMainApp = Boolean(session)
        && gateState.hydrated
        && gateState.onboardingCompleted
        && hasSubscriptionAccess(subscriptionState.customerInfo);

      if (!inMainApp) return false;
      if (screen === "home") return false;

      setScreen("home");
      return true;
    });

    return () => {
      backSubscription.remove();
    };
  }, [
    gateState.hydrated,
    gateState.onboardingCompleted,
    screen,
    session,
    subscriptionState.customerInfo,
  ]);

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  async function handleOnboardingComplete() {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setGateState((currentState) => ({ ...currentState, onboardingCompleted: true }));
  }

  async function handleStartSubscriptionPurchase() {
    setSubscriptionState((currentState) => ({
      ...currentState,
      error: null,
      message: null,
      purchasePending: true,
    }));

    try {
      const monthlyProductOption = subscriptionState.productOptions[0];
      const customerInfo = await purchaseSubscriptionPackage(
        monthlyProductOption?.subscriptionPackage || null,
      );
      const verificationWarning = getSubscriptionVerificationWarning(customerInfo);

      setSubscriptionState((currentState) => ({
        ...currentState,
        customerInfo,
        error: verificationWarning,
        initialized: true,
        message: hasSubscriptionAccess(customerInfo)
          ? "seller signal Pro unlocked."
          : "Purchase completed.",
        purchasePending: false,
      }));
    } catch (error) {
      const cancelledByUser = isPurchaseCancelledError(error);

      setSubscriptionState((currentState) => ({
        ...currentState,
        error: cancelledByUser
          ? null
          : error instanceof Error
          ? error.message
          : "Could not complete the monthly purchase",
        message: cancelledByUser ? "Purchase cancelled." : currentState.message,
        purchasePending: false,
      }));
    }
  }

  async function handleRestorePurchases() {
    setSubscriptionState((currentState) => ({
      ...currentState,
      error: null,
      message: null,
      restorePending: true,
    }));

    try {
      const customerInfo = await restoreSubscriptionPurchases();
      const verificationWarning = getSubscriptionVerificationWarning(customerInfo);

      setSubscriptionState((currentState) => ({
        ...currentState,
        customerInfo,
        error: verificationWarning,
        initialized: true,
        message: hasSubscriptionAccess(customerInfo)
          ? "Purchases restored. Access unlocked."
          : "No active subscription was found to restore.",
        restorePending: false,
      }));
    } catch (error) {
      setSubscriptionState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : "Could not restore purchases",
        restorePending: false,
      }));
    }
  }

  async function handleOpenCustomerCenter() {
    setSubscriptionState((currentState) => ({
      ...currentState,
      error: null,
      managePending: true,
    }));

    try {
      await openSubscriptionCustomerCenter({
        onRestoreCompleted: ({ customerInfo }) => {
          const verificationWarning = getSubscriptionVerificationWarning(customerInfo);

          setSubscriptionState((currentState) => ({
            ...currentState,
            customerInfo,
            error: verificationWarning,
            message: hasSubscriptionAccess(customerInfo)
              ? "Purchases restored from Customer Center."
              : "Customer Center restore completed, but no active entitlement was found.",
          }));
        },
        onRestoreFailed: ({ error }) => {
          setSubscriptionState((currentState) => ({
            ...currentState,
            error: error?.message || "Could not restore purchases from Customer Center.",
          }));
        },
      });
    } catch (error) {
      setSubscriptionState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : "Could not open Customer Center",
      }));
    } finally {
      setSubscriptionState((currentState) => ({
        ...currentState,
        managePending: false,
      }));
    }
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
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  // TODO: Re-enable paywall once App Store products are configured
  if (false && !hasSubscriptionAccess(subscriptionState.customerInfo)) {
    return (
      <SafeAreaProvider>
        <SubscriptionScreen
          onRestorePurchases={handleRestorePurchases}
          onStartPurchase={handleStartSubscriptionPurchase}
          purchaseAvailable={Boolean(subscriptionState.productOptions[0]?.subscriptionPackage)}
          productOptions={subscriptionState.productOptions}
          purchasePending={subscriptionState.purchasePending}
          restorePending={subscriptionState.restorePending}
          storeLabel={getSubscriptionStoreLabel()}
          subscriptionError={subscriptionState.error}
          subscriptionLoading={!subscriptionState.initialized || subscriptionState.statusLoading}
          subscriptionMessage={subscriptionState.message}
        />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  const goHome = () => setScreen("home");

  let activeScreen;
  if (screen === "dashboard") {
    activeScreen = (
      <DashboardScreen
        onBack={goHome}
        theme={theme}
        userId={session.user.id}
      />
    );
  } else if (screen === "spreadsheet") {
    activeScreen = (
      <SpreadsheetScreen
        onBack={goHome}
        theme={theme}
        userId={session.user.id}
      />
    );
  } else if (screen === "settings") {
    activeScreen = (
      <SettingsScreen
        displayName={displayName}
        manageSubscriptionPending={subscriptionState.managePending}
        onBack={goHome}
        onManageSubscription={handleOpenCustomerCenter}
        onToggleTheme={toggleTheme}
        subscriptionStoreLabel={getSubscriptionStoreLabel()}
        theme={theme}
      />
    );
  } else if (screen === "alerts") {
    activeScreen = <ListingAlertsScreen onBack={goHome} theme={theme} />;
  } else {
    activeScreen = (
      <HomeScreen
        theme={theme}
        onOpenDashboard={() => setScreen("dashboard")}
        onOpenSpreadsheet={() => setScreen("spreadsheet")}
        onOpenSettings={() => setScreen("settings")}
        onOpenAlerts={() => setScreen("alerts")}
        userId={session.user.id}
      />
    );
  }

  return (
    <SafeAreaProvider>
      {activeScreen}
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
