import test from "node:test";
import assert from "node:assert/strict";
import { accountsNotDue, formatHour, loadSendPacing, messagesThatFit, normalizePacing } from "../supabase/functions/_shared/send-pacing.js";

test("pacing falls back to 9 am to 9 pm every 5 minutes", () => {
  assert.deepEqual(normalizePacing(null), { start: 9, end: 21, interval: 5 });
  assert.deepEqual(normalizePacing({ send_window_start_hour: 22, send_window_end_hour: 8, send_interval_minutes: 7 }), { start: 9, end: 21, interval: 5 });
  assert.deepEqual(normalizePacing({ send_window_start_hour: 10, send_window_end_hour: 14, send_interval_minutes: 10 }), { start: 10, end: 14, interval: 10 });
});

test("messages that fit respect the window, the gap and the daily limit", () => {
  assert.equal(messagesThatFit({ start: 9, end: 21, interval: 5 }), 40);
  assert.equal(messagesThatFit({ start: 10, end: 14, interval: 10 }), 24);
  assert.equal(messagesThatFit({ start: 9, end: 10, interval: 60 }), 1);
});

test("accounts wait outside their hours or until their gap has passed", () => {
  const now = new Date("2026-10-06T08:05:00Z"); // 12:05 Dubai
  const pacing = new Map([
    ["early", { start: 6, end: 12, interval: 5 }],
    ["ready", { start: 9, end: 21, interval: 5 }],
    ["spaced", { start: 9, end: 21, interval: 30 }],
    ["drift", { start: 9, end: 21, interval: 5 }],
  ]);
  const lastSends = new Map([
    ["ready", now.getTime() - 6 * 60 * 1000],
    ["spaced", now.getTime() - 10 * 60 * 1000],
    ["drift", now.getTime() - (5 * 60 - 2) * 1000], // last run 2 s late
  ]);
  const waiting = accountsNotDue({ pacing, lastSends, now, dubaiHour: 12 });
  assert.equal(waiting.get("early"), "outsideSendWindow");
  assert.equal(waiting.get("spaced"), "spacing");
  assert.equal(waiting.has("ready"), false);
  assert.equal(waiting.has("drift"), false);
  assert.equal(accountsNotDue({ pacing, lastSends, now, dubaiHour: 12, enforceWindow: false }).has("early"), false);
});

test("pacing loads per account and survives missing columns", async () => {
  const ok = { from: () => ({ select() { return this; }, in: () => Promise.resolve({ data: [{ user_id: "a", send_window_start_hour: 10, send_window_end_hour: 18, send_interval_minutes: 15 }], error: null }) }) };
  const pacing = await loadSendPacing(ok, ["a", "b"]);
  assert.deepEqual(pacing.get("a"), { start: 10, end: 18, interval: 15 });
  assert.deepEqual(pacing.get("b"), { start: 9, end: 21, interval: 5 });
  const missing = { from: () => ({ select() { return this; }, in: () => Promise.resolve({ data: null, error: { code: "42703", message: "no column" } }) }) };
  assert.deepEqual((await loadSendPacing(missing, ["a"])).get("a"), { start: 9, end: 21, interval: 5 });
});

test("hours read naturally", () => {
  assert.equal(formatHour(0), "12 am");
  assert.equal(formatHour(9), "9 am");
  assert.equal(formatHour(12), "12 pm");
  assert.equal(formatHour(21), "9 pm");
  assert.equal(formatHour(24), "midnight");
});

test("the daily limit stays between 1 and 40", async () => {
  const { clampDailyLimit } = await import("../shared/automation-settings.js");
  assert.equal(clampDailyLimit(25), 25);
  assert.equal(clampDailyLimit(0), 40);
  assert.equal(clampDailyLimit(99), 40);
  assert.equal(clampDailyLimit("12"), 12);
  assert.equal(clampDailyLimit(undefined), 40);
});
