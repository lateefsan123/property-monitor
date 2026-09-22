import React from 'react';
import {AbsoluteFill, Img, useCurrentFrame} from 'remotion';
import {IconArrowLeft, IconVideo, IconPhone, IconDotsVertical, IconMoodSmile, IconPaperclip, IconCamera, IconMicrophone, IconCheck, IconChecks, IconWifi, IconBattery4, IconAntennaBars5} from '@tabler/icons-react';
import {asset, tween} from './primitives';

// Reuse the broker-card region of the current landing artwork without redrawing it.
function BrokerCard({width}:{width:number}) {
 const scale=width/640;
 return <div style={{width,height:236*scale,position:'relative',overflow:'hidden',borderRadius:10,background:'#fff'}}>
  <Img src={asset('workflow/whatsapp/landing-template-art.png')} style={{position:'absolute',width:1942*scale,maxWidth:'none',left:-1083*scale,top:-120*scale}}/>
 </div>;
}

export function WhatsAppDelivery() {
 const f=useCurrentFrame();
 const phone=tween(f,61,88),message=tween(f,79,94),move=tween(f,61,88);
 const cardWidth=640+(442-640)*move;
 const ticks=f<115?<IconCheck size={23}/>:<IconChecks size={23}/>;
 return <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 46%, #e6f8ef 0%, #edf4eb 57%, #f3f2ed 100%)',fontFamily:'Arial, sans-serif',color:'#15221d'}}>
  <div style={{position:'absolute',left:676,top:52,width:568,height:976,borderRadius:62,padding:14,background:'#1e2422',boxShadow:'0 22px 70px #16392a28, inset 0 0 0 2px #606862',opacity:phone}}>
   <div style={{position:'relative',height:'100%',overflow:'hidden',borderRadius:48,background:'#f4f0e8'}}>
    <div style={{height:50,background:'#fafcfb',display:'flex',alignItems:'center',padding:'0 30px',fontSize:20,fontWeight:600}}>
     10:10<span style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:7}}><IconAntennaBars5 size={23}/><IconWifi size={21}/><IconBattery4 size={26}/></span>
    </div>
    <div style={{height:82,background:'#fafcfb',display:'flex',alignItems:'center',gap:15,padding:'0 20px',borderBottom:'1px solid #dce3dc'}}>
     <IconArrowLeft size={27}/><div style={{borderRadius:'50%',width:47,height:47,display:'grid',placeItems:'center',background:'#dfe9e1',fontSize:25,color:'#52675a'}}>A</div>
     <div style={{fontSize:24,fontWeight:600,flex:1}}>Alex Morgan</div><IconVideo size={27}/><IconPhone size={25}/><IconDotsVertical size={25}/>
    </div>
    <div style={{position:'absolute',inset:'132px 0 80px',backgroundImage:'radial-gradient(#80917d18 1px, transparent 1px)',backgroundSize:'21px 21px'}}/>
    <div style={{position:'absolute',top:147,left:228,padding:'5px 13px',borderRadius:8,background:'#fff9',fontSize:17,color:'#657268'}}>Today</div>
    <div style={{position:'absolute',left:58,top:179,width:454,background:'#d9fdd3',borderRadius:'14px 0 14px 14px',boxShadow:'0 1px 2px #24372725',opacity:message}}>
     <div style={{position:'absolute',right:-9,top:0,width:0,height:0,borderLeft:'10px solid #d9fdd3',borderBottom:'12px solid transparent'}}/>
     <div style={{height:175}}/>
     <div style={{padding:'8px 17px 0',fontSize:25,lineHeight:1.35}}>
      <p style={{margin:'0 0 19px'}}>Hi Alex,</p>
      <p style={{margin:'0 0 19px'}}>Latest sales in St. Regis:</p>
      <p style={{margin:'0 0 19px'}}>2 bed · AED 6.3M · 1,323 sqft</p>
      <p style={{margin:0}}>Would you like an updated valuation?</p>
     </div>
     <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6,padding:'7px 12px 9px',fontSize:16,color:'#718477'}}>10:10<span style={{display:'flex',color:'#718477'}}>{ticks}</span></div>
    </div>
    <div style={{position:'absolute',left:12,right:12,bottom:36,display:'flex',alignItems:'center',gap:10}}>
     <div style={{background:'#fff',borderRadius:30,height:56,display:'flex',alignItems:'center',padding:'0 15px',gap:13,flex:1,color:'#718075'}}><IconMoodSmile size={28}/><span style={{fontSize:23,flex:1}}>Message</span><IconPaperclip size={27}/><IconCamera size={27}/></div>
     <div style={{width:56,height:56,borderRadius:'50%',display:'grid',placeItems:'center',background:'#1c8b67',color:'#fff'}}><IconMicrophone size={28}/></div>
    </div>
    <div style={{position:'absolute',width:145,height:5,borderRadius:4,background:'#23342a',bottom:11,left:198}}/>
   </div>
  </div>
  <div style={{position:'absolute',left:640+(754-640)*move,top:346+(251-346)*move,opacity:tween(f,0,12),boxShadow:`0 ${18*(1-move)}px ${40*(1-move)}px #294e3115`,borderRadius:10}}><BrokerCard width={cardWidth}/></div>
  <div style={{position:'absolute',top:626,left:0,width:'100%',textAlign:'center',fontSize:25,color:'#5a6e60',opacity:1-tween(f,49,64)}}>Your broker card</div>
  <div style={{position:'absolute',right:64,bottom:45,fontSize:19,color:'#819084',opacity:phone}}>Example conversation</div>
 </AbsoluteFill>;
}
