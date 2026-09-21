// Deliberately server-only. Never return secret columns to the browser.
function checked({ data, error }) {
  if (error) throw new Error('Connection storage is unavailable');
  return data;
}
const fromRow = row => row && ({ userId: row.user_id, provider: row.provider, feature: row.feature,
  expiresAt: Number(row.expires_at), secret: row.secret, scopes: row.scopes });
export function createIntegrationStore(db) {
  return {
    async putPending(value) {
      // Bounded retention without a background job; only this user's stale states.
      checked(await db.from('integration_oauth_pending').delete().eq('user_id', value.userId).lt('expires_at', Date.now()));
      checked(await db.from('integration_oauth_pending').insert({ hash: value.hash, user_id: value.userId,
        provider: value.provider, feature: value.feature, expires_at: value.expiresAt, secret: value.secret }));
    },
    async consumePending({ hash, userId, provider, now }) {
      const rows = checked(await db.rpc('consume_integration_oauth', { p_hash: hash, p_user: userId, p_provider: provider, p_now: now }));
      return fromRow(rows?.[0]);
    },
    async saveConnection(value) {
      checked(await db.from('integration_connections').upsert({ user_id: value.userId, provider: value.provider,
        feature: value.feature, scopes: value.scopes, expires_at: value.expiresAt, secret: value.secret }, { onConflict: 'user_id,provider,feature' }));
    },
    async list(userId) {
      return checked(await db.from('integration_connections').select('provider,feature,expires_at').eq('user_id', userId)) || [];
    },
    async disconnect({ userId, provider, feature }) {
      checked(await db.from('integration_oauth_pending').delete().eq('user_id', userId).eq('provider', provider).eq('feature', feature));
      checked(await db.from('integration_connections').delete().eq('user_id', userId).eq('provider', provider).eq('feature', feature));
    },
  };
}
