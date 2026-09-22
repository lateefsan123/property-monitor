import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, useCurrentFrame} from 'remotion';
import {IconPlus, IconX} from '@tabler/icons-react';
import '../../../src/styles/app-shell.css';
import '../../../src/styles/seller-records.css';
import '../../../src/styles/seller-toolbar.css';
import '../../../src/styles/seller-source-tabs.css';
import '../../../src/styles/seller-panels.css';
import '../../../src/styles/seller-insights.css';
import '../../../src/styles/seller-data-quality.css';
import '../../../src/styles/lead-modal.css';
import '../../../src/styles/lead-detail-modal.css';
import '../../../src/features/schedule/schedule.css';
import '../accurate/film.css';
import './workflow.css';
import {asset,tween,pos,Screenshot,Cursor,Caption} from './primitives';
import {Intro,Market,Templates,Platforms,Close} from './SharedScenes';
import {AppHeader,ImportScene,Sellers,leads} from './SellerScenes';

const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
// The same example spreadsheet supplies the building names shown in each picker.
const slots=[
 {day:0,start:100,end:230,query:'Act',buildings:['Act towers 1','Act tower 2'],select:[185,210]},
 {day:1,start:245,end:340,query:'Regis',buildings:['The St. Regis Residences, Downtown Dubai','St Regis tower 2'],select:[305,320]},
 {day:2,start:355,end:465,query:'Burj',buildings:['Burj Khalifa','Burj Vista 1, Downtown Dubai','Burj Vista 2, Downtown Dubai'],select:[415,430,445]},
 {day:3,start:480,end:555,query:'Imperial',buildings:['IMPERIAL AVENUE'],select:[535]},
];
function Schedule(){const f=useCurrentFrame();const active=slots.find(s=>f>=s.start&&f<s.end);const enabled=f>=55;const saved=f>=630;
 return <AbsoluteFill className="app-shell"><AppHeader page="Schedule"/><div style={{...pos(0,56),width:1920}}><main className="schedule-page"><header className="schedule-heading"><div className="schedule-heading-actions"><button className="schedule-save" disabled={!enabled||saved}>{saved?'Saved':'Save'}</button></div></header><fieldset className="schedule-controls"><label className="schedule-enable"><input type="checkbox" checked={enabled} readOnly/>Weekly schedule</label><div className="schedule-board">{days.map((day,i)=>{const slot=slots.find(s=>s.day===i);const chosen=slot?.buildings.filter((_,j)=>f>=slot.select[j])||[];return <section className="schedule-day" key={day}><h2>{day}</h2><div className="schedule-buildings">{chosen.length?chosen.map(name=><div className="schedule-building" key={name}><span>{name}</span><button><IconX size={15}/></button></div>):<p className="schedule-off">No sends</p>}</div><button className="schedule-add"><IconPlus size={16}/>Add buildings</button></section>})}</div><label className="schedule-fallback"><input type="checkbox" checked={false} readOnly/><span>Fill unused slots from other buildings</span></label></fieldset>
 {active&&<><div style={{position:'fixed',inset:0,background:'#0007'}}/><div className="schedule-picker" style={{position:'fixed',left:730,top:280}}><header><h2>{days[active.day]} buildings</h2><button><IconX size={20}/></button></header><label className="schedule-source">Spreadsheet<select value={f<active.start+25?'':'demo'} onChange={()=>{}}><option value="">Choose a spreadsheet</option><option value="demo">Downtown leads</option></select></label><input readOnly value={f<active.start+35?'':active.query.slice(0,Math.round(tween(f,active.start+35,active.start+60,0,active.query.length)))} placeholder="Search spreadsheet buildings"/><div className="schedule-picker-list">{f<active.start+25?<p>Choose a spreadsheet to see its buildings.</p>:(f<active.start+60?leads.map(l=>l.building):active.buildings).map((name,i)=><label key={name}><input type="checkbox" checked={active.buildings.includes(name)&&f>=active.select[active.buildings.indexOf(name)]} readOnly/><span>{name}</span></label>)}</div><button className="schedule-save">Done</button></div></>}
 </main></div>
 {!active&&f<95&&<Cursor x={tween(f,10,50,600,345)} y={tween(f,10,50,350,195)} click={tween(f,53,55)}/>}
 {active&&f<active.start+35&&<Cursor x={1010} y={409} click={Math.max(0,1-Math.abs(f-active.start-25)/7)}/>}
 {active&&f>=active.start+35&&f<active.start+60&&<Cursor x={950} y={467}/>}
 {!active&&slots.some(s=>f>=s.start-18&&f<s.start)&&(()=>{const slot=slots.find(s=>f>=s.start-18&&f<s.start)!;return <Cursor x={450+slot.day*254} y={slot.day===3?529:480} click={tween(f,slot.start-3,slot.start)}/>})()}
 {active&&f>=active.start+60&&<Cursor x={f>active.select[active.select.length-1]+7?790:767} y={f>active.select[active.select.length-1]+7?555+active.buildings.length*48:528+Math.max(0,active.select.findIndex(t=>f<=t+7))*48} click={Math.max(...active.select.map(t=>Math.max(0,1-Math.abs(f-t)/7)))}/>}
 {!active&&f>=585&&f<650&&<Cursor x={tween(f,585,625,1110,1540)} y={tween(f,585,625,580,125)} click={tween(f,627,630)}/>}
 <Caption>{f<245?'Choose a day, spreadsheet and buildings.':f<565?'Build a full week around the buildings you cover.':saved?'Weekly plan saved. Friday and the weekend stay off.':'Review the full week, then save.'}</Caption>
 </AbsoluteFill>
}
function Integrations(){const f=useCurrentFrame();const icons=[['sheets.png','Google Sheets'],['excel.svg','Excel'],['gmail.png','Gmail'],['outlook.svg','Outlook'],['calendar.png','Google Calendar']];return <AbsoluteFill style={{justifyContent:'center',alignItems:'center'}}><h1 style={{fontSize:66,marginTop:-95}}>Connected to your everyday tools.</h1><div style={{display:'flex',gap:90,marginTop:80}}>{icons.map(([file,label],i)=><div key={file} style={{width:170,textAlign:'center',opacity:tween(f,i*13,i*13+20),transform:`translateY(${tween(f,i*13,i*13+25,22,0)}px)`}}><Img src={asset('workflow/'+file)} style={{height:96,width:96,objectFit:'contain'}}/><div style={{fontSize:23,marginTop:27,color:'#d7d0c5'}}>{label}</div></div>)}</div><div style={{position:'absolute',bottom:135,fontSize:23,color:'#aaa296',opacity:tween(f,110,135)}}>Email, spreadsheets and calendars — in your workspace.</div></AbsoluteFill>}
const request='Create a new template named Viewing follow-up: Hi {{name}}, here are the latest transactions in {{building}}. {{transactions}} Would you like an updated valuation? Prepare it for my review.';
function Assistant(){const f=useCurrentFrame();const action=f>=275;return <AbsoluteFill>
 <div style={{...pos(125,220),width:710}}><div className="eyebrow">ASK REPEAT</div><h1>Type it.<br/>Say it.<br/>Get it ready.</h1><p className="editorial-copy" style={{fontSize:28}}>{f<170?'Market summaries. Seller lookup.':f<390?'Prepare templates and schedule changes.':'Review the change. Then confirm.'}</p><div style={{fontSize:22,color:'#aaa296',marginTop:36,opacity:tween(f,450,480)}}>You stay in control of changes.</div></div>
 <div style={{...pos(1095,75),width:420,height:700,overflow:'hidden',borderRadius:22,transform:'scale(1.3)',transformOrigin:'top left'}}>
 {action?<Img src={asset('workflow/assistant-action-review.jpg')} style={{width:420,height:700}}/>:<><Screenshot name="10-assistant.png" style={{position:'absolute',left:-1476,top:-356,maxWidth:'none'}}/><div style={{...pos(28,528),width:296,height:45,overflow:'hidden',paddingTop:3,fontSize:14,lineHeight:1.5,background:'#2a2a28',color:'#ece8df'}}>{request.slice(0,Math.round(tween(f,100,265,0,request.length)))}</div></>}
 </div>
 {f>=245&&f<288&&<Cursor x={tween(f,245,270,1400,1575)} y={tween(f,245,270,860,807)} click={tween(f,273,275)}/>}
 {f>=550&&<Cursor x={tween(f,550,590,1570,1220)} y={tween(f,550,590,805,657)}/>}
 </AbsoluteFill>}

const scenes:[number,number,React.FC][]=[[0,5,Intro],[5,16,ImportScene],[21,37,Sellers],[58,15,Templates],[73,26,Schedule],[99,20,Market],[119,9,Integrations],[128,23,Assistant],[151,8,Platforms],[159,5,Close]];
export function WorkflowFilm(){return <AbsoluteFill className="accurate-film workflow-film" data-theme="dark"><Audio src={asset('workflow/mix.wav')}/>{scenes.map(([start,duration,Scene])=><Sequence key={start} from={start*30} durationInFrames={duration*30}><Scene/></Sequence>)}</AbsoluteFill>}
