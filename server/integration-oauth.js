import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { includesScopes, EXTRA_SCOPES } from './integration-scopes.js';
import { IntegrationError } from './integration-http.js';

export const INTEGRATION_PROVIDERS = Object.freeze({
  google: { authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scopes: {
    sheets: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    calendar: ['https://www.googleapis.com/auth/calendar.events.readonly'],
    email: ['https://www.googleapis.com/auth/gmail.readonly'],
  } },
  microsoft: { authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token', scopes: {
    sheets: ['offline_access', 'Files.Read'],
    calendar: ['offline_access', 'Calendars.Read'],
    email: ['offline_access', 'Mail.Read'],
  } },
});

function providerFor(provider) {
  if (!Object.hasOwn(INTEGRATION_PROVIDERS, provider)) throw new Error('Unsupported provider');
  return INTEGRATION_PROVIDERS[provider];
}
function configuration(config) {
  if (!config?.clientId || !config?.clientSecret || !config?.redirectUri) throw new Error('Integration is not configured');
  const uri = new URL(config.redirectUri);
  if (uri.username || uri.password || uri.hash || (uri.protocol !== 'https:' && !(uri.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(uri.hostname)))) throw new Error('Invalid redirect URI');
  return config;
}
function principal(userId) {
  if (typeof userId !== 'string' || !userId.trim()) throw new Error('Authenticated user required');
}
const digest = value => createHash('sha256').update(value).digest('base64url');

// Server-only encryption. AAD prevents moving ciphertext between users/providers.
export function createTokenVault(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('A 32-byte encryption key is required');
  const aad = (userId, provider, feature) => Buffer.from(JSON.stringify([userId, provider, feature]));
  return {
    seal(value, userId, provider, feature) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(aad(userId, provider, feature));
      const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
      return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
    },
    open(value, userId, provider, feature) {
      const parts = String(value).split('.');
      if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid encrypted token');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'base64url'));
      decipher.setAAD(aad(userId, provider, feature));
      decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8'));
    },
  };
}

// store must be durable and server-only. consumePending must atomically match
// hash/user/provider/expiry and delete before returning; never use a browser store.
// Calling host must independently verify the app session on begin AND complete.
export function createIntegrationOAuth({ configs, store, vault, fetchImpl = fetch, now = Date.now }) {
  if (!store?.putPending || !store?.consumePending || !store?.saveConnection || !vault?.seal || !vault?.open) throw new Error('Persistent store and token vault are required');
  return {
    async begin({ userId, provider, feature, capability }) {
      principal(userId);
      const spec = providerFor(provider);
      if (!Object.hasOwn(spec.scopes, feature)) throw new Error('Unsupported feature');
      const config = configuration(configs[provider]);
      if (capability !== undefined && !((capability === 'send' && feature === 'email') || (capability === 'workbook' && feature === 'sheets' && provider === 'microsoft'))) throw new IntegrationError('invalid_input');
      const scopes = [...spec.scopes[feature], ...(capability ? EXTRA_SCOPES[provider][capability] : [])];
      const state = randomBytes(32).toString('base64url');
      const verifier = randomBytes(32).toString('base64url');
      const expiresAt = now() + 10 * 60 * 1000;
      await store.putPending({ hash: digest(state), userId, provider, feature, expiresAt, secret: vault.seal({ verifier, redirectUri: config.redirectUri, scopes }, userId, provider, feature) });
      const url = new URL(spec.authorize);
      const params = { client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: scopes.join(' '), state, code_challenge: digest(verifier), code_challenge_method: 'S256' };
      if (provider === 'google') Object.assign(params, { access_type: 'offline', prompt: 'consent' });
      for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
      return { authorizationUrl: url.toString(), expiresAt };
    },
    async complete({ userId, provider, state, code, error }) {
      principal(userId);
      const spec = providerFor(provider);
      const config = configuration(configs[provider]);
      if (typeof state !== 'string' || !/^[\w-]{43}$/.test(state)) throw new IntegrationError('oauth_expired');
      const pending = await store.consumePending({ hash: digest(state), userId, provider, now: now() });
      if (!pending || pending.userId !== userId || pending.provider !== provider || pending.expiresAt <= now()) throw new IntegrationError('oauth_expired');
      if (error) return { status: 'cancelled' };
      if (typeof code !== 'string' || !code || code.length > 8192) throw new Error('Authorization code is required');
      const secret = vault.open(pending.secret, userId, provider, pending.feature);
      if (secret.redirectUri !== config.redirectUri) throw new Error('Integration configuration changed; reconnect');
      const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: config.clientId, client_secret: config.clientSecret, code, code_verifier: secret.verifier, redirect_uri: secret.redirectUri });
      const response = await fetchImpl(spec.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) { await response.body?.cancel(); throw new IntegrationError('oauth_exchange'); }
      const tokens = await response.json();
      if (typeof tokens.access_token !== 'string' || !tokens.access_token || tokens.token_type?.toLowerCase() !== 'bearer') throw new Error('Invalid provider token response');
      const required = (secret.scopes || spec.scopes[pending.feature]).filter(scope => scope !== 'offline_access');
      const granted = typeof tokens.scope === 'string' ? tokens.scope.split(' ') : [];
      if (!includesScopes(provider, granted, required)) throw new IntegrationError('oauth_scope');
      const expiresIn = Number(tokens.expires_in);
      if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error('Invalid token lifetime');
      // A refresh token is needed for a persistent connection. Do not overwrite
      // an existing connection with an access-only response.
      if (typeof tokens.refresh_token !== 'string' || !tokens.refresh_token) throw new IntegrationError('oauth_offline');
      await store.saveConnection({ userId, provider, feature: pending.feature, scopes: granted, expiresAt: now() + expiresIn * 1000,
        secret: vault.seal({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }, userId, provider, pending.feature) });
      return { status: 'connected', provider, feature: pending.feature };
    },
  };
}
