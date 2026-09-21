import { createClient } from '@supabase/supabase-js';
import { createIntegrationOAuth, createTokenVault } from '../../server/integration-oauth.js';
import { createIntegrationStore } from '../../server/integration-store.js';
import { createIntegrationHandler } from '../../server/integration-api.js';
import { createIntegrationTokens } from '../../server/integration-tokens.js';
import { createIntegrationReads } from '../../server/integration-reads.js';

let handler;
export default async function integrations(req, res) {
  try {
    if (!handler) {
      const env = process.env;
      const db = createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } });
      const store = createIntegrationStore(db);
      const key = Buffer.from(env.INTEGRATION_ENCRYPTION_KEY || '', 'base64');
      const configs = Object.fromEntries(['google', 'microsoft'].map(provider => {
        const prefix = provider.toUpperCase();
        return [provider, { clientId: env[`${prefix}_INTEGRATION_CLIENT_ID`], clientSecret: env[`${prefix}_INTEGRATION_CLIENT_SECRET`],
          redirectUri: env[`${prefix}_INTEGRATION_REDIRECT_URI`] }];
      }));
      const configured = provider => key.length === 32 && Object.values(configs[provider]).every(Boolean);
      const vault = key.length === 32 ? createTokenVault(key) : null;
      const oauth = vault ? createIntegrationOAuth({ configs, store, vault }) : null;
      const tokens = vault ? createIntegrationTokens({ configs, store, vault }) : null;
      const read = tokens ? createIntegrationReads({ tokens }) : null;
      handler = createIntegrationHandler({ store, oauth, configured, read, authenticate: async token => {
        const { data, error } = await db.auth.getUser(token);
        return error ? null : data.user;
      } });
    }
    return await handler(req, res);
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Connections are not configured yet' }));
  }
}
