import { useDeferredValue, useEffect, useEffectEvent, useMemo, useState } from "react";
import { WHATSAPP_OPEN_DELAY_MS } from "./constants";
import { buildMessage, formatPhoneForWhatsApp } from "./insight-utils";
import { filterLeads, paginateLeads, splitLeadsBySentStatus } from "./selectors";
import {
  createDefaultLeadSources,
  fetchLeadInsights,
  fetchLeadSources,
  fetchUserLeads,
  persistLeadSentState,
  replaceUserLeadsFromSheet,
  upsertLeadSource,
} from "./services";

export function useSellerSignalPage(userId) {
  const [leads, setLeads] = useState([]);
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importingSourceId, setImportingSourceId] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState(null);
  const [showDueOnly, setShowDueOnly] = useState(true);
  const [copiedLeadId, setCopiedLeadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sentLeads, setSentLeads] = useState({});
  const [sheetUrl, setSheetUrl] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [viewTab, setViewTab] = useState("active");
  const [dataFilter, setDataFilter] = useState("all");
  const [expandedLeads, setExpandedLeads] = useState({});
  const [leadSources, setLeadSources] = useState([]);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const MAX_LEAD_SOURCES = 4;

  function limitLeadSources(sources) {
    if (!Array.isArray(sources)) return [];
    const sorted = [...sources].sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
    const personal = sorted.find((source) => source.type === "personal");
    const buildings = sorted.filter((source) => source.type !== "personal");
    const selected = [];

    if (personal) selected.push(personal);
    for (const source of buildings) {
      if (selected.length >= MAX_LEAD_SOURCES) break;
      selected.push(source);
    }

    if (!selected.length) return sorted.slice(0, MAX_LEAD_SOURCES);
    return selected;
  }

  async function loadLeadsIntoState(showLoader = true) {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      const { leads: nextLeads, sentMap } = await fetchUserLeads(userId);
      setLeads(nextLeads);
      setSentLeads(sentMap);
      setInsights({});
      setExpandedLeads({});
      setCurrentPage(1);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function loadSourcesIntoState() {
    if (!userId) return;
    try {
      let sources = await fetchLeadSources(userId);
      if (!sources.length) {
        await createDefaultLeadSources(userId);
        sources = await fetchLeadSources(userId);
      }
      const limitedSources = limitLeadSources(sources);
      setLeadSources(limitedSources);
      setSourceFilter((current) => {
        if (current === "all") return "all";
        return limitedSources.some((source) => source.id === current) ? current : "all";
      });
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  const loadLeadsOnMount = useEffectEvent(() => {
    void loadLeadsIntoState(true);
  });

  useEffect(() => {
    loadLeadsOnMount();
    void loadSourcesIntoState();
  }, [userId]);

  async function enrichLeadData() {
    const targetLeads = leads.filter((lead) => lead.building);
    if (!targetLeads.length) {
      setError("No leads with a building name.");
      return;
    }

    setEnriching(true);
    setError(null);
    setInsights((previousInsights) => {
      const nextInsights = { ...previousInsights };
      for (const lead of targetLeads) {
        nextInsights[lead.id] = { ...previousInsights[lead.id], status: "loading" };
      }
      return nextInsights;
    });

    try {
      const { hasTargets, matched, updates } = await fetchLeadInsights(targetLeads);
      if (!hasTargets) {
        setError("No leads with a building name.");
        setInsights({});
        return;
      }

      setInsights((previousInsights) => ({ ...previousInsights, ...updates }));
      if (matched === 0) {
        setError("Property market data is not available for these buildings yet.");
      }
    } catch (enrichmentError) {
      setError(enrichmentError.message);
      setInsights((previousInsights) => {
        const nextInsights = { ...previousInsights };
        for (const lead of targetLeads) {
          nextInsights[lead.id] = {
            ...previousInsights[lead.id],
            status: "error",
            error: enrichmentError.message,
            message: buildMessage(lead, null),
          };
        }
        return nextInsights;
      });
    } finally {
      setEnriching(false);
    }
  }

  const autoEnrichLeads = useEffectEvent(() => {
    const hasInsights = Object.keys(insights).length > 0;
    if (loading || enriching || !leads.length || hasInsights) return;
    void enrichLeadData();
  });

  useEffect(() => {
    autoEnrichLeads();
  }, [enriching, insights, leads, loading]);

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
        sourceFilter,
        statusFilter,
        viewTab,
      }),
    [activeLeads, dataFilter, deferredSearchTerm, doneLeads, insights, showDueOnly, sourceFilter, statusFilter, viewTab],
  );

  const { totalPages, safePage, pagedLeads } = useMemo(
    () => paginateLeads(filteredLeads, currentPage),
    [currentPage, filteredLeads],
  );

  const sourceCounts = useMemo(() => {
    const counts = {};
    for (const lead of leads) {
      if (!lead.sourceId) continue;
      counts[lead.sourceId] = (counts[lead.sourceId] || 0) + 1;
    }
    return counts;
  }, [leads]);

  const sourceOptions = useMemo(
    () =>
      (leadSources || []).map((source) => ({
        id: source.id,
        label: source.type === "personal"
          ? (source.label || "Personal")
          : (source.building_name || source.label || "Building"),
      })),
    [leadSources],
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
    setSheetUrl(value);
  }

  function updateLeadSourceField(sourceId, field, value) {
    setLeadSources((previous) =>
      previous.map((source) =>
        source.id === sourceId
          ? { ...source, [field]: value }
          : source,
      ),
    );
  }

  async function persistLeadSource(sourceId) {
    const source = leadSources.find((item) => item.id === sourceId);
    if (!source) return;

    try {
      await upsertLeadSource(source);
    } catch (persistError) {
      setError(persistError.message);
    }
  }

  async function importFromSheet(sourceId = null) {
    setImporting(true);
    setImportingSourceId(sourceId);
    setError(null);

    try {
      if (sourceId) {
        await persistLeadSource(sourceId);
      }
      const source = sourceId ? leadSources.find((item) => item.id === sourceId) : null;
      await replaceUserLeadsFromSheet({
        userId,
        source,
        rawSheetUrl: sourceId ? source?.sheet_url : sheetUrl,
      });
      setShowImport(false);
      setSheetUrl("");
      await loadLeadsIntoState(false);
    } catch (importError) {
      setError(importError.message);
    } finally {
      setImporting(false);
      setImportingSourceId(null);
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
      await persistLeadSentState(userId, leadId, shouldMarkSent);
    } catch (persistError) {
      setError(persistError.message);
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
      setError("Clipboard copy failed.");
    }
  }

  return {
    activeLeads,
    copiedLeadId,
    dataFilter,
    doneLeads,
    error,
    expandedLeads,
    filteredLeads,
    hasLeads: leads.length > 0,
    importing,
    importingSourceId,
    insights,
    isAllExpanded,
    loading,
    pagedLeads,
    safePage,
    searchTerm,
    sendAllCount,
    sentLeads,
    sheetUrl,
    leadSources,
    sourceCounts,
    sourceOptions,
    sourceFilter,
    showDueOnly,
    showImport,
    statusFilter,
    totalPages,
    viewTab,
    actions: {
      bulkWhatsApp,
      copyMessage,
      goToNextPage,
      goToPreviousPage,
      importFromSheet,
      persistLeadSource,
      selectDataFilter,
      selectSourceFilter,
      selectStatusFilter,
      selectViewTab,
      setDueOnly,
      toggleAllExpanded,
      toggleImportPanel,
      toggleLeadExpanded,
      toggleSent,
      updateLeadSourceField,
      updateSearchTerm,
      updateSheetUrl,
    },
  };
}
