const VERSION_URL = 'https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json';

export function createVersionResolver({ fallback, fetchImpl = fetch, now = Date.now, timeoutMs = 5000, logger }) {
  let cached = fallback;
  let expiresAt = 0;
  let pending;
  return async function resolveVersion() {
    if (now() < expiresAt) return cached;
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await fetchImpl(VERSION_URL, { signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok) throw new Error(`Version lookup returned ${response.status}`);
        const { version } = await response.json();
        if (!Array.isArray(version) || version.length !== 3 || !version.every(Number.isSafeInteger)) {
          throw new Error('Invalid WhatsApp Web version');
        }
        cached = version;
        expiresAt = now() + 60 * 60 * 1000;
      } catch (error) {
        logger?.warn({ error }, 'Using cached WhatsApp Web version');
        expiresAt = now() + 60 * 1000;
      }
      return cached;
    })();
    try { return await pending; } finally { pending = null; }
  };
}
