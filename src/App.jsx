import "./App.css";
import AppShell from "./AppShell";
import { useSellerSignalRealtime } from "./features/seller-signal/useSellerSignalRealtime";

function App({ session }) {
  const displayName = session.user.user_metadata?.username?.trim() || "";
  useSellerSignalRealtime(session.user.id);

  return <AppShell displayName={displayName} userId={session.user.id} />;
}

export default App;
