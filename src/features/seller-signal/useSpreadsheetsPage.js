import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearLeadsForSource,
  createLeadSource,
  deleteLeadSource,
  fetchLeadSources,
  fetchUserLeads,
  replaceLegacyLeadsFromSheet,
  replaceUserLeadsFromSheet,
  upsertLeadSource,
} from "./services";

const MAX_LEAD_SOURCES = 10;
const LEGACY_SOURCE_ID = "legacy";
const EMPTY_LEADS = [];
const EMPTY_SOURCES = [];

function getErrorMessage(error) {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "Unexpected error";
  if (typeof error?.message === "string") return error.message;
  return "Unexpected error";
}

function isPlaceholderSourceLabel(source) {
  const label = String(source?.label || "").trim();
  return Boolean(label) && /^Spreadsheet\s+\d+$/i.test(label);
}

function getSourceName(source) {
  if (!source) return "";
  const buildingName = String(source.building_name || "").trim();
  const label = String(source.label || "").trim();
  if (buildingName && (!label || isPlaceholderSourceLabel(source))) return buildingName;
  return label || buildingName || "";
}

function normalizeSourceDraft(source) {
  if (!source) return source;
  return {
    ...source,
    label: getSourceName(source),
    building_name: null,
  };
}

function formatSourceLabel(source) {
  if (!source) return "";
  const label = getSourceName(source);
  return label || `Spreadsheet ${Number(source.sort_order ?? 0) + 1}`;
}

function formatImportNotice(source, result) {
  const label = formatSourceLabel(source);
  const count = Number(result?.count || 0);
  const skippedCount = Number(result?.skippedCount || 0);
  const countText = `${count} lead${count === 1 ? "" : "s"}`;
  const skippedText = `${skippedCount} duplicate row${skippedCount === 1 ? "" : "s"}`;

  if (skippedCount > 0) {
    return label
      ? `Imported ${countText} from ${label}. Skipped ${skippedText} from the sheet.`
      : `Imported ${countText}. Skipped ${skippedText} from the sheet.`;
  }

  return label ? `Imported ${countText} from ${label}.` : `Imported ${countText}.`;
}

function sellerLeadsQueryKey(userId) {
  return ["seller-signal", "leads", userId];
}

function sellerSourcesQueryKey(userId) {
  return ["seller-signal", "sources", userId];
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

function isVisibleSource(source) {
  return Boolean(String(source?.building_name || source?.label || source?.sheet_url || "").trim());
}

function limitLeadSources(sources) {
  if (!Array.isArray(sources)) return [];
  return normalizeSources(sources)
    .filter(isVisibleSource)
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    .slice(0, MAX_LEAD_SOURCES);
}

function getNextLeadSourceSortOrder(sources) {
  if (!Array.isArray(sources) || !sources.length) return 0;
  return sources.reduce((max, source) => Math.max(max, Number(source.sort_order ?? -1)), -1) + 1;
}

async function fetchSellerSources(userId) {
  const sources = await fetchLeadSources(userId);
  return limitLeadSources(sources);
}

export function useSpreadsheetsPage(userId) {
  const queryClient = useQueryClient();
  const legacySheetStorageKey = userId ? `seller-signal:legacy-sheet-url:${userId}` : null;

  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [addingSource, setAddingSource] = useState(false);
  const [importingSourceId, setImportingSourceId] = useState(null);
  const [importingLegacy, setImportingLegacy] = useState(false);
  const [clearingSourceId, setClearingSourceId] = useState(null);
  const [sourceFeedbackById, setSourceFeedbackById] = useState({});
  const [legacyFeedback, setLegacyFeedback] = useState({ notice: null, error: null });
  const [legacySheetUrl, setLegacySheetUrlState] = useState(() => {
    if (typeof window === "undefined" || !legacySheetStorageKey) return "";
    return window.localStorage.getItem(legacySheetStorageKey) || "";
  });

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

  const leads = leadsQuery.data?.leads || EMPTY_LEADS;
  const leadSources = leadSourcesQuery.data || EMPTY_SOURCES;
  const canAddSource = leadSources.length < MAX_LEAD_SOURCES;

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

  const sourceCounts = useMemo(() => {
    const counts = {};
    for (const lead of leads) {
      const key = lead.sourceId || LEGACY_SOURCE_ID;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [leads]);

  const loading = (leadsQuery.isPending && !leadsQuery.data) || (leadSourcesQuery.isPending && !leadSourcesQuery.data);
  const fetchError = leadsQuery.error
    ? getErrorMessage(leadsQuery.error)
    : leadSourcesQuery.error
      ? getErrorMessage(leadSourcesQuery.error)
      : null;
  const error = actionError || fetchError;
  const notice = actionNotice;

  function clearSourceFeedback(sourceId) {
    if (!sourceId) return;
    setSourceFeedbackById((current) => {
      if (!current[sourceId]) return current;
      const next = { ...current };
      delete next[sourceId];
      return next;
    });
  }

  function setSourceFeedback(sourceId, feedback) {
    if (!sourceId) return;
    setSourceFeedbackById((current) => ({
      ...current,
      [sourceId]: feedback,
    }));
  }

  function clearLegacyFeedback() {
    setLegacyFeedback({ notice: null, error: null });
  }

  async function addSource(options = {}) {
    const sheetUrl = typeof options === "object" && options.sheetUrl ? String(options.sheetUrl).trim() : "";

    if (!canAddSource) {
      setActionError(`You can add up to ${MAX_LEAD_SOURCES} spreadsheets.`);
      return null;
    }

    setAddingSource(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const nextOrder = getNextLeadSourceSortOrder(leadSources);
      const created = await createLeadSource(userId, {
        label: `Spreadsheet ${nextOrder + 1}`,
        sort_order: nextOrder,
        sheet_url: sheetUrl || null,
      });
      await queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) });

      if (sheetUrl && created?.id) {
        setImportingSourceId(created.id);
        try {
          const draftSource = normalizeSourceDraft(created);
          const result = await importLeadsMutation.mutateAsync({
            source: draftSource,
            rawSheetUrl: sheetUrl,
          });
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) }),
            queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) }),
          ]);
          queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
          setActionNotice(formatImportNotice(draftSource, result));
        } catch (importError) {
          setActionError(getErrorMessage(importError));
        } finally {
          setImportingSourceId(null);
        }
      }

      return created;
    } catch (createError) {
      setActionError(getErrorMessage(createError));
      return null;
    } finally {
      setAddingSource(false);
    }
  }

  async function saveLeadSource(sourceId, fields) {
    const source = leadSources.find((item) => item.id === sourceId);
    if (!source) return;
    setActionError(null);
    setActionNotice(null);
    clearSourceFeedback(sourceId);
    try {
      await persistLeadSourceMutation.mutateAsync(normalizeSourceDraft({ ...source, ...fields }));
      await queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) });
    } catch (persistError) {
      setActionError(getErrorMessage(persistError));
    }
  }

  function updateLegacySheetUrl(value) {
    const next = String(value || "");
    setLegacySheetUrlState(next);
    clearLegacyFeedback();
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
    setActionNotice(null);
    clearLegacyFeedback();
    try {
      const result = await importLegacyLeadsMutation.mutateAsync({ rawSheetUrl: trimmed });
      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
      setLegacyFeedback({
        notice: formatImportNotice({ building_name: "Legacy spreadsheet", sort_order: 0 }, result),
        error: null,
      });
    } catch (importError) {
      setLegacyFeedback({ notice: null, error: getErrorMessage(importError) });
    } finally {
      setImportingLegacy(false);
    }
  }

  async function importFromSheet(sourceId, fields = {}) {
    setImportingSourceId(sourceId);
    setActionError(null);
    setActionNotice(null);
    clearSourceFeedback(sourceId);
    try {
      const source = sourceId ? leadSources.find((item) => item.id === sourceId) : null;
      const draftSource = source ? normalizeSourceDraft({ ...source, ...fields }) : null;
      if (sourceId && draftSource) {
        await persistLeadSourceMutation.mutateAsync(draftSource);
      }
      const result = await importLeadsMutation.mutateAsync({
        source: draftSource,
        rawSheetUrl: draftSource?.sheet_url,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) }),
      ]);
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
      setSourceFeedback(sourceId, {
        notice: formatImportNotice(draftSource, result),
        error: null,
      });
    } catch (importError) {
      setSourceFeedback(sourceId, {
        notice: null,
        error: getErrorMessage(importError),
      });
    } finally {
      setImportingSourceId(null);
    }
  }

  async function clearSource(sourceId) {
    const source = leadSources.find((item) => item.id === sourceId);
    if (!source) return;
    const label = formatSourceLabel(source) || "this source";
    const count = sourceCounts[sourceId] || 0;
    const confirmed = window.confirm(
      `Remove "${label}"? This will delete ${count} lead${count === 1 ? "" : "s"} and remove the spreadsheet from the list.`,
    );
    if (!confirmed) return;

    setClearingSourceId(sourceId);
    setActionError(null);
    setActionNotice(null);
    try {
      await clearLeadsForSource(userId, sourceId);
      await deleteLeadSource(userId, sourceId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) }),
      ]);
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
    } catch (clearError) {
      setActionError(getErrorMessage(clearError));
    } finally {
      setClearingSourceId(null);
    }
  }

  return {
    error,
    notice,
    loading,
    canAddSource,
    addingSource,
    leadSources,
    sourceCounts,
    importingSourceId,
    importingLegacy,
    clearingSourceId,
    legacySheetUrl,
    sourceFeedbackById,
    legacyNotice: legacyFeedback.notice,
    legacyError: legacyFeedback.error,
    actions: {
      addSource,
      clearSource,
      importFromSheet,
      importLegacySheet,
      saveLeadSource,
      updateLegacySheetUrl,
    },
  };
}
