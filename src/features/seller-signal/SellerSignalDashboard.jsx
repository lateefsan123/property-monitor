import { supabase } from "../../supabase";
import AppTopNav from "./components/AppTopNav";
import DashboardOverview from "./components/DashboardOverview";
import FiltersToolbar from "./components/FiltersToolbar";
import ImportPanel from "./components/ImportPanel";
import LeadCard from "./components/LeadCard";
import OnboardingState from "./components/OnboardingState";
import Pagination from "./components/Pagination";
import ViewTabs from "./components/ViewTabs";
import { useSellerSignalPage } from "./useSellerSignalPage";

export default function SellerSignalDashboard({
  displayName,
  onToggleTheme,
  theme,
  userId,
}) {
  const dashboard = useSellerSignalPage(userId);

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
            <DashboardOverview
              leadsCount={dashboard.marketStats.totalSellers}
              marketStats={dashboard.marketStats}
              onSelectBuilding={dashboard.actions.toggleBuildingSearch}
              searchTerm={dashboard.searchTerm}
              topBuildings={dashboard.topBuildings}
            />

            <h2 className="section-title">Seller Leads</h2>

            <ViewTabs
              activeCount={dashboard.activeLeads.length}
              doneCount={dashboard.doneLeads.length}
              onChange={dashboard.actions.selectViewTab}
              value={dashboard.viewTab}
            />

            {dashboard.error && <div className="error">{dashboard.error}</div>}

            <FiltersToolbar
              canSendAll={dashboard.sendAllCount > 0}
              dataFilter={dashboard.dataFilter}
              isAllExpanded={dashboard.isAllExpanded}
              onDataFilterChange={dashboard.actions.selectDataFilter}
              onSearchTermChange={dashboard.actions.updateSearchTerm}
              onSendAll={dashboard.actions.bulkWhatsApp}
              onStatusFilterChange={dashboard.actions.selectStatusFilter}
              onToggleAllExpanded={dashboard.actions.toggleAllExpanded}
              onToggleDueOnly={dashboard.actions.setDueOnly}
              searchTerm={dashboard.searchTerm}
              sendAllCount={dashboard.sendAllCount}
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
          </>
        ) : (
          <OnboardingState
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
