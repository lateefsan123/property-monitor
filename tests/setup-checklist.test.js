import test from "node:test";
import assert from "node:assert/strict";
import { buildSetupSteps, fetchSetupStatus, nextSetupAction } from "../shared/setup-checklist.js";

test("a new account starts with nothing done", () => {
  const result = buildSetupSteps({});
  assert.equal(result.completed, 0);
  assert.equal(result.allDone, false);
  assert.deepEqual(result.steps.map((step) => step.id), ["import", "whatsapp", "watch", "first-message"]);
});

test("steps tick from account data", () => {
  const result = buildSetupSteps({ leadCount: 12, whatsappConnected: true, watching: false, messageSent: false });
  assert.deepEqual(result.steps.map((step) => step.done), [true, true, false, false]);
  assert.equal(result.completed, 2);
  assert.equal(buildSetupSteps({ leadCount: 1, whatsappConnected: true, watching: true, messageSent: false }).completed, 3);
  assert.equal(buildSetupSteps({ leadCount: 1, whatsappConnected: true, watching: true, messageSent: true }).allDone, true);
});

test("status queries are scoped to the user", async () => {
  const filters = [];
  const builder = (table) => {
    const chain = {
      select: () => chain,
      eq: (column, value) => { filters.push([table, column, value]); return chain; },
      limit: () => Promise.resolve({ data: ["whatsapp_accounts", "listing_alerts_tracked_listings"].includes(table) ? [{ id: 1 }] : [], error: null }),
      then: (resolve) => resolve({ count: 3, error: null }),
    };
    return chain;
  };
  const status = await fetchSetupStatus({ from: builder }, "user-1");
  assert.deepEqual(status, { leadCount: 3, whatsappConnected: true, watching: true, messageSent: false });
  for (const table of ["leads", "whatsapp_accounts", "listing_alerts_watchlists", "listing_alerts_tracked_listings", "whatsapp_messages"]) {
    assert.ok(filters.some(([t, c, v]) => t === table && c === "user_id" && v === "user-1"), table);
  }
});

test("empty states offer import first, then WhatsApp, then nothing", () => {
  assert.equal(nextSetupAction(undefined), null);
  assert.equal(nextSetupAction({ leadCount: 0, whatsappConnected: true }).id, "import");
  assert.equal(nextSetupAction({ leadCount: 5, whatsappConnected: false }).id, "whatsapp");
  assert.equal(nextSetupAction({ leadCount: 5, whatsappConnected: true }), null);
});
