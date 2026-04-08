import { useState } from "react";
import "./App.css";
import OnboardingScreen from "./OnboardingScreen";
import SubscriptionScreen from "./SubscriptionScreen";
import SellerSignalDashboard from "./features/seller-signal/SellerSignalDashboard";
import UsernameSetup from "./features/seller-signal/components/UsernameSetup";
import { useThemePreference } from "./hooks/useThemePreference";

function App({
  billingError,
  billingMessage,
  billingLoading,
  checkoutPending,
  onboardingCompleted,
  onCompleteOnboarding,
  onStartCheckout,
  session,
  subscriptionAccessGranted,
}) {
  const [theme, setTheme] = useThemePreference();
  const [displayNameOverride, setDisplayNameOverride] = useState({
    userId: null,
    value: "",
  });
  const displayName = session.user.user_metadata?.username?.trim()
    || (displayNameOverride.userId === session.user.id ? displayNameOverride.value : "");

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }

  if (!displayName) {
    return (
      <UsernameSetup
        onComplete={(value) => setDisplayNameOverride({ userId: session.user.id, value })}
      />
    );
  }

  if (!onboardingCompleted) {
    return <OnboardingScreen onComplete={onCompleteOnboarding} />;
  }

  if (!subscriptionAccessGranted) {
    return (
      <SubscriptionScreen
        billingError={billingError}
        billingMessage={billingMessage}
        checkoutPending={checkoutPending}
        onStartCheckout={onStartCheckout}
        subscriptionLoading={billingLoading}
      />
    );
  }

  return (
    <SellerSignalDashboard
      displayName={displayName}
      onToggleTheme={toggleTheme}
      theme={theme}
      userId={session.user.id}
    />
  );
}

export default App;
