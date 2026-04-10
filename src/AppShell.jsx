import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import AppSidebar from "./features/seller-signal/components/AppSidebar";
import SellerSignalDashboard from "./features/seller-signal/SellerSignalDashboard";
import ListingAlertsPage from "./features/listing-alerts/components/ListingAlertsPage";
import { useThemePreference } from "./hooks/useThemePreference";

const VALID_PAGES = new Set(["sellers", "listing-alerts"]);

function readPageFromHash() {
  if (typeof window === "undefined") return "sellers";
  const hash = window.location.hash.replace(/^#\/?/, "");
  return VALID_PAGES.has(hash) ? hash : "sellers";
}

export default function AppShell({ displayName, userId }) {
  const [theme, setTheme] = useThemePreference();
  const [currentPage, setCurrentPage] = useState(readPageFromHash);

  useEffect(() => {
    function onHashChange() {
      setCurrentPage(readPageFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function handleNavigate(pageId) {
    if (!VALID_PAGES.has(pageId)) return;
    if (window.location.hash !== `#/${pageId}`) {
      window.location.hash = `/${pageId}`;
    }
    setCurrentPage(pageId);
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }

  return (
    <div className="app-shell">
      <AppSidebar
        currentPage={currentPage}
        displayName={displayName}
        onNavigate={handleNavigate}
        onSignOut={() => supabase.auth.signOut()}
        onToggleTheme={toggleTheme}
        theme={theme}
      />

      {currentPage === "sellers" ? (
        <SellerSignalDashboard userId={userId} />
      ) : (
        <ListingAlertsPage />
      )}
    </div>
  );
}
