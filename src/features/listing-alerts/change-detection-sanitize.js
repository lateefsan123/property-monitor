import {
  createTrackedListingKey,
  EMPTY_ALERT_SUMMARY,
  MAX_HISTORY_EVENTS,
  parseVerifiedAt,
  sortChangeItems,
  toFiniteNumber,
  toListingId,
  toLocationId,
  toText,
} from "./change-detection-shared";

function sanitizeListing(listing, building) {
  const id = toListingId(listing?.id);
  if (!id) return null;

  return {
    id,
    locationId: toLocationId(building?.locationId),
    buildingName: toText(building?.buildingName, "Unknown"),
    title: toText(listing?.title, "Untitled listing"),
    price: toFiniteNumber(listing?.price),
    verifiedAt: toText(listing?.verifiedAt),
    bayutUrl: toText(listing?.bayutUrl),
    coverPhoto: toText(listing?.coverPhoto),
    beds: toFiniteNumber(listing?.beds),
    baths: toFiniteNumber(listing?.baths),
    areaSqft: toFiniteNumber(listing?.areaSqft),
    cluster: toText(listing?.cluster),
    community: toText(listing?.community),
  };
}

export function sanitizeSnapshotBuilding(building, checkedAt) {
  const locationId = toLocationId(building?.locationId);
  const listings = {};

  for (const listing of building?.listings || []) {
    const sanitized = sanitizeListing(listing, building);
    if (!sanitized) continue;
    listings[sanitized.id] = sanitized;
  }

  const listingValues = Object.values(listings);
  let latestVerifiedAt = null;
  const prices = [];

  for (const listing of listingValues) {
    if (Number.isFinite(listing?.price)) prices.push(listing.price);
    if (listing?.verifiedAt) {
      if (!latestVerifiedAt || parseVerifiedAt(listing.verifiedAt) > parseVerifiedAt(latestVerifiedAt)) {
        latestVerifiedAt = listing.verifiedAt;
      }
    }
  }

  return {
    locationId,
    buildingName: toText(building?.buildingName, "Unknown"),
    searchName: toText(building?.searchName, "Unknown"),
    fullPath: toText(building?.fullPath),
    checkedAt,
    listings,
    listingCount: Number.isFinite(building?.listingCount) ? building.listingCount : listingValues.length,
    latestVerifiedAt: toText(building?.latestVerifiedAt, latestVerifiedAt),
    lowestPrice: toFiniteNumber(building?.lowestPrice ?? (prices.length ? Math.min(...prices) : null)),
    highestPrice: toFiniteNumber(building?.highestPrice ?? (prices.length ? Math.max(...prices) : null)),
    imageUrl: toText(building?.imageUrl) || (listingValues[0]?.coverPhoto ?? null),
    fetchError: toText(building?.fetchError),
  };
}

function sanitizeHistoryEvent(event) {
  const type = ["new", "price_drop", "price_increase", "removed", "reappeared"].includes(event?.type)
    ? event.type
    : null;
  if (!type) return null;

  return {
    type,
    price: toFiniteNumber(event?.price),
    previousPrice: toFiniteNumber(event?.previousPrice),
    priceDelta: toFiniteNumber(event?.priceDelta),
    at: toText(event?.at),
    verifiedAt: toText(event?.verifiedAt),
  };
}

export function sanitizeListingHistoryEntry(entry) {
  const locationId = toLocationId(entry?.locationId);
  const id = toListingId(entry?.id);
  if (!locationId || !id) return null;

  const key = createTrackedListingKey(locationId, id);
  const currentStatus = entry?.currentStatus === "removed" ? "removed" : "active";
  const priceHistory = Array.isArray(entry?.priceHistory)
    ? entry.priceHistory.map(sanitizeHistoryEvent).filter(Boolean).slice(-MAX_HISTORY_EVENTS)
    : [];

  return {
    key,
    id,
    locationId,
    buildingName: toText(entry?.buildingName, "Unknown"),
    title: toText(entry?.title, "Untitled listing"),
    bayutUrl: toText(entry?.bayutUrl),
    coverPhoto: toText(entry?.coverPhoto),
    beds: toFiniteNumber(entry?.beds),
    baths: toFiniteNumber(entry?.baths),
    areaSqft: toFiniteNumber(entry?.areaSqft),
    cluster: toText(entry?.cluster),
    community: toText(entry?.community),
    firstSeenAt: toText(entry?.firstSeenAt),
    firstVerifiedAt: toText(entry?.firstVerifiedAt),
    lastSeenAt: toText(entry?.lastSeenAt),
    lastVerifiedAt: toText(entry?.lastVerifiedAt),
    removedAt: toText(entry?.removedAt),
    currentStatus,
    currentPrice: currentStatus === "active" ? toFiniteNumber(entry?.currentPrice) : null,
    lastKnownPrice: toFiniteNumber(entry?.lastKnownPrice ?? entry?.currentPrice),
    previousPrice: toFiniteNumber(entry?.previousPrice),
    priceDelta: toFiniteNumber(entry?.priceDelta),
    seenCount: Number.isFinite(entry?.seenCount) ? entry.seenCount : 0,
    totalChanges: Number.isFinite(entry?.totalChanges) ? entry.totalChanges : 0,
    dropsCount: Number.isFinite(entry?.dropsCount) ? entry.dropsCount : 0,
    increasesCount: Number.isFinite(entry?.increasesCount) ? entry.increasesCount : 0,
    removedCount: Number.isFinite(entry?.removedCount) ? entry.removedCount : 0,
    reappearedCount: Number.isFinite(entry?.reappearedCount) ? entry.reappearedCount : 0,
    lastChangeAt: toText(entry?.lastChangeAt),
    lastChangeType: toText(entry?.lastChangeType),
    priceHistory,
  };
}

export function sanitizeChangeItem(item) {
  const type = ["new", "price_drop", "price_increase", "removed"].includes(item?.type) ? item.type : null;
  const id = toListingId(item?.id);
  const locationId = toLocationId(item?.locationId);
  if (!type || !id || !locationId) return null;

  return {
    type,
    id,
    locationId,
    buildingName: toText(item?.buildingName, "Unknown"),
    title: toText(item?.title, "Untitled listing"),
    price: toFiniteNumber(item?.price),
    previousPrice: toFiniteNumber(item?.previousPrice),
    priceDelta: toFiniteNumber(item?.priceDelta),
    verifiedAt: toText(item?.verifiedAt),
    bayutUrl: toText(item?.bayutUrl),
    coverPhoto: toText(item?.coverPhoto),
    beds: toFiniteNumber(item?.beds),
    baths: toFiniteNumber(item?.baths),
    areaSqft: toFiniteNumber(item?.areaSqft),
    cluster: toText(item?.cluster),
    community: toText(item?.community),
  };
}

function sanitizeStoredState(state) {
  if (!state || typeof state !== "object") return createEmptyListingAlertsState();

  const summary = {
    watchedBuildingCount: Number.isFinite(state?.summary?.watchedBuildingCount) ? state.summary.watchedBuildingCount : 0,
    trackedListingCount: Number.isFinite(state?.summary?.trackedListingCount) ? state.summary.trackedListingCount : 0,
    changedBuildingCount: Number.isFinite(state?.summary?.changedBuildingCount) ? state.summary.changedBuildingCount : 0,
    totalChanges: Number.isFinite(state?.summary?.totalChanges) ? state.summary.totalChanges : 0,
    newListingCount: Number.isFinite(state?.summary?.newListingCount) ? state.summary.newListingCount : 0,
    priceDropCount: Number.isFinite(state?.summary?.priceDropCount) ? state.summary.priceDropCount : 0,
    priceIncreaseCount: Number.isFinite(state?.summary?.priceIncreaseCount) ? state.summary.priceIncreaseCount : 0,
    removedListingCount: Number.isFinite(state?.summary?.removedListingCount) ? state.summary.removedListingCount : 0,
    lastCheckedAt: toText(state?.summary?.lastCheckedAt),
    hasSnapshot: Boolean(state?.summary?.hasSnapshot),
  };

  const snapshot = {};
  for (const [locationId, building] of Object.entries(state?.snapshot || {})) {
    const normalizedLocationId = toLocationId(locationId);
    if (!normalizedLocationId) continue;
    snapshot[normalizedLocationId] = sanitizeSnapshotBuilding(
      { ...building, locationId: normalizedLocationId, listings: Object.values(building?.listings || {}) },
      toText(building?.checkedAt),
    );
  }

  const buildingChanges = {};
  for (const [locationId, change] of Object.entries(state?.buildingChanges || {})) {
    const normalizedLocationId = toLocationId(locationId);
    if (!normalizedLocationId) continue;

    const newListingCount = Number.isFinite(change?.newListingCount) ? change.newListingCount : 0;
    const priceDropCount = Number.isFinite(change?.priceDropCount) ? change.priceDropCount : 0;
    const priceIncreaseCount = Number.isFinite(change?.priceIncreaseCount) ? change.priceIncreaseCount : 0;
    const removedListingCount = Number.isFinite(change?.removedListingCount) ? change.removedListingCount : 0;
    const totalChanges = Number.isFinite(change?.totalChanges)
      ? change.totalChanges
      : newListingCount + priceDropCount + priceIncreaseCount + removedListingCount;
    if (!totalChanges) continue;

    buildingChanges[normalizedLocationId] = {
      newListingCount,
      priceDropCount,
      priceIncreaseCount,
      removedListingCount,
      totalChanges,
      latestChangedAt: toText(change?.latestChangedAt),
    };
  }

  const changeItems = Array.isArray(state?.changeItems)
    ? state.changeItems.map(sanitizeChangeItem).filter(Boolean).sort(sortChangeItems)
    : [];

  const listingHistory = {};
  for (const [key, entry] of Object.entries(state?.listingHistory || {})) {
    const sanitized = sanitizeListingHistoryEntry({ ...entry, key });
    if (!sanitized) continue;
    listingHistory[sanitized.key] = sanitized;
  }

  summary.trackedListingCount = summary.trackedListingCount || Object.keys(listingHistory).length;

  return {
    summary,
    snapshot,
    buildingChanges,
    changeItems,
    listingHistory,
  };
}

export function createEmptyListingAlertsState(summaryOverrides = {}) {
  return {
    summary: {
      ...EMPTY_ALERT_SUMMARY,
      ...summaryOverrides,
    },
    snapshot: {},
    buildingChanges: {},
    changeItems: [],
    listingHistory: {},
  };
}

export function parseListingAlertsState(raw) {
  if (!raw) return createEmptyListingAlertsState();

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return sanitizeStoredState(parsed);
  } catch {
    return createEmptyListingAlertsState();
  }
}

export function getWatchedBuildingCount(rawWatchlist) {
  try {
    const parsed = typeof rawWatchlist === "string" ? JSON.parse(rawWatchlist) : rawWatchlist;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}
