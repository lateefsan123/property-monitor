import { RECENT_TRANSACTIONS_LIMIT } from "./constants";
import { formatDate, formatPriceShort } from "./formatters";
import { cleanBuildingName, parseDateValue, startOfDay } from "./lead-utils";

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractPrice(transaction) {
  for (const value of [transaction?.price, transaction?.amount, transaction?.sale_price, transaction?.sold_price, transaction?.transaction_value, transaction?.value]) {
    const price = parseNumber(value);
    if (price && price > 0) return price;
  }

  return null;
}

function extractArea(transaction) {
  for (const value of [transaction?.area, transaction?.built_up_area, transaction?.size, transaction?.sqft, transaction?.area_sqft]) {
    const area = parseNumber(value);
    if (area && area > 0) return area;
  }

  return null;
}

export function extractBeds(transaction) {
  for (const value of [transaction?.beds, transaction?.bedrooms, transaction?.rooms, transaction?.property?.beds]) {
    const numeric = parseNumber(value);
    if (numeric !== null && numeric >= 0) return Math.round(numeric);

    const match = String(value || "").match(/(\d+)/);
    if (match) return Number(match[1]);
  }

  return null;
}

export function extractTransactionDate(transaction) {
  for (const value of [transaction?.date, transaction?.transaction_date, transaction?.created_at, transaction?.createdAt, transaction?.transfer_date]) {
    const parsed = parseDateValue(value);
    if (parsed) return parsed;

    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return startOfDay(direct);
  }

  return null;
}

function extractTransactionLocationLabel(transaction, fallback = null) {
  const fullLocation = transaction?.location?.full_location;
  if (typeof fullLocation === "string" && fullLocation.trim()) {
    const parts = fullLocation.split("->").map((part) => part.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  for (const value of [transaction?.location?.location, transaction?.location?.name, transaction?.building_name, transaction?.project_name, transaction?.tower_name, transaction?.property_name, transaction?.area_name]) {
    const label = String(value || "").trim();
    if (label) return label;
  }

  return fallback || "-";
}

function extractTransactionFloor(transaction) {
  for (const value of [transaction?.property?.floor, transaction?.floor]) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }

  return null;
}

export function buildRecentTransactions(transactions, fallbackLocation = null, limit = RECENT_TRANSACTIONS_LIMIT) {
  return transactions
    .map((transaction, index) => {
      const price = extractPrice(transaction);
      if (!price) return null;

      const area = extractArea(transaction);
      return {
        id: transaction?.id || transaction?.transaction_id || transaction?.externalID || `${index}-${price}`,
        date: extractTransactionDate(transaction),
        price,
        beds: extractBeds(transaction),
        area,
        locationLabel: extractTransactionLocationLabel(transaction, fallbackLocation),
        floor: extractTransactionFloor(transaction),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = left.date ? left.date.getTime() : 0;
      const rightTime = right.date ? right.date.getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, limit);
}

export function summarizeTransactions(transactions) {
  const prices = [];
  const psfValues = [];

  for (const transaction of transactions) {
    const price = extractPrice(transaction);
    if (!price) continue;

    prices.push(price);
    const area = extractArea(transaction);
    if (area) psfValues.push(price / area);
  }

  if (!prices.length) {
    return { count: transactions.length, avg: null, min: null, max: null, psf: null };
  }

  return {
    count: transactions.length,
    avg: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    psf: psfValues.length ? psfValues.reduce((sum, psf) => sum + psf, 0) / psfValues.length : null,
  };
}

export function formatPhoneForWhatsApp(rawValue) {
  const digits = String(rawValue || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return `971${digits.slice(1)}`;
  if (digits.startsWith("971")) return digits;
  return digits;
}

export function buildMessage(lead, insight) {
  const name = lead.name || "";
  const cleanedBuilding = cleanBuildingName(lead.building) || "your building";
  const lines = [
    `Hi ${name}, quick update on recent transactions in ${cleanedBuilding}.`,
    "",
  ];

  if (insight?.recentTransactions?.length) {
    for (const transaction of insight.recentTransactions) {
      const parts = [];
      if (transaction.locationLabel && transaction.locationLabel !== "-") parts.push(transaction.locationLabel);
      if (transaction.beds !== null && transaction.beds !== undefined) {
        parts.push(transaction.beds === 0 ? "Studio" : `${transaction.beds} Bed`);
      }
      parts.push(formatPriceShort(transaction.price));
      if (transaction.area) parts.push(`${Math.round(transaction.area).toLocaleString("en-US")} sqft`);
      if (transaction.date) parts.push(formatDate(transaction.date));
      lines.push(`- ${parts.join(" | ")}`);
    }
    lines.push("");
  }

  lines.push(
    "Buyer activity remains strong, and your unit is in hot demand.",
    "",
    "If you would like to further discuss the sale of your unit, please let me know.",
  );

  return lines.join("\n");
}
