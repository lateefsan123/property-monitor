import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import AppTopNav from "./components/AppTopNav";
import FiltersToolbar from "./components/FiltersToolbar";
import ImportPanel from "./components/ImportPanel";
import LeadImportEmptyState from "./components/LeadImportEmptyState";
import LeadCard from "./components/LeadCard";
import Pagination from "./components/Pagination";
import StickyActionBar from "./components/StickyActionBar";
import ViewTabs from "./components/ViewTabs";
import { useSellerSignalPage } from "./useSellerSignalPage";
import { normalizeToken } from "./spreadsheet";

export default function SellerSignalDashboard({
  displayName,
  onToggleTheme,
  theme,
  userId,
}) {
  const dashboard = useSellerSignalPage(userId);
  const [buildingImages, setBuildingImages] = useState({});

  useEffect(() => {
    fetch("/data/building-images.json")
      .then((res) => res.json())
      .then(setBuildingImages)
      .catch(() => {});
  }, []);

  if (dashboard.loading) {
    return (
      <div className="page">
        <div className="empty">Loading sellers...</div>
      </div>
    );
  }

  return (
    <>
      <AppTopNav
        displayName={displayName}
        onSignOut={() => supabase.auth.signOut()}
        onToggleImport={dashboard.actions.toggleImportPanel}
        onToggleTheme={onToggleTheme}
        showImport={dashboard.showImport}
        theme={theme}
      />

      <div className="page">
        {dashboard.hasLeads ? (
          <>
            <ViewTabs
              activeCount={dashboard.activeLeads.length}
              doneCount={dashboard.doneLeads.length}
              onChange={dashboard.actions.selectViewTab}
              value={dashboard.viewTab}
            />

            {dashboard.error && <div className="error">{dashboard.error}</div>}

            <FiltersToolbar
              dataFilter={dashboard.dataFilter}
              isAllExpanded={dashboard.isAllExpanded}
              onDataFilterChange={dashboard.actions.selectDataFilter}
              onSearchTermChange={dashboard.actions.updateSearchTerm}
              onStatusFilterChange={dashboard.actions.selectStatusFilter}
              onToggleAllExpanded={dashboard.actions.toggleAllExpanded}
              onToggleDueOnly={dashboard.actions.setDueOnly}
              searchTerm={dashboard.searchTerm}
              showDueOnly={dashboard.showDueOnly}
              statusFilter={dashboard.statusFilter}
            />

            {dashboard.showImport && (
              <ImportPanel
                importing={dashboard.importing}
                onImport={dashboard.actions.importFromSheet}
                onSheetUrlChange={dashboard.actions.updateSheetUrl}
                sheetUrl={dashboard.sheetUrl}
              />
            )}

            <p className="count-text">{dashboard.filteredLeads.length} leads</p>

            <div className="lead-list">
              {dashboard.pagedLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  buildingImageUrl={buildingImages[normalizeToken(lead.building)]}
                  copiedLeadId={dashboard.copiedLeadId}
                  insight={dashboard.insights[lead.id]}
                  isExpanded={Boolean(dashboard.expandedLeads[lead.id])}
                  isSent={Boolean(dashboard.sentLeads[lead.id])}
                  lead={lead}
                  onCopyMessage={dashboard.actions.copyMessage}
                  onToggleExpanded={dashboard.actions.toggleLeadExpanded}
                  onToggleSent={dashboard.actions.toggleSent}
                />
              ))}
            </div>

            <Pagination
              currentPage={dashboard.safePage}
              onNext={dashboard.actions.goToNextPage}
              onPrevious={dashboard.actions.goToPreviousPage}
              totalPages={dashboard.totalPages}
            />

            <StickyActionBar 
              onSendAll={dashboard.actions.bulkWhatsApp}
              canSendAll={dashboard.sendAllCount > 0}
              sendAllCount={dashboard.sendAllCount}
            />
          </>
        ) : (
          <LeadImportEmptyState
            error={dashboard.error}
            importing={dashboard.importing}
            onImport={dashboard.actions.importFromSheet}
            onSheetUrlChange={dashboard.actions.updateSheetUrl}
            sheetUrl={dashboard.sheetUrl}
          />
        )}
      </div>
    </>
  );
}
