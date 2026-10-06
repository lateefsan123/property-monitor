import { mergeStatusRules } from "../../../shared/seller-statuses.js";
import { STATUS_FILTER_OPTIONS, STATUS_RULES } from "./constants";
import { setTemplateCustomStatuses } from "../../../supabase/functions/_shared/template-status.js";

// STATUS_RULES and STATUS_FILTER_OPTIONS are shared live lists (web and mobile
// both read them through lead-utils). Loading sellers merges the account's
// own statuses in, before any seller's status is matched.
const BASE_RULES = STATUS_RULES.map((rule) => ({ ...rule }));
const BASE_FILTERS = STATUS_FILTER_OPTIONS.map((option) => ({ ...option }));

// The value each built-in choice writes to the seller, as before.
const BUILT_IN_VALUES = {
  not_interested: "Not Interested",
  prospect: "Prospect",
  market_appraisal: "Appraisal",
  for_sale_available: "For Sale",
};

export function applyAccountStatuses(rows) {
  const merged = mergeStatusRules(BASE_RULES, rows);
  STATUS_RULES.splice(0, STATUS_RULES.length, ...merged);
  const custom = merged.filter((rule) => rule.custom).map((rule) => ({ id: rule.id, label: rule.label, color: rule.color }));
  STATUS_FILTER_OPTIONS.splice(0, STATUS_FILTER_OPTIONS.length, ...BASE_FILTERS, ...custom);
  setTemplateCustomStatuses(custom);
  return merged;
}

// Choices for status pickers: built-ins in their usual order, then the
// account's own. `value` is what gets saved on the seller.
export function statusChoices({ includeNotInterested = true } = {}) {
  const builtIns = BASE_RULES
    .filter((rule) => includeNotInterested || rule.id !== "not_interested")
    .map((rule) => ({ id: rule.id, value: BUILT_IN_VALUES[rule.id], label: BUILT_IN_VALUES[rule.id], color: null, custom: false }));
  const custom = STATUS_RULES.filter((rule) => rule.custom)
    .map((rule) => ({ id: rule.id, value: rule.label, label: rule.label, color: rule.color, custom: true }));
  return [...builtIns, ...custom];
}

export function statusRuleById(id) {
  return STATUS_RULES.find((rule) => rule.id === id) || null;
}

// Loads and applies the account's statuses before sellers are matched. Cached
// for 30 seconds per account; Settings calls refreshAccountStatuses after edits.
const loaded = new Map();
const CACHE_MS = 30 * 1000;

export async function ensureAccountStatuses(userId, fetchStatuses) {
  if (!userId) return applyAccountStatuses([]);
  const cached = loaded.get(userId);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.promise;
  const promise = fetchStatuses(userId)
    .catch(() => [])
    .then((rows) => applyAccountStatuses(rows));
  loaded.set(userId, { at: Date.now(), promise });
  return promise;
}

export function refreshAccountStatuses(userId) {
  loaded.delete(userId);
}
