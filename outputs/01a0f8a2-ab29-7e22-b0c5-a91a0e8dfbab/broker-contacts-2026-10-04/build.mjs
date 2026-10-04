import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = async name => (await fs.readFile(path.join(dir,name),'utf8')).trimEnd().split(/\r?\n/).slice(1).map(line=>line.split('\t'));
const fingerprint = s => { let h=2166136261; for(const c of s) h=Math.imul(h^c.charCodeAt(0),16777619)>>>0; return h.toString(16); };
const elan = await read('elan.tsv');
const live = await read('live-dubai.tsv');
const espace = await read('espace.tsv');
const agencies = await read('agencies.tsv');
const observed = [...elan.map(r=>`https://elanrealestate.ae/agent/${r[4]}/|${r[1]}`), ...live.map(r=>`https://livedubai.co.uk/agent/|${r[1]}`), ...espace.map(r=>`https://www.espace.ae/meet-the-team-detail/${r[3]}|${r[1]}`)].sort();
if(observed.length!==113 || fingerprint(observed.join('\n'))!=='df4ced8b') throw new Error('Broker transcription differs from browser observations');
if(agencies.length!==82 || fingerprint(agencies.map(r=>`https://livingsn.com/uae/agent/${r[3]}|${r[1]}|${r[2]}`).sort().join('\n'))!=='9f2e559e') throw new Error('Agency transcription differs from browser observations');
const records = [
  ...elan.map(r=>({name:r[0],phone:r[1],role:r[2],email:r[3],company:'Elan Real Estate',source:`https://elanrealestate.ae/agent/${r[4]}/`})),
  ...live.map(r=>({name:r[0],phone:r[1],role:r[2],email:r[3],company:'Live Dubai / LDI',source:'https://livedubai.co.uk/agent/'})),
  ...espace.map(r=>({name:r[0],phone:r[1],role:r[2],email:'',company:'Espace Real Estate',source:`https://www.espace.ae/meet-the-team-detail/${r[3]}`}))
].filter(r=>!['Muhammad Ovais Khan','Lee Malcolm','Alan Cuddihy'].includes(r.name));
const groups = new Map();
for(const r of records) { if(!/^\+9715\d{8}$/.test(r.phone)) throw new Error(`Invalid mobile ${r.name}`); if(!groups.has(r.phone))groups.set(r.phone,[]); groups.get(r.phone).push(r); }
const brokerRows = [...groups.values()].sort((a,b)=>(a.length>1)-(b.length>1)||a[0].company.localeCompare(b[0].company)||a[0].name.localeCompare(b[0].name)).map(g=>[g.map(r=>r.name).join(' / '),g[0].company,g[0].phone,g.map(r=>r.role).join(' / '),g.map(r=>r.email).filter(Boolean).join('; '),g.length>1?'Shared / conflicting profile number':'Direct business mobile','Not contacted',null,'',new Date('2026-10-04T12:00:00Z'),'Official agency website',g.length>1?'Same mobile published for multiple profiles; confirm identity before calling':'',null,g.map(r=>r.source).join('\n')]);
// Omit developers and broad consultancies/groups from the brokerage prospect view.
const nonBroker = new Set(['Ellington Properties','Palma Holding','Land Sterling','Stree Group','Aras Group']);
const agencyRows = agencies.filter(r=>!nonBroker.has(r[0])).map(r=>{
  const published = r[1].split(';').map(p=>({label:p.split(':')[0],phone:p.split(':')[1]}));
  const valid = published.filter(p=>/^\+971(?:[234679]\d{7}|5\d{8})$/.test(p.phone));
  const mobile=valid.find(p=>p.label==='Mobile'), office=valid.find(p=>p.label==='Office');
  const primary=mobile||office;
  if(!primary)throw new Error(`No valid UAE business number ${r[0]}`);
  const omitted=published.filter(p=>!valid.includes(p));
  return [r[0],primary.phone,(mobile&&office&&office.phone!==mobile.phone)?office.phone:'',r[2],primary.label==='Mobile'?'Agency mobile':'Agency office contact','Needs official-site recheck','Not contacted',null,'',new Date('2026-10-04T12:00:00Z'),omitted.length?`Omitted malformed number: ${omitted.map(p=>p.phone).join('; ')}`:'',null,`https://livingsn.com/uae/agent/${r[3]}`];
}).sort((a,b)=>a[0].localeCompare(b[0]));
const book=Workbook.create();
const makeSheet=(name,headers,rows,widths,sourceCol,statusCol,dateCols)=>{
  const sheet=book.worksheets.add(name); sheet.showGridLines=false;
  const last=rows.length+6, lastCol=String.fromCharCode(64+headers.length);
  sheet.getRange(`A1:${lastCol}${last}`).format.font={name:'Arial',size:10,color:'#1F2937'};
  sheet.getRange('A2').values=[[name==='Broker mobiles'?'Repeat AI — Dubai broker contacts':'Additional brokerage agencies']];
  sheet.getRange('A2').format.font={name:'Arial',size:15,bold:true,color:'#111827'};
  sheet.getRange('A3').values=[[name==='Broker mobiles'?`${rows.length} unique mobiles. Public contacts checked 4 Oct 2026; not dial-tested.`:`${rows.length} agency candidates from LivingSN. Recheck on the agency website before use.`]];
  sheet.getRange('A3').format.font={name:'Arial',size:10,italic:true,color:'#4B5563'};
  sheet.getRange(`A6:${lastCol}6`).values=[headers];
  const phoneIndexes=name==='Broker mobiles'?[2]:[1,2];
  const displayPhone=value=>value.startsWith('+9715')?value.replace(/^(\+971)(\d{2})(\d{3})(\d{4})$/,'$1 $2 $3 $4'):value.replace(/^(\+971)(\d)(\d{3})(\d{4})$/,'$1 $2 $3 $4');
  sheet.getRange(`A7:${lastCol}${last}`).values=rows.map(row=>row.map((value,index)=>phoneIndexes.includes(index)&&value?displayPhone(value):value));
  const table=sheet.tables.add(`A6:${String.fromCharCode(64+sourceCol-2)}${last}`,true,name==='Broker mobiles'?'BrokerCallList':'AgencyCallList'); table.showFilterButton=true;
  sheet.getRange(`A6:${String.fromCharCode(64+sourceCol-2)}6`).format={fill:'#172554',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},wrapText:true,horizontalAlignment:'center',verticalAlignment:'center',rowHeight:34};
  sheet.getRange(`A7:${lastCol}${last}`).format.rowHeight=32;
  sheet.getRange(`A7:${lastCol}${last}`).format.verticalAlignment='center';
  widths.forEach((w,i)=>sheet.getRangeByIndexes(5,i,rows.length+1,1).format.columnWidth=w);
  // Phone numbers remain literal text, including the international + prefix.
  for(const col of name==='Broker mobiles'?['C']:['B','C'])sheet.getRange(`${col}7:${col}${last}`).setNumberFormat('@');
  for(const col of dateCols)sheet.getRange(`${col}7:${col}${last}`).setNumberFormat('dd mmm yy');
  sheet.getRange(`${statusCol}7:${statusCol}${last}`).dataValidation={rule:{type:'list',values:['Not contacted','No answer','Interested','Not interested','Follow up','Do not contact','Wrong number']}};
  sheet.getRange(`${statusCol}7:${statusCol}${last}`).format.fill='#FEF3C7';
  sheet.getRangeByIndexes(6,sourceCol-1,rows.length,1).format.wrapText=true;
  sheet.freezePanes.freezeRows(6);sheet.freezePanes.freezeColumns(2);
  return sheet;
};
makeSheet('Broker mobiles',['Name','Agency','Mobile','Role','Email','Number type','Call status','Last called','Call notes','Checked on','Source type','Data note','','Source URL'],brokerRows,[44,25,21,42,34,36,19,16,40,16,26,76,3,92],14,'G',['H','J']);
makeSheet('Agency candidates',['Agency','Primary phone','Other phone','Email','Number type','Source check','Call status','Last called','Call notes','Found on','Data note','','Source URL'],agencyRows,[40,21,21,36,25,29,19,16,40,16,56,3,92],13,'G',['H','J']);
book.recalculate();
console.log((await book.inspect({kind:'table',range:'Broker mobiles!A6:G10',include:'values',tableMaxRows:5,tableMaxCols:7,maxChars:2000})).ndjson);
console.log((await book.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:20},maxChars:1000})).ndjson);
for(const sheetName of ['Broker mobiles','Agency candidates']) { const preview=await book.render({sheetName,range:'A1:G12',scale:1.5,format:'png'}); await fs.writeFile(path.join(dir,`${sheetName.toLowerCase().replaceAll(' ','-')}-preview.png`),new Uint8Array(await preview.arrayBuffer())); }
await (await SpreadsheetFile.exportXlsx(book)).save(path.join(dir,'Repeat-AI-broker-call-list.xlsx'));
const totals={brokerProfiles:records.length,uniqueBrokerMobiles:groups.size,sharedNumbers:[...groups.values()].filter(g=>g.length>1).length,agencyCandidates:agencyRows.length,uniquePhoneNumbers:new Set([...groups.keys(),...agencyRows.flatMap(r=>[r[1],r[2]]).filter(Boolean)]).size};
await fs.writeFile(path.join(dir,'verification.json'),JSON.stringify(totals,null,2)+'\n');
console.log(JSON.stringify(totals));
