import "./App.css";
import AppShell from "./AppShell";
import { useSellerSignalRealtime } from "./features/seller-signal/useSellerSignalRealtime";

function App({ session, subscription }) {
  const displayName = session.user.user_metadata?.username?.trim() || "";
  useSellerSignalRealtime(session.user.id);

  return (
    <AppShell
      displayName={displayName}
      subscription={subscription}
      userId={session.user.id}
    />
  );
}

export default App;
