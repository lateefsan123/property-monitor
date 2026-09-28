import { supabase } from './supabase';

export async function integrationRequest(body, signal, expectedUserId) {
  const { data, error } = supabase ? await supabase.auth.getSession() : { error: true };
  if (error || !data?.session?.access_token) throw new Error('Please sign in again to manage connections.');
  if (expectedUserId && data.session.user.id !== expectedUserId) throw new Error('Your account changed. Please reopen connections.');
  const response = await fetch('/api/integrations', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error || 'Connections are unavailable. Please try again.');
  return result;
}

// Starts a Google or Microsoft connection by redirecting to the provider's own
// sign-in page, and refuses any other destination the server might return.
export async function beginIntegrationConnect(request, provider, feature, capability) {
  const result = await request({ action: 'begin', provider, feature, ...(capability ? { capability } : {}) });
  const url = new URL(result.authorizationUrl);
  const host = provider === 'google' ? 'accounts.google.com' : 'login.microsoftonline.com';
  if (url.protocol !== 'https:' || url.hostname !== host) throw new Error('Invalid connection destination.');
  window.location.assign(url.href);
}
