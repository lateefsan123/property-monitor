import { MAX_LEAD_SOURCES, LEGACY_SOURCE_ID, EMPTY_LEADS, EMPTY_SOURCES, normalizeSourceDraft, formatSourceLabel, formatImportNotice, sellerLeadsQueryKey, sellerSourcesQueryKey, sellerInsightsQueryPrefix, getNextLeadSourceSortOrder, fetchSellerSources } from "./spreadsheet-page-helpers";
import { userFacingError, UserFacingError } from "../../../shared/user-facing-errors.js";
import { prepareImportRows, validateImportMapping } from "./import-preview.js";
import { useMemo, useRef, useState } from "react";
import { replaceUserLeadsFromRows } from "./lead-import-services";
import { fetchSourceSellerCounts } from "./lead-record-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearLeadsForSource,
  createLeadSource,
  deleteLeadSource,
  fetchUserLeads,
  replaceLegacyLeadsFromSheet,
  replaceUserLeadsFromSheet,
  upsertLeadSource,
} from "./services";

const getErrorMessage = userFacingError;

export function useSpreadsheetsPage(userId) {
  const queryClient = useQueryClient();
  const pendingFileSource = useRef(null);
  const fileImportBusy = useRef(false);
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

  // Counted in the database, under the leads key so every refresh of the
  // seller list refreshes these too; falls back to the loaded list.
  const sourceIdsKey = leadSources.map((source) => source.id).join(",");
  const sourceCountsQuery = useQuery({
    queryKey: [...sellerLeadsQueryKey(userId), "source-counts", sourceIdsKey],
    enabled: Boolean(userId) && leadSourcesQuery.isSuccess,
    queryFn: () => fetchSourceSellerCounts(userId, sourceIdsKey ? sourceIdsKey.split(",") : []),
    staleTime: 30 * 1000,
  });
  const sourceCounts = useMemo(() => {
    if (sourceCountsQuery.data) {
      const { legacy = 0, ...bySource } = sourceCountsQuery.data;
      return { ...bySource, [LEGACY_SOURCE_ID]: legacy };
    }
    const counts = {};
    for (const lead of leads) {
      const key = lead.sourceId || LEGACY_SOURCE_ID;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [leads, sourceCountsQuery.data]);

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
    const selectedBuildings = Array.isArray(options?.selectedBuildings) ? options.selectedBuildings : [];
    const sourceSelections = selectedBuildings.length ? selectedBuildings.map((building) => [building]) : [[]];

    if (!canAddSource || leadSources.length + sourceSelections.length > MAX_LEAD_SOURCES) {
      setActionError(`You can add ${Math.max(0, MAX_LEAD_SOURCES - leadSources.length)} more spreadsheet${MAX_LEAD_SOURCES - leadSources.length === 1 ? "" : "s"}.`);
      return null;
    }

    setAddingSource(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const nextOrder = getNextLeadSourceSortOrder(leadSources);
      const createdSources = await Promise.all(sourceSelections.map((selection, index) => (
        createLeadSource(userId, {
          label: selection[0] || `Spreadsheet ${nextOrder + index + 1}`,
          sort_order: nextOrder + index,
          sheet_url: sheetUrl || null,
          selected_buildings: selection,
        })
      )));
      const importErrors = [];
      for (let index = 0; index < createdSources.length; index += 1) {
        const selection = sourceSelections[index];
        const created = createdSources[index];
        if (sheetUrl && created?.id) {
          setImportingSourceId(created.id);
          const draftSource = normalizeSourceDraft(created);
          try {
            await importLeadsMutation.mutateAsync({
              source: draftSource,
              rawSheetUrl: sheetUrl,
            });
          } catch (importError) {
            importErrors.push(`${selection[0] || draftSource.label}: ${getErrorMessage(importError)}`);
          }
        }
      }
      setImportingSourceId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) }),
      ]);
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
      setActionNotice(`${createdSources.length} building spreadsheet${createdSources.length === 1 ? "" : "s"} added.`);
      if (importErrors.length) setActionError(`${importErrors.length} spreadsheet import${importErrors.length === 1 ? "" : "s"} failed. ${importErrors.join(" ")}`);

      return createdSources;
    } catch (createError) {
      setActionError(getErrorMessage(createError));
      return null;
    } finally {
      setImportingSourceId(null);
      setAddingSource(false);
    }
  }

  function importFile(file, rawRows) {
    return importRows({
      key: `${file.name}:${file.size}:${file.lastModified}`,
      label: file.name.replace(/\.(xlsx|xls|csv)$/i, ""),
      rawRows,
    });
  }

  // One-time import of already-read rows (uploaded file or a connected
  // Google/Excel worksheet). A retry with the same key reuses the source it
  // created, so a failed import never leaves duplicate spreadsheets.
  async function importRows({ key: rowsKey, label, rawRows, mapping, headerRowIndex, onProgress, selectedBuildings = [], sheetUrl = null }) {
    if (fileImportBusy.current) return false;
    if (!userId) throw new UserFacingError("Sign in required.");
    const preview = prepareImportRows(rawRows, { headerRowIndex });
    validateImportMapping(preview.headers, mapping || preview.mapping);
    fileImportBusy.current = true;
    setAddingSource(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const key = `${userId}:${rowsKey}`;
      if (pendingFileSource.current?.key !== key) {
        // Importing a file with the same name again continues that spreadsheet:
        // sellers already in it are matched, so only missing rows are added.
        const existing = leadSources.find((item) => (sheetUrl ? item.sheet_url === sheetUrl : !item.sheet_url) && String(item.label || "").trim() === String(label || "").trim());
        if (!existing && !canAddSource) throw new UserFacingError("You can have up to 10 spreadsheets.");
        const source = existing || await createLeadSource(userId, {
          label,
          selected_buildings: selectedBuildings,
          sheet_url: sheetUrl,
          import_options: { mapping: mapping || preview.mapping, headerRowIndex: preview.headerRowIndex },
          sort_order: getNextLeadSourceSortOrder(leadSources),
        });
        pendingFileSource.current = { key, source };
      }
      const source = { ...pendingFileSource.current.source, import_options: { mapping: mapping || preview.mapping, headerRowIndex: preview.headerRowIndex } };
      await upsertLeadSource(source);
      setImportingSourceId(source.id);
      const result = await replaceUserLeadsFromRows({ userId, source, rawRows, mapping, headerRowIndex, onProgress });
      if (result.failedCount) {
        const failure = new UserFacingError(`${result.count.toLocaleString()} sellers saved; ${result.failedCount.toLocaleString()} rows couldn’t be saved. Download those rows to check them, then import the corrected sheet again.`);
        failure.failedRows = result.failedRows;
        throw failure;
      }
      pendingFileSource.current = null;
      setActionNotice(formatImportNotice(source, result));
      return true;
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) }),
      ]);
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
      setImportingSourceId(null);
      setAddingSource(false);
      fileImportBusy.current = false;
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

  // Removes several spreadsheets and their sellers after one confirmation.
  async function removeSources(sourceIds) {
    const sources = leadSources.filter((item) => sourceIds.includes(String(item.id)));
    if (!sources.length) return false;
    const sellers = sources.reduce((sum, source) => sum + (sourceCounts[source.id] || 0), 0);
    const what = sources.length === 1 ? `"${formatSourceLabel(sources[0]) || "this spreadsheet"}"` : `${sources.length} spreadsheets`;
    if (!window.confirm(`Delete ${what} and ${sellers} seller${sellers === 1 ? "" : "s"}? This can't be undone.`)) return false;

    setActionError(null);
    setActionNotice(null);
    try {
      for (const source of sources) {
        setClearingSourceId(source.id);
        await clearLeadsForSource(userId, source.id);
        await deleteLeadSource(userId, source.id);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) }),
      ]);
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
      return true;
    } catch (removeError) {
      setActionError(getErrorMessage(removeError));
      await queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) });
      return false;
    } finally {
      setClearingSourceId(null);
    }
  }

  return {
    error,
    notice,
    loading,
    canAddSource,
    remainingSourceSlots: Math.max(0, MAX_LEAD_SOURCES - leadSources.length),
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
      importFile,
      importRows,
      addSource,
      clearSource,
      removeSources,
      importFromSheet,
      importLegacySheet,
      saveLeadSource,
      updateLegacySheetUrl,
    },
  };
}
