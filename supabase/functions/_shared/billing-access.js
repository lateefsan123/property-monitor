export const ENTITLEMENT_ID = "seller_signal_pro";

export function stripeAccess(row, now = Date.now()) {
  if (!row || row.raw?.livemode !== true
    || !["active", "trialing"].includes(row.status)
    || !(Date.parse(row.current_period_end) > now)) return null;
  const price = row.raw?.items?.data?.[0]?.price;
  return {
    source: "stripe", status: row.status,
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    canceled_at: row.canceled_at,
    amount: typeof price?.unit_amount === "number" ? price.unit_amount : null,
    currency: price?.currency || null,
    raw: { livemode: true },
  };
}

export function revenueCatAccess(payload, now = Date.now()) {
  const subscriber = payload?.subscriber;
  const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID];
  const subscription = subscriber?.subscriptions?.[entitlement?.product_identifier];
  // Do not turn Test Store, sandbox, promotional or missing receipts into paid web access.
  if (!entitlement || !subscription || subscription.is_sandbox !== false
    || !["app_store", "play_store"].includes(subscription.store)
    || subscription.refunded_at) return null;
  const expiry = Math.max(
    Date.parse(entitlement.expires_date) || 0,
    Date.parse(entitlement.grace_period_expires_date) || 0,
  );
  if (!(expiry > now)) return null;
  return {
    source: subscription.store,
    status: subscription.period_type === "trial" ? "trialing" : "active",
    current_period_start: entitlement.purchase_date || null,
    current_period_end: new Date(expiry).toISOString(),
    cancel_at_period_end: Boolean(subscription.unsubscribe_detected_at),
    canceled_at: subscription.unsubscribe_detected_at || null,
    management_url: subscription.store === "app_store"
      ? "https://apps.apple.com/account/subscriptions"
      : "https://play.google.com/store/account/subscriptions",
    raw: { livemode: true },
  };
}

export async function getRevenueCatCustomer(userId, apiKey, fetcher = fetch) {
  if (!apiKey) throw new Error("RevenueCat access check is not configured");
  const response = await fetcher(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("Could not verify mobile subscription status");
  const payload = await response.json();
  if (!payload?.subscriber) throw new Error("Invalid subscription status response");
  return payload;
}
