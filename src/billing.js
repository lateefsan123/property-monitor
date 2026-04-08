import { supabase } from "./supabase";

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function hasActiveSubscription(subscription) {
  if (!subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return false;
  }

  if (!subscription.current_period_end) {
    return true;
  }

  const currentPeriodEnd = Date.parse(subscription.current_period_end);
  return Number.isNaN(currentPeriodEnd) || currentPeriodEnd > Date.now();
}

export async function fetchBillingSubscription() {
  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("status, current_period_end, cancel_at_period_end")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCheckoutSession({ successUrl, cancelUrl }) {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { successUrl, cancelUrl },
  });

  if (error) throw error;
  if (!data?.checkoutUrl) throw new Error("Stripe checkout URL was not returned");
  return data;
}

export async function syncCheckoutSession(checkoutSessionId) {
  const { data, error } = await supabase.functions.invoke("sync-subscription-status", {
    body: { checkoutSessionId },
  });

  if (error) throw error;
  return data?.subscription ?? null;
}
