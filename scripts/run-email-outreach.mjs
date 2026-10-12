import process from 'node:process';
import { loadEnv } from 'vite';
import { createOutreachRuntime } from '../server/email-outreach-runtime.js';

// Operator-owned server process; no automatic scheduling or activation on install.
// By default this ONLY checks status. --send requires the campaign's saved active state.
const env={...loadEnv('production',process.cwd(),''),...process.env};
const runtime=createOutreachRuntime(env);
const users=await runtime.store.due();
for (const {user_id} of users) {
  const result=process.argv.includes('--send') ? await runtime.service.run(user_id) : await runtime.service.status(user_id);
  // Avoid publishing contact addresses, email bodies or provider credentials.
  console.log(JSON.stringify({userId:user_id,status:result.status || result.reason || result.campaign?.status}));
}
