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

// Building filter: sellers match on their building as written, ignoring case
// and extra spaces. Options list every building with its seller count.
export const sellerBuildingKey = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

export function buildSellerBuildingOptions(leads) {
  const options = new Map();
  for (const lead of leads || []) {
    const key = sellerBuildingKey(lead.building);
    if (!key) continue;
    const option = options.get(key) || { key, label: String(lead.building).trim().replace(/\s+/g, " "), count: 0 };
    option.count += 1;
    options.set(key, option);
  }
  return [...options.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// Bedroom filter: a seller's bedroom cell maps to one bucket. Blank or
// unreadable cells match none. Same rules as public.seller_bed_bucket.
export const BED_FILTER_OPTIONS = [
  { id: "studio", label: "Studio" },
  { id: "1", label: "1 bed" },
  { id: "2", label: "2 bed" },
  { id: "3", label: "3 bed" },
  { id: "4", label: "4+ bed" },
];

export function sellerBedBucket(value) {
  const raw = String(value || "").toLowerCase();
  if (!raw.trim()) return "";
  if (raw.includes("studio")) return "studio";
  const match = raw.match(/\d+/);
  if (!match) return "";
  const beds = Number(match[0]);
  if (beds === 0) return "studio";
  if (beds <= 3) return String(beds);
  return beds <= 8 ? "4" : "";
}

export function filterLeads({
  activeLeads,
  bedFilter = [],
  buildingFilter = [],
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

  if (buildingFilter.length) {
    const buildings = new Set(buildingFilter);
    result = result.filter((lead) => buildings.has(sellerBuildingKey(lead.building)));
  }

  if (bedFilter.length) {
    const buckets = new Set(bedFilter);
    result = result.filter((lead) => buckets.has(sellerBedBucket(lead.bedroom)));
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
