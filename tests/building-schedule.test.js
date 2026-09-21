import test from "node:test";
import assert from "node:assert/strict";
import { createScheduleQueue, dubaiScheduleDay, emptySchedule, normalizeSchedule, scheduleCountKey, loadScheduleQueue } from "../supabase/functions/_shared/building-schedule.js";
import { createBuildingScheduleServices } from "../shared/building-schedule-services.js";

const monday = new Date("2026-09-21T10:00:00Z");
const lead = (id, building, user_id = "owner") => ({ id, building, user_id });
const schedule = (buildings, fill_unused = false) => ({ ...emptySchedule(), enabled: true, fill_unused, days: { ...emptySchedule().days, Monday: buildings } });
function queue(leads, buildings, fallback = false, counts = new Map()) {
  return createScheduleQueue(leads, new Map([["owner", schedule(buildings, fallback)]]), counts, monday);
}
test("splits 40 sends between three buildings with at most one difference", () => {
  const leads = ["A", "B", "C"].flatMap((name, j) => Array.from({ length: 50 }, (_, i) => lead(j * 100 + i, name)));
  const q = queue(leads, ["A", "B", "C"]);
  const counts = { A: 0, B: 0, C: 0 };
  let total = 0;
  for (const item of q) { q.recordSend(item); counts[item.building]++; if (++total === 40) break; }
  assert.deepEqual(Object.values(counts).sort(), [13, 13, 14]);
});
test("carries daily allocation into the next run", () => {
  const counts = new Map([[scheduleCountKey(lead(1, "A")), 7], [scheduleCountKey(lead(2, "B")), 2]]);
  const q = queue([lead(1, "A"), lead(2, "B"), lead(3, "B")], ["A", "B"], false, counts);
  const chosen = [];
  for (const item of q) { chosen.push(item.building); q.recordSend(item); }
  assert.deepEqual(chosen, ["B", "B", "A"]);
});
test("ineligible leads do not consume allocation and remaining buildings absorb slots", () => {
  const q = queue([lead(1, "A"), lead(2, "A"), lead(3, "B"), lead(4, "B"), lead(5, "C")], ["A", "B", "C"]);
  const sent = [];
  for (const item of q) { if (item.building === "A") continue; sent.push(item.building); q.recordSend(item); }
  assert.deepEqual(sent, ["B", "C", "B"]);
});
test("fallback is opt-in and comes after selected buildings", () => {
  const items = [lead(1, "Other"), lead(2, "A")];
  assert.deepEqual([...queue(items, ["A"])].map(x => x.building), ["A"]);
  assert.deepEqual([...queue(items, ["A"], true)].map(x => x.building), ["A", "Other"]);
});
test("empty days never send even when fallback is enabled", () => {
  assert.equal([...queue([lead(1, "A")], [], true)].length, 0);
});
test("disabled or absent schedules preserve existing leads", () => {
  const items = [lead(1, "A"), lead(2, "B")];
  assert.deepEqual([...createScheduleQueue(items, new Map(), new Map(), monday)], items);
  assert.deepEqual([...createScheduleQueue(items, new Map([["owner", emptySchedule()]]), new Map(), monday)], items);
});
test("buildings and counts stay scoped to each user", () => {
  const q = queue([lead(1, "A"), lead(2, "B", "other")], ["A"]);
  assert.deepEqual([...q].map(x => x.id), [1, 2]);
  assert.notEqual(scheduleCountKey(lead(1, "A")), scheduleCountKey(lead(2, "A", "other")));
});
test("Dubai midnight changes weekday independently of Ireland", () => {
  assert.equal(dubaiScheduleDay(new Date("2026-09-20T19:59:59Z")), "Sunday");
  assert.equal(dubaiScheduleDay(new Date("2026-09-20T20:00:00Z")), "Monday");
});
test("normalization deduplicates casing but never merges numbered towers", () => {
  const value = normalizeSchedule(schedule([" Forte 1 ", "forte 1", "Forte 2"]));
  assert.equal(value.days.Monday.length, 2);
  assert.throws(() => normalizeSchedule({ days: { Monday: "Forte 1" } }));
  assert.throws(() => normalizeSchedule(schedule([42])));
});
test("schedule lookup failures fail closed", async () => {
  const client = { from: () => ({ select: () => ({ in: async () => ({ error: { message: "unavailable" } }) }) }) };
  await assert.rejects(loadScheduleQueue(client, [lead(1, "A")], monday), /Could not load/);
});
test("services reject missing users before querying", async () => {
  const services = createBuildingScheduleServices({ from() { throw new Error("must not query"); } });
  await assert.rejects(services.load(null), /Sign in/);
  await assert.rejects(services.buildings(null), /Sign in/);
  await assert.rejects(services.save(null, emptySchedule()), /Sign in/);
});
test("daily allocation loads existing automatic sends using Dubai bounds", async () => {
  const calls = [];
  const client = { from(table) {
    const query = {};
    for (const method of ["select", "eq", "in", "gte", "lt", "order"]) query[method] = (...args) => { calls.push([table, method, ...args]); return query; };
    query.then = resolve => resolve({ data: [{ user_id: "owner", ...schedule(["A", "B"]) }] });
    query.range = async () => ({ data: [{ id: 10, user_id: "owner", lead_id: 1 }] });
    return query;
  } };
  const q = await loadScheduleQueue(client, [lead(1, "A"), lead(2, "B")], monday);
  assert.equal([...q][0].building, "B");
  assert.ok(calls.some(call => call[1] === "gte" && call[3] === "2026-09-20T20:00:00.000Z"));
  assert.ok(calls.some(call => call[1] === "lt" && call[3] === "2026-09-21T20:00:00.000Z"));
  assert.ok(calls.some(call => call[1] === "eq" && call[2] === "send_source" && call[3] === "auto"));
});
test("save payload cannot override authenticated owner", async () => {
  let payload;
  const client = { from: () => ({ upsert: async value => { payload = value; return {}; } }) };
  await createBuildingScheduleServices(client).save("owner", { ...emptySchedule(), user_id: "someone-else" });
  assert.equal(payload.user_id, "owner");
  assert.deepEqual(Object.keys(payload).sort(), ["days", "enabled", "fill_unused", "user_id"]);
});
