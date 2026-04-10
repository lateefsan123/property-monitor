import { useState } from "react";
import "./App.css";
import AppShell from "./AppShell";
import UsernameSetup from "./features/seller-signal/components/UsernameSetup";

function App({ session }) {
  const [displayNameOverride, setDisplayNameOverride] = useState({
    userId: null,
    value: "",
  });
  const displayName = session.user.user_metadata?.username?.trim()
    || (displayNameOverride.userId === session.user.id ? displayNameOverride.value : "");

  if (!displayName) {
    return (
      <UsernameSetup
        onComplete={(value) => setDisplayNameOverride({ userId: session.user.id, value })}
      />
    );
  }

  // Onboarding and Stripe subscription gates are temporarily hidden on web.
  // To restore: re-enable the !onboardingCompleted and !subscriptionAccessGranted checks below.

  return <AppShell displayName={displayName} userId={session.user.id} />;
}

export default App;
