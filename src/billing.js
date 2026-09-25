import { supabase } from "./supabase";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  hasActiveSubscription,
} from "./billing-access";

export { ACTIVE_SUBSCRIPTION_STATUSES, hasActiveSubscription };
export const TRIAL_PERIOD_DAYS = 7;

export async function fetchBillingSubscription() {
  const { data, error } = await supabase.functions.invoke("get-billing-access", { body: {} });

  if (error) throw error;
  return data?.subscription ?? null;
}

export async function createBillingPortalSession({ returnUrl } = {}) {
  const { data, error } = await supabase.functions.invoke("create-billing-portal-session", {
    body: { returnUrl },
  });

  if (error) {
    const payload = await error.context?.clone?.().json().catch(() => null);
    throw new Error(payload?.error || error.message);
  }
  if (!data?.portalUrl) throw new Error("Stripe billing portal URL was not returned");
  return data;
}

export async function createCheckoutSession({ successUrl, cancelUrl, trialPeriodDays } = {}) {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { successUrl, cancelUrl, trialPeriodDays },
  });

  if (error) {
    const payload = await error.context?.clone?.().json().catch(() => null);
    throw new Error(payload?.error || error.message);
  }
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
