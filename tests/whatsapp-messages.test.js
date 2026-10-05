import test from "node:test";
import assert from "node:assert/strict";
import { createWhatsAppMessageServices, groupFeedByDay, messageSourceLabel, messageText, normalizeSellerPhone } from "../shared/whatsapp-messages.js";

// Minimal chainable stand-in for the Supabase query builder that records calls.
function fakeSupabase(tables) {
  const calls = [];
  const from = (table) => {
    const query = { table, filters: [] };
    calls.push(query);
    const builder = {
      select(columns) { query.columns = columns; return builder; },
      eq(column, value) { query.filters.push(["eq", column, value]); return builder; },
      in(column, values) { query.filters.push(["in", column, values]); return builder; },
      gte(column, value) { query.filters.push(["gte", column, value]); return builder; },
      or(value) { query.or = value; return builder; },
      order() { return builder; },
      limit(value) { query.limit = value; return builder; },
      range(from, to) { query.range = [from, to]; return builder; },
      then(resolve, reject) { return Promise.resolve({ data: tables[table], error: null }).then(resolve, reject); },
    };
    return builder;
  };
  return { client: { from }, calls };
}

test("normalizeSellerPhone matches stored recipient numbers", () => {
  assert.equal(normalizeSellerPhone("050 555 0121"), "971505550121");
  assert.equal(normalizeSellerPhone("+971 50 555 0121"), "971505550121");
  assert.equal(normalizeSellerPhone("00971505550121"), "971505550121");
  assert.equal(normalizeSellerPhone("+44 7700 900123"), "447700900123");
  assert.equal(normalizeSellerPhone(""), null);
});

test("message labels describe source and fallback text", () => {
  assert.equal(messageSourceLabel({ direction: "outbound", send_source: "auto" }), "Automated");
  assert.equal(messageSourceLabel({ direction: "outbound", send_source: "manual" }), "Manual");
  assert.equal(messageSourceLabel({ direction: "inbound" }), "Replied");
  assert.equal(messageText({ body: "  Hi  " }), "Hi");
  assert.equal(messageText({ body: null, template_name: "transaction_update" }), "Template: transaction_update");
});

test("feed attaches sellers, including replies matched by number", async () => {
  const { client, calls } = fakeSupabase({
    whatsapp_messages: [
      { id: "r1", direction: "inbound", lead_id: null, recipient_phone: "971505550121", status: "received", created_at: "2026-10-05T10:05:00Z" },
      { id: "s1", direction: "outbound", lead_id: 7, recipient_phone: "971505550121", status: "read", send_source: "auto", created_at: "2026-10-05T09:00:00Z" },
      { id: "s2", direction: "outbound", lead_id: 9, recipient_phone: "971505550999", status: "failed", send_source: "manual", created_at: "2026-10-04T09:00:00Z" },
    ],
    leads: [{ id: 7, name: "Oliver Grant", building: "Burj Khalifa", unit: "5507" }],
  });
  const feed = await createWhatsAppMessageServices(client).fetchMessageFeed("user-1", { now: new Date("2026-10-05T12:00:00Z") });

  assert.equal(feed[0].lead_id, 7);
  assert.equal(feed[0].lead.name, "Oliver Grant");
  assert.equal(feed[2].lead, null, "a deleted seller leaves the row without a lead");
  const messageQuery = calls.find((call) => call.table === "whatsapp_messages");
  assert.deepEqual(messageQuery.filters.find(([, column]) => column === "user_id"), ["eq", "user_id", "user-1"]);
  const leadQuery = calls.find((call) => call.table === "leads");
  assert.deepEqual(leadQuery.filters, [["eq", "user_id", "user-1"], ["in", "id", [7, 9]]]);
});

test("thread matches the seller by id or phone and returns oldest first", async () => {
  const { client, calls } = fakeSupabase({
    whatsapp_messages: [{ id: "b", created_at: "2026-10-05T10:00:00Z" }, { id: "a", created_at: "2026-10-05T09:00:00Z" }],
  });
  const thread = await createWhatsAppMessageServices(client).fetchSellerThread("user-1", { id: "7", phone: "050 555 0121" });

  assert.deepEqual(thread.map((message) => message.id), ["a", "b"]);
  assert.equal(calls[0].or, "lead_id.eq.7,recipient_phone.eq.971505550121");
  assert.deepEqual(calls[0].filters[0], ["eq", "user_id", "user-1"]);
});

test("groupFeedByDay labels today and yesterday", () => {
  const now = new Date(2026, 9, 5, 12);
  const groups = groupFeedByDay([
    { sent_at: new Date(2026, 9, 5, 9).toISOString() },
    { sent_at: new Date(2026, 9, 4, 9).toISOString() },
    { sent_at: new Date(2026, 9, 1, 9).toISOString() },
  ], now);
  assert.deepEqual(groups.slice(0, 2).map((group) => group.title), ["Today", "Yesterday"]);
  assert.equal(groups.length, 3);
});
