import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { prepareEmailContacts, renderOutreach, OUTREACH_TEMPLATES, outreachDailyLimit, nextOutreachContact, outreachWindow } from '../shared/email-outreach.js';
import { createOutreachService } from '../server/email-outreach-service.js';
import { createOutreachHandler } from '../server/email-outreach-api.js';
import { createOutreachGmail, bounceFor } from '../server/email-outreach-gmail.js';

const row={name:'Broker One',agency:'Agency',email:'broker@example.com'};
const monday=Date.parse('2026-10-12T05:00:00Z');
function fixture() {
  const rows=new Map(),calls=[];let clock=monday,check={},fail=false;
  const store={read:async id=>structuredClone(rows.get(id)),save:async(id,revision,state)=>{
    if((rows.get(id)?.revision ?? -1)!==revision)return false;
    rows.set(id,{revision:revision+1,state:structuredClone(state)});return true;
  }};
  const gmail={verify:async()=>{},inspect:async()=>check,send:async(...args)=>{calls.push(args);if(fail)throw Error('network');return {messageId:'m',threadId:'t',internetId:'<m@example.com>'};}};
  const service=createOutreachService({store,gmail,now:()=>clock});
  return {service,store,rows,calls,gmail,time:value=>{clock=value;},check:value=>{check=value;},fail:()=>{fail=true;}};
}
async function active(f) {await f.service.import('a',[row]);await f.service.configure('a',true);}

test('contacts deduplicate, normalize and reject malformed records without discarding valid rows',()=>{
  const result=prepareEmailContacts([row,{...row,email:'BROKER@example.com'},{...row,email:'bad\r\nBcc:other@example.com'},{...row,name:''}]);
  assert.equal(result.contacts.length,1);assert.equal(result.errors.length,1);
  assert.equal(prepareEmailContacts([row],[],[row.email]).contacts[0].status,'excluded');
  assert.throws(()=>renderOutreach({...OUTREACH_TEMPLATES[0],subject:'x\r\nBcc:bad'},row));
  assert.throws(()=>renderOutreach({subject:'{unknown}',body:'body'},row));
});
test('Dubai weekday boundaries and ramp limits include every attempted email',()=>{
  assert.equal(outreachWindow(monday).open,true);
  assert.equal(outreachWindow(monday-1).open,false);
  assert.equal(outreachWindow(Date.parse('2026-10-12T13:00:00Z')).open,false);
  assert.equal(outreachWindow(Date.parse('2026-10-10T08:00:00Z')).open,false);
  assert.deepEqual([0,7,14,21].map(d=>outreachDailyLimit(monday,monday+d*86400000)),[5,10,20,30]);
  const state={status:'active',contacts:[{...row,status:'sent',step:1,nextAt:0}],rampStartedAt:monday,attempts:Array.from({length:5},()=>({at:monday}))};
  assert.equal(nextOutreachContact(state,monday).reason,'daily_limit');
});
test('draft creation and paused runs send nothing; data is scoped by owner',async()=>{
  const f=fixture();await f.service.import('a',[row]);
  assert.equal((await f.service.status('b')).campaign,null);
  assert.equal((await f.service.run('a')).reason,'paused');assert.equal(f.calls.length,0);
});
test('concurrent workers reserve once; follow-up spacing and terminal third step',async()=>{
  const f=fixture();await active(f);
  const result=await Promise.all([f.service.run('a'),f.service.run('a')]);
  assert.equal(result.filter(r=>r.status==='accepted').length,1);assert.equal(f.calls.length,1);
  assert.equal((await f.service.run('a')).reason,'spacing');
  f.time(monday+3*86400000);await f.service.run('a');assert.equal(f.calls.length,2);
  f.time(monday+10*86400000);await f.service.run('a');assert.equal(f.calls.length,3);
  assert.equal((await f.service.status('a')).campaign.counts.done,1);
});
test('reply, opt-out, bounce and previous conversation suppress transmission',async()=>{
  for(const status of ['replied','opted_out','bounced','excluded']){
    const f=fixture();await active(f);f.check({status});await f.service.run('a');
    assert.equal(f.calls.length,0);assert.equal((await f.service.status('a')).campaign.counts[status],1);
  }
});
test('attempt recorded before POST; ambiguous failure pauses and never retries',async()=>{
  const f=fixture();await active(f);f.fail();
  const send=f.gmail.send;f.gmail.send=async(...args)=>{const state=f.rows.get('a').state;assert.equal(state.attempts.length,1);assert.equal(state.contacts[0].status,'sending');return send(...args);};
  await f.service.run('a');await f.service.run('a');
  assert.equal(f.calls.length,1);assert.equal((await f.service.status('a')).campaign.counts.held,1);
  await assert.rejects(f.service.configure('a',true));
});
test('pause during preflight prevents send and preserves contact for later',async()=>{
  const f=fixture();await active(f);f.gmail.inspect=async()=>{await f.service.configure('a',false);return {};};
  assert.equal((await f.service.run('a')).reason,'paused');assert.equal(f.calls.length,0);
  assert.equal((await f.service.status('a')).campaign.counts.pending,1);
});
test('crashed reservation blocks automatic retry across process restarts',async()=>{
  const f=fixture();await active(f);const state=f.rows.get('a').state;state.contacts[0].status='sending';
  assert.equal((await f.service.run('a')).reason,'manual_review');assert.equal(f.calls.length,0);
});
test('API requires auth and ignores attempted cross-account input',async()=>{
  const f=fixture();const handler=createOutreachHandler({authenticate:async t=>t==='a' ? {id:'a'} : null,service:f.service});
  async function request(body,token){const res={setHeader(){},end(v){this.value=JSON.parse(v);}};await handler({method:'POST',headers:{authorization:token ? `Bearer ${token}` : ''},body},res);return res;}
  assert.equal((await request({action:'status'})).statusCode,401);
  assert.equal((await request({action:'import',contacts:[row],userId:'victim'},'a')).statusCode,400);
  assert.equal((await request({action:'import',contacts:[row]},'a')).statusCode,200);
});
test('DSN bounce requires exact recipient and failed action, not quoted opt-out text',()=>{
  const dsn={payload:{headers:[{name:'Content-Type',value:'multipart/report'}],body:{data:Buffer.from('Final-Recipient: rfc822; broker@example.com\r\nAction: failed\r\nStatus: 5.1.1').toString('base64url')}}};
  assert.equal(bounceFor(dsn,row.email),true);assert.equal(bounceFor(dsn,'other@example.com'),false);
  assert.equal(bounceFor({...dsn,payload:{...dsn.payload,headers:[]}},row.email),false);
});
test('wrong Gmail sender fails closed; successful send uses correct MIME and no retries',async()=>{
  let profile='wrong@example.com';const calls=[];
  const gmail=createOutreachGmail({tokens:{context:async()=>({accessToken:'secret'})},fetchImpl:async(url,options)=>{
    calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/profile') ? {emailAddress:profile} : {id:'id',threadId:'thread'}));
  }});
  await assert.rejects(gmail.send('a','lateef@getrepeatai.com',row,{subject:'Hello',body:'Hi'}));
  assert.equal(calls.filter(c=>c.options.method==='POST').length,0);
  profile='lateef@getrepeatai.com';await gmail.send('a',profile,row,{subject:'Hello',body:'Hi'});
  const send=calls.find(c=>c.options.method==='POST');
  const mime=Buffer.from(JSON.parse(send.options.body).raw,'base64url').toString();
  assert.match(mime,/From: Lateef Sanusi <lateef@getrepeatai.com>/);assert.match(mime,/To: broker@example.com/);
  assert.equal(send.options.redirect,'error');
});
