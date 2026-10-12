import fs from 'node:fs/promises';
import process from 'node:process';
import XLSX from 'xlsx';
import { loadEnv } from 'vite';
import { createOutreachRuntime } from '../server/email-outreach-runtime.js';
import { prepareEmailContacts } from '../shared/email-outreach.js';

const base='outputs/01a1114f-3eec-7aa2-a1bb-866e489e7af5';
const blocked=new Set(['971503743424','971558094017','971561881518','971504746250']);
function walk(x) {
  if(Array.isArray(x)){for(const v of x)walk(v);}
  else if(x && typeof x==='object'){
    if(x.phone && x.status!=='pending')blocked.add(String(x.phone).replace(/\D/g,''));
    for(const v of Object.values(x))walk(v);
  }
}
for(const file of [`${base}/broker-outreach-2026-10-06/outreach-log.json`,`${base}/broker-outreach-2026-10-07/run.json`,`${base}/broker-outreach-2026-10-10/run.json`])walk(JSON.parse(await fs.readFile(file,'utf8')));
const audit=JSON.parse(await fs.readFile(`${base}/automation-account-setup/whatsapp-history-partial-check.json`,'utf8'));
for(const phone of audit.observedChatPhones)blocked.add(String(phone).replace(/\D/g,''));
const book=XLSX.readFile('outputs/broker-emails-2026-10-12/broker-emails.csv');
const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:''});
const filtered=rows.filter(r=>!blocked.has(String(r.phone).replace(/\D/g,''))&&!/^(Albert Michael|Oliver|Alex Calamari)$/i.test(r.name));
const prepared=prepareEmailContacts(filtered);
const output=XLSX.utils.book_new();XLSX.utils.book_append_sheet(output,XLSX.utils.json_to_sheet(prepared.contacts.map(({status:_,step:_step,nextAt:_at,...r})=>r)),'Brokers');
XLSX.writeFile(output,'outputs/broker-emails-2026-10-12/outreach-ready.csv');
console.log(JSON.stringify({input:rows.length,ready:prepared.contacts.length,priorWhatsAppExcluded:rows.length-filtered.length,invalid:prepared.errors.length}));
// Import is opt-in, owner-scoped and always paused. Never enables sending.
const userId=process.argv.find(v=>v.startsWith('--user-id='))?.slice(10);
if(userId) {
  const runtime=createOutreachRuntime({...loadEnv('development',process.cwd(),''),...process.env});
  for(let i=0;i<prepared.contacts.length;i+=500)await runtime.service.import(userId,prepared.contacts.slice(i,i+500));
  const summary=await runtime.service.status(userId);
  console.log(JSON.stringify({userId,status:summary.campaign.status,total:summary.campaign.total}));
}
