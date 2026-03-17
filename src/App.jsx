import "./App.css";
import SellerSignalDashboard from "./features/seller-signal/SellerSignalDashboard";
import UsernameSetup from "./features/seller-signal/components/UsernameSetup";
import { useThemePreference } from "./hooks/useThemePreference";

function App({ session }) {
  const [theme, setTheme] = useThemePreference();
  const displayName = session.user.user_metadata?.username;

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }

  if (!displayName) {
    return <UsernameSetup theme={theme} />;
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
