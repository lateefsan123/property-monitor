import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabase';
import { BROKER_INTRO, BROKER_FOLLOWUP, prepareBrokerContacts, renderBrokerMessage } from '../../../shared/broker-campaign';
import './broker-campaign.css';

async function checked(query) { const {data,error}=await query; if(error) throw new Error(error.message); return data; }
export default function BrokerCampaignPage({userId,onNavigate}) {
  const cache=useQueryClient();
  const [selected,setSelected]=useState(null);
  const [name,setName]=useState('Repeat AI broker introductions');
  const [sender,setSender]=useState('353899618882');
  const [intro,setIntro]=useState(BROKER_INTRO);
  const [followup,setFollowup]=useState(BROKER_FOLLOWUP);
  const [records,setRecords]=useState([]);
  const [error,setError]=useState('');
  const campaigns=useQuery({queryKey:['broker-campaigns',userId],queryFn:()=>checked(supabase.from('broker_campaigns').select('*').eq('user_id',userId).order('created_at',{ascending:false}))});
  const campaign=campaigns.data?.find(c=>c.id===selected) || campaigns.data?.[0];
  const contacts=useQuery({queryKey:['broker-contacts',userId,campaign?.id],enabled:Boolean(campaign),queryFn:()=>checked(supabase.from('broker_campaign_contacts').select('*').eq('user_id',userId).eq('campaign_id',campaign.id).order('next_send_at').limit(500))});
  const accounts=useQuery({queryKey:['broker-sender',userId],queryFn:()=>checked(supabase.from('whatsapp_accounts').select('display_phone_number,provider,connection_status').eq('user_id',userId))});
  const linked=accounts.data?.some(a=>a.provider==='baileys' && a.connection_status==='connected' && a.display_phone_number?.replace(/\D/g,'')===campaign?.sender_phone);
  const mutation=useMutation({mutationFn:async action=>{
    setError('');
    if(action==='create') {
      const brokers=prepareBrokerContacts(records);
      if(!brokers.length) throw new Error('Add at least one broker to this draft.');
      for(const broker of brokers) {renderBrokerMessage(intro,broker,'https://repeatai.org');renderBrokerMessage(followup,broker,'https://repeatai.org');}
      const created=await checked(supabase.from('broker_campaigns').insert({user_id:userId,name:name.trim(),sender_phone:sender.replace(/\D/g,''),intro_template:intro,followup_template:followup,demo_url:'https://repeatai.org'}).select('*').single());
      setSelected(created.id);
      try {await checked(supabase.from('broker_campaign_contacts').insert(brokers.map(b=>({...b,user_id:userId,campaign_id:created.id}))));}
      catch(e) {throw new Error(`Draft created, but contacts were not imported: ${e.message}`);}
    } else {
      if(action==='active' && !linked) throw new Error('Connect the selected WhatsApp number in Settings first.');
      await checked(supabase.from('broker_campaigns').update({status:action}).eq('id',campaign.id).eq('user_id',userId));
    }
  },onSettled:()=>{cache.invalidateQueries({queryKey:['broker-campaigns',userId]});cache.invalidateQueries({queryKey:['broker-contacts',userId]});},onError:e=>setError(e.message)});
  const sample=contacts.data?.find(c=>c.status==='ready') || contacts.data?.[0];
  let preview='',followupPreview='',previewError='';
  if(sample && campaign) {
    try {preview=renderBrokerMessage(campaign.intro_template,sample,campaign.demo_url);followupPreview=renderBrokerMessage(campaign.followup_template,sample,campaign.demo_url);}
    catch(e) {previewError=e.message;}
  }
  return <main className="broker-campaign-page">
    <header><h1>Broker outreach</h1><p>Introduce Repeat AI, then follow up once after three days. Replies stop the sequence.</p></header>
    {campaigns.error && <p role="alert">Could not load campaigns: {campaigns.error.message}</p>}
    {error && <p role="alert">{error}</p>}
    <section className="broker-card"><h2>Your campaigns</h2>
      {campaigns.isPending ? <p>Loading campaigns…</p> : !campaigns.data?.length ? <p>Create a draft below to get started.</p> : <>
        <label>Campaign<select value={campaign?.id || ''} onChange={e=>setSelected(e.target.value)}>{campaigns.data.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <p><strong>{campaign.status}</strong> · +{campaign.sender_phone} · up to {campaign.daily_limit} messages daily, shared with other automatic sends.</p>
        {!linked && <p>Connect this WhatsApp number before starting. <button onClick={()=>onNavigate('settings')}>Open Settings</button></p>}
        <button disabled={mutation.isPending || !linked || Boolean(previewError) || campaign.status==='active'} onClick={()=>mutation.mutate('active')}>Start campaign</button>{' '}
        <button disabled={mutation.isPending || campaign.status!=='active'} onClick={()=>mutation.mutate('paused')}>Pause campaign</button>
        <p>Messages go out during your account’s Dubai sending hours. An unconfirmed send waits for manual review.</p>
        {previewError && <p role="alert">Check the message templates: {previewError}</p>}
        {preview && !previewError && <div className="broker-preview"><h3>First message preview</h3><p>{preview}</p><h3>Follow-up after {campaign.followup_days} days</h3><p>{followupPreview}</p></div>}
        {contacts.error && <p role="alert">Could not load contacts: {contacts.error.message}</p>}
        <table><thead><tr><th>Broker</th><th>Agency</th><th>Status</th></tr></thead><tbody>{contacts.data?.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.agency}</td><td>{c.status}</td></tr>)}</tbody></table>
      </>}
    </section>
    <details className="broker-card"><summary>Create a campaign draft</summary>
      <label>Campaign name<input value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Sender number, including country code<input value={sender} onChange={e=>setSender(e.target.value)}/></label>
      <label>Introduction<textarea value={intro} onChange={e=>setIntro(e.target.value)}/></label>
      <label>Follow-up<textarea value={followup} onChange={e=>setFollowup(e.target.value)}/></label>
      <p>Personalise with {'{name}'}, {'{agency}'} and {'{demo_url}'}. Existing WhatsApp conversations are excluded before sending.</p>
      <label>Broker spreadsheet<input type="file" accept=".xlsx,.xls,.csv" onChange={async e=>{
        const file=e.target.files?.[0]; if(!file) return;
        try {
          const XLSX=await import('xlsx');
          const book=XLSX.read(await file.arrayBuffer());
          const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:''});
          setRecords(rows.map(row=>({name:row.Name || row.name,agency:row.Agency || row.agency,phone:String(row.Phone || row.phone || ''),source:row.Source || row.source || ''})));
          setError('');
        } catch {setError('Could not read that spreadsheet. Use columns Name, Agency, Phone and Source.');}
      }}/></label>
      <p>{records.length} brokers loaded. Use columns Name, Agency, Phone and Source.</p>
      <button disabled={mutation.isPending} onClick={()=>mutation.mutate('create')}>Save draft</button>
    </details>
  </main>;
}
