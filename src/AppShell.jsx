import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import AppSidebar from "./features/seller-signal/components/AppSidebar";
import SellerSignalDashboard from "./features/seller-signal/SellerSignalDashboard";
import ListingAlertsPage from "./features/listing-alerts/components/ListingAlertsPage";
import SpreadsheetsPage from "./features/seller-signal/components/SpreadsheetsPage";
import { fetchUserLeads, fetchLeadInsights } from "./features/seller-signal/services";

const VALID_PAGES = new Set(["sellers", "listing-alerts", "spreadsheets"]);

const PAGE_LABELS = {
  sellers: "Sellers",
  "listing-alerts": "Listing Alerts",
  spreadsheets: "Spreadsheets",
};

function readPageFromHash() {
  if (typeof window === "undefined") return "sellers";
  const hash = window.location.hash.replace(/^#\/?/, "");
  return VALID_PAGES.has(hash) ? hash : "sellers";
}

export default function AppShell({ displayName, userId }) {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(readPageFromHash);

  useEffect(() => {
    function onHashChange() {
      setCurrentPage(readPageFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
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

  function handleNavigate(pageId) {
    if (!VALID_PAGES.has(pageId)) return;
    if (window.location.hash !== `#/${pageId}`) {
      window.location.hash = `/${pageId}`;
    }
    setCurrentPage(pageId);
  }

  return (
    <div className="app-shell">
      <AppSidebar
        currentPage={currentPage}
        displayName={displayName}
        onNavigate={handleNavigate}
        onSignOut={() => supabase.auth.signOut()}
      />

      <div className="app-main">
        <header className="app-topbar">
          <span className="app-topbar-page">{PAGE_LABELS[currentPage] || "Home"}</span>
        </header>

        {currentPage === "sellers" ? (
          <SellerSignalDashboard userId={userId} />
        ) : currentPage === "spreadsheets" ? (
          <SpreadsheetsPage userId={userId} />
        ) : (
          <ListingAlertsPage />
        )}
      </div>
    </div>
  );
}
