import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {RepeatAIReferenceOpening} from './RepeatAIReferenceOpening';
// @ts-expect-error Existing product presentation components are JavaScript.
import {MarketPanel, MessagePanel} from '../../src/features/seller-signal/components/LeadModalPanels';
import './repeat-ai-clean-film.css';
import './repeat-ai-connected-film.css';

const p=(f:number,a:number,b:number)=>interpolate(f,[a,b],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const show=(f:number,a:number,b:number)=>p(f,a,a+13)*(1-p(f,b,b+13));
const ink='#242424', line='#e8e8e8';
const lead={name:'Sara',building:'Marina Tower'};
const insight={status:'ready',locationName:'Marina Tower',count:1,avg:2400000,min:2400000,max:2400000,psf:1702,recentTransactions:[{id:'illustrative-sale',date:'2026-09-18T12:00:00Z',locationLabel:'Marina Tower',price:2400000,beds:2,area:1410}]};
const message='Hi Sara, a recent sale in Marina Tower:\n\n2 bed · 1,410 sq ft · AED 2.4M\n\nWant to discuss how yours compares?';
const noop=()=>{};

const Doodle:React.FC<{cell:number;width?:number}>=({cell,width=200})=><div style={{width,height:width/1.5,overflow:'hidden',position:'relative'}}><Img src={staticFile('video/repeat-ai-v8/activities.png')} style={{position:'absolute',width:'200%',height:'200%',maxWidth:'none',left:`${-(cell%2)*100}%`,top:`${-Math.floor(cell/2)*100}%`}}/></div>;
const Broker:React.FC<{frame:number}>=({frame})=>{const cell=[2,2,1,1,2,3][Math.floor(frame/13)%6];return <div style={{width:315,height:315,position:'relative',overflow:'hidden',clipPath:'inset(0 0 0 8%)'}}><Img src={staticFile('video/repeat-ai-v8/broker.png')} style={{position:'absolute',width:'200%',height:'200%',maxWidth:'none',left:`${-(cell%2)*100}%`,top:`${-Math.floor(cell/2)*100}%`}}/></div>;};
const Tab:React.FC<{active:boolean;children:React.ReactNode}>=({active,children})=><span style={{padding:'13px 18px',borderBottom:active?'2px solid #242424':'2px solid transparent',color:active?ink:'#89909a',fontSize:16}}>{children}</span>;

export const RepeatAIConnectedFilm:React.FC=()=>{
 const f=useCurrentFrame();
 const start=p(f,354,372), detail=p(f,454,474), compose=p(f,616,638), send=p(f,754,778), auto=p(f,932,955), end=p(f,1115,1140);
 const head=f<452?'Your sellers, one place.':f<616?'Give every follow-up a reason.':f<752?'Make it personal.':f<932?'Start a useful conversation.':'Keep the follow-ups moving.';
 const windowLeft=mix(73,144,detail), windowWidth=mix(814,672,detail);
 const chatLeft=mix(144,400,send);
 const typed=message.slice(0,Math.round(mix(74,message.length,p(f,652,714))));
 return <AbsoluteFill style={{background:'#fafafa',fontFamily:'Arial, sans-serif',color:ink}}>
  <Audio src={staticFile('video/repeat-ai-storyboard/sunlit-walkthrough.mp3')} volume={t=>.30*p(t,0,12)*(1-p(t,1225,1259))}/>
  <Sequence durationInFrames={374}><RepeatAIReferenceOpening muted/></Sequence>
  <div className="repeat-clean-film repeat-connected-film" style={{position:'absolute',width:960,height:540,transform:'scale(2)',transformOrigin:'top left',opacity:start,overflow:'hidden'}}>
   <div style={{position:'absolute',inset:0,background:'#fafafa',opacity:1-end}}/>
   <div style={{position:'absolute',left:73,top:38,fontSize:19,fontWeight:700,opacity:1-end}}>Repeat AI</div>
   <div style={{position:'absolute',left:73,top:101,fontSize:35,fontWeight:600,letterSpacing:-1,opacity:1-end}}>{head}</div>

   {/* One workspace opens a source, then the same seller; the frame persists. */}
   <div style={{position:'absolute',left:windowLeft,top:175-detail*17,width:windowWidth,height:265+detail*85,border:`1px solid ${line}`,borderRadius:10,background:'#fff',overflow:'hidden',opacity:1-send,transform:`translateX(${-send*45}px)`}}>
    <div style={{height:64,display:'flex',alignItems:'center',padding:'0 26px',gap:18,borderBottom:`1px solid ${line}`,fontSize:21,fontWeight:600}}>{detail>.5?'Sara':'Marina sellers'}<span style={{fontSize:15,fontWeight:400,color:'#64748b',opacity:detail}}>Marina Tower</span></div>
    <div style={{position:'absolute',top:65,left:0,right:0,opacity:1-detail}}>
     {['Sara','Adam','Maya'].map((name,i)=><div key={name} style={{height:65,padding:'0 26px',display:'flex',alignItems:'center',borderBottom:`1px solid ${line}`,background:i===0?`rgba(249,225,180,${p(f,410,429)*.55})`:'#fff',opacity:p(f,366+i*8,382+i*8),transform:`translateY(${(1-p(f,366+i*8,382+i*8))*12}px)`}}><span style={{fontSize:20,width:280}}>{name}</span><span style={{fontSize:17,color:'#64748b'}}>Marina Tower</span><span style={{marginLeft:'auto',fontSize:20}}>›</span></div>)}
    </div>
    <div style={{position:'absolute',top:65,left:0,right:0,opacity:detail}}>
     <div style={{display:'flex',paddingLeft:12,borderBottom:`1px solid ${line}`}}><Tab active={compose<.5}>Market data</Tab><Tab active={compose>=.5}>Message</Tab></div>
     <div style={{position:'absolute',top:70,left:27,right:27,opacity:1-compose,transform:`translateX(${-compose*22}px)`}}><MarketPanel insight={insight} lead={lead}/><div style={{height:4,width:`${p(f,534,560)*125}px`,background:'#f5da9f',position:'absolute',left:189,top:137,opacity:.8}}/></div>
     <div style={{position:'absolute',top:67,left:27,right:27,opacity:compose,transform:`translateX(${(1-compose)*22}px)`}}><MessagePanel edited={false} imageUrl={null} message={typed} onChangeMessage={noop} onResetMessage={noop} onSelectTemplate={noop} selectedTemplateId="default" templateOptions={[{id:'default',label:'Transaction update'}]} whatsappConnected/><div style={{textAlign:'right',marginTop:14}}><span style={{display:'inline-block',padding:'11px 18px',borderRadius:7,background:'#242424',color:'white',fontSize:16,transform:`scale(${1-Math.sin(p(f,740,754)*Math.PI)*.06})`}}>Send via WhatsApp</span></div></div>
    </div>
   </div>

   {/* The same message becomes the outgoing WhatsApp bubble. No new example/data. */}
   <div style={{position:'absolute',left:chatLeft,top:160,width:440,height:345,background:'#efeae2',borderRadius:15,overflow:'hidden',border:'1px solid #dedbd5',opacity:send*(1-auto),transform:`translateY(${-auto*25}px)`}}>
    <div style={{height:52,background:'#fff',display:'flex',alignItems:'center',gap:13,padding:'0 18px',fontSize:18}}>‹<span style={{width:29,height:29,display:'grid',placeItems:'center',borderRadius:'50%',background:'#eee',fontSize:14}}>S</span>Sara<span style={{marginLeft:'auto'}}>⋮</span></div>
    <div style={{position:'absolute',left:43,top:68,width:355,padding:16,boxSizing:'border-box',borderRadius:'10px 0 10px 10px',background:'#d9fdd3',fontSize:17,lineHeight:1.38,whiteSpace:'pre-line'}}>{message}<div style={{fontSize:10,textAlign:'right',color:'#6e8171',marginTop:5}}>10:24　<span style={{color:f>812?'#53bdeb':undefined}}>✓✓</span></div></div>
    <div style={{position:'absolute',left:14,top:260,width:320,background:'#fff',padding:'13px 15px',borderRadius:'0 10px 10px 10px',fontSize:17,opacity:p(f,852,868),transform:`translateY(${(1-p(f,852,868))*12}px)`}}>Yes, can we talk this afternoon?</div>
   </div>
   <div style={{position:'absolute',left:66,top:222,opacity:show(f,770,931)}}><Doodle cell={2} width={240}/><div style={{fontFamily:'Segoe Print, cursive',fontSize:19,marginTop:12,textAlign:'center'}}>A conversation,<br/>not another cold message.</div></div>

   <div style={{position:'absolute',left:73,top:195,width:520,opacity:auto*(1-end),transform:`translateY(${(1-auto)*20}px)`}}>
    <div style={{background:'white',border:`1px solid ${line}`,borderRadius:10,padding:27}}><div style={{fontSize:21,fontWeight:600,marginBottom:24}}>Automations</div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,fontSize:18}}>Transaction update automation<div style={{position:'relative',width:46,height:26,flexShrink:0,borderRadius:20,background:f<999?'#d1d5db':ink}}><div style={{position:'absolute',left:mix(3,23,p(f,995,1008)),top:3,width:20,height:20,borderRadius:'50%',background:'white'}}/></div></div></div>
    <div style={{fontSize:23,lineHeight:1.5,marginTop:23,opacity:p(f,1020,1040)}}>Relevant updates.<br/>Without chasing every reminder.</div>
   </div>
   <div style={{position:'absolute',left:642,top:218,opacity:auto*(1-end)}}><Doodle cell={3} width={245}/></div>

   <div style={{position:'absolute',inset:0,background:'#fff',opacity:end}}>
    <div style={{position:'absolute',left:80,top:151,transform:`translateX(${(1-end)*-20}px)`}}><Broker frame={f}/></div>
    <div style={{position:'absolute',left:455,top:157,transform:`translateY(${(1-end)*20}px)`}}><div style={{fontSize:43,fontWeight:700,letterSpacing:-1}}>Repeat AI</div><div style={{fontSize:30,lineHeight:1.2,marginTop:22}}>Less admin.<br/>Better seller follow-ups.</div><div style={{display:'inline-block',marginTop:28,padding:'13px 22px',background:ink,color:'white',borderRadius:7,fontSize:19,opacity:p(f,1170,1189)}}>Get started</div></div>
   </div>
  </div>
 </AbsoluteFill>;
};
