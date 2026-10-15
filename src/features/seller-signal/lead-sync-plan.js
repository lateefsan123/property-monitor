import { canonicalizeBuildingName, cleanBuildingName } from "./building-utils.js";
import { normalizeToken } from "./spreadsheet.js";

// Fields the sheet may fill in when the app copy is empty. App-owned state
// (sent_at, notes, non-empty status/last_contact) is never overwritten:
// the app DB is the master, sheets are import-only.
const FILLABLE_FIELDS = ["bedroom", "unit", "phone", "status", "last_contact"];

function normalizePhoneKey(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

const buildingKeys = new Map();
function normalizeBuildingKey(value) {
  const raw = String(value || '');
  if (!buildingKeys.has(raw)) {
    if (buildingKeys.size >= 2000) buildingKeys.clear();
    buildingKeys.set(raw, identityText(canonicalizeBuildingName(raw) || cleanBuildingName(raw)));
  }
  return buildingKeys.get(raw);
}

// Identity keys in decreasing strength, mirroring the duplicate detection in
// lead-data-quality. A lead matches an existing row on the strongest key both
// sides can produce, so adding a phone number or bedroom to a sheet row does
// not turn it into a duplicate.
export function buildLeadIdentityKeys(lead) {
  const name = identityText(lead?.name);
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
  if (phone) keys.push(`phone-only:${phone}`);
  return keys;
}

function identityText(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function compatible(left, right) {
  const fields = [["name", identityText], ["building", normalizeBuildingKey], ["unit", normalizeToken], ["phone", normalizePhoneKey]];
  return fields.every(([field, normalize]) => {
    const a = normalize(left[field]);
    const b = normalize(right[field]);
    return !a || !b || a === b;
  });
}

function indexRow(index, row) {
  for (const key of buildLeadIdentityKeys(row)) {
    const bucket = index.get(key) || [];
    // Two entries mark an ambiguous key. Never choose an arbitrary seller,
    // and never scan thousands of an owner's properties for a weak match.
    if (bucket.length < 2) bucket.push(row);
    index.set(key, bucket);
  }
}

function findMatch(index, row, keys) {
  for (const key of keys) {
    const bucket = index.get(key);
    if (bucket?.length === 1 && compatible(bucket[0], row)) return bucket[0];
  }
  return null;
}

export function buildLeadSyncPlan(existingRows, incomingLeads) {
  const existingIndex = new Map();
  const incomingSignatures = new Set();
  for (const row of existingRows || []) indexRow(existingIndex, row);
  const claimed = new Map();
  const toInsert = [];
  const updates = [];
  let matchedCount = 0;
  let skippedDuplicateCount = 0;
  let unidentifiedCount = 0;
  for (const lead of incomingLeads || []) {
    const keys = buildLeadIdentityKeys(lead);
    if (!keys.length) { unidentifiedCount += 1; continue; }
    const signature = JSON.stringify([identityText(lead.name), normalizeBuildingKey(lead.building), normalizeToken(lead.unit), normalizePhoneKey(lead.phone), normalizeToken(lead.bedroom)]);
    if (incomingSignatures.has(signature)) { skippedDuplicateCount += 1; continue; }
    incomingSignatures.add(signature);
    const existing = findMatch(existingIndex, lead, keys);
    if (!existing) { toInsert.push(lead); continue; }
    if (claimed.has(existing.id)) {
      if (compatible(claimed.get(existing.id), lead)) skippedDuplicateCount += 1;
      else toInsert.push(lead);
      continue;
    }
    matchedCount += 1;
    const fills = {};
    for (const field of FILLABLE_FIELDS) {
      if (String(lead?.[field] ?? "").trim() && !String(existing?.[field] ?? "").trim()) fills[field] = lead[field];
    }
    if (Object.keys(fills).length) updates.push({ id: existing.id, fields: fills });
    claimed.set(existing.id, { ...existing, ...fills });
  }
  return { toInsert, updates, matchedCount, skippedDuplicateCount, unidentifiedCount };
}
