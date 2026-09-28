// Retry only authentication failures: retrying checkout on a server/network
// failure could create a second Stripe session after an ambiguous response.
export function createBillingRequest(client, timeoutMs = 20000) {
  let refreshPromise;
  return async function request(name, body = {}) {
    const invoke = async (token) => {
      const controller = new AbortController();
      let timer;
      try {
        // Bound the whole operation, including the SDK's session lookup before
        // fetch starts. Aborting fetch alone does not bound an auth lock wait.
        return await Promise.race([
          client.functions.invoke(name, {
            body,
            signal: controller.signal,
            ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
          }),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error("We couldn’t connect to billing. Please try again in a moment."));
              controller.abort();
            }, timeoutMs);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    };
    let result = await invoke();
    if (result.error?.context?.status === 401) {
      refreshPromise ??= client.auth.refreshSession().finally(() => { refreshPromise = null; });
      const refreshed = await refreshPromise;
      if (refreshed.error || !refreshed.data?.session) {
        throw new Error("We couldn’t refresh your session. Please try again or sign in again.");
      }
      result = await invoke(refreshed.data.session.access_token);
    }
    if (result.error) {
      throw new Error("We couldn’t connect to billing. Please try again in a moment.");
    }
    return result.data;
  };
}
