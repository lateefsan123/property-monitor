import { supabase } from "../../supabase";
import { sanitizeChangeItem } from "../listing-alerts/change-detection";

const SENT_STATUSES = new Set(["sent", "delivered", "read"]);

export function startOfLocalDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function fetchWhatsAppMessageActivity(userId, days = 14) {
  if (!userId) return [];

  const since = startOfLocalDay();
  since.setDate(since.getDate() - (days - 1));

  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("status, queued_at, sent_at")
    .eq("user_id", userId)
    .eq("direction", "outbound")
    .gte("queued_at", since.toISOString())
    .order("queued_at", { ascending: true })
    .limit(5000);

  if (error) throw new Error(error.message);
  return data || [];
}

export function buildDailyMessageSeries(messageRows, days = 14) {
  const buckets = new Map();
  const series = [];
  const start = startOfLocalDay();
  start.setDate(start.getDate() - (days - 1));

  for (let index = 0; index < days; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = day.toDateString();
    const point = {
      key,
      label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      fullLabel: day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
      count: 0,
    };
    buckets.set(key, point);
    series.push(point);
  }

  for (const row of messageRows || []) {
    if (!SENT_STATUSES.has(row?.status)) continue;
    const sentAt = new Date(row.sent_at || row.queued_at);
    if (Number.isNaN(sentAt.getTime())) continue;
    const point = buckets.get(startOfLocalDay(sentAt).toDateString());
    if (point) point.count += 1;
  }

  return series;
}

export async function fetchListingPriceDrops(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("listing_alerts_state")
    .select("change_items")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const items = Array.isArray(data?.change_items) ? data.change_items : [];
  return items
    .map(sanitizeChangeItem)
    .filter((item) => item?.type === "price_drop")
    .sort((left, right) => {
      const leftTime = left.verifiedAt ? new Date(left.verifiedAt).getTime() : 0;
      const rightTime = right.verifiedAt ? new Date(right.verifiedAt).getTime() : 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
      return Math.abs(right.priceDelta || 0) - Math.abs(left.priceDelta || 0);
    });
}
