import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDefaultLeadSources,
  fetchLeadSources,
  fetchUserLeads,
  replaceLegacyLeadsFromSheet,
  replaceUserLeadsFromSheet,
  upsertLeadSource,
} from "./services";

const MAX_LEAD_SOURCES = 4;
const LEGACY_SOURCE_ID = "legacy";
const EMPTY_LEADS_DATA = { leads: [], sentMap: {} };
const EMPTY_LEADS = [];
const EMPTY_SOURCES = [];

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
  return normalizeSources(sources)
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

export function useSpreadsheetsPage(userId) {
  const queryClient = useQueryClient();
  const legacySheetStorageKey = userId ? `seller-signal:legacy-sheet-url:${userId}` : null;

  const [actionError, setActionError] = useState(null);
  const [importingSourceId, setImportingSourceId] = useState(null);
  const [importingLegacy, setImportingLegacy] = useState(false);
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

  const persistLeadSourceMutation = useMutation({
    mutationFn: (source) => upsertLeadSource(source),
  });
  const importLeadsMutation = useMutation({
    mutationFn: ({ source, rawSheetUrl }) => replaceUserLeadsFromSheet({ userId, source, rawSheetUrl }),
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

  function updateLeadSourceField(sourceId, field, value) {
    queryClient.setQueryData(sellerSourcesQueryKey(userId), (current) =>
      (current || EMPTY_SOURCES).map((source) =>
        source.id === sourceId ? { ...source, [field]: value } : source,
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
      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
    } catch (importError) {
      setActionError(getErrorMessage(importError));
    } finally {
      setImportingLegacy(false);
    }
  }

  async function importFromSheet(sourceId) {
    setImportingSourceId(sourceId);
    setActionError(null);
    try {
      const source = sourceId ? leadSources.find((item) => item.id === sourceId) : null;
      if (sourceId && source) {
        await persistLeadSourceMutation.mutateAsync(source);
      }
      await importLeadsMutation.mutateAsync({
        source,
        rawSheetUrl: source?.sheet_url,
      });
      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
    } catch (importError) {
      setActionError(getErrorMessage(importError));
    } finally {
      setImportingSourceId(null);
    }
  }

  return {
    error,
    loading,
    leadSources,
    sourceCounts,
    importingSourceId,
    importingLegacy,
    legacySheetUrl,
    actions: {
      importFromSheet,
      importLegacySheet,
      persistLeadSource,
      updateLeadSourceField,
      updateLegacySheetUrl,
    },
  };
}
