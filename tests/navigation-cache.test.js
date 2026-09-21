import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { integrationStatusOptions } from "../src/integration-query.js";
import { buildingScheduleOptions } from "../shared/building-schedule-queries.js";
import { listingStateOptions } from "../src/features/listing-alerts/listing-state-query.js";
import { spreadsheetBuildingNames } from "../src/features/schedule/spreadsheet-buildings.js";

test("schedule choices come only from the selected spreadsheet rows", () => {
  const leads = [
    { sourceId: "one", building: " Forte 1 " },
    { sourceId: "one", building: "forte 1" },
    { sourceId: "one", building: "Forte 2" },
    { sourceId: "two", building: "Other building" },
    { sourceId: null, building: "Detached building" },
    { sourceId: "one", building: " " },
  ];
  assert.deepEqual(spreadsheetBuildingNames(leads, "one"), ["forte 1", "Forte 2"]);
  assert.deepEqual(spreadsheetBuildingNames(leads, "two"), ["Other building"]);
  assert.deepEqual(spreadsheetBuildingNames(leads, ""), []);
});

test("opening integrations joins its prefetch and repeat visits use cached status", async () => {
  const cache = new QueryClient();
  let calls = 0;
  let resolve;
  const request = () => { calls++; return new Promise(done => { resolve = done; }); };
  const options = integrationStatusOptions("owner", request);
  const prefetch = cache.prefetchQuery(options);
  const opening = cache.fetchQuery(options);
  resolve({ connections: [{ provider: "google", connected: true }] });
  await prefetch;
  assert.deepEqual(await opening, await cache.fetchQuery(options));
  assert.equal(calls, 1);
  assert.equal(cache.getQueryData(integrationStatusOptions("other", request).queryKey), undefined);
  cache.clear();
});

test("a failed background refresh retains connections and can be retried", async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let fails = false;
  const options = integrationStatusOptions("owner", async () => {
    if (fails) throw new Error("offline");
    return { connections: [{ connected: true }] };
  });
  await cache.fetchQuery(options);
  fails = true;
  await assert.rejects(cache.fetchQuery({ ...options, staleTime: 0 }), /offline/);
  assert.deepEqual(cache.getQueryData(options.queryKey), [{ connected: true }]);
  fails = false;
  await cache.fetchQuery({ ...options, staleTime: 0 });
  cache.clear();
});

test("schedule prefetch and page use account-specific query identities", () => {
  const owner = buildingScheduleOptions({}, "owner");
  const other = buildingScheduleOptions({}, "other");
  assert.notDeepEqual(owner.schedule.queryKey, other.schedule.queryKey);
  assert.notDeepEqual(owner.buildings.queryKey, other.buildings.queryKey);
  assert.equal(buildingScheduleOptions({}, null).schedule.enabled, false);
});

test("listing prefetch scopes every read and rejects partial failures", async () => {
  const filters = [];
  let failure = false;
  const client = { from: table => ({ select: () => ({ eq: (column, userId) => {
    filters.push([table, column, userId]);
    const result = { data: table === "listing_alerts_state" ? null : [], error: failure ? new Error("unavailable") : null };
    return { then: resolve => resolve(result), maybeSingle: async () => result };
  } }) }) };
  const options = listingStateOptions(client, "owner");
  assert.deepEqual(await options.queryFn(), { watchlistRows: [], trackedRows: [], stateRow: null });
  assert.equal(filters.length, 3);
  assert.ok(filters.every(([, column, value]) => column === "user_id" && value === "owner"));
  failure = true;
  await assert.rejects(options.queryFn(), /unavailable/);
});
