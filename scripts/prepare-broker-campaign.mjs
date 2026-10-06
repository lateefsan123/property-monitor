// Prepares a draft only. Does not activate a campaign or send messages.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { BROKER_INTRO, BROKER_FOLLOWUP, prepareBrokerContacts } from '../shared/broker-campaign.js';

const env={...process.env};
for(const path of ['.env','.env.local','.env.development.local']) {
  for(const line of readFileSync(path,'utf8').split(/\r?\n/)) {
    const match=line.match(/^([A-Z0-9_]+)=(.*)$/);
    if(match) env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');
  }
}
const userId=process.argv[process.argv.indexOf('--user-id')+1];
if(!process.argv.includes('--user-id') || !userId) throw new Error('Specify --user-id for the campaign owner.');
const client=createClient(env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
if(new URL(env.VITE_SUPABASE_URL).hostname!=='zrqxaammmrydkekbphqa.supabase.co') throw new Error('Unexpected project');
async function checked(query) {const {data,error}=await query;if(error) throw error;return data;}
const owner=await client.auth.admin.getUserById(userId);if(owner.error || !owner.data.user) throw new Error('Campaign owner not found');
const folder='outputs/01a1114f-3eec-7aa2-a1bb-866e489e7af5/broker-outreach-2026-10-06';
const contacts=JSON.parse(readFileSync(folder+'/candidates.json','utf8'));
const ledger=JSON.parse(readFileSync(folder+'/outreach-log.json','utf8'));
const ready=prepareBrokerContacts(contacts.slice(36),ledger).slice(0,6);
const campaignName='Repeat AI broker introductions — 6 October 2026';
const existing=await checked(client.from('broker_campaigns').select('id,status').eq('user_id',userId).eq('name',campaignName));
if(existing.length) {
  const saved=await checked(client.from('broker_campaign_contacts').select('id').eq('campaign_id',existing[0].id).limit(1));
  if(saved.length || existing[0].status!=='draft') {console.log('Draft already exists; no contacts or settings changed.');process.exit(0);}
}
const bucket='broker-demo-videos';
const available=await client.storage.getBucket(bucket);
if(available.error) {const result=await client.storage.createBucket(bucket,{public:true,fileSizeLimit:30000000,allowedMimeTypes:['video/mp4']});if(result.error) throw result.error;}
const videoPath='launch-film-v5-2026-10-05.mp4';
const uploaded=await client.storage.from(bucket).upload(videoPath,readFileSync('video/launch-film/out/repeat-ai-app-film-v5-9x16.mp4'),{contentType:'video/mp4',upsert:false});
if(uploaded.error && !String(uploaded.error.message).includes('already exists')) throw uploaded.error;
const demoUrl=client.storage.from(bucket).getPublicUrl(videoPath).data.publicUrl;
const campaign=existing[0] || await checked(client.from('broker_campaigns').insert({user_id:userId,name:campaignName,sender_phone:'353899618882',
  intro_template:BROKER_INTRO,followup_template:BROKER_FOLLOWUP,demo_url:demoUrl,status:'draft'}).select('id').single());
const rows=ready.map(c=>({...c,user_id:userId,campaign_id:campaign.id,status:'ready'}));
for(const record of ledger) {
  rows.push({campaign_id:campaign.id,user_id:userId,name:record.name,agency:record.agency,phone:record.phone,source:record.source,
    status:record.status.startsWith('unverified')?'error':'excluded',
    external_contacted_at:record.status.startsWith('Skipped')?null:record.timestamp});
}
// Oliver's introduction was already sent in Chrome, outside the app's message log.
rows.push({campaign_id:campaign.id,user_id:userId,name:'Oliver Leedham',agency:'Existing conversation',phone:'971585574750',
  source:'Existing WhatsApp conversation',status:'excluded',external_contacted_at:'2026-10-06T13:26:00.000Z'});
await checked(client.from('broker_campaign_contacts').insert(rows,{defaultToNull:false}));
console.log(JSON.stringify({campaignId:campaign.id,ready:ready.length,excluded:rows.filter(r=>r.status==='excluded').length,
  review:rows.filter(r=>r.status==='error').length,status:'draft',demoUrl}));
// Authentication and default dry-run: no provider is called.
const endpoint=env.VITE_SUPABASE_URL+'/functions/v1/broker-campaign-dispatcher';
const unauthenticated=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
if(unauthenticated.status!==401) throw new Error('Worker accepted unauthenticated call');
console.log('PASS: draft persisted; worker rejects unauthenticated calls. Run the authenticated dry-run through the scheduled Vault token.');
