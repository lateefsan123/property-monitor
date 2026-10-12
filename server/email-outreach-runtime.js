import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'node:buffer';
import { createTokenVault } from './integration-oauth.js';
import { createIntegrationStore } from './integration-store.js';
import { createIntegrationTokens } from './integration-tokens.js';
import { createOutreachStore } from './email-outreach-store.js';
import { createOutreachGmail } from './email-outreach-gmail.js';
import { createOutreachService } from './email-outreach-service.js';

export function createOutreachRuntime(env) {
  const db=createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const store=createOutreachStore(db);
  const vault=createTokenVault(Buffer.from(env.INTEGRATION_ENCRYPTION_KEY || '','base64'));
  const tokens=createIntegrationTokens({store:createIntegrationStore(db),vault,configs:{google:{clientId:env.GOOGLE_INTEGRATION_CLIENT_ID,clientSecret:env.GOOGLE_INTEGRATION_CLIENT_SECRET}}});
  const gmail=createOutreachGmail({tokens});
  return {store,service:createOutreachService({store,gmail}),authenticate:async token=>{
    const {data,error}=await db.auth.getUser(token);return error ? null : data.user;
  }};
}
