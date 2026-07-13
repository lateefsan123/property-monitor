export const PRICE_DROP_WINDOW_DAYS = 14;

function toEventTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

// A listing "recently dropped" when its history has a price_drop event within
// the window. Multiple drops collapse to the cumulative delta. Falls back to
// the last recorded change for entries that predate the history event log.
export function getRecentPriceDrop(listing, windowDays = PRICE_DROP_WINDOW_DAYS) {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  const events = (listing?.priceHistory || [])
    .filter((event) => event?.type === "price_drop" && toEventTime(event.at || event.verifiedAt) >= cutoff)
    .sort((left, right) => toEventTime(left.at || left.verifiedAt) - toEventTime(right.at || right.verifiedAt));

  if (events.length) {
    const first = events[0];
    const latest = events[events.length - 1];
    const price = latest.price ?? listing?.currentPrice ?? listing?.price ?? null;
    const previousPrice = first.previousPrice ?? null;
    const priceDelta = Number.isFinite(price) && Number.isFinite(previousPrice)
      ? price - previousPrice
      : latest.priceDelta ?? null;
    return { hasDrop: true, at: latest.at || latest.verifiedAt || null, priceDelta };
  }

  if (
    !(listing?.priceHistory || []).length
    && Number.isFinite(listing?.priceDelta)
    && listing.priceDelta < 0
    && (!listing.lastChangeAt || toEventTime(listing.lastChangeAt) >= cutoff)
  ) {
    return { hasDrop: true, at: listing.lastChangeAt || null, priceDelta: listing.priceDelta };
  }

  return { hasDrop: false, at: null, priceDelta: null };
}
