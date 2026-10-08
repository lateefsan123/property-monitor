// Shared by desktop and native: who was messaged (Home activity feed) and the
// WhatsApp thread with one seller. The authenticated client is supplied by each
// app; RLS limits whatsapp_messages and leads to the signed-in user.

const FEED_DAYS = 7;
const PAGE_SIZE = 30;
const THREAD_PAGE_SIZE = 20;
const FEED_STATUSES = ["sent", "delivered", "read", "failed", "received"];
const MESSAGE_COLUMNS = "id, lead_id, direction, recipient_phone, send_source, status, body, template_name, error_message, queued_at, sent_at, created_at";

// Same rule as formatPhoneForWhatsApp: digits only, "00" dropped, "9710" becomes 971,
// and a local leading 0 becomes 971.
// Stored recipient_phone values are digits only, so this is what they match.
export function normalizeSellerPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("9710")) digits = `971${digits.slice(4)}`;
  if (!digits) return null;
  return digits.startsWith("0") ? `971${digits.slice(1)}` : digits;
}

// "5 Oct · 10:35" (with the year when it isn't this year): the date and time a message was sent.
export function formatMessageWhen(value, now = new Date()) {
  if (!value) return "";
  const date = new Date(value);
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const options = date.getFullYear() === now.getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" };
  return `${date.toLocaleDateString("en-GB", options)} · ${time}`;
}

export function messageTime(message) {
  return message.sent_at || message.queued_at || message.created_at || null;
}

export function messageText(message) {
  const body = String(message.body || "").trim();
  if (body) return body;
  return message.template_name ? `Template: ${message.template_name}` : "Message";
}

const SOURCE_LABELS = { auto: "Automated", bulk: "Bulk", manual: "Manual", mcp: "Integration" };
export function messageSourceLabel(message) {
  if (message.direction === "inbound") return "Replied";
  return SOURCE_LABELS[message.send_source] || "Sent";
}

const STATUS_LABELS = { queued: "Sending", sending: "Sending", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed", received: "Received" };
export function messageStatusLabel(message) {
  return STATUS_LABELS[message.status] || "";
}

// One row per person: each seller's newest message. Feeds are newest first,
// so the first row seen for a seller is the one kept.
export function latestPerSeller(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = String(item.lead_id ?? item.recipient_phone ?? item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Groups feed items into Today / Yesterday / weekday sections, newest first.
export function groupFeedByDay(items, now = new Date()) {
  const dayKey = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };
  const today = dayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayKey(yesterdayDate);
  // Merged by day, so a send that finishes just after midnight can't split a day in two.
  const groups = [];
  const byKey = new Map();
  for (const item of items) {
    const time = messageTime(item);
    if (!time) continue;
    const key = dayKey(time);
    let group = byKey.get(key);
    if (!group) {
      // "Today · Monday 5 Oct", "Yesterday · Sunday 4 Oct", "Friday 2 Oct".
      const date = new Date(time);
      const fullDate = date.toLocaleDateString("en-GB", date.getFullYear() === now.getFullYear()
        ? { weekday: "long", day: "numeric", month: "short" } : { weekday: "long", day: "numeric", month: "short", year: "numeric" });
      const title = key === today ? `Today · ${fullDate}` : key === yesterday ? `Yesterday · ${fullDate}` : fullDate;
      group = { key, title, items: [] };
      groups.push(group);
      byKey.set(key, group);
    }
    group.items.push(item);
  }
  return groups;
}

// Keyset cursor for newest-first pages ordered by created_at desc, id asc.
// Values are quoted because timestamps contain ":" "." and "+".
function beforeCursor(cursor) {
  return `created_at.lt."${cursor.created_at}",and(created_at.eq."${cursor.created_at}",id.gt.${cursor.id})`;
}

function pageOf(rows, pageSize) {
  const items = rows.slice(0, pageSize);
  const last = items[items.length - 1];
  return { items, nextCursor: rows.length > pageSize && last ? { created_at: last.created_at, id: last.id } : null };
}

export function createWhatsAppMessageServices(supabase) {
  // Attaches the seller to each row. Replies saved before they were linked to a
  // seller are matched through the latest message sent to the same number.
  async function attachLeads(userId, rows) {
    const unlinked = [...new Set(rows.filter((row) => !row.lead_id && row.recipient_phone).map((row) => row.recipient_phone))];
    const leadByPhone = new Map();
    if (unlinked.length) {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("lead_id, recipient_phone, created_at")
        .eq("user_id", userId)
        .eq("direction", "outbound")
        .in("recipient_phone", unlinked)
        .not("lead_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(unlinked.length * 5);
      if (error) throw new Error(error.message);
      for (const row of data || []) if (!leadByPhone.has(row.recipient_phone)) leadByPhone.set(row.recipient_phone, row.lead_id);
    }
    const withLead = rows.map((row) => ({ ...row, lead_id: row.lead_id || leadByPhone.get(row.recipient_phone) || null }));

    const leadIds = [...new Set(withLead.map((row) => row.lead_id).filter(Boolean))];
    const leads = new Map();
    if (leadIds.length) {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, building, unit, phone")
        .eq("user_id", userId)
        .in("id", leadIds);
      if (error) throw new Error(error.message);
      for (const lead of data || []) leads.set(String(lead.id), lead);
    }
    return withLead.map((row) => ({ ...row, lead: row.lead_id ? leads.get(String(row.lead_id)) || null : null }));
  }

  // One page of sends and replies, newest first. direction: "outbound" | "inbound" | undefined.
  // Only messages linked to one of your sellers; numbers that aren't sellers never appear.
  async function fetchMessagePage(userId, { days = FEED_DAYS, direction, cursor, pageSize = PAGE_SIZE, now = new Date() } = {}) {
    if (!userId) return { items: [], nextCursor: null };
    const since = new Date(now);
    since.setDate(since.getDate() - days);
    let query = supabase
      .from("whatsapp_messages")
      .select(MESSAGE_COLUMNS)
      .eq("user_id", userId)
      .not("lead_id", "is", null)
      .in("status", FEED_STATUSES)
      .gte("created_at", since.toISOString());
    if (direction) query = query.eq("direction", direction);
    if (cursor) query = query.or(beforeCursor(cursor));
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(pageSize + 1);
    if (error) throw new Error(error.message);
    const page = pageOf(data || [], pageSize);
    return { ...page, items: (await attachLeads(userId, page.items)).filter((item) => item.lead) };
  }

  // Home's preview: the newest message from each of the last few people.
  async function fetchRecentPeople(userId, { days = FEED_DAYS, count = 4 } = {}) {
    const page = await fetchMessagePage(userId, { days, pageSize: 40 });
    const people = latestPerSeller(page.items);
    return { items: people.slice(0, count), hasMore: people.length > count || Boolean(page.nextCursor) };
  }

  // One page of the thread with a seller, newest first; callers show it oldest first.
  async function fetchSellerThreadPage(userId, lead, { cursor, pageSize = THREAD_PAGE_SIZE } = {}) {
    if (!userId || !lead?.id) return { items: [], nextCursor: null };
    const leadId = Number(lead.id);
    const phone = normalizeSellerPhone(lead.phone);
    // By number only for rows not linked to a seller (e.g. older replies), so owners
    // with several units don't see each other's messages.
    const filters = [Number.isFinite(leadId) ? `lead_id.eq.${leadId}` : null, phone ? `and(recipient_phone.eq.${phone},lead_id.is.null)` : null].filter(Boolean);
    if (!filters.length) return { items: [], nextCursor: null };
    // One or() filter: (this seller's id or number) and, for older pages, before the cursor.
    const seller = filters.join(",");
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select(MESSAGE_COLUMNS)
      .eq("user_id", userId)
      .or(cursor ? `and(or(${seller}),or(${beforeCursor(cursor)}))` : seller)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(pageSize + 1);
    if (error) throw new Error(error.message);
    return pageOf(data || [], pageSize);
  }

  return { fetchMessagePage, fetchRecentPeople, fetchSellerThreadPage };
}
