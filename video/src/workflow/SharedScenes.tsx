import React from 'react';
import {AbsoluteFill, Img, Sequence, useCurrentFrame} from 'remotion';
import {asset,tween,pos,Screenshot,Cursor,Focus,Clip} from './primitives';
export function Intro(){const f=useCurrentFrame();return <AbsoluteFill className="brand-scene">
 <Img src={asset('logo.png')} style={{...pos(150,130),width:270}}/>
 <div style={{...pos(150,380),fontSize:68,lineHeight:1.12,letterSpacing:-4,fontWeight:500}}>{['A quick walkthrough.'].map((s,i)=><div key={s} style={{opacity:tween(f,i*24,i*24+18),transform:`translateY(${tween(f,i*24,i*24+22,20,0)}px)`}}>{s}</div>)}</div>
 <Img src={asset('architecture.png')} style={{...pos(1000,180),width:870,opacity:tween(f,20,65,.0,.72),filter:'grayscale(1)',transform:`translateY(${tween(f,20,100,35,0)}px)`}}/>
 </AbsoluteFill>}

export function Market(){const f=useCurrentFrame();return <AbsoluteFill>
 <Focus scale={f<440?tween(f,0,35,1,1.08):tween(f,440,490,1.08,1.65)} x={f<440?960:tween(f,440,490,960,780)} y={f<440?tween(f,0,35,540,530):tween(f,440,490,530,500)}>
 {f<60?<Screenshot name="01-buildings.png"/>:f<360?<Sequence from={60}><Clip name="burj-listings.mp4" frames={300} hold="12-burj-detail.png"/></Sequence>:<Sequence from={360}><Clip name="price-history.mp4" frames={173} hold="13-price-activity.png"/></Sequence>}
 {f>=190&&f<216&&<Cursor x={tween(f,190,208,1370,1100)} y={tween(f,190,208,510,340)} click={Math.max(0,1-Math.abs(f-210)/5)}/>}
 {f>=395&&f<439&&<Cursor x={tween(f,395,423,1250,1600)} y={tween(f,395,423,540,413)} click={Math.max(0,1-Math.abs(f-427)/5)}/>}
 </Focus>

 </AbsoluteFill>}


export function Platforms(){const f=useCurrentFrame();return <AbsoluteFill>
 <div style={{...pos(130,95)}}><h1 style={{fontSize:60,marginTop:22}}>Web, Windows and mobile</h1></div>
 <div style={{...pos(125,335),width:1240,height:698,overflow:'hidden',border:'1px solid #44413d',borderRadius:12,transform:`translateY(${tween(f,0,30,24,0)}px)`}}><Screenshot name="01-buildings.png" style={{width:1240,height:697.5}}/></div>
 <Img src={asset('native-iphone.png')} style={{...pos(1440,130),height:840,width:388,borderRadius:36,border:'7px solid #393936',boxSizing:'content-box',transform:`translateY(${tween(f,20,55,55,0)}px)`,opacity:tween(f,20,45)}}/>
 </AbsoluteFill>}

export function Close(){const f=useCurrentFrame();return <AbsoluteFill className="brand-scene" style={{alignItems:'center',justifyContent:'center'}}><Img src={asset('logo.png')} style={{width:450,opacity:tween(f,0,18)}}/></AbsoluteFill>}
