import { hasActiveSubscription } from '../../src/billing-access.js';

export function resolveSubscriptionAccess({ userId, store, sharedSubscription, sharedLoading, sharedError }) {
  const storeBelongsToUser = Boolean(userId && store.userId === userId);
  const storeIsPro = storeBelongsToUser && store.isPro;
  const sharedIsActive = Boolean(userId && hasActiveSubscription(sharedSubscription));
  const hasAccess = Boolean(storeIsPro || sharedIsActive);
  return {
    storeBelongsToUser, storeIsPro, sharedIsActive, hasAccess,
    isLoading: Boolean(userId) && !hasAccess && (!storeBelongsToUser || store.loading || sharedLoading),
    verificationError: !hasAccess && (sharedError || (storeBelongsToUser && store.error))
      ? 'Could not verify your access. Check your connection and try again.' : null,
  };
}
