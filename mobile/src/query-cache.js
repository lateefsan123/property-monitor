export const mobileQueryDefaults = {
  staleTime: 60_000,
  gcTime: 30 * 60_000,
  retry: 1,
  refetchOnWindowFocus: true,
};

// Token refreshes keep the cache; sign-out/account changes discard private data.
export function createAccountCacheGuard(client) {
  let accountId = null;
  return nextAccountId => {
    const next = nextAccountId || null;
    if (accountId !== next) client.clear();
    accountId = next;
  };
}
