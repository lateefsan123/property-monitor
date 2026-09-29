import { readSupabaseConfig } from "./config.js";

// The app's authenticated endpoint owns Stripe, mobile and complimentary access.
export async function hasBillingAccess(authInfo, options = {}) {
  if (!authInfo?.token || !authInfo?.extra?.userId) return false;
  const { url, publishableKey } = options.config ?? readSupabaseConfig();
  if (!url || !publishableKey) throw new Error("Billing access is not configured");
  const endpoint = new URL("/functions/v1/get-billing-access", url);
  if (endpoint.protocol !== "https:") throw new Error("Billing access requires HTTPS");
  const response = await (options.fetcher ?? fetch)(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${authInfo.token}`, apikey: publishableKey },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error("Could not verify subscription access");
  const { subscription } = await response.json();
  return Boolean(subscription
    && ["stripe", "app_store", "play_store", "complimentary"].includes(subscription.source)
    && ["active", "trialing"].includes(subscription.status)
    && subscription.raw?.livemode === true
    && Date.parse(subscription.current_period_end) > (options.now ?? Date.now()));
}
