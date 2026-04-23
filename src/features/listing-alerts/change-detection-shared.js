export const WATCHED_BUILDINGS_KEY = "@listing_alerts_watched_buildings_v2";
export const LISTING_ALERTS_STATE_KEY = "@listing_alerts_state_v1";
export const SELECTED_LISTINGS_KEY = "@listing_alerts_selected_listings_v1";
export const WATCHED_BUILDINGS_SNAPSHOT_KEY = "@listing_alerts_watched_snapshot_v1";
export const MAX_HISTORY_EVENTS = 12;

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

export function toLocationId(value) {
  if (value == null) return null;
  return String(value).trim() || null;
}

export function toListingId(value) {
  if (value == null) return null;
  return String(value).trim() || null;
}

export function toFiniteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

export function toText(value, fallback = null) {
  const next = String(value || "").trim();
  return next || fallback;
}

export function parseVerifiedAt(value) {
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

export function sortChangeItems(left, right) {
  const orderDelta = (CHANGE_TYPE_ORDER[left.type] ?? 99) - (CHANGE_TYPE_ORDER[right.type] ?? 99);
  if (orderDelta !== 0) return orderDelta;

  const verifiedDelta = parseVerifiedAt(right.verifiedAt) - parseVerifiedAt(left.verifiedAt);
  if (verifiedDelta !== 0) return verifiedDelta;

  if (left.type === "price_drop" || left.type === "price_increase") {
    return Math.abs(right.priceDelta || 0) - Math.abs(left.priceDelta || 0);
  }

  return (right.price || 0) - (left.price || 0);
}
