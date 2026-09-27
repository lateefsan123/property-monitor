export function billingFailureState(current, userId, error) {
  return {
    ...current,
    error,
    initialized: true,
    // A failed request says nothing about entitlement. Keep only this account's
    // last verified result; hasActiveSubscription still checks its expiry.
    subscription: current.userId === userId ? current.subscription : null,
    subscriptionLoading: false,
    userId,
  };
}
