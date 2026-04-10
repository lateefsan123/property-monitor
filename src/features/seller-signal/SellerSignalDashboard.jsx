import { useEffect, useState } from "react";
import FiltersToolbar from "./components/FiltersToolbar";
import LeadSourcesPanel from "./components/LeadSourcesPanel";
import LeadCard from "./components/LeadCard";
import Pagination from "./components/Pagination";
import StickyActionBar from "./components/StickyActionBar";
import ViewTabs from "./components/ViewTabs";
import { useSellerSignalPage } from "./useSellerSignalPage";
import { getBuildingKeyVariants } from "./lead-utils";

export default function SellerSignalDashboard({ userId }) {
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
    <div className="page">
      <ViewTabs
        activeCount={dashboard.activeLeads.length}
        doneCount={dashboard.doneLeads.length}
        onChange={dashboard.actions.selectViewTab}
        value={dashboard.viewTab}
      />

      {dashboard.error && <div className="error">{dashboard.error}</div>}

      <LeadSourcesPanel
        sources={dashboard.leadSources}
        leadCounts={dashboard.sourceCounts}
        importingSourceId={dashboard.importingSourceId}
        onImport={dashboard.actions.importFromSheet}
        onSourceChange={dashboard.actions.updateLeadSourceField}
        onSourceSave={dashboard.actions.persistLeadSource}
      />

      <FiltersToolbar
        dataFilter={dashboard.dataFilter}
        isAllExpanded={dashboard.isAllExpanded}
        onDataFilterChange={dashboard.actions.selectDataFilter}
        onSearchTermChange={dashboard.actions.updateSearchTerm}
        onSourceFilterChange={dashboard.actions.selectSourceFilter}
        onStatusFilterChange={dashboard.actions.selectStatusFilter}
        onToggleAllExpanded={dashboard.actions.toggleAllExpanded}
        onToggleDueOnly={dashboard.actions.setDueOnly}
        searchTerm={dashboard.searchTerm}
        showDueOnly={dashboard.showDueOnly}
        sourceFilter={dashboard.sourceFilter}
        sourceOptions={dashboard.sourceOptions}
        statusFilter={dashboard.statusFilter}
      />

      {dashboard.hasLeads ? (
        <>
          <p className="count-text">{dashboard.filteredLeads.length} leads</p>

          <div className="lead-list">
            {dashboard.pagedLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                buildingImageUrl={(() => {
                  const match = getBuildingKeyVariants(lead.building).find((key) => buildingImages[key]);
                  return match ? buildingImages[match] : undefined;
                })()}
                copiedLeadId={dashboard.copiedLeadId}
                insight={dashboard.insights[lead.id]}
                isExpanded={Boolean(dashboard.expandedLeads[lead.id])}
                isSent={Boolean(dashboard.sentLeads[lead.id])}
                lead={lead}
                onCopyMessage={dashboard.actions.copyMessage}
                onToggleExpanded={dashboard.actions.toggleLeadExpanded}
                onToggleSent={dashboard.actions.toggleSent}
                onUpdateStatus={dashboard.actions.updateLeadStatus}
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
        <div className="empty">No sellers yet. Import a spreadsheet above to get started.</div>
      )}
    </div>
  );
}
