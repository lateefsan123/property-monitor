import { useEffect, useState } from "react";
import {
  IconBuildingEstate,
  IconHome,
  IconMenu2,
  IconTable,
  IconUsers,
} from "@tabler/icons-react";
import { supabase } from "./supabase";
import AppSidebar from "./features/seller-signal/components/AppSidebar";
import SellerSignalDashboard from "./features/seller-signal/SellerSignalDashboard";
import ListingAlertsPage from "./features/listing-alerts/components/ListingAlertsPage";
import SpreadsheetsPage from "./features/seller-signal/components/SpreadsheetsPage";
import HomePage from "./features/home/HomePage";
import CreateNewModal from "./features/home/CreateNewModal";
import MessageTemplatesPanel from "./features/seller-signal/components/MessageTemplatesPanel";
import { useSellerSignalMessageTemplates } from "./features/seller-signal/useSellerSignalMessageTemplates";
import ThemeToggleButton from "./components/ThemeToggleButton";
import { useAutoSheetSync } from "./features/seller-signal/useAutoSheetSync";

const VALID_PAGES = new Set(["home", "sellers", "listing-alerts", "spreadsheets"]);
const THEME_STORAGE_KEY = "property:theme";

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
    return <IconUsers size={14} stroke={2} aria-hidden="true" />;
  }
  if (page === "listing-alerts") {
    return <IconBuildingEstate size={14} stroke={2} aria-hidden="true" />;
  }
  return <IconTable size={14} stroke={2} aria-hidden="true" />;
}

function readPageFromHash() {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace(/^#\/?/, "");
  return VALID_PAGES.has(hash) ? hash : "home";
}

function readInitialTheme() {
  if (typeof window === "undefined") return "light";

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  } catch {
    // Ignore storage issues and continue with a runtime fallback.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function MessageTemplatesModal({ onClose, userId }) {
  const messageTemplates = useSellerSignalMessageTemplates(userId);

  return (
    <MessageTemplatesPanel
      key={messageTemplates.loading ? "loading" : messageTemplates.activeTemplate?.id || "ready"}
      loading={messageTemplates.loading}
      onClose={onClose}
      onDelete={messageTemplates.deleteTemplate}
      onSave={messageTemplates.saveTemplate}
      onSetDefault={messageTemplates.setDefaultTemplate}
      saving={messageTemplates.saving}
      templates={messageTemplates.templates}
    />
  );
}

export default function AppShell({ displayName, userId }) {
  const [currentPage, setCurrentPage] = useState(readPageFromHash);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [messageTemplatesOpen, setMessageTemplatesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(readInitialTheme);

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
    const root = document.documentElement;
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");

    root.style.colorScheme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures and keep the theme in memory.
    }
  }, [theme]);

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
    } else if (actionId === "settings") {
      setSettingsOpen(true);
      setSidebarCollapsed(true);
      if (currentPage !== "sellers") handleNavigate("sellers");
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
    } else if (optionId === "message-template") {
      setMessageTemplatesOpen(true);
    }
  }

  function handleToggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return (
    <div className="app-shell">
      <AppSidebar
        currentPage={currentPage}
        displayName={displayName}
        userId={userId}
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

      {messageTemplatesOpen && (
        <MessageTemplatesModal
          onClose={() => setMessageTemplatesOpen(false)}
          userId={userId}
        />
      )}

      <div className="app-main">
        <header className={`app-topbar${scrolled ? " app-topbar-scrolled" : ""}`}>
          <button
            type="button"
            className="app-topbar-toggle"
            aria-label={sidebarCollapsed ? "Open navigation" : "Close navigation"}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            <IconMenu2 size={20} stroke={2} aria-hidden="true" />
          </button>

          <nav className="app-topbar-crumbs" aria-label="Breadcrumb">
            <button
              type="button"
              className="app-crumb-home"
              aria-label="Home"
              onClick={() => handleNavigate("home")}
            >
              <IconHome size={18} stroke={1.8} aria-hidden="true" />
            </button>

            {currentPage === "home" ? (
              <span className="app-crumb-label">Home</span>
            ) : (
              <>
                <span className="app-crumb-sep">/</span>
                <button
                  type="button"
                  className={`app-crumb-page app-crumb-btn accent-${PAGE_ACCENTS[currentPage]}`}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("app-crumb-click", { detail: currentPage }));
                  }}
                >
                  <PageIcon page={currentPage} />
                  <span className="app-crumb-label">{PAGE_LABELS[currentPage]}</span>
                </button>
                <div id="app-topbar-crumb-extra" className="app-topbar-crumb-extra" />
              </>
            )}
          </nav>

          <div className="app-topbar-actions">
            <div id="app-topbar-actions" className="app-topbar-actions-slot" />
            <ThemeToggleButton theme={theme} onToggle={handleToggleTheme} />
          </div>
        </header>

        {currentPage === "home" ? (
          <HomePage
            displayName={displayName}
            onNavigate={handleNavigate}
            userId={userId}
            onOpenCreate={() => setCreateOpen(true)}
          />
        ) : currentPage === "sellers" ? (
          <SellerSignalDashboard
            userId={userId}
            settingsOpen={settingsOpen}
            onCloseSettings={() => setSettingsOpen(false)}
          />
        ) : currentPage === "spreadsheets" ? (
          <SpreadsheetsPage userId={userId} />
        ) : (
          <ListingAlertsPage />
        )}
      </div>
    </div>
  );
}
