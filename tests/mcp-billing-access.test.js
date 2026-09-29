import test from "node:test";
import process from "node:process";
import assert from "node:assert/strict";
import { hasBillingAccess } from "../services/seller-signal-mcp/src/billing-access.js";
import { getToolUserId, assertUserHasSubscription } from "../services/seller-signal-mcp/src/seller-signal.js";
import { createSellerSignalMcpServer } from "../services/seller-signal-mcp/src/server.js";
import { createRequire } from "node:module";

const auth = { token: "verified-user-token", extra: { userId: "user-a" } };
const config = { url: "https://example.supabase.co", publishableKey: "public-key" };
const now = Date.parse("2026-09-29T12:00:00Z");
const active = { source: "stripe", status: "active", current_period_end: "2026-10-01T00:00:00Z", raw: { livemode: true } };
const check = (subscription) => hasBillingAccess(auth, { config, now, fetcher: async () => Response.json({ subscription }) });

test("accepts active web, mobile, and existing complimentary access", async () => {
  for (const source of ["stripe", "app_store", "play_store", "complimentary"]) {
    assert.equal(await check({ ...active, source }), true);
  }
  assert.equal(await check({ ...active, status: "trialing" }), true);
});

test("denies unpaid, expired, sandbox, and malformed entitlements", async () => {
  for (const subscription of [null, {}, { ...active, status: "canceled" }, { ...active, raw: { livemode: false } }, { ...active, source: "unknown" }, { ...active, current_period_end: null }, { ...active, current_period_end: "invalid" }, { ...active, current_period_end: new Date(now).toISOString() }]) {
    assert.equal(await check(subscription), false);
  }
});

test("uses only the authenticated token and never sends a supplied user ID", async () => {
  await hasBillingAccess(auth, { config, now, fetcher: async (url, init) => {
    assert.equal(String(url), "https://example.supabase.co/functions/v1/get-billing-access");
    assert.equal(init.headers.Authorization, `Bearer ${auth.token}`);
    assert.equal(init.body, undefined);
    assert.equal(init.redirect, "error");
    return Response.json({ subscription: active });
  } });
});

test("fails closed on invalid authentication and unavailable billing", async () => {
  assert.equal(await hasBillingAccess({}, { config }), false);
  for (const status of [401, 403]) assert.equal(await hasBillingAccess(auth, { config, fetcher: async () => new Response(null, { status }) }), false);
  await assert.rejects(hasBillingAccess(auth, { config, fetcher: async () => new Response(null, { status: 503 }) }), /Could not verify/);
  await assert.rejects(hasBillingAccess(auth, { config, fetcher: async () => new Response("not json") }));
  await assert.rejects(hasBillingAccess(auth, { config: { ...config, url: "http://example.com" } }), /HTTPS/);
});

test("missing or mismatched identities cannot use fixed-account or billing bypass settings", async () => {
  const previousUser = process.env.SELLER_SIGNAL_MCP_AUTH_USER_ID;
  const previousBypass = process.env.SELLER_SIGNAL_MCP_REQUIRE_SUBSCRIPTION;
  try {
    process.env.SELLER_SIGNAL_MCP_AUTH_USER_ID = "user-a";
    process.env.SELLER_SIGNAL_MCP_REQUIRE_SUBSCRIPTION = "0";
    assert.throws(() => getToolUserId({}), /Authenticated/);
    await assert.rejects(assertUserHasSubscription("user-b", auth), /Authenticated/);
    await assert.rejects(assertUserHasSubscription("user-a", { extra: { userId: "user-a" } }), /subscription is required/);
  } finally {
    if (previousUser === undefined) delete process.env.SELLER_SIGNAL_MCP_AUTH_USER_ID;
    else process.env.SELLER_SIGNAL_MCP_AUTH_USER_ID = previousUser;
    if (previousBypass === undefined) delete process.env.SELLER_SIGNAL_MCP_REQUIRE_SUBSCRIPTION;
    else process.env.SELLER_SIGNAL_MCP_REQUIRE_SUBSCRIPTION = previousBypass;
  }
});

test("a real MCP session uses the refreshed request token for billing", async () => {
  const require = createRequire(new URL("../services/seller-signal-mcp/package.json", import.meta.url));
  const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
  const { InMemoryTransport } = require("@modelcontextprotocol/sdk/inMemory.js");
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.SELLER_SIGNAL_SUPABASE_URL;
  const previousKey = process.env.SELLER_SIGNAL_SUPABASE_PUBLISHABLE_KEY;
  const tokens = [];
  const client = new Client({ name: "refresh-test", version: "1" });
  const server = createSellerSignalMcpServer({ authInfo: { ...auth, token: "old-token" } });
  try {
    process.env.SELLER_SIGNAL_SUPABASE_URL = config.url;
    process.env.SELLER_SIGNAL_SUPABASE_PUBLISHABLE_KEY = config.publishableKey;
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), `${config.url}/functions/v1/get-billing-access`);
      tokens.push(init.headers.Authorization);
      return Response.json({ subscription: null });
    };
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const send = clientTransport.send.bind(clientTransport);
    let token = "first-token";
    clientTransport.send = (message, options) => send(message, { ...options, authInfo: { ...auth, token } });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    for (const nextToken of ["first-token", "refreshed-token"]) {
      token = nextToken;
      const result = await client.callTool({ name: "get_my_seller_signal_account", arguments: {} });
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /subscription is required/);
    }
    assert.deepEqual(tokens, ["Bearer first-token", "Bearer refreshed-token"]);
  } finally {
    await client.close();
    await server.close();
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.SELLER_SIGNAL_SUPABASE_URL;
    else process.env.SELLER_SIGNAL_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SELLER_SIGNAL_SUPABASE_PUBLISHABLE_KEY;
    else process.env.SELLER_SIGNAL_SUPABASE_PUBLISHABLE_KEY = previousKey;
  }
});
