import { MIN_NEW_TRANSACTIONS_TO_REACTIVATE, PAGE_SIZE, TOP_BUILDINGS_LIMIT } from "./constants";
import { countNewTransactionsSince } from "./lead-utils";
import { cleanBuildingName } from "./lead-utils";

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
  statusFilter,
  viewTab,
}) {
  const baseLeads = viewTab === "done" ? doneLeads : activeLeads;
  let result = showDueOnly ? baseLeads.filter((lead) => lead.isDue) : baseLeads;

  if (statusFilter !== "all") {
    result = result.filter((lead) => lead.statusRule?.id === statusFilter);
  }

  if (dataFilter === "with_data") {
    result = result.filter((lead) => insights[lead.id]?.status === "ready");
  } else if (dataFilter === "no_data") {
    result = result.filter((lead) => insights[lead.id]?.status !== "ready");
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

export function buildMarketStats(leads, insights, activeLeads) {
  const readyInsights = Object.values(insights).filter((insight) => insight?.status === "ready");
  const allPrices = readyInsights
    .flatMap((insight) => insight.recentTransactions?.map((transaction) => transaction.price) || [])
    .filter(Boolean);
  const psfValues = readyInsights.map((insight) => insight.psf).filter(Boolean);

  return {
    totalSellers: leads.length,
    dueCount: activeLeads.filter((lead) => lead.isDue).length,
    totalTransactions: readyInsights.reduce((sum, insight) => sum + (insight.count || 0), 0),
    avgPrice: allPrices.length ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length : null,
    avgPsf: psfValues.length ? psfValues.reduce((sum, psf) => sum + psf, 0) / psfValues.length : null,
    readyCount: readyInsights.length,
  };
}

export function buildTopBuildings(leads, limit = TOP_BUILDINGS_LIMIT) {
  const buildingCounts = {};

  for (const lead of leads) {
    const cleaned = cleanBuildingName(lead.building);
    if (!cleaned) continue;
    buildingCounts[cleaned] = (buildingCounts[cleaned] || 0) + 1;
  }

  return Object.entries(buildingCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}
