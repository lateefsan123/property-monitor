export function createVoiceRequest({ getSession, url, fetchImpl = fetch }) {
  return async (body, signal) => {
    const { data, error } = await getSession();
    if (error || !data?.session?.access_token) throw new Error('Sign in to use voice.');
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal?.aborted) cancel();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 30000);
    try {
      const response = await fetchImpl(url, { method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result) throw new Error(result?.error || 'Voice is temporarily unavailable.');
      return result;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  };
}
