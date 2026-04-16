import { useQuery } from "@tanstack/react-query";
import FiltersToolbar from "./components/FiltersToolbar";
import LeadSourcesPanel from "./components/LeadSourcesPanel";
import LeadCard from "./components/LeadCard";
import Pagination from "./components/Pagination";
import StickyActionBar from "./components/StickyActionBar";
import ViewTabs from "./components/ViewTabs";
import { useSellerSignalPage } from "./useSellerSignalPage";
import { getBuildingKeyVariants } from "./lead-utils";

async function fetchBuildingImages({ signal }) {
  const response = await fetch("/data/building-images.json", { signal });
  if (!response.ok) return {};
  return response.json();
}

export default function SellerSignalDashboard({ userId }) {
  const dashboard = useSellerSignalPage(userId);
  const buildingImagesQuery = useQuery({
    queryKey: ["seller-signal", "building-images"],
    queryFn: fetchBuildingImages,
    staleTime: 10 * 60 * 1000,
  });
  const buildingImages = buildingImagesQuery.data || {};

  if (dashboard.loading) {
    return (
      <div className="page">
        <div className="lead-list" aria-busy="true" aria-label="Loading sellers">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="skeleton-card" key={index}>
              <div className="skeleton-card-row">
                <div className="skeleton-avatar" />
                <div className="skeleton-stack">
                  <div className="skeleton-bar tall medium" />
                  <div className="skeleton-bar short" />
                </div>
                <div className="skeleton-bar pill" />
              </div>
              <div className="skeleton-bar long" />
            </div>
          ))}
        </div>
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

      {dashboard.notice && <div className="notice">{dashboard.notice}</div>}
      {dashboard.error && <div className="error">{dashboard.error}</div>}

      <LeadSourcesPanel
        sources={dashboard.leadSources}
        leadCounts={dashboard.sourceCounts}
        importingSourceId={dashboard.importingSourceId}
        onImport={dashboard.actions.importFromSheet}
        onSourceChange={dashboard.actions.updateLeadSourceField}
        onSourceSave={dashboard.actions.persistLeadSource}
        legacySheetUrl={dashboard.legacySheetUrl}
        importingLegacy={dashboard.importingLegacy}
        onLegacyUrlChange={dashboard.actions.updateLegacySheetUrl}
        onLegacyImport={dashboard.actions.importLegacySheet}
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

      {dashboard.refreshing && dashboard.hasLeads ? (
        <div className="refreshing-strip" role="status" aria-live="polite">
          <span className="refreshing-dot" />
          Refreshing seller data...
        </div>
      ) : null}

      {dashboard.hasLeads ? (
        <>
          <p className="count-text">{dashboard.filteredLeads.length} leads</p>

          <div className="lead-list">
            {dashboard.pagedLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                buildingImageUrl={(() => {
                  if (!lead.sourceId) return undefined;
                  const match = getBuildingKeyVariants(lead.building).find((key) => buildingImages[key]);
                  return match ? buildingImages[match] : undefined;
                })()}
                copiedLeadId={dashboard.copiedLeadId}
                editDraft={dashboard.editingLeadId === lead.id ? dashboard.editingLeadDraft : null}
                insight={dashboard.insights[lead.id]}
                isDeleting={dashboard.deletingLeadId === lead.id}
                isEditing={dashboard.editingLeadId === lead.id}
                isExpanded={Boolean(dashboard.expandedLeads[lead.id])}
                isSaving={dashboard.savingLeadId === lead.id}
                isSent={Boolean(dashboard.sentLeads[lead.id])}
                lead={lead}
                onCancelEditing={dashboard.actions.cancelEditingLead}
                onCopyMessage={dashboard.actions.copyMessage}
                onDelete={dashboard.actions.deleteLead}
                onEditFieldChange={dashboard.actions.updateLeadDraftField}
                onSaveEdit={dashboard.actions.saveLeadEdits}
                onStartEditing={dashboard.actions.startEditingLead}
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
