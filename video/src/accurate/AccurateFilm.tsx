import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import '../../../src/features/schedule/schedule.css';
import '../../../src/voice/voice.css';
import './film.css';

const asset = staticFile;
const tween=(f:number,a:number,b:number,x=0,y=1)=>interpolate(f,[a,b],[x,y],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});
const pos=(x:number,y:number):React.CSSProperties=>({position:'absolute',left:x,top:y});
const Screenshot=({name,style={}}:{name:string;style?:React.CSSProperties})=><Img src={asset(name)} style={{width:1920,height:1080,...style}}/>;
const Cursor=({x,y,click=0}:{x:number;y:number;click?:number})=><div style={{...pos(x,y),transform:`scale(${1-.16*click})`,transformOrigin:'3px 3px',filter:'drop-shadow(0 2px 3px #0008)'}}><svg width="30" height="38" viewBox="0 0 30 38"><path d="M3 2L3 29L10 22L17 35L23 32L16 20L27 20Z" fill="#fff" stroke="#242423" strokeWidth="2"/></svg></div>;
const Caption=({children}:{children:React.ReactNode})=><div className="film-caption">{children}</div>;
const Focus=({children,scale=1,x=960,y=540}:{children:React.ReactNode;scale?:number;x?:number;y?:number})=><AbsoluteFill style={{transform:`translate(${960-x*scale}px,${540-y*scale}px) scale(${scale})`,transformOrigin:'0 0'}}>{children}</AbsoluteFill>;
const Clip=({name,frames,hold}:{name:string;frames:number;hold:string})=>{
 const f=useCurrentFrame();
 return f<frames?<OffthreadVideo src={asset(name)} muted style={{width:1920,height:1080}}/>:<Screenshot name={hold}/>;
};
function Intro(){const f=useCurrentFrame();return <AbsoluteFill className="brand-scene">
 <Img src={asset('logo.png')} style={{...pos(150,130),width:270}}/>
 <div style={{...pos(150,380),fontSize:86,lineHeight:1.12,letterSpacing:-4,fontWeight:500}}>{['Your buildings.','Your sellers.','Your next conversation.'].map((s,i)=><div key={s} style={{opacity:tween(f,i*24,i*24+18),transform:`translateY(${tween(f,i*24,i*24+22,20,0)}px)`}}>{s}</div>)}</div>
 <Img src={asset('architecture.png')} style={{...pos(1000,180),width:870,opacity:tween(f,20,65,.0,.72),filter:'grayscale(1)',transform:`translateY(${tween(f,20,100,35,0)}px)`}}/>
 </AbsoluteFill>}
function Sellers(){const f=useCurrentFrame();const z=tween(f,35,95,1,1.24);return <AbsoluteFill>
 <Focus scale={z} x={960} y={tween(f,35,95,540,430)}><Clip name="spreadsheet-search.mp4" frames={320} hold="08-spreadsheet-search.png"/>
 {f<145&&<Cursor x={tween(f,0,40,1120,640)} y={tween(f,0,40,330,129)}/>}</Focus>
 <Caption>Find the building. Bring its sellers together.</Caption>
 </AbsoluteFill>}
function Market(){const f=useCurrentFrame();return <AbsoluteFill>
 <Focus scale={f<440?tween(f,0,35,1,1.08):tween(f,440,490,1.08,1.65)} x={f<440?960:tween(f,440,490,960,780)} y={f<440?tween(f,0,35,540,530):tween(f,440,490,530,500)}>
 {f<60?<Screenshot name="01-buildings.png"/>:f<360?<Sequence from={60}><Clip name="burj-listings.mp4" frames={300} hold="12-burj-detail.png"/></Sequence>:<Sequence from={360}><Clip name="price-history.mp4" frames={173} hold="13-price-activity.png"/></Sequence>}
 {f>=75&&f<117&&<Cursor x={tween(f,75,105,1030,905)} y={tween(f,75,105,420,272)} click={tween(f,108,110,0,1)}/>}
 {f>=195&&f<230&&<Cursor x={tween(f,195,220,1250,1100)} y={tween(f,195,220,580,425)} click={tween(f,218,220,0,1)}/>}
 {f>=395&&f<439&&<Cursor x={tween(f,395,423,1250,1600)} y={tween(f,395,423,540,413)} click={tween(f,423,427,0,1)}/>}
 </Focus>
 <Caption>{f<360?'Track asking-price changes across the buildings you cover.':'See the price change — and the dated activity behind it.'}</Caption>
 </AbsoluteFill>}

const query='Show asking prices in Burj Khalifa';
// Actual captured panel, with frame-controlled typing over its real composer.
function Assistant(){const f=useCurrentFrame();const sent=f>=105;
 return <AbsoluteFill className="app-shell">
 <div style={{...pos(135,235),width:690}}><div className="eyebrow">ASK REPEAT</div><h1>Start with<br/>a useful question.</h1><p className="editorial-copy">{f<325?'Get context for the buildings you cover.':'Type a question. Or choose “Let’s talk”.'}</p><div style={{marginTop:44,fontSize:21,color:'#aaa296',maxWidth:540,opacity:tween(f,210,240)}}>Asking prices, with the source and sample limits explained.</div></div>
 <div style={{...pos(1090,95),width:420,height:700,overflow:'hidden',borderRadius:22,transform:'scale(1.25)',transformOrigin:'top left'}}>
 <Screenshot name={sent?'11-assistant-answer.png':'10-assistant.png'} style={{position:'absolute',left:-1476,top:-356,maxWidth:'none'}}/>
 {!sent&&<div style={{...pos(29,530),width:295,minHeight:39,padding:'5px 0',fontSize:14,lineHeight:1.5,background:'#2a2a28',color:'#ece8df'}}>{query.slice(0,Math.round(tween(f,15,90,0,query.length)))}{f<94&&<span style={{opacity:Math.floor(f/12)%2===0?1:0}}>│</span>}</div>}
 </div>
 {f>=80&&f<115&&<Cursor x={tween(f,80,100,1440,1553)} y={tween(f,80,100,845,794)} click={tween(f,100,105)}/>}
 {f>=355&&<Cursor x={tween(f,355,385,1630,1400)} y={tween(f,355,385,980,884)}/>}
 </AbsoluteFill>
}
function Templates(){const f=useCurrentFrame();return <AbsoluteFill>
 <Focus scale={1.2} x={960} y={515}><Clip name="template-edit.mp4" frames={343} hold="09-template-preview.png"/></Focus>
 <Caption>{f<210?'Write it in your own words.':'Name, building and transactions become a personal message.'}</Caption>
 </AbsoluteFill>}

function ScheduleScene(){const f=useCurrentFrame();const enabled=f>=60,modal=f>=125&&f<275,checked=f>=225,saved=f>=330;
 const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 return <AbsoluteFill data-theme="dark">
 <Screenshot name="03-schedule.png"/>
 <div style={{...pos(0,56),width:1920,height:910,background:'#1f1f1e'}}>
 <main className="schedule-page"><header className="schedule-heading"><div className="schedule-heading-actions"><button className="schedule-save" disabled={!enabled||saved}>{saved?'Saved':'Save'}</button></div></header><fieldset className="schedule-controls"><label className="schedule-enable"><input type="checkbox" checked={enabled} readOnly/>Weekly schedule</label><div className="schedule-board">{days.map((day,i)=><section className="schedule-day" key={day}><h2>{day}</h2><div className="schedule-buildings">{i===0&&checked?<div className="schedule-building"><span>IMPERIAL AVENUE</span><button>×</button></div>:<p className="schedule-off">No sends</p>}</div><button className="schedule-add">＋ Add buildings</button></section>)}</div><label className="schedule-fallback"><input type="checkbox" checked={false} readOnly/><span>Fill unused slots from other buildings</span></label></fieldset>
 {modal&&<><div style={{position:'fixed',inset:0,background:'#0007'}}/><div className="schedule-picker" style={{position:'fixed',left:730,top:f<160?189:372,boxSizing:'border-box'}}><header><h2>Monday buildings</h2><button>×</button></header><input value={'Imperial'.slice(0,Math.round(tween(f,150,205,0,8)))} readOnly placeholder="Search your buildings"/><div className="schedule-picker-list">{(f<160?['29 Boulevard t2','29 Boulevard Tower 1, Downtown Dubai','29 Boulevard, Downtown Dubai','Act tower 2','Act towers 1','Ahad residence','Bay square','Bellevue Tower 2, Downtown Dubai','Boulevard Central 1, Downtown Dubai','Boulevard Central 2, Downtown Dubai']:['IMPERIAL AVENUE','Imperial Avenue, Downtown Dubai']).map((name,i)=><label key={name}><input type="checkbox" checked={i===0&&checked} readOnly/><span>{name}</span></label>)}</div><button className="schedule-save">Done</button></div></>}
 </main></div>
 {f<120&&<Cursor x={f<78?tween(f,15,55,600,345):tween(f,78,115,345,450)} y={f<78?tween(f,15,55,320,195):tween(f,78,115,195,480)} click={f<78?tween(f,57,60):tween(f,118,120)}/>}
 {f>=205&&f<285&&<Cursor x={f<240?tween(f,205,220,1040,768):tween(f,245,270,768,790)} y={f<240?tween(f,205,220,480,541):tween(f,245,270,541,660)} click={f<240?tween(f,223,225):tween(f,273,275)}/>}
 {f>=290&&f<347&&<Cursor x={tween(f,290,325,800,1540)} y={tween(f,290,325,660,125)} click={tween(f,328,330)}/>}
 <Caption>{f<275?'Choose a day. Search and select the building.':f<350?'Done returns to the week. Save applies the plan.':'Repeats weekly in Dubai time. Empty days stay off.'}</Caption>
 </AbsoluteFill>
}
function Tools(){const f=useCurrentFrame();return <AbsoluteFill>
 <div style={{...pos(120,220),width:560}}><div className="eyebrow">CONNECTED TO YOUR DAY</div><h1 style={{fontSize:66}}>Your everyday<br/>tools, together.</h1><p className="editorial-copy">{f<215?'Read, write and reply. Confirm every email send.':'See upcoming calendar events with read-only access.'}</p><div style={{marginTop:50,opacity:tween(f,335,365),fontSize:27,lineHeight:1.6}}>Claude + ChatGPT<br/><span style={{color:'#aaa296',fontSize:21}}>Connect through MCP</span></div></div>
 <div style={{...pos(760,200),width:1040,height:647,overflow:'hidden',borderRadius:18,border:'1px solid #44413d'}}><div style={{width:900,height:560,transform:'scale(1.15556)',transformOrigin:'top left'}}>
 <Img src={asset('14-integrations.png')} style={{position:'absolute',width:900,height:560,clipPath:'inset(0 699px 0 0)'}}/>
 <div style={{...pos(201,0),width:699,height:560,overflow:'hidden'}}><div style={{position:'absolute',top:-tween(f,190,230,0,320),width:699,height:880}}>
 <Img src={asset('14-integrations.png')} style={{position:'absolute',left:-201,width:900,height:560}}/>
 <div style={{...pos(0,560),width:699,height:320,overflow:'hidden'}}><Img src={asset('15-calendars.png')} style={{position:'absolute',left:-201,top:-240,width:900,height:560}}/></div>
 </div></div></div></div>
 </AbsoluteFill>}
function Platforms(){const f=useCurrentFrame();return <AbsoluteFill>
 <div style={{...pos(130,95)}}><div className="eyebrow">WHEREVER THE DAY TAKES YOU</div><h1 style={{fontSize:60,marginTop:22}}>Web. Windows. Mobile.</h1></div>
 <div style={{...pos(125,335),width:1240,height:698,overflow:'hidden',border:'1px solid #44413d',borderRadius:12,transform:`translateY(${tween(f,0,30,24,0)}px)`}}><Screenshot name="01-buildings.png" style={{width:1240,height:697.5}}/></div>
 <Img src={asset('native-iphone.png')} style={{...pos(1440,130),height:840,width:388,borderRadius:36,border:'7px solid #393936',boxSizing:'content-box',transform:`translateY(${tween(f,20,55,55,0)}px)`,opacity:tween(f,20,45)}}/>
 </AbsoluteFill>}
function Close(){const f=useCurrentFrame();return <AbsoluteFill className="brand-scene" style={{alignItems:'center',justifyContent:'center'}}><Img src={asset('logo.png')} style={{width:450,opacity:tween(f,0,18)}}/><div style={{marginTop:55,fontSize:56,letterSpacing:-2,opacity:tween(f,15,35)}}>Less admin. Better conversations.</div></AbsoluteFill>}
export function AccurateFilm(){return <AbsoluteFill className="accurate-film" data-theme="dark">
 <Audio src={asset('mix.wav')}/>
 {[[0,7,Intro],[7,13,Sellers],[20,20,Market],[40,16,Assistant],[56,16,Templates],[72,20,ScheduleScene],[92,16,Tools],[108,10,Platforms],[118,5,Close]].map(([start,duration,Scene])=><Sequence key={start as number} from={(start as number)*30} durationInFrames={(duration as number)*30}>{React.createElement(Scene as React.FC)}</Sequence>)}
 </AbsoluteFill>}
