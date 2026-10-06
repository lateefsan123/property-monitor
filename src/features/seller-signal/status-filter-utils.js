import { STATUS_RULES } from "./constants";

// Checked live: STATUS_RULES gains the account's own statuses after sellers load.
const VALID_STATUS_IDS = { has: (id) => STATUS_RULES.some((rule) => rule.id === id) };

export function normalizeStatusFilter(value) {
  const rawValues = Array.isArray(value)
    ? value
    : String(value || "")
      .split(",")
      .map((item) => item.trim());

  const result = [];
  for (const valueItem of rawValues) {
    const id = String(valueItem || "").trim();
    if (!id || id === "all" || !VALID_STATUS_IDS.has(id) || result.includes(id)) continue;
    result.push(id);
  }
  return result;
}

export function hasStatusFilter(value) {
  return normalizeStatusFilter(value).length > 0;
}

export function toggleStatusFilterValue(currentValue, nextValue) {
  const current = normalizeStatusFilter(currentValue);
  const id = String(nextValue || "").trim();
  if (!VALID_STATUS_IDS.has(id)) return current;

  if (current.includes(id)) {
    return current.filter((item) => item !== id);
  }
  return [...current, id];
}

export function statusFilterMatches(statusRuleId, statusFilter) {
  const activeStatusIds = normalizeStatusFilter(statusFilter);
  return !activeStatusIds.length || activeStatusIds.includes(statusRuleId);
}

export function statusFiltersEqual(left, right) {
  const leftIds = normalizeStatusFilter(left).sort();
  const rightIds = normalizeStatusFilter(right).sort();
  if (leftIds.length !== rightIds.length) return false;
  return leftIds.every((id, index) => id === rightIds[index]);
}
