import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconCheck,
  IconChevronDown,
  IconFileSpreadsheet,
  IconListDetails,
  IconPlus,
} from "@tabler/icons-react";
import AddSellerModal from "./components/AddSellerModal";
import BuildingCleanupPanel from "./components/BuildingCleanupPanel";
import FiltersToolbar from "./components/FiltersToolbar";
import ImportHealthPanel from "./components/ImportHealthPanel";
import LeadCard from "./components/LeadCard";
import LeadModal from "./components/LeadModal";
import MessageTemplatesPanel from "./components/MessageTemplatesPanel";
import Pagination from "./components/Pagination";
import StickyActionBar from "./components/StickyActionBar";
import SellerSignalSettingsModal from "./components/SellerSignalSettingsModal";
import { useSellerFavorites } from "./useSellerFavorites";
import { useSellerSignalPage } from "./useSellerSignalPage";

function SourceIcon({ id }) {
  return id === "all"
    ? <IconListDetails size={16} stroke={1.9} aria-hidden="true" />
    : <IconFileSpreadsheet size={16} stroke={1.8} aria-hidden="true" />;
}

function SourcePickerMenu({ activeId, options, onSelect }) {
  return (
    <div className="sheet-sort-menu source-picker-menu" role="menu">
      <div className="sheet-sort-menu-label">Spreadsheet source</div>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="menuitemradio"
          aria-checked={activeId === option.id}
          className={`sheet-sort-item source-picker-item${activeId === option.id ? " is-selected" : ""}`}
          onClick={() => onSelect(option.id)}
        >
          <span className="source-picker-item-main">
            <span className="source-tab-icon">
              <SourceIcon id={option.id} />
            </span>
            <span className="source-picker-item-label">{option.label}</span>
          </span>
          {activeId === option.id && <IconCheck size={14} stroke={2.5} aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

export default function SellerSignalDashboard({ userId }) {
  const dashboard = useSellerSignalPage(userId);
  const [addSellerOpen, setAddSellerOpen] = useState(false);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const sourcePickerRef = useRef(null);
  const { favoriteIds, toggleFavorite, pinnedIds, togglePin } = useSellerFavorites();

  const canAddSeller = dashboard.sourceFilter
    && dashboard.sourceFilter !== "all"
    && dashboard.sourceFilter !== "legacy";
  const activeSourceLabel = canAddSeller
    ? (dashboard.sourceOptions?.find((option) => option.id === dashboard.sourceFilter)?.label || "")
    : "";
  const sourcePickerOptions = useMemo(
    () => [{ id: "all", label: "All spreadsheets" }, ...(dashboard.sourceOptions || [])],
    [dashboard.sourceOptions],
  );
  const activeSourceOption = sourcePickerOptions.find((option) => option.id === dashboard.sourceFilter)
    || sourcePickerOptions[0];

  useEffect(() => {
    if (!sourceMenuOpen) return undefined;

    function handleDocClick(event) {
      if (!sourcePickerRef.current?.contains(event.target)) setSourceMenuOpen(false);
    }
    function handleKey(event) {
      if (event.key === "Escape") setSourceMenuOpen(false);
    }

    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [sourceMenuOpen]);

  function selectSource(sourceId) {
    dashboard.actions.selectSourceFilter(sourceId);
    setSourceMenuOpen(false);
  }

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
      {dashboard.notice && <div className="notice">{dashboard.notice}</div>}
      {dashboard.error && <div className="error">{dashboard.error}</div>}
      <ImportHealthPanel
        report={dashboard.lastImportReport}
        onReviewRows={(filter) => dashboard.actions.selectDataQualityFilter(filter)}
      />
      <SellerSignalSettingsModal
        account={dashboard.connectedWhatsAppAccount}
        automationEnabled={dashboard.automation.enabled}
        automationLoading={dashboard.automation.loading}
        automationSaving={dashboard.automation.saving}
        connecting={dashboard.connectingWhatsAppAccount}
        monthlyReportsEnabled={dashboard.automation.monthlyReportsEnabled}
        onConnect={dashboard.actions.connectWhatsAppAccount}
        onAutomationChange={dashboard.automation.setEnabled}
        onMonthlyReportsChange={dashboard.automation.setMonthlyReportsEnabled}
      />
      <MessageTemplatesPanel
        key={dashboard.messageTemplates.loading ? "loading" : dashboard.messageTemplates.activeTemplate?.id || "ready"}
        activeTemplate={dashboard.messageTemplates.activeTemplate}
        loading={dashboard.messageTemplates.loading}
        onDelete={dashboard.messageTemplates.deleteTemplate}
        onSave={dashboard.messageTemplates.saveTemplate}
        onSetDefault={dashboard.messageTemplates.setDefaultTemplate}
        saving={dashboard.messageTemplates.saving}
        templates={dashboard.messageTemplates.templates}
      />

      {dashboard.sourceOptions?.length > 0 && (
        <div className="source-tabs-row">
          <div className="source-picker-wrap" ref={sourcePickerRef}>
            <button
              type="button"
              className={`source-picker-btn${sourceMenuOpen ? " is-open" : ""}`}
              aria-haspopup="menu"
              aria-expanded={sourceMenuOpen}
              onClick={() => setSourceMenuOpen((value) => !value)}
              title={activeSourceOption?.label}
            >
              <span className="source-tab-icon">
                <SourceIcon id={activeSourceOption?.id} />
              </span>
              <span className="source-picker-label">{activeSourceOption?.label}</span>
              <IconChevronDown size={16} stroke={2} aria-hidden="true" />
            </button>
            {sourceMenuOpen && (
              <SourcePickerMenu
                activeId={dashboard.sourceFilter}
                options={sourcePickerOptions}
                onSelect={selectSource}
              />
            )}
          </div>
          <button
            type="button"
            className="add-seller-btn"
            onClick={() => setAddSellerOpen(true)}
            disabled={!canAddSeller}
            title={canAddSeller ? "" : "Pick a spreadsheet first"}
          >
            <IconPlus size={16} stroke={2} aria-hidden="true" />
            <span>Add seller</span>
          </button>
        </div>
      )}

      {addSellerOpen && (
        <AddSellerModal
          onClose={() => setAddSellerOpen(false)}
          onSubmit={dashboard.actions.addLead}
          submitting={dashboard.addingLead}
          sourceLabel={activeSourceLabel}
        />
      )}

      <BuildingCleanupPanel
        aliases={dashboard.buildingAliases}
        cachedBuildings={dashboard.cachedBuildings}
        leads={dashboard.cleanupLeads}
        onSaveAlias={dashboard.actions.saveBuildingAlias}
        savingAliasName={dashboard.savingBuildingAliasName}
      />

      <div className="seller-record-surface">
        <FiltersToolbar
          dataFilter={dashboard.dataFilter}
          dataQualityFilter={dashboard.dataQualityFilter}
          dueCount={dashboard.dueCount}
          isAllExpanded={dashboard.isAllExpanded}
          onDataFilterChange={dashboard.actions.selectDataFilter}
          onDataQualityFilterChange={dashboard.actions.selectDataQualityFilter}
          onSearchTermChange={dashboard.actions.updateSearchTerm}
          onSourceFilterChange={dashboard.actions.selectSourceFilter}
          onStatusFilterChange={dashboard.actions.selectStatusFilter}
          onViewTabChange={dashboard.actions.selectViewTab}
          onToggleAllExpanded={dashboard.actions.toggleAllExpanded}
          scheduledCount={dashboard.scheduledCount}
          searchTerm={dashboard.searchTerm}
          sourceFilter={dashboard.sourceFilter}
          statusFilter={dashboard.statusFilter}
          userId={userId}
          viewTab={dashboard.viewTab}
        />

        {dashboard.hasLeads ? (
          <>
            <div className="seller-record-meta">
              {dashboard.filteredLeadCount} leads
              {dashboard.dataQualitySummary?.review > 0 && ` - ${dashboard.dataQualitySummary.review} need review`}
              {dashboard.dataQualitySummary?.partial > 0 && ` - ${dashboard.dataQualitySummary.partial} missing info`}
            </div>

            {dashboard.pagedLeads.length === 0 && (
              <div className="empty seller-record-empty">
                {dashboard.viewTab === "done"
                  ? "Nothing scheduled - every seller is either due or opted out."
                  : "You're all caught up - no sellers due today."}
              </div>
            )}

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
                      favorited={favoriteIds.has(String(lead.id))}
                      hot={dashboard.hotLeadIds?.has(lead.id)}
                      insight={dashboard.insights[lead.id]}
                      isSent={Boolean(dashboard.sentLeads[lead.id])}
                      lead={lead}
                      onCopyMessage={dashboard.actions.copyMessage}
                      onDelete={dashboard.actions.deleteLead}
                      onSendWhatsApp={dashboard.actions.sendWhatsAppLead}
                      onToggleExpanded={dashboard.actions.toggleLeadExpanded}
                      onToggleFavorite={toggleFavorite}
                      onTogglePin={togglePin}
                      onToggleSent={dashboard.actions.toggleSent}
                      pinned={pinnedIds.has(String(lead.id))}
                      whatsappConnected={Boolean(dashboard.connectedWhatsAppAccount)}
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
                  key={modalLead.id}
                  copiedLeadId={dashboard.copiedLeadId}
                  editDraft={dashboard.editingLeadId === modalLead.id ? dashboard.editingLeadDraft : null}
                  insight={dashboard.insights[modalLead.id]}
                  isDeleting={dashboard.deletingLeadId === modalLead.id}
                  isEditing={dashboard.editingLeadId === modalLead.id}
                  isSaving={dashboard.savingLeadId === modalLead.id}
                  isSent={Boolean(dashboard.sentLeads[modalLead.id])}
                  lead={modalLead}
                  messageTemplate={dashboard.messageTemplates.activeTemplateContent}
                  onCancelEditing={dashboard.actions.cancelEditingLead}
                  onClose={() => dashboard.actions.toggleLeadExpanded(modalLead.id)}
                  onCopyMessage={dashboard.actions.copyMessage}
                  onDelete={dashboard.actions.deleteLead}
                  onEditFieldChange={dashboard.actions.updateLeadDraftField}
                  onSaveEdit={dashboard.actions.saveLeadEdits}
                  onSaveNotes={dashboard.actions.saveNotes}
                  onSendWhatsApp={dashboard.actions.sendWhatsAppLead}
                  onStartEditing={dashboard.actions.startEditingLead}
                  onToggleSent={dashboard.actions.toggleSent}
                  onUpdateStatus={dashboard.actions.updateLeadStatus}
                  templates={dashboard.messageTemplates.templates}
                  whatsappConnected={Boolean(dashboard.connectedWhatsAppAccount)}
                />
              );
            })()}
          </>
        ) : (
          <div className="empty seller-record-empty">No sellers yet. Import a spreadsheet above to get started.</div>
        )}
      </div>

      {dashboard.hasLeads && (
        <>
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
            whatsappConnected={Boolean(dashboard.connectedWhatsAppAccount)}
          />
        </>
      )}
    </div>
  );
}
