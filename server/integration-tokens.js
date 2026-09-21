import { INTEGRATION_PROVIDERS } from './integration-oauth.js';
import { IntegrationError, providerJson } from './integration-http.js';
import { includesScopes } from './integration-scopes.js';

export function hasIntegrationScopes(provider, feature, scopes) {
  const required = INTEGRATION_PROVIDERS[provider]?.scopes[feature];
  return includesScopes(provider, scopes, required);
}

export function createIntegrationTokens({ store, vault, configs, fetchImpl = fetch, now = Date.now }) {
  const refreshing = new Map();
  const valid = row => row && row.expiresAt > now() + 60000;
  function open(row, identity) {
    if (!row || row.userId !== identity.userId || row.provider !== identity.provider || row.feature !== identity.feature
      || !hasIntegrationScopes(identity.provider, identity.feature, row.scopes)) throw new IntegrationError('reconnect');
    try {
      const token = vault.open(row.secret, identity.userId, identity.provider, identity.feature);
      if (!token.accessToken || !token.refreshToken) throw new Error();
      return token;
    } catch { throw new IntegrationError('reconnect'); }
  }
  async function resolve(identity) {
    const row = await store.getConnection(identity);
    const old = open(row, identity);
    if (valid(row)) return old.accessToken;
    const config = configs[identity.provider];
    if (!config?.clientId || !config?.clientSecret) throw new IntegrationError('unavailable');
    const body = new URLSearchParams({ grant_type: 'refresh_token', client_id: config.clientId,
      client_secret: config.clientSecret, refresh_token: old.refreshToken });
    let result;
    try {
      result = await providerJson(fetchImpl, INTEGRATION_PROVIDERS[identity.provider].token, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
      }, true);
    } catch (error) {
      // Another instance may already have rotated the token; never overwrite it.
      const current = await store.getConnection(identity);
      if (valid(current) && current.secret !== row.secret) return open(current, identity).accessToken;
      throw error;
    }
    const scopes = result.scope === undefined ? row.scopes : String(result.scope).split(/\s+/);
    if (!hasIntegrationScopes(identity.provider, identity.feature, scopes)
      || typeof result.access_token !== 'string' || !result.access_token
      || result.token_type?.toLowerCase() !== 'bearer'
      || !Number.isFinite(Number(result.expires_in)) || Number(result.expires_in) <= 60
      || (result.refresh_token !== undefined && (typeof result.refresh_token !== 'string' || !result.refresh_token))) throw new IntegrationError('reconnect');
    const secret = vault.seal({ accessToken: result.access_token, refreshToken: result.refresh_token || old.refreshToken }, identity.userId, identity.provider, identity.feature);
    const saved = await store.rotateConnection({ ...identity, previousSecret: row.secret, secret, scopes, expiresAt: now() + Number(result.expires_in) * 1000 });
    if (saved) return result.access_token;
    const current = await store.getConnection(identity);
    if (!valid(current)) throw new IntegrationError('changed');
    return open(current, identity).accessToken;
  }
  return {
    async accessToken(identity) {
      if (!identity.userId || !Object.hasOwn(INTEGRATION_PROVIDERS, identity.provider)
        || !Object.hasOwn(INTEGRATION_PROVIDERS[identity.provider].scopes, identity.feature)) throw new IntegrationError('invalid_input');
      const key = JSON.stringify([identity.userId, identity.provider, identity.feature]);
      if (!refreshing.has(key)) refreshing.set(key, resolve(identity).finally(() => refreshing.delete(key)));
      return refreshing.get(key);
    },
  };
}
