import { fetchBayutWatchedBuildings } from "./api";
import { parseSelectedListingKeys, parseVerifiedAt, toLocationId } from "./change-detection";

export const DEFAULT_SUGGESTION_COUNT = 8;
export const SEARCH_DEBOUNCE_MS = 350;
export const MAX_WATCHED_BUILDINGS = 1000;
export const AUTO_TRACK_ALL_LISTINGS = true;

const FEED_URL = `${import.meta.env.BASE_URL}data/listing-alerts-feed.json`;
export const EMPTY_FEED = { buildings: [], generatedAt: null };
export const EMPTY_LIST = [];

export function safeGetItem(key) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function safeSetItem(key, value) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota errors */
  }
}

export function safeRemoveItem(key) {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getLoadedListingCount(building) {
  const loaded = building?.listings?.length || 0;
  if (loaded) return loaded;
  return Number.isFinite(building?.listingCount) ? building.listingCount : 0;
}

export function getErrorMessage(error) {
  if (!error) return "Unexpected error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "Unexpected error";
  if (typeof error?.message === "string") return error.message;
  if (typeof error?.error === "string") return error.error;
  if (typeof error?.error?.message === "string") return error.error.message;
  if (typeof error?.details === "string") return error.details;
  if (typeof error?.hint === "string") return error.hint;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function sortBuildings(left, right) {
  const verifiedDelta = parseVerifiedAt(right.latestVerifiedAt) - parseVerifiedAt(left.latestVerifiedAt);
  if (verifiedDelta !== 0) return verifiedDelta;
  return (right.listingCount || 0) - (left.listingCount || 0);
}

export function sortListings(left, right) {
  const verifiedDelta = parseVerifiedAt(right.verifiedAt) - parseVerifiedAt(left.verifiedAt);
  if (verifiedDelta !== 0) return verifiedDelta;
  return (right.price || 0) - (left.price || 0);
}

export function sortTrackedListings(left, right) {
  if (left.currentStatus !== right.currentStatus) return left.currentStatus === "active" ? -1 : 1;

  const changedDelta = parseVerifiedAt(right.lastChangeAt || right.lastSeenAt || right.removedAt)
    - parseVerifiedAt(left.lastChangeAt || left.lastSeenAt || left.removedAt);
  if (changedDelta !== 0) return changedDelta;

  if ((right.totalChanges || 0) !== (left.totalChanges || 0)) {
    return (right.totalChanges || 0) - (left.totalChanges || 0);
  }

  return (right.lastKnownPrice || 0) - (left.lastKnownPrice || 0);
}

export function matchesSearch(building, term) {
  if (!term) return true;
  const haystack = [
    building.buildingName,
    building.searchName,
    ...((building.listings || []).map((listing) => listing.cluster || "")),
    ...((building.listings || []).map((listing) => listing.community || "")),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

export function snapshotToCurrentBuilding(building) {
  return {
    ...building,
    listings: Object.values(building?.listings || {}),
  };
}

export function snapshotToRemoteBuilding(building) {
  const listings = Object.values(building?.listings || {});
  let latestVerifiedAt = building?.latestVerifiedAt || null;
  const prices = [];

  for (const listing of listings) {
    if (Number.isFinite(listing?.price)) prices.push(listing.price);
    if (listing?.verifiedAt) {
      if (!latestVerifiedAt || parseVerifiedAt(listing.verifiedAt) > parseVerifiedAt(latestVerifiedAt)) {
        latestVerifiedAt = listing.verifiedAt;
      }
    }
  }

  return {
    ...building,
    listings,
    listingCount: listings.length
      ? listings.length
      : Number.isFinite(building?.listingCount)
        ? building.listingCount
        : 0,
    latestVerifiedAt,
    lowestPrice: Number.isFinite(building?.lowestPrice)
      ? building.lowestPrice
      : prices.length
        ? Math.min(...prices)
        : null,
    highestPrice: Number.isFinite(building?.highestPrice)
      ? building.highestPrice
      : prices.length
        ? Math.max(...prices)
        : null,
    imageUrl: building?.imageUrl || listings[0]?.coverPhoto || null,
  };
}

export function filterSelectedKeysForWatched(keys, watchedItems) {
  const watchedLocationSet = new Set((watchedItems || []).map((item) => toLocationId(item.locationId)).filter(Boolean));
  return parseSelectedListingKeys(keys).filter((key) => watchedLocationSet.has(key.split(":")[0]));
}

export function normalizeWatchedItem(item, feedBuildings) {
  if (!item) return null;

  if (typeof item === "string") {
    const feedMatch = feedBuildings.find((building) => building.key === item || building.locationId === item);
    if (!feedMatch) return null;

    return {
      locationId: feedMatch.locationId,
      buildingName: feedMatch.buildingName,
      searchName: feedMatch.searchName,
      fullPath: null,
    };
  }

  const locationId = toLocationId(item.locationId);
  if (!locationId) return null;

  return {
    locationId,
    buildingName: String(item.buildingName || item.searchName || "").trim() || "Unknown",
    searchName: String(item.searchName || item.buildingName || "").trim() || "Unknown",
    fullPath: String(item.fullPath || "").trim() || null,
  };
}

export function uniqueWatchedItems(items, feedBuildings) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const normalized = normalizeWatchedItem(item, feedBuildings);
    if (!normalized || seen.has(normalized.locationId)) continue;
    seen.add(normalized.locationId);
    deduped.push(normalized);
  }

  return deduped;
}

export function toFallbackWatchedBuilding(item, buildingMap) {
  const feedMatch = buildingMap[item.locationId];
  if (feedMatch) {
    return {
      ...feedMatch,
      locationId: item.locationId,
      buildingName: item.buildingName || feedMatch.buildingName,
      searchName: item.searchName || feedMatch.searchName,
      fullPath: item.fullPath || feedMatch.fullPath || null,
    };
  }

  return {
    key: item.locationId,
    locationId: item.locationId,
    buildingName: item.buildingName || item.searchName || "Unknown",
    searchName: item.searchName || item.buildingName || "Unknown",
    fullPath: item.fullPath || null,
    imageUrl: null,
    listingCount: null,
    latestVerifiedAt: null,
    lowestPrice: null,
    highestPrice: null,
    listings: [],
  };
}

export async function fetchListingAlertsFeed({ signal }) {
  const response = await fetch(FEED_URL, { signal });
  if (!response.ok) return EMPTY_FEED;

  const data = await response.json();
  const buildings = (data.buildings || [])
    .map((building) => ({ ...building, locationId: toLocationId(building.locationId) }))
    .filter((building) => building.locationId)
    .sort(sortBuildings);

  return {
    buildings,
    generatedAt: data.generatedAt || null,
  };
}

export async function fetchNormalizedWatchedBuildings(watchedItems, signal) {
  const buildings = await fetchBayutWatchedBuildings(watchedItems, { signal });
  return buildings
    .map((building) => ({ ...building, locationId: toLocationId(building.locationId) }))
    .sort(sortBuildings);
}
