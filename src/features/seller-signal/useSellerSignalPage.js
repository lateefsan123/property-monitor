import { isAutomationAccount } from "../../../supabase/functions/_shared/automation-account.js";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MAX_MEANINGFUL_OVERDUE_DAYS } from "./constants";
import { DEFAULT_MESSAGE_TEMPLATE, formatPhoneForWhatsApp, getTodayTransactionDateKey } from "./insight-utils";
import { pickTemplateForStatus } from "../../../supabase/functions/_shared/template-status.js";
import { enrichLeadsWithDataQuality, summarizeLeadDataQuality } from "./lead-data-quality";
import { buildSellerBuildingOptions, filterLeads, paginateLeads, sortLeads } from "./selectors";
import { normalizeStatusFilter } from "./status-filter-utils";
import {
  computeLeadInsights,
  connectWhatsAppAccount,
  deleteLead,
  fetchAvailableMarketBuildingKeys,
  fetchAutomationSettings,
  fetchBuildingKeysWithTransactionsOn,
  fetchBuildingMarketData,
  fetchCachedBuildings,
  fetchDldFallbackTransactions,
  fetchWhatsAppSendActivity,
  fetchUserLeads,
  fetchWhatsAppAccounts,
  getConnectedWhatsAppAccount,
  getMissingFallbackBuildingNames,
  persistLeadSentState,
  replaceLegacyLeadsFromSheet,
  replaceUserLeadsFromSheet,
  saveAutomationSettings,
  sendLeadWhatsAppMessage,
  updateLead,
  updateLeadStatus,
  upsertLeadSource,
} from "./services";
import { getBuildingKeyVariants } from "./building-utils";
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
  sellerAutomationSettingsQueryKey,
  sellerDldFallbackQueryKey,
  sellerHotBuildingsQueryKey,
  sellerLeadsQueryKey,
  sellerListQueryKey,
  sellerMarketAvailabilityQueryKey,
  sellerMarketDataQueryKey,
  sellerSendActivityQueryKey,
  sellerSourcesQueryKey,
  sellerCachedBuildingsQueryKey,
  sellerWhatsAppAccountsQueryKey,
} from "./queryKeys";
import { createSellerSignalActions } from "./useSellerSignalActions";
import { useSellerListMode } from "./seller-list-mode";
import { fetchSellerBuildingCounts, fetchSellerListPage, sellerListDay } from "./seller-list-services";
import { useSellerBuildingIndex } from "./useSellerBuildingIndex";
import { PAGE_SIZE } from "./constants";
import { useSellerSignalBuildingAliases } from "./useSellerSignalBuildingAliases";
import { useSellerSignalMessageTemplates } from "./useSellerSignalMessageTemplates";

const EMPTY_CACHED_BUILDINGS = [];
const EMPTY_KEYS = [];
const EMPTY_HOT = new Set();
const EMPTY_INSIGHTS_RESULT = { hasTargets: false, matched: 0, pending: 0, updates: {} };

function leadBuildingKeys(lead) {
  return getBuildingKeyVariants(lead.resolvedBuilding || lead.building);
}

// focusLeadId: a seller opened from elsewhere (Activity, the sidebar), loaded
// on its own when the server-side list doesn't have it on the current page.
export function useSellerSignalPage(userId, { focusLeadId = null } = {}) {
  const queryClient = useQueryClient();
  const legacySheetStorageKey = userId ? `seller-signal:legacy-sheet-url:${userId}` : null;
  const sourceFilterStorageKey = userId ? `seller-signal:source-filter:${userId}` : null;
  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [pendingHandoff, setPendingHandoff] = useState(null);
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
  const [statusFilter, setStatusFilter] = useState([]);
  const [buildingFilter, setBuildingFilter] = useState([]);
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
  const listMode = useSellerListMode(userId);
  const serverMode = listMode.mode === "server";
  const modeReady = listMode.mode !== null;
  // The server list waits for typing to pause instead of querying each key.
  const [serverSearch, setServerSearch] = useState(searchTerm);
  useEffect(() => {
    const timer = setTimeout(() => setServerSearch(searchTerm), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
  const messageTemplates = useSellerSignalMessageTemplates(userId);
  // Each seller gets the template for their status, else the default template.
  const { messageTemplate, messageTemplateImagePath } = useMemo(() => {
    const templateFor = (lead) => pickTemplateForStatus(messageTemplates.templates, lead?.status);
    return {
      messageTemplate: (lead) => templateFor(lead)?.content || messageTemplates.activeTemplateContent || DEFAULT_MESSAGE_TEMPLATE,
      messageTemplateImagePath: (lead) => templateFor(lead)?.image_path || null,
    };
  }, [messageTemplates.templates, messageTemplates.activeTemplateContent]);
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
  const automationSettingsQuery = useQuery({
    queryKey: sellerAutomationSettingsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchAutomationSettings(userId),
    staleTime: 60 * 1000,
  });
  const sendActivityQuery = useQuery({
    queryKey: sellerSendActivityQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchWhatsAppSendActivity(userId),
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
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
    queryKey: sellerLeadsQueryKey(userId),
    // Big accounts use the server-side list instead of loading every seller.
    enabled: Boolean(userId) && modeReady && !serverMode,
    queryFn: () => fetchUserLeads(userId),
    staleTime: 2 * 60 * 1000,
  });

  const leadsData = leadsQuery.data || { leads: EMPTY_LEADS, sentMap: EMPTY_SENT_MAP };
  const leads = useMemo(
    () => enrichLeadsWithDataQuality(leadsData.leads || EMPTY_LEADS, buildingAliases, cachedBuildingsQuery.data || EMPTY_CACHED_BUILDINGS, userId),
    [buildingAliases, cachedBuildingsQuery.data, leadsData.leads, userId],
  );
  // The building panel's sellers come from the list already loaded (every
  // seller with a building in the chosen spreadsheet), not a second download.
  const cleanupLeads = useMemo(
    () => leads.filter((lead) => String(lead.building || "").trim() && (effectiveSourceFilter === "all"
      || (effectiveSourceFilter === LEGACY_SOURCE_ID ? !lead.sourceId : lead.sourceId === effectiveSourceFilter))),
    [effectiveSourceFilter, leads],
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
    mutationFn: ({
      imagePath,
      customImage = false,
      lead,
      message,
      sendSource = "manual",
      requireTodaysTransaction = true,
    }) =>
      sendLeadWhatsAppMessage({
        accountId: connectedWhatsAppAccount?.id,
        imagePath,
        customImage,
        leadId: lead.id,
        message,
        phone: lead.phone,
        requireTodaysTransaction,
        sendSource,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sellerSendActivityQueryKey(userId) });
    },
  });
  const connectWhatsAppAccountMutation = useMutation({
    mutationFn: (payload) => connectWhatsAppAccount(payload),
  });
  const automationSettingsMutation = useMutation({
    mutationFn: (settings) => saveAutomationSettings(userId, settings),
    onSuccess: (settings) => {
      queryClient.setQueryData(sellerAutomationSettingsQueryKey(userId), settings);
      setActionError(null);
      setActionNotice("Automation settings updated.");
    },
    onError: (mutationError) => {
      setActionNotice(null);
      setActionError(getErrorMessage(mutationError));
    },
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

  // ---- Cadence partition: every lead is either due, scheduled, or opted out.
  const cadence = useMemo(() => {
    const due = [];
    const scheduled = [];
    const notInterested = [];
    for (const lead of leads) {
      if (lead.statusRule?.id === "not_interested") notInterested.push(lead);
      else if (lead.isDue) due.push(lead);
      else scheduled.push(lead);
    }
    scheduled.sort((left, right) => (left.nextDueDate?.getTime() || 0) - (right.nextDueDate?.getTime() || 0));
    return { due, scheduled, notInterested };
  }, [leads]);

  const todayDateKey = getTodayTransactionDateKey();
  const dueBuildingKeys = useMemo(
    () => {
      const keys = new Set();
      for (const lead of cadence.due) {
        for (const key of leadBuildingKeys(lead)) keys.add(key);
      }
      return [...keys].sort();
    },
    [cadence.due],
  );

  const hotBuildingsQuery = useQuery({
    queryKey: sellerHotBuildingsQueryKey(userId, todayDateKey, dueBuildingKeys),
    enabled: Boolean(userId) && !serverMode && dueBuildingKeys.length > 0,
    queryFn: () => fetchBuildingKeysWithTransactionsOn(dueBuildingKeys, todayDateKey),
    staleTime: 10 * 60 * 1000,
  });

  const hotLeadIds = useMemo(() => {
    const ids = new Set();
    const hotKeys = new Set(hotBuildingsQuery.data || []);
    if (!hotKeys.size) return ids;
    for (const lead of cadence.due) {
      if (leadBuildingKeys(lead).some((key) => hotKeys.has(key))) ids.add(lead.id);
    }
    return ids;
  }, [cadence.due, hotBuildingsQuery.data]);

  // Due queue order: buildings that sold today, then never-contacted, then most
  // overdue — with ancient overdue counts capped so stale imported dates don't
  // outrank genuinely fresh lapses.
  const dueLeadsOrdered = useMemo(
    () => [...cadence.due].sort((left, right) => {
      const leftHot = hotLeadIds.has(left.id);
      const rightHot = hotLeadIds.has(right.id);
      if (leftHot !== rightHot) return leftHot ? -1 : 1;
      const leftNever = !left.lastContactDate;
      const rightNever = !right.lastContactDate;
      if (leftNever !== rightNever) return leftNever ? -1 : 1;
      const leftOverdue = Math.min(left.overdueDays || 0, MAX_MEANINGFUL_OVERDUE_DAYS);
      const rightOverdue = Math.min(right.overdueDays || 0, MAX_MEANINGFUL_OVERDUE_DAYS);
      return rightOverdue - leftOverdue;
    }),
    [cadence.due, hotLeadIds],
  );

  const activeStatusIds = useMemo(() => normalizeStatusFilter(statusFilter), [statusFilter]);
  const tabLeads = useMemo(() => {
    if (viewTab === "done") return cadence.scheduled;
    // Not-interested leads live outside the cadence; surface them only when
    // that status filter is explicitly selected.
    if (activeStatusIds.includes("not_interested")) return [...dueLeadsOrdered, ...cadence.notInterested];
    return dueLeadsOrdered;
  }, [activeStatusIds, cadence.notInterested, cadence.scheduled, dueLeadsOrdered, viewTab]);

  // Every building in this tab (and spreadsheet) with its seller count.
  const buildingOptions = useMemo(
    () => buildSellerBuildingOptions(effectiveSourceFilter === "all"
      ? tabLeads
      : tabLeads.filter((lead) => (effectiveSourceFilter === LEGACY_SOURCE_ID ? !lead.sourceId : lead.sourceId === effectiveSourceFilter))),
    [effectiveSourceFilter, tabLeads],
  );

  // "Has market data" filtering needs availability across the whole tab, not
  // just the visible page — one cheap RPC, only when that filter is active.
  const tabBuildingKeys = useMemo(
    () => {
      if (dataFilter === "all") return EMPTY_KEYS;
      const keys = new Set();
      for (const lead of tabLeads) {
        for (const key of leadBuildingKeys(lead)) keys.add(key);
      }
      return [...keys].sort();
    },
    [dataFilter, tabLeads],
  );

  const marketAvailabilityQuery = useQuery({
    queryKey: sellerMarketAvailabilityQueryKey(userId, tabBuildingKeys),
    enabled: Boolean(userId) && dataFilter !== "all" && tabBuildingKeys.length > 0,
    queryFn: () => fetchAvailableMarketBuildingKeys(tabBuildingKeys),
    staleTime: 10 * 60 * 1000,
  });

  const marketAvailability = useMemo(() => {
    if (dataFilter === "all") return {};
    const availableKeys = new Set(marketAvailabilityQuery.data || []);
    const updates = {};
    for (const lead of tabLeads) {
      const hasData = Boolean(lead.building) && leadBuildingKeys(lead).some((key) => availableKeys.has(key));
      updates[lead.id] = { status: hasData ? "ready" : "error" };
    }
    return updates;
  }, [dataFilter, marketAvailabilityQuery.data, tabLeads]);

  const filteredLeads = useMemo(
    () => {
      const base = filterLeads({
        activeLeads: viewTab === "done" ? EMPTY_LEADS : tabLeads,
        buildingFilter,
        doneLeads: viewTab === "done" ? tabLeads : EMPTY_LEADS,
        dataQualityFilter,
        dataFilter,
        insights: marketAvailability,
        searchTerm: deferredSearchTerm,
        sourceFilter: effectiveSourceFilter,
        statusFilter,
        viewTab,
      });
      return sortOption.field === "alpha" ? sortLeads(base, sortOption) : base;
    },
    [buildingFilter, dataFilter, dataQualityFilter, deferredSearchTerm, effectiveSourceFilter, marketAvailability, sortOption, statusFilter, tabLeads, viewTab],
  );

  const clientPage = useMemo(
    () => paginateLeads(filteredLeads, currentPage),
    [currentPage, filteredLeads],
  );

  // Server-side list: one page plus every count, filtered and ordered by
  // seller_list_page with the same rules as above.
  const listDayKey = sellerListDay().todayKey;
  const serverParams = useMemo(() => ({
    view: viewTab,
    source: effectiveSourceFilter,
    statusIds: [...normalizeStatusFilter(statusFilter)].sort(),
    buildingKeys: [...buildingFilter].sort(),
    dataFilter,
    qualityFilter: dataQualityFilter,
    search: serverSearch,
    sortField: sortOption.field,
    sortDir: sortOption.direction,
    page: currentPage,
    pageSize: PAGE_SIZE,
    day: listDayKey,
  }), [buildingFilter, currentPage, dataFilter, dataQualityFilter, effectiveSourceFilter, listDayKey, serverSearch, sortOption.direction, sortOption.field, statusFilter, viewTab]);
  const serverListQuery = useQuery({
    queryKey: sellerListQueryKey(userId, serverParams),
    enabled: Boolean(userId) && serverMode,
    queryFn: ({ signal }) => fetchSellerListPage(userId, serverParams, signal),
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  });
  const optionsParams = useMemo(() => ({
    options: true,
    view: viewTab,
    source: effectiveSourceFilter,
    statusIds: normalizeStatusFilter(statusFilter).includes("not_interested") ? ["not_interested"] : [],
    buildingKeys: [],
    dataFilter: "all",
    qualityFilter: "all",
    search: "",
    sortField: "added",
    sortDir: "desc",
    page: 1,
    pageSize: 0,
    withBuildingOptions: true,
    day: listDayKey,
  }), [effectiveSourceFilter, listDayKey, statusFilter, viewTab]);
  const serverOptionsQuery = useQuery({
    queryKey: sellerListQueryKey(userId, optionsParams),
    enabled: Boolean(userId) && serverMode,
    queryFn: ({ signal }) => fetchSellerListPage(userId, optionsParams, signal),
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
  });
  const serverPage = serverListQuery.data;
  const focusOnPage = !focusLeadId || (serverPage?.leads || []).some((lead) => String(lead.id) === String(focusLeadId));
  const focusQuery = useQuery({
    queryKey: sellerListQueryKey(userId, { focus: String(focusLeadId), day: listDayKey }),
    enabled: Boolean(userId) && serverMode && Boolean(serverPage) && !focusOnPage,
    queryFn: ({ signal }) => fetchSellerListPage(userId, { ...serverParams, leadIds: [Number(focusLeadId)] }, signal),
    staleTime: 30 * 1000,
  });
  const buildingCountsQuery = useQuery({
    queryKey: sellerListQueryKey(userId, { buildingCounts: effectiveSourceFilter }),
    enabled: Boolean(userId) && serverMode,
    queryFn: () => fetchSellerBuildingCounts(effectiveSourceFilter),
    staleTime: 5 * 60 * 1000,
  });
  useSellerBuildingIndex(userId, buildingAliasesQuery.data, cachedBuildingsQuery.data, serverMode);
  // A missing or failing server list falls back to the full list for this visit.
  const serverFailed = serverMode && serverListQuery.isError && !serverListQuery.data;
  const { fallBack } = listMode;
  useEffect(() => { if (serverFailed) fallBack(); }, [fallBack, serverFailed]);

  const pagedLeads = serverMode ? (serverPage?.leads || EMPTY_LEADS) : clientPage.pagedLeads;
  const totalPages = serverMode ? (serverPage?.totalPages || 1) : clientPage.totalPages;
  const safePage = serverMode ? (serverPage?.safePage || 1) : clientPage.safePage;

  const insightTargets = useMemo(
    () => pagedLeads.filter((lead) => lead.building).map(buildInsightTarget),
    [pagedLeads],
  );
  const insightBuildingKeys = useMemo(
    () => {
      const keys = new Set();
      for (const target of insightTargets) {
        for (const key of getBuildingKeyVariants(target.building)) keys.add(key);
      }
      return [...keys].sort();
    },
    [insightTargets],
  );

  const marketDataQuery = useQuery({
    queryKey: sellerMarketDataQueryKey(userId, insightBuildingKeys),
    enabled: Boolean(userId) && insightBuildingKeys.length > 0,
    queryFn: () => fetchBuildingMarketData(insightBuildingKeys),
    placeholderData: (previousData) => previousData,
    staleTime: 10 * 60 * 1000,
  });

  const missingFallbackNames = useMemo(
    () => {
      if (!marketDataQuery.data || marketDataQuery.isPlaceholderData) return EMPTY_KEYS;
      const names = getMissingFallbackBuildingNames(insightTargets, marketDataQuery.data.transactionsByBuilding);
      return names.length ? names : EMPTY_KEYS;
    },
    [insightTargets, marketDataQuery.data, marketDataQuery.isPlaceholderData],
  );

  const dldFallbackQuery = useQuery({
    queryKey: sellerDldFallbackQueryKey(userId, missingFallbackNames),
    enabled: Boolean(userId) && missingFallbackNames.length > 0,
    queryFn: () => fetchDldFallbackTransactions(missingFallbackNames),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const insightsResult = useMemo(() => {
    if (!insightTargets.length) return EMPTY_INSIGHTS_RESULT;
    if (!marketDataQuery.data) {
      if (marketDataQuery.error) {
        return {
          hasTargets: true,
          matched: 0,
          pending: 0,
          updates: buildErroredInsights(insightTargets, getErrorMessage(marketDataQuery.error), messageTemplate),
        };
      }
      if (insightBuildingKeys.length) {
        return {
          hasTargets: true,
          matched: 0,
          pending: insightTargets.length,
          updates: buildLoadingInsights(insightTargets, messageTemplate),
        };
      }
      // No resolvable building keys — the query never runs, so settle as unavailable.
      return computeLeadInsights(insightTargets, null, {}, messageTemplate);
    }
    return computeLeadInsights(insightTargets, marketDataQuery.data, {
      data: dldFallbackQuery.data,
      pending: marketDataQuery.isPlaceholderData
        || (missingFallbackNames.length > 0 && !dldFallbackQuery.data && !dldFallbackQuery.error),
    }, messageTemplate);
  }, [dldFallbackQuery.data, dldFallbackQuery.error, insightBuildingKeys, insightTargets, marketDataQuery.data, marketDataQuery.error, marketDataQuery.isPlaceholderData, messageTemplate, missingFallbackNames]);

  const insights = insightsResult.updates;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("seller-signal:lead-sort", JSON.stringify(sortOption));
    } catch {
      /* ignore */
    }
  }, [sortOption]);

  const sourceCounts = useMemo(
    () => ({ legacy: leads.filter((lead) => !lead.sourceId).length }),
    [leads],
  );

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

  // What the page and actions see: the full list, or the server page plus an opened seller.
  const knownLeads = useMemo(() => {
    if (!serverMode) return leads;
    const extra = (focusQuery.data?.leads || []).filter((lead) => !pagedLeads.some((item) => item.id === lead.id));
    return extra.length ? [...pagedLeads, ...extra] : pagedLeads;
  }, [focusQuery.data, leads, pagedLeads, serverMode]);
  const listedLeads = serverMode ? pagedLeads : filteredLeads;
  const knownSentLeads = useMemo(
    () => (serverMode ? { ...(focusQuery.data?.sentMap || {}), ...(serverPage?.sentMap || {}) } : sentLeads),
    [focusQuery.data, sentLeads, serverMode, serverPage],
  );
  const cleanupBuildingCounts = useMemo(() => {
    if (!serverMode) return null;
    const counts = new Map();
    for (const row of buildingCountsQuery.data || []) counts.set(row.building_key, Number(row.sellers));
    return counts;
  }, [buildingCountsQuery.data, serverMode]);
  const isAllExpanded = listedLeads.length > 0 && listedLeads.every((lead) => expandedLeads[lead.id]);
  const sendAllCount = useMemo(
    () => pagedLeads.filter((lead) => {
      const phone = formatPhoneForWhatsApp(lead.phone);
      const insight = insights[lead.id];
      return Boolean(
        phone
        && insight?.status === "ready"
        && (insight.hasTodaysTransactions || insight.todaysRecentTransactions?.length > 0),
      );
    }).length,
    [insights, pagedLeads],
  );

  const fetchError = getErrorMessage(
    leadsQuery.error
    || leadSourcesQuery.error
    || buildingAliasesQuery.error
    || cachedBuildingsQuery.error
    || whatsappAccountsQuery.error
    || automationSettingsQuery.error
    || sendActivityQuery.error,
  );
  const insightNotice = isAutomationAccount(userId) ? null : insightTargets.length
    ? marketDataQuery.error
      ? getErrorMessage(marketDataQuery.error)
      : insightsResult.hasTargets && insightsResult.matched === 0 && insightsResult.pending === 0
        ? "Property market data is not available for these buildings yet."
        : null
    : pagedLeads.length
      ? "No leads with a building name."
      : null;
  const error = actionError || fetchError || insightNotice;
  const notice = actionNotice;
  const loading = !modeReady || (serverMode
    ? (!serverPage || (!focusOnPage && focusQuery.isPending))
    : (leadsQuery.isPending && !leadsQuery.data));
  const refreshing =
    (serverMode ? serverListQuery.isFetching && Boolean(serverPage) : (leadsQuery.isFetching && !leadsQuery.isPending))
    || (insightTargets.length > 0 && (marketDataQuery.isFetching || dldFallbackQuery.isFetching));
  const actions = createSellerSignalActions({
    addingLead,
    copiedLeadId,
    deleteLeadMutation,
    editingLeadDraft,
    editingLeadId,
    effectiveSourceFilter,
    expandedLeads,
    filteredLeads: listedLeads,
    importLeadsMutation,
    importLegacyLeadsMutation,
    importing,
    insights,
    isAllExpanded,
    leadSources,
    legacySheetStorageKey,
    legacySheetUrl,
    leads: knownLeads,
    messageTemplate,
    messageTemplateImagePath,
    pagedLeads,
    persistLeadSourceMutation,
    queryClient,
    sentLeads: knownSentLeads,
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
      setPendingHandoff,
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
      setBuildingFilter,
      setStatusFilter,
      setViewTab,
    },
  });

  return {
    addingLead,
    buildingAliases,
    cachedBuildings: cachedBuildingsQuery.data || EMPTY_CACHED_BUILDINGS,
    copiedLeadId,
    cleanupLeads,
    cleanupBuildingCounts,
    automation: {
      enabled: automationSettingsQuery.data?.autoWhatsAppEnabled !== false,
      monthlyReportsEnabled: automationSettingsQuery.data?.monthlyReportsEnabled === true,
      loading: automationSettingsQuery.isPending,
      saving: automationSettingsMutation.isPending,
      setEnabled: (enabled) => automationSettingsMutation.mutate({
        autoWhatsAppEnabled: enabled,
        monthlyReportsEnabled: automationSettingsQuery.data?.monthlyReportsEnabled === true,
      }),
      setMonthlyReportsEnabled: (enabled) => automationSettingsMutation.mutate({
        autoWhatsAppEnabled: automationSettingsQuery.data?.autoWhatsAppEnabled !== false,
        monthlyReportsEnabled: enabled,
      }),
    },
    connectedWhatsAppAccount,
    connectingWhatsAppAccount: connectWhatsAppAccountMutation.isPending,
    dataFilter,
    dataQualityFilter,
    dataQualitySummary: serverMode ? { trusted: 0, partial: 0, review: 0, ...(serverPage?.quality || {}) } : dataQualitySummary,
    deletingLeadId,
    dueCount: serverMode ? (serverPage?.counts?.due || 0) : cadence.due.length,
    editingLeadDraft,
    editingLeadId,
    error,
    expandedLeads,
    filteredLeads: listedLeads,
    filteredLeadCount: serverMode ? (serverPage?.total || 0) : filteredLeads.length,
    hasLeads: serverMode ? (serverPage?.counts?.total_leads || 0) > 0 : leads.length > 0,
    leads: knownLeads,
    hotLeadIds: serverMode ? (serverPage?.hotLeadIds || EMPTY_HOT) : hotLeadIds,
    importing,
    importingLegacy,
    importingSourceId,
    insights,
    lastImportReport,
    legacySheetUrl,
    isAllExpanded,
    leadSources,
    loading,
    messageTemplates,
    sendActivity: {
      data: sendActivityQuery.data || null,
      loading: sendActivityQuery.isPending,
    },
    notice,
    pendingHandoff,
    pagedLeads,
    refreshing,
    safePage,
    savingLeadId,
    scheduledCount: serverMode ? (serverPage?.counts?.scheduled || 0) : cadence.scheduled.length,
    searchTerm,
    sendAllCount,
    sentLeads: knownSentLeads,
    savingBuildingAliasName: upsertBuildingAliasMutation.isPending
      ? upsertBuildingAliasMutation.variables?.aliasName
      : null,
    sheetUrl,
    showImport,
    sourceCounts: serverMode ? { legacy: serverPage?.counts?.legacy || 0 } : sourceCounts,
    sourceFilter: effectiveSourceFilter,
    sourceOptions,
    buildingFilter,
    buildingOptions: serverMode ? (serverOptionsQuery.data?.buildingOptions || EMPTY_LEADS) : buildingOptions,
    statusFilter,
    totalPages,
    viewTab,
    sortOption,
    setSortOption,
    actions,
  };
}
