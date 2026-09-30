import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { OpenAIUiResourceMetadataSchema, OpenAIUiToolMetadataSchema } from "@openai/mcp-extensions/server";
import { createSellerSignalMcpServer } from "../src/server.js";
import { createModernHandler, MODERN_VERSION } from "../src/modern-mcp.js";
import { PANEL_URI, PANEL_META, panelResource } from "../src/seller-panel.js";
import { transform } from "esbuild";

async function request(method, args = {}, mutate = () => {}) {
  const req = { headers: { "mcp-protocol-version": MODERN_VERSION, "mcp-method": method, "mcp-name": args.name ?? args.uri }, auth: { extra: { userId: "a" } }, body: { jsonrpc: "2.0", id: 1, method, params: { ...args, _meta: { "io.modelcontextprotocol/protocolVersion": MODERN_VERSION, "io.modelcontextprotocol/clientCapabilities": {} } } } };
  let output; let status = 200;
  const res = { set: () => {}, status: code => { status = code; return res; }, json: value => { output = value; return res; } };
  mutate(req);
  await createModernHandler({ origin: "https://example.com", events: { subscribe: async (auth, params) => ({ id: auth.extra.userId, params }), unsubscribe: async () => ({}) } })(req, res);
  return { output, status };
}

test("modern discovery, event catalog and UI resource are available with per-request metadata", async () => {
  assert.deepEqual((await request("server/discover")).output.result.capabilities, { tools: {}, resources: {}, events: {} });
  const tools = (await request("tools/list")).output.result.tools;
  assert.equal(tools.length, 9);
  assert.equal(tools.find(t => t.name === "get_my_seller_workspace")._meta.ui.resourceUri, PANEL_URI);
  assert.equal((await request("events/list")).output.result.events[0].name, "seller.reply_received");
  const result = await request("resources/read", { uri: PANEL_URI });
  assert.equal(result.output.result.resultType, "complete");
  assert.match(result.output.result.contents[0].text, /Your seller workspace/);
});

test("modern transport rejects forged headers, wrong origins and unsupported versions", async () => {
  assert.equal((await request("tools/list", {}, r => { r.headers["mcp-method"] = "events/list"; })).output.error.code, -32020);
  assert.equal((await request("resources/read", { uri: PANEL_URI }, r => { r.headers["mcp-name"] = "other"; })).output.error.code, -32020);
  assert.equal((await request("tools/list", {}, r => { r.headers.origin = "https://evil.example"; })).status, 403);
  assert.equal((await request("tools/list", {}, r => { r.headers["mcp-protocol-version"] = "2099"; r.body.params._meta["io.modelcontextprotocol/protocolVersion"] = "2099"; })).output.error.code, -32022);
  assert.equal((await request("unknown")).status, 404);
});

test("panel metadata validates against the official extension SDK", () => {
  OpenAIUiToolMetadataSchema.parse(PANEL_META["openai/ui"]);
  OpenAIUiResourceMetadataSchema.parse(panelResource().contents[0]._meta["openai/ui"]);
});

test("embedded panel JavaScript parses after HTML packaging", async () => {
  const html = panelResource().contents[0].text;
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  await transform(script, { loader: "js" });
});

test("legacy submitted endpoint remains eight tools; preview adds panel over the real SDK", async () => {
  for (const enablePanel of [false, true]) {
    const server = createSellerSignalMcpServer({ enablePanel });
    const client = new Client({ name: "test", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a); await client.connect(b);
    assert.equal((await client.listTools()).tools.length, enablePanel ? 9 : 8);
    if (enablePanel) assert.equal((await client.readResource({ uri: PANEL_URI })).contents.length, 1);
    await client.close(); await server.close();
  }
});
