import * as WebBrowser from 'expo-web-browser';
import { integrationRequest } from './integration-client';

export async function connectIntegration(provider, feature, capability) {
  const result = await integrationRequest({ action: 'begin', provider, feature, client: 'mobile', ...(capability ? { capability } : {}) });
  const authorization = new URL(result.authorizationUrl);
  const host = provider === 'google' ? 'accounts.google.com' : 'login.microsoftonline.com';
  if (authorization.protocol !== 'https:' || authorization.hostname !== host) throw new Error('Invalid connection destination.');
  const state = authorization.searchParams.get('state');
  const response = await WebBrowser.openAuthSessionAsync(authorization.href, 'seller-signal://integrations');
  if (response.type !== 'success') return { status: 'cancelled' };
  const callback = new URL(response.url);
  if (callback.protocol !== 'seller-signal:' || callback.hostname !== 'integrations' || callback.searchParams.get('provider') !== provider || callback.searchParams.get('state') !== state) throw new Error('Connection did not match. Please try again.');
  return integrationRequest({ action: 'complete', provider, state, code: callback.searchParams.get('code'), error: callback.searchParams.get('error') });
}
