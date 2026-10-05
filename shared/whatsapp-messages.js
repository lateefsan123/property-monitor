// Shared by desktop and native: who was messaged (Home activity feed) and the
// WhatsApp thread with one seller. The authenticated client is supplied by each
// app; RLS limits whatsapp_messages and leads to the signed-in user.

const FEED_DAYS = 7;
const FEED_LIMIT = 500;
const THREAD_LIMIT = 200;
const PAGE_SIZE = 1000;
const FEED_STATUSES = ["sent", "delivered", "read", "failed", "received"];
const MESSAGE_COLUMNS = "id, lead_id, direction, recipient_phone, send_source, status, body, template_name, error_message, queued_at, sent_at, created_at";

// Same rule as formatPhoneForWhatsApp: digits only, a local leading 0 becomes 971.
// Stored recipient_phone values are digits only, so this is what they match.
export function normalizeSellerPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits) return null;
  return digits.startsWith("0") ? `971${digits.slice(1)}` : digits;
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
  const groups = [];
  for (const item of items) {
    const time = messageTime(item);
    if (!time) continue;
    const key = dayKey(time);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const title = key === today ? "Today" : key === yesterday ? "Yesterday"
        : new Date(time).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
      group = { key, title, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export function createWhatsAppMessageServices(supabase) {
  // Latest sends and replies with the seller each one belongs to.
  async function fetchMessageFeed(userId, { days = FEED_DAYS, limit = FEED_LIMIT, now = new Date() } = {}) {
    if (!userId) return [];
    const since = new Date(now);
    since.setDate(since.getDate() - days);

    // Supabase returns at most 1,000 rows per request, so page up to the limit.
    const rows = [];
    for (let offset = 0; offset < limit; offset += PAGE_SIZE) {
      const end = Math.min(offset + PAGE_SIZE, limit) - 1;
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select(MESSAGE_COLUMNS)
        .eq("user_id", userId)
        .in("status", FEED_STATUSES)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, end);
      if (error) throw new Error(error.message);
      rows.push(...(data || []));
      if (!data || data.length < end - offset + 1) break;
    }

    // Replies saved before they were linked to a seller still match by number.
    const leadByPhone = new Map();
    for (const row of rows) {
      if (row.direction === "outbound" && row.lead_id && row.recipient_phone && !leadByPhone.has(row.recipient_phone)) {
        leadByPhone.set(row.recipient_phone, row.lead_id);
      }
    }
    const withLead = rows.map((row) => ({ ...row, lead_id: row.lead_id || leadByPhone.get(row.recipient_phone) || null }));

    const leadIds = [...new Set(withLead.map((row) => row.lead_id).filter(Boolean))];
    const leads = new Map();
    if (leadIds.length) {
      const { data, error: leadError } = await supabase
        .from("leads")
        .select("id, name, building, unit, phone")
        .eq("user_id", userId)
        .in("id", leadIds);
      if (leadError) throw new Error(leadError.message);
      for (const lead of data || []) leads.set(String(lead.id), lead);
    }

    return withLead.map((row) => ({ ...row, lead: row.lead_id ? leads.get(String(row.lead_id)) || null : null }));
  }

  // Every message to or from one seller, oldest first (the latest THREAD_LIMIT).
  async function fetchSellerThread(userId, lead) {
    if (!userId || !lead?.id) return [];
    const leadId = Number(lead.id);
    const phone = normalizeSellerPhone(lead.phone);
    const filters = [Number.isFinite(leadId) ? `lead_id.eq.${leadId}` : null, phone ? `recipient_phone.eq.${phone}` : null].filter(Boolean);
    if (!filters.length) return [];

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select(MESSAGE_COLUMNS)
      .eq("user_id", userId)
      .or(filters.join(","))
      .order("created_at", { ascending: false })
      .limit(THREAD_LIMIT);
    if (error) throw new Error(error.message);
    return (data || []).slice().reverse();
  }

  return { fetchMessageFeed, fetchSellerThread };
}
