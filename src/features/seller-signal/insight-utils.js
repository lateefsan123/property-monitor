import { RECENT_TRANSACTIONS_LIMIT } from "./constants";
import { formatDate, formatPriceShort } from "./formatters";
import { cleanBuildingName, formatBuildingLabel } from "./building-utils";
import { parseDateValue, startOfDay } from "./lead-utils";

const TRANSACTION_TIME_ZONE = "Asia/Dubai";
export const DEFAULT_MESSAGE_TEMPLATE = `Hi {{name}}, quick update on recent transactions in {{building}}.

{{transactions}}

Buyer activity remains strong, and your unit is in hot demand.

If you would like to further discuss the sale of your unit, please let me know.`;
// Intl.DateTimeFormat construction is expensive (~0.5ms) and this runs per
// transaction, so cache one formatter per time zone.
const dateKeyFormatters = new Map();

function getDateKeyFormatter(timeZone) {
  let formatter = dateKeyFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    });
    dateKeyFormatters.set(timeZone, formatter);
  }
  return formatter;
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function getTransactionDateKey(dateValue = new Date(), timeZone = TRANSACTION_TIME_ZONE) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const parts = getDateKeyFormatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (!values.year || !values.month || !values.day) return null;
  return `${values.year}-${values.month}-${values.day}`;
}

export function getTodayTransactionDateKey() {
  return getTransactionDateKey(new Date());
}

// DLD labels fractional/nominal transfers (share transfers, installment
// registrations) as "Sale" with tiny amounts; they are not market comps.
const MIN_REALISTIC_SALE_PRICE = 100000;

export function extractPrice(transaction) {
  for (const value of [transaction?.price, transaction?.amount, transaction?.sale_price, transaction?.sold_price, transaction?.transaction_value, transaction?.value]) {
    const price = parseNumber(value);
    if (price && price >= MIN_REALISTIC_SALE_PRICE) return price;
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

const transactionBedsCache = new WeakMap();

function computeBeds(transaction) {
  for (const value of [transaction?.beds, transaction?.bedrooms, transaction?.rooms, transaction?.property?.beds]) {
    const numeric = parseNumber(value);
    if (numeric !== null && numeric >= 0) return Math.round(numeric);

    const match = String(value || "").match(/(\d+)/);
    if (match) return Number(match[1]);
  }

  return null;
}

export function extractBeds(transaction) {
  if (!transaction || typeof transaction !== "object") return computeBeds(transaction);
  let beds = transactionBedsCache.get(transaction);
  if (beds === undefined) {
    beds = computeBeds(transaction);
    transactionBedsCache.set(transaction, beds);
  }
  return beds;
}

// Date parsing runs per transaction on every insights recompute and the same
// transaction objects are stable in the query cache, so memoize per object.
const transactionDateCache = new WeakMap();
const transactionDateKeyCache = new WeakMap();

function computeTransactionDate(transaction) {
  for (const value of [transaction?.date, transaction?.transaction_date, transaction?.created_at, transaction?.createdAt, transaction?.transfer_date]) {
    const parsed = parseDateValue(value);
    if (parsed) return parsed;

    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return startOfDay(direct);
  }

  return null;
}

export function extractTransactionDate(transaction) {
  if (!transaction || typeof transaction !== "object") return computeTransactionDate(transaction);
  let date = transactionDateCache.get(transaction);
  if (date === undefined) {
    date = computeTransactionDate(transaction);
    transactionDateCache.set(transaction, date);
  }
  return date;
}

function getCachedTransactionDateKey(transaction) {
  if (!transaction || typeof transaction !== "object") {
    const date = computeTransactionDate(transaction);
    return date ? getTransactionDateKey(date) : null;
  }
  let key = transactionDateKeyCache.get(transaction);
  if (key === undefined) {
    const date = extractTransactionDate(transaction);
    key = date ? getTransactionDateKey(date) : null;
    transactionDateKeyCache.set(transaction, key);
  }
  return key;
}

export function filterTransactionsForDate(transactions, dateKey = getTodayTransactionDateKey()) {
  if (!dateKey) return [];
  return (transactions || []).filter((transaction) => getCachedTransactionDateKey(transaction) === dateKey);
}

export function hasTransactionsForDate(transactions, dateKey = getTodayTransactionDateKey()) {
  return filterTransactionsForDate(transactions, dateKey).length > 0;
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

export function buildMessage(lead, insight, templateContent = DEFAULT_MESSAGE_TEMPLATE) {
  const name = String(lead.name || "there").trim() || "there";
  const buildingName = lead.resolvedBuilding || lead.building;
  const cleanedBuilding = formatBuildingLabel(buildingName) || cleanBuildingName(buildingName) || "your building";
  const transactionLines = [];

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
      transactionLines.push(`- ${parts.join(" | ")}`);
    }
  }

  const safeTemplate = String(templateContent || DEFAULT_MESSAGE_TEMPLATE).includes("{{transactions}}")
    ? String(templateContent || DEFAULT_MESSAGE_TEMPLATE)
    : DEFAULT_MESSAGE_TEMPLATE;

  return safeTemplate
    .replaceAll("{{name}}", name)
    .replaceAll("{{building}}", cleanedBuilding)
    .replaceAll("{{transactions}}", transactionLines.join("\n"))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
