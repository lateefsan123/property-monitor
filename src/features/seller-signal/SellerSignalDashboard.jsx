import { useEffect, useState } from "react";
import { isAutomationAccount } from "../../../supabase/functions/_shared/automation-account.js";
import { IconPlus } from "@tabler/icons-react";
import AddSellerModal from "./components/AddSellerModal";
import BuildingCleanupPanel from "./components/BuildingCleanupPanel";
import ImportHealthPanel from "./components/ImportHealthPanel";
import LeadCard from "./components/LeadCard";
import LeadModal from "./components/LeadModal";
import Pagination from "./components/Pagination";
import SellerFilterBar from "./components/SellerFilterBar";
import SellerSignalSettingsModal from "./components/SellerSignalSettingsModal";
import { useSellerFavorites } from "./useSellerFavorites";
import { useSellerSignalPage } from "./useSellerSignalPage";

// Sellers table styled after Deel's People page (Mobbin fd251a0e): view switch
// row (the breadcrumb already names the page), a rounded filter bar, and the
// table inside one rounded card with one value per column.
export default function SellerSignalDashboard({
  savedSellerId,
  savedSellerSection = null,
  onNavigate,
  onCloseSavedSeller,
  billingPortalError,
  billingPortalPending = false,
  onCancelPlan,
  onCloseSettings,
  settingsOpen = false,
  subscription,
  userId,
}) {
  const dashboard = useSellerSignalPage(userId);
  const [addSellerOpen, setAddSellerOpen] = useState(false);
  const { favoriteIds, toggleFavorite, pinnedIds, togglePin } = useSellerFavorites(userId);
  // A seller opened from Activity that isn't among your sellers (deleted, or never
  // imported) clears the request instead of reopening on the next row you click.
  const savedSellerMissing = Boolean(savedSellerId) && !dashboard.loading
    && !dashboard.leads.some((lead) => String(lead.id) === savedSellerId);
  useEffect(() => { if (savedSellerMissing) onCloseSavedSeller?.(); }, [savedSellerMissing, onCloseSavedSeller]);

  const canAddSeller = dashboard.sourceFilter
    && dashboard.sourceFilter !== "all"
    && dashboard.sourceFilter !== "legacy";
  const activeSourceLabel = canAddSeller
    ? (dashboard.sourceOptions?.find((option) => option.id === dashboard.sourceFilter)?.label || "")
    : "";
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
    <div className="page seller-page">
      {dashboard.pendingHandoff && (
        <div className="notice handoff-confirm" role="alertdialog" aria-labelledby="handoff-confirm-title">
          <div>
            <strong id="handoff-confirm-title">{dashboard.pendingHandoff.title}</strong>
            <p>{dashboard.pendingHandoff.body}</p>
          </div>
          <div className="handoff-confirm-actions">
            <button type="button" className="btn-sm" onClick={dashboard.actions.dismissPendingHandoff}>{dashboard.pendingHandoff.cancel}</button>
            <button type="button" className="btn-sm btn-primary" onClick={() => dashboard.actions.confirmPendingHandoff(dashboard.pendingHandoff)}>{dashboard.pendingHandoff.confirm}</button>
          </div>
        </div>
      )}
      {dashboard.notice && <div className="notice">{dashboard.notice}</div>}
      {dashboard.error && <div className="error">{dashboard.error}</div>}
      <ImportHealthPanel
        report={dashboard.lastImportReport}
        onReviewRows={(filter) => dashboard.actions.selectDataQualityFilter(filter)}
      />
      <SellerSignalSettingsModal
        userId={userId}
        account={dashboard.connectedWhatsAppAccount}
        automationEnabled={dashboard.automation.enabled}
        automationLoading={dashboard.automation.loading}
        automationSaving={dashboard.automation.saving}
        billingPortalError={billingPortalError}
        billingPortalPending={billingPortalPending}
        connecting={dashboard.connectingWhatsAppAccount}
        monthlyReportsEnabled={dashboard.automation.monthlyReportsEnabled}
        sendActivity={dashboard.sendActivity.data}
        sendActivityLoading={dashboard.sendActivity.loading}
        onConnect={dashboard.actions.connectWhatsAppAccount}
        onAutomationChange={dashboard.automation.setEnabled}
        onCancelPlan={onCancelPlan}
        onClose={onCloseSettings}
        onMonthlyReportsChange={dashboard.automation.setMonthlyReportsEnabled}
        open={settingsOpen}
        subscription={subscription}
      />
      <div className="seller-page-head">
        {dashboard.hasLeads && (
          <div className="seller-view-switch" role="tablist" aria-label="Sellers">
            {[["active", "Due today", dashboard.dueCount], ["done", "Scheduled", dashboard.scheduledCount]].map(([id, label, count]) => (
              <button key={id} type="button" role="tab" aria-selected={dashboard.viewTab === id} className={dashboard.viewTab === id ? "is-active" : ""} onClick={() => dashboard.actions.selectViewTab(id)}>
                {label}<span>{count}</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" className="seller-add-btn" onClick={() => setAddSellerOpen(true)} disabled={!canAddSeller} title={canAddSeller ? undefined : "Choose a spreadsheet in the filters first"}>
          <IconPlus size={18} stroke={2.2} aria-hidden="true" />Add seller
        </button>
      </div>

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

      <div className="seller-table-surface">
        <SellerFilterBar dashboard={dashboard} userId={userId} />

        {dashboard.hasLeads ? (
          <>
            <div className="seller-table-card">
            <div className="seller-table-meta">
              {dashboard.filteredLeadCount.toLocaleString()} seller{dashboard.filteredLeadCount === 1 ? "" : "s"}
              {dashboard.dataQualitySummary?.review > 0 && ` · ${dashboard.dataQualitySummary.review} need review`}
              {dashboard.dataQualitySummary?.partial > 0 && ` · ${dashboard.dataQualitySummary.partial} missing info`}
            </div>

            {dashboard.pagedLeads.length === 0 && (
              <div className="seller-table-empty">
                {dashboard.viewTab === "done"
                  ? "Nothing scheduled - every seller is either due or opted out."
                  : "You're all caught up - no sellers due today."}
              </div>
            )}

            {dashboard.pagedLeads.length > 0 && <div className="seller-table-scroll">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Seller</th>
                    <th>Building</th>
                    <th>Unit</th>
                    <th>Bedrooms</th>
                    <th>Status</th>
                    <th>Follow-up</th>
                    <th>Phone</th>
                    <th>Contact</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {dashboard.pagedLeads.map((lead) => (
                    <LeadCard
                      automationAccount={isAutomationAccount(userId)}
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
                      onHandoff={dashboard.actions.requestSentConfirmation}
                      pinned={pinnedIds.has(String(lead.id))}
                      whatsappConnected={Boolean(dashboard.connectedWhatsAppAccount)}
                    />
                  ))}
                </tbody>
              </table>
            </div>}
            </div>

            {(() => {
              const modalLead = dashboard.leads.find((lead) => String(lead.id) === savedSellerId)
                || dashboard.pagedLeads.find((l) => dashboard.expandedLeads[l.id]);
              if (!modalLead) return null;
              const openedFromRequest = Boolean(savedSellerId) && String(modalLead.id) === savedSellerId;
              return (
                <LeadModal
                  key={`${modalLead.id}:${openedFromRequest ? savedSellerSection || "" : ""}`}
                  userId={userId}
                  initialSection={openedFromRequest ? savedSellerSection : null}
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
                  onClose={() => savedSellerId ? onCloseSavedSeller() : dashboard.actions.toggleLeadExpanded(modalLead.id)}
                  onCopyMessage={dashboard.actions.copyMessage}
                  onDelete={dashboard.actions.deleteLead}
                  onEditFieldChange={dashboard.actions.updateLeadDraftField}
                  onSaveEdit={dashboard.actions.saveLeadEdits}
                  onSaveMessage={dashboard.actions.saveMessage} onSaveNotes={dashboard.actions.saveNotes}
                  onSaveFollowUp={dashboard.actions.saveFollowUp}
                  onSendWhatsApp={dashboard.actions.sendWhatsAppLead}
                  onStartEditing={dashboard.actions.startEditingLead}
                  onHandoff={dashboard.actions.requestSentConfirmation}
                  onUpdateStatus={dashboard.actions.updateLeadStatus}
                  templates={dashboard.messageTemplates.templates}
                  whatsappConnected={Boolean(dashboard.connectedWhatsAppAccount)}
                />
              );
            })()}
          </>
        ) : (
          <div className="empty seller-record-empty">
            <p className="seller-record-empty-title">No sellers yet</p>
            <p>Import a spreadsheet to get started.</p>
            {onNavigate && <button type="button" className="seller-record-empty-action" onClick={() => onNavigate("spreadsheets")}>Import a spreadsheet</button>}
          </div>
        )}
      </div>

      {dashboard.hasLeads && (
        <Pagination
          currentPage={dashboard.safePage}
          onNext={dashboard.actions.goToNextPage}
          onPrevious={dashboard.actions.goToPreviousPage}
          totalPages={dashboard.totalPages}
        />
      )}
    </div>
  );
}
