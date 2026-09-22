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
import {asset,tween,pos,Cursor} from './primitives';
import {Intro,Market,Platforms,Close} from './SharedScenes';
import {AppHeader,Sellers,leads} from './SellerScenes';
import {ImportScene,Templates,Assistant} from './InteractiveScenes';
import '../../../src/styles/seller-message-templates.css';
import '../../../src/styles/spreadsheet-minimal-list.css';
import '../../../src/voice/voice.css';

const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
// The same example spreadsheet supplies the building names shown in each picker.
const slots=[
 {day:0,start:100,end:230,query:'Act',buildings:['Act towers 1','Act tower 2'],select:[185,210]},
 {day:1,start:245,end:340,query:'Regis',buildings:['The St. Regis Residences, Downtown Dubai','St Regis tower 2'],select:[305,320]},
 {day:2,start:355,end:465,query:'Burj',buildings:['Burj Khalifa','Burj Vista 1, Downtown Dubai','Burj Vista 2, Downtown Dubai'],select:[415,430,445]},
 {day:3,start:480,end:555,query:'Imperial',buildings:['IMPERIAL AVENUE'],select:[535]},
];
export function Schedule(){const f=useCurrentFrame()*26/24;const active=slots.find(s=>f>=s.start&&f<s.end);const enabled=f>=55;const sourceIndex=active?(active.select.findIndex(t=>f<t+9)<0?active.buildings.length-1:active.select.findIndex(t=>f<t+9)):0;const sourceName=active?.buildings[sourceIndex]||'';const switching=active?.select.slice(0,-1).find(t=>f>=t+5&&f<t+18);const saved=f>=630;
 return <AbsoluteFill className="app-shell"><AppHeader page="Schedule"/><div style={{...pos(0,56),width:1920}}><main className="schedule-page"><header className="schedule-heading"><div className="schedule-heading-actions"><button className="schedule-save" disabled={!enabled||saved}>{saved?'Saved':'Save'}</button></div></header><fieldset className="schedule-controls"><label className="schedule-enable"><input type="checkbox" checked={enabled} readOnly/>Weekly schedule</label><div className="schedule-board">{days.map((day,i)=>{const slot=slots.find(s=>s.day===i);const chosen=slot?.buildings.filter((_,j)=>f>=slot.select[j])||[];return <section className="schedule-day" key={day}><h2>{day}</h2><div className="schedule-buildings">{chosen.length?chosen.map(name=><div className="schedule-building" key={name}><span>{name}</span><button><IconX size={15}/></button></div>):<p className="schedule-off">No sends</p>}</div><button className="schedule-add"><IconPlus size={16}/>Add buildings</button></section>})}</div><label className="schedule-fallback"><input type="checkbox" checked={false} readOnly/><span>Fill unused slots from other buildings</span></label></fieldset>
 {active&&<><div style={{position:'fixed',inset:0,background:'#0007'}}/><div className="schedule-picker" style={{position:'fixed',left:730,top:280}}><header><h2>{days[active.day]} buildings</h2><button><IconX size={20}/></button></header><label className="schedule-source">Spreadsheet<select value={f<active.start+25?'':sourceName} onChange={()=>{}}><option value="">Choose a spreadsheet</option>{leads.map(l=><option key={l.id} value={l.building}>{l.building}</option>)}</select></label><input readOnly value="" placeholder="Search spreadsheet buildings"/><div className="schedule-picker-list">{f<active.start+25?<p>Choose a spreadsheet to see its buildings.</p>:[sourceName].map((name,i)=><label key={name}><input type="checkbox" checked={active.buildings.includes(name)&&f>=active.select[active.buildings.indexOf(name)]} readOnly/><span>{name}</span></label>)}</div><button className="schedule-save">Done</button></div></>}
 </main></div>
 {!active&&f<95&&<Cursor x={tween(f,10,50,600,345)} y={tween(f,10,50,350,195)} click={tween(f,53,55)}/>}
 {active&&f<active.start+35&&<Cursor x={1010} y={409} click={Math.max(0,1-Math.abs(f-active.start-25)/7)}/>}

 {!active&&slots.some(s=>f>=s.start-18&&f<s.start)&&(()=>{const slot=slots.find(s=>f>=s.start-18&&f<s.start)!;return <Cursor x={450+slot.day*254} y={slot.day===3?529:480} click={tween(f,slot.start-3,slot.start)}/>})()}
 {active&&switching!==undefined&&<Cursor x={1010} y={409} click={Math.max(0,1-Math.abs(f-switching-9)/5)}/>}
 {active&&switching===undefined&&f>=active.start+60&&<Cursor x={f>active.select[active.select.length-1]+7?790:767} y={f>active.select[active.select.length-1]+7?603:528} click={Math.max(...active.select.map(t=>Math.max(0,1-Math.abs(f-t)/7)))}/>}
 {!active&&f>=585&&f<650&&<Cursor x={tween(f,585,625,1110,1540)} y={tween(f,585,625,580,125)} click={tween(f,627,630)}/>}

 </AbsoluteFill>
}
export function Integrations(){const f=useCurrentFrame();const icons=[['sheets.png','Google Sheets'],['excel.svg','Excel'],['gmail.png','Gmail'],['outlook.svg','Outlook'],['calendar.png','Google Calendar']];return <AbsoluteFill style={{justifyContent:'center',alignItems:'center'}}><h1 style={{fontSize:66,marginTop:-95}}>Integrations</h1><div style={{display:'flex',gap:90,marginTop:80}}>{icons.map(([file,label],i)=><div key={file} style={{width:170,textAlign:'center',opacity:tween(f,i*13,i*13+20),transform:`translateY(${tween(f,i*13,i*13+25,22,0)}px)`}}><Img src={asset('workflow/'+file)} style={{height:96,width:96,objectFit:'contain'}}/><div style={{fontSize:23,marginTop:27,color:'#d7d0c5'}}>{label}</div></div>)}</div></AbsoluteFill>}
const scenes:[number,number,React.FC][]=[[0,3,Intro],[3,14,ImportScene],[17,28,Sellers],[45,18,Templates],[63,24,Schedule],[87,20,Market],[107,7,Integrations],[114,18,Assistant],[132,6,Platforms],[138,3,Close]];
export function WorkflowFilm(){return <AbsoluteFill className="accurate-film workflow-film" data-theme="dark"><Audio src={asset('workflow/clean/mix.wav')}/>{scenes.map(([start,duration,Scene])=><Sequence key={start} from={start*30} durationInFrames={duration*30}><Scene/></Sequence>)}</AbsoluteFill>}
