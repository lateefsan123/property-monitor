import { supabase } from "../../supabase";
import { sanitizeChangeItem, sanitizeListingHistoryEntry } from "../listing-alerts/change-detection";

const SENT_STATUSES = new Set(["sent", "delivered", "read"]);
const PRICE_DROP_WINDOW_DAYS = 14;

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

function toEventTime(event) {
  const time = new Date(event?.at || event?.verifiedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

// Rolling window built from the per-listing history event log, so drops stay
// visible for two weeks instead of only until the next sync overwrites the
// change list. Multiple drops on one listing collapse to the cumulative delta.
export async function fetchListingPriceDrops(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("listing_alerts_state")
    .select("change_items, listing_history")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const cutoff = Date.now() - PRICE_DROP_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const drops = [];
  const seen = new Set();

  const historyEntries = data?.listing_history && typeof data.listing_history === "object"
    ? Object.entries(data.listing_history)
    : [];
  for (const [key, rawEntry] of historyEntries) {
    const entry = sanitizeListingHistoryEntry({ ...rawEntry, key });
    if (!entry || entry.currentStatus === "removed") continue;

    const windowDrops = (entry.priceHistory || [])
      .filter((event) => event?.type === "price_drop" && toEventTime(event) >= cutoff)
      .sort((left, right) => toEventTime(left) - toEventTime(right));
    if (!windowDrops.length) continue;

    const first = windowDrops[0];
    const latest = windowDrops[windowDrops.length - 1];
    const price = latest.price ?? entry.currentPrice;
    const previousPrice = first.previousPrice ?? null;
    const priceDelta = Number.isFinite(price) && Number.isFinite(previousPrice)
      ? price - previousPrice
      : latest.priceDelta;

    const item = sanitizeChangeItem({
      type: "price_drop",
      id: entry.id,
      locationId: entry.locationId,
      buildingName: entry.buildingName,
      title: entry.title,
      price,
      previousPrice,
      priceDelta,
      verifiedAt: latest.at || latest.verifiedAt,
      bayutUrl: entry.bayutUrl,
      coverPhoto: entry.coverPhoto,
      beds: entry.beds,
      baths: entry.baths,
      areaSqft: entry.areaSqft,
      cluster: entry.cluster,
      community: entry.community,
    });
    if (!item || !Number.isFinite(item.priceDelta) || item.priceDelta >= 0) continue;
    drops.push(item);
    seen.add(`${item.locationId}:${item.id}`);
  }

  // Fall back to the current change set for state rows written before the
  // listing history existed.
  const changeItems = Array.isArray(data?.change_items) ? data.change_items : [];
  for (const raw of changeItems) {
    const item = sanitizeChangeItem(raw);
    if (item?.type !== "price_drop") continue;
    const dedupeKey = `${item.locationId}:${item.id}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    drops.push(item);
  }

  return drops.sort((left, right) => {
    const leftTime = left.verifiedAt ? new Date(left.verifiedAt).getTime() : 0;
    const rightTime = right.verifiedAt ? new Date(right.verifiedAt).getTime() : 0;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return Math.abs(right.priceDelta || 0) - Math.abs(left.priceDelta || 0);
  });
}
