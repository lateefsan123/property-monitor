export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function hasActiveSubscription(subscription, now = Date.now()) {
  // This object comes from the authenticated access endpoint, never profile metadata.
  if (subscription?.source === "complimentary" && subscription.unlimited === true
    && subscription.status === "active") return true;
  if (!subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return false;
  }

  if (subscription.raw?.livemode !== true || !subscription.current_period_end) {
    return false;
  }

  const currentPeriodEnd = Date.parse(subscription.current_period_end);
  return Number.isFinite(currentPeriodEnd) && currentPeriodEnd > now;
}
