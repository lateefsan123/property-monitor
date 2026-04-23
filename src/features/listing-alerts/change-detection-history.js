import {
  createTrackedListingKey,
  MAX_HISTORY_EVENTS,
  parseVerifiedAt,
  toFiniteNumber,
  toListingId,
  toLocationId,
  toText,
} from "./change-detection-shared";
import { sanitizeChangeItem, sanitizeListingHistoryEntry } from "./change-detection-sanitize";

function appendHistoryEvent(currentEvents, event) {
  const sanitized = sanitizeListingHistoryEntry({ locationId: "temp", id: "temp", priceHistory: [event] })?.priceHistory?.[0];
  if (!sanitized) return currentEvents || [];
  const next = [...(currentEvents || []), sanitized];
  return next.slice(-MAX_HISTORY_EVENTS);
}

export function buildHistoryEntry(listing, previousEntry, { checkedAt, eventType = null, previousPrice = null, priceDelta = null }) {
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

export function markListingRemoved(previousEntry, previousListing, checkedAt) {
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

export function buildRemovedChangeItem(previousEntry, previousListing) {
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
