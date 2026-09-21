import { useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pageQueries } from "./page-prefetch";

export function usePagePrefetch(userId) {
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
    const queue = [...unique.values()];
    async function worker() {
      while (!cancelled && queue.length) {
        await cache.prefetchQuery(queue.shift());
      }
    }
    const timer = window.setTimeout(() => { void worker(); void worker(); }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [cache, pages, userId]);

  return prefetch;
}
