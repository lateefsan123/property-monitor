import { useState } from "react";
import "./App.css";
import SellerSignalDashboard from "./features/seller-signal/SellerSignalDashboard";
import UsernameSetup from "./features/seller-signal/components/UsernameSetup";
import { useThemePreference } from "./hooks/useThemePreference";

function App({ session }) {
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

  // Onboarding and Stripe subscription gates are temporarily hidden on web.
  // To restore: re-enable the !onboardingCompleted and !subscriptionAccessGranted checks below.

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
