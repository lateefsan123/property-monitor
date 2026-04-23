export {
  LISTING_ALERTS_STATE_KEY,
  SELECTED_LISTINGS_KEY,
  WATCHED_BUILDINGS_KEY,
  WATCHED_BUILDINGS_SNAPSHOT_KEY,
  createTrackedListingKey,
  parseSelectedListingKeys,
  parseVerifiedAt,
  toLocationId,
} from "./change-detection-shared";
export {
  createEmptyListingAlertsState,
  getWatchedBuildingCount,
  parseListingAlertsState,
  sanitizeChangeItem,
  sanitizeListingHistoryEntry,
  sanitizeSnapshotBuilding,
} from "./change-detection-sanitize";

import {
  createTrackedListingKey,
  parseSelectedListingKeys,
  parseVerifiedAt,
  sortChangeItems,
  toLocationId,
} from "./change-detection-shared";
import {
  createEmptyListingAlertsState,
  parseListingAlertsState,
  sanitizeChangeItem,
  sanitizeListingHistoryEntry,
  sanitizeSnapshotBuilding,
} from "./change-detection-sanitize";
import {
  buildHistoryEntry,
  buildRemovedChangeItem,
  markListingRemoved,
} from "./change-detection-history";

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
        const previousEntry = historyKey ? nextListingHistory[historyKey] : null;
        const nextEntry = buildHistoryEntry(listing, previousEntry, { checkedAt });
        if (nextEntry?.key) nextListingHistory[nextEntry.key] = nextEntry;
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
      const previousPrice = Number.isFinite(previousListing?.price)
        ? previousListing.price
        : previousEntry?.currentPrice ?? previousEntry?.lastKnownPrice ?? null;

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
        if (isDrop) priceDropCount += 1;
        else priceIncreaseCount += 1;
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
