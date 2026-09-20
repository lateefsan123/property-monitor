const STATE_KEY = "repeatListingNavigation";

export function readListingNavigation(state) {
  const value = state?.[STATE_KEY];
  return {
    buildingId: typeof value?.buildingId === "string" ? value.buildingId : null,
    listingKey: typeof value?.listingKey === "string" ? value.listingKey : null,
  };
}

export function writeListingNavigation(history, selection, { replace = false } = {}) {
  const current = readListingNavigation(history.state);
  if (!replace && current.buildingId === selection.buildingId && current.listingKey === selection.listingKey) return;
  history[replace ? "replaceState" : "pushState"](
    { ...history.state, [STATE_KEY]: selection }, "", "#/listing-alerts",
  );
}
