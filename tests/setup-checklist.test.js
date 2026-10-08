import test from "node:test";
import assert from "node:assert/strict";
import { buildSetupSteps, fetchSetupStatus, nextSetupAction } from "../shared/setup-checklist.js";

test("a new account starts with nothing done", () => {
  const result = buildSetupSteps({});
  assert.equal(result.completed, 0);
  assert.equal(result.allDone, false);
  assert.deepEqual(result.steps.map((step) => step.id), ["import", "whatsapp", "schedule", "watch", "first-message"]);
});

test("steps tick from account data", () => {
  const result = buildSetupSteps({ leadCount: 12, whatsappConnected: true, scheduled: false, watching: false, messageSent: false });
  assert.deepEqual(result.steps.map((step) => step.done), [true, true, false, false, false]);
  assert.equal(result.completed, 2);
  assert.equal(buildSetupSteps({ leadCount: 1, whatsappConnected: true, scheduled: true, watching: true, messageSent: false }).completed, 4);
  assert.equal(buildSetupSteps({ leadCount: 1, whatsappConnected: true, scheduled: true, watching: true, messageSent: true }).allDone, true);
});

test("status queries are scoped to the user", async () => {
  const filters = [];
  const builder = (table) => {
    const chain = {
      select: () => chain,
      eq: (column, value) => { filters.push([table, column, value]); return chain; },
      limit: () => Promise.resolve({ data: ["whatsapp_accounts", "listing_alerts_tracked_listings"].includes(table) ? [{ id: 1 }] : [], error: null }),
      maybeSingle: () => Promise.resolve({ data: { days: { Monday: ["Forte 2"], Tuesday: [] } }, error: null }),
      then: (resolve) => resolve({ count: 3, error: null }),
    };
    return chain;
  };
  const auth = { getUser: () => Promise.resolve({ data: { user: { user_metadata: { setup_hidden: true, setup_skipped: ["watch", "import"] } } }, error: null }) };
  const status = await fetchSetupStatus({ from: builder, auth }, "user-1");
  // Hiding and skips come from the account; required steps can't be skipped.
  assert.deepEqual(status, { leadCount: 3, whatsappConnected: true, scheduled: true, watching: true, messageSent: false, hidden: true, skipped: ["watch"] });
  for (const table of ["leads", "whatsapp_accounts", "seller_signal_building_schedules", "listing_alerts_watchlists", "listing_alerts_tracked_listings", "whatsapp_messages"]) {
    assert.ok(filters.some(([t, c, v]) => t === table && c === "user_id" && v === "user-1"), table);
  }
});

test("skipped optional steps count as complete; required ones never skip", () => {
  const result = buildSetupSteps({ leadCount: 1, whatsappConnected: true, skipped: ["schedule", "watch", "first-message", "import"] });
  assert.equal(result.completed, 5);
  assert.equal(result.allDone, true);
  const unskippable = buildSetupSteps({ leadCount: 0, skipped: ["import", "whatsapp"] });
  assert.equal(unskippable.steps.find((step) => step.id === "import").skipped, false);
  assert.equal(unskippable.completed, 0);
});

test("empty states offer import first, then WhatsApp, then nothing", () => {
  assert.equal(nextSetupAction(undefined), null);
  assert.equal(nextSetupAction({ leadCount: 0, whatsappConnected: true }).id, "import");
  assert.equal(nextSetupAction({ leadCount: 5, whatsappConnected: false }).id, "whatsapp");
  assert.equal(nextSetupAction({ leadCount: 5, whatsappConnected: true }), null);
});
