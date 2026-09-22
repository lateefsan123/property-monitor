import React from 'react';
import {AbsoluteFill,Img,useCurrentFrame} from 'remotion';
import {IconBrandOpenai,IconArrowRight,IconCheck} from '@tabler/icons-react';
import {asset,tween} from './primitives';

type Word={word:string;start:number;end:number};
export function RevisedIntegrations({words}:{words:Word[]}){
 const f=useCurrentFrame();
 const cue=(word:string)=>30*(words.find(w=>w.word.toLowerCase().replace(/[^a-z]/g,'')===word)?.start||0);
 const andIndex=words.findIndex((w,i)=>w.word==='And'&&words[i+1]?.word==='through');
 const mcpStart=words[andIndex].start*30;
 const mcp=f>=mcpStart;
 const start=mcp?mcpStart:0;
 const show=1-tween(f,mcpStart-9,mcpStart)*(mcp?0:1);
 const icons=[['gmail.png','Gmail'],['outlook.svg','Outlook'],['calendar.png','Calendar']];
 const hosts=['Claude','ChatGPT'] as const;
 const details=f<cue('your')+10?'Read emails · Draft replies':'Upcoming calendar events';
 const action=f>=cue('update')?'Update a lead':f>=cue('check')?'Check recent WhatsApp messages':'Find a seller';
 return <AbsoluteFill style={{alignItems:'center',justifyContent:'center',color:'#ece8df'}}>
  <div style={{width:1380,textAlign:'center',opacity:show}}>
   <h1 style={{fontSize:62,fontWeight:500,letterSpacing:-2,margin:'0 0 90px'}}>{mcp?'Your Repeat AI account, through MCP':'Connect your everyday tools'}</h1>
   <div style={{display:'flex',justifyContent:'center',gap:150}}>
    {!mcp?icons.map(([file,label],i)=><div key={file} style={{width:240,opacity:tween(f,i*8,i*8+15),transform:`translateY(${tween(f,i*8,i*8+18,12,0)}px)`}}><Img src={asset('workflow/'+file)} style={{width:88,height:88,objectFit:'contain'}}/><p style={{fontSize:30,margin:'26px 0 0'}}>{label}</p></div>):hosts.map((label,i)=><div key={label} style={{width:240,opacity:tween(f,start+i*7,start+i*7+14),transform:`translateY(${tween(f,start+i*7,start+i*7+18,12,0)}px)`}}>{label==='Claude'?<Img src={asset('workflow/polished/claude.svg')} style={{width:76,height:76}}/>:<IconBrandOpenai size={76} stroke={1.35}/>}<p style={{fontSize:32,margin:'25px 0 0'}}>{label}</p></div>)}
   </div>
   <div style={{height:135,marginTop:75,fontSize:27,color:'#bfb9af',display:'flex',alignItems:'center',flexDirection:'column',gap:24}}>
    {!mcp?<><span>{details}</span>{f<cue('calendar')&&f>cue('confirmed')&&<span style={{fontSize:21}}>You confirm each email before it’s sent</span>}</>:f>=cue('ask')?<><span style={{display:'flex',alignItems:'center',gap:18}}><IconArrowRight size={24}/>{action}</span>{f>=cue('approval')-50&&<span style={{fontSize:22,display:'flex',alignItems:'center',gap:10}}><IconCheck size={22}/>Review changes before they’re applied</span>}</>:<span>Connected to the account you already use</span>}
   </div>
  </div>
 </AbsoluteFill>;
}
