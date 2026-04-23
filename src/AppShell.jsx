import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import AppSidebar from "./features/seller-signal/components/AppSidebar";
import SellerSignalDashboard from "./features/seller-signal/SellerSignalDashboard";
import ListingAlertsPage from "./features/listing-alerts/components/ListingAlertsPage";
import SpreadsheetsPage from "./features/seller-signal/components/SpreadsheetsPage";
import HomePage from "./features/home/HomePage";
import CreateNewModal from "./features/home/CreateNewModal";
import { fetchUserLeads, fetchLeadInsights } from "./features/seller-signal/services";
import { useAutoSheetSync } from "./features/seller-signal/useAutoSheetSync";

const VALID_PAGES = new Set(["home", "sellers", "listing-alerts", "spreadsheets"]);

const PAGE_LABELS = {
  home: "Home",
  sellers: "Sellers",
  "listing-alerts": "Listings",
  spreadsheets: "Spreadsheets",
};

const PAGE_ACCENTS = {
  sellers: "indigo",
  "listing-alerts": "rose",
  spreadsheets: "emerald",
};

function PageIcon({ page }) {
  if (page === "sellers") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (page === "listing-alerts") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function readPageFromHash() {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace(/^#\/?/, "");
  return VALID_PAGES.has(hash) ? hash : "home";
}

export default function AppShell({ displayName, userId }) {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(readPageFromHash);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    function onHashChange() {
      setCurrentPage(readPageFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function prefetchSellerData() {
      await queryClient.prefetchQuery({
        queryKey: ["seller-signal", "leads", userId],
        queryFn: () => fetchUserLeads(userId),
        staleTime: 30 * 1000,
      });

      const data = queryClient.getQueryData(["seller-signal", "leads", userId]);
      const leads = data?.leads || [];
      const targets = leads.filter((lead) => lead.building).map((lead) => ({
        id: lead.id,
        name: lead.name || "",
        building: lead.building || "",
      }));

      if (!targets.length) return;

      const targetKeys = targets.map((lead) => `${lead.id}:${lead.name}:${lead.building}`);
      queryClient.prefetchQuery({
        queryKey: ["seller-signal", "insights", userId, targetKeys],
        queryFn: () => fetchLeadInsights(targets),
        staleTime: 10 * 60 * 1000,
      });
    }

    void prefetchSellerData();
  }, [queryClient, userId]);

  useAutoSheetSync(userId);

  function handleNavigate(pageId) {
    if (!VALID_PAGES.has(pageId)) return;
    if (window.location.hash !== `#/${pageId}`) {
      window.location.hash = `/${pageId}`;
    }
    setCurrentPage(pageId);
    setSidebarCollapsed(true);
  }

  function handleSidebarAction(actionId) {
    if (actionId === "new") {
      setCreateOpen(true);
      setSidebarCollapsed(true);
    }
  }

  function handleCreateSelect(optionId) {
    setCreateOpen(false);
    if (optionId === "seller") {
      handleNavigate("sellers");
    } else if (optionId === "listing-search") {
      handleNavigate("listing-alerts");
    } else if (optionId === "spreadsheet" || optionId === "import") {
      handleNavigate("spreadsheets");
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar
        currentPage={currentPage}
        displayName={displayName}
        onNavigate={handleNavigate}
        onAction={handleSidebarAction}
        onSignOut={() => supabase.auth.signOut()}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />

      {createOpen && (
        <CreateNewModal
          onClose={() => setCreateOpen(false)}
          onSelect={handleCreateSelect}
        />
      )}

      <div className={`app-main${!sidebarCollapsed ? " app-main-dimmed" : ""}`}>
        {sidebarCollapsed && (
          <header className={`app-topbar${scrolled ? " app-topbar-scrolled" : ""}`}>
            <button
              type="button"
              className="app-topbar-toggle"
              aria-label="Open navigation"
              onClick={() => setSidebarCollapsed(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>

            <nav className="app-topbar-crumbs" aria-label="Breadcrumb">
              <button
                type="button"
                className="app-crumb-home"
                aria-label="Home"
                onClick={() => handleNavigate("home")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5 9.5V21h14V9.5" />
                  <path d="M10 21v-6h4v6" />
                </svg>
              </button>

              {currentPage === "home" ? (
                <span className="app-crumb-label">Home</span>
              ) : (
                <>
                  <span className="app-crumb-sep">/</span>
                  <span className={`app-crumb-page accent-${PAGE_ACCENTS[currentPage]}`}>
                    <span className="app-crumb-chip">
                      <PageIcon page={currentPage} />
                    </span>
                    <span className="app-crumb-label">{PAGE_LABELS[currentPage]}</span>
                  </span>
                </>
              )}
            </nav>

            <button
              type="button"
              className="app-topbar-more"
              aria-label="More options"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </header>
        )}

        {currentPage === "home" ? (
          <HomePage displayName={displayName} onNavigate={handleNavigate} />
        ) : currentPage === "sellers" ? (
          <SellerSignalDashboard userId={userId} />
        ) : currentPage === "spreadsheets" ? (
          <SpreadsheetsPage userId={userId} />
        ) : (
          <ListingAlertsPage />
        )}

        {!sidebarCollapsed && (
          <button
            type="button"
            className="app-main-scrim"
            aria-label="Close navigation"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
      </div>
    </div>
  );
}
