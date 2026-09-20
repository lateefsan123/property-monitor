import React from 'react';
import {AbsoluteFill, Audio, Easing, Freeze, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Broker, RepeatAIIllustratedOpening} from './RepeatAIIllustratedOpening';

const paper='#faf9f3', ink='#27362c', green='#286347';
const p=(f:number,a:number,b:number)=>interpolate(f,[a,b],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const msg='Hi Sara, a similar apartment in your building just dropped 5%. Shall we review your price?';

/** A continuous illustrated concept: context -> editable draft -> next step -> broker. */
export const RepeatAIAnimatedExplainer: React.FC=()=>{
  const f=useCurrentFrame();
  const handoff=p(f,450,488), organize=p(f,640,684), end=p(f,835,888);
  const edit=p(f,539,589), next=p(f,705,741);
  return <AbsoluteFill style={{background:paper,color:ink,fontFamily:'Inter, Arial, sans-serif',overflow:'hidden'}}>
    <Audio src={staticFile('video/repeat-ai-v5/voice-only.wav')}/>
    <Sequence durationInFrames={450}><RepeatAIIllustratedOpening narration={false}/></Sequence>
    {f>=450 && <>
      <div style={{position:'absolute',inset:0,opacity:1-handoff,transform:`translateX(${-220*handoff}px) scale(${1-.08*handoff})`}}><Freeze frame={449}><RepeatAIIllustratedOpening narration={false}/></Freeze></div>
      <div style={{position:'absolute',left:180,top:150,opacity:handoff*(1-end),fontSize:52,letterSpacing:-1.7}}>{organize<.5?'A useful update. In your own words.':'The conversation keeps its context.'}</div>
      <div style={{position:'absolute',left:mix(220,190,organize),top:mix(300,295,organize),width:mix(1480,950,organize),height:mix(610,600,organize),boxSizing:'border-box',border:'2px solid #d6e1d0',borderRadius:30,background:'white',padding:48,opacity:handoff*(1-end),transform:`translateY(${(1-handoff)*95}px) translateX(${-200*end}px)`}}>
        <div style={{display:'flex',alignItems:'center',gap:18}}><div style={{width:62,height:62,borderRadius:'50%',background:'#dbe8d2',display:'grid',placeItems:'center',color:green,fontSize:30}}>S</div><div><div style={{fontSize:29}}>Sara · Seller</div><div style={{fontSize:20,color:'#798472',marginTop:7}}>Marina · 2 bedroom</div></div><span style={{marginLeft:'auto',color:green,fontSize:21}}>Message draft</span></div>
        <div style={{marginTop:40,borderRadius:22,padding:'30px 35px',background:'#f0f5eb',fontSize:29,lineHeight:1.45,minHeight:205,boxSizing:'border-box'}}>{msg}<span style={{background:'#dcebd2'}}>{' Happy to talk it through.'.slice(0,Math.floor(edit*25))}</span><span style={{opacity:f%24<13?1:0}}>│</span></div>
        <div style={{marginTop:32,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:23,color:green}}><span>{edit<1?'Make it personal.':'Your words. Relevant context.'}</span><span style={{border:'1px solid #bbcfb2',borderRadius:30,padding:'14px 23px'}}>Review draft</span></div>
      </div>
      <div style={{position:'absolute',left:1200,top:305,width:500,height:580,opacity:organize*(1-end),transform:`translateX(${(1-organize)*240+end*200}px)`}}>
        <Img src={staticFile('video/repeat-ai-v4/notes.png')} style={{position:'absolute',width:260,height:260,objectFit:'contain',right:-15,top:-90,transform:`rotate(${Math.sin(f/35)*3}deg)`}}/>
        <div style={{position:'absolute',top:150,left:0,right:0,border:'2px solid #d6e1d0',borderRadius:24,background:'#f0f5eb',padding:30}}><div style={{fontSize:22,color:green}}>NEXT STEP</div><div style={{fontSize:35,marginTop:24}}>Follow up with Sara</div><div style={{fontSize:25,marginTop:23,color:'#74806f'}}>Tomorrow · 10:00</div><div style={{marginTop:28,height:3,background:'#d3dfcb',width:`${next*100}%`}}/><div style={{fontSize:23,color:green,marginTop:24,opacity:next}}>✓ Note and reminder together</div></div>
      </div>
      <div style={{position:'absolute',left:100,top:250,width:690,height:690,opacity:end,transform:`translateX(${(1-end)*-250}px)`}}><Broker frame={f}/></div>
      <div style={{position:'absolute',left:850,top:330,opacity:end,transform:`translateY(${(1-end)*70}px)`}}><div style={{fontSize:66,lineHeight:1.12,letterSpacing:-2}}>Less chasing.<br/>More timely conversations.</div><div style={{display:'flex',alignItems:'center',gap:20,marginTop:62,opacity:p(f,943,969)}}><Img src={staticFile('brand/repeat-ai-icon.png')} style={{width:61,height:61,objectFit:'contain',filter:'invert(1)'}}/><span style={{fontSize:47,fontWeight:650}}>Repeat AI</span></div><div style={{fontSize:30,marginTop:25,color:green,opacity:p(f,966,995)}}>Seller follow-up, done properly.</div></div>
    </>}
  </AbsoluteFill>;
};
