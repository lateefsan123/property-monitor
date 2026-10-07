import test from "node:test";
import assert from "node:assert/strict";
import { matchStatusRule, mergeStatusRules, optedOutStatusTokens } from "../shared/seller-statuses.js";
import { customStatusDays, loadCustomStatusDays } from "../supabase/functions/_shared/custom-statuses.js";

const BASE = [
  { id: "not_interested", label: "Not Interested", days: 0, keywords: ["not interested", "ni", "cold"] },
  { id: "prospect", label: "Prospect", days: 75, keywords: ["prospect"] },
  { id: "market_appraisal", label: "Market Appraisal", days: 25, keywords: ["market appraisal", "appraisal", "valuation"] },
  { id: "for_sale_available", label: "For Sale Available", days: 5, keywords: ["for sale available", "for sale", "available"] },
];

test("custom statuses match their exact name before built-in keywords", () => {
  const rules = mergeStatusRules(BASE, [
    { id: "a", label: "Opportunity", follow_up_days: 7, color: "#3b82f6", position: 0 },
    { id: "b", label: "Hot - available", follow_up_days: 3, position: 1 },
  ]);
  assert.equal(matchStatusRule(rules, "Opportunity").id, "custom:a"); // contains "ni"
  assert.equal(matchStatusRule(rules, "hot  available").id, "custom:b"); // contains "available"
  assert.equal(matchStatusRule(rules, "For Sale").id, "for_sale_available");
  assert.equal(matchStatusRule(rules, "Not interested").id, "not_interested");
  assert.equal(matchStatusRule(rules, ""), null);
});

test("built-in overrides change the follow-up gap, never Not Interested's", () => {
  const rules = mergeStatusRules(BASE, [
    { id: "p", builtin_key: "prospect", label: "prospect", follow_up_days: 30 },
    { id: "n", builtin_key: "not_interested", label: "not_interested", follow_up_days: 14 },
  ]);
  assert.equal(rules.find((rule) => rule.id === "prospect").days, 30);
  assert.equal(rules.find((rule) => rule.id === "not_interested").days, 0);
  assert.equal(rules.filter((rule) => rule.custom).length, 0);
});

test("merging again replaces earlier custom statuses", () => {
  const first = mergeStatusRules(BASE, [{ id: "a", label: "Warm", follow_up_days: 7 }]);
  const second = mergeStatusRules(first, []);
  assert.deepEqual(second.map((rule) => rule.id), BASE.map((rule) => rule.id));
});

test("only custom 'don't follow up' statuses are opted out", () => {
  const tokens = optedOutStatusTokens([
    { label: "Do not call", follow_up_days: 0 },
    { label: "Warm", follow_up_days: 7 },
    { builtin_key: "prospect", label: "prospect", follow_up_days: 0 },
  ]);
  assert.deepEqual([...tokens], ["donotcall"]);
});

test("automations read an account's own statuses by exact name", async () => {
  const filters = [];
  const client = { from: () => {
    const chain = {
      select: () => chain,
      in: (column, values) => { filters.push([column, values]); return chain; },
      is: (column, value) => { filters.push([column, value]); return Promise.resolve({ data: [
        { user_id: "u1", label: "Opportunity", follow_up_days: 7 },
        { user_id: "u1", label: "Do not call", follow_up_days: 0 },
      ], error: null }); },
    };
    return chain;
  } };
  const days = await loadCustomStatusDays(client, ["u1", "u1", ""]);
  assert.deepEqual(filters[0], ["user_id", ["u1"]]);
  assert.deepEqual(filters[1], ["builtin_key", null]);
  assert.equal(customStatusDays(days, "u1", "opportunity"), 7);
  assert.equal(customStatusDays(days, "u1", "Do not call"), 0);
  assert.equal(customStatusDays(days, "u2", "Opportunity"), undefined);
  assert.equal(customStatusDays(days, "u1", "Prospect"), undefined);
});

test("a missing statuses table means no custom statuses", async () => {
  const client = { from: () => ({ select() { return this; }, in() { return this; }, is: () => Promise.resolve({ data: null, error: { code: "42P01", message: "missing" } }) }) };
  const days = await loadCustomStatusDays(client, ["u1"]);
  assert.equal(days.size, 0);
});

test("a hidden built-in still matches sellers who have it", () => {
  const rules = mergeStatusRules(BASE, [{ id: "p", builtin_key: "prospect", label: "prospect", follow_up_days: 75, hidden: true }]);
  const prospect = rules.find((rule) => rule.id === "prospect");
  assert.equal(prospect.hidden, true);
  assert.equal(matchStatusRule(rules, "Prospect").id, "prospect");
});
