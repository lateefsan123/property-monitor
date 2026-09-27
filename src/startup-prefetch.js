// Only warm the signed-in home route. This does not change the billing gate;
// every query remains scoped to the authenticated account and enforced by RLS.
export function prefetchHomeOnStartup(cache, userId, location, queries) {
  if (!userId || location.pathname !== "/") return Promise.resolve();
  if (!["", "#", "#/", "#home", "#/home"].includes(location.hash)) return Promise.resolve();
  return Promise.all(queries.map(options => cache.prefetchQuery(options)));
}
