import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'node:buffer';
import { createIntegrationOAuth, createTokenVault } from './integration-oauth.js';
import { createIntegrationStore } from './integration-store.js';
import { createIntegrationTokens } from './integration-tokens.js';
import { createIntegrationReads } from './integration-reads.js';
import { createIntegrationMail } from './integration-mail.js';
import { createEmailSummaryStore } from './email-summary-store.js';
import { createSummaryReader } from './email-summary-reader.js';
import { createEmailSummaryService } from './email-summary.js';

export function createIntegrationRuntime(env) {
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
  const tokens = vault ? createIntegrationTokens({ configs, store, vault }) : null;
  return {
    store, configured,
    oauth: vault ? createIntegrationOAuth({ configs, store, vault }) : null,
    read: tokens ? createIntegrationReads({ tokens }) : null,
    mail: tokens ? createIntegrationMail({ tokens, store, vault }) : null,
    summaries: tokens ? createEmailSummaryService({ store: createEmailSummaryStore(db), reader: createSummaryReader({ tokens }), apiKey: env.REPEAT_VOICE_OPENAI_API_KEY }) : null,
    authenticate: async token => {
      const { data, error } = await db.auth.getUser(token);
      return error ? null : data.user;
    },
  };
}
