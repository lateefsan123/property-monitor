import test from "node:test";
import assert from "node:assert/strict";
import { stripeAccess, revenueCatAccess, getRevenueCatCustomer } from "../supabase/functions/_shared/billing-access.js";

const now = Date.parse("2026-09-04T12:00:00Z");
const future = "2026-10-04T12:00:00Z";
function customer(patch = {}, entitlementPatch = {}) {
  return { subscriber: {
    entitlements: { seller_signal_pro: { product_identifier: "monthly", expires_date: future, ...entitlementPatch } },
    subscriptions: { monthly: { is_sandbox: false, store: "app_store", ...patch } },
  } };
}
test("Apple and Google live subscriptions unlock the same access", () => {
  for (const store of ["app_store", "play_store"]) {
    assert.equal(revenueCatAccess(customer({ store }), now)?.source, store);
  }
});
test("sandbox, missing receipts, refunds and other entitlements cannot unlock web", () => {
  for (const patch of [{ is_sandbox: true }, { is_sandbox: undefined }, { refunded_at: future }, { store: "test_store" }, { store: "promotional" }]) {
    assert.equal(revenueCatAccess(customer(patch), now), null);
  }
  assert.equal(revenueCatAccess({ subscriber: { entitlements: {}, subscriptions: {} } }, now), null);
});
test("expiry fails closed, including malformed or missing dates", () => {
  for (const expires_date of [null, "garbage", "2026-01-01", new Date(now).toISOString()]) {
    assert.equal(revenueCatAccess(customer({}, { expires_date }), now), null);
  }
});
test("cancellation preserves paid time and grace is respected", () => {
  const cancelled = revenueCatAccess(customer({ unsubscribe_detected_at: "2026-09-01" }), now);
  assert.equal(cancelled.cancel_at_period_end, true);
  assert.equal(revenueCatAccess(customer({}, { expires_date: "2026-09-01", grace_period_expires_date: future }), now)?.status, "active");
});
test("native free trial is recognized without granting a second trial", () => {
  assert.equal(revenueCatAccess(customer({ period_type: "trial" }), now)?.status, "trialing");
});
test("Stripe access requires live active unexpired status and returns actual price", () => {
  const row = { status: "active", current_period_end: future, raw: { livemode: true, items: { data: [{ price: { unit_amount: 5000, currency: "eur" } }] } } };
  assert.equal(stripeAccess(row, now)?.amount, 5000);
  for (const patch of [{ raw: { livemode: false } }, { status: "past_due" }, { current_period_end: null }]) assert.equal(stripeAccess({ ...row, ...patch }, now), null);
});
test("RevenueCat lookup uses encoded authenticated identity and rejects unavailable/malformed responses", async () => {
  await getRevenueCatCustomer("user/id", "public-key", async (url, options) => {
    assert.match(url, /user%2Fid$/);
    assert.equal(options.headers.Authorization, "Bearer public-key");
    return { ok: true, json: async () => customer() };
  });
  await assert.rejects(getRevenueCatCustomer("u", "", async () => {}));
  await assert.rejects(getRevenueCatCustomer("u", "key", async () => ({ ok: false })));
  await assert.rejects(getRevenueCatCustomer("u", "key", async () => ({ ok: true, json: async () => ({}) })));
});
