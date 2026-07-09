import { canonicalizeBuildingName, cleanBuildingName } from "./building-utils";
import { normalizeToken } from "./spreadsheet";

// Fields the sheet may fill in when the app copy is empty. App-owned state
// (sent_at, notes, non-empty status/last_contact) is never overwritten:
// the app DB is the master, sheets are import-only.
const FILLABLE_FIELDS = ["bedroom", "unit", "phone", "status", "last_contact"];

function normalizePhoneKey(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function normalizeBuildingKey(value) {
  return normalizeToken(canonicalizeBuildingName(value) || cleanBuildingName(value));
}

// Identity keys in decreasing strength, mirroring the duplicate detection in
// lead-data-quality. A lead matches an existing row on the strongest key both
// sides can produce, so adding a phone number or bedroom to a sheet row does
// not turn it into a duplicate.
export function buildLeadIdentityKeys(lead) {
  const name = normalizeToken(lead?.name);
  const building = normalizeBuildingKey(lead?.building);
  const unit = normalizeToken(lead?.unit);
  const bedroom = normalizeToken(lead?.bedroom);
  const phone = normalizePhoneKey(lead?.phone);

  const keys = [];
  if (phone && building && unit) keys.push(`phone:${phone}:${building}:${unit}`);
  if (name && building && unit) keys.push(`unit:${name}:${building}:${unit}`);
  if (name && phone) keys.push(`contact:${name}:${phone}`);
  if (name && building && bedroom) keys.push(`bed:${name}:${building}:${bedroom}`);
  if (name && building) keys.push(`pair:${name}:${building}`);
  return keys;
}

export function buildLeadSyncPlan(existingRows, incomingLeads) {
  const existingByKey = new Map();
  for (const row of existingRows || []) {
    for (const key of buildLeadIdentityKeys(row)) {
      if (!existingByKey.has(key)) existingByKey.set(key, row);
    }
  }

  const claimedExistingIds = new Set();
  const seenIncomingKeys = new Set();
  const toInsert = [];
  const updates = [];
  let matchedCount = 0;
  let skippedDuplicateCount = 0;

  for (const lead of incomingLeads || []) {
    const keys = buildLeadIdentityKeys(lead);
    if (!keys.length) continue;

    if (keys.some((key) => seenIncomingKeys.has(key))) {
      skippedDuplicateCount += 1;
      continue;
    }
    for (const key of keys) seenIncomingKeys.add(key);

    const existing = keys.map((key) => existingByKey.get(key)).find(Boolean);
    if (!existing) {
      toInsert.push(lead);
      continue;
    }

    if (claimedExistingIds.has(existing.id)) {
      skippedDuplicateCount += 1;
      continue;
    }
    claimedExistingIds.add(existing.id);
    matchedCount += 1;

    const fills = {};
    for (const field of FILLABLE_FIELDS) {
      const incomingValue = String(lead?.[field] ?? "").trim();
      const existingValue = String(existing?.[field] ?? "").trim();
      if (incomingValue && !existingValue) fills[field] = lead[field];
    }
    if (Object.keys(fills).length) updates.push({ id: existing.id, fields: fills });
  }

  return { toInsert, updates, matchedCount, skippedDuplicateCount };
}
