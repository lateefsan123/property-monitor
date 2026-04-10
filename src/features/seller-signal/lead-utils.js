import { MILLISECONDS_PER_DAY, STATUS_RULES } from "./constants";
import { normalizeToken } from "./spreadsheet";

export function startOfDay(dateValue) {
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

export function parseDateValue(rawValue) {
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
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      return startOfDay(parsed);
    }
  }

  match = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      return startOfDay(parsed);
    }
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return startOfDay(direct);

  return null;
}

export function cleanBuildingName(raw) {
  let name = String(raw || "").trim();

  const apartmentMatch = name.match(/^(?:\[.*?\]\s*)?Apartment\s+[\w-]+(?:\s*\(.*?\))?\s*,\s*(.+)/i);
  if (apartmentMatch) {
    const parts = apartmentMatch[1].split(",").map((part) => part.trim());
    name = parts[0] || name;
  }

  name = name
    .replace(/\b(one|two|three|four|five|1|2|3|4|5)\s*[-\s]?\s*bed(room)?s?\b/gi, "")
    .replace(/\bstudio\b/gi, "")
    .replace(/\b\d+\s*bhk\b/gi, "")
    .replace(/\b\d+\s*br\b/gi, "")
    .replace(/\((?:NOT\s+)?LIVE\)/gi, "")
    .replace(/\(FSA[^)]*\)/gi, "")
    .replace(/\(Not\s+Live\)/gi, "")
    .replace(/\(NOT\s+ON\s+PF\)/gi, "")
    .replace(/\[OFFLINE\]/gi, "")
    .replace(/\[NOT\s+LIVE\]/gi, "")
    .replace(/^(?:Villa|Unit)\s+[\w-]+\s*,?\s*/i, "")
    .replace(/[,\-/]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return name || String(raw || "").trim();
}

function expandBoulevard(value) {
  return String(value || "").replace(/\bblvd\b\.?/gi, "Boulevard");
}

function compressBoulevard(value) {
  return String(value || "").replace(/\bboulevard\b/gi, "Blvd");
}

export function formatBuildingLabel(raw) {
  if (!raw) return "";
  const cleaned = cleanBuildingName(raw);
  if (!cleaned) return "";
  return expandBoulevard(cleaned);
}

export function getBuildingKeyVariants(raw) {
  const cleaned = cleanBuildingName(raw);
  if (!cleaned) return [];
  const numberMap = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
  };
  const replaceNumberWords = (value) => {
    let next = String(value || "");
    for (const [word, digit] of Object.entries(numberMap)) {
      next = next.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
    }
    return next;
  };
  const variants = new Set();
  const addVariant = (value) => {
    const normalized = normalizeToken(value);
    if (normalized) variants.add(normalized);
  };
  addVariant(cleaned);
  addVariant(replaceNumberWords(cleaned));
  addVariant(expandBoulevard(cleaned));
  addVariant(replaceNumberWords(expandBoulevard(cleaned)));
  addVariant(compressBoulevard(cleaned));
  addVariant(replaceNumberWords(compressBoulevard(cleaned)));
  return [...variants].filter(Boolean);
}

function parseBedroom(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return { label: "unit", beds: null };

  const lower = raw.toLowerCase();
  if (lower.includes("studio")) return { label: "studio", beds: [0] };

  const match = lower.match(/(\d+)/);
  if (match) {
    const bedCount = Number(match[1]);
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

export function mapLeadRow(record, index, mapping, today) {
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
    name,
    building,
    bedroom,
    unit,
    phone,
    bedroomLabel: bedroomInfo.label,
    bedFilterValues: bedroomInfo.beds,
    status,
    statusLabel: statusRule?.label || status || "Unknown",
    statusRule,
    lastContactRaw,
    lastContactDate,
    isDue,
    dueLabel,
    nextDueDate,
    overdueDays,
  };
}

export function mapStoredLeadRow(row, index, today) {
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
  lead.id = row.id;
  lead.sourceId = row.source_id || null;
  return lead;
}

export function applyLeadStatus(lead, nextStatus, today = new Date()) {
  const record = {
    __row: lead.rowNumber || lead.id || 0,
    _name: lead.name || "",
    _building: lead.building || "",
    _bedroom: lead.bedroom || "",
    _status: nextStatus || "",
    _lastContact: lead.lastContactRaw || (lead.lastContactDate ? lead.lastContactDate.toISOString().split("T")[0] : ""),
    _phone: lead.phone || "",
    _unit: lead.unit || "",
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

  const updated = mapLeadRow(record, 0, mapping, today);
  updated.id = lead.id;
  updated.sourceId = lead.sourceId || null;
  return updated;
}

export function createLeadInsertRecord(record, mapping, userId, options = {}) {
  const {
    sourceId = null,
    defaultStatus = null,
    defaultBuilding = null,
    overrideBuilding = false,
  } = options;
  const name = mapping.name ? record[mapping.name] : "";
  const building = mapping.building ? record[mapping.building] : "";
  const bedroom = mapping.bedroom ? record[mapping.bedroom] : "";
  const status = mapping.status ? record[mapping.status] : "";
  const lastContactRaw = mapping.lastContact ? record[mapping.lastContact] : "";
  const phone = mapping.phone ? record[mapping.phone] : "";
  const unit = mapping.unit ? record[mapping.unit] : "";

  const resolvedBuilding = overrideBuilding ? (defaultBuilding || "") : (building || defaultBuilding || "");
  const resolvedStatus = status || defaultStatus || "";

  if (!name && !resolvedBuilding && !phone) return null;

  const lastContactDate = parseDateValue(lastContactRaw);

  return {
    user_id: userId,
    name: name || null,
    building: resolvedBuilding || null,
    bedroom: bedroom || null,
    unit: unit || null,
    phone: phone || null,
    status: resolvedStatus || null,
    last_contact: lastContactDate ? lastContactDate.toISOString().split("T")[0] : null,
    source_id: sourceId,
  };
}

export function countNewTransactionsSince(insight, sentTimestamp) {
  if (!insight?.allTransactionDates?.length || !sentTimestamp) return 0;
  const sentDate = startOfDay(new Date(sentTimestamp));
  return insight.allTransactionDates.filter((date) => date > sentDate).length;
}
