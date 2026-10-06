import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { isBrokerOptOut } from '../../../shared/broker-campaign.js';

const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{'Content-Type':'application/json'}});
Deno.serve(async req => {
  if (req.method!=='POST') return json({error:'Method not allowed'},405);
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // This endpoint is a cron worker, never a user-controlled arbitrary sender.
  const cronToken=Deno.env.get('SELLER_SIGNAL_AUTO_WHATSAPP_TOKEN');
  if (!key || !(req.headers.get('authorization')===`Bearer ${key}` || (cronToken && req.headers.get('x-auto-whatsapp-token')===cronToken))) return json({error:'Unauthorized'},401);
  const client=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const input=await req.json().catch(()=>({}));
    const campaigns=await client.from('broker_campaigns').select('id').eq('status','active').order('created_at').limit(10);
    if(campaigns.error) throw campaigns.error;
    const results=[];
    for(const campaign of campaigns.data || []) {
      if(input.dryRun!==false) { results.push({campaignId:campaign.id,reason:'dry_run',sent:false}); continue; }
      const claimed=await client.rpc('claim_broker_campaign_message',{p_campaign_id:campaign.id});
      if(claimed.error) throw claimed.error;
      const job=claimed.data;
      if(!job.message_id) {results.push({campaignId:campaign.id,...job});continue;}
      try {
        // Check again immediately before transmission: a reply/pause can arrive after the claim.
        const replies=await client.from('whatsapp_messages').select('body').eq('user_id',job.user_id)
          .eq('account_id',job.account_id).eq('direction','inbound').eq('recipient_phone',job.phone).limit(100);
        if(replies.error) throw replies.error;
        const current=await client.from('broker_campaigns').select('status').eq('id',campaign.id).single();
        if(current.error) throw current.error;
        if(replies.data?.length || current.data.status!=='active') {
          const status=replies.data?.length ? (replies.data.some(r=>isBrokerOptOut(r.body))?'opted_out':'replied'):'ready';
          await checked(client.from('broker_campaign_contacts').update({status}).eq('id',job.contact_id));
          await checked(client.from('whatsapp_messages').update({status:'failed',error_message:'Stopped before send: reply or campaign paused'}).eq('id',job.message_id));
          results.push({campaignId:campaign.id,reason:'stopped_before_send'});continue;
        }
        const account=await client.from('whatsapp_accounts').select('phone_number_id,raw_account,connection_status,display_phone_number')
          .eq('id',job.account_id).eq('user_id',job.user_id).single();
        if(account.error) throw account.error;
        if(account.data.connection_status!=='connected') throw new Error('Sender disconnected');
        const session=account.data.raw_account?.baileys?.session_id || account.data.phone_number_id?.replace(/^baileys:/,'');
        if(!session) throw new Error('No WhatsApp session');
        const service=Deno.env.get('BAILEYS_SERVICE_URL');
        const token=Deno.env.get('BAILEYS_SERVICE_TOKEN');
        if(!service || !token) throw new Error('WhatsApp service unavailable');
        const response=await fetch(`${service.replace(/\/$/,'')}/sessions/${encodeURIComponent(session)}/messages`,{
          method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
          body:JSON.stringify({to:job.phone,text:job.body}),signal:AbortSignal.timeout(30000),
        });
        const sent=await response.json();
        if(!response.ok || sent.sent!==true || !sent.messageId) throw new Error('Send result unconfirmed; manual review required');
        await checked(client.from('whatsapp_messages').update({status:'sent',sent_at:sent.sentAt || new Date().toISOString(),meta_message_id:sent.messageId,raw_response:sent}).eq('id',job.message_id));
        await checked(client.from('broker_campaign_contacts').update({status:job.step===0?'sent':'done',step:job.step+1,
          next_send_at:new Date(Date.now()+job.followup_days*86400000).toISOString()}).eq('id',job.contact_id));
        results.push({campaignId:campaign.id,phone:job.phone,sent:true});
      } catch {
        // An ambiguous provider timeout must NOT release the claim and resend.
        await checked(client.from('broker_campaign_contacts').update({status:'error'}).eq('id',job.contact_id));
        await checked(client.from('whatsapp_messages').update({error_message:'Unconfirmed campaign send; inspect WhatsApp before retrying.'}).eq('id',job.message_id));
        results.push({campaignId:campaign.id,reason:'manual_review_required'});
      }
    }
    return json({results});
  } catch {return json({error:'Campaign run failed; no automatic retry of claimed sends.'},500);}
});
async function checked(operation: PromiseLike<{error: any}>) { const result=await operation; if(result.error) throw result.error; }
