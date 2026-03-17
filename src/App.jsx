import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import { aiMapColumns } from "./ai-mapper";
import "./App.css";
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 10;
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

function countNewTransactionsSince(insight, sentTimestamp) {
  if (!insight?.allTransactionDates?.length || !sentTimestamp) return 0;
  const sentDate = startOfDay(new Date(sentTimestamp));
  return insight.allTransactionDates.filter((d) => d > sentDate).length;
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

function App({ session }) {
  const [leads, setLeads] = useState([]);
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState(null);
  const [showDueOnly, setShowDueOnly] = useState(true);
  const [copiedLeadId, setCopiedLeadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sentLeads, setSentLeads] = useState({});
  const [sheetUrl, setSheetUrl] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [viewTab, setViewTab] = useState("active");
  const [dataFilter, setDataFilter] = useState("all"); // "all" | "with_data" | "no_data"
  const [expandedLeads, setExpandedLeads] = useState({});
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  const displayName = session.user.user_metadata?.username;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const userId = session.user.id;

  async function saveUsername(e) {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    setSavingUsername(true);
    const { error } = await supabase.auth.updateUser({ data: { username: trimmed } });
    if (error) setError(error.message);
    setSavingUsername(false);
  }

  async function toggleSent(leadId) {
    setSentLeads((prev) => {
      const next = { ...prev };
      if (next[leadId]) {
        delete next[leadId];
        supabase.from("sent_leads").delete().eq("user_id", userId).eq("lead_id", leadId).then();
      } else {
        next[leadId] = Date.now();
        supabase.from("sent_leads").upsert({ user_id: userId, lead_id: leadId }).then();
      }
      return next;
    });
  }

  // Load leads from Supabase on mount
  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    setError(null);

    try {
      // Fetch leads for this user
      const { data: dbLeads, error: lErr } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", userId)
        .order("id");
      if (lErr) throw new Error(lErr.message);

      // Fetch sent status
      const { data: sentRows } = await supabase
        .from("sent_leads")
        .select("lead_id, sent_at")
        .eq("user_id", userId);
      const sentMap = {};
      for (const s of sentRows || []) sentMap[s.lead_id] = new Date(s.sent_at).getTime();
      setSentLeads(sentMap);

      const today = startOfDay(new Date());

      const parsed = (dbLeads || [])
        .map((row, index) => {
          // Build a record compatible with mapLeadRow
          const record = {
            __row: row.id,
            _name: row.name || "",
            _building: row.building || "",
            _bedroom: row.bedroom || "",
            _status: row.status || "",
            _lastContact: row.last_contact || "",
            _phone: row.phone || "",
            _unit: row.unit || "",
          };
          const mapping = {
            name: "_name",
            building: "_building",
            bedroom: "_bedroom",
            status: "_status",
            lastContact: "_lastContact",
            phone: "_phone",
            unit: "_unit",
          };
          const lead = mapLeadRow(record, index, mapping, today);
          lead.id = row.id; // Use DB id for sent_leads FK
          return lead;
        })
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

  async function importFromSheet() {
    if (!sheetUrl.trim()) { setError("Paste a Google Sheet URL first."); return; }

    setImporting(true);
    setError(null);

    try {
      const csvUrl = buildGoogleCsvUrl(sheetUrl.trim());
      if (!csvUrl) throw new Error("Invalid Google Sheet URL. Paste the full URL from your browser.");

      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`Failed to load sheet (${response.status}). Make sure the sheet is shared publicly or "Anyone with the link".`);

      const csvText = await response.text();
      const rawRows = parseCsvText(csvText);
      const { headers, records } = rowsToObjects(rawRows);

      if (!headers.length) throw new Error("Sheet has no header row.");

      // Try hardcoded inference first, fall back to AI
      let mapping = inferMapping(headers);
      const hasMinimum = mapping.name && mapping.building;

      if (!hasMinimum) {
        // Use AI to map columns
        const sampleData = rawRows.slice(0, 6);
        mapping = await aiMapColumns(headers, sampleData);
      }

      if (!mapping.name && !mapping.building && !mapping.phone) {
        throw new Error("Could not map any columns. Make sure the sheet has seller names, buildings, or phone numbers.");
      }

      // Build rows for Supabase
      const leadsToInsert = records
        .map((record) => {
          const name = mapping.name ? record[mapping.name] : "";
          const building = mapping.building ? record[mapping.building] : "";
          const bedroom = mapping.bedroom ? record[mapping.bedroom] : "";
          const status = mapping.status ? record[mapping.status] : "";
          const lastContactRaw = mapping.lastContact ? record[mapping.lastContact] : "";
          const phone = mapping.phone ? record[mapping.phone] : "";
          const unit = mapping.unit ? record[mapping.unit] : "";

          if (!name && !building && !phone) return null;

          const lastContactDate = parseDateValue(lastContactRaw);

          return {
            user_id: userId,
            name: name || null,
            building: building || null,
            bedroom: bedroom || null,
            unit: unit || null,
            phone: phone || null,
            status: status || null,
            last_contact: lastContactDate ? lastContactDate.toISOString().split("T")[0] : null,
          };
        })
        .filter(Boolean);

      if (!leadsToInsert.length) throw new Error("No valid leads found in sheet.");

      // Clear existing leads for this user, then insert fresh
      await supabase.from("sent_leads").delete().eq("user_id", userId);
      await supabase.from("leads").delete().eq("user_id", userId);

      // Insert in batches
      const batchSize = 200;
      for (let i = 0; i < leadsToInsert.length; i += batchSize) {
        const batch = leadsToInsert.slice(i, i + batchSize);
        const { error: iErr } = await supabase.from("leads").insert(batch);
        if (iErr) throw new Error(iErr.message);
      }

      setShowImport(false);
      setSheetUrl("");
      await loadLeads();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  const dueLeads = useMemo(() => leads.filter((l) => l.isDue), [leads]);

  // Split leads into active vs done based on sent status and new transactions
  const { activeLeads, doneLeads } = useMemo(() => {
    const active = [];
    const done = [];
    const MIN_NEW_TXS = 2;

    for (const lead of leads) {
      const sentAt = sentLeads[lead.id];
      if (!sentAt) {
        active.push(lead);
      } else {
        const newTxCount = countNewTransactionsSince(insights[lead.id], sentAt);
        if (newTxCount >= MIN_NEW_TXS) {
          active.push({ ...lead, newTxSinceSent: newTxCount });
        } else {
          done.push(lead);
        }
      }
    }

    return { activeLeads: active, doneLeads: done };
  }, [leads, sentLeads, insights]);

  const filteredLeads = useMemo(() => {
    const pool = viewTab === "done" ? doneLeads : activeLeads;
    let result = showDueOnly ? pool.filter((l) => l.isDue) : pool;

    if (statusFilter !== "all") {
      result = result.filter((l) => l.statusRule?.id === statusFilter);
    }

    if (dataFilter === "with_data") {
      result = result.filter((l) => insights[l.id]?.status === "ready");
    } else if (dataFilter === "no_data") {
      result = result.filter((l) => insights[l.id]?.status !== "ready");
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
  }, [viewTab, activeLeads, doneLeads, showDueOnly, statusFilter, dataFilter, searchTerm, insights]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedLeads = filteredLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const readyCount = useMemo(
    () => Object.values(insights).filter((i) => i?.status === "ready").length,
    [insights],
  );

  // Auto-enrich when leads are loaded
  const hasAutoEnriched = useRef(false);
  useEffect(() => {
    if (!loading && leads.length > 0 && !hasAutoEnriched.current) {
      hasAutoEnriched.current = true;
      enrichDueLeads();
    }
  }, [loading, leads]);

  async function enrichDueLeads() {
    const targets = leads.filter((l) => l.building);
    if (!targets.length) { setError("No leads with a building name."); return; }

    setEnriching(true);
    setError(null);

    try {
      // Collect unique building keys for this batch
      const keyMap = {};
      for (const lead of targets) {
        const cleaned = cleanBuildingName(lead.building);
        const key = normalizeToken(cleaned);
        if (key) keyMap[key] = cleaned;
      }
      const buildingKeys = Object.keys(keyMap);

      // Fetch buildings from Supabase
      const { data: buildingRows, error: bErr } = await supabase
        .from("buildings")
        .select("key, location_name")
        .in("key", buildingKeys);
      if (bErr) throw new Error(bErr.message);

      const buildingLookup = {};
      for (const b of buildingRows || []) buildingLookup[b.key] = b;

      // Fetch transactions for these buildings
      const { data: txRows, error: tErr } = await supabase
        .from("transactions")
        .select("*")
        .in("building_key", buildingKeys);
      if (tErr) throw new Error(tErr.message);

      // Group transactions by building_key
      const txByBuilding = {};
      for (const tx of txRows || []) {
        if (!txByBuilding[tx.building_key]) txByBuilding[tx.building_key] = [];
        // Map DB columns to the shape the existing helpers expect
        txByBuilding[tx.building_key].push({
          amount: tx.amount,
          category: tx.category,
          date: tx.date,
          property: {
            floor: tx.floor,
            beds: tx.beds,
            type: tx.property_type,
            builtup_area: { sqft: tx.builtup_area_sqft },
          },
          location: {
            location: tx.location_name,
            full_location: tx.full_location,
            coordinates: { latitude: tx.latitude, longitude: tx.longitude },
          },
        });
      }

      const updates = {};
      let matched = 0;

      for (const lead of targets) {
        const cleaned = cleanBuildingName(lead.building);
        const key = normalizeToken(cleaned);
        const building = buildingLookup[key];

        if (!building || !txByBuilding[key]?.length) {
          updates[lead.id] = { status: "error", error: "No data found", message: buildMessage(lead, null) };
          continue;
        }

        let txs = txByBuilding[key];

        // Filter by bedroom if lead has a specific bedroom filter
        if (Array.isArray(lead.bedFilterValues) && lead.bedFilterValues.length) {
          const bedFiltered = txs.filter((tx) => {
            const beds = extractBeds(tx);
            return beds !== null && lead.bedFilterValues.includes(beds);
          });
          if (bedFiltered.length) txs = bedFiltered;
        }

        const metrics = summarizeTransactions(txs);
        const locationName = building.location_name || cleaned;
        const recentTransactions = buildRecentTransactions(txs, 5, locationName);
        const allTransactionDates = txs.map((tx) => extractTransactionDate(tx)).filter(Boolean);
        const insightData = { status: "ready", ...metrics, locationName, recentTransactions, allTransactionDates };
        updates[lead.id] = { ...insightData, message: buildMessage(lead, insightData) };
        matched++;
      }

      setInsights((prev) => ({ ...prev, ...updates }));

      if (matched === 0) {
        setError("No buildings matched in Supabase. Run \"npm run fetch:bayut\" to update.");
      }
    } catch (err) {
      setError(err.message);
    }

    setEnriching(false);
  }

  function bulkWhatsApp(markAsSent = true) {
    const targets = pagedLeads.filter((l) => l.phone && formatPhoneForWhatsApp(l.phone) && insights[l.id]?.status === "ready");
    if (!targets.length) return;
    for (let i = 0; i < targets.length; i++) {
      const lead = targets[i];
      const insight = insights[lead.id];
      const message = insight?.message || buildMessage(lead, insight);
      const phone = formatPhoneForWhatsApp(lead.phone);
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      setTimeout(() => window.open(url, "_blank"), i * 600);
      if (markAsSent && !sentLeads[lead.id]) toggleSent(lead.id);
    }
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

  // --- Username prompt ---
  if (!displayName) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img src={theme === "dark" ? "/darkmode logo.png" : "/logo.png"} alt="Seller Signal" className="auth-logo" />
          <p className="auth-subtitle">Choose a display name to get started</p>
          {error && <div className="error">{error}</div>}
          <form onSubmit={saveUsername}>
            <input
              type="text"
              placeholder="Username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
              minLength={2}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.88rem", background: "var(--bg-input)", color: "var(--text)", boxSizing: "border-box" }}
            />
            <button className="btn-primary" type="submit" disabled={savingUsername}>
              {savingUsername ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="page">
        <div className="empty">Loading sellers...</div>
      </div>
    );
  }

  return (
    <>
      <nav className="topnav">
        <div className="topnav-brand">
          <img src={theme === "dark" ? "/darkmode logo.png" : "/logo.png"} alt="Seller Signal" className="topnav-logo" />
          <span className="user-email">{displayName}</span>
        </div>
        <div className="topnav-actions">
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => t === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            <span className="theme-toggle-track">
              <span className="theme-toggle-icon theme-toggle-sun">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0-3a1 1 0 01-1-1V1a1 1 0 112 0v2a1 1 0 01-1 1zm0 18a1 1 0 01-1-1v-2a1 1 0 112 0v2a1 1 0 01-1 1zm9-9h-2a1 1 0 110-2h2a1 1 0 110 2zM6 13H4a1 1 0 110-2h2a1 1 0 110 2zm12.364-5.95l-1.414-1.414a1 1 0 111.414-1.414l1.414 1.414a1 1 0 01-1.414 1.414zM7.05 18.364l-1.414-1.414a1 1 0 111.414-1.414l1.414 1.414a1 1 0 01-1.414 1.414zm11.314 0a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 111.414-1.414l1.414 1.414a1 1 0 010 1.414zM7.05 7.05a1 1 0 01-1.414 0L4.222 5.636a1 1 0 111.414-1.414L7.05 5.636a1 1 0 010 1.414z"/></svg>
              </span>
              <span className="theme-toggle-icon theme-toggle-moon">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
              </span>
              <span className={`theme-toggle-thumb${theme === "dark" ? " dark" : ""}`} />
            </span>
          </button>
          <button className="btn-sm" onClick={() => setShowImport(!showImport)}>
            {showImport ? "Cancel" : "Import"}
          </button>
          <button className="btn-sm" onClick={() => supabase.auth.signOut()}>Sign Out</button>
        </div>
      </nav>

      <div className="page">

      {/* Summary stat cards */}
      {leads.length > 0 && <h2 className="section-title">Market Overview</h2>}
      {leads.length > 0 && (() => {
        const allInsights = Object.values(insights).filter((i) => i?.status === "ready");
        const allPrices = allInsights.flatMap((i) => i.recentTransactions?.map((t) => t.price) || []).filter(Boolean);
        const totalTxns = allInsights.reduce((sum, i) => sum + (i.count || 0), 0);
        const avgPrice = allPrices.length ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : null;
        const avgPsf = allInsights.filter((i) => i.psf).length
          ? allInsights.filter((i) => i.psf).reduce((sum, i) => sum + i.psf, 0) / allInsights.filter((i) => i.psf).length
          : null;

        return (
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-label">Total Sellers</span>
              <span className="stat-value">{leads.length.toLocaleString()}</span>
              {dueLeads.length > 0 && <span className="stat-change due">{activeLeads.filter((l) => l.isDue).length} due</span>}
            </div>
            <div className="stat-card">
              <span className="stat-label">Average Price (AED)</span>
              <span className="stat-value">{avgPrice ? formatPrice(avgPrice) : "-"}</span>
              {totalTxns > 0 && <span className="stat-change">{totalTxns} transactions</span>}
            </div>
            <div className="stat-card">
              <span className="stat-label">Average Price per sqft (AED)</span>
              <span className="stat-value">{avgPsf ? formatPsf(avgPsf) : "-"}</span>
              {readyCount > 0 && <span className="stat-change ok">{readyCount} enriched</span>}
            </div>
          </div>
        );
      })()}

      {/* Top buildings pills */}
      {leads.length > 0 && (() => {
        const buildingCounts = {};
        for (const lead of leads) {
          const cleaned = cleanBuildingName(lead.building);
          if (!cleaned) continue;
          buildingCounts[cleaned] = (buildingCounts[cleaned] || 0) + 1;
        }
        const topBuildings = Object.entries(buildingCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6);

        if (!topBuildings.length) return null;
        return (
          <div className="section-block">
            <h3 className="section-subtitle">Top Buildings</h3>
            <div className="location-pills">
            {topBuildings.map(([name, count]) => (
              <button
                key={name}
                className={`location-pill${searchTerm === name ? " active" : ""}`}
                onClick={() => { setSearchTerm(searchTerm === name ? "" : name); setCurrentPage(1); }}
              >
                {name} <span className="pill-count">({count})</span>
              </button>
            ))}
            </div>
          </div>
        );
      })()}

      {/* Seller Leads section */}
      {leads.length > 0 && <h2 className="section-title">Seller Leads</h2>}

      {/* Active / Done view tabs */}
      <div className="view-tabs">
        {[
          { id: "active", label: "Active", count: activeLeads.length },
          { id: "done", label: "Done", count: doneLeads.length },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`view-tab${viewTab === tab.id ? " active" : ""}`}
            onClick={() => { setViewTab(tab.id); setCurrentPage(1); }}
          >
            {tab.label}
            <span className="view-tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

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

              <div className="tabs">
                {[
                  { id: "all", label: "All" },
                  { id: "with_data", label: "Has Data" },
                  { id: "no_data", label: "No Data" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`tab${dataFilter === tab.id ? " active" : ""}`}
                    onClick={() => { setDataFilter(tab.id); setCurrentPage(1); }}
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

              <button
                className="btn-sm"
                onClick={() => {
                  const allIds = filteredLeads.map((l) => l.id);
                  const allExpanded = allIds.every((id) => expandedLeads[id]);
                  setExpandedLeads((prev) => {
                    const next = { ...prev };
                    for (const id of allIds) next[id] = !allExpanded;
                    return next;
                  });
                }}
              >
                {filteredLeads.every((l) => expandedLeads[l.id]) ? "Collapse All" : "Expand All"}
              </button>

              <button
                className="btn-wa"
                onClick={bulkWhatsApp}
                disabled={!pagedLeads.some((l) => l.phone && insights[l.id]?.status === "ready")}
              >
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                Send All ({pagedLeads.filter((l) => l.phone && insights[l.id]?.status === "ready").length})
              </button>
            </div>
          </div>

          {/* Import panel */}
          {showImport && (
            <div className="import-panel">
              <input
                type="text"
                placeholder="Paste Google Sheet URL..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
              <button className="btn-primary" onClick={importFromSheet} disabled={importing}>
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          )}

          {/* Count */}
          <p className="count-text">{filteredLeads.length} leads</p>

          {/* Lead cards */}
          <div className="lead-list">
            {pagedLeads.map((lead) => {
              const insight = insights[lead.id];
              const message = insight?.message || buildMessage(lead, insight);

              return (
                <article key={lead.id} className={`lead-card${sentLeads[lead.id] ? " lead-sent" : ""}${expandedLeads[lead.id] ? " lead-expanded" : ""}`}>
                  <div
                    className="lead-top"
                    onClick={() => setExpandedLeads((prev) => ({ ...prev, [lead.id]: !prev[lead.id] }))}
                    style={{ cursor: "pointer" }}
                  >
                    <div>
                      <span className="lead-name">{lead.name || "Unnamed"}</span>
                      <span className="lead-building">
                        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        {" "}{lead.building || "-"}
                      </span>
                    </div>
                    <div className="lead-top-actions">
                      <div className="badge-row">
                        <span className="badge">{lead.statusLabel}</span>
                        <span className={`badge ${lead.isDue ? "due" : "ok"}`}>{lead.dueLabel}</span>
                        {insight?.status === "ready" && <span className="badge ok">Enriched</span>}
                        {lead.newTxSinceSent && <span className="badge due">{lead.newTxSinceSent} new txns</span>}
                      </div>
                      {lead.phone ? (
                        <a
                          className="btn-sm btn-wa"
                          href={`https://web.whatsapp.com/send?phone=${formatPhoneForWhatsApp(lead.phone)}&text=${encodeURIComponent(message)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.stopPropagation(); if (!sentLeads[lead.id]) toggleSent(lead.id); }}
                        >
                          <svg className="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                          {sentLeads[lead.id] ? "Sent" : "Send"}
                        </a>
                      ) : (
                        <button className="btn-sm" onClick={(e) => { e.stopPropagation(); copyMessage(lead.id, message); }}>
                          {copiedLeadId === lead.id ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedLeads[lead.id] && (
                    <>
                      <div className="lead-meta">
                        <span>{lead.bedroom || "-"}</span>
                        <span>{formatDate(lead.lastContactDate)}</span>
                        {lead.phone && <span>{lead.phone}</span>}
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
                            <div className="tx-table-wrap">
                              <p className="tx-table-title">Sales History in {insight.locationName || lead.building}</p>
                              <table className="tx-table">
                                <thead>
                                  <tr>
                                    <th>DATE</th>
                                    <th>LOCATION</th>
                                    <th>PRICE (AED)</th>
                                    <th>BEDS</th>
                                    <th>AREA (SQFT)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {insight.recentTransactions.map((tx) => (
                                    <tr key={tx.id}>
                                      <td className="tx-date">{formatDate(tx.date)}</td>
                                      <td>
                                        <span className="tx-location">{tx.locationLabel}</span>
                                        {tx.floor && <span className="tx-floor">Floor {tx.floor}</span>}
                                      </td>
                                      <td className="tx-price">{formatPrice(tx.price)}</td>
                                      <td>{formatBedsLabel(tx.beds)}</td>
                                      <td>{tx.area ? Math.round(tx.area).toLocaleString("en-US") : "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="muted">No priced sales found in this period.</p>
                          )}
                        </>
                      )}
                      {insight?.status === "loading" && <p className="muted">Loading Bayut data...</p>}
                      {insight?.status === "error" && <p className="error-sm">Bayut: {insight.error}</p>}

                      <div className="msg-block">
                        <p className="msg-label">Message Preview</p>
                        <MessagePreview value={message} />
                      </div>
                    </>
                  )}
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

      {!loading && !leads.length && (
        <div className="onboarding">
          <div className="onboarding-card">
            <div className="onboarding-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <h2 className="onboarding-title">Welcome to Seller Signal</h2>
            <p className="onboarding-subtitle">Import your leads to get started</p>
            <div className="onboarding-steps">
              <div className="onboarding-step">
                <span className="step-number">1</span>
                <span>Open your spreadsheet in Google Sheets</span>
              </div>
              <div className="onboarding-step">
                <span className="step-number">2</span>
                <span>Make sure it's shared (<strong>Anyone with the link</strong>)</span>
              </div>
              <div className="onboarding-step">
                <span className="step-number">3</span>
                <span>Copy the URL and paste it below</span>
              </div>
            </div>
            <div className="onboarding-input">
              <input
                type="text"
                placeholder="Paste your Google Sheet URL here..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                autoFocus
              />
              <button className="btn-primary" onClick={importFromSheet} disabled={importing}>
                {importing ? "Importing..." : "Import Spreadsheet"}
              </button>
            </div>
            {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default App;
