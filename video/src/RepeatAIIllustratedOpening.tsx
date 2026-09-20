import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';

const paper = '#faf9f3';
const green = '#286347';
const ink = '#27362c';
const p = (f: number, a: number, b: number) => interpolate(f,[a,b],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});
const mix = (a:number,b:number,t:number) => a+(b-a)*t;
const art = (name:string) => staticFile(`video/repeat-ai-v4/${name}.png`);
const poses = [0,0,1,1,2,2,1,1,0,0,3,3];
export const Broker: React.FC<{frame:number}> = ({frame}) => {
  const pose=poses[Math.floor(Math.max(0,frame)/6)%poses.length];
  return <div style={{width:'100%',height:'100%',clipPath:'inset(0 -5% 0 8%)',position:'relative'}}>
    <Img src={art('broker-suit-poses')} style={{position:'absolute',width:'200%',height:'200%',maxWidth:'none',left:`${-(pose%2)*100}%`,top:`${-Math.floor(pose/2)*100}%`}}/>
  </div>;
};

export const RepeatAIBrokerLoop: React.FC = () => {
  const f=useCurrentFrame();
  return <AbsoluteFill style={{background:paper,alignItems:'center',justifyContent:'center'}}><div style={{width:650,height:650,transform:`rotate(${Math.sin(f/72*Math.PI*2)*.6}deg)`}}><Broker frame={f}/></div></AbsoluteFill>;
};
const objects = [
  {name:'property',label:'A price drops',x:360,y:235,size:420,start:0,angle:-9},
  {name:'broker-phone',label:'A seller calls',x:905,y:415,size:630,start:25,angle:0},
  {name:'messages',label:'Messages keep coming',x:1490,y:285,size:415,start:66,angle:8},
  {name:'notes',label:'Another follow-up',x:1420,y:795,size:450,start:105,angle:-7},
];

export const RepeatAIIllustratedOpening: React.FC<{narration?:boolean}> = ({narration=true}) => {
  const f=useCurrentFrame();
  const gather=p(f,220,290);
  const focus=p(f,317,350);
  const ui=p(f,241,271);
  const message='Hi Sara, a similar apartment in your building just dropped 5%. Shall we review your price?';
  const typed=message.slice(0,Math.floor(p(f,359,420)*message.length));
  return <AbsoluteFill style={{background:paper,color:ink,fontFamily:'Inter, Arial, sans-serif',overflow:'hidden'}}>
    {narration && <Audio src={staticFile('video/repeat-ai-v5/voice-only.wav')} endAt={450}/>}
    <div style={{position:'absolute',left:310,top:720,opacity:p(f,152,176)*(1-gather),transform:`translateY(${mix(15,0,p(f,152,176))}px)`}}>
      <div style={{fontSize:53,fontWeight:500,letterSpacing:-2}}>It all adds up.</div>
      <div style={{marginTop:20,height:5,width:mix(0,215,p(f,173,193)),background:'#b6c9a4',borderRadius:5,transform:'rotate(-3deg)'}}/>
    </div>
    <div style={{position:'absolute',left:430,top:172,width:1060,height:714,border:'1px solid #dce3d7',borderRadius:24,background:'#fff',opacity:ui*(1-focus),transform:`scale(${mix(.97,1,ui)})`,boxShadow:'0 18px 65px #304a3010'}}>
      <div style={{height:98,background:'#edf2e7',borderRadius:'24px 24px 0 0',display:'flex',alignItems:'center',padding:'0 45px',justifyContent:'space-between'}}><span style={{fontSize:30,fontWeight:650,color:green}}>Repeat AI</span><span style={{fontSize:20,color:'#74806f'}}>Your signals</span></div>
      {objects.map((o,i)=><div key={o.name} style={{position:'absolute',top:122+i*130,left:120,right:45,height:114,borderBottom:'1px solid #edf0e8',display:'flex',alignItems:'center',justifyContent:'space-between',opacity:p(f,271+i*5,286+i*5)}}><span style={{fontSize:28}}>{['Price dropped 5%','Seller called','Message waiting','Follow-up due'][i]}</span><span style={{fontSize:18,color:'#7c8976'}}>{i===0?'Just now':'Today'}</span></div>)}
    </div>
    {objects.map((o,i)=>{
      const enter=p(f,o.start,o.start+25);
      const t=p(f,220+i*5,274+i*5);
      const x=mix(o.x,492,t);
      const y=mix(o.y,350+i*130,t);
      const size=mix(o.size,72,t);
      const living=Math.sin((f-o.start)/17+i)*2.1*(1-t);
      // Raster artwork stays separate from the interface and follows a curved path.
      return <div key={o.name} style={{position:'absolute',left:x-size/2,top:y-size/2-Math.sin(t*Math.PI)*100,width:size,height:size,opacity:enter*(1-focus),transform:`translateY(${mix(48,0,enter)}px) rotate(${mix(o.angle,0,t)+living}deg) scale(${mix(.78,1,enter)})`}}>
        {o.name==='broker-phone'?<Broker frame={f-o.start}/>:<Img src={art(o.name)} style={{width:'100%',height:'100%',objectFit:'contain'}}/>}
        <div style={{position:'absolute',top:'95%',left:-80,right:-80,textAlign:'center',fontSize:24,opacity:p(f,o.start+25,o.start+40)*(1-t)}}>{o.label}</div>
      </div>;
    })}
    {/* The selected signal stays in place, then opens into its seller context. */}
    <div style={{position:'absolute',left:mix(452,330,focus),top:mix(298,340,focus),width:mix(1016,1260,focus),height:mix(112,620,focus),borderRadius:20,background:'#f0f5eb',border:`2px solid ${green}`,opacity:p(f,298,315),boxShadow:`0 ${mix(0,20,focus)}px 70px #304a3009`}}>
      <div style={{position:'absolute',left:24,top:17,display:'flex',alignItems:'center',gap:26}}><Img src={art('property')} style={{width:78,height:78,objectFit:'contain'}}/><span style={{fontSize:30,fontWeight:500}}>Price dropped 5%</span></div>
      <span style={{position:'absolute',right:50,top:44,fontSize:22,color:green}}>Marina · 2 bedroom</span>
      <div style={{opacity:focus,position:'absolute',top:132,left:50,right:50,borderTop:'1px solid #cedac9',paddingTop:32}}>
        <div style={{display:'flex',gap:18,alignItems:'center'}}><div style={{width:58,height:58,background:'#dbe8d2',borderRadius:'50%',display:'grid',placeItems:'center',fontSize:28,color:green}}>S</div><div><div style={{fontSize:27}}>Sara · Seller</div><div style={{fontSize:21,color:'#798472',marginTop:5}}>Same building. Relevant update.</div></div></div>
        <div style={{marginTop:34,height:166,boxSizing:'border-box',padding:'25px 32px',background:'white',border:'1px solid #dce5d4',borderRadius:20,fontSize:31,lineHeight:1.55}}>{typed}<span style={{opacity:f%24<14?1:0,color:green}}>│</span></div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:32,opacity:p(f,415,434),transform:`translateY(${mix(12,0,p(f,415,434))}px)`}}><span style={{fontSize:25,color:green}}>✓ The right context.</span><div style={{background:green,color:'white',padding:'18px 31px',borderRadius:40,fontSize:23}}>Ready to follow up</div></div>
      </div>
    </div>
    <div style={{position:'absolute',left:330,top:155,fontSize:48,letterSpacing:-1.4,opacity:p(f,324,349),transform:`translateY(${mix(15,0,p(f,324,349))}px)`}}>One signal. A better conversation.</div>
  </AbsoluteFill>;
};
