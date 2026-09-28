// Abort stalled auth requests so Supabase can retry without deleting the session.
// Leave uploads and long-running application requests on their existing policy.
export function createAuthFetch(fetcher = fetch, timeoutMs = 12000) {
  return async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url || String(input);
    if (!new URL(url).pathname.startsWith('/auth/v1/')) return fetcher(input, options);
    const controller = new AbortController();
    const originalSignal = options.signal || input?.signal;
    const abort = () => controller.abort(originalSignal?.reason);
    if (originalSignal?.aborted) abort();
    else originalSignal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetcher(input, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      originalSignal?.removeEventListener('abort', abort);
    }
  };
}
