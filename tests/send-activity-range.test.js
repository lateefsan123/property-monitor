import test from 'node:test';
import assert from 'node:assert/strict';
import { activityRange, dubaiDateKey, validateActivityRange } from '../shared/send-activity-dates.js';
import { createSendActivityServices } from '../shared/send-activity.js';

test('Dubai midnight, leap years and inclusive presets', () => {
  assert.equal(dubaiDateKey(new Date('2026-01-01T20:00:00Z')), '2026-01-02');
  assert.deepEqual(activityRange('week', '2026-01-03'), {startDate:'2025-12-28',endDate:'2026-01-03'});
  assert.deepEqual(activityRange('yesterday', '2024-03-01'), {startDate:'2024-02-29',endDate:'2024-02-29'});
  assert.deepEqual(validateActivityRange({startDate:'2024-02-29',endDate:'2024-03-01'}), {start:'2024-02-28T20:00:00.000Z',end:'2024-03-01T20:00:00.000Z'});
});
test('invalid, reversed and future dates are rejected', () => {
  for (const range of [{startDate:'2025-02-29',endDate:'2025-03-01'}, {startDate:'2025-03-02',endDate:'2025-03-01'}, {startDate:'2026-01-01',endDate:'2099-01-01'}]) assert.throws(() => validateActivityRange(range));
});
function client(rows, options = {}) {
  const calls=[];
  return {calls, from(table) {
    const filters=[]; let fields='';
    const query={select(value){fields=value;return query;}, order(){return query;}, async range(start,end){
      calls.push({table,filters,start,end});
      if(options.fallback && fields.includes('initiated_via')) return {error:{code:'42703'}};
      if(options.failLater && start > 0) return {error:{message:'Page failed'}};
      const data=table==='whatsapp_messages'?rows:[];
      return {data:data.filter(row=>filters.every(([op,col,v])=>op==='eq'?row[col]===v:op==='in'?v.includes(row[col]):op==='gte'?row[col]>=v:op==='lte'?row[col]<=v:row[col]<v)).slice(start,end+1)};
    }};
    for(const op of ['eq','in','gte','lte','lt'])query[op]=(col,v)=>{filters.push([op,col,v]);return query;};
    return query;
  }};
}
const row=(id,sent_at='2026-01-02T08:00:00.000Z')=>({id,user_id:'owner',direction:'outbound',status:'sent',send_source:'manual',initiated_via:'mobile',lead_id:'same-seller',sent_at});
test('range totals paginate, count sellers once, and preserve account and end-date scope', async()=>{
  const db=client([...Array.from({length:1001},(_,id)=>row(id)), {...row('other'),user_id:'other'},row('excluded','2026-01-02T20:00:00.000Z')]);
  const result=await createSendActivityServices(db).fetchWhatsAppSendActivity('owner',{startDate:'2026-01-01',endDate:'2026-01-02'});
  assert.equal(result.total,1001);assert.equal(result.distinctLeads,1);assert.equal(result.sources.manual,1001);
  assert.equal(db.calls.filter(c=>c.table==='whatsapp_messages').length,3);
  assert.ok(db.calls.every(c=>c.filters.some(([op,col,val])=>op==='eq'&&col==='user_id'&&val==='owner')));
  assert.ok(db.calls.find(c=>c.table==='seller_signal_send_alerts').filters.some(([op,col,val])=>op==='lte'&&col==='dubai_date'&&val==='2026-01-02'));
});
test('legacy fallback keeps the same dates and multi-day volume does not imply a daily alert', async()=>{
  const rows=Array.from({length:100},(_,id)=>row(id,`2026-01-${String(Math.floor(id/20)+1).padStart(2,'0')}T08:00:00.000Z`));
  const db=client(rows,{fallback:true});
  const result=await createSendActivityServices(db).fetchWhatsAppSendActivity('owner',{startDate:'2026-01-01',endDate:'2026-01-05'});
  assert.equal(result.total,100);assert.equal(result.origins.unknown,100);assert.equal(result.state,'normal');
});
test('later-page failures never return incomplete totals; signed-out requests do not query',async()=>{
  const db=client(Array.from({length:501},(_,id)=>row(id)),{failLater:true});
  const service=createSendActivityServices(db);
  assert.equal(await service.fetchWhatsAppSendActivity(null),null);assert.equal(db.calls.length,0);
  await assert.rejects(service.fetchWhatsAppSendActivity('owner',{startDate:'2026-01-01',endDate:'2026-01-02'}),/Page failed/);
});
