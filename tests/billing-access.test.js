import test from "node:test";
import assert from "node:assert/strict";
import { hasActiveSubscription } from "../src/billing-access.js";

const NOW = Date.parse("2026-08-05T12:00:00.000Z");
const FUTURE = "2026-09-05T12:00:00.000Z";
const PAST = "2026-07-05T12:00:00.000Z";

test("desktop access requires a live, current Stripe subscription or trial", () => {
  assert.equal(hasActiveSubscription({ status: "active", current_period_end: FUTURE, raw: { livemode: true } }, NOW), true);
  assert.equal(hasActiveSubscription({ status: "active", current_period_end: FUTURE, raw: { livemode: false } }, NOW), false);
  assert.equal(hasActiveSubscription({ status: "trialing", current_period_end: FUTURE, raw: { livemode: true } }, NOW), true);
  assert.equal(hasActiveSubscription({ status: "active", current_period_end: null, raw: { livemode: true } }, NOW), false);
  assert.equal(hasActiveSubscription({ status: "active", current_period_end: PAST, raw: { livemode: true } }, NOW), false);
});
