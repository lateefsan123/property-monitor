// A fixed native destination, never a caller-supplied return URL. The native
// client validates state and completes using its authenticated app session.
export function mobileIntegrationCallback(callback) {
  if (!['google', 'microsoft'].includes(callback.provider) || !/^m_[\w-]{43}$/.test(callback.state || '')) return null;
  const url = new URL('seller-signal://integrations');
  url.searchParams.set('provider', callback.provider);
  url.searchParams.set('state', callback.state);
  if (typeof callback.code === 'string' && callback.code.length <= 8192) url.searchParams.set('code', callback.code);
  if (callback.error) url.searchParams.set('error', 'access_denied');
  return url.href;
}
