import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PAGE_SIZE } from "./constants";
import { formatPhoneForWhatsApp } from "./insight-utils";
import { enrichLeadsWithDataQuality, summarizeLeadDataQuality } from "./lead-data-quality";
import { filterLeads } from "./selectors";
import {
  connectWhatsAppAccount,
  deleteLead,
  fetchCachedBuildings,
  fetchLeadInsights,
  fetchLeadMarketAvailability,
  fetchSellerBuildingCleanupLeads,
  fetchSellerLeadPage,
  fetchWhatsAppAccounts,
  getConnectedWhatsAppAccount,
  persistLeadSentState,
  replaceLegacyLeadsFromSheet,
  replaceUserLeadsFromSheet,
  sendLeadWhatsAppMessage,
  updateLead,
  updateLeadStatus,
  upsertLeadSource,
} from "./services";
import {
  buildErroredInsights,
  buildInsightTarget,
  buildLoadingInsights,
  EMPTY_LEADS,
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
  sellerBuildingCleanupQueryKey,
  sellerLeadsQueryKey,
  sellerMarketAvailabilityQueryKey,
  sellerSourcesQueryKey,
  sellerCachedBuildingsQueryKey,
  sellerWhatsAppAccountsQueryKey,
} from "./queryKeys";
import { createSellerSignalActions } from "./useSellerSignalActions";
import { useSellerSignalBuildingAliases } from "./useSellerSignalBuildingAliases";

const EMPTY_SOURCE_COUNTS = {};
const EMPTY_CACHED_BUILDINGS = [];

export function useSellerSignalPage(userId) {
  const queryClient = useQueryClient();
  const legacySheetStorageKey = userId ? `seller-signal:legacy-sheet-url:${userId}` : null;
  const sourceFilterStorageKey = userId ? `seller-signal:source-filter:${userId}` : null;
  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [lastImportReport, setLastImportReport] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importingSourceId, setImportingSourceId] = useState(null);
  const [importingLegacy, setImportingLegacy] = useState(false);
  const [legacySheetUrl, setLegacySheetUrlState] = useState(() => {
    if (typeof window === "undefined" || !legacySheetStorageKey) return "";
    return window.localStorage.getItem(legacySheetStorageKey) || "";
  });
  const [copiedLeadId, setCopiedLeadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(["prospect"]);
  const [sourceFilter, setSourceFilter] = useState(() => {
    if (typeof window === "undefined" || !sourceFilterStorageKey) return "all";
    return window.localStorage.getItem(sourceFilterStorageKey) || "all";
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sheetUrl, setSheetUrl] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [viewTab, setViewTab] = useState("active");
  const [dataFilter, setDataFilter] = useState("all");
  const [dataQualityFilter, setDataQualityFilter] = useState("all");
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

  const leadSourcesQuery = useQuery({
    queryKey: sellerSourcesQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchSellerSources(userId),
    staleTime: 60 * 1000,
  });
  const {
    buildingAliases,
    buildingAliasesQuery,
    upsertBuildingAliasMutation,
  } = useSellerSignalBuildingAliases(userId);
  const cachedBuildingsQuery = useQuery({
    queryKey: sellerCachedBuildingsQueryKey(),
    enabled: Boolean(userId),
    queryFn: fetchCachedBuildings,
    staleTime: 30 * 60 * 1000,
  });
  const whatsappAccountsQuery = useQuery({
    queryKey: sellerWhatsAppAccountsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchWhatsAppAccounts(userId),
    staleTime: 60 * 1000,
  });

  const leadSources = leadSourcesQuery.data || EMPTY_SOURCES;
  const leadSourcesReady = Boolean(leadSourcesQuery.data);
  const effectiveSourceFilter = useMemo(
    () => {
      if (sourceFilter === "all") return "all";
      if (sourceFilter === LEGACY_SOURCE_ID) return LEGACY_SOURCE_ID;
      if (!leadSourcesReady) return sourceFilter;
      return leadSources.some((source) => source.id === sourceFilter) ? sourceFilter : "all";
    },
    [leadSources, leadSourcesReady, sourceFilter],
  );

  const leadsQuery = useQuery({
    queryKey: [
      ...sellerLeadsQueryKey(userId),
      "page",
      currentPage,
      effectiveSourceFilter,
      statusFilter,
      deferredSearchTerm,
      viewTab,
      sortOption.field,
      sortOption.direction,
    ],
    enabled: Boolean(userId),
    queryFn: () => fetchSellerLeadPage({
      currentPage,
      searchTerm: deferredSearchTerm,
      sortOption,
      sourceFilter: effectiveSourceFilter,
      statusFilter,
      userId,
      viewTab,
    }),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });

  const leadsData = leadsQuery.data || { leads: EMPTY_LEADS, sentMap: EMPTY_SENT_MAP, totalCount: 0, sourceCounts: {} };
  const leads = useMemo(
    () => enrichLeadsWithDataQuality(leadsData.leads || EMPTY_LEADS, buildingAliases, cachedBuildingsQuery.data || EMPTY_CACHED_BUILDINGS),
    [buildingAliases, cachedBuildingsQuery.data, leadsData.leads],
  );
  const cleanupLeadsQuery = useQuery({
    queryKey: sellerBuildingCleanupQueryKey(userId, effectiveSourceFilter),
    enabled: Boolean(userId),
    queryFn: () => fetchSellerBuildingCleanupLeads({
      userId,
      sourceFilter: effectiveSourceFilter,
    }),
    staleTime: 5 * 60 * 1000,
  });
  const cleanupLeads = useMemo(
    () => enrichLeadsWithDataQuality(cleanupLeadsQuery.data || EMPTY_LEADS, buildingAliases, cachedBuildingsQuery.data || EMPTY_CACHED_BUILDINGS),
    [buildingAliases, cachedBuildingsQuery.data, cleanupLeadsQuery.data],
  );
  const dataQualitySummary = useMemo(() => summarizeLeadDataQuality(leads), [leads]);
  const sentLeads = leadsData.sentMap || EMPTY_SENT_MAP;
  const connectedWhatsAppAccount = useMemo(
    () => getConnectedWhatsAppAccount(whatsappAccountsQuery.data || []),
    [whatsappAccountsQuery.data],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextFilter = sourceFilterStorageKey
      ? window.localStorage.getItem(sourceFilterStorageKey) || "all"
      : "all";
    const timer = window.setTimeout(() => setSourceFilter(nextFilter), 0);
    return () => window.clearTimeout(timer);
  }, [sourceFilterStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !sourceFilterStorageKey) return;
    if (effectiveSourceFilter === "all") {
      window.localStorage.removeItem(sourceFilterStorageKey);
      return;
    }
    window.localStorage.setItem(sourceFilterStorageKey, effectiveSourceFilter);
  }, [effectiveSourceFilter, sourceFilterStorageKey]);

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
  const sendWhatsAppMessageMutation = useMutation({
    mutationFn: ({ lead, message }) =>
      sendLeadWhatsAppMessage({
        accountId: connectedWhatsAppAccount?.id,
        leadId: lead.id,
        message,
        phone: lead.phone,
      }),
  });
  const connectWhatsAppAccountMutation = useMutation({
    mutationFn: (payload) => connectWhatsAppAccount(payload),
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

  const activeLeads = viewTab === "done" ? EMPTY_LEADS : leads;
  const doneLeads = viewTab === "done" ? leads : EMPTY_LEADS;

  const baseFilteredLeads = useMemo(
    () =>
      filterLeads({
        activeLeads,
        dataQualityFilter,
        doneLeads,
        dataFilter: "all",
        insights: {},
        searchTerm: deferredSearchTerm,
        sourceFilter: effectiveSourceFilter,
        statusFilter,
        viewTab,
      }),
    [activeLeads, dataQualityFilter, deferredSearchTerm, doneLeads, effectiveSourceFilter, statusFilter, viewTab],
  );

  const insightTargets = useMemo(
    () => baseFilteredLeads.filter((lead) => lead.building).map(buildInsightTarget),
    [baseFilteredLeads],
  );
  const insightTargetKeys = useMemo(
    () => insightTargets.map((lead) => `${lead.id}:${lead.name}:${lead.building}`),
    [insightTargets],
  );

  const marketAvailabilityQuery = useQuery({
    queryKey: sellerMarketAvailabilityQueryKey(userId, insightTargetKeys),
    enabled: Boolean(userId) && insightTargets.length > 0,
    queryFn: () => fetchLeadMarketAvailability(insightTargets),
    placeholderData: (previousData) => previousData,
    staleTime: 10 * 60 * 1000,
  });

  const insightsQuery = useQuery({
    queryKey: sellerInsightsQueryKey(userId, insightTargetKeys),
    enabled: Boolean(userId) && insightTargets.length > 0,
    queryFn: () => fetchLeadInsights(insightTargets),
    staleTime: 10 * 60 * 1000,
  });

  const insights = useMemo(() => {
    if (!insightTargets.length) return {};
    if (insightsQuery.data?.updates) return insightsQuery.data.updates;
    if (insightsQuery.isFetching) return buildLoadingInsights(insightTargets);
    if (insightsQuery.error) return buildErroredInsights(insightTargets, getErrorMessage(insightsQuery.error));
    return {};
  }, [insightTargets, insightsQuery.data, insightsQuery.error, insightsQuery.isFetching]);

  const marketAvailability = useMemo(() => {
    const availabilityUpdates = marketAvailabilityQuery.data?.updates || {};
    const result = { ...availabilityUpdates };
    for (const [leadId, insight] of Object.entries(insights)) {
      if (insight?.status === "ready") {
        result[leadId] = { status: "ready", source: "insights" };
      }
    }
    return result;
  }, [insights, marketAvailabilityQuery.data]);

  const filteredLeads = useMemo(
    () => {
      if (dataFilter === "all") return baseFilteredLeads;
      return filterLeads({
        activeLeads,
        dataQualityFilter,
        doneLeads,
        dataFilter,
        insights: marketAvailability,
        searchTerm: deferredSearchTerm,
        sourceFilter: effectiveSourceFilter,
        statusFilter,
        viewTab,
      });
    },
    [activeLeads, baseFilteredLeads, dataFilter, dataQualityFilter, deferredSearchTerm, doneLeads, effectiveSourceFilter, marketAvailability, statusFilter, viewTab],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("seller-signal:lead-sort", JSON.stringify(sortOption));
    } catch {
      /* ignore */
    }
  }, [sortOption]);

  const totalCount = Number(leadsData.totalCount || 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedLeads = filteredLeads;
  const visibleLeadCount = dataFilter === "all" && dataQualityFilter === "all"
    ? totalCount
    : filteredLeads.length;

  const sourceCounts = leadsData.sourceCounts || EMPTY_SOURCE_COUNTS;

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

  const fetchError = getErrorMessage(
    leadsQuery.error
    || leadSourcesQuery.error
    || buildingAliasesQuery.error
    || cleanupLeadsQuery.error
    || cachedBuildingsQuery.error
    || whatsappAccountsQuery.error,
  );
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
  const loading = leadsQuery.isPending && !leadsQuery.data;
  const refreshing =
    (leadsQuery.isFetching && !leadsQuery.isPending)
    || (insightsQuery.isFetching && insightTargets.length > 0);
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
    connectWhatsAppAccountMutation,
    connectedWhatsAppAccount,
    sendWhatsAppMessageMutation,
    sheetUrl,
    toggleSentMutation,
    totalPages,
    updateLeadMutation,
    updateLeadStatusMutation,
    upsertBuildingAliasMutation,
    userId,
    setters: {
      setActionError,
      setActionNotice,
      setAddingLead,
      setCopiedLeadId,
      setCurrentPage,
      setDataFilter,
      setDataQualityFilter,
      setDeletingLeadId,
      setEditingLeadDraft,
      setEditingLeadId,
      setExpandedLeads,
      setImporting,
      setImportingLegacy,
      setImportingSourceId,
      setLastImportReport,
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
    buildingAliases,
    cachedBuildings: cachedBuildingsQuery.data || EMPTY_CACHED_BUILDINGS,
    copiedLeadId,
    cleanupLeads,
    connectedWhatsAppAccount,
    connectingWhatsAppAccount: connectWhatsAppAccountMutation.isPending,
    dataFilter,
    dataQualityFilter,
    dataQualitySummary,
    deletingLeadId,
    doneLeads,
    editingLeadDraft,
    editingLeadId,
    error,
    expandedLeads,
    filteredLeads,
    filteredLeadCount: visibleLeadCount,
    hasLeads: totalCount > 0 || leads.length > 0,
    importing,
    importingLegacy,
    importingSourceId,
    insights,
    lastImportReport,
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
    savingBuildingAliasName: upsertBuildingAliasMutation.isPending
      ? upsertBuildingAliasMutation.variables?.aliasName
      : null,
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
