import process from 'node:process';
import { createOutreachRuntime } from '../server/email-outreach-runtime.js';
import { createEmailSummaryCron } from '../server/email-summary-cron.js';
export const config={maxDuration:300};
let runtime;
export default function emailOutreachCron(req,res) {
  return createEmailSummaryCron({secret:process.env.CRON_SECRET,service:()=>({drain:async()=>{
    runtime ||= createOutreachRuntime(process.env);
    const due=await runtime.store.due();
    // This private edition intentionally drains one owner per invocation.
    if(due.length>1)throw new Error('Multiple outreach owners require a dedicated worker');
    if(!due.length)return {status:'idle',activeCampaigns:0};
    const result=await runtime.service.run(due[0].user_id);
    return {status:result.status || result.reason};
  }})})(req,res);
}
