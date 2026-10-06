import test from "node:test";
import assert from "node:assert/strict";
import { dueFollowUps, renderFollowUp, sendableStatuses } from "../supabase/functions/_shared/status-followups.js";

const NOW = Date.parse("2026-10-09T08:00:00Z");
const statusRows = [
  { id: "11111111-1111-1111-1111-111111111111", label: "Broker – intro", follow_up_days: 3, next_status_id: "22222222-2222-2222-2222-222222222222" },
  { id: "22222222-2222-2222-2222-222222222222", label: "Broker – follow-up", follow_up_days: 3, next_status_id: "33333333-3333-3333-3333-333333333333" },
  { id: "33333333-3333-3333-3333-333333333333", label: "Broker – done", follow_up_days: 0, next_status_id: null },
  { id: "44444444-4444-4444-4444-444444444444", label: "No template", follow_up_days: 3 },
];
const templates = [
  { content: "Hi {{name}} from {{building}}, intro", statuses: ["custom:11111111-1111-1111-1111-111111111111"], updated_at: "1" },
  { content: "Hi {{name}}, follow-up", statuses: ["custom:22222222-2222-2222-2222-222222222222"], updated_at: "1" },
];

test("only custom statuses with a gap and a template can send, with their next status", () => {
  const statuses = sendableStatuses(statusRows, templates);
  assert.deepEqual(statuses.map((s) => [s.label, s.nextLabel]), [["Broker – intro", "Broker – follow-up"], ["Broker – follow-up", "Broker – done"]]);
});

test("due: never contacted first, gap respected, replies and manual dates stop it", () => {
  const statuses = sendableStatuses(statusRows, templates);
  const leads = [
    { id: 1, name: "Ali", phone: "971500000001", status: "Broker – intro" },
    { id: 2, name: "Bea", phone: "971500000002", status: "Broker – follow-up", last_contact: "2026-10-06" },
    { id: 3, name: "Cy", phone: "971500000003", status: "Broker – follow-up", last_contact: "2026-10-08" },
    { id: 4, name: "Di", phone: "971500000004", status: "broker – FOLLOW-UP", last_contact: "2026-10-01" },
    { id: 5, name: "Ed", phone: "971500000005", status: "Broker – intro" },
    { id: 6, name: "Fi", phone: "971500000006", status: "Broker – done" },
    { id: 7, name: "Gu", phone: "971500000007", status: "Broker – intro", next_follow_up_on: "2026-10-20" },
    { id: 8, name: "Ha", phone: "971500000008", status: "Broker – intro" },
  ];
  const due = dueFollowUps({
    leads, statuses, now: NOW,
    repliedLeadIds: new Set([5]), repliedPhones: new Set(["971500000008"]),
    outboundByLead: new Map(),
  });
  assert.deepEqual(due.map((item) => item.lead.id), [1, 4, 2]);
});

test("a failed or recent automated send counts as a touch", () => {
  const statuses = sendableStatuses(statusRows, templates);
  const due = dueFollowUps({
    leads: [{ id: 1, name: "Ali", phone: "971500000001", status: "Broker – intro" }],
    statuses, now: NOW, outboundByLead: new Map([[1, ["2026-10-08T10:00:00Z"]]]),
  });
  assert.equal(due.length, 0);
});

test("templates fill name and building, drop transactions, and skip nameless sellers", () => {
  assert.equal(renderFollowUp("Hi {{name}} at {{building}}\n{{transactions}}\nBye", { name: " Sara ", building: "Allsopp" }), "Hi Sara at Allsopp\nBye");
  assert.equal(renderFollowUp("Hi {{name}}", { name: "" }), null);
  assert.equal(renderFollowUp("Hello there", { name: "" }), "Hello there");
});
