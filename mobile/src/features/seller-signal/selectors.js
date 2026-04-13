import { MIN_NEW_TRANSACTIONS_TO_REACTIVATE, PAGE_SIZE } from "./constants";
import { countNewTransactionsSince } from "./lead-utils";

export function splitLeadsBySentStatus(leads, sentLeads, insights) {
  const activeLeads = [];
  const doneLeads = [];

  for (const lead of leads) {
    const sentAt = sentLeads[lead.id];
    if (!sentAt) {
      activeLeads.push(lead);
      continue;
    }

    const newTransactions = countNewTransactionsSince(insights[lead.id], sentAt);
    if (newTransactions >= MIN_NEW_TRANSACTIONS_TO_REACTIVATE) {
      activeLeads.push({ ...lead, newTxSinceSent: newTransactions });
    } else {
      doneLeads.push(lead);
    }
  }

  return { activeLeads, doneLeads };
}

export function filterLeads({
  activeLeads,
  doneLeads,
  dataFilter,
  insights,
  searchTerm,
  showDueOnly,
  sourceFilter,
  statusFilter,
  viewTab,
}) {
  const isDoneView = viewTab === "done";
  const baseLeads = isDoneView ? doneLeads : activeLeads;
  let result = !isDoneView && showDueOnly ? baseLeads.filter((lead) => lead.isDue) : baseLeads;

  if (!isDoneView && statusFilter !== "all") {
    result = result.filter((lead) => lead.statusRule?.id === statusFilter);
  }

  if (!isDoneView && dataFilter === "with_data") {
    result = result.filter((lead) => insights[lead.id]?.status === "ready");
  } else if (!isDoneView && dataFilter === "no_data") {
    result = result.filter((lead) => insights[lead.id]?.status !== "ready");
  }

  if (sourceFilter && sourceFilter !== "all") {
    result = result.filter((lead) => lead.sourceId === sourceFilter);
  }

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    result = result.filter((lead) =>
      [lead.name, lead.building, lead.phone].some((value) => String(value || "").toLowerCase().includes(term)),
    );
  }

  return result;
}

export function paginateLeads(leads, currentPage, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(leads.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    totalPages,
    safePage,
    pagedLeads: leads.slice(startIndex, startIndex + pageSize),
  };
}
