export function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatPrice(value) {
  if (!value) return "-";
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPsf(value) {
  if (!value) return "-";
  return `${Math.round(value).toLocaleString("en-US")} AED/sqft`;
}

export function formatRange(min, max) {
  if (!min || !max) return "-";
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

export function formatBedsLabel(value) {
  if (value === 0) return "Studio";
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return `${value} bed`;
  return "-";
}

export function formatPriceShort(value) {
  if (!value) return "-";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M AED`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K AED`;
  return `${Math.round(value)} AED`;
}
