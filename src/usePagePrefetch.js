import { useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pageQueries } from "./page-prefetch";
import { fetchSellerListMode, sellerListModeQueryKey } from "./features/seller-signal/seller-list-mode";
import { sellerLeadsQueryKey } from "./features/seller-signal/queryKeys";

export function usePagePrefetch(userId, currentPage) {
  const cache = useQueryClient();
  const pages = useMemo(() => pageQueries(userId), [userId]);
  const prefetch = useCallback(page => {
    if (!userId) return;
    for (const options of pages[page] || []) void cache.prefetchQuery(options);
  }, [cache, pages, userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // Let the visible page start first, then warm the remaining data with a
    // bounded queue. Navigation uses these same keys and joins in-flight reads.
    const unique = new Map([pages.settings[0], ...Object.values(pages).flat()].map(options => [JSON.stringify(options.queryKey), options]));
    let queue = [...unique.values()];
    // Accounts on the server-side seller list never preload every seller.
    const fullList = JSON.stringify(sellerLeadsQueryKey(userId));
    const skipFullList = async () => {
      const mode = await cache.fetchQuery({ queryKey: sellerListModeQueryKey(userId), queryFn: () => fetchSellerListMode(userId), staleTime: 5 * 60 * 1000 }).catch(() => "client");
      if (mode === "server") queue = queue.filter((options) => JSON.stringify(options.queryKey) !== fullList);
      return mode === "server";
    };
    async function worker() {
      while (!cancelled && queue.length) {
        await cache.prefetchQuery(queue.shift());
      }
    }
    async function warmOtherPages() {
      const server = await skipFullList();
      // Join the visible page's reads before using connections on other pages.
      await Promise.all((pages[currentPage] || []).filter(options => !server || JSON.stringify(options.queryKey) !== fullList).map(options => cache.prefetchQuery(options)));
      if (!cancelled) { void worker(); void worker(); }
    }
    const timer = window.setTimeout(() => { void warmOtherPages(); }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [cache, currentPage, pages, userId]);

  return prefetch;
}
