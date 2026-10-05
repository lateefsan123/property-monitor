import test from "node:test";
import assert from "node:assert/strict";
import { createWhatsAppMessageServices, formatMessageWhen, groupFeedByDay, messageSourceLabel, messageText, normalizeSellerPhone } from "../shared/whatsapp-messages.js";

// Minimal chainable stand-in for the Supabase query builder that records calls.
// tables[name] is rows, or a function of the recorded query returning rows.
function fakeSupabase(tables) {
  const calls = [];
  const from = (table) => {
    const query = { table, filters: [], ors: [] };
    calls.push(query);
    const builder = {
      select(columns) { query.columns = columns; return builder; },
      eq(column, value) { query.filters.push(["eq", column, value]); return builder; },
      in(column, values) { query.filters.push(["in", column, values]); return builder; },
      gte(column, value) { query.filters.push(["gte", column, value]); return builder; },
      not(column, operator, value) { query.filters.push(["not", column, operator, value]); return builder; },
      or(value) { query.ors.push(value); return builder; },
      order() { return builder; },
      limit(value) { query.limit = value; return builder; },
      then(resolve, reject) {
        const source = tables[table];
        const data = typeof source === "function" ? source(query) : source;
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
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

test("formatMessageWhen gives the exact time with its day", () => {
  const now = new Date(2026, 9, 5, 12);
  assert.equal(formatMessageWhen(new Date(2026, 9, 5, 10, 35).toISOString(), now), "Today 10:35");
  assert.equal(formatMessageWhen(new Date(2026, 9, 4, 9, 5).toISOString(), now), "Yesterday 09:05");
  assert.match(formatMessageWhen(new Date(2026, 9, 2, 11, 55).toISOString(), now), /^Fri 2 Oct 11:55$/);
});

test("a feed page asks for one extra row and returns a cursor when more exist", async () => {
  const rows = Array.from({ length: 3 }, (_, i) => ({ id: `m${i}`, direction: "outbound", lead_id: 7, recipient_phone: "971505550121", created_at: `2026-10-05T10:0${i}:00Z` }));
  const { client, calls } = fakeSupabase({ whatsapp_messages: rows, leads: [{ id: 7, name: "Oliver Grant" }] });
  const page = await createWhatsAppMessageServices(client).fetchMessagePage("user-1", { pageSize: 2, direction: "outbound" });

  assert.equal(page.items.length, 2);
  assert.deepEqual(page.nextCursor, { created_at: "2026-10-05T10:01:00Z", id: "m1" });
  assert.equal(page.items[0].lead.name, "Oliver Grant");
  const query = calls[0];
  assert.equal(query.limit, 3);
  assert.deepEqual(query.filters.find(([, column]) => column === "user_id"), ["eq", "user_id", "user-1"]);
  assert.deepEqual(query.filters.find(([, column]) => column === "direction"), ["eq", "direction", "outbound"]);
});

test("the next page starts strictly after the cursor", async () => {
  const { client, calls } = fakeSupabase({ whatsapp_messages: [] });
  await createWhatsAppMessageServices(client).fetchMessagePage("user-1", { cursor: { created_at: "2026-10-05T10:01:00.5+00:00", id: "m1" } });
  assert.deepEqual(calls[0].ors, ['created_at.lt."2026-10-05T10:01:00.5+00:00",and(created_at.eq."2026-10-05T10:01:00.5+00:00",id.gt.m1)']);
});

test("replies without a seller are matched through earlier sends to that number", async () => {
  const { client, calls } = fakeSupabase({
    whatsapp_messages: (query) => query.filters.some(([, column, value]) => column === "direction" && value === "outbound") && query.columns.startsWith("lead_id")
      ? [{ lead_id: 7, recipient_phone: "971505550121" }]
      : [{ id: "r1", direction: "inbound", lead_id: null, recipient_phone: "971505550121", created_at: "2026-10-05T10:05:00Z" }],
    leads: [{ id: 7, name: "Oliver Grant" }],
  });
  const page = await createWhatsAppMessageServices(client).fetchMessagePage("user-1");
  assert.equal(page.items[0].lead.name, "Oliver Grant");
  const lookup = calls.find((call) => call.table === "whatsapp_messages" && call.columns.startsWith("lead_id"));
  assert.deepEqual(lookup.filters.find(([, column]) => column === "user_id"), ["eq", "user_id", "user-1"]);
  assert.deepEqual(calls.find((call) => call.table === "leads").filters[0], ["eq", "user_id", "user-1"]);
});

test("thread pages match the seller by id or phone", async () => {
  const { client, calls } = fakeSupabase({ whatsapp_messages: [{ id: "b", created_at: "2026-10-05T10:00:00Z" }, { id: "a", created_at: "2026-10-05T09:00:00Z" }] });
  const page = await createWhatsAppMessageServices(client).fetchSellerThreadPage("user-1", { id: "7", phone: "050 555 0121" }, { pageSize: 20 });
  assert.deepEqual(page.items.map((message) => message.id), ["b", "a"]);
  assert.equal(page.nextCursor, null);
  assert.equal(calls[0].ors[0], "lead_id.eq.7,recipient_phone.eq.971505550121");
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
