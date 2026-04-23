import { WHATSAPP_OPEN_DELAY_MS } from "./constants";
import { buildMessage, formatPhoneForWhatsApp } from "./insight-utils";
import { applyLeadEdits, applyLeadStatus, sortLeadsByPriority } from "./lead-utils";
import { insertLead } from "./services";
import {
  createLeadEditDraft,
  EMPTY_LEADS_DATA,
  getErrorMessage,
  LEGACY_SOURCE_ID,
  updateLeadsCache,
} from "./page-helpers";
import { sellerLeadsQueryKey } from "./queryKeys";
import { createSellerSignalImportActions } from "./useSellerSignalImportActions";

export function createSellerSignalActions(context) {
  const {
    addingLead,
    copiedLeadId,
    deleteLeadMutation,
    editingLeadDraft,
    editingLeadId,
    effectiveSourceFilter,
    expandedLeads,
    insights,
    leads,
    pagedLeads,
    queryClient,
    sentLeads,
    toggleSentMutation,
    updateLeadMutation,
    updateLeadStatusMutation,
    userId,
    setters,
  } = context;

  const {
    setActionError,
    setActionNotice,
    setAddingLead,
    setCopiedLeadId,
    setDeletingLeadId,
    setEditingLeadDraft,
    setEditingLeadId,
    setExpandedLeads,
    setSavingLeadId,
    setViewTab,
  } = setters;
  const importActions = createSellerSignalImportActions(context);

  async function addLead(draft) {
    const sourceId = effectiveSourceFilter;
    if (!sourceId || sourceId === "all" || sourceId === LEGACY_SOURCE_ID) {
      setActionError("Pick a spreadsheet first.");
      setActionNotice(null);
      return false;
    }

    if (addingLead) return false;

    setAddingLead(true);
    setActionError(null);
    setActionNotice(null);

    try {
      await insertLead({ userId, sourceId, fields: draft });
      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
      setActionNotice("Seller added.");
      return true;
    } catch (addError) {
      setActionError(getErrorMessage(addError));
      return false;
    } finally {
      setAddingLead(false);
    }
  }

  async function toggleSent(leadId) {
    const previousData = queryClient.getQueryData(sellerLeadsQueryKey(userId));
    const previousSentAt = sentLeads[leadId] || null;
    const shouldMarkSent = !previousSentAt;

    setActionError(null);
    updateLeadsCache(queryClient, userId, (current) => {
      const nextSentMap = { ...current.sentMap };
      if (shouldMarkSent) nextSentMap[leadId] = Date.now();
      else delete nextSentMap[leadId];
      return { ...current, sentMap: nextSentMap };
    });

    try {
      const persistedSentAt = await toggleSentMutation.mutateAsync({ leadId, shouldMarkSent });
      updateLeadsCache(queryClient, userId, (current) => {
        const nextSentMap = { ...current.sentMap };
        if (persistedSentAt) nextSentMap[leadId] = new Date(persistedSentAt).getTime();
        else delete nextSentMap[leadId];
        return { ...current, sentMap: nextSentMap };
      });

      setViewTab(shouldMarkSent ? "done" : "active");
      setters.setCurrentPage(1);

      if (shouldMarkSent) {
        const today = new Date().toISOString().slice(0, 10);
        try {
          await updateLeadMutation.mutateAsync({ leadId, updates: { lastContact: today } });
        } catch (updateError) {
          setActionError(`Marked as sent, but could not update last contact: ${getErrorMessage(updateError)}`);
        }
      }

      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
    } catch (persistError) {
      setActionError(getErrorMessage(persistError));
      queryClient.setQueryData(sellerLeadsQueryKey(userId), previousData || EMPTY_LEADS_DATA);
    }
  }

  async function updateLeadStatusAction(leadId, status) {
    if (!leadId) return;

    const previousData = queryClient.getQueryData(sellerLeadsQueryKey(userId));
    setActionError(null);
    updateLeadsCache(queryClient, userId, (current) => ({
      ...current,
      leads: sortLeadsByPriority(
        current.leads.map((lead) => (lead.id === leadId ? applyLeadStatus(lead, status) : lead)),
      ),
    }));

    try {
      await updateLeadStatusMutation.mutateAsync({ leadId, status });
    } catch (statusError) {
      setActionError(getErrorMessage(statusError));
      queryClient.setQueryData(sellerLeadsQueryKey(userId), previousData || EMPTY_LEADS_DATA);
    }
  }

  function startEditingLead(leadId) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    setEditingLeadId(leadId);
    setEditingLeadDraft(createLeadEditDraft(lead));
  }

  function cancelEditingLead() {
    setEditingLeadId(null);
    setEditingLeadDraft(null);
  }

  function updateLeadDraftField(field, value) {
    setEditingLeadDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  async function saveLeadEdits(leadId) {
    if (!leadId || editingLeadId !== leadId || !editingLeadDraft) return;

    const hasVisibleValue = [editingLeadDraft.name, editingLeadDraft.building, editingLeadDraft.phone]
      .some((value) => String(value || "").trim());
    if (!hasVisibleValue) {
      setActionError("Seller needs at least a name, building, or phone number.");
      return;
    }

    const currentLead = leads.find((item) => item.id === leadId);
    if (!currentLead) return;

    const previousData = queryClient.getQueryData(sellerLeadsQueryKey(userId));
    const nextLead = applyLeadEdits(currentLead, editingLeadDraft);

    setSavingLeadId(leadId);
    setActionError(null);
    updateLeadsCache(queryClient, userId, (current) => ({
      ...current,
      leads: sortLeadsByPriority(
        current.leads.map((lead) => (lead.id === leadId ? nextLead : lead)),
      ),
    }));

    try {
      await updateLeadMutation.mutateAsync({ leadId, updates: editingLeadDraft });
      setEditingLeadId(null);
      setEditingLeadDraft(null);
    } catch (saveError) {
      setActionError(getErrorMessage(saveError));
      queryClient.setQueryData(sellerLeadsQueryKey(userId), previousData || EMPTY_LEADS_DATA);
    } finally {
      setSavingLeadId(null);
    }
  }

  async function saveNotes(leadId, notes) {
    if (!leadId) return;
    try {
      await updateLeadMutation.mutateAsync({ leadId, updates: { notes } });
      queryClient.setQueryData(sellerLeadsQueryKey(userId), (current) => {
        if (!current?.leads) return current;
        return {
          ...current,
          leads: current.leads.map((lead) =>
            lead.id === leadId ? { ...lead, notes: notes.trim() || "" } : lead,
          ),
        };
      });
    } catch (saveError) {
      setActionError(getErrorMessage(saveError));
    }
  }

  async function deleteLeadAction(leadId, options = {}) {
    if (!leadId) return;

    const targetLead = leads.find((item) => item.id === leadId);
    if (!targetLead) return;

    const targetLabel = targetLead.name || targetLead.building || "this seller";
    const shouldDelete = options.skipConfirm || typeof window === "undefined"
      ? true
      : window.confirm(`Delete ${targetLabel}? This action cannot be undone.`);
    if (!shouldDelete) return;

    const previousData = queryClient.getQueryData(sellerLeadsQueryKey(userId));
    const previousExpandedLeads = expandedLeads;
    const previousEditingLeadId = editingLeadId;
    const previousEditingLeadDraft = editingLeadDraft;

    setDeletingLeadId(leadId);
    setActionError(null);
    updateLeadsCache(queryClient, userId, (current) => {
      const nextSentMap = { ...current.sentMap };
      delete nextSentMap[leadId];
      return {
        ...current,
        leads: current.leads.filter((lead) => lead.id !== leadId),
        sentMap: nextSentMap,
      };
    });

    setExpandedLeads((current) => {
      const next = { ...current };
      delete next[leadId];
      return next;
    });

    if (copiedLeadId === leadId) setCopiedLeadId(null);
    if (editingLeadId === leadId) {
      setEditingLeadId(null);
      setEditingLeadDraft(null);
    }

    try {
      await deleteLeadMutation.mutateAsync({ leadId });
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError));
      queryClient.setQueryData(sellerLeadsQueryKey(userId), previousData || EMPTY_LEADS_DATA);
      setExpandedLeads(previousExpandedLeads);
      setEditingLeadId(previousEditingLeadId);
      setEditingLeadDraft(previousEditingLeadDraft);
    } finally {
      setDeletingLeadId(null);
    }
  }

  function bulkWhatsApp(markAsSent = true) {
    const targets = pagedLeads.filter((lead) => {
      const phone = formatPhoneForWhatsApp(lead.phone);
      return phone && insights[lead.id]?.status === "ready";
    });

    targets.forEach((lead, index) => {
      const insight = insights[lead.id];
      const message = insight?.message || buildMessage(lead, insight);
      const phone = formatPhoneForWhatsApp(lead.phone);
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      window.setTimeout(() => {
        window.open(url, "_blank", "noopener,noreferrer");
      }, index * WHATSAPP_OPEN_DELAY_MS);

      if (markAsSent && !sentLeads[lead.id]) {
        void toggleSent(lead.id);
      }
    });
  }

  async function copyMessage(leadId, message) {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedLeadId(leadId);
      window.setTimeout(() => {
        setCopiedLeadId((currentValue) => (currentValue === leadId ? null : currentValue));
      }, 1200);
    } catch {
      setActionError("Clipboard copy failed.");
    }
  }

  return {
    addLead,
    bulkWhatsApp,
    cancelEditingLead,
    copyMessage,
    deleteLead: deleteLeadAction,
    ...importActions,
    saveLeadEdits,
    saveNotes,
    startEditingLead,
    toggleSent,
    updateLeadDraftField,
    updateLeadStatus: updateLeadStatusAction,
  };
}
