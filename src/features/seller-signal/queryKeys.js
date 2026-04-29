export function sellerLeadsQueryKey(userId) {
  return ["seller-signal", "leads", userId];
}

export function sellerSourcesQueryKey(userId) {
  return ["seller-signal", "sources", userId];
}

export function sellerBuildingAliasesQueryKey(userId) {
  return ["seller-signal", "building-aliases", userId];
}

export function sellerInsightsQueryKey(userId, targetKeys) {
  return ["seller-signal", "insights", userId, targetKeys];
}

export function sellerInsightsQueryPrefix(userId) {
  return ["seller-signal", "insights", userId];
}
