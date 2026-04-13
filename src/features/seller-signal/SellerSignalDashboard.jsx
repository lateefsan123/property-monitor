import { useQuery } from "@tanstack/react-query";
import FiltersToolbar from "./components/FiltersToolbar";
import LeadCard from "./components/LeadCard";
import LeadModal from "./components/LeadModal";
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
        onChange={dashboard.actions.selectViewTab}
        value={dashboard.viewTab}
      />

      {dashboard.error && <div className="error">{dashboard.error}</div>}

      {dashboard.sourceOptions?.length > 0 && (
        <div className="source-tabs">
          <button
            type="button"
            className={`source-tab${dashboard.sourceFilter === "all" ? " active" : ""}`}
            onClick={() => dashboard.actions.selectSourceFilter("all")}
          >
            All
          </button>
          {dashboard.sourceOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`source-tab${dashboard.sourceFilter === option.id ? " active" : ""}`}
              onClick={() => dashboard.actions.selectSourceFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <FiltersToolbar
        dataFilter={dashboard.dataFilter}
        isAllExpanded={dashboard.isAllExpanded}
        onDataFilterChange={dashboard.actions.selectDataFilter}
        onSearchTermChange={dashboard.actions.updateSearchTerm}
        onStatusFilterChange={dashboard.actions.selectStatusFilter}
        onToggleAllExpanded={dashboard.actions.toggleAllExpanded}
        searchTerm={dashboard.searchTerm}
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

          <div className="lead-table-wrap">
            <table className="lead-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Building</th>
                  <th>Bed</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Phone</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.pagedLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    copiedLeadId={dashboard.copiedLeadId}
                    insight={dashboard.insights[lead.id]}
                    isSent={Boolean(dashboard.sentLeads[lead.id])}
                    lead={lead}
                    onCopyMessage={dashboard.actions.copyMessage}
                    onDelete={dashboard.actions.deleteLead}
                    onToggleExpanded={dashboard.actions.toggleLeadExpanded}
                    onToggleSent={dashboard.actions.toggleSent}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {(() => {
            const modalLead = dashboard.pagedLeads.find((l) => dashboard.expandedLeads[l.id]);
            if (!modalLead) return null;
            return (
              <LeadModal
                copiedLeadId={dashboard.copiedLeadId}
                editDraft={dashboard.editingLeadId === modalLead.id ? dashboard.editingLeadDraft : null}
                insight={dashboard.insights[modalLead.id]}
                isDeleting={dashboard.deletingLeadId === modalLead.id}
                isEditing={dashboard.editingLeadId === modalLead.id}
                isSaving={dashboard.savingLeadId === modalLead.id}
                isSent={Boolean(dashboard.sentLeads[modalLead.id])}
                lead={modalLead}
                onCancelEditing={dashboard.actions.cancelEditingLead}
                onClose={() => dashboard.actions.toggleLeadExpanded(modalLead.id)}
                onCopyMessage={dashboard.actions.copyMessage}
                onDelete={dashboard.actions.deleteLead}
                onEditFieldChange={dashboard.actions.updateLeadDraftField}
                onSaveEdit={dashboard.actions.saveLeadEdits}
                onSaveNotes={dashboard.actions.saveNotes}
                onStartEditing={dashboard.actions.startEditingLead}
                onToggleSent={dashboard.actions.toggleSent}
                onUpdateStatus={dashboard.actions.updateLeadStatus}
              />
            );
          })()}

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
