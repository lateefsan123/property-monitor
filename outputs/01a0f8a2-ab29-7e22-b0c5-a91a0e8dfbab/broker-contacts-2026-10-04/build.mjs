import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Workbook, SpreadsheetFile, FileBlob } from '@oai/artifact-tool';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = async name => (await fs.readFile(path.join(dir,name),'utf8')).trimEnd().split(/\r?\n/).slice(1).map(line=>line.split('\t'));
const fingerprint = s => { let h=2166136261; for(const c of s) h=Math.imul(h^c.charCodeAt(0),16777619)>>>0; return h.toString(16); };
const elan = await read('elan.tsv');
const live = await read('live-dubai.tsv');
const espace = await read('espace.tsv');
const additions = await read('individuals-additions.tsv');
const round2 = await read('individuals-round2.tsv');
if(round2.length!==76 || fingerprint(round2.map(r=>`${r[0]}|${r[1]}`).sort().join('\n'))!=='d09c9f4') throw new Error('Round 2 transcription differs from browser observations');
const round2Source=r=>r[3]==='Exclusive Links'?'https://www.exclusive-links.com/about-exclusive-links/meet-the-team/':r[3]==='Pam Golding Properties Dubai'?'https://www.pamgolding.ae/contact-us/agents':['Mr. Michael','Ms. Meerab Rahim','Mr. Abdul Rahim'].includes(r[0])?'https://easynestproperties.com/agents/page/2/':'https://easynestproperties.com/agents/';
const observed = [...elan.map(r=>`https://elanrealestate.ae/agent/${r[4]}/|${r[1]}`), ...live.map(r=>`https://livedubai.co.uk/agent/|${r[1]}`), ...espace.map(r=>`https://www.espace.ae/meet-the-team-detail/${r[3]}|${r[1]}`)].sort();
if(observed.length!==113 || fingerprint(observed.join('\n'))!=='df4ced8b') throw new Error('Broker transcription differs from browser observations');
if(additions.length!==69 || fingerprint(additions.map(r=>`${r[0]}|${r[1]}`).sort().join('\n'))!=='c67052ed') throw new Error('New individual transcription differs from browser observations');
const records = [
  ...elan.map(r=>({name:r[0],phone:r[1],role:r[2],email:r[3],company:'Elan Real Estate',source:`https://elanrealestate.ae/agent/${r[4]}/`})),
  ...live.map(r=>({name:r[0],phone:r[1],role:r[2],email:r[3],company:'Live Dubai / LDI',source:'https://livedubai.co.uk/agent/'})),
  ...espace.map(r=>({name:r[0],phone:r[1],role:r[2],email:'',company:'Espace Real Estate',source:`https://www.espace.ae/meet-the-team-detail/${r[3]}`})),
  ...additions.map(r=>({name:r[0],phone:r[1],role:r[2],company:r[3],email:r[4],source:r[5],type:r[6]})),
  ...round2.map(r=>({name:r[0],phone:r[1],role:r[2],company:r[3],email:r[4]||'',source:round2Source(r),type:r[3]==='Pam Golding Properties Dubai'?'Individual WhatsApp mobile':'Direct business mobile'}))
].filter(r=>!['Muhammad Ovais Khan','Lee Malcolm','Alan Cuddihy'].includes(r.name));
const groups = new Map();
for(const r of records) { if(!/^(?:\+9715\d{8}|\+346\d{8})$/.test(r.phone)) throw new Error(`Invalid mobile ${r.name}`); if(!groups.has(r.phone))groups.set(r.phone,[]); groups.get(r.phone).push(r); }
const existing=await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(dir,'Repeat-AI-broker-call-list.xlsx')));
const previous=new Map(existing.worksheets.getItem('Broker mobiles').getUsedRange().values.slice(6).map(r=>[String(r[2]).replaceAll(' ',''),r.slice(6,9)]));
const brokerRows = [...groups.values()].filter(g=>g.length===1).map(g=>g[0]).sort((a,b)=>a.company.localeCompare(b.company)||a.name.localeCompare(b.name)).map(r=>[r.name,r.company,r.phone,r.role,r.email,r.type||'Direct business mobile',...(previous.get(r.phone)||['Not contacted',null,'']),new Date('2026-10-04T12:00:00Z'),'Official agency website',r.phone.startsWith('+34')?'Spanish mobile published for this Dubai consultant':'',null,r.source]);
if(brokerRows.length!==251)throw new Error(`Unexpected individual count ${brokerRows.length}`);
const book=Workbook.create();
const makeSheet=(name,headers,rows,widths,sourceCol,statusCol,dateCols)=>{
  const sheet=book.worksheets.add(name); sheet.showGridLines=false;
  const last=rows.length+6, lastCol=String.fromCharCode(64+headers.length);
  sheet.getRange(`A1:${lastCol}${last}`).format.font={name:'Arial',size:10,color:'#1F2937'};
  sheet.getRange('A2').values=[[name==='Broker mobiles'?'Repeat AI — Dubai broker contacts':'Additional brokerage agencies']];
  sheet.getRange('A2').format.font={name:'Arial',size:15,bold:true,color:'#111827'};
  sheet.getRange('A3').values=[[name==='Broker mobiles'?`${rows.length} individual contacts. Public mobiles checked 4 Oct 2026; not dial-tested.`:`${rows.length} agency candidates from LivingSN. Recheck on the agency website before use.`]];
  sheet.getRange('A3').format.font={name:'Arial',size:10,italic:true,color:'#4B5563'};
  sheet.getRange(`A6:${lastCol}6`).values=[headers];
  const phoneIndexes=name==='Broker mobiles'?[2]:[1,2];
  const displayPhone=value=>value.startsWith('+34')?value.replace(/^(\+34)(\d{3})(\d{3})(\d{3})$/,'$1 $2 $3 $4'):value.startsWith('+9715')?value.replace(/^(\+971)(\d{2})(\d{3})(\d{4})$/,'$1 $2 $3 $4'):value.replace(/^(\+971)(\d)(\d{3})(\d{4})$/,'$1 $2 $3 $4');
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
book.recalculate();
console.log((await book.inspect({kind:'table',range:'Broker mobiles!A6:G10',include:'values',tableMaxRows:5,tableMaxCols:7,maxChars:2000})).ndjson);
console.log((await book.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:20},maxChars:1000})).ndjson);
for(const sheetName of ['Broker mobiles']) { const preview=await book.render({sheetName,range:'A186:G193',scale:1.5,format:'png'}); await fs.writeFile(path.join(dir,`${sheetName.toLowerCase().replaceAll(' ','-')}-preview.png`),new Uint8Array(await preview.arrayBuffer())); }
await (await SpreadsheetFile.exportXlsx(book)).save(path.join(dir,'Repeat-AI-broker-call-list.xlsx'));
const totals={individualContacts:brokerRows.length,newIndividuals:round2.length,excludedSharedNumbers:[...groups.values()].filter(g=>g.length>1).length,agencyContacts:0,companies:new Set(brokerRows.map(r=>r[1])).size,checkedOn:'2026-10-04',dialTested:false};
await fs.writeFile(path.join(dir,'verification.json'),JSON.stringify(totals,null,2)+'\n');
console.log(JSON.stringify(totals));
