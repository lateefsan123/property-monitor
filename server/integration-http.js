const MESSAGES = {
  invalid_input: ['Invalid integration request', 400],
  reconnect: ['Please reconnect this account in Settings', 409],
  changed: ['This connection changed. Please try again', 409],
  unavailable: ['The provider is unavailable. Please try again later', 503],
};
export class IntegrationError extends Error {
  constructor(code) {
    const [message, status] = MESSAGES[code] || MESSAGES.unavailable;
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Fixed provider endpoints only. Never forward redirects, response headers or errors.
export async function providerJson(fetchImpl, url, options = {}, tokenExchange = false) {
  let response;
  try {
    response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
  } catch { throw new IntegrationError('unavailable'); }
  if (!response.ok) {
    await response.body?.cancel();
    throw new IntegrationError([401, 403].includes(response.status) || (tokenExchange && response.status === 400) ? 'reconnect' : 'unavailable');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new IntegrationError('unavailable');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new IntegrationError('unavailable'); }
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { throw new IntegrationError('unavailable'); }
  finally { reader.releaseLock(); }
}
