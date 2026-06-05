import { PAGE_SIZE } from "./constants";
import { hasStatusFilter, statusFilterMatches } from "./status-filter-utils";

export function splitLeadsBySentStatus(leads, sentLeads) {
  const activeLeads = [];
  const doneLeads = [];

  for (const lead of leads) {
    const sentAt = sentLeads[lead.id];
    if (!sentAt) {
      activeLeads.push(lead);
      continue;
    }

    doneLeads.push(lead);
  }

  return { activeLeads, doneLeads };
}

export function filterLeads({
  activeLeads,
  dataQualityFilter,
  doneLeads,
  dataFilter,
  insights,
  searchTerm,
  sourceFilter,
  statusFilter,
  viewTab,
}) {
  const isDoneView = viewTab === "done";
  const baseLeads = isDoneView ? doneLeads : activeLeads;
  let result = baseLeads;

  if (sourceFilter && sourceFilter !== "all") {
    if (sourceFilter === "legacy") {
      result = result.filter((lead) => !lead.sourceId);
    } else {
      result = result.filter((lead) => lead.sourceId === sourceFilter);
    }
  }

  if (!isDoneView && hasStatusFilter(statusFilter)) {
    result = result.filter((lead) => statusFilterMatches(lead.statusRule?.id, statusFilter));
  }

  if (!isDoneView && dataFilter === "with_data") {
    result = result.filter((lead) => insights[lead.id]?.status === "ready");
  } else if (!isDoneView && dataFilter === "no_data") {
    result = result.filter((lead) => insights[lead.id]?.status === "error");
  }

  if (!isDoneView && dataQualityFilter && dataQualityFilter !== "all") {
    result = result.filter((lead) => lead.dataQuality?.level === dataQualityFilter);
  }

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    result = result.filter((lead) =>
      [lead.name, lead.building, lead.resolvedBuilding, lead.phone]
        .some((value) => String(value || "").toLowerCase().includes(term)),
    );
  }

  return result;
}

export function sortLeads(leads, sortOption) {
  const list = [...(leads || [])];
  list.sort((a, b) => {
    if (sortOption.field === "alpha") {
      return String(a.name || "").toLowerCase().localeCompare(String(b.name || "").toLowerCase());
    }
    return String(a.id || "").localeCompare(String(b.id || ""), undefined, { numeric: true });
  });
  if (sortOption.direction === "desc") list.reverse();
  return list;
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
