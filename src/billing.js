import { supabase } from "./supabase";
import { createBillingRequest } from "./billing-request.js";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  hasActiveSubscription,
} from "./billing-access";

export { ACTIVE_SUBSCRIPTION_STATUSES, hasActiveSubscription };
export const TRIAL_PERIOD_DAYS = 7;
const requestBilling = createBillingRequest(supabase);

export async function fetchBillingSubscription() {
  const data = await requestBilling("get-billing-access");
  return data?.subscription ?? null;
}

export async function createBillingPortalSession({ returnUrl } = {}) {
  const data = await requestBilling("create-billing-portal-session", { returnUrl });
  if (!data?.portalUrl) throw new Error("Stripe billing portal URL was not returned");
  return data;
}

export async function createCheckoutSession({ successUrl, cancelUrl, trialPeriodDays } = {}) {
  const data = await requestBilling("create-checkout-session", { successUrl, cancelUrl, trialPeriodDays });
  if (!data?.checkoutUrl) throw new Error("Stripe checkout URL was not returned");
  return data;
}

export async function syncCheckoutSession(checkoutSessionId) {
  const data = await requestBilling("sync-subscription-status", { checkoutSessionId });
  return data?.subscription ?? null;
}
