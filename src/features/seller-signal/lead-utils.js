import { DEFAULT_CADENCE_DAYS, MILLISECONDS_PER_DAY, STATUS_RULES } from "./constants";
import { normalizeToken } from "./spreadsheet";
import { canonicalizeBuildingName, parseBuildingAddressValue } from "./building-utils";

export function startOfDay(dateValue) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDateInputValue(dateValue) {
  const date = dateValue instanceof Date ? dateValue : parseDateValue(dateValue);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hasReasonableYear(date) {
  const year = date?.getFullYear?.();
  return Number.isFinite(year) && year >= 1900 && year <= 2100;
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
      if (!Number.isNaN(fromSerial.getTime()) && hasReasonableYear(fromSerial)) return startOfDay(fromSerial);
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
    if (
      parsed.getFullYear() === year
      && parsed.getMonth() === month - 1
      && parsed.getDate() === day
      && hasReasonableYear(parsed)
    ) {
      return startOfDay(parsed);
    }
  }

  match = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year
      && parsed.getMonth() === month - 1
      && parsed.getDate() === day
      && hasReasonableYear(parsed)
    ) {
      return startOfDay(parsed);
    }
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime()) && hasReasonableYear(direct)) return startOfDay(direct);

  return null;
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

function normalizeImportedUnit(value) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (/^unit\s+/i.test(raw)) return raw;
  return `Unit ${raw}`;
}

function splitImportedBedroomUnit(rawBedroom, rawUnit) {
  const bedroom = String(rawBedroom || "").trim();
  const explicitUnit = normalizeImportedUnit(rawUnit);

  if (explicitUnit || !bedroom) {
    return { bedroom, unit: explicitUnit };
  }

  const combinedMatch = bedroom.match(/^\s*(studio|\d+)\s*[/-]\s*([a-z0-9-]+)\s*$/i);
  if (!combinedMatch) {
    return { bedroom, unit: "" };
  }

  const bedPart = combinedMatch[1].toLowerCase() === "studio"
    ? "Studio"
    : `${Number(combinedMatch[1])}BR`;

  return {
    bedroom: bedPart,
    unit: normalizeImportedUnit(combinedMatch[2]),
  };
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
  const isNotInterested = statusRule?.id === "not_interested";
  // Leads with no recognized status still cycle on the default cadence so
  // nothing silently falls out of the follow-up queue.
  const cadenceDays = statusRule && !isNotInterested ? statusRule.days : DEFAULT_CADENCE_DAYS;

  let isDue = false;
  let dueLabel = "Not interested";
  let nextDueDate = null;
  let overdueDays = 0;

  if (!isNotInterested) {
    if (!lastContactDate) {
      isDue = true;
      dueLabel = "Never contacted";
    } else {
      nextDueDate = addDays(lastContactDate, cadenceDays);
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
  // Cadence runs off the most recent touch: the editable last_contact date or
  // the sent_at stamp written by manual/auto WhatsApp sends, whichever is later.
  const importedLastContact = parseDateValue(row.last_contact || "");
  const sentAtParsed = row.sent_at ? new Date(row.sent_at) : null;
  const sentAtDate = sentAtParsed && !Number.isNaN(sentAtParsed.getTime()) ? startOfDay(sentAtParsed) : null;
  const effectiveLastContact = sentAtDate && (!importedLastContact || sentAtDate > importedLastContact)
    ? sentAtDate
    : importedLastContact;

  const record = {
    __row: row.id,
    _name: row.name || "",
    _building: row.building || "",
    _bedroom: row.bedroom || "",
    _status: row.status || "",
    _lastContact: effectiveLastContact ? formatDateInputValue(effectiveLastContact) : "",
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
  lead.notes = row.notes || "";
  lead.sentAt = row.sent_at || null;
  return lead;
}

export function summarizeLeadCadence(leads) {
  const summary = { due: 0, scheduled: 0, notInterested: 0 };
  for (const lead of leads || []) {
    if (lead.statusRule?.id === "not_interested") summary.notInterested += 1;
    else if (lead.isDue) summary.due += 1;
    else summary.scheduled += 1;
  }
  return summary;
}

export function sortLeadsByPriority(leads) {
  return [...(leads || [])].sort((left, right) => {
    if (left.isDue !== right.isDue) return left.isDue ? -1 : 1;
    if (left.overdueDays !== right.overdueDays) return right.overdueDays - left.overdueDays;

    const leftRow = Number(left.rowNumber ?? left.id ?? 0);
    const rightRow = Number(right.rowNumber ?? right.id ?? 0);
    return leftRow - rightRow;
  });
}

function buildDerivedLead(lead, overrides = {}, today = new Date()) {
  const currentLastContact = lead.lastContactRaw ?? (
    lead.lastContactDate ? formatDateInputValue(lead.lastContactDate) : ""
  );
  const record = {
    __row: lead.rowNumber || lead.id || 0,
    _name: overrides.name ?? lead.name ?? "",
    _building: overrides.building ?? lead.building ?? "",
    _bedroom: overrides.bedroom ?? lead.bedroom ?? "",
    _status: overrides.status ?? lead.status ?? "",
    _lastContact: overrides.lastContact ?? currentLastContact,
    _phone: overrides.phone ?? lead.phone ?? "",
    _unit: overrides.unit ?? lead.unit ?? "",
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
  updated.rowNumber = lead.rowNumber;
  updated.sourceId = lead.sourceId || null;
  return updated;
}

export function applyLeadStatus(lead, nextStatus, today = new Date()) {
  return buildDerivedLead(lead, { status: nextStatus }, today);
}

export function applyLeadEdits(lead, nextValues, today = new Date()) {
  return buildDerivedLead(lead, nextValues, today);
}

export function createLeadInsertRecord(record, mapping, userId, options = {}) {
  const {
    sourceId = null,
    defaultStatus = null,
    defaultBuilding = null,
    overrideBuilding = false,
    resolveBuilding = null,
  } = options;
  const name = mapping.name ? record[mapping.name] : "";
  const building = mapping.building ? record[mapping.building] : "";
  const bedroom = mapping.bedroom ? record[mapping.bedroom] : "";
  const status = mapping.status ? record[mapping.status] : "";
  const lastContactRaw = mapping.lastContact ? record[mapping.lastContact] : "";
  const phone = mapping.phone ? record[mapping.phone] : "";
  const unit = mapping.unit ? record[mapping.unit] : "";
  const splitBedroomUnit = splitImportedBedroomUnit(bedroom, unit);

  const rawResolvedBuilding = overrideBuilding ? (defaultBuilding || "") : (building || defaultBuilding || "");
  const addressParts = parseBuildingAddressValue(rawResolvedBuilding);
  const buildingMatch = typeof resolveBuilding === "function" ? resolveBuilding(rawResolvedBuilding) : null;
  const resolvedBuilding = buildingMatch?.status === "invalid"
    ? ""
    : buildingMatch?.canonicalName || canonicalizeBuildingName(rawResolvedBuilding);
  const resolvedStatus = status || defaultStatus || "";
  const resolvedUnit = splitBedroomUnit.unit || (addressParts.unit ? normalizeImportedUnit(addressParts.unit) : "");

  if (!name && !resolvedBuilding && !phone) return null;

  const lastContactDate = parseDateValue(lastContactRaw);

  return {
    user_id: userId,
    name: name || null,
    building: resolvedBuilding || null,
    bedroom: splitBedroomUnit.bedroom || null,
    unit: resolvedUnit || null,
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
