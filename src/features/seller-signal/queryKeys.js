export function sellerLeadsQueryKey(userId) {
  return ["seller-signal", "leads", userId];
}

export function sellerSourcesQueryKey(userId) {
  return ["seller-signal", "sources", userId];
}

export function sellerBuildingAliasesQueryKey(userId) {
  return ["seller-signal", "building-aliases", userId];
}

export function sellerCachedBuildingsQueryKey() {
  return ["seller-signal", "cached-buildings"];
}

export function sellerBuildingCleanupQueryKey(userId, sourceFilter) {
  return ["seller-signal", "building-cleanup", userId, sourceFilter];
}

export function sellerBuildingCleanupQueryPrefix(userId) {
  return ["seller-signal", "building-cleanup", userId];
}

export function sellerMarketDataQueryKey(userId, buildingKeys) {
  return ["seller-signal", "insights", userId, "market-data", buildingKeys];
}

export function sellerHotBuildingsQueryKey(userId, dateKey, buildingKeys) {
  return ["seller-signal", "insights", userId, "hot-buildings", dateKey, buildingKeys];
}

export function sellerMarketAvailabilityQueryKey(userId, buildingKeys) {
  return ["seller-signal", "insights", userId, "market-availability", buildingKeys];
}

export function sellerDldFallbackQueryKey(userId, buildingNames) {
  return ["seller-signal", "insights", userId, "dld-fallback", buildingNames];
}

export function sellerInsightsQueryPrefix(userId) {
  return ["seller-signal", "insights", userId];
}

export function sellerWhatsAppAccountsQueryKey(userId) {
  return ["seller-signal", "whatsapp-accounts", userId];
}
