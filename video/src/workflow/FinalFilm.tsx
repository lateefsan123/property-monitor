import React from 'react';
import {AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, useCurrentFrame, interpolate} from 'remotion';
import {IconHome,IconSearch,IconPlus,IconUsers,IconBuildingEstate,IconTable,IconMessage,IconCalendarWeek,IconSettings,IconLogout} from '@tabler/icons-react';
import {AudioLines} from 'lucide-react';
import {Schedule,Integrations} from './WorkflowFilm';
import {ImportScene,Templates,Assistant} from './InteractiveScenes';
import {AppHeader,Sellers,SellerTable} from './SellerScenes';
import {Intro,Market,Platforms,Close} from './SharedScenes';
import {asset,Cursor,Screenshot,tween} from './primitives';
import timeline from './final-timeline.json';
import {RevisedIntegrations} from './RevisedIntegrations';

const components:Record<string,React.FC>={intro:Intro,import:ImportScene,sellers:Sellers,templates:Templates,schedule:Schedule,market:Market,integrations:Integrations,assistant:()=> <Assistant contextual/>,platforms:Platforms};
const targets:Record<string,string>={import:'Spreadsheets',sellers:'Sellers',templates:'Message template',schedule:'Schedule',market:'Listings'};
const navItems=[['Sellers',IconUsers],['Listings',IconBuildingEstate],['Spreadsheets',IconTable],['Message template',IconMessage],['Schedule',IconCalendarWeek]] as const;

function Sidebar({target,frame}:{target:string;frame:number}){
 return <aside className="sidenav" style={{position:'absolute',top:56,left:0,height:1024,zIndex:2200,transform:`translateX(${tween(frame,20,32,-272,0)}px)`,boxShadow:'12px 0 30px #0003'}}>
  <div className="sidenav-group sidenav-group-top">{[['Home',IconHome],['Search',IconSearch],['New',IconPlus]].map(([label,Icon])=><button key={label as string} className={`sidenav-link${label==='Search'?' disabled':''}`}>{React.createElement(Icon as any,{size:20})}<span>{label as string}</span></button>)}</div>
  <div className="sidenav-group">{navItems.map(([label,Icon])=><button key={label} className={`sidenav-link${label===target&&frame>=58?' active':''}`}><Icon size={20}/><span>{label}</span></button>)}</div>
  <div className="sidenav-spacer"/><div className="sidenav-footer"><button className="sidenav-link"><IconSettings size={20}/>Settings</button><button className="sidenav-link"><IconLogout size={20}/>Sign out</button></div>
 </aside>;
}
function Outgoing({id,closed=false,imageName}:{id:string;closed?:boolean;imageName?:string}){
 if(imageName&&(!closed||id==='market'||id==='sellers'))return <Img src={asset(imageName)} style={{width:1920,height:1080}}/>;
 if(id==='import')return <AbsoluteFill className="app-shell"><Screenshot name="01-buildings.png"/><AppHeader page="Listings"/></AbsoluteFill>;
 if(id==='sellers')return <Freeze frame={419}><ImportScene/></Freeze>;
 if(id==='templates')return closed?<AbsoluteFill className="app-shell"><AppHeader page="Sellers"/><SellerTable hot/></AbsoluteFill>:<Freeze frame={839}><Sellers/></Freeze>;
 if(id==='schedule')return closed?<AbsoluteFill className="app-shell"><AppHeader page="Sellers"/><SellerTable hot/></AbsoluteFill>:<Freeze frame={539}><Templates/></Freeze>;
 if(id==='market')return <Freeze frame={719}><Schedule/></Freeze>;
 return <AbsoluteFill className="app-shell"><Screenshot name="01-buildings.png"/><AppHeader page="Listings"/></AbsoluteFill>;
}
function ImportLanding(){return <AbsoluteFill className="app-shell"><AppHeader page="Spreadsheets"/><div style={{position:'absolute',left:390,top:150,width:1140}}><div className="ss-list-toolbar"><label className="ss-list-search"><input placeholder="Search spreadsheets" readOnly/></label><button className="ss-list-add"><IconPlus size={18}/>Add spreadsheet</button></div><div style={{borderTop:'1px solid var(--border)',marginTop:24,padding:80,textAlign:'center',color:'var(--text-muted)'}}>No spreadsheets yet</div></div></AbsoluteFill>}
function Navigation({id,frames,outgoingImage}:{id:string;frames:number;outgoingImage?:string}){
 const raw=useCurrentFrame();const f=raw*90/frames;const modal=id==='templates'||id==='schedule';const closed=!modal||f>=13;
 if(id==='assistant')return <AbsoluteFill className="app-shell"><Outgoing id={id}/><div className="repeat-assistant" style={{position:'absolute',right:24,bottom:24}}><button className="assistant-launcher"><AudioLines size={23}/><span>Ask Repeat</span></button></div><Cursor x={tween(f,12,62,1460,1800)} y={tween(f,12,62,720,1030)} click={Math.max(0,1-Math.abs(f-68)/6)}/></AbsoluteFill>;
 const menuEnd=id==='import'?67:84;
 const selected=navItems.findIndex(([label])=>label===targets[id]);
 const rowY=56+164+selected*42+20;
 return <AbsoluteFill className="app-shell">
  {id==='import'&&f>=menuEnd?<ImportLanding/>:<Outgoing id={id} closed={closed} imageName={outgoingImage}/>}
  {modal&&!closed&&<Cursor x={id==='templates'?1462:1621} y={id==='templates'?159:141} click={Math.max(0,1-Math.abs(f-10)/4)}/>}
  {closed&&f<menuEnd&&<><div style={{position:'absolute',inset:56,background:'transparent'}}/>{f>=20&&<Sidebar target={targets[id]} frame={f}/>}<Cursor x={f<30?tween(f,14,19,220,32):tween(f,32,55,32,150)} y={f<30?tween(f,14,19,120,26):tween(f,32,55,26,rowY)} click={Math.max(0,1-Math.abs(f-(f<30?20:62))/5)}/></>}
  {id==='import'&&f>=menuEnd&&<Cursor x={tween(f,67,84,150,1435)} y={tween(f,67,84,rowY,175)} click={Math.max(0,1-Math.abs(f-88)/3)}/>}
 </AbsoluteFill>;
}
function Scene({row}:{row:any}){
 const f=useCurrentFrame(),SceneComponent=components[row.id],nav=row.navigation*30,body=row.frames-nav;
 if(row.transitionTo&&f>=row.transitionFrom)return <Sequence from={row.transitionFrom}><Navigation id={row.transitionTo} frames={row.frames-row.transitionFrom} outgoingImage={row.captureHold}/></Sequence>;
 if(f<nav)return <Navigation id={row.id} frames={nav} outgoingImage={row.outgoingImage}/>;
 if(row.capture){const local=f-nav;return <Sequence from={nav}>{local<row.captureFrames?<OffthreadVideo src={asset(row.capture)} muted style={{width:1920,height:1080}}/>:<Img src={asset(row.captureHold)} style={{width:1920,height:1080}}/>}</Sequence>}
 if(row.id==='integrations'&&row.cues)return <RevisedIntegrations words={row.words}/>;
 const local=f-nav;
 // Keep reading time at the end, while actions continue at a comfortable pace.
 let mapped=local*(row.baseSeconds*30-1)/Math.max(1,body-1);
 if(row.id==='sellers')mapped=interpolate(local,[0,5*30,8*30,11*30,14*30,19*30,body-1],[0,136,294,408,500,680,839],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 if(row.id==='schedule')mapped=interpolate(local,[0,Math.min(body-45,15*30),body-1],[0,640,719],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 if(row.cues)mapped=interpolate(f,row.cues.map((cue:number[])=>cue[0]),row.cues.map((cue:number[])=>cue[1]),{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return <Freeze frame={Math.floor(mapped)}><SceneComponent/></Freeze>;
}
export function FinalFilm({edit=timeline,audio='workflow/final/mix.wav'}:{edit?:typeof timeline;audio?:string}){return <AbsoluteFill className="accurate-film workflow-film" data-theme="dark"><Audio src={asset(audio)}/>{edit.scenes.map(row=><Sequence key={row.id} from={row.from} durationInFrames={row.frames}><Scene row={row}/></Sequence>)}<Sequence from={edit.closeFrom} durationInFrames={90}><Close/><div style={{position:'absolute',bottom:310,width:'100%',textAlign:'center',fontSize:28,color:'#c7c2b9'}}>repeatai.org</div></Sequence></AbsoluteFill>}
