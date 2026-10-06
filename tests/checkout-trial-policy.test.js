import assert from "node:assert/strict";
import test from "node:test";
import { resolveTrialPeriodDays } from "../supabase/functions/create-checkout-session/trial-policy.js";

test("trial requests always use the server's seven-day duration", () => {
  for (const requestedDays of [1, 7, 14, 30]) {
    assert.equal(resolveTrialPeriodDays(requestedDays), 7);
  }
});

test("missing or invalid trial requests do not enable a trial", () => {
  for (const value of [undefined, null, 0, -1, 31, 1.5, "7", true, {}, NaN]) {
    assert.equal(resolveTrialPeriodDays(value), null);
  }
});
