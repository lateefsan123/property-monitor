import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ENRICH_CHUNK_SIZE, WHATSAPP_OPEN_DELAY_MS } from "./constants";
import { buildMessage, formatPhoneForWhatsApp } from "./insight-utils";
import { applyLeadEdits, applyLeadStatus, formatDateInputValue, sortLeadsByPriority } from "./lead-utils";
import { filterLeads, paginateLeads, splitLeadsBySentStatus } from "./selectors";
import { useAutoSheetSync } from "./useAutoSheetSync";
import { leadsQueryKey } from "./useHomeLeadSummary";
import {
  clearLeadsForSource,
  createLeadSource,
  deleteLeadSource,
  deleteLead,
  insertLead,
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

export function leadSourcesQueryKey(userId) {
  return ["seller-signal", "lead-sources", userId];
}

const MAX_LEAD_SOURCES = 10;
const LEGACY_SOURCE_ID = "legacy";
const LEGACY_SOURCE_LABEL = "Legacy spreadsheet";

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

function getErrorMessage(error) {
  if (!error) return "Unexpected error";
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

function formatImportSuccessMessage(label, result) {
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

function formatImportErrorMessage(label, message) {
  return label ? `Import failed for ${label}: ${message}` : `Import failed: ${message}`;
}

export function useSellerSignalPage(userId) {
  const legacySheetStorageKey = userId ? `seller-signal:legacy-sheet-url:${userId}` : null;
  const queryClient = useQueryClient();
  useAutoSheetSync(userId);
  const [leads, setLeads] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(true);
  const [addingSource, setAddingSource] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingSourceId, setImportingSourceId] = useState(null);
  const [importingLegacy, setImportingLegacy] = useState(false);
  const [savingSourceId, setSavingSourceId] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showDueOnly, setShowDueOnly] = useState(true);
  const [copiedLeadId, setCopiedLeadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("prospect");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sentLeads, setSentLeads] = useState({});
  const [legacySheetUrl, setLegacySheetUrl] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [viewTab, setViewTab] = useState("active");
  const [dataFilter, setDataFilter] = useState("with_data");
  const [expandedLeads, setExpandedLeads] = useState({});
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [editingLeadDraft, setEditingLeadDraft] = useState(null);
  const [savingLeadId, setSavingLeadId] = useState(null);
  const [deletingLeadId, setDeletingLeadId] = useState(null);
  const [clearingSourceId, setClearingSourceId] = useState(null);
  const [addingLead, setAddingLead] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const hasAutoEnriched = useRef(false);

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
    queryKey: leadsQueryKey(userId),
    queryFn: () => fetchUserLeads(userId),
    enabled: Boolean(userId),
  });

  const sourcesQuery = useQuery({
    queryKey: leadSourcesQueryKey(userId),
    queryFn: () => fetchSellerSources(userId),
    enabled: Boolean(userId),
  });

  const reloadLeads = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: leadsQueryKey(userId) }),
      queryClient.invalidateQueries({ queryKey: leadSourcesQueryKey(userId) }),
    ]);
  }, [queryClient, userId]);

  useEffect(() => {
    if (!userId) {
      setLeads([]);
      setLeadSources([]);
      setSentLeads({});
      setInsights({});
      setExpandedLeads({});
      setEditingLeadId(null);
      setEditingLeadDraft(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(leadsQuery.isPending || sourcesQuery.isPending);

    const queryError = leadsQuery.error || sourcesQuery.error;
    if (queryError) {
      setError(getErrorMessage(queryError));
      return;
    }

    if (leadsQuery.data && sourcesQuery.data) {
      setLeads(leadsQuery.data.leads);
      setSentLeads(leadsQuery.data.sentMap);
      setLeadSources(sourcesQuery.data);
      setError(null);
    }
  }, [
    leadsQuery.data,
    leadsQuery.error,
    leadsQuery.isPending,
    sourcesQuery.data,
    sourcesQuery.error,
    sourcesQuery.isPending,
    userId,
  ]);

  useEffect(() => {
    if (!leadsQuery.isFetching || leadsQuery.isPending) return;
    setInsights({});
    setExpandedLeads({});
    setEditingLeadId(null);
    setEditingLeadDraft(null);
    setCurrentPage(1);
    hasAutoEnriched.current = false;
  }, [leadsQuery.isFetching, leadsQuery.isPending]);

  useEffect(() => {
    if (!legacySheetStorageKey) {
      setLegacySheetUrl("");
      return undefined;
    }

    let cancelled = false;
    AsyncStorage.getItem(legacySheetStorageKey)
      .then((stored) => {
        if (!cancelled) setLegacySheetUrl(stored || "");
      })
      .catch(() => {
        if (!cancelled) setLegacySheetUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [legacySheetStorageKey]);

  const enrichLeads = useCallback(async (targetLeads) => {
    if (!targetLeads.length) return;

    setEnriching(true);
    setError(null);
    setInsights((previousInsights) => {
      const nextInsights = { ...previousInsights };
      for (const lead of targetLeads) {
        nextInsights[lead.id] = {
          ...previousInsights[lead.id],
          status: "loading",
          error: null,
          message: buildMessage(lead, null),
        };
      }
      return nextInsights;
    });

    let anyChunkHadTargets = false;
    let totalMatched = 0;

    try {
      for (let index = 0; index < targetLeads.length; index += ENRICH_CHUNK_SIZE) {
        const chunk = targetLeads.slice(index, index + ENRICH_CHUNK_SIZE);
        const { hasTargets, matched, updates } = await fetchLeadInsights(chunk);
        if (hasTargets) anyChunkHadTargets = true;
        totalMatched += matched;
        setInsights((previousInsights) => ({ ...previousInsights, ...updates }));
      }

      if (!anyChunkHadTargets) {
        setError("No leads with a building name.");
        setInsights((previousInsights) => {
          const nextInsights = { ...previousInsights };
          for (const lead of targetLeads) delete nextInsights[lead.id];
          return nextInsights;
        });
        return;
      }

      if (totalMatched === 0) {
        setError("Property market data is not available for these buildings yet.");
      }
    } catch (enrichmentError) {
      const message = getErrorMessage(enrichmentError);
      setError(message);
      setInsights((previousInsights) => {
        const nextInsights = { ...previousInsights };
        for (const lead of targetLeads) {
          if (nextInsights[lead.id]?.status === "ready") continue;
          nextInsights[lead.id] = {
            ...previousInsights[lead.id],
            status: "error",
            error: message,
            message: buildMessage(lead, null),
          };
        }
        return nextInsights;
      });
    } finally {
      setEnriching(false);
    }
  }, []);

  const enrichLeadData = useCallback(async () => {
    const targetLeads = leads.filter((lead) => lead.building);
    if (!targetLeads.length) {
      setError("No leads with a building name.");
      return;
    }

    await enrichLeads(targetLeads);
  }, [enrichLeads, leads]);

  useEffect(() => {
    if (loading || enriching || !leads.length || hasAutoEnriched.current) return;
    if (Object.keys(insights).length > 0) return;
    hasAutoEnriched.current = true;
    void enrichLeadData();
  }, [enrichLeadData, enriching, insights, leads, loading]);

  const hasLegacyLeads = useMemo(() => leads.some((lead) => !lead.sourceId), [leads]);
  const effectiveSourceFilter = useMemo(
    () => {
      if (sourceFilter === "all") return "all";
      if (sourceFilter === LEGACY_SOURCE_ID) return hasLegacyLeads ? LEGACY_SOURCE_ID : "all";
      return leadSources.some((source) => source.id === sourceFilter) ? sourceFilter : "all";
    },
    [hasLegacyLeads, leadSources, sourceFilter],
  );

  const { activeLeads, doneLeads } = useMemo(
    () => splitLeadsBySentStatus(leads, sentLeads, insights),
    [insights, leads, sentLeads],
  );

  const filteredLeads = useMemo(
    () =>
      filterLeads({
        activeLeads,
        doneLeads,
        dataFilter,
        insights,
        searchTerm: deferredSearchTerm,
        showDueOnly,
        sourceFilter: effectiveSourceFilter,
        statusFilter,
        viewTab,
      }),
    [activeLeads, dataFilter, deferredSearchTerm, doneLeads, effectiveSourceFilter, insights, showDueOnly, statusFilter, viewTab],
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
  const canAddSource = leadSources.length < MAX_LEAD_SOURCES;

  const sourceOptions = useMemo(
    () => {
      const options = leadSources.map((source) => ({
        id: source.id,
        label: formatSourceLabel(source) || `Sheet ${Number(source.sort_order ?? 0) + 1}`,
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

  function setDueOnly(value) {
    setShowDueOnly(value);
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
    setNotice(null);
    setSheetUrl(value);
  }

  function updateLeadSourceField(sourceId, field, value) {
    setNotice(null);
    setLeadSources((current) =>
      current.map((source) => (
        source.id === sourceId
          ? field === "building_name"
            ? { ...source, label: value, building_name: null }
            : { ...source, [field]: value }
          : source
      )),
    );
  }

  async function addSource() {
    if (!canAddSource) {
      setError(`You can add up to ${MAX_LEAD_SOURCES} spreadsheets.`);
      setNotice(null);
      return;
    }

    setAddingSource(true);
    setError(null);
    setNotice(null);
    try {
      await createLeadSource(userId, {
        label: `Spreadsheet ${getNextLeadSourceSortOrder(leadSources) + 1}`,
        sort_order: getNextLeadSourceSortOrder(leadSources),
      });
      await queryClient.invalidateQueries({ queryKey: leadSourcesQueryKey(userId) });
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setAddingSource(false);
    }
  }

  async function persistLeadSource(sourceId) {
    const source = leadSources.find((item) => item.id === sourceId);
    if (!source) return;

    setSavingSourceId(sourceId);
    setError(null);
    setNotice(null);

    try {
      await upsertLeadSource(normalizeSourceDraft(source));
      await queryClient.invalidateQueries({ queryKey: leadSourcesQueryKey(userId) });
    } catch (persistError) {
      setError(getErrorMessage(persistError));
    } finally {
      setSavingSourceId(null);
    }
  }

  async function clearSource(sourceId) {
    const source = leadSources.find((item) => item.id === sourceId);
    if (!source) return;

    setClearingSourceId(sourceId);
    setError(null);
    setNotice(null);
    try {
      await clearLeadsForSource(userId, sourceId);
      await deleteLeadSource(userId, sourceId);
      await reloadLeads();
      setNotice("Spreadsheet removed.");
    } catch (clearError) {
      setError(getErrorMessage(clearError));
    } finally {
      setClearingSourceId(null);
    }
  }

  function updateLegacySheetUrl(value) {
    const next = String(value || "");
    setNotice(null);
    setLegacySheetUrl(next);
    if (!legacySheetStorageKey) return;
    const task = next
      ? AsyncStorage.setItem(legacySheetStorageKey, next)
      : AsyncStorage.removeItem(legacySheetStorageKey);
    void task.catch(() => {});
  }

  async function importLegacySheet() {
    const trimmed = legacySheetUrl.trim();
    if (!trimmed) {
      setError("Paste a Google Sheet URL first.");
      setNotice(null);
      return;
    }

    setImportingLegacy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await replaceLegacyLeadsFromSheet({ userId, rawSheetUrl: trimmed });
      setCopiedLeadId(null);
      await reloadLeads();
      setNotice(formatImportSuccessMessage(LEGACY_SOURCE_LABEL, result));
    } catch (importError) {
      setError(formatImportErrorMessage(LEGACY_SOURCE_LABEL, getErrorMessage(importError)));
    } finally {
      setImportingLegacy(false);
    }
  }

  async function importFromSheet(sourceId = null) {
    setImporting(true);
    setImportingSourceId(sourceId);
    setError(null);
    setNotice(null);

    try {
      const source = sourceId ? leadSources.find((item) => item.id === sourceId) : null;
      const sourceLabel = formatSourceLabel(source);
      if (sourceId && source) {
        await upsertLeadSource(normalizeSourceDraft(source));
      }
      const result = await replaceUserLeadsFromSheet({
        userId,
        source: normalizeSourceDraft(source),
        rawSheetUrl: sourceId ? source?.sheet_url : sheetUrl,
      });

      setShowImport(false);
      setSheetUrl("");
      setCopiedLeadId(null);
      await reloadLeads();
      setNotice(formatImportSuccessMessage(sourceLabel, result));
    } catch (importError) {
      const source = sourceId ? leadSources.find((item) => item.id === sourceId) : null;
      setError(formatImportErrorMessage(formatSourceLabel(source), getErrorMessage(importError)));
    } finally {
      setImporting(false);
      setImportingSourceId(null);
    }
  }

  async function addLead(draft) {
    const sourceId = effectiveSourceFilter;
    if (!sourceId || sourceId === "all" || sourceId === LEGACY_SOURCE_ID) {
      setError("Pick a spreadsheet first.");
      setNotice(null);
      return false;
    }

    setAddingLead(true);
    setError(null);
    setNotice(null);
    try {
      await insertLead({ userId, sourceId, fields: draft });
      await reloadLeads();
      setNotice("Seller added.");
      return true;
    } catch (addError) {
      setError(getErrorMessage(addError));
      return false;
    } finally {
      setAddingLead(false);
    }
  }

  async function toggleSent(leadId) {
    const previousSentAt = sentLeads[leadId] || null;
    const shouldMarkSent = !previousSentAt;

    setSentLeads((previous) => {
      const next = { ...previous };
      if (shouldMarkSent) {
        next[leadId] = Date.now();
      } else {
        delete next[leadId];
      }
      return next;
    });

    try {
      const persistedSentAt = await persistLeadSentState(userId, leadId, shouldMarkSent);
      setSentLeads((previous) => {
        const next = { ...previous };
        if (persistedSentAt) {
          next[leadId] = new Date(persistedSentAt).getTime();
        } else {
          delete next[leadId];
        }
        return next;
      });
      setViewTab(shouldMarkSent ? "done" : "active");
      setCurrentPage(1);
    } catch (persistError) {
      setError(getErrorMessage(persistError));
      setSentLeads((previous) => {
        const next = { ...previous };
        if (previousSentAt) {
          next[leadId] = previousSentAt;
        } else {
          delete next[leadId];
        }
        return next;
      });
    }
  }

  async function changeLeadStatus(leadId, status) {
    const previousLeads = leads;
    setError(null);
    setLeads((current) =>
      sortLeadsByPriority(
        current.map((lead) => (lead.id === leadId ? applyLeadStatus(lead, status) : lead)),
      ),
    );

    try {
      await updateLeadStatus({ userId, leadId, status });
    } catch (statusError) {
      setError(getErrorMessage(statusError));
      setLeads(previousLeads);
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
      setError("Seller needs at least a name, building, or phone number.");
      return;
    }

    const currentLead = leads.find((item) => item.id === leadId);
    if (!currentLead) return;

    const previousLeads = leads;
    const previousInsights = insights;
    const nextLead = applyLeadEdits(currentLead, editingLeadDraft);

    setSavingLeadId(leadId);
    setError(null);
    setLeads((current) =>
      sortLeadsByPriority(
        current.map((lead) => (lead.id === leadId ? nextLead : lead)),
      ),
    );
    setInsights((current) => ({
      ...current,
      [leadId]: {
        ...current[leadId],
        status: "loading",
        error: null,
        message: buildMessage(nextLead, null),
      },
    }));

    try {
      await updateLead({ userId, leadId, updates: editingLeadDraft });
      setEditingLeadId(null);
      setEditingLeadDraft(null);

      if (nextLead.building) {
        const { updates } = await fetchLeadInsights([nextLead]);
        setInsights((current) => ({ ...current, ...updates }));
      } else {
        setInsights((current) => ({
          ...current,
          [leadId]: {
            status: "error",
            error: "Property market data is not available yet.",
            message: buildMessage(nextLead, null),
          },
        }));
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      setLeads(previousLeads);
      setInsights(previousInsights);
    } finally {
      setSavingLeadId(null);
    }
  }

  async function saveNotes(leadId, notes) {
    if (!leadId) return;
    try {
      await updateLead({ userId, leadId, updates: { notes } });
      setLeads((current) => current.map((l) => (l.id === leadId ? { ...l, notes: notes.trim() || "" } : l)));
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  }

  async function removeLead(leadId) {
    const previousLeads = leads;
    const previousSentLeads = sentLeads;
    const previousInsights = insights;
    const previousExpanded = expandedLeads;

    setDeletingLeadId(leadId);
    setError(null);
    setLeads((current) => current.filter((lead) => lead.id !== leadId));
    setSentLeads((current) => {
      const next = { ...current };
      delete next[leadId];
      return next;
    });
    setInsights((current) => {
      const next = { ...current };
      delete next[leadId];
      return next;
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
      await deleteLead({ userId, leadId });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
      setLeads(previousLeads);
      setSentLeads(previousSentLeads);
      setInsights(previousInsights);
      setExpandedLeads(previousExpanded);
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

      setTimeout(() => {
        Linking.openURL(url);
      }, index * WHATSAPP_OPEN_DELAY_MS);

      if (markAsSent && !sentLeads[lead.id]) {
        void toggleSent(lead.id);
      }
    });
  }

  async function copyMessage(leadId, message) {
    try {
      await Clipboard.setStringAsync(message);
      setCopiedLeadId(leadId);
      setTimeout(() => {
        setCopiedLeadId((currentValue) => (currentValue === leadId ? null : currentValue));
      }, 1200);
    } catch {
      setError("Clipboard copy failed.");
    }
  }

  return {
    activeLeads,
    addingLead,
    copiedLeadId,
    dataFilter,
    addingSource,
    canAddSource,
    clearingSourceId,
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
    leads,
    loading,
    notice,
    pagedLeads,
    safePage,
    savingLeadId,
    savingSourceId,
    searchTerm,
    sendAllCount,
    sentLeads,
    sheetUrl,
    showDueOnly,
    showImport,
    sourceCounts,
    sourceFilter: effectiveSourceFilter,
    sourceOptions,
    statusFilter,
    totalPages,
    viewTab,
    actions: {
      addLead,
      addSource,
      bulkWhatsApp,
      cancelEditingLead,
      clearSource,
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
      setDueOnly,
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
