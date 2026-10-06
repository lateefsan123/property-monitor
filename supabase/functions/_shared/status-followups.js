// Status follow-ups: when an account turns them on, Repeat sends the message
// template assigned to a seller's custom status once that seller is due, then
// moves them to the status's next status. Anyone who has replied is never
// messaged again by this automation. Pure logic; the edge function
// (seller-signal-status-followups) does the reading and sending.
import { pickTemplateForStatusId } from "./template-status.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function token(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function time(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Statuses that can send: custom, a follow-up gap above 0 and an assigned template.
export function sendableStatuses(statusRows, templates) {
  const byId = new Map((statusRows || []).map((row) => [row.id, row]));
  return (statusRows || [])
    .filter((row) => !row.builtin_key && Number(row.follow_up_days) > 0)
    .map((row) => {
      const template = pickTemplateForStatusId(templates, `custom:${row.id}`);
      const next = row.next_status_id ? byId.get(row.next_status_id) : null;
      return template ? { ...row, template, nextLabel: next && next.id !== row.id ? next.label : null } : null;
    })
    .filter(Boolean);
}

// The last time Repeat or the broker contacted this seller: an outbound
// message (any outcome, so a failed send is never retried straight away),
// the seller's sent_at, or their imported last-contact date.
export function lastTouch(lead, outboundTimes = []) {
  const times = [time(lead.sent_at), time(lead.last_contact), ...outboundTimes.map(time)].filter((value) => value !== null);
  return times.length ? Math.max(...times) : null;
}

// Sellers due a status follow-up, never-contacted first, then the longest waiting.
export function dueFollowUps({ leads, statuses, outboundByLead = new Map(), repliedLeadIds = new Set(), repliedPhones = new Set(), now = Date.now() }) {
  const byLabel = new Map(statuses.map((status) => [token(status.label), status]));
  const due = [];
  for (const lead of leads || []) {
    const status = byLabel.get(token(lead.status));
    if (!status) continue;
    if (repliedLeadIds.has(Number(lead.id)) || (lead.phone && repliedPhones.has(String(lead.phone)))) continue;
    if (lead.next_follow_up_on && time(lead.next_follow_up_on) > now) continue;
    const touched = lastTouch(lead, outboundByLead.get(Number(lead.id)) || []);
    if (touched !== null && now - touched < Number(status.follow_up_days) * DAY_MS) continue;
    due.push({ lead, status, touched });
  }
  return due.sort((a, b) => (a.touched ?? -Infinity) - (b.touched ?? -Infinity));
}

// Fills {{name}} and {{building}}; {{transactions}} lines are dropped, since a
// status follow-up isn't a sales update. Returns null when a name is needed
// but missing, so nobody gets "Hi ,".
export function renderFollowUp(content, lead) {
  const name = String(lead.name || "").trim();
  if (String(content).includes("{{name}}") && !name) return null;
  const text = String(content || "")
    .split("\n")
    .filter((line) => !line.includes("{{transactions}}"))
    .join("\n")
    .replaceAll("{{name}}", name)
    .replaceAll("{{building}}", String(lead.building || "").trim())
    .trim();
  return text || null;
}
