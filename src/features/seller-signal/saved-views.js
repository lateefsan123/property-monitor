import { normalizeStatusFilter, statusFiltersEqual } from "./status-filter-utils";

export const DEFAULT_SELLER_VIEW_ID = "prospects";

export const DEFAULT_SELLER_VIEWS = [
  {
    id: "prospects",
    label: "Prospects",
    group: "default",
    filters: {
      sourceFilter: "all",
      viewTab: "active",
      statusFilter: "prospect",
      dataFilter: "all",
      dataQualityFilter: "all",
      searchTerm: "",
    },
  },
  {
    id: "needs-review",
    label: "Needs review",
    group: "default",
    filters: {
      sourceFilter: "all",
      viewTab: "active",
      statusFilter: "all",
      dataFilter: "all",
      dataQualityFilter: "review",
      searchTerm: "",
    },
  },
  {
    id: "all-active",
    label: "All active",
    group: "default",
    filters: {
      sourceFilter: "all",
      viewTab: "active",
      statusFilter: "all",
      dataFilter: "all",
      dataQualityFilter: "all",
      searchTerm: "",
    },
  },
  {
    id: "market-data",
    label: "Has market data",
    group: "default",
    filters: {
      sourceFilter: "all",
      viewTab: "active",
      statusFilter: "all",
      dataFilter: "with_data",
      dataQualityFilter: "all",
      searchTerm: "",
    },
  },
  {
    id: "appraisals",
    label: "Appraisals",
    group: "default",
    filters: {
      sourceFilter: "all",
      viewTab: "active",
      statusFilter: "market_appraisal",
      dataFilter: "all",
      dataQualityFilter: "all",
      searchTerm: "",
    },
  },
  {
    id: "sent",
    label: "Sent sellers",
    group: "default",
    filters: {
      sourceFilter: "all",
      viewTab: "done",
      statusFilter: "all",
      dataFilter: "all",
      dataQualityFilter: "all",
      searchTerm: "",
    },
  },
];

const STORAGE_KEY_PREFIX = "seller-signal:saved-views";

function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}:${userId || "anonymous"}`;
}

export function getSellerViewFilters({
  dataFilter,
  dataQualityFilter,
  searchTerm,
  sourceFilter,
  statusFilter,
  viewTab,
}) {
  return {
    sourceFilter: sourceFilter || "all",
    viewTab: viewTab || "active",
    statusFilter: normalizeStatusFilter(statusFilter),
    dataFilter: dataFilter || "all",
    dataQualityFilter: dataQualityFilter || "all",
    searchTerm: String(searchTerm || "").trim(),
  };
}

export function readCustomSellerViews(userId) {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((view) => view?.id && view?.label && view?.filters)
      .map((view) => ({
        id: String(view.id),
        label: String(view.label).slice(0, 48),
        group: "custom",
        filters: getSellerViewFilters(view.filters),
      }));
  } catch {
    return [];
  }
}

export function writeCustomSellerViews(userId, views) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(views));
  } catch {
    // Saved views are convenience state; ignore storage failures.
  }
}

export function createCustomSellerView(label, filters) {
  return {
    id: `custom-${Date.now()}`,
    label: String(label || "Saved view").trim().slice(0, 48),
    group: "custom",
    filters: getSellerViewFilters(filters),
  };
}

export function findMatchingSellerView(views, filters) {
  const current = getSellerViewFilters(filters);

  return views.find((view) => {
    const viewFilters = getSellerViewFilters(view.filters);
    return viewFilters.sourceFilter === current.sourceFilter
      && viewFilters.viewTab === current.viewTab
      && statusFiltersEqual(viewFilters.statusFilter, current.statusFilter)
      && viewFilters.dataFilter === current.dataFilter
      && viewFilters.dataQualityFilter === current.dataQualityFilter
      && viewFilters.searchTerm === current.searchTerm;
  }) || null;
}
