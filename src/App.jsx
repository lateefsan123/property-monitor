import { useEffect, useMemo, useState } from "react";
import { fetchTransactions, searchLocations } from "./api/bayut";
import "./App.css";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1-DgZjG5T93t5zmrHmyekKkOLwCRIYEMMOK4AbOrYOVU/edit?gid=865690319";
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 10;
const SENT_LEADS_KEY = "sent_leads_v1";
const LOCATION_CACHE_KEY = "bayut_location_cache_v1";
const RAW_LOCATION_CACHE_DAYS = Number(import.meta.env.VITE_LOCATION_CACHE_DAYS ?? "30");
const LOCATION_CACHE_DAYS = Number.isFinite(RAW_LOCATION_CACHE_DAYS) && RAW_LOCATION_CACHE_DAYS > 0
  ? RAW_LOCATION_CACHE_DAYS
  : 30;
const LOCATION_CACHE_TTL_MS = LOCATION_CACHE_DAYS * MILLISECONDS_PER_DAY;
const RAW_ENRICH_GROUP_LIMIT = Number(import.meta.env.VITE_ENRICH_TEST_GROUP_LIMIT ?? (import.meta.env.DEV ? "8" : "0"));
const ENRICH_GROUP_LIMIT = Number.isFinite(RAW_ENRICH_GROUP_LIMIT) && RAW_ENRICH_GROUP_LIMIT > 0
  ? Math.floor(RAW_ENRICH_GROUP_LIMIT)
  : 0;

const STATUS_RULES = [
  { id: "prospect", label: "Prospect", days: 75, keywords: ["prospect"] },
  { id: "market_appraisal", label: "Market Appraisal", days: 25, keywords: ["market appraisal", "appraisal", "valuation"] },
  { id: "for_sale_available", label: "For Sale Available", days: 5, keywords: ["for sale available", "for sale", "available"] },
];

const COLUMN_ALIASES = {
  name: ["name", "seller", "seller name", "owner", "owner name", "client", "lead name", "full name"],
  building: ["building", "tower", "project", "community", "building name", "tower name"],
  bedroom: ["bedroom", "bedrooms", "beds", "bed", "unit type", "bhk"],
  status: ["status", "stage", "category", "lead status", "pipeline", "contact status"],
  lastContact: ["last contact", "last contact date", "contact date", "last followup", "last follow up", "last message", "last contacted", "date"],
  phone: ["phone", "number", "mobile", "whatsapp", "whatsapp number", "contact number", "phone number"],
  unit: ["unit", "unit number", "apartment", "apt", "flat", "property number", "room"],
};

// --- Utility functions ---

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function loadLocationCache() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocationCache(cache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore localStorage write errors; API flow can still proceed.
  }
}

function loadSentLeads() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SENT_LEADS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSentLeads(sent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SENT_LEADS_KEY, JSON.stringify(sent));
  } catch {}
}

function getCachedLocation(cache, searchName, nowMs = Date.now()) {
  const key = normalizeToken(searchName);
  if (!key) return null;
  const entry = cache[key];
  if (!entry || typeof entry !== "object") return null;
  if (typeof entry.savedAt !== "number") return null;
  if (nowMs - entry.savedAt > LOCATION_CACHE_TTL_MS) return null;
  return entry.location && typeof entry.location === "object" ? entry.location : null;
}

function setCachedLocation(cache, searchName, location, nowMs = Date.now()) {
  const key = normalizeToken(searchName);
  if (!key || !location || typeof location !== "object") return;
  cache[key] = {
    savedAt: nowMs,
    location: {
      id: location.id ?? null,
      externalID: location.externalID ?? null,
      location_id: location.location_id ?? null,
      name: location.name ?? null,
      title: location.title ?? null,
      name_l1: location.name_l1 ?? null,
      full_name: location.full_name ?? null,
      path: location.path ?? null,
      location: Array.isArray(location.location) ? location.location : (location.location ?? null),
    },
  };
}

function inferColumn(headers, aliases) {
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeToken(header) }));
  const normalizedAliases = aliases.map((alias) => normalizeToken(alias));

  for (const alias of normalizedAliases) {
    const exactMatch = normalizedHeaders.find((header) => header.normalized === alias);
    if (exactMatch) return exactMatch.header;
  }

  for (const alias of normalizedAliases.filter((a) => a.length >= 5)) {
    const partialMatch = normalizedHeaders.find((header) => header.normalized.includes(alias));
    if (partialMatch) return partialMatch.header;
  }

  return null;
}

function inferMapping(headers) {
  return {
    name: inferColumn(headers, COLUMN_ALIASES.name),
    building: inferColumn(headers, COLUMN_ALIASES.building),
    bedroom: inferColumn(headers, COLUMN_ALIASES.bedroom),
    status: inferColumn(headers, COLUMN_ALIASES.status),
    lastContact: inferColumn(headers, COLUMN_ALIASES.lastContact),
    phone: inferColumn(headers, COLUMN_ALIASES.phone),
    unit: inferColumn(headers, COLUMN_ALIASES.unit),
  };
}

function mappingScore(mapping) {
  let score = 0;
  if (mapping.name) score += 2;
  if (mapping.building) score += 3;
  if (mapping.bedroom) score += 1;
  if (mapping.status) score += 3;
  if (mapping.lastContact) score += 3;
  if (mapping.phone) score += 2;
  if (mapping.unit) score += 1;
  return score;
}

function parseCsvText(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === "\"") {
        if (source[i + 1] === "\"") {
          field += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") { inQuotes = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (char !== "\r") field += char;
  }

  row.push(field);
  if (row.some((v) => String(v).trim() !== "")) rows.push(row);
  return rows;
}

function makeHeadersUnique(headers) {
  const counts = {};
  return headers.map((header) => {
    const base = String(header || "").trim() || "Column";
    counts[base] = (counts[base] || 0) + 1;
    return counts[base] === 1 ? base : `${base} (${counts[base]})`;
  });
}

function rowsToObjects(rows) {
  if (!rows.length) return { headers: [], records: [] };

  // Some sheets start with dashboard rows; detect the best header row.
  const scanLimit = Math.min(rows.length, 40);
  let headerRowIndex = 0;
  let bestScore = -1;

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const candidateHeaders = rows[rowIndex].map((value, index) => {
      const label = String(value || "").trim();
      return label || `Column ${index + 1}`;
    });
    const candidateScore = mappingScore(inferMapping(candidateHeaders));
    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      headerRowIndex = rowIndex;
    }
  }

  const rawHeaders = rows[headerRowIndex].map((value, index) => {
    const label = String(value || "").trim();
    return label || `Column ${index + 1}`;
  });
  const headers = makeHeadersUnique(rawHeaders);

  const records = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((value) => String(value || "").trim() !== ""))
    .map((row, dataIndex) => {
      const record = { __row: headerRowIndex + 2 + dataIndex };
      headers.forEach((header, colIndex) => {
        record[header] = String(row[colIndex] ?? "").trim();
      });
      return record;
    });

  return { headers, records };
}

function startOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(dateValue, days) {
  const date = startOfDay(dateValue);
  date.setDate(date.getDate() + days);
  return date;
}

function dayDelta(fromDate, toDate) {
  return Math.floor((startOfDay(toDate) - startOfDay(fromDate)) / MILLISECONDS_PER_DAY);
}

function toIsoDateLocal(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 20000 && serial < 90000) {
      const unixDays = Math.floor(serial - 25569);
      const fromSerial = new Date(unixDays * MILLISECONDS_PER_DAY);
      if (!Number.isNaN(fromSerial.getTime())) return startOfDay(fromSerial);
    }
    return null;
  }

  let match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) return startOfDay(parsed);
  }

  match = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) return startOfDay(parsed);
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return startOfDay(direct);

  return null;
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatPrice(value) {
  if (!value) return "-";
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(value);
}

function formatPsf(value) {
  if (!value) return "-";
  return `${Math.round(value).toLocaleString("en-US")} AED/sqft`;
}

function formatRange(min, max) {
  if (!min || !max) return "-";
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

function formatBedsLabel(value) {
  if (value === 0) return "Studio";
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return `${value} bed`;
  return "-";
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPrice(tx) {
  for (const v of [tx?.price, tx?.amount, tx?.sale_price, tx?.sold_price, tx?.transaction_value, tx?.value]) {
    const p = parseNumber(v);
    if (p && p > 0) return p;
  }
  return null;
}

function extractArea(tx) {
  for (const v of [tx?.area, tx?.built_up_area, tx?.size, tx?.sqft, tx?.area_sqft]) {
    const p = parseNumber(v);
    if (p && p > 0) return p;
  }
  return null;
}

function extractBeds(tx) {
  for (const value of [tx?.beds, tx?.bedrooms, tx?.rooms]) {
    const numeric = parseNumber(value);
    if (numeric !== null && numeric >= 0) return Math.round(numeric);
    const match = String(value || "").match(/(\d+)/);
    if (match) return Number(match[1]);
  }
  return null;
}

function extractTransactionDate(tx) {
  for (const value of [tx?.date, tx?.transaction_date, tx?.created_at, tx?.createdAt, tx?.transfer_date]) {
    const parsed = parseDateValue(value);
    if (parsed) return parsed;
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return startOfDay(direct);
  }
  return null;
}

function extractTransactionLocationLabel(tx, fallback = null) {
  const full = tx?.location?.full_location;
  if (typeof full === "string" && full.trim()) {
    const parts = full.split("->").map((part) => part.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  for (const value of [tx?.location?.location, tx?.location?.name, tx?.building_name, tx?.project_name, tx?.tower_name, tx?.property_name, tx?.area_name]) {
    const label = String(value || "").trim();
    if (label) return label;
  }

  return fallback || "-";
}

function extractTransactionFloor(tx) {
  for (const value of [tx?.property?.floor, tx?.floor]) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return null;
}

function buildRecentTransactions(transactions, limit = 5, fallbackLocation = null) {
  return transactions
    .map((tx, index) => {
      const price = extractPrice(tx);
      if (!price) return null;
      const area = extractArea(tx);
      return {
        id: tx?.id || tx?.transaction_id || tx?.externalID || `${index}-${price}`,
        date: extractTransactionDate(tx),
        price,
        beds: extractBeds(tx),
        area,
        locationLabel: extractTransactionLocationLabel(tx, fallbackLocation),
        floor: extractTransactionFloor(tx),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.date ? a.date.getTime() : 0;
      const bTime = b.date ? b.date.getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}

function extractLocationId(loc) {
  return loc?.id || loc?.externalID || loc?.location_id || null;
}

function extractLocationName(loc) {
  return loc?.name || loc?.title || loc?.name_l1 || "Unknown";
}

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  return payload.hits || payload.results || payload.transactions || [];
}

// Strip bedroom counts, apartment numbers, and noise from building names
// "Forte 3 bed" -> "Forte", "Burj views one bed" -> "Burj views"
// "Apartment 1502, 29 Burj Boulevard, ..." -> "29 Burj Boulevard"
function cleanBuildingName(raw) {
  let name = String(raw || "").trim();

  // If it starts with "Apartment NNN," extract the building name after the comma
  const aptMatch = name.match(/^(?:\[.*?\]\s*)?Apartment\s+[\w-]+(?:\s*\(.*?\))?\s*,\s*(.+)/i);
  if (aptMatch) {
    // Take the part after "Apartment XXX," — usually "Building Name, Area, City"
    const parts = aptMatch[1].split(",").map((s) => s.trim());
    // First part is usually the building name
    name = parts[0] || name;
  }

  // Strip bedroom descriptors
  name = name
    .replace(/\b(one|two|three|four|five|1|2|3|4|5)\s*[-\s]?\s*bed(room)?s?\b/gi, "")
    .replace(/\bstudio\b/gi, "")
    .replace(/\b\d+\s*bhk\b/gi, "")
    .replace(/\b\d+\s*br\b/gi, "");

  // Strip status markers
  name = name
    .replace(/\((?:NOT\s+)?LIVE\)/gi, "")
    .replace(/\(FSA[^)]*\)/gi, "")
    .replace(/\(Not\s+Live\)/gi, "")
    .replace(/\(NOT\s+ON\s+PF\)/gi, "")
    .replace(/\[OFFLINE\]/gi, "")
    .replace(/\[NOT\s+LIVE\]/gi, "");

  // Strip unit/apartment prefix if still present
  name = name.replace(/^(?:Villa|Unit)\s+[\w-]+\s*,?\s*/i, "");

  // Clean up trailing commas, dashes, extra spaces
  name = name.replace(/[,\-/]+$/, "").replace(/\s+/g, " ").trim();

  return name || String(raw || "").trim();
}

function parseBedroom(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return { label: "unit", beds: null };
  const lower = raw.toLowerCase();
  if (lower.includes("studio")) return { label: "studio", beds: [0] };
  const match = lower.match(/(\d+)/);
  if (match) {
    const bedCount = Number(match[1]);
    // Guard against bad source values (e.g. phone numbers in bedroom column).
    if (Number.isFinite(bedCount) && bedCount >= 0 && bedCount <= 8) {
      return { label: `${bedCount}-bed`, beds: [bedCount] };
    }
  }
  return { label: raw, beds: null };
}

function resolveStatusRule(rawStatus) {
  const normalized = normalizeToken(rawStatus);
  if (!normalized) return null;
  for (const rule of STATUS_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(normalizeToken(keyword))) return rule;
    }
  }
  return null;
}

function buildGoogleCsvUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || "").trim());
    const sheetIdMatch = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) return null;
    const gid = parsed.searchParams.get("gid") || "0";
    return `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv&gid=${gid}`;
  } catch {
    return null;
  }
}

function pickBestLocation(locations, buildingName) {
  const target = normalizeToken(buildingName);
  if (!target) return null;

  let best = null;
  let bestScore = -1;

  for (const loc of locations) {
    const name = extractLocationName(loc);
    const fullPath = loc?.full_name || loc?.path || (Array.isArray(loc?.location) ? loc.location.join(" ") : "");
    const nName = normalizeToken(name);
    const nFull = normalizeToken(fullPath);

    let score = 0;
    if (nName === target) score += 120;
    if (nName.includes(target) || target.includes(nName)) score += 70;
    if (nFull.includes(target)) score += 35;
    score += Math.max(0, 20 - Math.abs(name.length - buildingName.length));

    if (score > bestScore) { bestScore = score; best = loc; }
  }

  return best;
}

function summarizeTransactions(transactions) {
  const prices = [];
  const psfValues = [];

  for (const tx of transactions) {
    const price = extractPrice(tx);
    if (!price) continue;
    prices.push(price);
    const area = extractArea(tx);
    if (area) psfValues.push(price / area);
  }

  if (!prices.length) return { count: transactions.length, avg: null, min: null, max: null, psf: null };

  return {
    count: transactions.length,
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    psf: psfValues.length ? psfValues.reduce((a, b) => a + b, 0) / psfValues.length : null,
  };
}

function formatPhoneForWhatsApp(raw) {
  const digits = String(raw || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  // If it starts with 0, assume UAE and replace with 971
  if (digits.startsWith("0")) return "971" + digits.slice(1);
  // If it already has country code
  if (digits.startsWith("971")) return digits;
  // Otherwise return as-is
  return digits;
}

function formatPriceShort(value) {
  if (!value) return "-";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M AED`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K AED`;
  return `${Math.round(value)} AED`;
}

function buildMessage(lead, insight) {
  const name = lead.name || "";
  const cleanedBuilding = cleanBuildingName(lead.building) || "your building";

  const lines = [
    `Hi ${name}, quick update on recent transactions in ${cleanedBuilding}.`,
    "",
  ];

  const txs = insight?.recentTransactions;
  if (txs?.length) {
    for (const tx of txs) {
      const parts = [];
      if (tx.locationLabel && tx.locationLabel !== "-") parts.push(tx.locationLabel);
      if (tx.beds !== null && tx.beds !== undefined) parts.push(tx.beds === 0 ? "Studio" : `${tx.beds} Bed`);
      parts.push(formatPriceShort(tx.price));
      if (tx.area) parts.push(`${Math.round(tx.area).toLocaleString("en-US")} sqft`);
      if (tx.date) parts.push(formatDate(tx.date));
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

function mapLeadRow(record, index, mapping, today) {
  const name = mapping.name ? record[mapping.name] : "";
  const building = mapping.building ? record[mapping.building] : "";
  const bedroom = mapping.bedroom ? record[mapping.bedroom] : "";
  const status = mapping.status ? record[mapping.status] : "";
  const lastContactRaw = mapping.lastContact ? record[mapping.lastContact] : "";
  const phone = mapping.phone ? record[mapping.phone] : "";
  const unit = mapping.unit ? record[mapping.unit] : "";

  const statusRule = resolveStatusRule(status);
  const bedroomInfo = parseBedroom(bedroom);
  const lastContactDate = parseDateValue(lastContactRaw);

  let isDue = false;
  let dueLabel = "No cadence rule";
  let nextDueDate = null;
  let overdueDays = 0;

  if (statusRule) {
    if (!lastContactDate) {
      isDue = true;
      dueLabel = "Due now (no last contact)";
    } else {
      nextDueDate = addDays(lastContactDate, statusRule.days);
      const daysUntilDue = dayDelta(today, nextDueDate);

      if (daysUntilDue <= 0) {
        isDue = true;
        overdueDays = Math.abs(daysUntilDue);
        dueLabel = overdueDays ? `Overdue ${overdueDays}d` : "Due today";
      } else {
        dueLabel = `In ${daysUntilDue}d`;
      }
    }
  }

  return {
    id: `${record.__row || index + 2}-${index}`,
    rowNumber: record.__row || index + 2,
    name, building, bedroom, unit, phone,
    bedroomLabel: bedroomInfo.label,
    bedFilterValues: bedroomInfo.beds,
    status,
    statusLabel: statusRule?.label || status || "Unknown",
    statusRule,
    lastContactRaw,
    lastContactDate,
    isDue, dueLabel, nextDueDate, overdueDays,
  };
}

function MessagePreview({ value }) {
  return <div className="message-preview">{value}</div>;
}

// --- App ---

function App() {
  const [leads, setLeads] = useState([]);
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);
  const [showDueOnly, setShowDueOnly] = useState(true);
  const [copiedLeadId, setCopiedLeadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sentLeads, setSentLeads] = useState(loadSentLeads);
  const [sentFilter, setSentFilter] = useState("all");

  function toggleSent(leadId) {
    setSentLeads((prev) => {
      const next = { ...prev };
      if (next[leadId]) {
        delete next[leadId];
      } else {
        next[leadId] = Date.now();
      }
      saveSentLeads(next);
      return next;
    });
  }

  // Auto-load the sheet on mount
  useEffect(() => {
    loadSheet();
  }, []);

  async function loadSheet() {
    setLoading(true);
    setError(null);

    try {
      const csvUrl = buildGoogleCsvUrl(SHEET_URL);
      if (!csvUrl) throw new Error("Invalid sheet URL.");

      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`Failed to load sheet (${response.status})`);

      const csvText = await response.text();
      const rows = parseCsvText(csvText);
      const { headers, records } = rowsToObjects(rows);

      if (!headers.length) throw new Error("Sheet has no header row.");

      const mapping = inferMapping(headers);

      if (!mapping.name || !mapping.building || !mapping.status || !mapping.lastContact) {
        throw new Error("Could not detect lead headers. Ensure the sheet has name, building, status, and date columns.");
      }

      const today = startOfDay(new Date());

      const parsed = records
        .map((record, index) => mapLeadRow(record, index, mapping, today))
        .filter((lead) => lead.name || lead.building || lead.phone)
        .sort((a, b) => {
          if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
          if (a.overdueDays !== b.overdueDays) return b.overdueDays - a.overdueDays;
          return a.rowNumber - b.rowNumber;
        });

      setLeads(parsed);
      setInsights({});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const dueLeads = useMemo(() => leads.filter((l) => l.isDue), [leads]);

  const filteredLeads = useMemo(() => {
    let result = showDueOnly ? dueLeads : leads;

    if (sentFilter === "sent") {
      result = result.filter((l) => sentLeads[l.id]);
    } else if (sentFilter === "unsent") {
      result = result.filter((l) => !sentLeads[l.id]);
    }

    if (statusFilter !== "all") {
      result = result.filter((l) => l.statusRule?.id === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          (l.name || "").toLowerCase().includes(term) ||
          (l.building || "").toLowerCase().includes(term) ||
          (l.phone || "").toLowerCase().includes(term),
      );
    }

    return result;
  }, [showDueOnly, dueLeads, leads, sentFilter, sentLeads, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedLeads = filteredLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const readyCount = useMemo(
    () => Object.values(insights).filter((i) => i?.status === "ready").length,
    [insights],
  );

  async function enrichDueLeads() {
    const targets = leads.filter((l) => l.building);
    if (!targets.length) { setError("No leads with a building name."); return; }

    // Step 1: Group leads by cleaned building + bedroom filters
    const buildingGroups = {};
    for (const lead of targets) {
      const cleaned = cleanBuildingName(lead.building);
      const normalized = normalizeToken(cleaned);
      if (!normalized) continue;

      const beds = Array.isArray(lead.bedFilterValues) && lead.bedFilterValues.length
        ? [...lead.bedFilterValues].sort((a, b) => a - b)
        : null;
      const bedKey = beds ? beds.join(",") : "any";
      const key = `${normalized}::${bedKey}`;

      if (!buildingGroups[key]) buildingGroups[key] = { searchName: cleaned, beds, leads: [] };
      buildingGroups[key].leads.push(lead);
    }

    const uniqueQueries = Object.values(buildingGroups);
    const activeQueries = ENRICH_GROUP_LIMIT > 0
      ? uniqueQueries.slice(0, ENRICH_GROUP_LIMIT)
      : uniqueQueries;
    const targetLeads = activeQueries.flatMap((group) => group.leads);
    if (!activeQueries.length || !targetLeads.length) {
      setError("No leads available for enrichment.");
      return;
    }

    // Mark only selected test batch as loading
    const loadingUpdates = {};
    for (const lead of targetLeads) {
      loadingUpdates[lead.id] = { status: "loading", message: buildMessage(lead, null) };
    }
    setInsights((prev) => ({ ...prev, ...loadingUpdates }));

    setEnriching(true);
    setError(null);
    setEnrichProgress({ done: 0, total: activeQueries.length });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = toIsoDateLocal(monthStart);
    const endDate = toIsoDateLocal(now);
    const locationCache = loadLocationCache();
    let locationCacheDirty = false;
    const cacheTimestamp = Date.now();

    // Step 2: Fetch Bayut data once per unique building + bedroom filter
    for (let i = 0; i < activeQueries.length; i += 1) {
      const group = activeQueries[i];

      // Rate limit: 2s between query groups
      if (i > 0) await new Promise((r) => setTimeout(r, 2000));

      try {
        let best = getCachedLocation(locationCache, group.searchName, cacheTimestamp);
        if (!best) {
          const locPayload = await searchLocations(group.searchName);
          const locs = toList(locPayload);
          best = pickBestLocation(locs, group.searchName);
          if (!best) throw new Error(`No match for "${group.searchName}"`);
          setCachedLocation(locationCache, group.searchName, best, cacheTimestamp);
          locationCacheDirty = true;
        }

        let locId = extractLocationId(best);
        if (!locId) {
          // Fallback for stale/incomplete cache entries.
          const locPayload = await searchLocations(group.searchName);
          const locs = toList(locPayload);
          best = pickBestLocation(locs, group.searchName);
          if (!best) throw new Error(`No match for "${group.searchName}"`);
          locId = extractLocationId(best);
          if (!locId) throw new Error("Location has no ID.");
          setCachedLocation(locationCache, group.searchName, best, cacheTimestamp);
          locationCacheDirty = true;
        }

        if (!locId) throw new Error("Location has no ID.");

        // Wait before transactions call
        await new Promise((r) => setTimeout(r, 2000));

        const txRequest = {
          locationIds: [locId],
          startDate,
          endDate,
          beds: group.beds || undefined,
          purpose: "for-sale",
          category: "residential",
          completionStatus: "completed",
          sortBy: "date",
          order: "desc",
        };

        let txPayload = await fetchTransactions(txRequest);
        let txs = toList(txPayload);

        // If strict bedroom filter is too narrow, retry without it once.
        if (!txs.length && txRequest.beds?.length) {
          await new Promise((r) => setTimeout(r, 1200));
          txPayload = await fetchTransactions({ ...txRequest, beds: undefined });
          txs = toList(txPayload);
        }

        const metrics = summarizeTransactions(txs);
        const locationName = extractLocationName(best);
        const recentTransactions = buildRecentTransactions(txs, 5, locationName);

        // Apply to all leads in this building group
        const updates = {};
        const insightData = { status: "ready", ...metrics, locationName, recentTransactions };
        for (const lead of group.leads) {
          updates[lead.id] = {
            ...insightData,
            message: buildMessage(lead, insightData),
          };
        }
        setInsights((prev) => ({ ...prev, ...updates }));
      } catch (err) {
        // Mark all leads in this group as errored
        const updates = {};
        for (const lead of group.leads) {
          updates[lead.id] = { status: "error", error: err.message, message: buildMessage(lead, null) };
        }
        setInsights((prev) => ({ ...prev, ...updates }));
      }

      setEnrichProgress({ done: i + 1, total: activeQueries.length });
    }

    if (locationCacheDirty) saveLocationCache(locationCache);
    setEnriching(false);
  }

  async function copyMessage(leadId, message) {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedLeadId(leadId);
      setTimeout(() => setCopiedLeadId((c) => (c === leadId ? null : c)), 1200);
    } catch {
      setError("Clipboard copy failed.");
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Seller Follow-up</h1>
        </header>
        <div className="empty">Loading sellers...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Seller Follow-up</h1>
        <p className="subtitle">
          {leads.length} sellers loaded
          {dueLeads.length > 0 && <> &middot; <strong>{dueLeads.length} due</strong></>}
          {readyCount > 0 && <> &middot; {readyCount} enriched</>}
        </p>
      </header>

      {error && <div className="error">{error}</div>}

      {leads.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="toolbar">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />

            <div className="toolbar-actions">
              <div className="tabs">
                {[
                  { id: "all", label: "All" },
                  { id: "prospect", label: "Prospect" },
                  { id: "market_appraisal", label: "Appraisal" },
                  { id: "for_sale_available", label: "For Sale" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`tab${statusFilter === tab.id ? " active" : ""}`}
                    onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={showDueOnly}
                  onChange={(e) => { setShowDueOnly(e.target.checked); setCurrentPage(1); }}
                />
                Due only
              </label>

              <div className="tabs">
                {[
                  { id: "all", label: "All" },
                  { id: "unsent", label: "Unsent" },
                  { id: "sent", label: "Sent" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`tab${sentFilter === tab.id ? " active" : ""}`}
                    onClick={() => { setSentFilter(tab.id); setCurrentPage(1); }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button className="btn-primary" onClick={enrichDueLeads} disabled={enriching}>
                {enriching ? `Fetching (${enrichProgress.done}/${enrichProgress.total})` : "Fetch Bayut data"}
              </button>

              <button onClick={loadSheet} disabled={loading}>Reload</button>
            </div>
          </div>

          {/* Count */}
          <p className="count-text">{filteredLeads.length} leads</p>

          {/* Lead cards */}
          <div className="lead-list">
            {pagedLeads.map((lead) => {
              const insight = insights[lead.id];
              const message = insight?.message || buildMessage(lead, insight);

              return (
                <article key={lead.id} className={`lead-card${sentLeads[lead.id] ? " lead-sent" : ""}`}>
                  <div className="lead-top">
                    <div>
                      <span className="lead-name">{lead.name || "Unnamed"}</span>
                      <span className="lead-building">{lead.building || "-"}</span>
                    </div>
                    <div className="badge-row">
                      <span className="badge">{lead.statusLabel}</span>
                      <span className={`badge ${lead.isDue ? "due" : "ok"}`}>{lead.dueLabel}</span>
                    </div>
                  </div>

                  <div className="lead-meta">
                    <span>{lead.bedroom || "-"}</span>
                    <span>{formatDate(lead.lastContactDate)}</span>
                    <span>{lead.phone ? <><svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> {lead.phone}</> : "-"}</span>
                    <span>Due: {formatDate(lead.nextDueDate)}</span>
                  </div>

                  {insight?.status === "ready" && (
                    <>
                      <div className="bayut-row">
                        <span>{insight.count} txns</span>
                        <span>Avg {formatPrice(insight.avg)}</span>
                        <span>{formatPsf(insight.psf)}</span>
                        <span>{formatRange(insight.min, insight.max)}</span>
                      </div>
                      {insight.recentTransactions?.length > 0 ? (
                        <div className="tx-list">
                          <p className="tx-title">Recent sales (this month) in {insight.locationName || lead.building}</p>
                          <div className="tx-items">
                            {insight.recentTransactions.map((tx) => (
                              <div key={tx.id} className="tx-item">
                                <span>{formatDate(tx.date)}</span>
                                <span>{formatPrice(tx.price)}</span>
                                <span>{formatBedsLabel(tx.beds)}</span>
                                <span>{tx.area ? `${Math.round(tx.area).toLocaleString("en-US")} sqft` : "-"}</span>
                                <span>{`${tx.locationLabel} (Flr ${tx.floor || "-"})`}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="muted">No priced sales found in this month window.</p>
                      )}
                    </>
                  )}
                  {insight?.status === "loading" && <p className="muted">Loading Bayut data...</p>}
                  {insight?.status === "error" && <p className="error-sm">Bayut: {insight.error}</p>}

                  <div className="msg-block">
                    <MessagePreview value={message} />
                    <div className="msg-actions">
                      <button className="btn-sm" onClick={() => copyMessage(lead.id, message)}>
                        {copiedLeadId === lead.id ? "Copied" : "Copy"}
                      </button>
                      {lead.phone && (
                        <a
                          className="btn-sm btn-wa"
                          href={`https://wa.me/${formatPhoneForWhatsApp(lead.phone)}?text=${encodeURIComponent(message)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => toggleSent(lead.id)}
                        >
                          <svg className="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                          WhatsApp
                        </a>
                      )}
                      <button
                        className={`btn-sm${sentLeads[lead.id] ? " btn-sent" : ""}`}
                        onClick={() => toggleSent(lead.id)}
                      >
                        {sentLeads[lead.id] ? "Sent" : "Mark Sent"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="pagination">
              <button disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Prev</button>
              <span>{safePage} / {totalPages}</span>
              <button disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </nav>
          )}
        </>
      )}

      {!loading && !leads.length && <div className="empty">No sellers found in sheet.</div>}
    </div>
  );
}

export default App;
