import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatPhoneForWhatsApp } from "./insight-utils";
import { filterLeads, paginateLeads, splitLeadsBySentStatus } from "./selectors";
import {
  deleteLead,
  fetchLeadInsights,
  fetchUserLeads,
  persistLeadSentState,
  replaceLegacyLeadsFromSheet,
  replaceUserLeadsFromSheet,
  updateLead,
  updateLeadStatus,
  upsertLeadSource,
} from "./services";
import {
  buildErroredInsights,
  buildInsightTarget,
  buildLoadingInsights,
  EMPTY_LEADS,
  EMPTY_LEADS_DATA,
  EMPTY_SENT_MAP,
  EMPTY_SOURCES,
  fetchSellerSources,
  getErrorMessage,
  LEGACY_SOURCE_ID,
  LEGACY_SOURCE_LABEL,
  formatSourceLabel,
} from "./page-helpers";
import {
  sellerInsightsQueryKey,
  sellerLeadsQueryKey,
  sellerSourcesQueryKey,
} from "./queryKeys";
import { createSellerSignalActions } from "./useSellerSignalActions";

export function useSellerSignalPage(userId) {
  const queryClient = useQueryClient();
  const legacySheetStorageKey = userId ? `seller-signal:legacy-sheet-url:${userId}` : null;
  const sourceFilterStorageKey = userId ? `seller-signal:source-filter:${userId}` : null;
  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
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
  const [sortOption, setSortOption] = useState(() => {
    if (typeof window === "undefined") return { field: "added", direction: "desc" };
    try {
      const raw = window.localStorage.getItem("seller-signal:lead-sort");
      const parsed = raw ? JSON.parse(raw) : null;
      const field = parsed?.field === "alpha" ? "alpha" : "added";
      const direction = parsed?.direction === "asc" ? "asc" : "desc";
      return { field, direction };
    } catch {
      return { field: "added", direction: "desc" };
    }
  });
  const [expandedLeads, setExpandedLeads] = useState({});
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [editingLeadDraft, setEditingLeadDraft] = useState(null);
  const [savingLeadId, setSavingLeadId] = useState(null);
  const [deletingLeadId, setDeletingLeadId] = useState(null);
  const [addingLead, setAddingLead] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);

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
    mutationFn: ({ source, rawSheetUrl }) =>
      replaceUserLeadsFromSheet({ userId, source, rawSheetUrl }),
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

  const sortedLeads = useMemo(() => {
    const list = [...filteredLeads];
    list.sort((a, b) => {
      if (sortOption.field === "alpha") {
        return String(a.name || "").toLowerCase().localeCompare(String(b.name || "").toLowerCase());
      }
      return String(a.id || "").localeCompare(String(b.id || ""), undefined, { numeric: true });
    });
    if (sortOption.direction === "desc") list.reverse();
    return list;
  }, [filteredLeads, sortOption.field, sortOption.direction]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("seller-signal:lead-sort", JSON.stringify(sortOption));
    } catch {
      /* ignore */
    }
  }, [sortOption]);

  const { totalPages, safePage, pagedLeads } = useMemo(
    () => paginateLeads(sortedLeads, currentPage),
    [currentPage, sortedLeads],
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
        label: formatSourceLabel(source) || `Sheet ${source.sort_order + 1}`,
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
  const notice = actionNotice;
  const loading = (leadsQuery.isPending && !leadsQuery.data) || (leadSourcesQuery.isPending && !leadSourcesQuery.data);
  const refreshing =
    (leadsQuery.isFetching && !leadsQuery.isPending)
    || (insightsQuery.isFetching && leads.length > 0);
  const actions = createSellerSignalActions({
    addingLead,
    copiedLeadId,
    deleteLeadMutation,
    editingLeadDraft,
    editingLeadId,
    effectiveSourceFilter,
    expandedLeads,
    filteredLeads,
    importLeadsMutation,
    importLegacyLeadsMutation,
    importing,
    insights,
    isAllExpanded,
    leadSources,
    legacySheetStorageKey,
    legacySheetUrl,
    leads,
    pagedLeads,
    persistLeadSourceMutation,
    queryClient,
    sentLeads,
    sheetUrl,
    toggleSentMutation,
    totalPages,
    updateLeadMutation,
    updateLeadStatusMutation,
    userId,
    setters: {
      setActionError,
      setActionNotice,
      setAddingLead,
      setCopiedLeadId,
      setCurrentPage,
      setDataFilter,
      setDeletingLeadId,
      setEditingLeadDraft,
      setEditingLeadId,
      setExpandedLeads,
      setImporting,
      setImportingLegacy,
      setImportingSourceId,
      setLegacySheetUrlState,
      setSavingLeadId,
      setSearchTerm,
      setSheetUrl,
      setShowImport,
      setSourceFilter,
      setStatusFilter,
      setViewTab,
    },
  });

  return {
    activeLeads,
    addingLead,
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
    notice,
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
    sortOption,
    setSortOption,
    actions,
  };
}
