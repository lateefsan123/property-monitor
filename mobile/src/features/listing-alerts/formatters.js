function toDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatPrice(value) {
  if (!Number.isFinite(value)) return "Price n/a";

  if (value >= 1000000) return `AED ${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `AED ${(value / 1000).toFixed(0)}K`;
  return `AED ${value}`;
}

export function formatPriceDelta(value) {
  if (!Number.isFinite(value)) return "AED n/a";
  return formatPrice(value);
}

export function formatPriceRange(min, max) {
  if (Number.isFinite(min) && Number.isFinite(max)) {
    if (min === max) return formatPrice(min);
    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }
  if (Number.isFinite(min)) return `From ${formatPrice(min)}`;
  if (Number.isFinite(max)) return `Up to ${formatPrice(max)}`;
  return "Price n/a";
}

export function formatBedsAndBaths(beds, baths) {
  const bedLabel = beds === 0 ? "Studio" : Number.isFinite(beds) ? `${beds} bed` : "Beds n/a";
  const bathLabel = Number.isFinite(baths) ? `${baths} bath` : "Baths n/a";
  return `${bedLabel} | ${bathLabel}`;
}

export function formatArea(areaSqft) {
  return Number.isFinite(areaSqft) ? `${Math.round(areaSqft).toLocaleString()} sqft` : "Area n/a";
}

export function formatListingTimestamp(value) {
  const date = toDate(value);
  if (!date) return "Date n/a";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function formatSyncTimestamp(value) {
  const date = toDate(value);
  if (!date) return "Unknown";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatEventTimestamp(value) {
  const date = toDate(value);
  if (!date) return "Unknown";

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
