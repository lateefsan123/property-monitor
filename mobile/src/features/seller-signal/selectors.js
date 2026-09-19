import { PAGE_SIZE } from "./constants";

export function splitLeadsBySentStatus(leads) {
  return { activeLeads: leads.filter(lead => lead.isDue && lead.statusRule?.id !== 'not_interested'), doneLeads: leads.filter(lead => !lead.isDue && lead.statusRule?.id !== 'not_interested') };
}

export function filterLeads({
  activeLeads,
  doneLeads,
  dataFilter,
  dataQualityFilter,
  insights,
  searchTerm,
  showDueOnly,
  sourceFilter,
  statusFilter,
  viewTab,
}) {
  const isDoneView = viewTab === "done";
  const baseLeads = isDoneView ? doneLeads : activeLeads;
  let result = !isDoneView && showDueOnly ? baseLeads.filter((lead) => lead.isDue || lead.statusRule?.id === "not_interested") : baseLeads;

  if (statusFilter !== "all") {
    result = result.filter((lead) => (Array.isArray(statusFilter) ? statusFilter : [statusFilter]).includes(lead.statusRule?.id));
  }

  if (dataFilter === "with_data") {
    result = result.filter((lead) => insights[lead.id]?.status === "ready");
  } else if (dataFilter === "no_data") {
    result = result.filter((lead) => insights[lead.id]?.status !== "ready");
  }

  if (sourceFilter && sourceFilter !== "all") {
    if (sourceFilter === "legacy") {
      result = result.filter((lead) => !lead.sourceId);
    } else {
      result = result.filter((lead) => lead.sourceId === sourceFilter);
    }
  }

  if (dataQualityFilter && dataQualityFilter !== "all") result = result.filter(lead => lead.dataQuality?.level === dataQualityFilter);

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    result = result.filter((lead) =>
      [lead.name, lead.building, lead.phone, lead.unit, lead.bedroom].some((value) => String(value || "").toLowerCase().includes(term)),
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
