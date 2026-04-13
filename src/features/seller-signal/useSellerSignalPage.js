import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WHATSAPP_OPEN_DELAY_MS } from "./constants";
import { buildMessage, formatPhoneForWhatsApp } from "./insight-utils";
import { filterLeads, paginateLeads, splitLeadsBySentStatus } from "./selectors";
import {
  createDefaultLeadSources,
  deleteLead,
  fetchLeadInsights,
  fetchLeadSources,
  fetchUserLeads,
  persistLeadSentState,
  replaceLegacyLeadsFromSheet,
  replaceUserLeadsFromSheet,
  updateLead,
  updateLeadStatus,
  upsertLeadSource,
} from "./services";
import { applyLeadEdits, applyLeadStatus, formatDateInputValue, sortLeadsByPriority } from "./lead-utils";

const MAX_LEAD_SOURCES = 4;
const LEGACY_SOURCE_ID = "legacy";
const LEGACY_SOURCE_LABEL = "Legacy spreadsheet";
const EMPTY_LEADS_DATA = { leads: [], sentMap: {} };
const EMPTY_LEADS = [];
const EMPTY_SOURCES = [];
const EMPTY_SENT_MAP = {};

function getErrorMessage(error) {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "Unexpected error";
  if (typeof error?.message === "string") return error.message;
  return "Unexpected error";
}

function sellerLeadsQueryKey(userId) {
  return ["seller-signal", "leads", userId];
}

function sellerSourcesQueryKey(userId) {
  return ["seller-signal", "sources", userId];
}

function sellerInsightsQueryKey(userId, targetKeys) {
  return ["seller-signal", "insights", userId, targetKeys];
}

function sellerInsightsQueryPrefix(userId) {
  return ["seller-signal", "insights", userId];
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.map((source) => ({
    ...source,
    type: "building",
  }));
}

function limitLeadSources(sources) {
  if (!Array.isArray(sources)) return [];
  const normalized = normalizeSources(sources);
  return normalized
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    .slice(0, MAX_LEAD_SOURCES);
}

async function fetchSellerSources(userId) {
  let sources = await fetchLeadSources(userId);
  if (!sources.length) {
    await createDefaultLeadSources(userId);
    sources = await fetchLeadSources(userId);
  }
  return limitLeadSources(sources);
}

function buildInsightTarget(lead) {
  return {
    id: lead.id,
    name: lead.name || "",
    building: lead.building || "",
  };
}

function buildLoadingInsights(targets) {
  const updates = {};
  for (const lead of targets) {
    updates[lead.id] = {
      status: "loading",
      error: null,
      message: buildMessage(lead, null),
    };
  }
  return updates;
}

function buildErroredInsights(targets, message) {
  const updates = {};
  for (const lead of targets) {
    updates[lead.id] = {
      status: "error",
      error: message,
      message: buildMessage(lead, null),
    };
  }
  return updates;
}

function updateLeadsCache(queryClient, userId, updater) {
  queryClient.setQueryData(sellerLeadsQueryKey(userId), (current) => updater(current || EMPTY_LEADS_DATA));
}

export function useSellerSignalPage(userId) {
  const queryClient = useQueryClient();
  const legacySheetStorageKey = userId ? `seller-signal:legacy-sheet-url:${userId}` : null;
  const sourceFilterStorageKey = userId ? `seller-signal:source-filter:${userId}` : null;
  const [actionError, setActionError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importingSourceId, setImportingSourceId] = useState(null);
  const [importingLegacy, setImportingLegacy] = useState(false);
  const [legacySheetUrl, setLegacySheetUrlState] = useState(() => {
    if (typeof window === "undefined" || !legacySheetStorageKey) return "";
    return window.localStorage.getItem(legacySheetStorageKey) || "";
  });
  const [copiedLeadId, setCopiedLeadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("prospect");
  const [sourceFilter, setSourceFilter] = useState(() => {
    if (typeof window === "undefined" || !sourceFilterStorageKey) return "all";
    return window.localStorage.getItem(sourceFilterStorageKey) || "all";
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sheetUrl, setSheetUrl] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [viewTab, setViewTab] = useState("active");
  const [dataFilter, setDataFilter] = useState("with_data");
  const [expandedLeads, setExpandedLeads] = useState({});
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [editingLeadDraft, setEditingLeadDraft] = useState(null);
  const [savingLeadId, setSavingLeadId] = useState(null);
  const [deletingLeadId, setDeletingLeadId] = useState(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  function createLeadEditDraft(lead) {
    if (!lead) return null;
    return {
      name: lead.name || "",
      building: lead.building || "",
      bedroom: lead.bedroom || "",
      unit: lead.unit || "",
      phone: lead.phone || "",
      status: lead.status || "",
      lastContact: formatDateInputValue(lead.lastContactRaw || lead.lastContactDate),
    };
  }

  const leadsQuery = useQuery({
    queryKey: sellerLeadsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchUserLeads(userId),
    staleTime: 30 * 1000,
  });

  const leadSourcesQuery = useQuery({
    queryKey: sellerSourcesQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchSellerSources(userId),
    staleTime: 60 * 1000,
  });

  const leadsData = leadsQuery.data || EMPTY_LEADS_DATA;
  const leads = leadsData.leads || EMPTY_LEADS;
  const sentLeads = leadsData.sentMap || EMPTY_SENT_MAP;
  const leadSources = leadSourcesQuery.data || EMPTY_SOURCES;
  const hasLegacyLeads = useMemo(() => leads.some((lead) => !lead.sourceId), [leads]);
  const effectiveSourceFilter = useMemo(
    () => {
      if (sourceFilter === "all") return "all";
      if (sourceFilter === LEGACY_SOURCE_ID) return hasLegacyLeads ? LEGACY_SOURCE_ID : "all";
      return leadSources.some((source) => source.id === sourceFilter) ? sourceFilter : "all";
    },
    [hasLegacyLeads, leadSources, sourceFilter],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sourceFilterStorageKey) {
      setSourceFilter("all");
      return;
    }
    setSourceFilter(window.localStorage.getItem(sourceFilterStorageKey) || "all");
  }, [sourceFilterStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !sourceFilterStorageKey) return;
    if (effectiveSourceFilter === "all") {
      window.localStorage.removeItem(sourceFilterStorageKey);
      return;
    }
    window.localStorage.setItem(sourceFilterStorageKey, effectiveSourceFilter);
  }, [effectiveSourceFilter, sourceFilterStorageKey]);

  const insightTargets = useMemo(
    () => leads.filter((lead) => lead.building).map(buildInsightTarget),
    [leads],
  );
  const insightTargetKeys = useMemo(
    () => insightTargets.map((lead) => `${lead.id}:${lead.name}:${lead.building}`),
    [insightTargets],
  );

  const insightsQuery = useQuery({
    queryKey: sellerInsightsQueryKey(userId, insightTargetKeys),
    enabled: Boolean(userId) && insightTargets.length > 0,
    queryFn: () => fetchLeadInsights(insightTargets),
    staleTime: 10 * 60 * 1000,
  });
  const persistLeadSourceMutation = useMutation({
    mutationFn: (source) => upsertLeadSource(source),
  });
  const importLeadsMutation = useMutation({
    mutationFn: ({ source, rawSheetUrl }) => replaceUserLeadsFromSheet({ userId, source, rawSheetUrl }),
  });
  const importLegacyLeadsMutation = useMutation({
    mutationFn: ({ rawSheetUrl }) => replaceLegacyLeadsFromSheet({ userId, rawSheetUrl }),
  });
  const toggleSentMutation = useMutation({
    mutationFn: ({ leadId, shouldMarkSent }) => persistLeadSentState(userId, leadId, shouldMarkSent),
  });
  const updateLeadStatusMutation = useMutation({
    mutationFn: ({ leadId, status }) => updateLeadStatus({ userId, leadId, status }),
  });
  const updateLeadMutation = useMutation({
    mutationFn: ({ leadId, updates }) => updateLead({ userId, leadId, updates }),
  });
  const deleteLeadMutation = useMutation({
    mutationFn: ({ leadId }) => deleteLead({ userId, leadId }),
  });

  const insights = useMemo(() => {
    if (!insightTargets.length) return {};
    if (insightsQuery.data?.updates) return insightsQuery.data.updates;
    if (insightsQuery.isFetching) return buildLoadingInsights(insightTargets);
    if (insightsQuery.error) return buildErroredInsights(insightTargets, getErrorMessage(insightsQuery.error));
    return {};
  }, [insightTargets, insightsQuery.data, insightsQuery.error, insightsQuery.isFetching]);

  const { activeLeads: allActiveLeads, doneLeads: allDoneLeads } = useMemo(
    () => splitLeadsBySentStatus(leads, sentLeads, insights),
    [insights, leads, sentLeads],
  );

  const activeLeads = useMemo(() => {
    if (!effectiveSourceFilter || effectiveSourceFilter === "all") return allActiveLeads;
    if (effectiveSourceFilter === LEGACY_SOURCE_ID) return allActiveLeads.filter((lead) => !lead.sourceId);
    return allActiveLeads.filter((lead) => lead.sourceId === effectiveSourceFilter);
  }, [allActiveLeads, effectiveSourceFilter]);

  const doneLeads = useMemo(() => {
    if (!effectiveSourceFilter || effectiveSourceFilter === "all") return allDoneLeads;
    if (effectiveSourceFilter === LEGACY_SOURCE_ID) return allDoneLeads.filter((lead) => !lead.sourceId);
    return allDoneLeads.filter((lead) => lead.sourceId === effectiveSourceFilter);
  }, [allDoneLeads, effectiveSourceFilter]);

  const filteredLeads = useMemo(
    () =>
      filterLeads({
        activeLeads,
        doneLeads,
        dataFilter,
        insights,
        searchTerm: deferredSearchTerm,
        sourceFilter: effectiveSourceFilter,
        statusFilter,
        viewTab,
      }),
    [activeLeads, dataFilter, deferredSearchTerm, doneLeads, effectiveSourceFilter, insights, statusFilter, viewTab],
  );

  const { totalPages, safePage, pagedLeads } = useMemo(
    () => paginateLeads(filteredLeads, currentPage),
    [currentPage, filteredLeads],
  );

  const sourceCounts = useMemo(() => {
    const counts = {};
    for (const lead of leads) {
      const key = lead.sourceId || LEGACY_SOURCE_ID;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [leads]);

  const sourceOptions = useMemo(
    () => {
      const options = leadSources.map((source) => ({
        id: source.id,
        label: source.building_name || source.label || `Sheet ${source.sort_order + 1}`,
      }));
      if (sourceCounts[LEGACY_SOURCE_ID]) {
        options.push({ id: LEGACY_SOURCE_ID, label: LEGACY_SOURCE_LABEL });
      }
      return options;
    },
    [leadSources, sourceCounts],
  );

  const isAllExpanded = filteredLeads.length > 0 && filteredLeads.every((lead) => expandedLeads[lead.id]);
  const sendAllCount = pagedLeads.filter((lead) => {
    const phone = formatPhoneForWhatsApp(lead.phone);
    return phone && insights[lead.id]?.status === "ready";
  }).length;

  const fetchError = leadsQuery.error
    ? getErrorMessage(leadsQuery.error)
    : leadSourcesQuery.error
      ? getErrorMessage(leadSourcesQuery.error)
      : null;
  const insightNotice = insightTargets.length
    ? insightsQuery.error
      ? getErrorMessage(insightsQuery.error)
      : insightsQuery.data?.hasTargets && insightsQuery.data.matched === 0
        ? "Property market data is not available for these buildings yet."
        : null
    : leads.length
      ? "No leads with a building name."
      : null;
  const error = actionError || fetchError || insightNotice;
  const loading = (leadsQuery.isPending && !leadsQuery.data) || (leadSourcesQuery.isPending && !leadSourcesQuery.data);
  const refreshing =
    (leadsQuery.isFetching && !leadsQuery.isPending)
    || (insightsQuery.isFetching && leads.length > 0);

  function resetPaging() {
    setCurrentPage(1);
  }

  function updateSearchTerm(value) {
    setSearchTerm(value);
    resetPaging();
  }

  function selectStatusFilter(value) {
    setStatusFilter(value);
    resetPaging();
  }

  function selectDataFilter(value) {
    setDataFilter(value);
    resetPaging();
  }

  function selectSourceFilter(value) {
    setSourceFilter(value);
    resetPaging();
  }


  function selectViewTab(value) {
    setViewTab(value);
    resetPaging();
  }

  function toggleLeadExpanded(leadId) {
    setExpandedLeads((previous) => ({ ...previous, [leadId]: !previous[leadId] }));
  }

  function goToNextPage() {
    setCurrentPage((page) => Math.min(page + 1, totalPages));
  }

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function toggleAllExpanded() {
    setExpandedLeads((previous) => {
      const next = { ...previous };
      for (const lead of filteredLeads) next[lead.id] = !isAllExpanded;
      return next;
    });
  }

  function toggleImportPanel() {
    setShowImport((previous) => !previous);
  }

  function updateSheetUrl(value) {
    setSheetUrl(value);
  }

  function updateLeadSourceField(sourceId, field, value) {
    queryClient.setQueryData(sellerSourcesQueryKey(userId), (current) =>
      (current || EMPTY_SOURCES).map((source) =>
        source.id === sourceId
          ? { ...source, [field]: value }
          : source,
      ));
  }

  async function persistLeadSource(sourceId) {
    const source = leadSources.find((item) => item.id === sourceId);
    if (!source) return;

    setActionError(null);
    try {
      await persistLeadSourceMutation.mutateAsync(source);
      await queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) });
    } catch (persistError) {
      setActionError(getErrorMessage(persistError));
    }
  }

  function updateLegacySheetUrl(value) {
    const next = String(value || "");
    setLegacySheetUrlState(next);
    if (typeof window !== "undefined" && legacySheetStorageKey) {
      if (next) window.localStorage.setItem(legacySheetStorageKey, next);
      else window.localStorage.removeItem(legacySheetStorageKey);
    }
  }

  async function importLegacySheet() {
    const trimmed = legacySheetUrl.trim();
    if (!trimmed) {
      setActionError("Paste a Google Sheet URL first.");
      return;
    }
    setImportingLegacy(true);
    setActionError(null);

    try {
      await importLegacyLeadsMutation.mutateAsync({ rawSheetUrl: trimmed });
      setExpandedLeads({});
      setEditingLeadId(null);
      setEditingLeadDraft(null);
      setCopiedLeadId(null);
      setCurrentPage(1);
      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
    } catch (importError) {
      setActionError(getErrorMessage(importError));
    } finally {
      setImportingLegacy(false);
    }
  }

  async function importFromSheet(sourceId = null) {
    setImporting(true);
    setImportingSourceId(sourceId);
    setActionError(null);

    try {
      const source = sourceId ? leadSources.find((item) => item.id === sourceId) : null;
      if (sourceId && source) {
        await persistLeadSourceMutation.mutateAsync(source);
      }
      await importLeadsMutation.mutateAsync({
        source,
        rawSheetUrl: sourceId ? source?.sheet_url : sheetUrl,
      });
      setShowImport(false);
      setSheetUrl("");
      setExpandedLeads({});
      setEditingLeadId(null);
      setEditingLeadDraft(null);
      setCopiedLeadId(null);
      setCurrentPage(1);
      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
    } catch (importError) {
      setActionError(getErrorMessage(importError));
    } finally {
      setImporting(false);
      setImportingSourceId(null);
    }
  }

  async function toggleSent(leadId) {
    const previousData = queryClient.getQueryData(sellerLeadsQueryKey(userId));
    const previousSentAt = sentLeads[leadId] || null;
    const shouldMarkSent = !previousSentAt;

    setActionError(null);
    updateLeadsCache(queryClient, userId, (current) => {
      const nextSentMap = { ...current.sentMap };
      if (shouldMarkSent) {
        nextSentMap[leadId] = Date.now();
      } else {
        delete nextSentMap[leadId];
      }
      return { ...current, sentMap: nextSentMap };
    });

    try {
      const persistedSentAt = await toggleSentMutation.mutateAsync({ leadId, shouldMarkSent });
      updateLeadsCache(queryClient, userId, (current) => {
        const nextSentMap = { ...current.sentMap };
        if (persistedSentAt) {
          nextSentMap[leadId] = new Date(persistedSentAt).getTime();
        } else {
          delete nextSentMap[leadId];
        }
        return { ...current, sentMap: nextSentMap };
      });
      setViewTab(shouldMarkSent ? "done" : "active");
      setCurrentPage(1);
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

  async function changeLeadStatus(leadId, status) {
    if (!leadId) return;

    const previousData = queryClient.getQueryData(sellerLeadsQueryKey(userId));
    setActionError(null);
    updateLeadsCache(queryClient, userId, (current) => ({
      ...current,
      leads: sortLeadsByPriority(
        current.leads.map((lead) =>
          lead.id === leadId ? applyLeadStatus(lead, status) : lead,
        ),
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
          leads: current.leads.map((l) => (l.id === leadId ? { ...l, notes: notes.trim() || "" } : l)),
        };
      });
    } catch (saveError) {
      setActionError(getErrorMessage(saveError));
    }
  }

  async function removeLead(leadId) {
    if (!leadId) return;

    const targetLead = leads.find((item) => item.id === leadId);
    if (!targetLead) return;

    const targetLabel = targetLead.name || targetLead.building || "this seller";
    const shouldDelete = typeof window === "undefined"
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
    activeLeads,
    copiedLeadId,
    dataFilter,
    deletingLeadId,
    doneLeads,
    editingLeadDraft,
    editingLeadId,
    error,
    expandedLeads,
    filteredLeads,
    hasLeads: leads.length > 0,
    importing,
    importingLegacy,
    importingSourceId,
    insights,
    legacySheetUrl,
    isAllExpanded,
    leadSources,
    loading,
    pagedLeads,
    refreshing,
    safePage,
    savingLeadId,
    searchTerm,
    sendAllCount,
    sentLeads,
    sheetUrl,
    showImport,
    sourceCounts,
    sourceFilter: effectiveSourceFilter,
    sourceOptions,
    statusFilter,
    totalPages,
    viewTab,
    actions: {
      bulkWhatsApp,
      cancelEditingLead,
      copyMessage,
      deleteLead: removeLead,
      goToNextPage,
      goToPreviousPage,
      importFromSheet,
      importLegacySheet,
      persistLeadSource,
      saveLeadEdits,
      saveNotes,
      selectDataFilter,
      selectSourceFilter,
      selectStatusFilter,
      selectViewTab,
      startEditingLead,
      toggleAllExpanded,
      toggleImportPanel,
      toggleLeadExpanded,
      toggleSent,
      updateLeadDraftField,
      updateLegacySheetUrl,
      updateLeadSourceField,
      updateLeadStatus: changeLeadStatus,
      updateSearchTerm,
      updateSheetUrl,
    },
  };
}
