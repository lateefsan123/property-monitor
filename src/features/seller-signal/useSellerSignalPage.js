import { useDeferredValue, useEffect, useEffectEvent, useMemo, useState } from "react";
import { WHATSAPP_OPEN_DELAY_MS } from "./constants";
import { buildMessage, formatPhoneForWhatsApp } from "./insight-utils";
import { filterLeads, paginateLeads, splitLeadsBySentStatus } from "./selectors";
import { fetchLeadInsights, fetchUserLeads, persistLeadSentState, replaceUserLeadsFromSheet } from "./services";

export function useSellerSignalPage(userId) {
  const [leads, setLeads] = useState([]);
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState(null);
  const [showDueOnly, setShowDueOnly] = useState(true);
  const [copiedLeadId, setCopiedLeadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sentLeads, setSentLeads] = useState({});
  const [sheetUrl, setSheetUrl] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [viewTab, setViewTab] = useState("active");
  const [dataFilter, setDataFilter] = useState("all");
  const [expandedLeads, setExpandedLeads] = useState({});
  const deferredSearchTerm = useDeferredValue(searchTerm);

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

  const loadLeadsOnMount = useEffectEvent(() => {
    void loadLeadsIntoState(true);
  });

  useEffect(() => {
    loadLeadsOnMount();
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
        statusFilter,
        viewTab,
      }),
    [activeLeads, dataFilter, deferredSearchTerm, doneLeads, insights, showDueOnly, statusFilter, viewTab],
  );

  const { totalPages, safePage, pagedLeads } = useMemo(
    () => paginateLeads(filteredLeads, currentPage),
    [currentPage, filteredLeads],
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

  async function importFromSheet() {
    setImporting(true);
    setError(null);

    try {
      await replaceUserLeadsFromSheet(userId, sheetUrl);
      setShowImport(false);
      setSheetUrl("");
      await loadLeadsIntoState(false);
    } catch (importError) {
      setError(importError.message);
    } finally {
      setImporting(false);
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
    insights,
    isAllExpanded,
    loading,
    pagedLeads,
    safePage,
    searchTerm,
    sendAllCount,
    sentLeads,
    sheetUrl,
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
      selectDataFilter,
      selectStatusFilter,
      selectViewTab,
      setDueOnly,
      toggleAllExpanded,
      toggleImportPanel,
      toggleLeadExpanded,
      toggleSent,
      updateSearchTerm,
      updateSheetUrl,
    },
  };
}
