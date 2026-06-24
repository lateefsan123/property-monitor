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

export function sellerMarketAvailabilityQueryKey(userId, targetKeys) {
  return ["seller-signal", "market-availability", userId, targetKeys];
}

export function sellerInsightsQueryKey(userId, targetKeys) {
  return ["seller-signal", "insights", userId, targetKeys];
}

export function sellerInsightsQueryPrefix(userId) {
  return ["seller-signal", "insights", userId];
}

export function sellerWhatsAppAccountsQueryKey(userId) {
  return ["seller-signal", "whatsapp-accounts", userId];
}
