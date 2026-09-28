import { WHATSAPP_OPEN_DELAY_MS } from "./constants";
import { saveSellerFollowUp, uploadSellerAttachment } from './seller-contact-services';
import { introAttachmentPath } from "../../../supabase/functions/_shared/intro-attachment.js";
import { buildMessage, formatPhoneForWhatsApp } from "./insight-utils";
import { applyLeadEdits, applyLeadStatus, sortLeadsByPriority } from "./lead-utils";
import { fetchWhatsAppSendActivity, insertLead } from "./services";
import { confirmSendVolume } from "./send-volume-guard";
import {
  createLeadEditDraft,
  EMPTY_LEADS_DATA,
  getErrorMessage,
  LEGACY_SOURCE_ID,
  updateLeadsCache,
} from "./page-helpers";
import {
  sellerBuildingAliasesQueryKey,
  sellerBuildingCleanupQueryPrefix,
  sellerInsightsQueryPrefix,
  sellerLeadsQueryKey,
  sellerSendActivityQueryKey,
  sellerWhatsAppAccountsQueryKey,
} from "./queryKeys";
import { createSellerSignalImportActions } from "./useSellerSignalImportActions";
import { handoffConfirmation, manualSendRequiresTodaysTransaction } from "../../../shared/whatsapp-send-policy.js";

export function createSellerSignalActions(context) {
  const {
    addingLead,
    copiedLeadId,
    connectWhatsAppAccountMutation,
    connectedWhatsAppAccount,
    deleteLeadMutation,
    editingLeadDraft,
    editingLeadId,
    effectiveSourceFilter,
    expandedLeads,
    insights,
    leads,
    messageTemplate,
    messageTemplateImagePath,
    pagedLeads,
    queryClient,
    sendWhatsAppMessageMutation,
    sentLeads,
    toggleSentMutation,
    updateLeadMutation,
    updateLeadStatusMutation,
    upsertBuildingAliasMutation,
    userId,
    setters,
  } = context;

  const {
    setActionError,
    setActionNotice,
    setPendingHandoff,
    setAddingLead,
    setCopiedLeadId,
    setDeletingLeadId,
    setEditingLeadDraft,
    setEditingLeadId,
    setExpandedLeads,
    setSavingLeadId,
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
      await queryClient.invalidateQueries({ queryKey: sellerBuildingCleanupQueryPrefix(userId) });
      setActionNotice("Seller added.");
      return true;
    } catch (addError) {
      setActionError(getErrorMessage(addError));
      return false;
    } finally {
      setAddingLead(false);
    }
  }

  // External WhatsApp and copy handoffs cannot prove a send, so they only
  // record contact after the person confirms in the dashboard banner.
  function requestSentConfirmation(leadIds) {
    const unsent = [].concat(leadIds)
      .map((id) => leads.find((lead) => lead.id === id))
      .filter((lead) => lead && !sentLeads[lead.id]);
    if (!unsent.length) return;
    setPendingHandoff({ leadIds: unsent.map((lead) => lead.id), ...handoffConfirmation(unsent.map((lead) => lead.name)) });
  }

  async function confirmPendingHandoff(pending) {
    setPendingHandoff(null);
    for (const leadId of pending?.leadIds || []) {
      if (!sentLeads[leadId]) await toggleSent(leadId);
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

      // Cadence reads sent_at directly, and leaving last_contact untouched
      // makes un-ticking a clean undo (the lead returns to its prior state).

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
      await queryClient.invalidateQueries({ queryKey: sellerBuildingCleanupQueryPrefix(userId) });
    } catch (saveError) {
      setActionError(getErrorMessage(saveError));
      queryClient.setQueryData(sellerLeadsQueryKey(userId), previousData || EMPTY_LEADS_DATA);
    } finally {
      setSavingLeadId(null);
    }
  }

  async function saveMessage(leadId, message) {
    if (!userId || !leadId) throw new Error("Please sign in again.");
    await updateLeadMutation.mutateAsync({ leadId, updates: { message_draft: message } });
    queryClient.setQueryData(sellerLeadsQueryKey(userId), current => current ? { ...current, leads: current.leads.map(lead => lead.id === leadId ? { ...lead, message_draft: message } : lead) } : current);
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
      await queryClient.invalidateQueries({ queryKey: sellerBuildingCleanupQueryPrefix(userId) });
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

  function getLeadWhatsAppPayload(lead) {
    const insight = insights[lead.id];
    return {
      imagePath: introAttachmentPath(messageTemplateImagePath, lead, sentLeads[lead.id]),
      insight,
      message: lead.message_draft ?? (insight?.message || buildMessage(lead, insight, messageTemplate)),
      phone: formatPhoneForWhatsApp(lead.phone),
    };
  }

  function hasTodaysTransactionUpdate(leadId) {
    const insight = insights[leadId];
    return Boolean(
      insight?.status === "ready"
      && (insight.hasTodaysTransactions || insight.todaysRecentTransactions?.length > 0),
    );
  }

  function markLeadSentLocally(leadId, sentAt) {
    updateLeadsCache(queryClient, userId, (current) => {
      const nextSentMap = { ...current.sentMap };
      nextSentMap[leadId] = new Date(sentAt).getTime();
      return { ...current, sentMap: nextSentMap };
    });
  }

  async function sendWhatsAppLead(leadId, options = {}) {
    const lead = leads.find((item) => item.id === leadId) || pagedLeads.find((item) => item.id === leadId);
    if (!lead) return false;

    const {
      imagePath: templatedImagePath,
      insight,
      message: templatedMessage,
      phone,
    } = getLeadWhatsAppPayload(lead);
    // A one-off override from the lead modal wins over the templated message so a
    // single seller can get a tweaked script without touching the saved default.
    const message = String(options.message || "").trim() || templatedMessage;
    const requestedImagePath = Object.prototype.hasOwnProperty.call(options, "imagePath")
      ? options.imagePath
      : templatedImagePath;
    const imagePath = introAttachmentPath(requestedImagePath, lead, sentLeads[lead.id]);
    // Hot leads send the today's-transaction message; other due leads send a
    // recent-market follow-up. With no market data there is nothing worth
    // sending automatically.
    const isHot = hasTodaysTransactionUpdate(lead.id);
    const canFollowUp = insight?.status === "ready" && (insight.recentTransactions?.length || 0) > 0;
    if (!isHot && !canFollowUp && !options.customImage && !lead.message_draft?.trim() && !String(options.message || "").trim()) {
      setActionError("No market data for this building yet - copy the message and personalize it instead.");
      setActionNotice(null);
      return false;
    }

    if (!phone) {
      if (message) await copyMessage(lead.id, message);
      requestSentConfirmation(lead.id);
      return false;
    }

    if (!connectedWhatsAppAccount) {
      if (options.customImage) { setActionError('Connect WhatsApp to send the selected image.'); return false; }
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      requestSentConfirmation(lead.id);
      return true;
    }

    setActionError(null);
    if (!options.quiet) setActionNotice(null);

    // Past 40 sends today, ask before a manual message goes out.
    if ((options.sendSource || "manual") === "manual") {
      let sentToday = queryClient.getQueryData(sellerSendActivityQueryKey(userId))?.total;
      if (!Number.isFinite(sentToday)) {
        sentToday = await queryClient.fetchQuery({ queryKey: sellerSendActivityQueryKey(userId), queryFn: () => fetchWhatsAppSendActivity(userId), staleTime: 30_000 })
          .then((activity) => activity?.total, () => undefined);
      }
      if (!(await confirmSendVolume(userId, sentToday))) return false;
    }

    try {
      const result = await sendWhatsAppMessageMutation.mutateAsync({
        imagePath: options.customImage ? await uploadSellerAttachment(userId, lead.id, options.customImage) : imagePath,
        customImage: Boolean(options.customImage),
        lead,
        message,
        sendSource: options.sendSource || "manual",
        requireTodaysTransaction: manualSendRequiresTodaysTransaction({ customImage: Boolean(options.customImage), hasTodaysTransaction: isHot }),
      });
      const sentAt = result?.sentAt || new Date().toISOString();
      markLeadSentLocally(lead.id, sentAt);
      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });

      if (!options.quiet) {
        const accountLabel = connectedWhatsAppAccount.display_phone_number || "connected WhatsApp account";
        setActionNotice(`${isHot ? "WhatsApp" : "Follow-up"} sent from ${accountLabel}.`);
      }
      return true;
    } catch (sendError) {
      setActionError(`WhatsApp send failed: ${getErrorMessage(sendError)}`);
      return false;
    }
  }

  async function saveBuildingAlias(aliasName, canonicalName) {
    const cleanAlias = String(aliasName || "").trim();
    const cleanCanonical = String(canonicalName || "").trim();

    if (!cleanAlias || !cleanCanonical) {
      setActionError("Pick a building match first.");
      setActionNotice(null);
      return false;
    }

    setActionError(null);
    setActionNotice(null);

    try {
      const savedAlias = await upsertBuildingAliasMutation.mutateAsync({
        aliasName: cleanAlias,
        canonicalName: cleanCanonical,
      });

      queryClient.setQueryData(sellerBuildingAliasesQueryKey(userId), (current) => {
        const aliases = current || [];
        const next = aliases.filter((alias) => alias.aliasKey !== savedAlias.aliasKey);
        next.push(savedAlias);
        return next.sort((left, right) => left.aliasName.localeCompare(right.aliasName));
      });
      await queryClient.invalidateQueries({ queryKey: sellerBuildingAliasesQueryKey(userId) });
      await queryClient.invalidateQueries({ queryKey: sellerBuildingCleanupQueryPrefix(userId) });
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
      setters.setCurrentPage(1);
      setActionNotice(`Mapped "${cleanAlias}" to ${cleanCanonical}.`);
      return true;
    } catch (aliasError) {
      setActionError(getErrorMessage(aliasError));
      return false;
    }
  }

  async function connectWhatsAppAccountAction(payload) {
    setActionError(null);
    if (!payload?.quiet) setActionNotice(null);

    try {
      const result = await connectWhatsAppAccountMutation.mutateAsync(payload);
      const account = result?.account || result;
      if (!account?.id) throw new Error("WhatsApp account was not returned");

      queryClient.setQueryData(sellerWhatsAppAccountsQueryKey(userId), (current) => {
        const accounts = Array.isArray(current) ? current : [];
        const next = accounts.filter((item) => item.id !== account.id);
        return [account, ...next];
      });
      await queryClient.invalidateQueries({ queryKey: sellerWhatsAppAccountsQueryKey(userId) });

      if (!payload?.quiet) {
        const accountLabel = account.display_phone_number || account.business_name || "WhatsApp";
        if (payload?.action === "disconnect" || account.connection_status === "disconnected") {
          setActionNotice(`${accountLabel} disconnected.`);
        } else {
          const suffix = account.connection_status === "connected" ? "connected" : "ready to pair";
          setActionNotice(`${accountLabel} ${suffix}.`);
        }
      }
      return result?.account ? result : { account };
    } catch (connectError) {
      setActionError(`WhatsApp connection failed: ${getErrorMessage(connectError)}`);
      throw connectError;
    }
  }

  async function bulkWhatsApp(markAsSent = true) {
    const targets = pagedLeads.filter((lead) => {
      const phone = formatPhoneForWhatsApp(lead.phone);
      return phone && hasTodaysTransactionUpdate(lead.id);
    });

    if (!targets.length) return;

    if (connectedWhatsAppAccount) {
      setActionError(null);
      setActionNotice(`Sending ${targets.length} WhatsApp ${targets.length === 1 ? "message" : "messages"}...`);

      let sentCount = 0;
      for (const lead of targets) {
        const sent = await sendWhatsAppLead(lead.id, { quiet: true, sendSource: "bulk" });
        if (sent) sentCount += 1;
      }

      setActionNotice(`Sent ${sentCount} WhatsApp ${sentCount === 1 ? "message" : "messages"}.`);
      return;
    }

    targets.forEach((lead, index) => {
      const { message, phone } = getLeadWhatsAppPayload(lead);
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      window.setTimeout(() => {
        window.open(url, "_blank", "noopener,noreferrer");
      }, index * WHATSAPP_OPEN_DELAY_MS);
    });
    if (markAsSent) requestSentConfirmation(targets.map((lead) => lead.id));
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
    saveFollowUp: async (leadId, options) => {
      await saveSellerFollowUp(userId, leadId, options);
      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
    },
    addLead,
    bulkWhatsApp,
    cancelEditingLead,
    connectWhatsAppAccount: connectWhatsAppAccountAction,
    copyMessage,
    deleteLead: deleteLeadAction,
    ...importActions,
    saveBuildingAlias,
    saveLeadEdits,
    saveNotes,
    saveMessage,
    sendWhatsAppLead,
    startEditingLead,
    toggleSent,
    requestSentConfirmation,
    confirmPendingHandoff,
    dismissPendingHandoff: () => setPendingHandoff(null),
    updateLeadDraftField,
    updateLeadStatus: updateLeadStatusAction,
  };
}
