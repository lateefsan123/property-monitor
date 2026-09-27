import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { selectCountedRows } from "../shared/select-counted-rows.js";
import { prefetchHomeOnStartup } from "../src/startup-prefetch.js";

test("large accounts load remaining pages concurrently without losing order", async () => {
  const rows = Array.from({ length: 7501 }, (_, id) => ({ id }));
  let active = 0;
  let peak = 0;
  const requests = [];
  const result = await selectCountedRows(counted => ({ range: async (from, to) => {
    requests.push({ counted, from, to });
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, from === 1000 ? 15 : 1));
    active--;
    return { data: rows.slice(from, to + 1), count: counted ? rows.length : null };
  } }));
  assert.deepEqual(result, rows);
  assert.equal(peak, 3);
  assert.equal(requests.length, 8);
  assert.equal(requests.filter(r => r.counted).length, 1);
});

test("exact page multiples need no extra empty request", async () => {
  let calls = 0;
  const rows = [1, 2, 3, 4];
  assert.deepEqual(await selectCountedRows(() => ({ range: async (from, to) => {
    calls++;
    return { data: rows.slice(from, to + 1), count: 4 };
  } }), 2), rows);
  assert.equal(calls, 2);
});

test("missing counts fall back to complete sequential pagination", async () => {
  const rows = [1, 2, 3, 4, 5];
  assert.deepEqual(await selectCountedRows(() => ({ range: async (from, to) => (
    { data: rows.slice(from, to + 1), count: null }
  ) }), 2), rows);
});

test("a failed page rejects instead of caching partial seller totals", async () => {
  await assert.rejects(selectCountedRows(() => ({ range: async from => from === 0
    ? { data: [1, 2], count: 5 }
    : { data: null, error: { message: "connection lost" } }
  }), 2), /connection lost/);
});

test("startup begins all home reads immediately and mounting joins the same requests", async () => {
  const cache = new QueryClient();
  const pending = [];
  let calls = 0;
  const options = ["leads", "messages", "drops"].map(kind => ({
    queryKey: [kind, "owner"], staleTime: 120000,
    queryFn: () => { calls++; return new Promise(resolve => pending.push(resolve)); },
  }));
  const startup = prefetchHomeOnStartup(cache, "owner", { pathname: "/", hash: "#/home" }, options);
  assert.equal(calls, 3);
  const mounted = cache.fetchQuery(options[0]);
  assert.equal(calls, 3);
  pending.forEach(resolve => resolve(["saved data"]));
  await startup;
  assert.deepEqual(await mounted, ["saved data"]);
  assert.equal(cache.getQueryData(["leads", "another-user"]), undefined);
  await prefetchHomeOnStartup(cache, "owner", { pathname: "/", hash: "" }, options);
  assert.equal(calls, 3);
  cache.clear();
});

test("public, auth and other routes do not prefetch the home dashboard", async () => {
  let calls = 0;
  const cache = { prefetchQuery: () => { calls++; } };
  const options = [{}];
  for (const [userId, pathname, hash] of [
    [null, "/", ""], ["owner", "/pricing", ""], ["owner", "/", "#login"],
    ["owner", "/", "#/sellers"], ["owner", "/oauth/consent", ""],
  ]) await prefetchHomeOnStartup(cache, userId, { pathname, hash }, options);
  assert.equal(calls, 0);
});
