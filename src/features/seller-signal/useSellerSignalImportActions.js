import {
  EMPTY_SOURCES,
  formatImportErrorMessage,
  formatImportSuccessMessage,
  formatSourceLabel,
  getErrorMessage,
  LEGACY_SOURCE_LABEL,
  normalizeSourceDraft,
} from "./page-helpers";
import {
  sellerInsightsQueryPrefix,
  sellerLeadsQueryKey,
  sellerSourcesQueryKey,
} from "./queryKeys";

export function createSellerSignalImportActions(context) {
  const {
    filteredLeads,
    importLeadsMutation,
    importLegacyLeadsMutation,
    importing,
    isAllExpanded,
    leadSources,
    legacySheetStorageKey,
    legacySheetUrl,
    persistLeadSourceMutation,
    queryClient,
    sheetUrl,
    totalPages,
    userId,
    setters,
  } = context;

  const {
    setActionError,
    setActionNotice,
    setCopiedLeadId,
    setCurrentPage,
    setDataFilter,
    setEditingLeadDraft,
    setEditingLeadId,
    setExpandedLeads,
    setImporting,
    setImportingLegacy,
    setImportingSourceId,
    setLegacySheetUrlState,
    setSearchTerm,
    setSheetUrl,
    setShowImport,
    setSourceFilter,
    setStatusFilter,
    setViewTab,
  } = setters;

  function resetPaging() {
    setCurrentPage(1);
  }

  function clearEditingState() {
    setExpandedLeads({});
    setEditingLeadId(null);
    setEditingLeadDraft(null);
    setCopiedLeadId(null);
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
    setActionNotice(null);
    setSheetUrl(value);
  }

  function updateLeadSourceField(sourceId, field, value) {
    setActionNotice(null);
    queryClient.setQueryData(sellerSourcesQueryKey(userId), (current) =>
      (current || EMPTY_SOURCES).map((source) =>
        source.id === sourceId
          ? field === "building_name"
            ? { ...source, label: value, building_name: null }
            : { ...source, [field]: value }
          : source,
      ));
  }

  async function persistLeadSource(sourceId) {
    const source = leadSources.find((item) => item.id === sourceId);
    if (!source) return;

    setActionError(null);
    setActionNotice(null);
    try {
      await persistLeadSourceMutation.mutateAsync(normalizeSourceDraft(source));
      await queryClient.invalidateQueries({ queryKey: sellerSourcesQueryKey(userId) });
    } catch (persistError) {
      setActionError(getErrorMessage(persistError));
    }
  }

  function updateLegacySheetUrl(value) {
    const next = String(value || "");
    setActionNotice(null);
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
      setActionNotice(null);
      return;
    }

    setImportingLegacy(true);
    setActionError(null);
    setActionNotice(null);

    try {
      const result = await importLegacyLeadsMutation.mutateAsync({ rawSheetUrl: trimmed });
      clearEditingState();
      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
      setActionNotice(formatImportSuccessMessage(LEGACY_SOURCE_LABEL, result));
    } catch (importError) {
      setActionError(formatImportErrorMessage(LEGACY_SOURCE_LABEL, getErrorMessage(importError)));
    } finally {
      setImportingLegacy(false);
    }
  }

  async function importFromSheet(sourceId = null) {
    if (importing) return;

    setImporting(true);
    setImportingSourceId(sourceId);
    setActionError(null);
    setActionNotice(null);

    try {
      const source = sourceId ? leadSources.find((item) => item.id === sourceId) : null;
      const sourceLabel = formatSourceLabel(source);
      if (sourceId && source) {
        await persistLeadSourceMutation.mutateAsync(normalizeSourceDraft(source));
      }

      const result = await importLeadsMutation.mutateAsync({
        source: normalizeSourceDraft(source),
        rawSheetUrl: sourceId ? source?.sheet_url : sheetUrl,
      });

      setShowImport(false);
      setSheetUrl("");
      clearEditingState();
      await queryClient.invalidateQueries({ queryKey: sellerLeadsQueryKey(userId) });
      queryClient.removeQueries({ queryKey: sellerInsightsQueryPrefix(userId) });
      setActionNotice(formatImportSuccessMessage(sourceLabel, result));
    } catch (importError) {
      const source = sourceId ? leadSources.find((item) => item.id === sourceId) : null;
      setActionError(formatImportErrorMessage(formatSourceLabel(source), getErrorMessage(importError)));
    } finally {
      setImporting(false);
      setImportingSourceId(null);
    }
  }

  return {
    goToNextPage,
    goToPreviousPage,
    importFromSheet,
    importLegacySheet,
    persistLeadSource,
    selectDataFilter,
    selectSourceFilter,
    selectStatusFilter,
    selectViewTab,
    toggleAllExpanded,
    toggleImportPanel,
    toggleLeadExpanded,
    updateLegacySheetUrl,
    updateLeadSourceField,
    updateSearchTerm,
    updateSheetUrl,
  };
}
