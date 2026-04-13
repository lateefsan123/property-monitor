export const WATCHED_BUILDINGS_KEY = "@listing_alerts_watched_buildings_v2";
export const LISTING_ALERTS_STATE_KEY = "@listing_alerts_state_v1";
export const SELECTED_LISTINGS_KEY = "@listing_alerts_selected_listings_v1";
export const WATCHED_BUILDINGS_SNAPSHOT_KEY = "@listing_alerts_watched_snapshot_v1";

const MAX_HISTORY_EVENTS = 12;

export const EMPTY_ALERT_SUMMARY = Object.freeze({
  watchedBuildingCount: 0,
  trackedListingCount: 0,
  changedBuildingCount: 0,
  totalChanges: 0,
  newListingCount: 0,
  priceDropCount: 0,
  priceIncreaseCount: 0,
  removedListingCount: 0,
  lastCheckedAt: null,
  hasSnapshot: false,
});

function toLocationId(value) {
  if (value == null) return null;
  return String(value).trim() || null;
}

function toListingId(value) {
  if (value == null) return null;
  return String(value).trim() || null;
}

function toFiniteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function toText(value, fallback = null) {
  const next = String(value || "").trim();
  return next || fallback;
}

function parseVerifiedAt(value) {
  if (!value) return 0;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export function createTrackedListingKey(locationId, listingId) {
  const normalizedLocationId = toLocationId(locationId);
  const normalizedListingId = toListingId(listingId);
  if (!normalizedLocationId || !normalizedListingId) return null;
  return `${normalizedLocationId}:${normalizedListingId}`;
}

function sanitizeSelectedListingKey(value) {
  if (typeof value !== "string") return null;
  const [rawLocationId, ...rawListingIdParts] = value.split(":");
  const rawListingId = rawListingIdParts.join(":");
  return createTrackedListingKey(rawLocationId, rawListingId);
}

export function parseSelectedListingKeys(raw) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.map(sanitizeSelectedListingKey).filter(Boolean))];
  } catch {
    return [];
  }
}

const CHANGE_TYPE_ORDER = {
  price_drop: 0,
  price_increase: 1,
  new: 2,
  removed: 3,
};

function sortChangeItems(left, right) {
  const orderDelta = (CHANGE_TYPE_ORDER[left.type] ?? 99) - (CHANGE_TYPE_ORDER[right.type] ?? 99);
  if (orderDelta !== 0) return orderDelta;

  const verifiedDelta = parseVerifiedAt(right.verifiedAt) - parseVerifiedAt(left.verifiedAt);
  if (verifiedDelta !== 0) return verifiedDelta;

  if (left.type === "price_drop" || left.type === "price_increase") {
    return Math.abs(right.priceDelta || 0) - Math.abs(left.priceDelta || 0);
  }

  return (right.price || 0) - (left.price || 0);
}

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

function sanitizeSnapshotBuilding(building, checkedAt) {
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

function sanitizeListingHistoryEntry(entry) {
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

function sanitizeChangeItem(item) {
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

function appendHistoryEvent(currentEvents, event) {
  const sanitized = sanitizeHistoryEvent(event);
  if (!sanitized) return currentEvents || [];

  const next = [...(currentEvents || []), sanitized];
  return next.slice(-MAX_HISTORY_EVENTS);
}

function buildHistoryEntry(listing, previousEntry, { checkedAt, eventType = null, previousPrice = null, priceDelta = null }) {
  const sanitizedPrevious = sanitizeListingHistoryEntry(previousEntry);
  const locationId = toLocationId(listing?.locationId);
  const id = toListingId(listing?.id);
  const key = createTrackedListingKey(locationId, id);
  const price = toFiniteNumber(listing?.price);

  const base = {
    key,
    id,
    locationId,
    buildingName: toText(listing?.buildingName, sanitizedPrevious?.buildingName || "Unknown"),
    title: toText(listing?.title, sanitizedPrevious?.title || "Untitled listing"),
    bayutUrl: toText(listing?.bayutUrl, sanitizedPrevious?.bayutUrl),
    coverPhoto: toText(listing?.coverPhoto, sanitizedPrevious?.coverPhoto),
    beds: toFiniteNumber(listing?.beds ?? sanitizedPrevious?.beds),
    baths: toFiniteNumber(listing?.baths ?? sanitizedPrevious?.baths),
    areaSqft: toFiniteNumber(listing?.areaSqft ?? sanitizedPrevious?.areaSqft),
    cluster: toText(listing?.cluster, sanitizedPrevious?.cluster),
    community: toText(listing?.community, sanitizedPrevious?.community),
    firstSeenAt: sanitizedPrevious?.firstSeenAt || checkedAt,
    firstVerifiedAt: sanitizedPrevious?.firstVerifiedAt || toText(listing?.verifiedAt),
    lastSeenAt: checkedAt,
    lastVerifiedAt: toText(listing?.verifiedAt, sanitizedPrevious?.lastVerifiedAt),
    removedAt: null,
    currentStatus: "active",
    currentPrice: price,
    lastKnownPrice: price ?? sanitizedPrevious?.lastKnownPrice ?? null,
    previousPrice: toFiniteNumber(previousPrice),
    priceDelta: toFiniteNumber(priceDelta),
    seenCount: (sanitizedPrevious?.seenCount || 0) + 1,
    totalChanges: sanitizedPrevious?.totalChanges || 0,
    dropsCount: sanitizedPrevious?.dropsCount || 0,
    increasesCount: sanitizedPrevious?.increasesCount || 0,
    removedCount: sanitizedPrevious?.removedCount || 0,
    reappearedCount: sanitizedPrevious?.reappearedCount || 0,
    lastChangeAt: sanitizedPrevious?.lastChangeAt || null,
    lastChangeType: sanitizedPrevious?.lastChangeType || null,
    priceHistory: sanitizedPrevious?.priceHistory || [],
  };

  if (!eventType) return base;

  const historyType = eventType === "reappeared" ? "reappeared" : eventType;
  const next = {
    ...base,
    totalChanges: base.totalChanges + 1,
    lastChangeAt: checkedAt,
    lastChangeType: historyType,
    priceHistory: appendHistoryEvent(base.priceHistory, {
      type: historyType,
      price,
      previousPrice,
      priceDelta,
      at: checkedAt,
      verifiedAt: listing?.verifiedAt,
    }),
  };

  if (eventType === "price_drop") next.dropsCount += 1;
  if (eventType === "price_increase") next.increasesCount += 1;
  if (eventType === "reappeared") next.reappearedCount += 1;

  return next;
}

function markListingRemoved(previousEntry, previousListing, checkedAt) {
  const sanitizedPrevious = sanitizeListingHistoryEntry(previousEntry);
  if (!sanitizedPrevious) return null;
  if (sanitizedPrevious.currentStatus === "removed") return sanitizedPrevious;

  const lastKnownPrice = sanitizedPrevious.currentPrice ?? sanitizedPrevious.lastKnownPrice ?? toFiniteNumber(previousListing?.price);

  return {
    ...sanitizedPrevious,
    bayutUrl: toText(previousListing?.bayutUrl, sanitizedPrevious.bayutUrl),
    coverPhoto: toText(previousListing?.coverPhoto, sanitizedPrevious.coverPhoto),
    currentStatus: "removed",
    currentPrice: null,
    lastKnownPrice,
    previousPrice: sanitizedPrevious.currentPrice ?? sanitizedPrevious.previousPrice ?? null,
    priceDelta: null,
    removedAt: checkedAt,
    totalChanges: sanitizedPrevious.totalChanges + 1,
    removedCount: sanitizedPrevious.removedCount + 1,
    lastChangeAt: checkedAt,
    lastChangeType: "removed",
    priceHistory: appendHistoryEvent(sanitizedPrevious.priceHistory, {
      type: "removed",
      price: lastKnownPrice,
      previousPrice: null,
      priceDelta: null,
      at: checkedAt,
      verifiedAt: sanitizedPrevious.lastVerifiedAt || previousListing?.verifiedAt,
    }),
  };
}

function buildRemovedChangeItem(previousEntry, previousListing) {
  const sanitizedPrevious = sanitizeListingHistoryEntry(previousEntry);
  const price = sanitizedPrevious?.lastKnownPrice ?? toFiniteNumber(previousListing?.price);

  return sanitizeChangeItem({
    type: "removed",
    id: previousListing?.id ?? sanitizedPrevious?.id,
    locationId: previousListing?.locationId ?? sanitizedPrevious?.locationId,
    buildingName: previousListing?.buildingName ?? sanitizedPrevious?.buildingName,
    title: previousListing?.title ?? sanitizedPrevious?.title,
    price,
    previousPrice: price,
    priceDelta: null,
    verifiedAt: previousListing?.verifiedAt ?? sanitizedPrevious?.lastVerifiedAt,
    bayutUrl: previousListing?.bayutUrl ?? sanitizedPrevious?.bayutUrl,
    coverPhoto: previousListing?.coverPhoto ?? sanitizedPrevious?.coverPhoto,
    beds: previousListing?.beds ?? sanitizedPrevious?.beds,
    baths: previousListing?.baths ?? sanitizedPrevious?.baths,
    areaSqft: previousListing?.areaSqft ?? sanitizedPrevious?.areaSqft,
    cluster: previousListing?.cluster ?? sanitizedPrevious?.cluster,
    community: previousListing?.community ?? sanitizedPrevious?.community,
  });
}

export function buildListingAlertsState({
  currentBuildings,
  previousState,
  watchedItems,
  selectedListingKeys,
  checkedAt = new Date().toISOString(),
  trackAllListings = false,
}) {
  const previous = parseListingAlertsState(previousState);
  const previousSnapshot = previous.snapshot || {};
  const previousListingHistory = previous.listingHistory || {};
  const isInitialSnapshot = !previous.summary?.hasSnapshot;
  const activeLocationIds = [...new Set((watchedItems || []).map((item) => toLocationId(item?.locationId)).filter(Boolean))];
  const activeLocationSet = new Set(activeLocationIds);
  const selectedKeySet = trackAllListings
    ? new Set()
    : new Set(parseSelectedListingKeys(selectedListingKeys).filter((key) => activeLocationSet.has(key.split(":")[0])));
  const selectedIdsByLocation = {};

  if (!trackAllListings) {
    for (const trackedKey of selectedKeySet) {
      const [locationId, ...listingIdParts] = trackedKey.split(":");
      const listingId = listingIdParts.join(":");
      if (!locationId || !listingId) continue;
      if (!selectedIdsByLocation[locationId]) selectedIdsByLocation[locationId] = new Set();
      selectedIdsByLocation[locationId].add(listingId);
    }
  }

  if (!activeLocationIds.length) return createEmptyListingAlertsState();

  const currentMap = {};
  for (const building of currentBuildings || []) {
    const locationId = toLocationId(building?.locationId);
    if (locationId) currentMap[locationId] = building;
  }

  const nextSnapshot = {};
  const nextBuildingChanges = {};
  const nextChangeItems = [];
  const nextListingHistory = {};

  for (const [key, entry] of Object.entries(previousListingHistory)) {
    const sanitized = sanitizeListingHistoryEntry({ ...entry, key });
    if (!sanitized) continue;
    if (trackAllListings) {
      if (!activeLocationSet.has(sanitized.locationId)) continue;
    } else if (!selectedKeySet.has(sanitized.key)) {
      continue;
    }
    nextListingHistory[sanitized.key] = sanitized;
  }

  for (const locationId of activeLocationIds) {
    const currentBuilding = currentMap[locationId];
    const previousBuilding = previousSnapshot[locationId];

    if (!currentBuilding) {
      if (previousBuilding) nextSnapshot[locationId] = previousBuilding;
      continue;
    }

    if (currentBuilding.fetchError) {
      if (previousBuilding) nextSnapshot[locationId] = previousBuilding;
      continue;
    }

    const snapshotBuilding = sanitizeSnapshotBuilding(currentBuilding, checkedAt);
    nextSnapshot[locationId] = snapshotBuilding;

    const previousListings = previousBuilding?.listings || {};
    const selectedListingIds = trackAllListings
      ? new Set([...Object.keys(snapshotBuilding.listings), ...Object.keys(previousListings)])
      : selectedIdsByLocation[locationId];
    let newListingCount = 0;
    let priceDropCount = 0;
    let priceIncreaseCount = 0;
    let removedListingCount = 0;
    let latestChangedAt = null;

    if (!selectedListingIds?.size) continue;

    if (trackAllListings && isInitialSnapshot) {
      for (const listingId of selectedListingIds) {
        const listing = snapshotBuilding.listings[listingId];
        if (!listing) continue;
        const historyKey = createTrackedListingKey(locationId, listingId);
        if (!historyKey || nextListingHistory[historyKey]) continue;
        const seedEntry = buildHistoryEntry(listing, null, {
          checkedAt,
          eventType: null,
          previousPrice: null,
          priceDelta: null,
        });
        if (seedEntry?.key) nextListingHistory[seedEntry.key] = seedEntry;
      }
      continue;
    }

    for (const listingId of selectedListingIds) {
      const listing = snapshotBuilding.listings[listingId];
      const historyKey = createTrackedListingKey(locationId, listingId);
      const previousEntry = historyKey ? nextListingHistory[historyKey] : null;
      const previousListing = previousListings[listingId];
      if (!listing) {
        const removedEntry = markListingRemoved(previousEntry, previousListing, checkedAt);
        if (removedEntry?.key) nextListingHistory[removedEntry.key] = removedEntry;
        if (!removedEntry || removedEntry.lastChangeAt !== checkedAt) continue;

        removedListingCount += 1;
        latestChangedAt = parseVerifiedAt(checkedAt) > parseVerifiedAt(latestChangedAt) ? checkedAt : latestChangedAt;
        const changeItem = buildRemovedChangeItem(previousEntry, previousListing);
        if (changeItem) nextChangeItems.push(changeItem);
        continue;
      }

      const wasRemoved = previousEntry?.currentStatus === "removed";
      const previousPrice = Number.isFinite(previousListing?.price) ? previousListing.price : previousEntry?.currentPrice ?? previousEntry?.lastKnownPrice ?? null;

      let changeType = null;
      let historyEventType = null;
      let priceDelta = null;

      if (!previousListing) {
        changeType = "new";
        historyEventType = wasRemoved ? "reappeared" : "new";
        newListingCount += 1;
      } else if (Number.isFinite(listing.price) && Number.isFinite(previousPrice) && listing.price !== previousPrice) {
        const isDrop = listing.price < previousPrice;
        changeType = isDrop ? "price_drop" : "price_increase";
        historyEventType = changeType;
        priceDelta = listing.price - previousPrice;
        if (isDrop) {
          priceDropCount += 1;
        } else {
          priceIncreaseCount += 1;
        }
      }

      const nextEntry = buildHistoryEntry(listing, previousEntry, {
        checkedAt,
        eventType: historyEventType,
        previousPrice,
        priceDelta,
      });

      if (nextEntry?.key) nextListingHistory[nextEntry.key] = nextEntry;

      if (!changeType) continue;

      latestChangedAt = parseVerifiedAt(listing.verifiedAt) > parseVerifiedAt(latestChangedAt) ? listing.verifiedAt : latestChangedAt;
      const changeItem = sanitizeChangeItem({
        ...listing,
        type: changeType,
        previousPrice,
        priceDelta,
      });
      if (changeItem) nextChangeItems.push(changeItem);
    }

    const totalChanges = newListingCount + priceDropCount + priceIncreaseCount + removedListingCount;
    if (!totalChanges) continue;

    nextBuildingChanges[locationId] = {
      newListingCount,
      priceDropCount,
      priceIncreaseCount,
      removedListingCount,
      totalChanges,
      latestChangedAt,
    };
  }

  nextChangeItems.sort(sortChangeItems);

  const summary = {
    watchedBuildingCount: activeLocationIds.length,
    trackedListingCount: trackAllListings ? Object.keys(nextListingHistory).length : selectedKeySet.size,
    changedBuildingCount: Object.keys(nextBuildingChanges).length,
    totalChanges: nextChangeItems.length,
    newListingCount: nextChangeItems.filter((item) => item.type === "new").length,
    priceDropCount: nextChangeItems.filter((item) => item.type === "price_drop").length,
    priceIncreaseCount: nextChangeItems.filter((item) => item.type === "price_increase").length,
    removedListingCount: nextChangeItems.filter((item) => item.type === "removed").length,
    lastCheckedAt: checkedAt,
    hasSnapshot: Object.keys(nextSnapshot).length > 0,
  };

  return {
    summary,
    snapshot: nextSnapshot,
    buildingChanges: nextBuildingChanges,
    changeItems: nextChangeItems,
    listingHistory: nextListingHistory,
  };
}
