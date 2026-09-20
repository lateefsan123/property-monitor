import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';

const ramp=(f:number,a:number,b:number)=>interpolate(f,[a,b],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});
const asset=(s:string)=>staticFile(`video/repeat-ai-v8/${s}.png`);
const Sprite:React.FC<{name:string;cell:number}>=({name,cell})=><div style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',clipPath:name==='broker'?'inset(0 0 0 8%)':undefined}}><Img src={asset(name)} style={{position:'absolute',width:'200%',height:'200%',maxWidth:'none',left:`${-(cell%2)*100}%`,top:`${-Math.floor(cell/2)*100}%`}}/></div>;

// One stable canvas: each task is drawn in its final position, not flown in as a card.
const Activity:React.FC<{f:number;start:number;x:number;y:number;width:number;cell:number;label:string;tilt?:number}>=({f,start,x,y,width,cell,label,tilt=0})=>{
 const reveal=ramp(f,start,start+24);
 const accent=ramp(f,215+cell*3,232+cell*3);
 return <div style={{position:'absolute',left:x,top:y,width,transform:`rotate(${tilt}deg)`}}>
  <div style={{position:'absolute',left:'25%',top:'25%',width:'53%',height:'45%',borderRadius:'46% 54% 41% 59%',background:['#fce6b6','#dcebf3','#f8dfd5','#e3ead8'][cell],opacity:accent*.8}}/>
  <div style={{height:width/1.5,clipPath:`inset(0 ${100-reveal*100}% 0 0)`}}><Sprite name="activities" cell={cell}/></div>
  <div style={{fontFamily:'Segoe Print, cursive',fontSize:17,textAlign:'center',opacity:ramp(f,start+16,start+30),transform:`translateY(${5*(1-reveal)}px)`}}>{label}</div>
 </div>;
};

export const RepeatAIReferenceOpening:React.FC=()=>{
 const f=useCurrentFrame();
 const handoff=ramp(f,252,269);
 const pose=f<90?0:[0,1,2,1,0,3][Math.floor(f/11)%6];
 return <AbsoluteFill style={{background:'#fff',fontFamily:'Arial, sans-serif',color:'#242424'}}>
  <Audio src={staticFile('video/repeat-ai-storyboard/sunlit-walkthrough.mp3')} volume={t=>.32*ramp(t,0,12)*(1-ramp(t,344,359))}/>
  <div style={{position:'absolute',width:960,height:540,transform:'scale(2)',transformOrigin:'top left',overflow:'hidden'}}>
   <div style={{position:'absolute',inset:0,opacity:1-handoff,transform:`translateY(${-handoff*22}px) scale(${1+handoff*.03})`,backgroundImage:'radial-gradient(#dededb .6px, transparent .7px)',backgroundSize:'16px 16px'}}>
    <Activity f={f} start={0} x={70} y={58} width={260} cell={0} label="Find the right spreadsheet" tilt={-3}/>
    <Activity f={f} start={88} x={577} y={37} width={285} cell={1} label="Check what changed" tilt={2}/>
    <Activity f={f} start={126} x={77} y={299} width={240} cell={2} label="Reply to sellers" tilt={-2}/>
    <Activity f={f} start={166} x={635} y={291} width={236} cell={3} label="Remember to follow up" tilt={3}/>
    <div style={{position:'absolute',left:340,top:191,width:267,height:267,clipPath:`inset(0 0 ${100-ramp(f,43,68)*100}% 0)`}}><Sprite name="broker" cell={pose}/></div>
    {Array.from({length:15},(_,i)=>{const t=i/14;return <div key={i} style={{position:'absolute',left:320+t*304,top:137-30*Math.sin(t*Math.PI),width:3,height:2,borderRadius:2,background:'#777',opacity:ramp(f,105+i*2,110+i*2),transform:`rotate(${(t-.5)*45}deg)`}}/>;})}
    <div style={{position:'absolute',left:622,top:123,fontSize:22,opacity:ramp(f,137,145),transform:'rotate(28deg)'}}>›</div>
   </div>
   <div style={{position:'absolute',inset:0,background:'#fafafa',opacity:handoff,transform:`translateY(${(1-handoff)*24}px)`}}>
    <div style={{position:'absolute',left:73,top:38,fontSize:19,fontWeight:700}}>Repeat AI</div>
    <div style={{position:'absolute',left:73,top:101,fontSize:35,fontWeight:600,letterSpacing:-1}}>All your spreadsheets, together.</div>
    <div style={{position:'absolute',left:73,top:175,width:814,background:'white',border:'1px solid #e8e8e8',borderRadius:10,overflow:'hidden'}}>
     <div style={{padding:'21px 26px',fontSize:21,fontWeight:600,borderBottom:'1px solid #eee'}}>Spreadsheets</div>
     {['Marina sellers.xlsx','Downtown owners.csv','Palm contacts.xlsx'].map((name,i)=>{const p=ramp(f,269+i*13,284+i*13);return <div key={name} style={{height:65,display:'flex',alignItems:'center',gap:17,padding:'0 26px',borderBottom:i<2?'1px solid #f0f0f0':'none',opacity:p,transform:`translateY(${(1-p)*10}px)`}}><div style={{width:25,height:30,border:'1px solid #a5adb5',borderRadius:3,display:'grid',gridTemplateColumns:'1fr 1fr',gap:3,padding:4}}>{Array.from({length:6},(_,n)=><span key={n} style={{background:'#dce0e3'}}/>)}</div><span style={{fontSize:20,color:'#334155'}}>{name}</span><span style={{marginLeft:'auto',fontSize:18,color:'#94a3b8'}}>›</span></div>;})}
    </div>
   </div>
  </div>
 </AbsoluteFill>;
};
